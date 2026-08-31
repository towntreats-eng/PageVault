import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useActionData } from "@remix-run/react";
import { useState } from "react";
import {
  Page, Layout, Card, Text, Badge, BlockStack, InlineStack, IndexTable,
  Banner, Button, EmptyState, Tabs, Box, Link as PolarisLink, Divider,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { buildMetaFixPreview, applyProposedChanges, getIssuesWithPages } from "../services/fixes.server";
import { issueCopy } from "../components/status";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const [issues, preview] = await Promise.all([
    getIssuesWithPages(session.shop),
    buildMetaFixPreview(admin, session.shop),
  ]);
  return json({ issues, preview });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const payload = String(formData.get("changes") || "[]");
  const changes = JSON.parse(payload);
  const result = await applyProposedChanges(admin, session.shop, changes);
  return json({ result });
};

export default function FixPage() {
  const { issues, preview } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const busy = navigation.state === "submitting";
  const [tab, setTab] = useState(0);
  const [showDiff, setShowDiff] = useState(false);

  const critical = issues.filter((i) => i.severity === "critical");
  const warnings = issues.filter((i) => i.severity === "warning");
  const info = issues.filter((i) => i.severity === "info");
  const groups = [critical, warnings, info];
  const list = groups[tab];

  const apply = () =>
    submit({ changes: JSON.stringify(preview.proposed) }, { method: "post", replace: true });

  return (
    <Page
      title="Fix"
      subtitle="Everything below came from fetching your real pages, not from the Shopify API's own answer."
      primaryAction={
        preview.proposed.length > 0
          ? {
              content: showDiff
                ? busy ? "Applying…" : `Apply ${preview.proposed.length} changes`
                : `Review ${preview.proposed.length} fixes`,
              loading: busy,
              onAction: showDiff ? apply : () => setShowDiff(true),
            }
          : undefined
      }
      secondaryActions={showDiff ? [{ content: "Cancel", onAction: () => setShowDiff(false) }] : []}
    >
      <Layout>
        {!preview.available && (
          <Layout.Section>
            <Banner tone="critical" title="We could not read your products">
              <p>{preview.error} Nothing has been changed.</p>
            </Banner>
          </Layout.Section>
        )}

        {actionData?.result && (
          <Layout.Section>
            <Banner
              tone={actionData.result.failed.length ? "warning" : "success"}
              title={`${actionData.result.written} change${actionData.result.written === 1 ? "" : "s"} applied`}
            >
              <p>
                {actionData.result.protectedCount} were left alone because you had already written them.
                {actionData.result.failed.length > 0 && ` ${actionData.result.failed.length} failed.`}
              </p>
              <p>
                Status is <strong>Applied</strong>, not Verified. Each one is queued for a live-page check, and Home
                will show the result once we have actually seen it on your storefront.
              </p>
            </Banner>
          </Layout.Section>
        )}

        {showDiff ? (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <BlockStack gap="100">
                  <Text as="h2" variant="headingMd">
                    {`${preview.proposed.length} changes will be applied`}
                  </Text>
                  <Text as="p" tone="subdued">
                    {`${preview.skipped.filter((s) => s.currentValue).length} pages are skipped because you wrote those values yourself. We checked ${preview.productsScanned} products.`}
                  </Text>
                </BlockStack>
                <Divider />
                <IndexTable
                  resourceName={{ singular: "change", plural: "changes" }}
                  itemCount={preview.proposed.length}
                  selectable={false}
                  headings={[
                    { title: "Product" },
                    { title: "Field" },
                    { title: "Now" },
                    { title: "After" },
                  ]}
                >
                  {preview.proposed.map((c, index) => (
                    <IndexTable.Row id={`${c.resourceGid}-${c.field}`} key={`${c.resourceGid}-${c.field}`} position={index}>
                      <IndexTable.Cell><Text as="span">{c.resourceTitle}</Text></IndexTable.Cell>
                      <IndexTable.Cell>
                        <Text as="span" tone="subdued">{c.field === "title_tag" ? "Meta title" : "Meta description"}</Text>
                      </IndexTable.Cell>
                      <IndexTable.Cell><Text as="span" tone="subdued">Empty</Text></IndexTable.Cell>
                      <IndexTable.Cell><Text as="span">{c.newValue}</Text></IndexTable.Cell>
                    </IndexTable.Row>
                  ))}
                </IndexTable>

                {preview.skipped.length > 0 && (
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingSm">Left alone</Text>
                    {preview.skipped.slice(0, 10).map((s, i) => (
                      <InlineStack key={`${s.resourceGid}-${s.field}-${i}`} gap="200" align="space-between">
                        <Text as="span">{s.resourceTitle}</Text>
                        <Text as="span" tone="subdued" variant="bodySm">{s.reason}</Text>
                      </InlineStack>
                    ))}
                    {preview.skipped.length > 10 && (
                      <Text as="p" tone="subdued" variant="bodySm">
                        {`and ${preview.skipped.length - 10} more`}
                      </Text>
                    )}
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        ) : (
          <Layout.Section>
            <Card padding="0">
              <Tabs
                tabs={[
                  { id: "critical", content: `Critical (${critical.length})` },
                  { id: "warning", content: `Warnings (${warnings.length})` },
                  { id: "info", content: `Opportunities (${info.length})` },
                ]}
                selected={tab}
                onSelect={setTab}
              >
                {issues.length === 0 ? (
                  <EmptyState heading="No issues found yet" image="">
                    <p>Run a scan from Home. We fetch every page in your sitemap and read the HTML your visitors get.</p>
                  </EmptyState>
                ) : list.length === 0 ? (
                  <EmptyState heading="Nothing at this severity" image="">
                    <p>The last scan found no issues of this kind.</p>
                  </EmptyState>
                ) : (
                  <IndexTable
                    resourceName={{ singular: "issue", plural: "issues" }}
                    itemCount={list.length}
                    selectable={false}
                    headings={[{ title: "Issue" }, { title: "Page" }, { title: "Why it matters" }]}
                  >
                    {list.slice(0, 200).map((issue, index) => {
                      const copy = issueCopy(issue.code);
                      return (
                        <IndexTable.Row id={issue.id} key={issue.id} position={index}>
                          <IndexTable.Cell>
                            <BlockStack gap="050">
                              <Text as="span" fontWeight="semibold">{copy.label}</Text>
                              <Text as="span" tone="subdued" variant="bodySm">{issue.detail}</Text>
                            </BlockStack>
                          </IndexTable.Cell>
                          <IndexTable.Cell>
                            <PolarisLink url={issue.url} target="_blank">{issue.url}</PolarisLink>
                          </IndexTable.Cell>
                          <IndexTable.Cell>
                            <Text as="span" tone="subdued" variant="bodySm">{copy.why}</Text>
                          </IndexTable.Cell>
                        </IndexTable.Row>
                      );
                    })}
                  </IndexTable>
                )}
              </Tabs>
            </Card>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">Other things you can fix</Text>
              <Divider />
              <InlineStack gap="300" wrap>
                <Button url="/app/images">Image alt text</Button>
                <Button url="/app/meta">Meta tag templates</Button>
                <Button url="/app/schema">Structured data</Button>
                <Button url="/app/speed">Redirects and 404s</Button>
              </InlineStack>
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
