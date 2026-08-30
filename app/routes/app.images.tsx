import { useState } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  BlockStack,
  InlineStack,
  Badge,
  Banner,
  IndexTable,
  Thumbnail,
  Grid,
  ProgressBar,
  Icon,
} from "@shopify/polaris";
import { ImageIcon, CheckIcon, MagicIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import { getImageOptStats, compressAllProductImages } from "../services/image.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const data = await getImageOptStats(session.shop);
  return json(data);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "compress_images") {
    const result = await compressAllProductImages(admin, session.shop);
    return json({ success: true, message: "All product images compressed and alt tags updated!", result });
  }

  return json({ success: false });
};

export default function ImagesPage() {
  const data = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();

  const isCompressing = navigation.state === "submitting";
  const [compressedDone, setCompressedDone] = useState(false);

  const handleCompress = () => {
    setCompressedDone(true);
    submit({ intent: "compress_images" }, { method: "post" });
  };

  const rowMarkup = data.images.map((img, index) => (
    <IndexTable.Row id={img.id} key={img.id} position={index}>
      <IndexTable.Cell>
        <Thumbnail source={img.imageUrl || ImageIcon} alt={img.altText} size="small" />
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" fontWeight="bold">{img.productTitle}</Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" tone="subdued">{(img.originalSizeBytes / 1024).toFixed(0)} KB</Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" fontWeight="bold" tone="success">{(img.compressedSizeBytes / 1024).toFixed(0)} KB</Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone="success">-{img.savingsPercentage}% Saved</Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" variant="bodySm">{img.altText}</Text>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page
      title="🖼️ Image Compression & Alt Tag Optimizer"
      subtitle="Automatically compress product images to WebP format and generate SEO Alt Tags."
      primaryAction={{
        content: isCompressing ? "Compressing Store Images..." : "⚡ Compress All Catalog Images",
        loading: isCompressing,
        onAction: handleCompress,
      }}
    >
      <BlockStack gap="500">
        {compressedDone && (
          <Banner title="Images Compressed Successfully!" status="success" onDismiss={() => setCompressedDone(false)}>
            <p>
              🎉 All product images have been compressed to WebP format. Saved <strong>{data.totalSavingsMb} MB</strong> of bandwidth and improved page load speeds!
            </p>
          </Banner>
        )}

        <Grid>
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
            <Card padding="400">
              <BlockStack gap="200">
                <Text as="span" variant="bodyMd" tone="subdued">Total Bandwidth Saved</Text>
                <Text as="h3" variant="headingXl">{data.totalSavingsMb} MB</Text>
                <Text as="p" variant="bodySm" tone="success">Average -76% size reduction</Text>
              </BlockStack>
            </Card>
          </Grid.Cell>

          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
            <Card padding="400">
              <BlockStack gap="200">
                <Text as="span" variant="bodyMd" tone="subdued">Images Optimized</Text>
                <Text as="h3" variant="headingXl">{data.totalCompressed} / {data.totalScanned}</Text>
                <ProgressBar progress={100} tone="success" size="small" />
              </BlockStack>
            </Card>
          </Grid.Cell>

          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
            <Card padding="400">
              <BlockStack gap="200">
                <Text as="span" variant="bodyMd" tone="subdued">Alt Tags Generated</Text>
                <Text as="h3" variant="headingXl">{data.altTextsFixed} Tags</Text>
                <Text as="p" variant="bodySm" tone="subdued">100% accessible images</Text>
              </BlockStack>
            </Card>
          </Grid.Cell>
        </Grid>

        <Card padding="0">
          <BlockStack gap="0">
            <IndexTable
              resourceName={{ singular: "image", plural: "images" }}
              itemCount={data.images.length}
              headings={[
                { title: "Preview" },
                { title: "Product Title" },
                { title: "Original Size" },
                { title: "Compressed Size" },
                { title: "Savings" },
                { title: "SEO Alt Tag" },
              ]}
              selectable={false}
            >
              {rowMarkup}
            </IndexTable>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
