import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useActionData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  Badge,
  BlockStack,
  InlineStack,
  IndexTable,
  Banner,
  EmptyState,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { getAiVisibilityReport, runCitationScan } from "../services/ai_citation.server";
import { generateWeeklyProofReport } from "../services/autopilot.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const [aiReport, weeklyReport] = await Promise.all([
    getAiVisibilityReport(session.shop),
    generateWeeklyProofReport(session.shop),
  ]);
  return json({ aiReport, weeklyReport, shopDomain: session.shop });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const result = await runCitationScan(admin, session.shop);
  return json({ result });
};

export default function AiVisibilityPage() {
  const { aiReport, weeklyReport, shopDomain } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const busy = navigation.state === "submitting";
  const configured = aiReport.configuredEngines.length > 0;

  return (
    <Page
      title="AI visibility"
      subtitle="Whether AI answer engines mention your store when someone asks what to buy."
      primaryAction={{
        content: busy ? "Asking the engines…" : "Run a check",
        loading: busy,
        disabled: !configured,
        onAction: () => submit({}, { method: "post" }),
      }}
    >
      <Layout>
        {!configured && (
          <Layout.Section>
            <Banner tone="warning" title="No AI provider is configured">
              <p>
                This feature works by actually asking ChatGPT, Claude and Perplexity a buying question and reading the
                answer. No provider key is set on the server, so there is nothing to show. We will not display an
                estimated score in its place.
              </p>
            </Banner>
          </Layout.Section>
        )}

        {actionData?.result && (
          <Layout.Section>
            <Banner tone={actionData.result.ran ? "success" : "warning"} title={actionData.result.ran ? "Check complete" : "Check did not run"}>
              <p>
                {actionData.result.ran
                  ? `We asked ${actionData.result.queriesAsked} question${actionData.result.queriesAsked === 1 ? "" : "s"} across ${actionData.result.callsMade} engine calls. Your store was mentioned ${actionData.result.citations} time${actionData.result.citations === 1 ? "" : "s"}.`
                  : actionData.result.reason}
              </p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">This week on {shopDomain}</Text>
              <Text as="p">{weeklyReport.emailBody}</Text>
              <InlineStack gap="200">
                <Badge tone="success">{`${weeklyReport.verified} verified`}</Badge>
                <Badge tone="info">{`${weeklyReport.pending} awaiting check`}</Badge>
                <Badge tone="warning">{`${weeklyReport.notDetected} not detected`}</Badge>
                {weeklyReport.verificationRate !== null && (
                  <Badge>{`${weeklyReport.verificationRate}% of checks passed`}</Badge>
                )}
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {configured && (
          <Layout.Section>
            <Card>
              <InlineStack gap="800" wrap>
                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" tone="subdued">Checks run</Text>
                  <Text as="p" variant="heading2xl">{aiReport.totalChecks}</Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" tone="subdued">Times you were mentioned</Text>
                  <Text as="p" variant="heading2xl">{aiReport.citedCount}</Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" tone="subdued">Mention rate</Text>
                  <Text as="p" variant="heading2xl">
                    {aiReport.citationRate === null ? "—" : `${aiReport.citationRate}%`}
                  </Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" tone="subdued">Engines configured</Text>
                  <Text as="p" variant="heading2xl">{aiReport.configuredEngines.length}</Text>
                </BlockStack>
              </InlineStack>
            </Card>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card padding="0">
            {!aiReport.hasData ? (
              <EmptyState heading="No checks have been run yet" image="">
                <p>
                  When you run a check we ask each configured engine a buying question built from your own product
                  types, then record whether your store was named in the answer.
                </p>
              </EmptyState>
            ) : (
              <IndexTable
                resourceName={{ singular: "check", plural: "checks" }}
                itemCount={aiReport.recentQueries.length}
                selectable={false}
                headings={[
                  { title: "Question asked" },
                  { title: "Engine" },
                  { title: "You were mentioned" },
                  { title: "Who else appeared" },
                  { title: "Checked" },
                ]}
              >
                {aiReport.recentQueries.map((q, index) => (
                  <IndexTable.Row id={`${q.query}-${index}`} key={`${q.query}-${index}`} position={index}>
                    <IndexTable.Cell><Text as="span">{q.query}</Text></IndexTable.Cell>
                    <IndexTable.Cell><Text as="span">{q.engine}</Text></IndexTable.Cell>
                    <IndexTable.Cell>
                      <Badge tone={q.cited ? "success" : "warning"}>{q.cited ? "Yes" : "No"}</Badge>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Text as="span" tone="subdued">{q.competitors.slice(0, 4).join(", ") || "—"}</Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Text as="span" tone="subdued">{new Date(q.checkedAt).toLocaleDateString()}</Text>
                    </IndexTable.Cell>
                  </IndexTable.Row>
                ))}
              </IndexTable>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
