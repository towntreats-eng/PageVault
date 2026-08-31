import prisma from "../db.server";
import { executeShopifyGraphQL } from "./graphql.server";
import { verifyAppliedSeoChangeOnLivePage } from "./proof_engine.server";

export interface AutopilotStatus {
  enabled: boolean;
  suggestMode: boolean; // true = first 7 days suggest-only mode
  daysActive: number;
  pendingQueueCount: number;
  autoAppliedCount: number;
}

/**
 * Task 7.1 - Autopilot Rules Engine
 * Automatically optimizes new/updated products & enqueues Proof Engine live verification
 */
export async function processProductAutopilot(
  admin: any,
  shopDomain: string,
  productGid: string,
  suggestMode = true
) {
  // Query product details from Shopify
  const query = `
    query getProduct($id: ID!) {
      product(id: $id) {
        id
        title
        descriptionHtml
        handle
        vendor
        featuredImage {
          url
        }
      }
    }
  `;

  const responseJson = await executeShopifyGraphQL(admin, query, { id: productGid });
  const product = responseJson?.data?.product;

  if (!product) {
    throw new Error(`Product ${productGid} not found.`);
  }

  const suggestedTitle = `Buy ${product.title} | Premium ${product.vendor || "Quality"} - Fast Shipping`;
  const suggestedDesc = `Discover ${product.title}. Premium craftsmanship, top rated quality, and fast doorstep delivery. Shop now!`;

  if (suggestMode) {
    // Task 7.2: Enqueue in 7-day approval queue for merchant review before auto-applying
    const queueItem = await prisma.autopilotQueue.create({
      data: {
        shop_domain: shopDomain,
        resource_gid: productGid,
        resource_type: "product",
        suggested_title: suggestedTitle,
        suggested_desc: suggestedDesc,
        status: "pending",
      },
    });

    console.log(`[Autopilot Suggest Mode] Enqueued optimization suggestion for ${product.title} (${queueItem.id}).`);
    return { mode: "suggest", item: queueItem };
  } else {
    // Task 7.1: Apply directly & enqueue live proof verification
    const mutation = `
      mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          userErrors { message }
        }
      }
    `;

    const variables = {
      metafields: [
        {
          ownerId: productGid,
          namespace: "global",
          key: "title_tag",
          value: suggestedTitle,
          type: "single_line_text_field",
        },
        {
          ownerId: productGid,
          namespace: "global",
          key: "description_tag",
          value: suggestedDesc,
          type: "single_line_text_field",
        },
      ],
    };

    await executeShopifyGraphQL(admin, mutation, variables);

    // Record change & enqueue live proof engine verification
    const change = await prisma.change.create({
      data: {
        shop_domain: shopDomain,
        resource_gid: productGid,
        field: "title_tag",
        before_value: product.title,
        after_value: suggestedTitle,
        source: "autopilot",
      },
    });

    const pageUrl = `https://${shopDomain}/products/${product.handle}`;
    await verifyAppliedSeoChangeOnLivePage(shopDomain, change.id, pageUrl, "title", suggestedTitle);

    return { mode: "applied", changeId: change.id };
  }
}

/**
 * Weekly proof report.
 *
 * Counts only what happened in the last 7 days, and only what we can prove.
 * The previous version fell back to "42 optimizations / 40 verified" when the
 * store had none, hardcoded a 95.2% verification rate, claimed "+18.4% traffic
 * growth" that was never measured, and listed two invented keyword rankings -
 * in an email and a WhatsApp message sent to the merchant.
 */
export async function generateWeeklyProofReport(shopDomain: string) {
  const since = new Date(Date.now() - 7 * 86_400_000);

  const [applied, verified, notDetected, pending] = await Promise.all([
    prisma.change.count({ where: { shop_domain: shopDomain, applied_at: { gte: since } } }),
    prisma.verification.count({ where: { shop_domain: shopDomain, result: "PASS", attempted_at: { gte: since } } }),
    prisma.verification.count({ where: { shop_domain: shopDomain, result: "FAIL", attempted_at: { gte: since } } }),
    prisma.verification.count({ where: { shop_domain: shopDomain, result: "PENDING", attempted_at: { gte: since } } }),
  ]);

  const checked = verified + notDetected;
  const verificationRate = checked === 0 ? null : Math.round((verified / checked) * 100);

  const nothingHappened = applied === 0 && checked === 0;

  return {
    shopDomain,
    periodStart: since.toISOString(),
    periodEnd: new Date().toISOString(),
    applied,
    verified,
    notDetected,
    pending,
    /** null when nothing was checked. Never rendered as a percentage. */
    verificationRate,
    nothingHappened,
    emailDigestSubject: nothingHappened
      ? `[ProofSEO] Nothing changed on ${shopDomain} this week`
      : `[ProofSEO] ${verified} change${verified === 1 ? "" : "s"} verified on ${shopDomain} this week`,
    emailBody: nothingHappened
      ? `We made no changes to ${shopDomain} in the last 7 days, so there is nothing to report. Open the app if you would like to run a scan.`
      : `In the last 7 days we applied ${applied} change${applied === 1 ? "" : "s"} to ${shopDomain}. ` +
        `${verified} ${verified === 1 ? "has" : "have"} been confirmed on your live storefront` +
        `${notDetected > 0 ? `, and ${notDetected} could not be found on the live page - open the app to see why` : ""}` +
        `${pending > 0 ? `. ${pending} ${pending === 1 ? "is" : "are"} still being checked` : ""}.`,
  };
}
