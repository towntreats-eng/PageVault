import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page,
  Card,
  Text,
  Badge,
  BlockStack,
  Box,
  InlineStack,
  IndexTable,
  Banner,
  Button,
  Divider,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { getGscConnectionStatus, getCtrOpportunities, getCannibalisationIssues } from "../services/gsc.server";
import { getAssignedKeywordsWithRanks, assignPrimaryKeyword } from "../services/keyword_engine.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  const gscStatus = await getGscConnectionStatus(shopDomain);
  const ctrOpportunities = await getCtrOpportunities(shopDomain);
  const cannibalisation = await getCannibalisationIssues(shopDomain);
  const assignedKeywords = await getAssignedKeywordsWithRanks(shopDomain);

  return json({
    gscStatus,
    ctrOpportunities,
    cannibalisation,
    assignedKeywords,
    shopDomain,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "assign_keyword") {
    const resourceGid = String(formData.get("resourceGid") || "gid://shopify/Product/101");
    const url = String(formData.get("url") || `https://${session.shop}/products/sample`);
    const term = String(formData.get("term") || "luxury silk dress");

    await assignPrimaryKeyword(session.shop, resourceGid, url, term, "US");
    return json({ success: true, message: `Assigned primary keyword '${term}' (1-primary-per-URL constraint enforced).` });
  }

  return json({ success: true });
};

export default function KeywordAnalyticsPage() {
  const { gscStatus, ctrOpportunities, cannibalisation, assignedKeywords } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();

  const isAssigning = navigation.state === "submitting";

  const handleAssignSample = (term: string, url: string) => {
    submit({ intent: "assign_keyword", term, url }, { method: "post" });
  };

  const rowsMarkup = assignedKeywords.map((kw, index) => (
    <IndexTable.Row id={kw.id} key={kw.id} position={index}>
      <IndexTable.Cell>
        <Text as="span" fontWeight="bold">{kw.term}</Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone="info">{`${kw.market}`}</Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span">{kw.volume.toLocaleString()} / mo</Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone={kw.difficulty <= 35 ? "success" : "warning"}>{`${kw.difficulty}/100 ({kw.winnability})`}</Badge>
      </IndexTable.Cell>

      {/* Closed loop rank history: D0 -> D7 -> D28 */}
      <IndexTable.Cell>
        <InlineStack gap="100">
          <Badge>{`D0: #${kw.positionD0}`}</Badge>
          <Badge tone="info">{`D7: #${kw.positionD7}`}</Badge>
          <Badge tone="success">{`D28: #${kw.positionD28}`}</Badge>
        </InlineStack>
      </IndexTable.Cell>

      <IndexTable.Cell>
        {kw.aiOverviewPresent ? (
          <Badge tone="attention">Google AI Overview Active</Badge>
        ) : (
          <Badge>Organic Only</Badge>
        )}
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page
      title="🎯 Keyword Engine & Google Rank Tracker"
      subtitle="Closed loop: Research → Assign → Verify → Track exact position week-over-week."
    >
      <BlockStack gap="500">
        {!gscStatus.isConnected ? (
          <Banner title="Google Search Console Disconnected" tone="info">
            <p>Connect GSC OAuth to pull real click, impression, CTR, and average position search data directly from Google.</p>
          </Banner>
        ) : (
          <Banner title="Google Search Console Connected" tone="success">
            <p>Connected property: <strong>{gscStatus.siteUrl}</strong>.</p>
          </Banner>
        )}

        {/* High CTR Opportunity Table */}
        <Card padding="500">
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <Text as="h2" variant="headingMd">🎯 High-Impression CTR Opportunities (GSC Data)</Text>
              <Badge tone="attention">CTR REWRITE CANDIDATES</Badge>
            </InlineStack>
            <Divider />

            <IndexTable
              resourceName={{ singular: "opportunity", plural: "opportunities" }}
              itemCount={ctrOpportunities.length}
              headings={[
                { title: "Target Search Query" },
                { title: "Impressions" },
                { title: "Current CTR" },
                { title: "Avg Position" },
                { title: "Suggested Rewrite" },
                { title: "Action" },
              ]}
              selectable={false}
            >
              {ctrOpportunities.map((opp, idx) => (
                <IndexTable.Row id={opp.query} key={idx} position={idx}>
                  <IndexTable.Cell><Text as="span" fontWeight="bold">{opp.query}</Text></IndexTable.Cell>
                  <IndexTable.Cell>{opp.impressions.toLocaleString()}</IndexTable.Cell>
                  <IndexTable.Cell><Badge tone="warning">{`${opp.ctr}%`}</Badge></IndexTable.Cell>
                  <IndexTable.Cell>#{opp.currentPosition}</IndexTable.Cell>
                  <IndexTable.Cell><Text as="span" variant="bodySm">{opp.suggestedRewrite}</Text></IndexTable.Cell>
                  <IndexTable.Cell>
                    <Button size="micro" variant="primary" loading={isAssigning} onClick={() => handleAssignSample(opp.query, opp.pageUrl)}>
                      Assign Primary
                    </Button>
                  </IndexTable.Cell>
                </IndexTable.Row>
              ))}
            </IndexTable>
          </BlockStack>
        </Card>

        {/* Assigned Keyword Rank Tracker Table */}
        <Card padding="0">
          <Box padding="500"><BlockStack gap="300">
            <InlineStack align="space-between">
              <Text as="h2" variant="headingMd">📊 Assigned Keywords & Weekly SERP Position Loop</Text>
              <Badge tone="success">1-PRIMARY-PER-URL ENFORCED</Badge>
            </InlineStack>
            <Text as="p" variant="bodySm" tone="subdued">
              Per 10-KEYWORD-ENGINE.md §4.1: Exactly one primary keyword per URL per market is enforced at the database level.
            </Text>
          </BlockStack></Box>

          <IndexTable
            resourceName={{ singular: "keyword", plural: "keywords" }}
            itemCount={assignedKeywords.length}
            headings={[
              { title: "Assigned Keyword" },
              { title: "Market" },
              { title: "Search Volume" },
              { title: "Difficulty / Winnability" },
              { title: "Position Loop (D0 → D7 → D28)" },
              { title: "AI Search Presence" },
            ]}
            selectable={false}
          >
            {rowsMarkup}
          </IndexTable>
        </Card>
      </BlockStack>
    </Page>
  );
}
