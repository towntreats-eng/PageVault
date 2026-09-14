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
  Button,
  Badge,
  Banner,
  DataTable,
  Divider,
  Box,
  ProgressBar,
  Thumbnail,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

// Server-only imports — only used inside loader/action, automatically tree-shaken by Remix
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { analyzeStoreImages } = await import("../services/images.server");

  try {
    const { session } = await authenticate.admin(request);
    const shopDomain = session.shop;

    const report = await analyzeStoreImages(shopDomain);

    return json({ report, error: null });
  } catch (error: any) {
    console.error("[Images Loader Error]", error);
    return json({
      report: {
        totalImages: 0,
        imagesWithMissingAlt: 0,
        imagesOverSized: 0,
        totalEstimatedSizeKB: 0,
        totalOptimizedSizeKB: 0,
        overallSavingsPercent: 0,
        images: [],
      },
      error: error.message || "Failed to load image data. Run a store scan first.",
    });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { generateImageAlt } = await import("../services/images.server");
  const prisma = (await import("../db.server")).default;

  const { admin, session } = await authenticate.admin(request);
  const shopDomain = session.shop;
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "fix_all_alts") {
    // Get all products with images missing alt text
    const products = await prisma.productRecord.findMany({
      where: { shopDomain },
      select: { shopifyGid: true, title: true, vendor: true, imagesJson: true },
    });

    const updates: Array<{ productGid: string; imageId: string; altText: string }> = [];

    for (const product of products) {
      if (!product.imagesJson) continue;
      let images: Array<{ id: string; url: string; altText: string | null }> = [];
      try {
        images = JSON.parse(product.imagesJson);
      } catch {
        continue;
      }

      images.forEach((img, idx) => {
        if (!img.altText || img.altText.trim().length === 0) {
          updates.push({
            productGid: product.shopifyGid,
            imageId: img.id,
            altText: generateImageAlt(product.title, product.vendor, idx),
          });
        }
      });
    }

    if (updates.length === 0) {
      return json({
        actionType: "fix_all_alts",
        success: true,
        message: "All images already have ALT text! No updates needed.",
      });
    }

    const { bulkUpdateImageAlts } = await import("../services/images.server");
    const result = await bulkUpdateImageAlts(admin, shopDomain, updates);

    return json({
      actionType: "fix_all_alts",
      success: true,
      message: `✅ Updated ${result.updated} image ALT texts for SEO & accessibility.${result.failed > 0 ? ` (${result.failed} failed)` : ""}`,
    });
  }

  if (actionType === "fix_single_alt") {
    const productGid = formData.get("productGid") as string;
    const imageId = formData.get("imageId") as string;
    const productTitle = formData.get("productTitle") as string;
    const imgIdx = parseInt(formData.get("imgIdx") as string) || 0;

    const altText = generateImageAlt(productTitle, null, imgIdx);

    try {
      const mutation = `#graphql
        mutation updateProductImage($productId: ID!, $image: ImageInput!) {
          productImageUpdate(productId: $productId, image: $image) {
            image { id altText }
            userErrors { field message }
          }
        }
      `;

      const resp = await admin.graphql(mutation, {
        variables: {
          productId: productGid,
          image: {
            id: imageId,
            altText: altText,
          },
        },
      });

      const data = await resp.json();
      const errors = data?.data?.productImageUpdate?.userErrors;
      if (errors && errors.length > 0) {
        return json({
          actionType: "fix_single_alt",
          success: false,
          message: `Failed: ${errors.map((e: any) => e.message).join(", ")}`,
        });
      }

      return json({
        actionType: "fix_single_alt",
        success: true,
        message: `✅ Image ALT text updated to "${altText}"`,
      });
    } catch (err: any) {
      return json({
        actionType: "fix_single_alt",
        success: false,
        message: `Error updating image: ${err.message}`,
      });
    }
  }

  return json({ success: false, message: "Unknown action" });
};

