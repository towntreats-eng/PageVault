import React, { useState } from "react";
import {
  Modal,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  Badge,
  Banner,
  Box,
  Divider,
} from "@shopify/polaris";

export interface DiffPreviewData {
  resourceGid: string;
  resourceTitle: string;
  original: {
    title: string;
    description: string;
    seoTitle: string;
    seoDescription: string;
    imageAlts?: Array<{ id: string; altText: string }>;
  };
  proposed: {
    title: string;
    description: string;
    seoTitle: string;
    seoDescription: string;
    imageAlts?: Array<{ id: string; altText: string }>;
    rationale?: {
      issueAddressed: string;
      expectedBenefit: string;
      confidenceScore: number;
    };
  };
}

interface DiffPreviewModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (edited: {
    title: string;
    description: string;
    seoTitle: string;
    seoDescription: string;
    imageAlts?: Array<{ id: string; altText: string }>;
  }) => void;
  data: DiffPreviewData | null;
  loading?: boolean;
}

export function DiffPreviewModal({
  open,
  onClose,
  onApply,
  data,
  loading = false,
}: DiffPreviewModalProps) {
  if (!data) return null;

  const [title, setTitle] = useState(data.proposed.title);
  const [description, setDescription] = useState(data.proposed.description);
  const [seoTitle, setSeoTitle] = useState(data.proposed.seoTitle);
  const [seoDescription, setSeoDescription] = useState(data.proposed.seoDescription);

  const handleApply = () => {
    onApply({
      title,
      description,
      seoTitle,
      seoDescription,
      imageAlts: data.proposed.imageAlts,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Review & Approve AI SEO Changes: ${data.resourceTitle}`}
      primaryAction={{
        content: "Approve & Publish to Shopify",
        onAction: handleApply,
        loading,
      }}
      secondaryActions={[
        {
          content: "Discard Changes",
          onAction: onClose,
          disabled: loading,
        },
      ]}
      size="large"
    >
      <Modal.Section>
        <BlockStack gap="400">
          {data.proposed.rationale && (
            <Banner tone="info">
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text as="strong" variant="headingSm">
                    AI Strategy & Expected Benefit
                  </Text>
                  <Badge tone="success">
                    {`${data.proposed.rationale.confidenceScore}% Confidence`}
                  </Badge>
                </InlineStack>
                <Text as="p" variant="bodySm">
                  <strong>Issue Addressed:</strong> {data.proposed.rationale.issueAddressed}
                </Text>
                <Text as="p" variant="bodySm">
                  <strong>Expected Impact:</strong> {data.proposed.rationale.expectedBenefit}
                </Text>
              </BlockStack>
            </Banner>
          )}

          {/* Section: Product Title */}
          <Box padding="300" background="bg-surface-secondary" borderRadius="200">
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm">
                Product Title Comparison
              </Text>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <Box padding="200" background="bg-surface" borderRadius="150" borderWidth="025" borderColor="border">
                  <Text as="p" tone="subdued" variant="bodySm">
                    Current Live Title ({data.original.title.length} chars):
                  </Text>
                  <Text as="p" variant="bodyMd">
                    {data.original.title}
                  </Text>
                </Box>
                <TextField
                  label={`AI Optimized Title (${title.length} chars - recommended 30-60):`}
                  value={title}
                  onChange={setTitle}
                  autoComplete="off"
                />
              </div>
            </BlockStack>
          </Box>

          <Divider />

          {/* Section: SEO Meta Title */}
          <Box padding="300" background="bg-surface-secondary" borderRadius="200">
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm">
                Google SERP Meta Title
              </Text>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <Box padding="200" background="bg-surface" borderRadius="150" borderWidth="025" borderColor="border">
                  <Text as="p" tone="subdued" variant="bodySm">
                    Current Meta Title:
                  </Text>
                  <Text as="p" variant="bodyMd">
                    {data.original.seoTitle || "None (Using regular product title)"}
                  </Text>
                </Box>
                <TextField
                  label={`Proposed Meta Title (${seoTitle.length} chars - limit 60):`}
                  value={seoTitle}
                  onChange={setSeoTitle}
                  autoComplete="off"
                />
              </div>
            </BlockStack>
          </Box>

          <Divider />

          {/* Section: SEO Meta Description */}
          <Box padding="300" background="bg-surface-secondary" borderRadius="200">
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm">
                Google Search Snippet (Meta Description)
              </Text>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <Box padding="200" background="bg-surface" borderRadius="150" borderWidth="025" borderColor="border">
                  <Text as="p" tone="subdued" variant="bodySm">
                    Current Meta Description ({data.original.seoDescription?.length || 0} chars):
                  </Text>
                  <Text as="p" variant="bodyMd">
                    {data.original.seoDescription || "Empty (Google will guess from page text)"}
                  </Text>
                </Box>
                <TextField
                  label={`Proposed Meta Description (${seoDescription.length} chars - optimal 120-155):`}
                  value={seoDescription}
                  onChange={setSeoDescription}
                  multiline={3}
                  autoComplete="off"
                />
              </div>
            </BlockStack>
          </Box>

          <Divider />

          {/* Section: Product Description */}
          <Box padding="300" background="bg-surface-secondary" borderRadius="200">
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm">
                Product Description Body Copy
              </Text>
              <TextField
                label="Proposed HTML Body Copy (Conversion-focused, fact-preserved):"
                value={description}
                onChange={setDescription}
                multiline={6}
                autoComplete="off"
              />
            </BlockStack>
          </Box>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
