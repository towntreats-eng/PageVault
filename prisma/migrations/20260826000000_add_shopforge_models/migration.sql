-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "domain" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "order_count_this_period" INTEGER NOT NULL DEFAULT 0,
    "period_start" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "installed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop_domain" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "shopify_subscription_id" TEXT,
    "status" TEXT NOT NULL,
    "current_period_end" DATETIME,
    "cap_orders" INTEGER NOT NULL DEFAULT 100,
    "overage_state" TEXT NOT NULL DEFAULT 'ok',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CatalogItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "niche_tags" TEXT NOT NULL,
    "style_tags" TEXT NOT NULL,
    "funnel_stage" TEXT NOT NULL,
    "india_features" TEXT NOT NULL,
    "block_handle" TEXT NOT NULL,
    "theme_compat" TEXT NOT NULL,
    "min_tier" TEXT NOT NULL,
    "demo_url" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "changelog" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tier" TEXT NOT NULL,
    "feature_key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop_domain" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "rating" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "photos" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop_domain" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "StockAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop_domain" TEXT NOT NULL,
    "customer_id" TEXT,
    "variant_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "notified_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PincodeRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courier" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "cod_available" BOOLEAN NOT NULL DEFAULT true,
    "prepaid_available" BOOLEAN NOT NULL DEFAULT true,
    "eta_days" INTEGER NOT NULL DEFAULT 3,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Install" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop_domain" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "theme_id" TEXT NOT NULL,
    "installed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'active'
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop_domain" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Shop_domain_key" ON "Shop"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogItem_slug_key" ON "CatalogItem"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_tier_feature_key_key" ON "FeatureFlag"("tier", "feature_key");

-- CreateIndex
CREATE UNIQUE INDEX "PincodeRule_courier_pincode_key" ON "PincodeRule"("courier", "pincode");
