import { useState } from "react";
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
  Grid,
  Select,
  Button,
  Box,
  Banner,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { CATALOG_50_ITEMS } from "../models/catalog_50";
import { detectShopThemeArchitecture } from "../services/theme.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const shopDomain = session.shop;

  const themeStatus = await detectShopThemeArchitecture(admin);
  const shopRecord = await db.shop.findUnique({ where: { domain: shopDomain } });
  const activeSubscription = await db.subscription.findFirst({
    where: { shop_domain: shopDomain, status: "active" },
  });

  const activeTier = activeSubscription?.tier || shopRecord?.plan || "free";

  return {
    shopDomain,
    activeTier,
    themeStatus,
    items: CATALOG_50_ITEMS,
  };
};

export default function ShopForgeCatalog() {
  const { shopDomain, activeTier, themeStatus, items } = useLoaderData<typeof loader>();
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filteredItems = items.filter((item) => {
    if (typeFilter !== "all" && item.type !== typeFilter) return false;
    return true;
  });

  return (
    <Page title="Shop Forge — Page & Section Library (50 Designs)">
      <TitleBar title="Catalog (50 Items) | Shop Forge" />
      <BlockStack gap="500">
        <Banner title={`Active Store Theme: ${themeStatus.activeThemeName}`} tone="info">
          <p>
            Theme Architecture Detected: <strong>{themeStatus.architecture.toUpperCase()}</strong>.
            Items incompatible with your theme architecture show as <em>Coming Soon</em> and will never install broken.
          </p>
        </Banner>

        {/* Filters */}
        <Card>
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="400">
              <Select
                label="Component Type"
                options={[
                  { label: `All Items (${items.length})`, value: "all" },
                  { label: "Full Pages (26)", value: "page" },
                  { label: "Theme Sections (24)", value: "section" },
                ]}
                value={typeFilter}
                onChange={(val) => setTypeFilter(val)}
              />
            </InlineStack>
            <Text as="span" variant="bodySm" tone="subdued">
              Showing {filteredItems.length} of {items.length} render-verified items
            </Text>
          </InlineStack>
        </Card>

        {/* Items Grid */}
        <Grid>
          {filteredItems.map((item) => {
            const isCompatible = item.theme_compat.includes(themeStatus.architecture as any);

            return (
              <Grid.Cell key={item.id} columnSpan={{ xs: 12, sm: 6, md: 6, lg: 6, xl: 6 }}>
                <Card>
                  <BlockStack gap="300">
                    <InlineStack align="space-between" blockAlign="center">
                      <InlineStack gap="200">
                        <Badge tone={item.type === "page" ? "attention" : "info"}>
                          {item.type.toUpperCase()}
                        </Badge>
                        <Badge tone={item.min_tier === "free" ? "success" : "warning"}>
                          {item.min_tier.toUpperCase()} TIER
                        </Badge>
                      </InlineStack>

                      {!isCompatible && <Badge tone="critical">COMING SOON</Badge>}
                    </InlineStack>

                    <Text as="h3" variant="headingSm">
                      {item.name}
                    </Text>

                    <Text as="p" variant="bodySm" tone="subdued">
                      {item.description}
                    </Text>

                    <InlineStack gap="200">
                      {item.niche_tags.map((tag) => (
                        <Badge key={tag} tone="subdued">
                          {tag}
                        </Badge>
                      ))}
                    </InlineStack>

                    <Box paddingWithBorder="200" borderRadius="200" background="bg-surface-secondary">
                      <InlineStack align="space-between" blockAlign="center">
                        <Button
                          url={item.demo_url}
                          target="_blank"
                          variant="tertiary"
                        >
                          Live Demo
                        </Button>

                        {isCompatible ? (
                          <Button
                            variant="primary"
                            url={`https://${shopDomain}/admin/themes/current/editor?context=apps`}
                            target="_blank"
                          >
                            Add to Store Theme
                          </Button>
                        ) : (
                          <Button disabled>Coming Soon for Theme</Button>
                        )}
                      </InlineStack>
                    </Box>
                  </BlockStack>
                </Card>
              </Grid.Cell>
            );
          })}
        </Grid>
      </BlockStack>
    </Page>
  );
}
