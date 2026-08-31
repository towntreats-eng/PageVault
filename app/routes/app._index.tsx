import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useActionData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Banner,
  Box,
  Divider,
  Tabs,
  IndexTable,
  EmptyState,
  Link as PolarisLink,
} from "@shopify/polaris";
import { useState } from "react";
import { authenticate } from "../shopify.server";
import { getSeoAuditSummary, runFullAutoSeoOptimization, getSystematicStoreDiagnostic } from "../services/seo.server";
import { getSubscriptionStatus } from "../services/billing.server";
import { runStoreSitemapCrawl, getPageRecords } from "../services/crawler.server";
import { getVerificationHistory } from "../services/proof_engine.server";
import { queueHealth } from "../services/queue.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  const [stats, diagnostics, subscription, pageRecords, verifications] = await Promise.all([
    getSeoAuditSummary(admin, shopDomain),
    getSystematicStoreDiagnostic(admin, shopDomain),
    getSubscriptionStatus(shopDomain),
    getPageRecords(shopDomain),
    getVerificationHistory(shopDomain),
  ]);

  return json({
    stats,
    diagnostics,
    subscription,
    shopDomain,
    pageRecords,
    verifications,
    queue: queueHealth(),
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "run_sitemap_crawl") {
    const crawl = await runStoreSitemapCrawl(session.shop);
    return json({ kind: "crawl" as const, crawl });
  }

  if (intent === "run_auto_seo") {
    const result = await runFullAutoSeoOptimization(admin, session.shop);
    return json({ kind: "apply" as const, result });
  }

  return json({ kind: "none" as const });
};

