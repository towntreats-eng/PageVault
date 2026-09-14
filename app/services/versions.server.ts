/**
 * Content Version History & Rollback Service
 * Records immutable pre-change snapshots and provides 1-click rollback via Shopify GraphQL.
 */

import prisma from "../db.server";
import { executeGraphQL } from "./graphql.server";

export interface SnapshotInput {
  shopDomain: string;
  resourceType: "product" | "collection" | "page" | "article" | "theme_section";
  resourceGid: string;
  field: "title" | "description" | "seo_title" | "seo_description" | "alt_text" | "full_snapshot";
  beforeValue: string;
  afterValue: string;
  reason?: string;
  confidence?: number;
}

export async function recordContentVersion(input: SnapshotInput) {
  return await prisma.contentVersion.create({
    data: {
      shopDomain: input.shopDomain,
      resourceType: input.resourceType,
      resourceGid: input.resourceGid,
      field: input.field,
      beforeValue: input.beforeValue,
      afterValue: input.afterValue,
      reason: input.reason || "AI Optimization applied",
      confidence: input.confidence || 90,
      appliedAt: new Date(),
    },
  });
}

export async function rollbackContentVersion(
  admin: { graphql: any },
  versionId: string,
  shopDomain: string
): Promise<{ success: boolean; message: string }> {
  const version = await prisma.contentVersion.findFirst({
    where: { id: versionId, shopDomain },
  });

  if (!version) {
    throw new Error(`Version snapshot ${versionId} not found.`);
  }

  if (version.revertedAt) {
    return { success: true, message: "Version was already reverted." };
  }

  const { resourceType, resourceGid, field, beforeValue } = version;

  // Execute the exact reversal via Shopify GraphQL
  if (resourceType === "product") {
    if (field === "title" || field === "description") {
      const mutation = `#graphql
        mutation rollbackProduct($input: ProductInput!) {
          productUpdate(input: $input) {
            product { id title }
            userErrors { field message }
          }
        }
      `;
      const input: any = { id: resourceGid };
      if (field === "title") input.title = beforeValue;
      if (field === "description") input.descriptionHtml = beforeValue;

      const data: any = await executeGraphQL(admin, mutation, { input });
      const errs = data?.productUpdate?.userErrors || [];
      if (errs.length > 0) {
        throw new Error(`Rollback failed: ${errs.map((e: any) => e.message).join(", ")}`);
      }

      // Update local db
      await prisma.productRecord.updateMany({
        where: { shopifyGid: resourceGid },
        data: field === "title" ? { title: beforeValue } : { description: beforeValue },
      });
    } else if (field === "seo_title" || field === "seo_description") {
      const metaKey = field === "seo_title" ? "title_tag" : "description_tag";
      const mutation = `#graphql
        mutation rollbackMetafield($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields { id value }
            userErrors { field message }
          }
        }
      `;
      const data: any = await executeGraphQL(admin, mutation, {
        metafields: [
          {
            ownerId: resourceGid,
            namespace: "global",
            key: metaKey,
            value: beforeValue,
            type: "single_line_text_field",
          },
        ],
      });
      const errs = data?.metafieldsSet?.userErrors || [];
      if (errs.length > 0) {
        throw new Error(`Rollback failed: ${errs.map((e: any) => e.message).join(", ")}`);
      }

      await prisma.productRecord.updateMany({
        where: { shopifyGid: resourceGid },
        data: field === "seo_title" ? { seoTitle: beforeValue } : { seoDescription: beforeValue },
      });
    }
  }

  // Mark reverted in database
  await prisma.contentVersion.update({
    where: { id: versionId },
    data: { revertedAt: new Date() },
  });

  return { success: true, message: `Successfully rolled back ${field} to original value.` };
}

export async function getVersionHistory(shopDomain: string, limit = 50) {
  return await prisma.contentVersion.findMany({
    where: { shopDomain },
    orderBy: { appliedAt: "desc" },
    take: limit,
  });
}
