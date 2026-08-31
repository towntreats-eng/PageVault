import prisma from "../db.server";
import { fetchAndParsePage } from "./parser.server";
import { enqueue, registerHandler } from "./queue.server";

export type FailureReasonCode =
  | "THEME_DOES_NOT_READ_METAFIELD"
  | "OVERWRITTEN_BY_OTHER_APP"
  | "CACHE_PENDING"
  | "APP_EMBED_DISABLED"
  | "PAGE_UNREACHABLE";

export type VerifiableField = "title" | "description" | "alt" | "schema" | "canonical";

export interface VerificationResult {
  id: string;
  changeId: string;
  fetchedUrl: string;
  result: "PASS" | "FAIL" | "PENDING";
  reasonCode: FailureReasonCode | null;
  observedValue: string | null;
  expectedValue: string;
  humanMessage: string;
  attempt: number;
  /** True only when a retry was really accepted by a queue. Never promise a retry without this. */
  retryScheduled: boolean;
  retryAt: string | null;
  attemptedAt: Date;
}

/** Shopify's CDN needs time. Attempt 1 is informational only, never a diagnosis. */
const RETRY_DELAYS_MS = [90_000, 600_000, 3_600_000];
const MAX_ATTEMPTS = RETRY_DELAYS_MS.length + 1;

