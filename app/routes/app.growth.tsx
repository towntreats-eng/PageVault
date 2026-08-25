import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Badge,
  BlockStack,
  InlineStack,
  DataTable,
  Box,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  const wishlists = await db.wishlistItem.findMany({
    where: { shop_domain: shopDomain },
    take: 20,
    orderBy: { created_at: "desc" },
  });

  const stockAlerts = await db.stockAlert.findMany({
    where: { shop_domain: shopDomain },
    take: 20,
    orderBy: { created_at: "desc" },
  });

  return {
    wishlistCount: await db.wishlistItem.count({ where: { shop_domain: shopDomain } }),
    stockAlertCount: await db.stockAlert.count({ where: { shop_domain: shopDomain } }),
    wishlists,
    stockAlerts,
  };
};

export default function ShopForgeGrowth() {
  const { wishlistCount, stockAlertCount, wishlists, stockAlerts } = useLoaderData<typeof loader>();

  const wishlistRows = wishlists.map((w) => [
    w.customer_id,
    w.product_id,
    new Date(w.created_at).toLocaleDateString(),
  ]);

  const stockRows = stockAlerts.map((s) => [
    s.email,
    s.variant_id,
    s.notified_at ? "✓ Notified" : "⌛ Waiting Restock",
    new Date(s.created_at).toLocaleDateString(),
  ]);

  return (
    <Page title="Shop Forge — Growth App Replacement Engine">
      <TitleBar title="Growth Features | Shop Forge" />
      <BlockStack gap="500">
        <Layout>
          {/* Wishlist Overview */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    Customer Wishlist Saved Items
                  </Text>
                  <Badge tone="success">{wishlistCount} TOTAL WISHLISTED ITEMS</Badge>
                </InlineStack>

                {wishlists.length === 0 ? (
                  <Box padding="300">
                    <Text as="p" variant="bodySm" tone="subdued">
                      No wishlisted items recorded yet.
                    </Text>
                  </Box>
                ) : (
                  <DataTable
                    columnContentTypes={["text", "text", "text"]}
                    headings={["Customer ID", "Product ID", "Date Saved"]}
                    rows={wishlistRows}
                  />
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Back-In-Stock Alerts Queue */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    Back-In-Stock Restock Alerts Queue
                  </Text>
                  <Badge tone="attention">{stockAlertCount} ACTIVE RESTOCK ALERTS</Badge>
                </InlineStack>

                {stockAlerts.length === 0 ? (
                  <Box padding="300">
                    <Text as="p" variant="bodySm" tone="subdued">
                      No back-in-stock alerts registered yet.
                    </Text>
                  </Box>
                ) : (
                  <DataTable
                    columnContentTypes={["text", "text", "text", "text"]}
                    headings={["Customer Email", "Variant ID", "Notification Status", "Date Requested"]}
                    rows={stockRows}
                  />
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
