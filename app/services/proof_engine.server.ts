import prisma from "../db.server";
import { fetchAndParsePage } from "./parser.server";

export type FailureReasonCode =
  | "THEME_DOES_NOT_READ_METAFIELD"
  | "OVERWRITTEN_BY_OTHER_APP"
  | "CACHE_PENDING"
  | "APP_EMBED_DISABLED"
  | "PAGE_UNREACHABLE";

export interface VerificationResult {
  id: string;
  changeId: string;
  fetchedUrl: string;
  result: "PASS" | "FAIL" | "PENDING";
  reasonCode: FailureReasonCode | null;
  observedValue: string | null;
  expectedValue: string;
  humanMessage: string;
  attemptedAt: Date;
}

/**
 * Proof Engine - Live Storefront Server-side Verification
 * Fetches the merchant's live HTML page and verifies if the SEO change is actually present.
 * See 03-ARCHITECTURE.md §3 & 06-RULES.md §B1
 */
export async function verifyAppliedSeoChangeOnLivePage(
  shopDomain: string,
  changeId: string,
  targetUrl: string,
  field: "title" | "description" | "alt" | "schema" | "canonical",
  expectedValue: string
): Promise<VerificationResult> {
  const parsed = await fetchAndParsePage(targetUrl);

  let resultStatus: "PASS" | "FAIL" = "FAIL";
  let reasonCode: FailureReasonCode | null = null;
  let observedValue: string | null = null;
  let humanMessage = "";

  if (!parsed.isReachable) {
    resultStatus = "FAIL";
    reasonCode = "PAGE_UNREACHABLE";
    observedValue = null;
    humanMessage = `Live page returned HTTP status ${parsed.statusCode}. Page is unreachable or password-protected.`;
  } else if (field === "title") {
    observedValue = parsed.title;
    if (parsed.title === expectedValue || parsed.title?.includes(expectedValue)) {
      resultStatus = "PASS";
      humanMessage = `Verified on live page source: <title>${parsed.title}</title> matched expected value.`;
    } else if (!parsed.title || parsed.title === shopDomain) {
      resultStatus = "FAIL";
      reasonCode = "THEME_DOES_NOT_READ_METAFIELD";
      humanMessage = `Theme does not output global.title_tag metafield. Live title remains '${parsed.title}'.`;
    } else {
      resultStatus = "FAIL";
      reasonCode = "OVERWRITTEN_BY_OTHER_APP";
      humanMessage = `Live title '${parsed.title}' does not match expected '${expectedValue}'. Overwritten by another app or theme settings.`;
    }
  } else if (field === "description") {
    observedValue = parsed.description;
    if (parsed.description === expectedValue || parsed.description?.includes(expectedValue)) {
      resultStatus = "PASS";
      humanMessage = `Verified on live page source: meta description matched expected text.`;
    } else if (!parsed.description) {
      resultStatus = "FAIL";
      reasonCode = "THEME_DOES_NOT_READ_METAFIELD";
      humanMessage = `Theme does not output global.description_tag. Live meta description is empty.`;
    } else {
      resultStatus = "FAIL";
      reasonCode = "OVERWRITTEN_BY_OTHER_APP";
      humanMessage = `Live description '${parsed.description.substring(0, 50)}...' differs from expected value.`;
    }
  } else if (field === "schema") {
    const hasSchema = parsed.jsonLdBlocks.some((b) => b["@type"] === "Product" || b["@type"] === "BreadcrumbList");
    if (hasSchema) {
      resultStatus = "PASS";
      humanMessage = `Verified JSON-LD structured data block rendering in storefront <head>.`;
    } else {
      resultStatus = "FAIL";
      reasonCode = "APP_EMBED_DISABLED";
      humanMessage = `App Embed block is disabled in the Theme Editor. Enable ProofSEO app embed to render JSON-LD.`;
    }
  } else if (field === "canonical") {
    observedValue = parsed.canonical;
    if (parsed.canonical === expectedValue || (parsed.canonical && targetUrl.includes(parsed.canonical))) {
      resultStatus = "PASS";
      humanMessage = `Verified live canonical tag: <link rel="canonical" href="${parsed.canonical}">.`;
    } else {
      resultStatus = "FAIL";
      reasonCode = "CACHE_PENDING";
      humanMessage = `Canonical tag not yet updated on CDN cache. Automatic re-verify scheduled.`;
    }
  }

  // Record verification assertion in DB
  const dbRecord = await prisma.verification.create({
    data: {
      shop_domain: shopDomain,
      change_id: changeId,
      result: resultStatus,
      reason_code: reasonCode,
      observed_value: observedValue,
      fetched_url: targetUrl,
    },
  });

  return {
    id: dbRecord.id,
    changeId,
    fetchedUrl: targetUrl,
    result: resultStatus,
    reasonCode,
    observedValue,
    expectedValue,
    humanMessage,
    attemptedAt: dbRecord.attempted_at,
  };
}

export async function getVerificationHistory(shopDomain: string) {
  return await prisma.verification.findMany({
    where: { shop_domain: shopDomain },
    orderBy: { attempted_at: "desc" },
    take: 50,
  });
}
