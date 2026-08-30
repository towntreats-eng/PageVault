export async function seedPincodeDataset() {
  // No-op for SEO App
}

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

  return {
    serviceable: true,
    codAvailable: true,
    prepaidAvailable: true,
    etaDays: 3,
    courier: "Standard Surface Express",
  };
}
