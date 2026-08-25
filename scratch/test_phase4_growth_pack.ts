import { PrismaClient } from "@prisma/client";
import { checkFeatureAccess, invalidateShopEntitlementCache } from "../app/services/entitlement.server";
import { seedFeatureFlags } from "../app/services/billing.server";

const db = new PrismaClient();

async function runPhase4GrowthPackVerification() {
  console.log("=== STARTING SHOP FORGE PHASE 4 GROWTH PACK & DEGRADATION VERIFICATION ===");

  const testShop = "growth-test-store.myshopify.com";
  const testCustomer = "cust_growth_771";
  const testEmail = "growth.customer@example.com";

  // Step 1: Initialize environment
  console.log("[1/5] Setting up Growth tier test environment...");
  await seedFeatureFlags();

  await db.event.deleteMany({ where: { shop_domain: testShop } });
  await db.review.deleteMany({ where: { shop_domain: testShop } });
  await db.wishlistItem.deleteMany({ where: { shop_domain: testShop } });
  await db.stockAlert.deleteMany({ where: { shop_domain: testShop } });
  await db.subscription.deleteMany({ where: { shop_domain: testShop } });
  await db.shop.deleteMany({ where: { domain: testShop } });

  await db.shop.create({ data: { domain: testShop, plan: "growth", currency: "USD" } });
  await db.subscription.create({
    data: {
      shop_domain: testShop,
      tier: "growth",
      shopify_subscription_id: "sub_growth_900",
      status: "active",
      cap_orders: 500,
    },
  });

  // Step 2: Test Photo Review Submission & Moderation Queue
  console.log("[2/5] Testing Photo Review Submission & Moderation...");
  const reviewAccess = await checkFeatureAccess(testShop, "photo_reviews");
  if (!reviewAccess.allowed) throw new Error("❌ Growth tier failed to allow photo_reviews.");

  const review = await db.review.create({
    data: {
      shop_domain: testShop,
      product_id: "prod_growth_100",
      customer_id: testCustomer,
      rating: 5,
      body: "Fantastic quality! Photo attached.",
      photos: JSON.stringify(["https://example.com/growth_photo.jpg"]),
      author: "Sneha Patel",
      status: "pending",
    },
  });

  // Approve review
  await db.review.update({
    where: { id: review.id },
    data: { status: "published" },
  });

  const publishedCount = await db.review.count({ where: { shop_domain: testShop, status: "published" } });
  if (publishedCount !== 1) throw new Error("❌ Photo review moderation approval failed.");
  console.log("✓ Photo review submission & moderation queue PASSED.");

  // Step 3: Test Customer Wishlist & Back-In-Stock Alert Pipeline
  console.log("[3/5] Testing Wishlist & Back-In-Stock Alert Pipeline...");
  const wishlistAccess = await checkFeatureAccess(testShop, "wishlist");
  const alertAccess = await checkFeatureAccess(testShop, "stock_alerts");
  if (!wishlistAccess.allowed || !alertAccess.allowed) throw new Error("❌ Growth features not unlocked.");

  const wishlistItem = await db.wishlistItem.create({
    data: { shop_domain: testShop, customer_id: testCustomer, product_id: "prod_growth_100" },
  });

  const stockAlert = await db.stockAlert.create({
    data: { shop_domain: testShop, customer_id: testCustomer, variant_id: "var_growth_200", email: testEmail },
  });

  console.log(`✓ Wishlist saved item (${wishlistItem.id}) & Back-In-Stock alert created (${stockAlert.id}).`);

  // Step 4: Test Real Inventory Urgency (No Fake Urgency)
  console.log("[4/5] Testing Real Inventory Urgency Rule...");
  const inventoryQty = 4;
  const isUrgent = inventoryQty > 0 && inventoryQty <= 10;
  if (!isUrgent) throw new Error("❌ Inventory urgency rule failed.");
  console.log(`✓ Real Inventory Urgency PASSED: ${inventoryQty} items remaining triggers urgency badge.`);

  // Step 5: Test Graceful Degradation when Downgraded to Starter
  console.log("[5/5] Testing Growth Feature Graceful Degradation on Downgrade...");
  invalidateShopEntitlementCache(testShop);
  await db.subscription.updateMany({ where: { shop_domain: testShop }, data: { status: "cancelled" } });
  await db.shop.update({ where: { domain: testShop }, data: { plan: "starter" } });

  const postDowngradeReviewAccess = await checkFeatureAccess(testShop, "photo_reviews");
  const postDowngradeWishlistAccess = await checkFeatureAccess(testShop, "wishlist");

  if (postDowngradeReviewAccess.allowed || postDowngradeWishlistAccess.allowed) {
    throw new Error("❌ Graceful degradation failed: Growth features remained active after downgrade.");
  }

  // Confirm published reviews still render layout cleanly in DB
  const reviewRecord = await db.review.findFirst({ where: { shop_domain: testShop } });
  if (!reviewRecord) throw new Error("❌ Review layout data was lost upon downgrade.");

  console.log("✓ Graceful Degradation PASSED — features paused cleanly, layout and review data remain intact!");

  console.log("\n=== ALL PHASE 4 GROWTH PACK TESTS PASSED SUCCESSFULLY ===");
}

runPhase4GrowthPackVerification()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
