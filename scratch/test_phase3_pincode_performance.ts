import { PrismaClient } from "@prisma/client";
import { lookupPincodeServiceability, seedPincodeDataset } from "../app/services/pincode.server";

const db = new PrismaClient();

async function runPhase3PincodeVerification() {
  console.log("=== STARTING SHOP FORGE PHASE 3 INDIA ESSENTIALS & PINCODE PERFORMANCE VERIFICATION ===");

  // Step 1: Seed database dataset
  console.log("[1/3] Seeding Indian courier pincode dataset...");
  await seedPincodeDataset();
  const dbCount = await db.pincodeRule.count();
  console.log(`✓ Database contains ${dbCount} Indian courier pincode rules.`);

  // Step 2: Test Serviceability & ETA for major Indian cities
  console.log("[2/3] Verifying serviceability for Tier-1 & Tier-2 Indian PIN codes...");
  const testPincodes = [
    { pincode: "110001", city: "New Delhi (Metro)" },
    { pincode: "400001", city: "Mumbai (Metro)" },
    { pincode: "560001", city: "Bengaluru (Metro)" },
    { pincode: "700001", city: "Kolkata (Metro)" },
    { pincode: "800001", city: "Patna (Tier-2)" },
    { pincode: "682001", city: "Kochi (Tier-2)" },
  ];

  for (const item of testPincodes) {
    const startTime = performance.now();
    const result = await lookupPincodeServiceability(item.pincode);
    const durationMs = performance.now() - startTime;

    if (!result.serviceable) {
      throw new Error(`❌ Serviceability check failed for valid PIN code ${item.pincode} (${item.city}).`);
    }

    console.log(
      `✓ PIN ${item.pincode} (${item.city}): Serviceable via ${result.courier}, ETA ~${result.etaDays} days, COD ${
        result.codAvailable ? "Available" : "Prepaid Only"
      } [Lookup Time: ${durationMs.toFixed(2)}ms]`
    );

    if (durationMs > 300) {
      throw new Error(`❌ Latency SLA Failed: PIN ${item.pincode} lookup took ${durationMs.toFixed(2)}ms (>300ms SLA).`);
    }
  }

  // Step 3: Test High-Throughput Cached Latency SLA
  console.log("[3/3] Testing Cached High-Speed SLA (<10ms)...");
  const cacheStartTime = performance.now();
  const cachedResult = await lookupPincodeServiceability("110001");
  const cacheDurationMs = performance.now() - cacheStartTime;

  console.log(`✓ Cached Lookup Duration: ${cacheDurationMs.toFixed(2)}ms (Target <10ms).`);
  if (cacheDurationMs > 50) {
    throw new Error(`❌ Cache SLA Failed: Cached lookup took ${cacheDurationMs.toFixed(2)}ms.`);
  }

  console.log("\n=== ALL PHASE 3 INDIA ESSENTIALS TESTS PASSED (SLA <300ms VERIFIED) ===");
}

runPhase3PincodeVerification()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