export default function HomePage() {
  const { stats, diagnostics, shopDomain, pageRecords, verifications, queue } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const busy = navigation.state === "submitting";
  const [tab, setTab] = useState(0);

  const verifiedCount = verifications.filter((v) => v.result === "PASS").length;
  const pendingCount = verifications.filter((v) => v.result === "PENDING").length;
  const notDetectedCount = verifications.filter((v) => v.result === "FAIL").length;

  const critical = diagnostics.filter((d) => d.severity === "critical");
  const warnings = diagnostics.filter((d) => d.severity === "warning");
  const list = tab === 0 ? critical : warnings;

  if (!stats.available) {
    return (
      <Page title="Home">
        <Banner tone="critical" title="We could not read your store">
          <p>{stats.error} Nothing has been scanned or changed. This is a connection problem, not a clean bill of health.</p>
        </Banner>
      </Page>
    );
  }

  return (
    <Page
      title="Home"
      subtitle={shopDomain}
      primaryAction={{
        content: busy ? "Scanning…" : "Scan my store",
        loading: busy,
        onAction: () => submit({ intent: "run_sitemap_crawl" }, { method: "post" }),
      }}
      secondaryActions={
        critical.length > 0
          ? [
              {
                content: `Fill ${critical.length} empty meta tags`,
                onAction: () => submit({ intent: "run_auto_seo" }, { method: "post" }),
              },
            ]
          : []
      }
    >
      <Layout>
        {/* The headline number is proof, not a score. */}
        <Layout.Section>
          <Card>
            <BlockStack gap="200">
              <Text as="h2" variant="headingLg">
                {verifiedCount} change{verifiedCount === 1 ? "" : "s"} verified on your live storefront
              </Text>
              <InlineStack gap="200">
                <Badge tone="success">{`${verifiedCount} Verified`}</Badge>
                <Badge tone="info">{`${pendingCount} Applied, awaiting check`}</Badge>
                <Badge tone="warning">{`${notDetectedCount} Not detected`}</Badge>
              </InlineStack>
              <Text as="p" variant="bodySm" tone="subdued">
                Verified means we fetched your public page and found the value in the HTML. We never mark work done
                because an API call returned success.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        {!queue.redisConnected && (
          <Layout.Section>
            <Banner tone="warning" title="Background checks are running in this process only">
              <p>
                Redis is not connected, so scheduled re-checks are kept in memory and are lost if the app restarts.
                Verification still runs; it is just not durable yet.
              </p>
            </Banner>
          </Layout.Section>
        )}

        {actionData?.kind === "crawl" && (
          <Layout.Section>
            <Banner tone="info" title="Scan finished">
              <p>
                Found {actionData.crawl.totalPages} URLs in your sitemap. We fetched {actionData.crawl.pagesFetched} of
                them and found {actionData.crawl.issuesFound} issues
                {actionData.crawl.pagesUnreachable > 0 ? `, and ${actionData.crawl.pagesUnreachable} pages did not load` : ""}.
                {actionData.crawl.pagesDeferred > 0 &&
                  (actionData.crawl.deferredScheduled
                    ? ` The remaining ${actionData.crawl.pagesDeferred} pages are queued and will finish in the background.`
                    : ` ${actionData.crawl.pagesDeferred} pages could not be queued — run the scan again to finish them.`)}
              </p>
            </Banner>
          </Layout.Section>
        )}

        {actionData?.kind === "apply" && (
          <Layout.Section>
            <Banner
              tone={actionData.result.success ? "success" : "warning"}
              title={`${actionData.result.metaTitlesWritten + actionData.result.metaDescsWritten} meta tags applied`}
            >
              <p>
                {actionData.result.metaTitlesWritten} titles and {actionData.result.metaDescsWritten} descriptions were
                written to {actionData.result.productsScanned} products. {actionData.result.skippedHumanValue} were left
                alone because you had already written them. {actionData.result.failed.length} failed.
              </p>
              <p>
                Status is <strong>Applied</strong>, not Verified. Each one is queued for a live-page check — this page
                will show the result once we have actually seen it on your storefront.
              </p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <InlineStack gap="800" wrap>
              <BlockStack gap="100">
                <Text as="p" variant="bodySm" tone="subdued">SEO health</Text>
                <Text as="p" variant="heading2xl">{stats.healthScore ?? "—"}</Text>
                <Text as="p" variant="bodySm" tone="subdued">{stats.scoreBreakdown || "No products to score yet"}</Text>
              </BlockStack>
              <BlockStack gap="100">
                <Text as="p" variant="bodySm" tone="subdued">Products</Text>
                <Text as="p" variant="heading2xl">{stats.totalProducts}</Text>
              </BlockStack>
              <BlockStack gap="100">
                <Text as="p" variant="bodySm" tone="subdued">Missing meta tags</Text>
                <Text as="p" variant="heading2xl">{stats.missingTitles + stats.missingDescs}</Text>
              </BlockStack>
              <BlockStack gap="100">
                <Text as="p" variant="bodySm" tone="subdued">Images without alt text</Text>
                <Text as="p" variant="heading2xl">{stats.missingAlts}</Text>
              </BlockStack>
              {pageRecords.length > 0 && (
                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" tone="subdued">Pages crawled</Text>
                  <Text as="p" variant="heading2xl">{pageRecords.length}</Text>
                </BlockStack>
              )}
            </InlineStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card padding="0">
            <Tabs
              tabs={[
                { id: "critical", content: `Critical (${critical.length})` },
                { id: "warning", content: `Warnings (${warnings.length})` },
              ]}
              selected={tab}
              onSelect={setTab}
            >
              {list.length === 0 ? (
                <EmptyState heading="Nothing here" image="">
                  <p>No issues of this severity were found in the last scan.</p>
                </EmptyState>
              ) : (
                <IndexTable
                  resourceName={{ singular: "issue", plural: "issues" }}
                  itemCount={list.length}
                  selectable={false}
                  headings={[{ title: "Page" }, { title: "Issue" }, { title: "What to do" }]}
                >
                  {list.slice(0, 100).map((d, index) => (
                    <IndexTable.Row id={d.id} key={d.id} position={index}>
                      <IndexTable.Cell>
                        <Text as="span">{d.resourceTitle}</Text>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <Text as="span">{d.description}</Text>
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <Text as="span" tone="subdued">{d.fixAction}</Text>
                      </IndexTable.Cell>
                    </IndexTable.Row>
                  ))}
                </IndexTable>
              )}
            </Tabs>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">Recent verification checks</Text>
              <Divider />
              {verifications.length === 0 ? (
                <Text as="p" tone="subdued">
                  Nothing applied yet. Once we write something to your store, every check we run against your live page
                  shows up here with the URL we fetched.
                </Text>
              ) : (
                <BlockStack gap="200">
                  {verifications.slice(0, 10).map((v) => (
                    <InlineStack key={v.id} gap="300" align="space-between">
                      <PolarisLink url={v.fetched_url} target="_blank">{v.fetched_url}</PolarisLink>
                      <InlineStack gap="200">
                        {v.reason_code && <Text as="span" tone="subdued" variant="bodySm">{v.reason_code}</Text>}
                        <Badge tone={v.result === "PASS" ? "success" : v.result === "PENDING" ? "info" : "warning"}>
                          {v.result === "PASS" ? "Verified" : v.result === "PENDING" ? "Applied" : "Not detected"}
                        </Badge>
                      </InlineStack>
                    </InlineStack>
                  ))}
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Box paddingBlockEnd="800" />
        </Layout.Section>
      </Layout>
    </Page>
  );
}
