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
  Select,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { AIService, type BlogOptimizationResult } from "../services/ai.server";
import { recordContentVersion } from "../services/versions.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const shopDomain = session.shop;

    const articles = await prisma.articleRecord.findMany({
      where: { shopDomain },
      orderBy: { updatedAt: "desc" },
    });

    const shop = await prisma.shop.findUnique({
      where: { domain: shopDomain },
      select: { brandVoice: true },
    });

    return json({
      articles,
      brandVoice: shop?.brandVoice || "professional",
    });
  } catch (error) {
    console.error("[Blog Loader Error]", error);
    return json({
      articles: [],
      brandVoice: "professional",
    });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "optimize_article") {
    const articleGid = formData.get("articleGid") as string;
    const article = await prisma.articleRecord.findUnique({ where: { shopifyGid: articleGid } });
    if (!article) return json({ error: "Article not found" }, { status: 404 });

    const shop = await prisma.shop.findUnique({ where: { domain: shopDomain } });
    const result = await AIService.optimizeBlogArticle(
      shopDomain,
      article,
      shop?.brandVoice || "professional"
    );

    return json({ actionType: "optimize_article", articleGid, result });
  }

  if (actionType === "generate_new_blog") {
    const topic = formData.get("topic") as string;
    const targetKeyword = formData.get("targetKeyword") as string;
    const voice = formData.get("brandVoice") as string;

    const dummyArticle = {
      title: topic,
      body: `Complete guide on ${topic} targeting ${targetKeyword}.`,
      author: "Store Editorial",
      tags: targetKeyword,
    };

    const result = await AIService.optimizeBlogArticle(shopDomain, dummyArticle, voice);
    return json({ actionType: "generate_new_blog", result });
  }

  return json({ success: false, message: "Unknown action" });
};

export default function BlogSeoPage() {
  const { articles, brandVoice } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();

  const [activeTab, setActiveTab] = useState<"existing" | "generator">("existing");
  const [topic, setTopic] = useState("");
  const [keyword, setKeyword] = useState("");
  const [selectedVoice, setSelectedVoice] = useState(brandVoice);

  const isGenerating = navigation.state === "submitting";

  const handleOptimize = (articleGid: string) => {
    submit({ actionType: "optimize_article", articleGid }, { method: "post" });
  };

  const handleGenerateNew = () => {
    if (!topic.trim()) return;
    submit(
      {
        actionType: "generate_new_blog",
        topic,
        targetKeyword: keyword,
        brandVoice: selectedVoice,
      },
      { method: "post" }
    );
  };

  const currentResult: BlogOptimizationResult | null =
    (actionData?.result as BlogOptimizationResult) || null;

  return (
    <Page
      title="Blog SEO & AI Content Studio"
      subtitle="Improve search rankings for existing articles and generate comprehensive guides targeting buyer intent"
    >
      <BlockStack gap="500">
        <InlineStack gap="200">
          <Button
            pressed={activeTab === "existing"}
            onClick={() => setActiveTab("existing")}
          >
            Existing Store Articles ({articles.length})
          </Button>
          <Button
            pressed={activeTab === "generator"}
            onClick={() => setActiveTab("generator")}
          >
            AI Blog Post Writer Studio
          </Button>
        </InlineStack>

        {activeTab === "existing" ? (
          <BlockStack gap="400">
            {articles.length === 0 ? (
              <Card>
                <Box padding="400">
                  <Text as="p" tone="subdued" alignment="center">
                    No blog articles found in your store. Use the "AI Blog Post Writer Studio" tab above to generate new SEO articles or run a catalog scan.
                  </Text>
                </Box>
              </Card>
            ) : (
              articles.map((art) => (
                <Card key={art.id}>
                  <BlockStack gap="300">
                    <InlineStack align="space-between">
                      <BlockStack gap="050">
                        <Text as="h3" variant="headingSm">
                          {art.title}
                        </Text>
                        <Text as="span" variant="bodyXs" tone="subdued">
                          Handle: /{art.handle} • Author: {art.author || "Store"}
                        </Text>
                      </BlockStack>
                      <Button
                        variant="primary"
                        size="micro"
                        onClick={() => handleOptimize(art.shopifyGid)}
                        loading={isGenerating && navigation.formData?.get("articleGid") === art.shopifyGid}
                      >
                        AI Optimize Article
                      </Button>
                    </InlineStack>
                  </BlockStack>
                </Card>
              ))
            )}
          </BlockStack>
        ) : (
          <Layout>
            <Layout.Section variant="oneThird">
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingSm">
                    Blog Post Generation Inputs
                  </Text>
                  <TextField
                    label="Article Topic / Working Title"
                    placeholder="e.g. How to Care for Organic Cotton Bedding"
                    value={topic}
                    onChange={setTopic}
                    autoComplete="off"
                  />
                  <TextField
                    label="Primary Target Keyword"
                    placeholder="e.g. organic cotton bedding care"
                    value={keyword}
                    onChange={setKeyword}
                    autoComplete="off"
                  />
                  <Select
                    label="Brand Voice Tone"
                    options={[
                      { label: "Professional & Authoritative", value: "professional" },
                      { label: "Friendly & Approachable", value: "friendly" },
                      { label: "Premium & Sophisticated", value: "premium" },
                      { label: "Bold & Direct", value: "bold" },
                      { label: "Technical & In-Depth", value: "technical" },
                    ]}
                    value={selectedVoice}
                    onChange={setSelectedVoice}
                  />
                  <Button variant="primary" onClick={handleGenerateNew} loading={isGenerating}>
                    Generate Full Article Draft
                  </Button>
                </BlockStack>
              </Card>
            </Layout.Section>

            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text as="h3" variant="headingSm">
                    Generated Article Output
                  </Text>
                  <Divider />
                  {currentResult ? (
                    <BlockStack gap="300">
                      <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                        <Text as="strong" variant="headingMd">
                          {currentResult.title}
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          SEO Title: {currentResult.seoTitle} ({currentResult.seoTitle.length} chars)
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Meta Snippet: {currentResult.seoDescription}
                        </Text>
                      </Box>

                      <Text as="h4" variant="headingSm">
                        Key Subheadings & Structure:
                      </Text>
                      <ul>
                        {currentResult.headings.map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>

                      <Text as="h4" variant="headingSm">
                        Article Body HTML Preview:
                      </Text>
                      <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                        <div
                          style={{ maxHeight: "300px", overflowY: "auto" }}
                          dangerouslySetInnerHTML={{ __html: currentResult.bodyHtml }}
                        />
                      </Box>

                      {currentResult.faqs.length > 0 && (
                        <BlockStack gap="100">
                          <Text as="h4" variant="headingSm">
                            Included Buyer FAQs:
                          </Text>
                          {currentResult.faqs.map((faq, i) => (
                            <Box key={i} padding="200" background="bg-surface-secondary" borderRadius="100">
                              <Text as="p" variant="bodySm" fontWeight="bold">
                                Q: {faq.question}
                              </Text>
                              <Text as="p" variant="bodySm">
                                A: {faq.answer}
                              </Text>
                            </Box>
                          ))}
                        </BlockStack>
                      )}
                    </BlockStack>
                  ) : (
                    <Box padding="400">
                      <Text as="p" tone="subdued" alignment="center">
                        Fill in the topic and target keyword on the left to generate an SEO-optimized blog draft complete with subheadings and FAQs.
                      </Text>
                    </Box>
                  )}
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        )}
      </BlockStack>
    </Page>
  );
}
