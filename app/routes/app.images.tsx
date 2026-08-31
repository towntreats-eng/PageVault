import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useActionData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Banner,
  IndexTable,
  Thumbnail,
  EmptyState,
} from "@shopify/polaris";
import { ImageIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import { getAltTextCoverage, fillMissingAltText } from "../services/image.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const coverage = await getAltTextCoverage(admin, session.shop);
  return json({ coverage, shopDomain: session.shop });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shopName = session.shop.replace(".myshopify.com", "");
  const result = await fillMissingAltText(admin, session.shop, shopName, 50);
  return json({ result });
};

export default function ImageAltTextPage() {
  const { coverage } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const isWriting = navigation.state === "submitting";

  if (!coverage.available) {
    return (
      <Page title="Image alt text">
        <Banner tone="critical" title="We could not read your products">
          <p>{coverage.error || "The Shopify Admin API did not respond."} Nothing has been changed. Try again, and if it keeps failing, contact us.</p>
        </Banner>
      </Page>
    );
  }

  const missingRows = coverage.rows.filter((r) => !(r.altText || "").trim());

  return (
    <Page
      title="Image alt text"
      subtitle="Alt text is what search engines and screen readers read instead of the picture."
      primaryAction={
        missingRows.length > 0
          ? {
              content: isWriting ? "Writing alt text…" : `Fill ${Math.min(missingRows.length, 50)} empty alt texts`,
              loading: isWriting,
              onAction: () => submit({}, { method: "post" }),
            }
          : undefined
      }
    >
      <Layout>
        <Layout.Section>
          <Banner tone="info" title="What this screen does not do">
            <p>
              This app does not compress your images. Shopify serves your media from its own CDN, and shrinking those
              files would mean re-uploading new media into your store — we do not do that. This screen only writes alt text.
            </p>
          </Banner>
        </Layout.Section>

        {actionData?.result && (
          <Layout.Section>
            <Banner tone={actionData.result.failed.length ? "warning" : "success"} title="Alt text applied">
              <p>
                {actionData.result.written} written, {actionData.result.skippedHumanValue} skipped because they already
                had alt text you or your theme wrote, {actionData.result.failed.length} failed.
                Each write is queued for verification against your live page — status shows as “Applied” until we have
                actually seen it there.
              </p>
            </Banner>
          </Layout.Section>
        )}

        {coverage.totalImages > 0 && (
          <Layout.Section>
            <Card>
              <InlineStack gap="800" wrap={false}>
                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" tone="subdued">Product images found</Text>
                  <Text as="p" variant="headingLg">{coverage.totalImages}</Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" tone="subdued">Have alt text</Text>
                  <Text as="p" variant="headingLg">{coverage.withAlt}</Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" tone="subdued">Missing alt text</Text>
                  <Text as="p" variant="headingLg">{coverage.missingAlt}</Text>
                </BlockStack>
                <BlockStack gap="100">
                  <Text as="p" variant="bodySm" tone="subdued">Products scanned</Text>
                  <Text as="p" variant="headingLg">{coverage.productsScanned}</Text>
                </BlockStack>
              </InlineStack>
            </Card>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card padding="0">
            {missingRows.length === 0 ? (
              <EmptyState
                heading="Every product image has alt text"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>We checked {coverage.totalImages} images across {coverage.productsScanned} products.</p>
              </EmptyState>
            ) : (
              <IndexTable
                resourceName={{ singular: "image", plural: "images" }}
                itemCount={missingRows.length}
                selectable={false}
                headings={[{ title: "Image" }, { title: "Product" }, { title: "Alt text" }]}
              >
                {missingRows.slice(0, 100).map((row, index) => (
                  <IndexTable.Row id={row.mediaId} key={row.mediaId} position={index}>
                    <IndexTable.Cell>
                      <Thumbnail source={row.imageUrl || ImageIcon} alt="" size="small" />
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Text as="span">{row.productTitle}</Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Badge tone="warning">Empty</Badge>
                    </IndexTable.Cell>
                  </IndexTable.Row>
                ))}
              </IndexTable>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
