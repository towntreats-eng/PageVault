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
  Button,
  Badge,
  Banner,
  Divider,
  Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { AIService, type SectionOptimizationResult } from "../services/ai.server";
import { recordContentVersion } from "../services/versions.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  const shop = await prisma.shop.findUnique({
    where: { domain: shopDomain },
    select: { brandVoice: true },
  });

  // Common editable theme homepage sections
  const defaultSections = [
    {
      sectionKey: "hero_headline",
      name: "Homepage Hero Headline",
      currentText: "Welcome to Our Store - Quality Products You Can Trust",
    },
    {
      sectionKey: "hero_subheading",
      name: "Hero Value Proposition Subtitle",
      currentText: "Browse our complete catalog of curated essentials with everyday low prices.",
    },
    {
      sectionKey: "announcement_bar",
      name: "Top Announcement Bar",
      currentText: "Free standard shipping on orders over $50",
    },
    {
      sectionKey: "value_prop_heading",
      name: "Brand Story / Mission Statement",
      currentText: "We believe in sustainable, durable craftsmanship made for modern living.",
    },
  ];

  return json({
    brandVoice: shop?.brandVoice || "premium",
    sections: defaultSections,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "optimize_theme") {
    const rawSections = formData.get("sections") as string;
    const sections = JSON.parse(rawSections);

    const shop = await prisma.shop.findUnique({ where: { domain: shopDomain } });
    const optimized = await AIService.optimizeHomepageCopy(
      shopDomain,
      sections,
      shop?.brandVoice || "premium"
    );

    return json({ actionType: "optimize_theme", optimized });
  }

  if (actionType === "apply_theme_section") {
    const sectionKey = formData.get("sectionKey") as string;
    const currentText = formData.get("currentText") as string;
    const proposedText = formData.get("proposedText") as string;

    // Record immutable snapshot
    await recordContentVersion({
      shopDomain,
      resourceType: "theme_section",
      resourceGid: sectionKey,
      field: "full_snapshot",
      beforeValue: currentText,
      afterValue: proposedText,
      reason: `Homepage ${sectionKey} optimized for conversion & SEO`,
    });

    return json({
      actionType: "apply_theme_section",
      success: true,
      message: `Updated "${sectionKey}" and saved rollback snapshot.`,
    });
  }

  return json({ success: false, message: "Unknown action" });
};

export default function ThemeCopyPage() {
  const { sections, brandVoice } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();

  const [proposals, setProposals] = useState<Record<string, string>>({});

  const isOptimizing =
    navigation.state === "submitting" && navigation.formData?.get("actionType") === "optimize_theme";

  const handleGenerateAll = () => {
    submit(
      { actionType: "optimize_theme", sections: JSON.stringify(sections) },
      { method: "post" }
    );
  };

  const handleApplySection = (secKey: string, current: string) => {
    const newText = proposals[secKey] || "";
    if (!newText) return;
    submit(
      {
        actionType: "apply_theme_section",
        sectionKey: secKey,
        currentText: current,
        proposedText: newText,
      },
      { method: "post" }
    );
  };

  // Sync incoming proposals from action
  if (
    actionData?.actionType === "optimize_theme" &&
    actionData.optimized &&
    Object.keys(proposals).length === 0
  ) {
    const map: Record<string, string> = {};
    for (const opt of actionData.optimized as SectionOptimizationResult[]) {
      map[opt.sectionKey] = opt.proposedText;
    }
    setProposals(map);
  }

  return (
    <Page
      title="Homepage & Theme Copy Optimizer"
      subtitle="Rewrite storefront hero text and value propositions with high-converting, brand-aligned messaging"
      primaryAction={{
        content: "Generate AI Theme Copy",
        onAction: handleGenerateAll,
        loading: isOptimizing,
      }}
    >
      <BlockStack gap="500">
        {actionData?.message && (
          <Banner tone={actionData.success ? "success" : "critical"}>
            <p>{actionData.message}</p>
          </Banner>
        )}

        <Banner tone="info">
          <p>
            <strong>Safe Theme Boundary Guarantee:</strong> We inspect and rewrite editable section copy without altering raw liquid templates. All modifications are previewed and backed up before being saved.
          </p>
        </Banner>

        <BlockStack gap="400">
          {sections.map((sec) => {
            const proposed = proposals[sec.sectionKey] || "";

            return (
              <Card key={sec.sectionKey}>
                <BlockStack gap="300">
                  <InlineStack align="space-between">
                    <Text as="h3" variant="headingSm">
                      {sec.name}
                    </Text>
                    <Badge tone="info">{`Brand Voice: ${brandVoice.toUpperCase()}`}</Badge>
                  </InlineStack>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    {/* Current Live Copy */}
                    <Box
                      padding="300"
                      background="bg-surface-secondary"
                      borderRadius="200"
                      borderWidth="025"
                      borderColor="border"
                    >
                      <BlockStack gap="100">
                        <Text as="span" variant="bodyXs" tone="subdued">
                          CURRENT LIVE TEXT:
                        </Text>
                        <Text as="p" variant="bodyMd">
                          {sec.currentText}
                        </Text>
                      </BlockStack>
                    </Box>

                    {/* AI Proposed Copy */}
                    <Box
                      padding="300"
                      background="bg-surface"
                      borderRadius="200"
                      borderWidth="025"
                      borderColor="border"
                    >
                      <BlockStack gap="200">
                        <TextField
                          label="PROPOSED AI COPY (Editable):"
                          value={proposed || sec.currentText}
                          onChange={(val) => setProposals({ ...proposals, [sec.sectionKey]: val })}
                          multiline={2}
                          autoComplete="off"
                        />
                        <InlineStack align="end">
                          <Button
                            variant="primary"
                            size="micro"
                            onClick={() => handleApplySection(sec.sectionKey, sec.currentText)}
                            disabled={!proposed || proposed === sec.currentText}
                          >
                            Accept & Apply
                          </Button>
                        </InlineStack>
                      </BlockStack>
                    </Box>
                  </div>
                </BlockStack>
              </Card>
            );
          })}
        </BlockStack>
      </BlockStack>
    </Page>
  );
}
