import prisma from "../db.server";
import { ParsedHtmlMetadata } from "./parser.server";

export interface GeneratedIssue {
  code: "missing_title" | "title_too_long" | "title_too_short" | "missing_desc" | "desc_too_long" | "desc_too_short" | "missing_alt" | "thin_content" | "missing_canonical";
  severity: "critical" | "warning" | "info";
  detail: string;
}

export function evaluatePageSeoRules(meta: ParsedHtmlMetadata): GeneratedIssue[] {
  const issues: GeneratedIssue[] = [];

  // Title rules
  if (!meta.title) {
    issues.push({
      code: "missing_title",
      severity: "critical",
      detail: "Page is missing a title tag (<title>).",
    });
  } else if (meta.titleLength > 60) {
    issues.push({
      code: "title_too_long",
      severity: "warning",
      detail: `Title tag is ${meta.titleLength} characters long (recommended: 30-60 characters).`,
    });
  } else if (meta.titleLength < 20) {
    issues.push({
      code: "title_too_short",
      severity: "warning",
      detail: `Title tag is only ${meta.titleLength} characters long (recommended: 30-60 characters).`,
    });
  }

  // Meta description rules
  if (!meta.description) {
    issues.push({
      code: "missing_desc",
      severity: "critical",
      detail: "Page is missing a meta description tag.",
    });
  } else if (meta.descriptionLength > 160) {
    issues.push({
      code: "desc_too_long",
      severity: "warning",
      detail: `Meta description is ${meta.descriptionLength} characters long (recommended: 70-160 characters).`,
    });
  } else if (meta.descriptionLength < 70) {
    issues.push({
      code: "desc_too_short",
      severity: "warning",
      detail: `Meta description is only ${meta.descriptionLength} characters long (recommended: 70-160 characters).`,
    });
  }

  // Missing ALT attributes rule
  if (meta.imagesMissingAlt > 0) {
    issues.push({
      code: "missing_alt",
      severity: "warning",
      detail: `${meta.imagesMissingAlt} of ${meta.imagesTotal} images are missing keyword-rich ALT tags.`,
    });
  }

  // Thin content rule
  if (meta.wordCount < 150) {
    issues.push({
      code: "thin_content",
      severity: "info",
      detail: `Page contains thin body content (${meta.wordCount} words). Aim for 300+ words.`,
    });
  }

  // Canonical tag rule
  if (!meta.canonical) {
    issues.push({
      code: "missing_canonical",
      severity: "critical",
      detail: "Page is missing a canonical link tag (<link rel='canonical'>).",
    });
  }

  return issues;
}

export async function auditAndRecordPageIssues(
  shopDomain: string,
  pageRecordId: string,
  meta: ParsedHtmlMetadata
) {
  const issues = evaluatePageSeoRules(meta);

  // Clear obsolete unresolved issues for this page
  await prisma.issue.deleteMany({
    where: { shop_domain: shopDomain, page_record_id: pageRecordId },
  });

  for (const issue of issues) {
    await prisma.issue.create({
      data: {
        shop_domain: shopDomain,
        page_record_id: pageRecordId,
        code: issue.code,
        severity: issue.severity,
        detail: issue.detail,
      },
    });
  }

  return issues;
}

export async function getStoreIssuesSummary(shopDomain: string) {
  const issues = await prisma.issue.findMany({
    where: { shop_domain: shopDomain },
    orderBy: { created_at: "desc" },
    take: 100,
  });

  const critical = issues.filter((i) => i.severity === "critical").length;
  const warning = issues.filter((i) => i.severity === "warning").length;
  const info = issues.filter((i) => i.severity === "info").length;

  return {
    issues,
    totalCount: issues.length,
    criticalCount: critical,
    warningCount: warning,
    infoCount: info,
  };
}