function norm(v: string | null | undefined) {
  return (v || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function matches(observed: string | null | undefined, expected: string) {
  const o = norm(observed);
  const e = norm(expected);
  return o.length > 0 && e.length > 0 && (o === e || o.includes(e));
}

/**
 * Proof Engine — live storefront verification.
 * Fetches the merchant's public page server-side and asserts the change is really there.
 * The Admin API's own response is never treated as proof. See 03-ARCHITECTURE.md §3.
 */
export async function verifyAppliedSeoChangeOnLivePage(
  shopDomain: string,
  changeId: string,
  targetUrl: string,
  field: VerifiableField,
  expectedValue: string,
  attempt = 1
): Promise<VerificationResult> {
  const parsed = await fetchAndParsePage(targetUrl);

  let resultStatus: "PASS" | "FAIL" | "PENDING" = "FAIL";
  let reasonCode: FailureReasonCode | null = null;
  let observedValue: string | null = null;
  let humanMessage = "";
  let mismatch = false;

  if (!parsed.isReachable) {
    reasonCode = "PAGE_UNREACHABLE";
    humanMessage = `We could not load this page (HTTP ${parsed.statusCode}). It may be deleted, redirected, or your store is password-protected.`;
  } else if (field === "title") {
    observedValue = parsed.title;
    if (matches(parsed.title, expectedValue)) {
      resultStatus = "PASS";
      humanMessage = `Verified on your live page: <title>${parsed.title}</title>`;
    } else {
      mismatch = true;
      if (!parsed.title) {
        reasonCode = "THEME_DOES_NOT_READ_METAFIELD";
        humanMessage = `Your live page has no <title> tag at all, so the value we saved is not being rendered by your theme.`;
      } else {
        reasonCode = "OVERWRITTEN_BY_OTHER_APP";
        humanMessage = `Your live title is "${parsed.title}", not the value we saved. Another app or a theme setting is writing it.`;
      }
    }
  } else if (field === "description") {
    observedValue = parsed.description;
    if (matches(parsed.description, expectedValue)) {
      resultStatus = "PASS";
      humanMessage = `Verified on your live page: the meta description matches what we saved.`;
    } else {
      mismatch = true;
      if (!parsed.description) {
        reasonCode = "THEME_DOES_NOT_READ_METAFIELD";
        humanMessage = `Your live page has no meta description tag, so the value we saved never reaches your page. This is a theme limitation.`;
      } else {
        reasonCode = "OVERWRITTEN_BY_OTHER_APP";
        humanMessage = `Your live meta description is different from the value we saved: "${parsed.description.substring(0, 80)}…"`;
      }
    }
  } else if (field === "alt") {
    const hit = parsed.imageAlts.find((a) => matches(a, expectedValue));
    observedValue = hit ?? (parsed.imageAlts[0] ?? null);
    if (hit) {
      resultStatus = "PASS";
      humanMessage = `Verified on your live page: an image carries the alt text "${hit}".`;
    } else {
      mismatch = true;
      if (parsed.imagesTotal === 0) {
        reasonCode = "PAGE_UNREACHABLE";
        humanMessage = `We loaded this page but found no <img> tags in the HTML. The images are probably rendered by JavaScript, which search crawlers also cannot read.`;
      } else {
        reasonCode = "THEME_DOES_NOT_READ_METAFIELD";
        humanMessage = `We saved this alt text, but none of the ${parsed.imagesTotal} images on your live page carry it. Your theme is rendering its own alt attribute.`;
      }
    }
  } else if (field === "schema") {
    const wanted = norm(expectedValue) || "product";
    const types = parsed.jsonLdBlocks.flatMap((b) => {
      const t = (b as any)?.["@type"];
      return Array.isArray(t) ? t : [t];
    }).filter(Boolean).map((t: string) => String(t));
    observedValue = types.join(", ") || null;
    if (types.some((t) => norm(t) === wanted)) {
      resultStatus = "PASS";
      humanMessage = `Verified in your live page <head>: a ${expectedValue} JSON-LD block is present.`;
    } else {
      mismatch = true;
      reasonCode = "APP_EMBED_DISABLED";
      humanMessage = types.length
        ? `Your live page has JSON-LD for ${types.join(", ")} but not ${expectedValue}.`
        : `No JSON-LD found on your live page. Our app embed block is switched off in your theme editor.`;
    }
  } else if (field === "canonical") {
    observedValue = parsed.canonical;
    if (matches(parsed.canonical, expectedValue)) {
      resultStatus = "PASS";
      humanMessage = `Verified live canonical tag: ${parsed.canonical}`;
    } else {
      mismatch = true;
      reasonCode = "OVERWRITTEN_BY_OTHER_APP";
      humanMessage = `Your live canonical is "${parsed.canonical ?? "missing"}", not the value we expected.`;
    }
  }

  // A mismatch on an early attempt is a CDN cache question, not a diagnosis.
  let retryScheduled = false;
  let retryAt: string | null = null;

  if (mismatch && attempt < MAX_ATTEMPTS) {
    const delayMs = RETRY_DELAYS_MS[attempt - 1];
    const job = await enqueue(
      "verify",
      { shopDomain, changeId, targetUrl, field, expectedValue, attempt: attempt + 1 },
      { delayMs, attempts: 2 }
    );
    if (job.scheduled) {
      retryScheduled = true;
      retryAt = job.runsAt;
      resultStatus = "PENDING";
      reasonCode = "CACHE_PENDING";
      humanMessage = `Applied. Your storefront cache has not refreshed yet — we will check again automatically.`;
    }
    // If the queue could not take it, we keep the real FAIL diagnosis above and
    // deliberately do NOT tell the merchant a retry is coming.
  }

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
    attempt,
    retryScheduled,
    retryAt,
    attemptedAt: dbRecord.attempted_at,
  };
}

registerHandler("verify", async (data: {
  shopDomain: string;
  changeId: string;
  targetUrl: string;
  field: VerifiableField;
  expectedValue: string;
  attempt: number;
}) => {
  return verifyAppliedSeoChangeOnLivePage(
    data.shopDomain,
    data.changeId,
    data.targetUrl,
    data.field,
    data.expectedValue,
    data.attempt
  );
});

/** Queue a first verification instead of blocking the merchant's request on a CDN fetch. */
export async function scheduleVerification(
  shopDomain: string,
  changeId: string,
  targetUrl: string,
  field: VerifiableField,
  expectedValue: string,
  delayMs = 45_000
) {
  return enqueue("verify", { shopDomain, changeId, targetUrl, field, expectedValue, attempt: 1 }, { delayMs });
}

export async function getVerificationHistory(shopDomain: string) {
  return await prisma.verification.findMany({
    where: { shop_domain: shopDomain },
    orderBy: { attempted_at: "desc" },
    take: 50,
  });
}
