import prisma from "../db.server";

/**
 * Task 9.11: IndexNow Protocol Implementation
 *
 * Supported by Microsoft Bing, Yandex, Seznam, Naver.
 * Allows instant submission of newly created, updated, or deleted URLs so search
 * engines can crawl and index them within seconds rather than weeks.
 */

const INDEXNOW_API_URL = "https://api.indexnow.org/indexnow";

export interface IndexNowResult {
  success: boolean;
  statusCode: number;
  message: string;
  submittedUrls: string[];
}

/**
 * Generates or retrieves a persistent IndexNow API key for this shop.
 */
export async function getIndexNowKey(shopDomain: string): Promise<string> {
  const shop = await prisma.shop.findUnique({
    where: { domain: shopDomain },
    select: { id: true },
  });

  if (shop && shop.id) {
    // 32-char hex string derived cleanly from the shop's unique ID
    return shop.id.replace(/-/g, "").padEnd(32, "0").slice(0, 32);
  }

  // Fallback deterministic key
  let hash = 0;
  for (let i = 0; i < shopDomain.length; i++) {
    hash = (hash << 5) - hash + shopDomain.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padEnd(32, "a").slice(0, 32);
}

/**
 * Submits a list of URLs to the IndexNow central API.
 */
export async function submitToIndexNow(
  shopDomain: string,
  urls: string[]
): Promise<IndexNowResult> {
  if (!urls || urls.length === 0) {
    return {
      success: false,
      statusCode: 400,
      message: "No URLs provided for submission.",
      submittedUrls: [],
    };
  }

  // Clean and normalize URLs
  const cleanUrls = urls
    .map((u) => u.trim())
    .filter((u) => u.startsWith("http://") || u.startsWith("https://"))
    .slice(0, 1000); // IndexNow limit per request

  if (cleanUrls.length === 0) {
    return {
      success: false,
      statusCode: 400,
      message: "Provided URLs must be valid absolute URLs starting with http:// or https://.",
      submittedUrls: [],
    };
  }

  const key = await getIndexNowKey(shopDomain);
  const host = shopDomain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  const payload = {
    host,
    key,
    keyLocation: `https://${host}/${key}.txt`,
    urlList: cleanUrls,
  };

  try {
    const response = await fetch(INDEXNOW_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });

    const statusCode = response.status;
    let message = "";

    // IndexNow response specifications
    switch (statusCode) {
      case 200:
        message = `Successfully submitted ${cleanUrls.length} URL(s) to IndexNow.`;
        break;
      case 202:
        message = `Accepted: ${cleanUrls.length} URL(s) queued. Key validation is pending.`;
        break;
      case 400:
        message = "IndexNow returned 400 Bad Request (Invalid format).";
        break;
      case 403:
        message = "IndexNow returned 403 Forbidden (Key invalid or key not found on host).";
        break;
      case 422:
        message = "IndexNow returned 422 Unprocessable Entity (URLs do not match host).";
        break;
      case 429:
        message = "IndexNow returned 429 Too Many Requests.";
        break;
      default:
        message = `IndexNow response status code: ${statusCode}`;
    }

    const success = statusCode === 200 || statusCode === 202;

    // Persist event in database log
    await prisma.event.create({
      data: {
        shop_domain: shopDomain,
        type: "indexnow_submit",
        payload: JSON.stringify({
          urls: cleanUrls,
          statusCode,
          success,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return {
      success,
      statusCode,
      message,
      submittedUrls: cleanUrls,
    };
  } catch (err) {
    const errorMsg = (err as Error).message;
    console.error(`[IndexNow] Submission failed for ${shopDomain}:`, errorMsg);

    await prisma.event.create({
      data: {
        shop_domain: shopDomain,
        type: "indexnow_submit_error",
        payload: JSON.stringify({
          error: errorMsg,
          urls: cleanUrls,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return {
      success: false,
      statusCode: 500,
      message: `IndexNow submission error: ${errorMsg}`,
      submittedUrls: cleanUrls,
    };
  }
}

/**
 * Retrieves IndexNow submission logs for the merchant dashboard.
 */
export async function getIndexNowLogs(shopDomain: string, limit = 20) {
  const events = await prisma.event.findMany({
    where: {
      shop_domain: shopDomain,
      type: { in: ["indexnow_submit", "indexnow_submit_error"] },
    },
    orderBy: { created_at: "desc" },
    take: limit,
  });

  return events.map((e) => {
    let details: any = {};
    try {
      details = JSON.parse(e.payload || "{}");
    } catch {
      /* ignore */
    }

    return {
      id: e.id,
      timestamp: e.created_at,
      type: e.type,
      statusCode: details.statusCode ?? 500,
      success: Boolean(details.success),
      urlCount: Array.isArray(details.urls) ? details.urls.length : 0,
      urls: details.urls ?? [],
      error: details.error ?? null,
    };
  });
}
