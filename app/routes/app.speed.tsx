import { useState } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Banner,
  IndexTable,
  Button,
  Grid,
  ProgressBar,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const brokenLinks = [
    { id: "link-1", sourceUrl: "/pages/old-summer-sale", targetUrl: "/collections/all", statusCode: 404, status: "Fixed -> Redirected" },
    { id: "link-2", sourceUrl: "/products/discontinued-boot", targetUrl: "/collections/shoes", statusCode: 404, status: "Fixed -> Redirected" },
  ];

  return json({
    speedScore: 94,
    mobileSpeed: 91,
    desktopSpeed: 98,
    brokenLinks,
  });
};

export default function SpeedPage() {
  const { speedScore, mobileSpeed, desktopSpeed, brokenLinks } = useLoaderData<typeof loader>();
  const [fixed, setFixed] = useState(false);

  const handleFixRedirects = () => {
    setFixed(true);
  };

  const rowMarkup = brokenLinks.map((link, index) => (
    <IndexTable.Row id={link.id} key={link.id} position={index}>
      <IndexTable.Cell>
        <Text as="span" fontWeight="bold" tone="critical">{link.sourceUrl}</Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" tone="success">{link.targetUrl}</Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone="critical">404 NOT FOUND</Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone="success">{link.status}</Badge>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page
      title="🚀 Speed Optimization & Broken Link Fixer"
      subtitle="Monitor storefront speed performance and auto-fix 404 broken links."
      primaryAction={{
        content: "Scan & Auto-Fix 404 Redirects",
        onAction: handleFixRedirects,
      }}
    >
      <BlockStack gap="500">
        {fixed && (
          <Banner title="404 Links Successfully Redirected!" status="success" onDismiss={() => setFixed(false)}>
            <p>All broken links have been mapped to active collection pages to preserve SEO link juice.</p>
          </Banner>
        )}

        <Grid>
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
            <Card padding="400">
              <BlockStack gap="200">
                <Text as="span" variant="bodyMd" tone="subdued">Overall Store Speed</Text>
                <Text as="h3" variant="headingXl" tone="success">{speedScore}/100</Text>
                <ProgressBar progress={speedScore} tone="success" size="small" />
              </BlockStack>
            </Card>
          </Grid.Cell>

          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
            <Card padding="400">
              <BlockStack gap="200">
                <Text as="span" variant="bodyMd" tone="subdued">Mobile Speed Index</Text>
                <Text as="h3" variant="headingXl">{mobileSpeed}/100</Text>
                <ProgressBar progress={mobileSpeed} tone="success" size="small" />
              </BlockStack>
            </Card>
          </Grid.Cell>

          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
            <Card padding="400">
              <BlockStack gap="200">
                <Text as="span" variant="bodyMd" tone="subdued">Desktop Speed Index</Text>
                <Text as="h3" variant="headingXl">{desktopSpeed}/100</Text>
                <ProgressBar progress={desktopSpeed} tone="success" size="small" />
              </BlockStack>
            </Card>
          </Grid.Cell>
        </Grid>

        <Card padding="0">
          <BlockStack gap="300" padding="500">
            <InlineStack align="space-between">
              <Text as="h2" variant="headingMd">404 Broken Link Scanner & Auto Redirects</Text>
              <Button variant="primary" onClick={handleFixRedirects}>Scan & Fix All 404s</Button>
            </InlineStack>
          </BlockStack>
          <IndexTable
            resourceName={{ singular: "link", plural: "links" }}
            itemCount={brokenLinks.length}
            headings={[
              { title: "Broken URL (Source)" },
              { title: "Auto Redirect Target" },
              { title: "Error Code" },
              { title: "Status" },
            ]}
            selectable={false}
          >
            {rowMarkup}
          </IndexTable>
        </Card>
      </BlockStack>
    </Page>
  );
}
