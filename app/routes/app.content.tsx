import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useActionData } from "@remix-run/react";
import { useState } from "react";
import {
  Page, Layout, Card, Text, Badge, BlockStack, InlineStack, Banner, Button,
  TextField, EmptyState, Divider, Box, IndexTable,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import {
  buildTopicClusters, generateArticleDraft, listGeneratedDrafts, contentGenerationAvailable,
  type DraftResult,
} from "../services/content.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const seed = url.searchParams.get("seed") ?? undefined;

  const [planner, drafts] = await Promise.all([
    buildTopicClusters(session.shop, seed),
    listGeneratedDrafts(admin).catch(() => []),
  ]);

  return json({ planner, drafts, canGenerate: contentGenerationAvailable(), seed: seed ?? "" });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const clusterId = String(formData.get("clusterId") || "");

  const planner = await buildTopicClusters(session.shop);
  const cluster = planner.clusters.find((c) => c.id === clusterId);
  if (!cluster) {
    const missing: DraftResult = { created: false, reason: "That topic is no longer in your data." };
    return json({ result: missing });
  }

  const result = await generateArticleDraft(admin, session.shop, cluster);
  return json({ result });
};

export default function ContentPage() {
  const { planner, drafts, canGenerate, seed } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const busy = navigation.state === "submitting";
  const [seedInput, setSeedInput] = useState(seed);

  return (
    <Page
      title="Content"
      subtitle="Topics built from the searches your store already appears for."
    >
      <Layout>
        {!planner.available && (
          <Layout.Section>
            <Banner tone="warning" title="No search data yet">
              <p>{planner.reason}</p>
            </Banner>
          </Layout.Section>
        )}

        {!canGenerate && planner.available && (
          <Layout.Section>
            <Banner tone="info" title="Drafting is switched off">
              <p>
                No AI provider key is configured on the server, so we can plan topics but cannot write drafts. The
                planner below is real either way.
              </p>
            </Banner>
          </Layout.Section>
        )}

        {actionData?.result && (
          <Layout.Section>
            <Banner
              tone={actionData.result.created ? "success" : "warning"}
              title={actionData.result.created ? "Draft created" : "Draft not created"}
            >
              <p>
                {actionData.result.created
                  ? `"${actionData.result.title}" was saved to your blog as an unpublished draft. Read it, edit it, and publish it yourself when you are happy — we never publish for you.`
                  : actionData.result.reason}
              </p>
            </Banner>
          </Layout.Section>
        )}

        {planner.available && (
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Filter topics</Text>
                <InlineStack gap="300" blockAlign="end">
                  <Box minWidth="320px">
                    <TextField
                      label="Only show topics containing"
                      value={seedInput}
                      onChange={setSeedInput}
                      autoComplete="off"
                      placeholder="e.g. body oil"
                    />
                  </Box>
                  <Button onClick={() => submit({ seed: seedInput }, { method: "get" })}>Apply</Button>
                </InlineStack>
                {planner.range && (
                  <Text as="p" tone="subdued" variant="bodySm">
                    {`Based on Search Console data from ${planner.range.startDate} to ${planner.range.endDate}.`}
                  </Text>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        <Layout.Section>
          {planner.clusters.length === 0 ? (
            <Card>
              <EmptyState heading="No topics yet" image="">
                <p>
                  Once Search Console has data for your store, we group the queries you appear for into topics and rank
                  them by how much demand you are missing.
                </p>
              </EmptyState>
            </Card>
          ) : (
            <BlockStack gap="400">
              {planner.clusters.slice(0, 12).map((c) => (
                <Card key={c.id}>
                  <BlockStack gap="300">
                    <InlineStack align="space-between" blockAlign="center">
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="h3" variant="headingMd">{c.label}</Text>
                        <Badge tone={c.opportunity === "high" ? "success" : c.opportunity === "medium" ? "warning" : undefined}>
                          {`${c.opportunity} opportunity`}
                        </Badge>
                      </InlineStack>
                      <Button
                        disabled={!canGenerate}
                        loading={busy}
                        onClick={() => submit({ clusterId: c.id }, { method: "post" })}
                      >
                        Write a draft
                      </Button>
                    </InlineStack>

                    <InlineStack gap="600">
                      <BlockStack gap="050">
                        <Text as="p" variant="bodySm" tone="subdued">Queries</Text>
                        <Text as="p" variant="headingLg">{String(c.queries.length)}</Text>
                      </BlockStack>
                      <BlockStack gap="050">
                        <Text as="p" variant="bodySm" tone="subdued">Impressions</Text>
                        <Text as="p" variant="headingLg">{String(c.totalImpressions)}</Text>
                      </BlockStack>
                      <BlockStack gap="050">
                        <Text as="p" variant="bodySm" tone="subdued">Clicks</Text>
                        <Text as="p" variant="headingLg">{String(c.totalClicks)}</Text>
                      </BlockStack>
                      <BlockStack gap="050">
                        <Text as="p" variant="bodySm" tone="subdued">Average position</Text>
                        <Text as="p" variant="headingLg">{String(c.avgPosition)}</Text>
                      </BlockStack>
                    </InlineStack>

                    <Divider />
                    <BlockStack gap="100">
                      {c.queries.slice(0, 6).map((q) => (
                        <InlineStack key={q.query} align="space-between">
                          <Text as="span">{q.query}</Text>
                          <Text as="span" tone="subdued" variant="bodySm">
                            {`${q.impressions} impressions · #${q.position}`}
                          </Text>
                        </InlineStack>
                      ))}
                      {c.queries.length > 6 && (
                        <Text as="p" tone="subdued" variant="bodySm">{`and ${c.queries.length - 6} more`}</Text>
                      )}
                    </BlockStack>
                  </BlockStack>
                </Card>
              ))}
            </BlockStack>
          )}
        </Layout.Section>

        {drafts.length > 0 && (
          <Layout.Section>
            <Card padding="0">
              <IndexTable
                resourceName={{ singular: "draft", plural: "drafts" }}
                itemCount={drafts.length}
                selectable={false}
                headings={[{ title: "Draft" }, { title: "Status" }, { title: "Updated" }]}
              >
                {drafts.map((d: any, index: number) => (
                  <IndexTable.Row id={d.id} key={d.id} position={index}>
                    <IndexTable.Cell><Text as="span">{d.title}</Text></IndexTable.Cell>
                    <IndexTable.Cell>
                      <Badge tone={d.isPublished ? "success" : undefined}>
                        {d.isPublished ? "Published by you" : "Unpublished draft"}
                      </Badge>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Text as="span" tone="subdued">{new Date(d.updatedAt).toLocaleDateString()}</Text>
                    </IndexTable.Cell>
                  </IndexTable.Row>
                ))}
              </IndexTable>
            </Card>
          </Layout.Section>
        )}

        <Layout.Section>
          <Box paddingBlockEnd="800" />
        </Layout.Section>
      </Layout>
    </Page>
  );
}
