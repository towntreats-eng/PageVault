import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useActionData } from "@remix-run/react";
import { useState } from "react";
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
  Button,
  TextField,
  EmptyState,
  Link as PolarisLink,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { getGscConnectionStatus, getCtrOpportunities, getCannibalisationIssues } from "../services/gsc.server";
import {
  getAssignedKeywordsWithRanks,
  assignPrimaryKeyword,
  refreshRanksFromGsc,
} from "../services/keyword_engine.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  const [gscStatus, ctr, cannibalisation, assignedKeywords] = await Promise.all([
    getGscConnectionStatus(shopDomain),
    getCtrOpportunities(shopDomain),
    getCannibalisationIssues(shopDomain),
    getAssignedKeywordsWithRanks(shopDomain),
  ]);

  return json({ gscStatus, ctr, cannibalisation, assignedKeywords, shopDomain });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "assign_keyword") {
    const resourceGid = String(formData.get("resourceGid") || "").trim();
    const url = String(formData.get("url") || "").trim();
    const term = String(formData.get("term") || "").trim();
    const market = String(formData.get("market") || "US");

    if (!resourceGid || !url || !term) {
      return json({ kind: "error" as const, message: "Product ID, page URL and keyword are all required." });
    }
    await assignPrimaryKeyword(session.shop, resourceGid, url, term, market);
    return json({ kind: "assigned" as const, term });
  }

  if (intent === "refresh_ranks") {
    const result = await refreshRanksFromGsc(session.shop);
    return json({ kind: "ranks" as const, result });
  }

  return json({ kind: "none" as const });
};

