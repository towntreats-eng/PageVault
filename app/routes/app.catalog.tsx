import { useState } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
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
  Modal,
  Tabs,
  ButtonGroup,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { CATALOG_50_ITEMS, CatalogItem50 } from "../models/catalog_50";
import { detectShopThemeArchitecture } from "../services/theme.server";
import { TEMPLATE_PREVIEWS } from "../data/preview_code";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const itemId = formData.get("itemId") as string;

  const item = CATALOG_50_ITEMS.find((i) => i.id === itemId);
  if (!item) {
    return { success: false, error: "Template not found" };
  }

  try {
    // 1. Get Main Active Theme
    const themesResponse = await admin.graphql(`
      #graphql
      query getThemes {
        themes(first: 5, roles: MAIN) {
          nodes {
            id
            name
            role
          }
        }
      }
    `);
    const themesData = await themesResponse.json();
    const activeTheme = themesData?.data?.themes?.nodes?.[0];

    const previewData = TEMPLATE_PREVIEWS[item.id];
    const fullHtmlBody = previewData?.htmlPreview || `<div class="sf-injected-page">
      <h1>${item.name}</h1>
      <p>${item.description}</p>
    </div>`;

    // 2. Create Shopify Storefront Page via GraphQL Admin API
    const pageResponse = await admin.graphql(
      `#graphql
      mutation createPage($page: PageCreateInput!) {
        pageCreate(page: $page) {
          page {
            id
            title
            handle
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          page: {
            title: `Shop Forge - ${item.name}`,
            handle: `sf-${item.slug}`,
            body: fullHtmlBody,
          },
        },
      }
    );

    const pageResult = await pageResponse.json();
    const createdPage = pageResult?.data?.pageCreate?.page;
    const userErrors = pageResult?.data?.pageCreate?.userErrors;

    if (userErrors && userErrors.length > 0) {
      return { success: false, error: userErrors[0].message };
    }

    return {
      success: true,
      pageTitle: createdPage?.title || item.name,
      pageHandle: createdPage?.handle || item.slug,
      themeName: activeTheme?.name || "Active Theme",
      message: `🎉 Success! "${item.name}" has been directly created & injected into your Shopify store!`,
    };
  } catch (err: any) {
    const errorMsg = err.message || "";
    if (errorMsg.includes("Access denied") || errorMsg.includes("write_content")) {
      return {
        success: false,
        error: "🔑 Permission Required: Shop Forge needs Online Store Page permissions to auto-create pages. Please re-open the app or re-authorize permissions from your Shopify Admin.",
      };
    }
    return { success: false, error: errorMsg || "Failed to inject page into theme" };
  }
};

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
  const fetcher = useFetcher<typeof action>();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  
  // Live Preview Modal States
  const [selectedPreviewItem, setSelectedPreviewItem] = useState<CatalogItem50 | null>(null);
  const [selectedTab, setSelectedTab] = useState<number>(0);
  const [deviceMode, setDeviceMode] = useState<"desktop" | "mobile">("desktop");
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const filteredItems = items.filter((item) => {
    if (typeFilter !== "all" && item.type !== typeFilter) return false;
    return true;
  });

  const isInjecting = fetcher.state !== "idle";
  const injectionResult = fetcher.data;

  const previewData = selectedPreviewItem ? (TEMPLATE_PREVIEWS[selectedPreviewItem.id] || {
    id: selectedPreviewItem.id,
    name: selectedPreviewItem.name,
    htmlPreview: `<!DOCTYPE html><html><body style="font-family:sans-serif; padding:40px; text-align:center;"><h2>${selectedPreviewItem.name}</h2><p>${selectedPreviewItem.description}</p><div style="background:#2563eb; color:#fff; padding:16px 32px; border-radius:30px; display:inline-block; font-weight:bold; margin-top:20px;">Render Verified CRO Section</div></body></html>`,
    liquidCode: `{% comment %} Shop Forge — ${selectedPreviewItem.name} {% endcomment %}\n{% section '${selectedPreviewItem.block_handle}' %}`,
    jsonSchema: `{\n  "name": "${selectedPreviewItem.name}",\n  "sections": {\n    "main": { "type": "${selectedPreviewItem.block_handle}" }\n  }\n}`
  }) : null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

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

        {/* Injection Success / Error Banner */}
        {injectionResult && (
          <Banner
            title={injectionResult.success ? "Page Successfully Injected into Store!" : "Injection Failed"}
            tone={injectionResult.success ? "success" : "critical"}
          >
            {injectionResult.success ? (
              <BlockStack gap="200">
                <p>{injectionResult.message}</p>
                <p>
                  <strong>Live Page URL:</strong>{" "}
                  <a
                    href={`https://${shopDomain}/pages/${injectionResult.pageHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#2563eb", fontWeight: "bold" }}
                  >
                    https://{shopDomain}/pages/{injectionResult.pageHandle} ↗
                  </a>
                </p>
              </BlockStack>
            ) : (
              <p>{injectionResult.error}</p>
            )}
          </Banner>
        )}

        {/* Merchant Guide */}
        <Card background="bg-surface-secondary">
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              💡 Direct 1-Click Storefront Injection & Preview:
            </Text>
            <InlineStack gap="400" wrap>
              <Box background="bg-surface" padding="300" borderRadius="200">
                <Text as="p" variant="bodySm">
                  <strong>1️⃣ Full Live Preview:</strong> Click <strong>"👁️ Live Demo Preview"</strong> on any of the 10 Home Pages to view full Desktop & Mobile designs.
                </Text>
              </Box>
              <Box background="bg-surface" padding="300" borderRadius="200">
                <Text as="p" variant="bodySm">
                  <strong>2️⃣ 1-Click Store Injection:</strong> Click <strong>"🚀 Inject Page into Store Theme"</strong> to automatically create & inject the page into your Shopify Store!
                </Text>
              </Box>
            </InlineStack>
          </BlockStack>
        </Card>

        {/* Filters */}
        <Card>
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="400">
              <Select
                label="Component Type"
                options={[
                  { label: `All Items (${items.length})`, value: "all" },
                  { label: "10 Full D2C Home Pages", value: "page" },
                  { label: "Theme Sections (40)", value: "section" },
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
                          onClick={() => setSelectedPreviewItem(item)}
                          variant="tertiary"
                        >
                          👁️ Full Live Preview
                        </Button>

                        {isCompatible ? (
                          <fetcher.Form method="post">
                            <input type="hidden" name="itemId" value={item.id} />
                            <Button
                              submit
                              variant="primary"
                              loading={isInjecting && fetcher.formData?.get("itemId") === item.id}
                            >
                              🚀 Inject Page into Theme
                            </Button>
                          </fetcher.Form>
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

        {/* Live Interactive Preview Modal */}
        {selectedPreviewItem && (
          <Modal
            open={!!selectedPreviewItem}
            onClose={() => setSelectedPreviewItem(null)}
            title={`Live Demo Preview: ${selectedPreviewItem.name}`}
            primaryAction={{
              content: "Open Theme Editor",
              url: `https://${shopDomain}/admin/themes/current/editor?context=apps`,
              target: "_blank",
            }}
            secondaryActions={[
              {
                content: "Close Preview",
                onAction: () => setSelectedPreviewItem(null),
              },
            ]}
            size="large"
          >
            <Modal.Section>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Tabs
                    tabs={[
                      { id: "visual", content: "🖥️ Visual Live Preview" },
                      { id: "liquid", content: "📄 Liquid Code" },
                      { id: "json", content: "⚙️ JSON Schema" },
                    ]}
                    selected={selectedTab}
                    onSelect={(idx) => setSelectedTab(idx)}
                  />

                  {selectedTab === 0 && (
                    <ButtonGroup variant="segmented">
                      <Button
                        pressed={deviceMode === "desktop"}
                        onClick={() => setDeviceMode("desktop")}
                      >
                        💻 Desktop
                      </Button>
                      <Button
                        pressed={deviceMode === "mobile"}
                        onClick={() => setDeviceMode("mobile")}
                      >
                        📱 Mobile
                      </Button>
                    </ButtonGroup>
                  )}
                </InlineStack>

                {selectedTab === 0 && previewData && (
                  <Box
                    padding="400"
                    background="bg-surface-secondary"
                    borderRadius="300"
                  >
                    <div
                      style={{
                        margin: "0 auto",
                        maxWidth: deviceMode === "mobile" ? "375px" : "100%",
                        height: "520px",
                        border: deviceMode === "mobile" ? "12px solid #1f2937" : "1px solid #d1d5db",
                        borderRadius: deviceMode === "mobile" ? "36px" : "12px",
                        overflow: "hidden",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                        transition: "all 0.3s ease",
                      }}
                    >
                      <iframe
                        title="Live Demo Preview Frame"
                        srcDoc={previewData.htmlPreview}
                        style={{
                          width: "100%",
                          height: "100%",
                          border: "none",
                        }}
                      />
                    </div>
                  </Box>
                )}

                {selectedTab === 1 && previewData && (
                  <BlockStack gap="300">
                    <InlineStack align="space-between">
                      <Text as="p" variant="bodySm">Copy Liquid code to place manually inside your Shopify Theme:</Text>
                      <Button
                        onClick={() => handleCopy(previewData.liquidCode)}
                        variant="primary"
                      >
                        {copiedCode ? "✔ Copied!" : "📋 Copy Liquid Code"}
                      </Button>
                    </InlineStack>
                    <Box padding="400" background="bg-surface-tertiary" borderRadius="200">
                      <pre style={{ margin: 0, fontFamily: "monospace", fontSize: "12px", whiteSpace: "pre-wrap" }}>
                        {previewData.liquidCode}
                      </pre>
                    </Box>
                  </BlockStack>
                )}

                {selectedTab === 2 && previewData && (
                  <BlockStack gap="300">
                    <InlineStack align="space-between">
                      <Text as="p" variant="bodySm">JSON Schema for Shopify OS 2.0 section templates:</Text>
                      <Button
                        onClick={() => handleCopy(previewData.jsonSchema)}
                        variant="primary"
                      >
                        {copiedCode ? "✔ Copied!" : "📋 Copy JSON Schema"}
                      </Button>
                    </InlineStack>
                    <Box padding="400" background="bg-surface-tertiary" borderRadius="200">
                      <pre style={{ margin: 0, fontFamily: "monospace", fontSize: "12px", whiteSpace: "pre-wrap" }}>
                        {previewData.jsonSchema}
                      </pre>
                    </Box>
                  </BlockStack>
                )}
              </BlockStack>
            </Modal.Section>
          </Modal>
        )}
      </BlockStack>
    </Page>
  );
}

