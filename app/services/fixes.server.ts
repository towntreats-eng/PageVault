import prisma from "../db.server";
import { executeShopifyGraphQL } from "./graphql.server";
import { writeResourceSeoMetafield } from "./meta_writer.server";

/**
 * Preview-then-apply. Nothing in this app writes to a store without the merchant
 * first seeing the exact before and after, including what we refuse to touch.
 * See 12-UI-UX-SPEC.md §5.2.
 */

export interface ProposedChange {
  resourceGid: string;
  resourceTitle: string;
  url: string;
  field: "title_tag" | "description_tag";
  currentValue: string | null;
  newValue: string;
  /** empty_to_filled = safe fill. human_value = we will not touch it. */
  kind: "empty_to_filled" | "human_value";
  reason: string;
}

export interface FixPreview {
  available: boolean;
  error?: string;
  productsScanned: number;
  proposed: ProposedChange[];
  skipped: ProposedChange[];
}

function truncate(s: string, max: number) {
  const clean = s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : clean.slice(0, max - 1).trimEnd() + "…";
}

/** Builds the diff. Makes no writes. */
export async function buildMetaFixPreview(admin: any, shopDomain: string, limit = 100): Promise<FixPreview> {
  try {
    const shopRes: any = await executeShopifyGraphQL(admin, `query { shop { name } }`);
    const shopName = shopRes?.data?.shop?.name ?? shopDomain.replace(".myshopify.com", "");

    const proposed: ProposedChange[] = [];
    const skipped: ProposedChange[] = [];
    let cursor: string | null = null;
    let productsScanned = 0;

    for (let page = 0; page < 20 && proposed.length < limit; page++) {
      const res: any = await executeShopifyGraphQL(
        admin,
        `query fixPreview($first: Int!, $after: String) {
          products(first: $first, after: $after) {
            pageInfo { hasNextPage endCursor }
            edges {
              node { id title handle description seo { title description } }
            }
          }
        }`,
        { first: 50, after: cursor }
      );

      const conn = res?.data?.products;
      if (!conn) break;

      for (const edge of conn.edges ?? []) {
        const p = edge.node;
        productsScanned++;
        const url = `https://${shopDomain}/products/${p.handle}`;

        const titleValue = truncate(`${p.title} | ${shopName}`, 60);
        if (!p.seo?.title) {
          proposed.push({
            resourceGid: p.id, resourceTitle: p.title, url, field: "title_tag",
            currentValue: null, newValue: titleValue,
            kind: "empty_to_filled", reason: "No meta title set",
          });
        } else {
          skipped.push({
            resourceGid: p.id, resourceTitle: p.title, url, field: "title_tag",
            currentValue: p.seo.title, newValue: p.seo.title,
            kind: "human_value", reason: "You already wrote this — we will not touch it",
          });
        }

        const source = (p.description || "").replace(/\s+/g, " ").trim();
        if (!p.seo?.description) {
          if (source.length >= 50) {
            proposed.push({
              resourceGid: p.id, resourceTitle: p.title, url, field: "description_tag",
              currentValue: null, newValue: truncate(source, 155),
              kind: "empty_to_filled", reason: "No meta description set",
            });
          } else {
            skipped.push({
              resourceGid: p.id, resourceTitle: p.title, url, field: "description_tag",
              currentValue: null, newValue: "",
              kind: "human_value",
              reason: "This product has no description, so there is nothing truthful to write",
            });
          }
        } else {
          skipped.push({
            resourceGid: p.id, resourceTitle: p.title, url, field: "description_tag",
            currentValue: p.seo.description, newValue: p.seo.description,
            kind: "human_value", reason: "You already wrote this — we will not touch it",
          });
        }
      }

      if (!conn.pageInfo?.hasNextPage) break;
      cursor = conn.pageInfo.endCursor;
    }

    return { available: true, productsScanned, proposed: proposed.slice(0, limit), skipped };
  } catch (err) {
    return { available: false, error: (err as Error).message, productsScanned: 0, proposed: [], skipped: [] };
  }
}

export interface ApplyResult {
  written: number;
  protectedCount: number;
  failed: { resourceGid: string; message: string }[];
}

/** Applies exactly the changes the merchant saw and approved. */
export async function applyProposedChanges(
  admin: any,
  shopDomain: string,
  changes: ProposedChange[]
): Promise<ApplyResult> {
  const result: ApplyResult = { written: 0, protectedCount: 0, failed: [] };

  for (const c of changes) {
    try {
      const res: any = await writeResourceSeoMetafield(
        admin, shopDomain, c.resourceGid, c.field, c.newValue, c.url, "bulk"
      );
      if (res?.success) result.written++;
      else if (res?.protected) result.protectedCount++;
    } catch (err) {
      result.failed.push({ resourceGid: c.resourceGid, message: (err as Error).message });
    }
  }

  return result;
}

export interface IssueRow {
  id: string;
  code: string;
  severity: string;
  detail: string;
  url: string;
  resourceType: string;
  createdAt: Date;
}

/** Issues from the crawler's rule engine, joined to the page they came from. */
export async function getIssuesWithPages(shopDomain: string): Promise<IssueRow[]> {
  const issues = await prisma.issue.findMany({
    where: { shop_domain: shopDomain, resolved_at: null },
    orderBy: { created_at: "desc" },
    take: 500,
  });
  if (issues.length === 0) return [];

  const pages = await prisma.pageRecord.findMany({
    where: { id: { in: Array.from(new Set(issues.map((i) => i.page_record_id))) } },
  });
  const pageById = new Map(pages.map((p) => [p.id, p]));

  return issues.map((i) => {
    const page = pageById.get(i.page_record_id);
    return {
      id: i.id,
      code: i.code,
      severity: i.severity,
      detail: i.detail,
      url: page?.url ?? "(page removed)",
      resourceType: page?.resource_type ?? "page",
      createdAt: i.created_at,
    };
  });
}