export default function KeywordsPage() {
  const { gscStatus, ctr, cannibalisation, assignedKeywords, shopDomain } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const busy = navigation.state === "submitting";

  const [term, setTerm] = useState("");
  const [url, setUrl] = useState("");
  const [gid, setGid] = useState("");

  return (
    <Page
      title="Keywords"
      subtitle="Positions come from your own Search Console data, measured — not estimated."
      primaryAction={{
        content: busy ? "Refreshing…" : "Refresh positions",
        loading: busy,
        disabled: !gscStatus.isConnected,
        onAction: () => submit({ intent: "refresh_ranks" }, { method: "post" }),
      }}
    >
      <Layout>
        {!gscStatus.isConnected && (
          <Layout.Section>
            <Banner tone="warning" title="Search Console is not connected">
              <p>
                Without it we have no measured positions, no impressions and no click data for {shopDomain}. We will not
                show estimates in its place — connect the property and the numbers on this page become real.
                {!gscStatus.oauthConfigured &&
                  " (The server is also missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET, so the connect flow is disabled.)"}
              </p>
            </Banner>
          </Layout.Section>
        )}

        {actionData?.kind === "ranks" && (
          <Layout.Section>
            <Banner tone={actionData.result.updated > 0 ? "success" : "info"} title="Positions refreshed">
              <p>
                {actionData.result.updated} keyword{actionData.result.updated === 1 ? "" : "s"} had a measured position
                in the last 7 days of Search Console data.
                {actionData.result.error ? ` ${actionData.result.error}` : ""}
              </p>
            </Banner>
          </Layout.Section>
        )}

        {actionData?.kind === "error" && (
          <Layout.Section>
            <Banner tone="critical" title="Could not assign that keyword">
              <p>{actionData.message}</p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">Assign a primary keyword</Text>
              <Text as="p" tone="subdued" variant="bodySm">
                One primary keyword per URL per market. The database enforces it, so a second assignment replaces the first
                instead of letting two pages compete.
              </Text>
              <InlineStack gap="300" wrap>
                <TextField label="Keyword" value={term} onChange={setTerm} autoComplete="off" />
                <TextField label="Page URL" value={url} onChange={setUrl} autoComplete="off" placeholder={`https://${shopDomain}/products/…`} />
                <TextField label="Product ID" value={gid} onChange={setGid} autoComplete="off" placeholder="gid://shopify/Product/…" />
              </InlineStack>
              <InlineStack>
                <Button
                  variant="primary"
                  loading={busy}
                  onClick={() => submit({ intent: "assign_keyword", term, url, resourceGid: gid }, { method: "post" })}
                >
                  Assign keyword
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card padding="0">
            {assignedKeywords.length === 0 ? (
              <EmptyState heading="No keywords assigned yet" image="">
                <p>Assign a keyword to a page above, then refresh positions to see where it actually ranks.</p>
              </EmptyState>
            ) : (
              <IndexTable
                resourceName={{ singular: "keyword", plural: "keywords" }}
                itemCount={assignedKeywords.length}
                selectable={false}
                headings={[
                  { title: "Keyword" },
                  { title: "Market" },
                  { title: "Page" },
                  { title: "Position" },
                  { title: "Change" },
                  { title: "Measured" },
                ]}
              >
                {assignedKeywords.map((k, index) => {
                  const delta =
                    k.latestPosition !== null && k.previousPosition !== null
                      ? k.previousPosition - k.latestPosition
                      : null;
                  return (
                    <IndexTable.Row id={k.id} key={k.id} position={index}>
                      <IndexTable.Cell><Text as="span">{k.term}</Text></IndexTable.Cell>
                      <IndexTable.Cell><Text as="span">{k.market}</Text></IndexTable.Cell>
                      <IndexTable.Cell><PolarisLink url={k.url} target="_blank">{k.url}</PolarisLink></IndexTable.Cell>
                      <IndexTable.Cell>
                        {k.latestPosition === null
                          ? <Text as="span" tone="subdued">Not measured</Text>
                          : <Text as="span">{`#${k.latestPosition}`}</Text>}
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        {delta === null
                          ? <Text as="span" tone="subdued">—</Text>
                          : <Badge tone={delta > 0 ? "success" : delta < 0 ? "warning" : undefined}>
                              {delta > 0 ? `up ${delta}` : delta < 0 ? `down ${Math.abs(delta)}` : "no change"}
                            </Badge>}
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <Text as="span" tone="subdued">
                          {k.measuredAt ? new Date(k.measuredAt).toLocaleDateString() : "—"}
                        </Text>
                      </IndexTable.Cell>
                    </IndexTable.Row>
                  );
                })}
              </IndexTable>
            )}
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">Pages ranking but not being clicked</Text>
              {!ctr.available ? (
                <Text as="p" tone="subdued">
                  {ctr.connected ? ctr.error : "Connect Search Console to see this."}
                </Text>
              ) : ctr.rows.length === 0 ? (
                <Text as="p" tone="subdued">Nothing stands out in the last 28 days.</Text>
              ) : (
                <IndexTable
                  resourceName={{ singular: "query", plural: "queries" }}
                  itemCount={ctr.rows.length}
                  selectable={false}
                  headings={[
                    { title: "Query" },
                    { title: "Page" },
                    { title: "Impressions" },
                    { title: "Your CTR" },
                    { title: "Typical at this position" },
                  ]}
                >
                  {ctr.rows.slice(0, 25).map((o, index) => (
                    <IndexTable.Row id={`${o.query}-${index}`} key={`${o.query}-${index}`} position={index}>
                      <IndexTable.Cell><Text as="span">{o.query}</Text></IndexTable.Cell>
                      <IndexTable.Cell><PolarisLink url={o.pageUrl} target="_blank">{o.pageUrl}</PolarisLink></IndexTable.Cell>
                      <IndexTable.Cell><Text as="span">{String(o.impressions)}</Text></IndexTable.Cell>
                      <IndexTable.Cell><Text as="span">{`${o.ctr}%`}</Text></IndexTable.Cell>
                      <IndexTable.Cell><Text as="span" tone="subdued">{`${o.typicalCtrAtPosition}% at #${o.position}`}</Text></IndexTable.Cell>
                    </IndexTable.Row>
                  ))}
                </IndexTable>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">Your own pages competing for the same query</Text>
              {!cannibalisation.available ? (
                <Text as="p" tone="subdued">
                  {cannibalisation.connected ? cannibalisation.error : "Connect Search Console to see this."}
                </Text>
              ) : cannibalisation.rows.length === 0 ? (
                <Text as="p" tone="subdued">No overlap found in the last 28 days.</Text>
              ) : (
                <BlockStack gap="300">
                  {cannibalisation.rows.slice(0, 15).map((issue) => (
                    <BlockStack key={issue.query} gap="100">
                      <Text as="p" fontWeight="semibold">{issue.query}</Text>
                      {issue.urls.map((u) => (
                        <InlineStack key={u.pageUrl} gap="200">
                          <Text as="span" tone="subdued">{`#${u.position}`}</Text>
                          <PolarisLink url={u.pageUrl} target="_blank">{u.pageUrl}</PolarisLink>
                        </InlineStack>
                      ))}
                    </BlockStack>
                  ))}
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
