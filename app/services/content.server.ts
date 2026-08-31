import { executeShopifyGraphQL } from "./graphql.server";
import { fetchSearchAnalytics } from "./gsc.server";
import { isOverBudget, trackDataSpend } from "./keyword_engine.server";

/**
 * Content planner and draft generator.
 *
 * Clusters are built from the queries this store is ALREADY seen for in Search
 * Console — not from a generic keyword list — so every topic is grounded in real
 * demand this store can measure. Drafts are created as unpublished Shopify
 * articles; publishing is always a human action.
 */

export interface TopicCluster {
  id: string;
  label: string;
  queries: { query: string; impressions: number; position: number; clicks: number }[];
  totalImpressions: number;
  totalClicks: number;
  avgPosition: number;
  /** Real signal: high impressions and a bad position means demand you are missing. */
  opportunity: "high" | "medium" | "low";
}

const STOPWORDS = new Set([
  "the", "a", "an", "for", "and", "or", "to", "of", "in", "on", "with", "best", "how", "what",
  "is", "are", "my", "your", "you", "it", "at", "by", "from", "near", "me", "vs", "can", "do",
]);

function headToken(query: string): string {
  const tokens = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2 && !STOPWORDS.has(t));
  if (tokens.length === 0) return query.toLowerCase();
  // The longest meaningful token is a decent cluster key without an NLP dependency.
  return tokens.sort((a, b) => b.length - a.length)[0];
}

export async function buildTopicClusters(shopDomain: string, seed?: string) {
  const gsc = await fetchSearchAnalytics(shopDomain, { days: 90, rowLimit: 1000 });
  if (!gsc.available) {
    return {
      available: false,
      connected: gsc.connected,
      reason: gsc.connected
        ? gsc.error ?? "Search Console returned no data."
        : "Connect Google Search Console. We build topics from queries your store is really seen for, not from a generic keyword list.",
      clusters: [] as TopicCluster[],
      range: null,
    };
  }

  const seedTerm = seed?.trim().toLowerCase();
  const rows = gsc.rows.filter((r) => r.query && (!seedTerm || r.query.toLowerCase().includes(seedTerm)));

  const byToken = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = headToken(r.query);
    const list = byToken.get(key) ?? [];
    list.push(r);
    byToken.set(key, list);
  }

  const clusters: TopicCluster[] = [];
  for (const [token, list] of byToken) {
    if (list.length < 2) continue;
    const totalImpressions = list.reduce((a, r) => a + r.impressions, 0);
    const totalClicks = list.reduce((a, r) => a + r.clicks, 0);
    if (totalImpressions < 30) continue;
    const avgPosition = list.reduce((a, r) => a + r.position, 0) / list.length;

    clusters.push({
      id: token,
      label: token,
      queries: list
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 20)
        .map((r) => ({ query: r.query, impressions: r.impressions, position: r.position, clicks: r.clicks })),
      totalImpressions,
      totalClicks,
      avgPosition: Math.round(avgPosition * 10) / 10,
      opportunity: totalImpressions >= 300 && avgPosition > 10 ? "high" : avgPosition > 20 ? "medium" : "low",
    });
  }

  clusters.sort((a, b) => b.totalImpressions - a.totalImpressions);
  return { available: true, connected: true, reason: null, clusters: clusters.slice(0, 30), range: gsc.range };
}

function firstConfiguredProvider() {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic" as const;
  if (process.env.OPENAI_API_KEY) return "openai" as const;
  return null;
}

export function contentGenerationAvailable() {
  return firstConfiguredProvider() !== null;
}

async function writeArticleBody(cluster: TopicCluster, shopName: string): Promise<string | null> {
  const provider = firstConfiguredProvider();
  if (!provider) return null;

  const queries = cluster.queries.map((q) => `- ${q.query} (${q.impressions} impressions, avg position ${q.position})`).join("\n");
  const prompt = `You are writing a blog article for the Shopify store "${shopName}".

These are real search queries the store already appears for, with its own Search Console data:
${queries}

Write an article that genuinely answers what those searchers want. Requirements:
- Plain HTML only: <h2>, <h3>, <p>, <ul>, <li>. No <html>, <head> or <body>.
- 700-1000 words.
- Answer the questions directly in the first two paragraphs.
- Do not invent statistics, prices, product names, reviews or claims about this store.
- No keyword stuffing. Write for a person.
Return only the HTML.`;

  try {
    if (provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY as string,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-5-haiku-latest",
          max_tokens: 2500,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: AbortSignal.timeout(90_000),
      });
      if (!res.ok) return null;
      const body: any = await res.json();
      return (body.content ?? []).map((c: any) => c.text ?? "").join("");
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 2500,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!res.ok) return null;
    const body: any = await res.json();
    return body.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.warn("[content] generation failed:", (err as Error).message);
    return null;
  }
}

export interface DraftResult {
  created: boolean;
  reason?: string;
  articleId?: string;
  title?: string;
}

/** Creates an UNPUBLISHED article. Publishing is always the merchant's decision. */
export async function generateArticleDraft(
  admin: any,
  shopDomain: string,
  cluster: TopicCluster
): Promise<DraftResult> {
  if (!contentGenerationAvailable()) {
    return { created: false, reason: "No AI provider key is configured on the server." };
  }
  if (await isOverBudget(shopDomain)) {
    return { created: false, reason: "This shop has reached its monthly AI budget cap." };
  }

  const shopRes: any = await executeShopifyGraphQL(admin, `query { shop { name } }`);
  const shopName = shopRes?.data?.shop?.name ?? shopDomain.replace(".myshopify.com", "");

  const blogRes: any = await executeShopifyGraphQL(
    admin,
    `query { blogs(first: 1) { edges { node { id title } } } }`
  );
  const blogId = blogRes?.data?.blogs?.edges?.[0]?.node?.id;
  if (!blogId) {
    return { created: false, reason: "This store has no blog. Create one in Shopify first (Content → Blog posts)." };
  }

  const body = await writeArticleBody(cluster, shopName);
  await trackDataSpend(shopDomain, 0, 0.01);
  if (!body) return { created: false, reason: "The AI provider did not return an article." };

  const title = `${cluster.queries[0].query.charAt(0).toUpperCase()}${cluster.queries[0].query.slice(1)}`;

  const res: any = await executeShopifyGraphQL(
    admin,
    `mutation createArticle($article: ArticleCreateInput!) {
      articleCreate(article: $article) {
        article { id title handle }
        userErrors { field message }
      }
    }`,
    {
      article: {
        blogId,
        title,
        body,
        summary: `Targets ${cluster.queries.length} search queries this store already appears for.`,
        isPublished: false,
        tags: ["proofseo-draft", `cluster:${cluster.label}`],
      },
    }
  );

  const errors = res?.data?.articleCreate?.userErrors;
  if (errors?.length) return { created: false, reason: errors[0].message };

  const article = res?.data?.articleCreate?.article;
  return { created: true, articleId: article?.id, title: article?.title };
}

export async function listGeneratedDrafts(admin: any) {
  const res: any = await executeShopifyGraphQL(
    admin,
    `query drafts { articles(first: 50, query: "tag:proofseo-draft", sortKey: UPDATED_AT, reverse: true) {
      edges { node { id title handle isPublished updatedAt } }
    } }`
  );
  return (res?.data?.articles?.edges ?? []).map((e: any) => ({
    id: e.node.id,
    title: e.node.title,
    handle: e.node.handle,
    isPublished: e.node.isPublished,
    updatedAt: e.node.updatedAt,
  }));
}
