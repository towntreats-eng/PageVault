-- Drop legacy tables if they exist
DROP TABLE IF EXISTS "CatalogItem";
DROP TABLE IF EXISTS "FeatureFlag";
DROP TABLE IF EXISTS "Review";
DROP TABLE IF EXISTS "WishlistItem";
DROP TABLE IF EXISTS "StockAlert";
DROP TABLE IF EXISTS "PincodeRule";
DROP TABLE IF EXISTS "Install";
DROP TABLE IF EXISTS "Shop";
DROP TABLE IF EXISTS "Subscription";
DROP TABLE IF EXISTS "Event";

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "domain" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "seo_score" INTEGER NOT NULL DEFAULT 0,
    "auto_optimize_enabled" BOOLEAN NOT NULL DEFAULT true,
    "installed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop_domain" TEXT NOT NULL,
    "plan_name" TEXT NOT NULL DEFAULT 'pro_29',
    "shopify_subscription_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "price" REAL NOT NULL DEFAULT 29.0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "trial_days" INTEGER NOT NULL DEFAULT 7,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SeoAudit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop_domain" TEXT NOT NULL,
    "health_score" INTEGER NOT NULL DEFAULT 0,
    "total_products" INTEGER NOT NULL DEFAULT 0,
    "products_fixed" INTEGER NOT NULL DEFAULT 0,
    "images_scanned" INTEGER NOT NULL DEFAULT 0,
    "images_compressed" INTEGER NOT NULL DEFAULT 0,
    "bytes_saved" BIGINT NOT NULL DEFAULT 0,
    "alt_texts_added" INTEGER NOT NULL DEFAULT 0,
    "meta_titles_fixed" INTEGER NOT NULL DEFAULT 0,
    "meta_descs_fixed" INTEGER NOT NULL DEFAULT 0,
    "schemas_active" INTEGER NOT NULL DEFAULT 0,
    "broken_links_found" INTEGER NOT NULL DEFAULT 0,
    "last_run_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SeoSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop_domain" TEXT NOT NULL,
    "product_title_template" TEXT NOT NULL DEFAULT '{product_title} - Buy Online at {shop_name}',
    "product_desc_template" TEXT NOT NULL DEFAULT 'Buy {product_title} for {price} at {shop_name}. High quality & best prices. Fast shipping!',
    "image_alt_template" TEXT NOT NULL DEFAULT '{product_title} - {shop_name}',
    "auto_alt_text" BOOLEAN NOT NULL DEFAULT true,
    "auto_compress_images" BOOLEAN NOT NULL DEFAULT true,
    "auto_jsonld_schema" BOOLEAN NOT NULL DEFAULT true,
    "auto_meta_tags" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ImageOptLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop_domain" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "original_size" INTEGER NOT NULL,
    "compressed_size" INTEGER NOT NULL,
    "alt_text" TEXT,
    "status" TEXT NOT NULL DEFAULT 'compressed',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "BrokenLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source_url" TEXT NOT NULL,
    "target_url" TEXT,
    "shop_domain" TEXT NOT NULL,
    "status_code" INTEGER NOT NULL DEFAULT 404,
    "fixed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop_domain" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PageRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop_domain" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_gid" TEXT,
    "status_code" INTEGER NOT NULL DEFAULT 200,
    "last_crawled_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop_domain" TEXT NOT NULL,
    "page_record_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "resolved_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop_domain" TEXT NOT NULL,
    "change_id" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "reason_code" TEXT,
    "observed_value" TEXT,
    "fetched_url" TEXT NOT NULL,
    "attempted_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Change" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop_domain" TEXT NOT NULL,
    "resource_gid" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "before_value" TEXT,
    "after_value" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "applied_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reverted_at" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "Shop_domain_key" ON "Shop"("domain");
CREATE UNIQUE INDEX "Subscription_shop_domain_key" ON "Subscription"("shop_domain");
CREATE UNIQUE INDEX "SeoSetting_shop_domain_key" ON "SeoSetting"("shop_domain");
CREATE UNIQUE INDEX "PageRecord_shop_domain_url_key" ON "PageRecord"("shop_domain", "url");


