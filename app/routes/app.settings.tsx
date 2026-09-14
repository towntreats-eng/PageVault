import { useState } from "react";
import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  Select,
  Button,
  Banner,
  Divider,
  Box,
  Badge,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const shopDomain = session.shop;

    const shop = await prisma.shop.upsert({
      where: { domain: shopDomain },
      create: { domain: shopDomain },
      update: {},
    });

    const usageRecords = await prisma.aiUsageRecord.findMany({
      where: { shopDomain },
    });

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    for (const u of usageRecords) {
      totalInputTokens += u.inputTokens;
      totalOutputTokens += u.outputTokens;
    }

    return json({
      shop,
      usage: {
        totalCalls: usageRecords.length,
        totalInputTokens,
        totalOutputTokens,
        estimatedCostUsd: Math.round(((totalInputTokens * 0.000075 + totalOutputTokens * 0.0003) / 1000) * 10000) / 10000,
      },
    });
  } catch (error) {
    console.error("[Settings Loader Error]", error);
    return json({
      shop: {
        id: "default",
        domain: "",
        brandVoice: "professional",
        geminiApiKey: null,
      } as any,
      usage: {
        totalCalls: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        estimatedCostUsd: 0,
      },
    });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;
  const formData = await request.formData();

  const brandVoice = (formData.get("brandVoice") as string) || "professional";
  const customVoiceRules = (formData.get("customVoiceRules") as string) || "";
  const geminiApiKey = (formData.get("geminiApiKey") as string) || "";

  await prisma.shop.update({
    where: { domain: shopDomain },
    data: {
      brandVoice,
      customVoiceRules,
      geminiApiKey: geminiApiKey.trim() ? geminiApiKey.trim() : null,
    },
  });

  return json({
    success: true,
    message: "Settings and AI Brand Voice preferences saved successfully.",
  });
};

export default function SettingsPage() {
  const { shop, usage } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();

  const [brandVoice, setBrandVoice] = useState(shop.brandVoice || "professional");
  const [customVoiceRules, setCustomVoiceRules] = useState(shop.customVoiceRules || "");
  const [apiKey, setApiKey] = useState(shop.geminiApiKey || "");

  const isSaving = navigation.state === "submitting";

  const handleSave = () => {
    submit(
      {
        brandVoice,
        customVoiceRules,
        geminiApiKey: apiKey,
      },
      { method: "post" }
    );
  };

  return (
    <Page
      title="Settings & AI Usage Guard"
      subtitle="Configure brand tone of voice, API keys, and monitor generation token expenditures"
      primaryAction={{
        content: "Save Preferences",
        onAction: handleSave,
        loading: isSaving,
      }}
    >
      <BlockStack gap="500">
        {actionData?.message && (
          <Banner tone={actionData.success ? "success" : "critical"}>
            <p>{actionData.message}</p>
          </Banner>
        )}

        <Layout>
          {/* Left Column: Brand Voice Configuration */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Store Brand Voice & Copywriting Tone
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  All AI-generated product descriptions, meta tags, and blog posts will adhere strictly to this tonal style.
                </Text>
                <Divider />

                <Select
                  label="Preset Brand Personality"
                  options={[
                    { label: "Professional & Trustworthy (Recommended for B2B & Luxury)", value: "professional" },
                    { label: "Friendly, Warm & Approachable (Ideal for Lifestyle & Apparel)", value: "friendly" },
                    { label: "Premium & Sophisticated (High-end aesthetics & elegance)", value: "premium" },
                    { label: "Minimalist & Direct (Short, punchy, no fluff)", value: "minimal" },
                    { label: "Bold, Edgy & Energetic (Streetwear, fitness, gaming)", value: "bold" },
                    { label: "Technical & Spec-Driven (Electronics, tools, industrial)", value: "technical" },
                    { label: "Casual & Playful (Youth, gifts, novelty)", value: "casual" },
                    { label: "Custom Brand Voice Guidelines", value: "custom" },
                  ]}
                  value={brandVoice}
                  onChange={setBrandVoice}
                />

                <TextField
                  label="Custom Voice Instructions & Negative Constraints"
                  placeholder="e.g. Always emphasize handmade craftsmanship. Never use words like 'game-changer' or 'unleash'. Keep sentences under 20 words."
                  value={customVoiceRules}
                  onChange={setCustomVoiceRules}
                  multiline={4}
                  autoComplete="off"
                  helpText="Optional rules injected into every AI generation prompt."
                />
              </BlockStack>
            </Card>

            <Box paddingBlockStart="400">
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Google Gemini AI Key Configuration
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    You can provide your own Google Gemini API Key from Google AI Studio. If left blank, the app will use the system default or high-precision deterministic templates.
                  </Text>
                  <Divider />
                  <TextField
                    label="Google Gemini API Key"
                    type="password"
                    placeholder="AIzaSy..."
                    value={apiKey}
                    onChange={setApiKey}
                    autoComplete="off"
                  />
                </BlockStack>
              </Card>
            </Box>
          </Layout.Section>

          {/* Right Column: Usage Guard & Billing Status */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between">
                    <Text as="h3" variant="headingSm">
                      SaaS Plan Tier
                    </Text>
                    <Badge tone="success">{shop.plan.toUpperCase()}</Badge>
                  </InlineStack>
                  <Divider />
                  <Text as="p" variant="bodySm">
                    Connected Store: <strong>{shop.domain}</strong>
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Includes store scanning, rule audit, keyword research, and diff preview.
                  </Text>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingSm">
                    AI Usage & Token Meter
                  </Text>
                  <Divider />
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodySm">
                      Total AI Operations:
                    </Text>
                    <Text as="span" variant="bodySm" fontWeight="bold">
                      {usage.totalCalls}
                    </Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodySm">
                      Input Tokens:
                    </Text>
                    <Text as="span" variant="bodySm">
                      {usage.totalInputTokens.toLocaleString()}
                    </Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodySm">
                      Output Tokens:
                    </Text>
                    <Text as="span" variant="bodySm">
                      {usage.totalOutputTokens.toLocaleString()}
                    </Text>
                  </InlineStack>
                  <Divider />
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodySm" fontWeight="bold">
                      Est. Provider Cost:
                    </Text>
                    <Text as="span" variant="bodySm" tone="success">
                      ${usage.estimatedCostUsd}
                    </Text>
                  </InlineStack>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
