import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { useState } from "react";
import {
  Page, Layout, Card, Text, Badge, IndexTable, EmptyState, InlineStack, BlockStack, Select, Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { listCrawledPages } from "../services/pages.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const pages = await listCrawledPages(session.shop);
  return json({ pages });
};

export default function PagesList() {
  const { pages } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [type, setType] = useState("all");

  const filtered = type === "all" ? pages : pages.filter((p) => p.resourceType === type);
  const types = Array.from(new Set(pages.map((p) => p.resourceType)));

  return (
    <Page
      title="Pages"
      subtitle="Every URL we fetched from your sitemap, with the status code we actually got back."
    >
      <Layout>
        {pages.length > 0 && (
          <Layout.Section>
            <Card>
              <InlineStack gap="400" blockAlign="center">
                <Box minWidth="220px">
                  <Select
                    label="Type"
                    labelInline
                    options={[{ label: "All", value: "all" }, ...types.map((t) => ({ label: t, value: t }))]}
                    value={type}
                    onChange={setType}
                  />
                </Box>
                <Text as="span" tone="subdued">{`${filtered.length} of ${pages.length} pages`}</Text>
              </InlineStack>
            </Card>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card padding="0">
            {pages.length === 0 ? (
              <EmptyState heading="No pages crawled yet" image="">
                <p>Run a scan from Home. We read your sitemap, fetch each page and record what is really in the HTML.</p>
              </EmptyState>
            ) : (
              <IndexTable
                resourceName={{ singular: "page", plural: "pages" }}
                itemCount={filtered.length}
                selectable={false}
                headings={[
                  { title: "URL" },
                  { title: "Type" },
                  { title: "Status" },
                  { title: "Issues" },
                  { title: "Last read" },
                ]}
              >
                {filtered.slice(0, 250).map((p, index) => (
                  <IndexTable.Row
                    id={p.id}
                    key={p.id}
                    position={index}
                    onClick={() => navigate(`/app/pages/${p.id}`)}
                  >
                    <IndexTable.Cell>
                      <Text as="span">{p.url.replace(/^https?:\/\/[^/]+/, "")}</Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell><Text as="span" tone="subdued">{p.resourceType}</Text></IndexTable.Cell>
                    <IndexTable.Cell>
                      <Badge tone={p.statusCode >= 400 ? "critical" : p.statusCode >= 300 ? "warning" : "success"}>
                        {String(p.statusCode)}
                      </Badge>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      {p.issueCount === 0 ? (
                        <Text as="span" tone="subdued">None</Text>
                      ) : (
                        <BlockStack gap="050">
                          <Text as="span">{String(p.issueCount)}</Text>
                          {p.criticalCount > 0 && (
                            <Text as="span" tone="critical" variant="bodySm">{`${p.criticalCount} critical`}</Text>
                          )}
                        </BlockStack>
                      )}
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Text as="span" tone="subdued">{new Date(p.lastCrawledAt).toLocaleString()}</Text>
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
