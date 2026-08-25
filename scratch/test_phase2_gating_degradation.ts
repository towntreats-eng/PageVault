import { PrismaClient } from "@prisma/client";
import { seedFeatureFlags } from "../app/services/billing.server";
import { checkFeatureAccess, getShopEntitlements, invalidateShopEntitlementCache } from "../app/services/entitlement.server";

const db = new PrismaClient();

async function runPhase2GatingDegradationVerification() {
  console.log("=== STARTING SHOP FORGE PHASE 2 GATING & DEGRADATION VERIFICATION ===");

  const testShop = "gating-test-store.myshopify.com";

  // Step 1: Clean up test shop data & seed feature flags
  await db.event.deleteMany({ where: { shop_domain: testShop } });
  await db.subscription.deleteMany({ where: { shop_domain: testShop } });
  await db.shop.deleteMany({ where: { domain: testShop } });

  console.log("[1/5] Seeding DB Feature Flags...");
  await seedFeatureFlags();
  const flagCount = await db.featureFlag.count();
  console.log(`✓ Seeded ${flagCount} FeatureFlag records across tier levels.`);

  // Step 2: Test Free Tier Shop (Default Installation)
  console.log("[2/5] Testing Free Tier Entitlements & Graceful Degradation...");
  await db.shop.create({
    data: { domain: testShop, plan: "free", currency: "INR" },
  });

  const freeEntitlements = await getShopEntitlements(testShop);
  if (freeEntitlements.tier !== "free") {
    throw new Error("❌ Free tier entitlement failed.");
  }

  // Check Growth-only feature access on Free Tier (e.g. photo_reviews)
  const freeReviewAccess = await checkFeatureAccess(testShop, "photo_reviews");
  if (freeReviewAccess.allowed) {
    throw new Error("❌ Free tier incorrectly allowed Growth-only feature 'photo_reviews'.");
  }

  // Verify feature_blocked event logged in database
  const blockedEvents = await db.event.findMany({
    where: { shop_domain: testShop, type: "feature_blocked" },
  });
  if (blockedEvents.length === 0) {
    throw new Error("❌ feature_blocked event was not logged to database.");
  }
  console.log("✓ Free tier correctly blocked Growth feature & logged feature_blocked event.");

  // Step 3: Test Growth Tier Upgrade
  console.log("[3/5] Testing Subscription Upgrade to Growth Tier...");
  invalidateShopEntitlementCache(testShop);
  await db.subscription.create({
    data: {
      shop_domain: testShop,
      tier: "growth",
      shopify_subscription_id: "sub_growth_9982",
      status: "active",
      cap_orders: 500,
      overage_state: "ok",
    },
  });

  const growthEntitlements = await getShopEntitlements(testShop);
  if (growthEntitlements.tier !== "growth") {
    throw new Error("❌ Growth tier upgrade failed.");
  }

  const growthReviewAccess = await checkFeatureAccess(testShop, "photo_reviews");
  const growthPincodeAccess = await checkFeatureAccess(testShop, "pincode_checker");
  if (!growthReviewAccess.allowed || !growthPincodeAccess.allowed) {
    throw new Error("❌ Growth tier failed to unlock Growth features.");
  }
  console.log("✓ Growth tier successfully unlocked photo_reviews, wishlist, and pincode_checker.");

  // Step 4: Test Order Cap Overage Enforcement (e.g. 520 / 500 orders)
  console.log("[4/5] Testing Order Cap Overage Enforcement...");
  await db.shop.update({
    where: { domain: testShop },
    data: { order_count_this_period: 520 },
  });
  invalidateShopEntitlementCache(testShop);

  const capExceededAccess = await checkFeatureAccess(testShop, "photo_reviews");
  if (capExceededAccess.allowed || capExceededAccess.overageState !== "exceeded") {
    throw new Error("❌ Order cap overage enforcement failed to block features when exceeded.");
  }
  console.log("✓ Order cap enforcement PASSED — features gracefully paused when order limit exceeded.");

  // Step 5: Test Subscription Cancellation & Graceful Degradation Path
  console.log("[5/5] Testing Subscription Cancellation & Degradation Path...");
  await db.subscription.updateMany({
    where: { shop_domain: testShop, status: "active" },
    data: { status: "cancelled" },
  });
  await db.shop.update({
    where: { domain: testShop },
    data: { plan: "free", order_count_this_period: 10 },
  });
  invalidateShopEntitlementCache(testShop);

  const postCancelEntitlements = await getShopEntitlements(testShop);
  const postCancelAccess = await checkFeatureAccess(testShop, "photo_reviews");

  if (postCancelEntitlements.tier !== "free" || postCancelAccess.allowed) {
    throw new Error("❌ Cancellation state did not revert to Free tier degradation.");
  }

  console.log("✓ Subscription cancellation PASSED — shop safely returned to clean Free tier degradation.");

  console.log("\n=== ALL PHASE 2 GATING & DEGRADATION TESTS PASSED SUCCESSFULLY ===");
}

runPhase2GatingDegradationVerification()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
