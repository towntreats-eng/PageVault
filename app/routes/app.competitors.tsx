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
  DataTable,
  Divider,
  Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { addCompetitor, analyzeCompetitorGaps } from "../services/competitors.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const shopDomain = session.shop;

    const competitors = await prisma.competitorTarget.findMany({
      where: { shopDomain },
      orderBy: { createdAt: "desc" },
    });

    const gaps = await analyzeCompetitorGaps(shopDomain);

    return json({
      competitors,
      gaps,
    });
  } catch (error) {
    console.error("[Competitors Loader Error]", error);
    return json({
      competitors: [],
      gaps: [],
    });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "add_competitor") {
    const domain = formData.get("domain") as string;
    const notes = formData.get("notes") as string;
    if (!domain || domain.trim().length === 0) {
      return json({ error: "Please enter a valid competitor domain." }, { status: 400 });
    }

    await addCompetitor(shopDomain, domain, notes);
    return json({
      actionType: "add_competitor",
      success: true,
      message: `Competitor "${domain}" added. Keyword profile and gap analysis refreshed.`,
    });
  }

  if (actionType === "delete_competitor") {
    const domain = formData.get("domain") as string;
    await prisma.competitorTarget.deleteMany({
      where: { shopDomain, domain },
    });
    return json({
      actionType: "delete_competitor",
      success: true,
      message: `Removed competitor "${domain}".`,
    });
  }

  return json({ success: false, message: "Unknown action" });
};

export default function CompetitorsPage() {
  const { competitors, gaps } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();

  const [domainInput, setDomainInput] = useState("");
  const [notesInput, setNotesInput] = useState("");

  const isAdding =
    navigation.state === "submitting" && navigation.formData?.get("actionType") === "add_competitor";

  const handleAdd = () => {
    if (!domainInput.trim()) return;
    submit(
      { actionType: "add_competitor", domain: domainInput, notes: notesInput },
      { method: "post" }
    );
    setDomainInput("");
    setNotesInput("");
  };

  const handleDelete = (domain: string) => {
    submit({ actionType: "delete_competitor", domain }, { method: "post" });
  };

  const gapRows = gaps.map((g) => [
    <Text as="span" variant="bodyMd" fontWeight="bold">
      {g.keyword}
    </Text>,
    g.competitorDomain,
    <Badge tone={g.searchIntent === "commercial" ? "info" : "attention"}>
      {g.searchIntent.toUpperCase()}
    </Badge>,
    <Badge tone={g.recommendedAction === "create_collection" ? "success" : "attention"}>
      {g.recommendedAction.replace("_", " ").toUpperCase()}
    </Badge>,
    <Text as="span" variant="bodySm">
      {g.suggestedTitle}
    </Text>,
  ]);

  return (
    <Page
      title="Competitor SEO Analyzer & Keyword Gap"
      subtitle="Benchmark against competing stores to identify missing keywords and untapped ranking opportunities"
    >
      <BlockStack gap="500">
        {actionData?.message && (
          <Banner tone={actionData.success ? "success" : "critical"}>
            <p>{actionData.message}</p>
          </Banner>
        )}

        <Layout>
          {/* Main: Keyword Gap Opportunities */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">
                    Identified Keyword Gaps ({gaps.length})
                  </Text>
                  <Badge tone={gaps.length > 0 ? "attention" : "success"}>
                    {gaps.length > 0 ? "Untapped Search Demand" : "Full Catalog Coverage"}
                  </Badge>
                </InlineStack>
                <Text as="p" variant="bodySm" tone="subdued">
                  These keywords are targeted by your competitors but are currently absent from your store's product titles and tags.
                </Text>
                <Divider />

                {gaps.length > 0 ? (
                  <DataTable
                    columnContentTypes={["text", "text", "text", "text", "text"]}
                    headings={["Missing Keyword", "Competitor", "Intent", "Recommended Action", "Suggested Page/Title"]}
                    rows={gapRows}
                  />
                ) : (
                  <Box padding="400">
                    <Text as="p" tone="subdued" alignment="center">
                      Add competitor domains below to benchmark and uncover keyword opportunities your store is missing.
                    </Text>
                  </Box>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Sidebar: Tracked Competitors & Add Form */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingSm">
                    Track Competitor Domain
                  </Text>
                  <TextField
                    label="Competitor Domain"
                    placeholder="e.g. competitorstore.com"
                    value={domainInput}
                    onChange={setDomainInput}
                    autoComplete="off"
                  />
                  <TextField
                    label="Notes / Brand Focus (optional)"
                    placeholder="e.g. Main direct competitor in sustainable sneakers"
                    value={notesInput}
                    onChange={setNotesInput}
                    autoComplete="off"
                  />
                  <Button variant="primary" onClick={handleAdd} loading={isAdding}>
                    Add & Analyze Competitor
                  </Button>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingSm">
                    Tracked Competitors ({competitors.length})
                  </Text>
                  <Divider />
                  {competitors.length === 0 ? (
                    <Text as="p" tone="subdued" variant="bodySm">
                      No competitors tracked yet.
                    </Text>
                  ) : (
                    <BlockStack gap="200">
                      {competitors.map((c) => (
                        <Box
                          key={c.id}
                          padding="200"
                          background="bg-surface-secondary"
                          borderRadius="150"
                          borderWidth="025"
                          borderColor="border"
                        >
                          <InlineStack align="space-between">
                            <BlockStack gap="050">
                              <Text as="strong" variant="bodySm">
                                {c.domain}
                              </Text>
                              {c.notes && (
                                <Text as="span" variant="bodyXs" tone="subdued">
                                  {c.notes}
                                </Text>
                              )}
                            </BlockStack>
                            <Button
                              size="micro"
                              tone="critical"
                              variant="plain"
                              onClick={() => handleDelete(c.domain)}
                            >
                              Remove
                            </Button>
                          </InlineStack>
                        </Box>
                      ))}
                    </BlockStack>
                  )}
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
