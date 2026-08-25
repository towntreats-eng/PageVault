import * as fs from "fs";
import * as path from "path";

function verifyPhase1Assets() {
  console.log("=== STARTING SHOP FORGE PHASE 1 VERIFICATION ===");

  const extDir = path.join(process.cwd(), "extensions", "shop-forge-theme-ext");

  // 1. Verify Extension Config
  const tomlPath = path.join(extDir, "shopify.extension.toml");
  if (!fs.existsSync(tomlPath)) {
    throw new Error("❌ Missing shopify.extension.toml");
  }
  console.log("✓ shopify.extension.toml exists.");

  // 2. Verify Assets
  const cssPath = path.join(extDir, "assets", "shop-forge-blocks.css");
  const jsPath = path.join(extDir, "assets", "shop-forge-blocks.js");
  if (!fs.existsSync(cssPath) || !fs.existsSync(jsPath)) {
    throw new Error("❌ Missing theme extension assets (css or js).");
  }
  console.log("✓ Theme extension CSS & JS assets exist.");

  // 3. Verify 10 Liquid Blocks (6 Pages + 4 Sections)
  const expectedBlocks = [
    "sec_india_pincode_cod.liquid",
    "sec_photo_review_grid.liquid",
    "sec_sticky_urgency_atc.liquid",
    "sec_product_bundle_upsell.liquid",
    "pdp_high_conversion.liquid",
    "landing_multi_product.liquid",
    "brand_story_about.liquid",
    "flash_sale_event.liquid",
    "product_comparison.liquid",
    "faq_trust_center.liquid",
  ];

  const blocksDir = path.join(extDir, "blocks");
  expectedBlocks.forEach((blockFile) => {
    const blockPath = path.join(blocksDir, blockFile);
    if (!fs.existsSync(blockPath)) {
      throw new Error(`❌ Missing required Liquid block: ${blockFile}`);
    }
    const stat = fs.statSync(blockPath);
    if (stat.size < 100) {
      throw new Error(`❌ Block file ${blockFile} appears incomplete or empty.`);
    }
    console.log(`✓ Verified block: ${blockFile} (${stat.size} bytes)`);
  });

  console.log("\n=== ALL PHASE 1 THEME EXTENSION BLOCKS VERIFIED SUCCESSFULLY ===");
}

try {
  verifyPhase1Assets();
} catch (err) {
  console.error(err);
  process.exit(1);
}
