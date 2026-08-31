/**
 * The five words this app is allowed to use for the state of a change,
 * and the human sentence for every failure reason. See 12-UI-UX-SPEC.md §4 and §5.5.
 *
 * "Optimized" is not in this list and must never appear in the UI.
 */
export type ChangeStatus = "Verified" | "Applied" | "Not detected" | "Failed" | "Not started";

export function statusFromVerification(result?: string | null, hasChange = false): ChangeStatus {
  if (result === "PASS") return "Verified";
  if (result === "PENDING") return "Applied";
  if (result === "FAIL") return "Not detected";
  return hasChange ? "Applied" : "Not started";
}

export function statusTone(status: ChangeStatus): "success" | "info" | "warning" | "critical" | undefined {
  switch (status) {
    case "Verified": return "success";
    case "Applied": return "info";
    case "Not detected": return "warning";
    case "Failed": return "critical";
    default: return undefined;
  }
}

export interface ReasonCopy {
  headline: string;
  action: string | null;
  actionUrl?: string;
}

/** One lookup table, used everywhere a reason code is shown. */
export const REASON_COPY: Record<string, ReasonCopy> = {
  THEME_DOES_NOT_READ_METAFIELD: {
    headline:
      "Your theme doesn't display this field, so the value we saved never reaches your page. This is a theme limitation, not a Shopify one.",
    action: "See how to fix this in your theme",
    actionUrl: "https://shopify.dev/docs/storefronts/themes/architecture/templates/product",
  },
  OVERWRITTEN_BY_OTHER_APP: {
    headline: "Another app or a theme setting is writing a different value on this page.",
    action: null,
  },
  CACHE_PENDING: {
    headline: "Applied. Your storefront cache hasn't refreshed yet — we'll check again automatically.",
    action: null,
  },
  APP_EMBED_DISABLED: {
    headline: "Our app embed is switched off in your theme, so structured data isn't being added.",
    action: "Enable it in the theme editor",
  },
  PAGE_UNREACHABLE: {
    headline: "We couldn't load this page. It may be deleted, redirected, or your store is password-protected.",
    action: null,
  },
};

export function reasonCopy(code?: string | null): ReasonCopy | null {
  if (!code) return null;
  return REASON_COPY[code] ?? { headline: code, action: null };
}

/** Issue codes from the rule engine, in merchant language. */
export const ISSUE_COPY: Record<string, { label: string; why: string; fix: string }> = {
  missing_title: {
    label: "No page title",
    why: "Google shows the page title as the clickable headline in search results. Without one it invents something from your page.",
    fix: "Write a meta title",
  },
  title_too_long: {
    label: "Title is too long",
    why: "Google cuts titles off at roughly 60 characters, so the end of yours is not seen.",
    fix: "Shorten the meta title",
  },
  title_too_short: {
    label: "Title is very short",
    why: "A short title wastes the most valuable line you get in search results.",
    fix: "Expand the meta title",
  },
  missing_desc: {
    label: "No meta description",
    why: "Google picks a random sentence from the page instead, which usually reads badly.",
    fix: "Write a meta description",
  },
  desc_too_long: {
    label: "Meta description is too long",
    why: "Anything past about 160 characters is cut off.",
    fix: "Shorten the meta description",
  },
  desc_too_short: {
    label: "Meta description is very short",
    why: "You are leaving space unused in the search result.",
    fix: "Expand the meta description",
  },
  missing_alt: {
    label: "Images without alt text",
    why: "Alt text is what search engines and screen readers read instead of the picture.",
    fix: "Add alt text",
  },
  thin_content: {
    label: "Very little text on the page",
    why: "There is not enough on the page for a search engine to understand what it is about.",
    fix: "Add product detail",
  },
  missing_canonical: {
    label: "No canonical tag",
    why: "Without it, duplicate versions of this URL can compete with each other.",
    fix: "Check your theme",
  },
};

export function issueCopy(code: string) {
  return ISSUE_COPY[code] ?? { label: code, why: "", fix: "Review" };
}
