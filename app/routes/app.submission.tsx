import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  Badge,
  BlockStack,
  InlineStack,
  Banner,
  Divider,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { executeShopifyGraphQL } from "../services/graphql.server";
import { queueHealth } from "../services/queue.server";
import { PLAN_CONFIGS } from "../models/plans";
import prisma from "../db.server";

/**
 * Readiness checks that actually run.
 *
 * This screen used to hardcode "PASS" for every item and display the banner
 * "100% Technical & Billing Compliance Verified — all 60 tasks fully built,
 * tested, and compiled cleanly". Nothing was checked. Each row below now comes
 * from a live query, and anything that cannot be checked from here says so
 * instead of claiming a pass.
 */

type CheckStatus = "pass" | "fail" | "unknown";

interface Check {
  name: string;
  status: CheckStatus;
  detail: string;
}

const REQUIRED_SCOPES = ["write_products", "write_content", "write_online_store_navigation", "read_themes"];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const checks: Check[] = [];

  // 1. Granted scopes, read from the installation itself.
  try {
    const res: any = await executeShopifyGraphQL(
      admin,
      `query { currentAppInstallation { accessScopes { handle } } }`
    );
    const granted: string[] = (res?.data?.currentAppInstallation?.accessScopes ?? []).map((s: any) => s.handle);
    const missing = REQUIRED_SCOPES.filter((s) => !granted.includes(s));
    checks.push({
      name: "Required scopes granted",
      status: missing.length === 0 ? "pass" : "fail",
      detail: missing.length === 0 ? `Granted: ${granted.join(", ")}` : `Missing: ${missing.join(", ")}`,
    });
  } catch (err) {
    checks.push({ name: "Required scopes granted", status: "unknown", detail: (err as Error).message });
  }

  // 2. Webhook subscriptions registered with Shopify.
  try {
    const res: any = await executeShopifyGraphQL(
      admin,
      `query { webhookSubscriptions(first: 25) { edges { node { topic } } } }`
    );
    const topics: string[] = (res?.data?.webhookSubscriptions?.edges ?? []).map((e: any) => e.node.topic);
    checks.push({
      name: "Webhook subscriptions registered",
      status: topics.length > 0 ? "pass" : "unknown",
      detail:
        topics.length > 0
          ? topics.join(", ")
          : "None returned by the API. Compliance topics declared in shopify.app.toml are managed by Shopify and may not appear here — confirm in the Partner Dashboard.",
    });
  } catch (err) {
    checks.push({ name: "Webhook subscriptions registered", status: "unknown", detail: (err as Error).message });
  }

  // 3. Billing plans configured in code.
  const planCount = Object.keys(PLAN_CONFIGS).length;
  checks.push({
    name: "Billing plans configured",
    status: planCount > 0 ? "pass" : "fail",
    detail: `${planCount} plan${planCount === 1 ? "" : "s"} defined: ${Object.keys(PLAN_CONFIGS).join(", ")}`,
  });

  // 4. Proof engine — has it ever confirmed anything on a live page?
  const [verifiedCount, failCount, changeCount] = await Promise.all([
    prisma.verification.count({ where: { shop_domain: session.shop, result: "PASS" } }),
    prisma.verification.count({ where: { shop_domain: session.shop, result: "FAIL" } }),
    prisma.change.count({ where: { shop_domain: session.shop } }),
  ]);
  checks.push({
    name: "Proof engine has verified a real change",
    status: verifiedCount > 0 ? "pass" : changeCount > 0 ? "fail" : "unknown",
    detail:
      changeCount === 0
        ? "No changes have been applied on this store yet, so there is nothing to verify."
        : `${changeCount} change(s) applied, ${verifiedCount} confirmed on the live storefront, ${failCount} not detected.`,
  });

  // 5. Background jobs.
  const q = queueHealth();
  checks.push({
    name: "Durable background jobs",
    status: q.redisConnected ? "pass" : "fail",
    detail: q.redisConnected
      ? `Redis connected. Handlers: ${q.registeredHandlers.join(", ") || "none registered yet"}`
      : "Redis is not connected. Scheduled re-checks run in memory and are lost on restart.",
  });

  // 6. Things that cannot be checked from inside the app.
  checks.push({
    name: "Theme app extension enabled in the merchant's theme",
    status: "unknown",
    detail: "Only visible by fetching a live page and looking for our JSON-LD. Run a schema verification to find out.",
  });
  checks.push({
    name: "Listing copy, screenshots, demo video, privacy policy",
    status: "unknown",
    detail: "These live in the Partner Dashboard. No code check can confirm them.",
  });

  const failing = checks.filter((c) => c.status === "fail").length;
  const unknown = checks.filter((c) => c.status === "unknown").length;

  return json({ checks, failing, unknown, shopDomain: session.shop });
};

export default function ReadinessPage() {
  const { checks, failing, unknown, shopDomain } = useLoaderData<typeof loader>();

  return (
    <Page title="Submission readiness" subtitle={`Checked against ${shopDomain} just now`}>
      <Layout>
        <Layout.Section>
          <Banner
            tone={failing > 0 ? "critical" : unknown > 0 ? "warning" : "success"}
            title={
              failing > 0
                ? `${failing} check${failing === 1 ? "" : "s"} failing`
                : unknown > 0
                ? `${unknown} item${unknown === 1 ? "" : "s"} cannot be checked from here`
                : "Every automated check passed"
            }
          >
            <p>
              These are the checks this app can run against itself. They are not a Shopify approval, and passing them all
              does not mean the app is ready — the items marked “Cannot check” need a person.
            </p>
          </Banner>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              {checks.map((c, i) => (
                <BlockStack key={c.name} gap="200">
                  {i > 0 && <Divider />}
                  <InlineStack align="space-between" blockAlign="start" gap="400">
                    <BlockStack gap="100">
                      <Text as="p" fontWeight="semibold">{c.name}</Text>
                      <Text as="p" tone="subdued" variant="bodySm">{c.detail}</Text>
                    </BlockStack>
                    <Badge tone={c.status === "pass" ? "success" : c.status === "fail" ? "critical" : undefined}>
                      {c.status === "pass" ? "Pass" : c.status === "fail" ? "Fail" : "Cannot check"}
                    </Badge>
                  </InlineStack>
                </BlockStack>
              ))}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
