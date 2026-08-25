import db from "../db.server";
import pincodeData from "../data/pincodes_india.json";

// In-Memory Pincode Cache for <50ms response speed
const pincodeCache = new Map<string, {
  serviceable: boolean;
  codAvailable: boolean;
  prepaidAvailable: boolean;
  etaDays: number;
  courier: string;
}>();

/**
 * Seed database with initial Indian courier PIN code rules if empty
 */
export async function seedPincodeDataset() {
  const count = await db.pincodeRule.count();
  if (count > 0) return;

  for (const item of pincodeData) {
    await db.pincodeRule.upsert({
      where: {
        courier_pincode: {
          courier: item.courier,
          pincode: item.pincode,
        },
      },
      update: {
        cod_available: item.cod_available,
        prepaid_available: item.prepaid_available,
        eta_days: item.eta_days,
      },
      create: {
        courier: item.courier,
        pincode: item.pincode,
        cod_available: item.cod_available,
        prepaid_available: item.prepaid_available,
        eta_days: item.eta_days,
      },
    });
  }
}

/**
 * Lookup Indian pincode serviceability with ultra-fast caching (<50ms)
 */
export async function lookupPincodeServiceability(pincode: string) {
  const trimmed = pincode.trim();
  if (!/^\d{6}$/.test(trimmed)) {
    return {
      serviceable: false,
      codAvailable: false,
      prepaidAvailable: false,
      etaDays: 0,
      courier: "N/A",
      error: "Invalid 6-digit PIN code format",
    };
  }

  // Check in-memory cache
  if (pincodeCache.has(trimmed)) {
    return pincodeCache.get(trimmed)!;
  }

  // Check DB custom overrides
  const dbRule = await db.pincodeRule.findFirst({
    where: { pincode: trimmed },
  });

  if (dbRule) {
    const result = {
      serviceable: true,
      codAvailable: dbRule.cod_available,
      prepaidAvailable: dbRule.prepaid_available,
      etaDays: dbRule.eta_days,
      courier: dbRule.courier,
    };
    pincodeCache.set(trimmed, result);
    return result;
  }

  // Intelligent fallback for all valid 6-digit Indian PIN codes
  const firstChar = trimmed.charAt(0);
  const isBlocked = ["0", "9"].includes(firstChar); // Non-standard or special zone
  const isMetroPrefix = ["11", "40", "56", "60", "70", "50", "41", "38"].some((p) => trimmed.startsWith(p));

  const fallbackResult = {
    serviceable: !isBlocked,
    codAvailable: !isBlocked,
    prepaidAvailable: true,
    etaDays: isMetroPrefix ? 2 : 4,
    courier: isMetroPrefix ? "Priority Air Courier" : "Standard Surface Express",
  };

  pincodeCache.set(trimmed, fallbackResult);
  return fallbackResult;
}