export default function ImagesPage() {
  const { report, error } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();

  const [showAll, setShowAll] = useState(false);

  const isFixingAlts =
    navigation.state === "submitting" && navigation.formData?.get("actionType") === "fix_all_alts";

  const handleFixAllAlts = () => {
    submit({ actionType: "fix_all_alts" }, { method: "post" });
  };

  const handleFixSingleAlt = (productGid: string, imageId: string, productTitle: string, imgIdx: number) => {
    submit(
      { actionType: "fix_single_alt", productGid, imageId, productTitle, imgIdx: String(imgIdx) },
      { method: "post" }
    );
  };

  // Build table rows
  const displayImages = showAll ? report.images : report.images.slice(0, 20);

  const tableRows = displayImages.map((img: any, idx: number) => [
    <InlineStack gap="200" blockAlign="center" key={`thumb-${idx}`}>
      <Thumbnail source={img.url} alt={img.altText || "No alt"} size="small" />
      <Text as="span" variant="bodySm" fontWeight="bold">
        {img.productTitle.slice(0, 30)}{img.productTitle.length > 30 ? "..." : ""}
      </Text>
    </InlineStack>,
    img.altText ? (
      <Text as="span" variant="bodySm" tone="success">
        {img.altText.slice(0, 40)}{img.altText.length > 40 ? "..." : ""}
      </Text>
    ) : (
      <Badge tone="critical">MISSING</Badge>
    ),
    `${img.estimatedSizeKB} KB`,
    img.savingsPercent > 0 ? (
      <Badge tone="success">{`-${img.savingsPercent}% (${img.optimizedSizeKB} KB)`}</Badge>
    ) : (
      <Badge tone="info">Optimized</Badge>
    ),
    img.issues.length > 0 ? (
      <Badge tone="critical">{`${img.issues.length} issue${img.issues.length > 1 ? "s" : ""}`}</Badge>
    ) : (
      <Badge tone="success">OK</Badge>
    ),
    !img.altText ? (
      <Button
        size="micro"
        variant="primary"
        onClick={() => handleFixSingleAlt(img.productGid, img.id, img.productTitle, idx)}
      >
        Fix ALT
      </Button>
    ) : (
      <Text as="span" variant="bodySm" tone="subdued">—</Text>
    ),
  ]);

  const totalSavedMB = ((report.totalEstimatedSizeKB - report.totalOptimizedSizeKB) / 1024).toFixed(1);

  return (
    <Page
      title="Image SEO & Compression"
      subtitle="Analyze product images for missing ALT text, oversized files, and format optimization opportunities"
      primaryAction={{
        content: isFixingAlts ? "Fixing All ALTs..." : `⚡ Fix All Missing ALT Text (${report.imagesWithMissingAlt})`,
        onAction: handleFixAllAlts,
        loading: isFixingAlts,
        disabled: report.imagesWithMissingAlt === 0,
      }}
    >
      <BlockStack gap="500">
        {error && (
          <Banner tone="warning">
            <p>{error} Please run a store scan from the Dashboard first.</p>
          </Banner>
        )}

        {actionData?.message && (
          <Banner tone={(actionData as any).success ? "success" : "critical"}>
            <p>{(actionData as any).message}</p>
          </Banner>
        )}

        {/* Summary Stats */}
        <Layout>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="p" tone="subdued" variant="bodySm">
                  Total Product Images
                </Text>
                <Text as="h3" variant="headingXl" fontWeight="bold">
                  {report.totalImages}
                </Text>
                <Badge tone="info">Across all scanned products</Badge>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="p" tone="subdued" variant="bodySm">
                  Missing ALT Text
                </Text>
                <Text as="h3" variant="headingXl" fontWeight="bold">
                  {report.imagesWithMissingAlt}
                </Text>
                <Badge tone={report.imagesWithMissingAlt > 0 ? "critical" : "success"}>
                  {report.imagesWithMissingAlt > 0 ? "SEO penalty risk" : "All good!"}
                </Badge>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="p" tone="subdued" variant="bodySm">
                  Compression Savings
                </Text>
                <Text as="h3" variant="headingXl" fontWeight="bold">
                  {report.overallSavingsPercent}%
                </Text>
                <Badge tone="success">{`~${totalSavedMB} MB saveable`}</Badge>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Oversized Images Alert */}
        {report.imagesOverSized > 0 && (
          <Banner
            title={`${report.imagesOverSized} Oversized Images Detected`}
            tone="warning"
          >
            <p>
              These images are over 300KB and slow down your store's page load speed — hurting
              both Google Core Web Vitals and mobile conversion rates. Use Shopify's CDN with
              WebP format and max 1200px width for instant improvement.
            </p>
          </Banner>
        )}

        {/* Compression Potential Card */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <BlockStack gap="100">
                <Text as="h2" variant="headingMd">
                  Image Optimization Potential
                </Text>
                <Text as="p" tone="subdued">
                  Estimated savings from converting to WebP format with quality optimization
                </Text>
              </BlockStack>
              <Badge tone="success">
                {`${report.overallSavingsPercent}% total savings`}
              </Badge>
            </InlineStack>
            <Divider />
            <InlineStack align="space-between">
              <Text as="span" variant="bodySm">
                Current Total Size: <strong>{(report.totalEstimatedSizeKB / 1024).toFixed(1)} MB</strong>
              </Text>
              <Text as="span" variant="bodySm" tone="success">
                After Optimization: <strong>{(report.totalOptimizedSizeKB / 1024).toFixed(1)} MB</strong>
              </Text>
            </InlineStack>
            <ProgressBar
              progress={100 - report.overallSavingsPercent}
              tone="success"
              size="small"
            />
            <Text as="p" variant="bodyXs" tone="subdued">
              💡 Tip: Shopify's CDN automatically serves WebP to supported browsers. Add
              ?width=1200&format=webp to image URLs in your theme for instant compression.
            </Text>
          </BlockStack>
        </Card>

        {/* Image Analysis Table */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <Text as="h2" variant="headingMd">
                Image-by-Image Analysis ({report.totalImages} total)
              </Text>
              {report.images.length > 20 && (
                <Button variant="plain" onClick={() => setShowAll(!showAll)}>
                  {showAll ? "Show Less" : `Show All ${report.images.length}`}
                </Button>
              )}
            </InlineStack>

            {report.totalImages === 0 ? (
              <Box padding="600">
                <BlockStack gap="300" inlineAlign="center">
                  <Text as="h3" variant="headingMd">
                    No Product Images Found
                  </Text>
                  <Text as="p" tone="subdued">
                    Run a store scan from the Dashboard to import your product catalog and image data.
                  </Text>
                  <Button variant="primary" url="/app">
                    Go to Dashboard & Scan
                  </Button>
                </BlockStack>
              </Box>
            ) : (
              <DataTable
                columnContentTypes={["text", "text", "text", "text", "text", "text"]}
                headings={["Product / Image", "ALT Text", "Size", "Savings", "Issues", "Action"]}
                rows={tableRows}
              />
            )}
          </BlockStack>
        </Card>

        {/* Quick Tips Card */}
        <Card>
          <BlockStack gap="300">
            <Text as="h3" variant="headingSm">
              🚀 Image SEO Best Practices
            </Text>
            <Divider />
            <BlockStack gap="200">
              <Box padding="200" background="bg-surface-secondary" borderRadius="200">
                <Text as="p" variant="bodySm">
                  <strong>1. ALT Text:</strong> Every product image MUST have descriptive ALT text (20-125 chars). Google uses this for image search rankings and it's required for accessibility compliance.
                </Text>
              </Box>
              <Box padding="200" background="bg-surface-secondary" borderRadius="200">
                <Text as="p" variant="bodySm">
                  <strong>2. File Format:</strong> Use WebP over JPEG/PNG. WebP provides 30-50% better compression with equivalent visual quality. Shopify's CDN supports automatic WebP conversion.
                </Text>
              </Box>
              <Box padding="200" background="bg-surface-secondary" borderRadius="200">
                <Text as="p" variant="bodySm">
                  <strong>3. File Size:</strong> Keep product images under 200KB. Oversized images damage Core Web Vitals (LCP) which directly impacts Google search rankings.
                </Text>
              </Box>
              <Box padding="200" background="bg-surface-secondary" borderRadius="200">
                <Text as="p" variant="bodySm">
                  <strong>4. Dimensions:</strong> Max 1200px width for product images. Larger dimensions waste bandwidth without visible quality improvement on any screen.
                </Text>
              </Box>
            </BlockStack>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
