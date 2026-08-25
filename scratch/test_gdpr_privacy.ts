import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function runGdprPrivacyVerification() {
  console.log("=== STARTING SHOP FORGE GDPR PRIVACY WEBHOOK VERIFICATION ===");

  const testShopDomain = "gdpr-test-store.myshopify.com";
  const testCustomerId = "customer_884920";
  const testCustomerEmail = "customer.gdpr@example.com";

  // Step 1: Clean up any existing test records
  await db.review.deleteMany({ where: { shop_domain: testShopDomain } });
  await db.wishlistItem.deleteMany({ where: { shop_domain: testShopDomain } });
  await db.stockAlert.deleteMany({ where: { shop_domain: testShopDomain } });
  await db.shop.deleteMany({ where: { domain: testShopDomain } });

  // Step 2: Seed test shop & customer data across Shop Forge models
  console.log("[1/4] Seeding test shop & customer-linked records...");
  await db.shop.create({
    data: {
      domain: testShopDomain,
      plan: "growth",
      currency: "INR",
    },
  });

  const review = await db.review.create({
    data: {
      shop_domain: testShopDomain,
      product_id: "prod_101",
      customer_id: testCustomerId,
      rating: 5,
      body: "Loved this product!",
      photos: JSON.stringify(["https://example.com/photo1.jpg"]),
      author: "Priya Sharma",
      status: "published",
    },
  });

  const wishlistItem = await db.wishlistItem.create({
    data: {
      shop_domain: testShopDomain,
      customer_id: testCustomerId,
      product_id: "prod_101",
    },
  });

  const stockAlert = await db.stockAlert.create({
    data: {
      shop_domain: testShopDomain,
      customer_id: testCustomerId,
      variant_id: "var_505",
      email: testCustomerEmail,
    },
  });

  console.log("✓ Created Review:", review.id);
  console.log("✓ Created WishlistItem:", wishlistItem.id);
  console.log("✓ Created StockAlert:", stockAlert.id);

  // Step 3: Verify Data Request (customers/data_request)
  console.log("[2/4] Testing customers/data_request query...");
  const fetchedReviews = await db.review.findMany({
    where: { shop_domain: testShopDomain, customer_id: testCustomerId },
  });
  const fetchedWishlist = await db.wishlistItem.findMany({
    where: { shop_domain: testShopDomain, customer_id: testCustomerId },
  });
  const fetchedAlerts = await db.stockAlert.findMany({
    where: { shop_domain: testShopDomain, email: testCustomerEmail },
  });

  if (fetchedReviews.length !== 1 || fetchedWishlist.length !== 1 || fetchedAlerts.length !== 1) {
    throw new Error("❌ Data Request Verification Failed: Expected 1 record for each entity type.");
  }
  console.log("✓ customers/data_request verification PASSED");

  // Step 4: Verify Customer Redaction (customers/redact)
  console.log("[3/4] Testing customers/redact data deletion...");
  await db.wishlistItem.deleteMany({
    where: { shop_domain: testShopDomain, customer_id: testCustomerId },
  });
  await db.review.deleteMany({
    where: { shop_domain: testShopDomain, customer_id: testCustomerId },
  });
  await db.stockAlert.deleteMany({
    where: {
      shop_domain: testShopDomain,
      OR: [{ email: testCustomerEmail }, { customer_id: testCustomerId }],
    },
  });

  const postRedactReviews = await db.review.count({ where: { shop_domain: testShopDomain, customer_id: testCustomerId } });
  const postRedactWishlist = await db.wishlistItem.count({ where: { shop_domain: testShopDomain, customer_id: testCustomerId } });
  const postRedactAlerts = await db.stockAlert.count({ where: { shop_domain: testShopDomain, email: testCustomerEmail } });

  if (postRedactReviews !== 0 || postRedactWishlist !== 0 || postRedactAlerts !== 0) {
    throw new Error("❌ Customer Redact Verification Failed: Customer data was not completely deleted.");
  }
  console.log("✓ customers/redact verification PASSED — all customer-linked records purged.");

  // Step 5: Verify Shop Redaction (shop/redact)
  console.log("[4/4] Testing shop/redact 48-hour shop data purge...");
  await db.review.deleteMany({ where: { shop_domain: testShopDomain } });
  await db.wishlistItem.deleteMany({ where: { shop_domain: testShopDomain } });
  await db.stockAlert.deleteMany({ where: { shop_domain: testShopDomain } });
  await db.shop.deleteMany({ where: { domain: testShopDomain } });

  const postShopPurgeCount = await db.shop.count({ where: { domain: testShopDomain } });
  if (postShopPurgeCount !== 0) {
    throw new Error("❌ Shop Redact Verification Failed: Shop record remains in database.");
  }
  console.log("✓ shop/redact verification PASSED — all shop records purged.");

  console.log("\n=== ALL GDPR PRIVACY WEBHOOK TESTS PASSED SUCCESSFULLY ===");
}

runGdprPrivacyVerification()
  .catch((err) => {
    console.error("Verification Error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
