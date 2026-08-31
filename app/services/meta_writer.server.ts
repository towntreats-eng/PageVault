import prisma from "../db.server";
import { executeShopifyGraphQL } from "./graphql.server";
import { scheduleVerification } from "./proof_engine.server";
import { renderMetaTemplate, type TemplateVariables } from "../utils/template";

export { renderMetaTemplate, type TemplateVariables };

/**
 * Task 2.1 & 2.4 - Writes SEO Metafield (global.title_tag / global.description_tag)
 * Enforces MANUAL-VALUE PROTECTION: Never overwrites human-written values.
 */
export async function writeResourceSeoMetafield(
  admin: any,
  shopDomain: string,
  resourceGid: string,
  field: "title_tag" | "description_tag",
  newValue: string,
  targetUrl: string,
  source: "manual" | "autopilot" | "bulk" = "manual"
) {
  // Query current metafield & SEO values for Manual-Value Protection check (Task 2.4)
  const currentQuery = `
    query getResourceSeo($id: ID!) {
      node(id: $id) {
        ... on Product {
          seo { title description }
        }
        ... on Collection {
          seo { title description }
        }
        ... on Page {
          seo { title description }
        }
        ... on Article {
          seo { title description }
        }
      }
    }
  `;

  let beforeValue: string | null = null;
  try {
    const res = await executeShopifyGraphQL(admin, currentQuery, { id: resourceGid });
    const node = res?.data?.node;
    if (node?.seo) {
      beforeValue = field === "title_tag" ? node.seo.title : node.seo.description;
    }
  } catch (err) {
    console.warn(`[MetaWriter] Fetch beforeValue fallback for ${resourceGid}:`, err);
  }

  // Task 2.4: Manual-value protection check
  // If human wrote a custom title/description (source != manual), do NOT overwrite unless empty/duplicate
  if (source !== "manual" && beforeValue && beforeValue.trim() !== "" && beforeValue !== newValue) {
    console.log(`[Manual Protection] Preserved existing human-written ${field} for ${resourceGid}: "${beforeValue}"`);
    return {
      success: false,
      protected: true,
      reason: "Preserved human-written text per 06-RULES.md §B2",
    };
  }

  // GraphQL metafieldsSet mutation
  const mutation = `
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          id
          namespace
          key
          value
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    metafields: [
      {
        ownerId: resourceGid,
        namespace: "global",
        key: field,
        type: "single_line_text_field",
        value: newValue,
      },
    ],
  };

  const responseJson = await executeShopifyGraphQL(admin, mutation, variables);
  const errors = responseJson?.data?.metafieldsSet?.userErrors;

  if (errors && errors.length > 0) {
    throw new Error(`metafieldsSet error: ${errors[0].message}`);
  }

  // Task 2.5: Record Change row in DB
  const changeRecord = await prisma.change.create({
    data: {
      shop_domain: shopDomain,
      resource_gid: resourceGid,
      field,
      before_value: beforeValue,
      after_value: newValue,
      source,
    },
  });

  // Verification runs after a CDN delay, never inline: fetching the live page
  // milliseconds after the write would report a false failure.
  const job = await scheduleVerification(
    shopDomain,
    changeRecord.id,
    targetUrl,
    field === "title_tag" ? "title" : "description",
    newValue
  );

  return {
    success: true,
    changeId: changeRecord.id,
    newValue,
    // "Applied" is the strongest claim allowed until the live page says otherwise.
    status: "Applied" as const,
    verification: {
      scheduled: job.scheduled,
      durable: job.durable,
      runsAt: job.runsAt,
    },
  };
}

/**
 * Writes media ALT text via fileUpdate.
 * productUpdateMedia is deprecated (and reports failures in mediaUserErrors, which
 * the old implementation never read, so failed writes looked like successes).
 */
export async function updateProductImageAltText(
  admin: any,
  shopDomain: string,
  productId: string,
  mediaId: string,
  newAltText: string,
  targetUrl: string
) {
  const mutation = `
    mutation fileUpdate($files: [FileUpdateInput!]!) {
      fileUpdate(files: $files) {
        files {
          id
          alt
          fileStatus
        }
        userErrors {
          field
          message
          code
        }
      }
    }
  `;

  const variables = {
    files: [
      {
        id: mediaId,
        alt: newAltText,
      },
    ],
  };

  const responseJson = await executeShopifyGraphQL(admin, mutation, variables);
  const errors = responseJson?.data?.fileUpdate?.userErrors;

  if (errors && errors.length > 0) {
    throw new Error(`fileUpdate error: ${errors[0].message}`);
  }

  const changeRecord = await prisma.change.create({
    data: {
      shop_domain: shopDomain,
      resource_gid: mediaId,
      field: "alt",
      after_value: newAltText,
      source: "manual",
    },
  });

  const job = await scheduleVerification(
    shopDomain,
    changeRecord.id,
    targetUrl,
    "alt",
    newAltText
  );

  return {
    success: true,
    changeId: changeRecord.id,
    newAltText,
    status: "Applied" as const,
    verification: {
      scheduled: job.scheduled,
      durable: job.durable,
      runsAt: job.runsAt,
    },
  };
}

/**
 * Task 2.6 - Undo changes applied in the last 24 hours
 */
export async function revertLast24HourChanges(admin: any, shopDomain: string) {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const changes = await prisma.change.findMany({
    where: {
      shop_domain: shopDomain,
      applied_at: { gte: twentyFourHoursAgo },
      reverted_at: null,
    },
    orderBy: { applied_at: "desc" },
  });

  let revertedCount = 0;

  for (const change of changes) {
    if (change.before_value !== null && change.field.includes("tag")) {
      try {
        await writeResourceSeoMetafield(
          admin,
          shopDomain,
          change.resource_gid,
          change.field as "title_tag" | "description_tag",
          change.before_value,
          `https://${shopDomain}`,
          "manual"
        );

        await prisma.change.update({
          where: { id: change.id },
          data: { reverted_at: new Date() },
        });

        revertedCount++;
      } catch (err) {
        console.error(`[Revert Error] Failed to revert change ${change.id}:`, err);
      }
    }
  }

  return {
    success: true,
    revertedCount,
  };
}
