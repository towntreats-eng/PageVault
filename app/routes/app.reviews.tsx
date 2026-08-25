import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Badge,
  BlockStack,
  InlineStack,
  Button,
  Banner,
  DataTable,
  Thumbnail,
  Select,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  const reviews = await db.review.findMany({
    where: { shop_domain: shopDomain },
    orderBy: { created_at: "desc" },
  });

  const pendingCount = await db.review.count({ where: { shop_domain: shopDomain, status: "pending" } });
  const publishedCount = await db.review.count({ where: { shop_domain: shopDomain, status: "published" } });

  return {
    shopDomain,
    reviews,
    pendingCount,
    publishedCount,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;
  const formData = await request.formData();

  const reviewId = String(formData.get("reviewId") || "");
  const newStatus = String(formData.get("newStatus") || ""); // published | rejected

  if (reviewId && ["published", "rejected"].includes(newStatus)) {
    await db.review.updateMany({
      where: { id: reviewId, shop_domain: shopDomain },
      data: { status: newStatus },
    });
    return json({ success: true, message: `Review status updated to ${newStatus}` });
  }

  return json({ error: "Invalid review action" }, { status: 400 });
};

export default function ShopForgeReviews() {
  const { reviews, pendingCount, publishedCount } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();

  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredReviews = reviews.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    return true;
  });

  const handleUpdateStatus = (reviewId: string, newStatus: string) => {
    const form = new FormData();
    form.append("reviewId", reviewId);
    form.append("newStatus", newStatus);
    submit(form, { method: "post" });
  };

  const rows = filteredReviews.map((r) => {
    const photos: string[] = JSON.parse(r.photos || "[]");
    return [
      r.author,
      `★ ${r.rating} / 5`,
      r.body,
      photos.length > 0 ? photos.length + " Photo(s)" : "No Photo",
      r.status.toUpperCase(),
      <InlineStack key={r.id} gap="200">
        {r.status !== "published" && (
          <Button size="micro" variant="primary" onClick={() => handleUpdateStatus(r.id, "published")}>
            Approve
          </Button>
        )}
        {r.status !== "rejected" && (
          <Button size="micro" tone="critical" onClick={() => handleUpdateStatus(r.id, "rejected")}>
            Reject
          </Button>
        )}
      </InlineStack>,
    ];
  });

  return (
    <Page title="Shop Forge — Photo Reviews Moderation">
      <TitleBar title="Reviews | Shop Forge" />
      <BlockStack gap="500">
        {actionData?.message && (
          <Banner title="Review Updated" tone="success">
            <p>{actionData.message}</p>
          </Banner>
        )}

        {/* Stats & Filters */}
        <Card>
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="300">
              <Badge tone="attention">{pendingCount} PENDING MODERATION</Badge>
              <Badge tone="success">{publishedCount} PUBLISHED REVIEWS</Badge>
            </InlineStack>

            <Select
              label=""
              labelHidden
              options={[
                { label: "All Reviews", value: "all" },
                { label: "Pending", value: "pending" },
                { label: "Published", value: "published" },
                { label: "Rejected", value: "rejected" },
              ]}
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
            />
          </InlineStack>
        </Card>

        {/* Reviews Data Table */}
        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              Customer Photo Reviews Queue
            </Text>

            {filteredReviews.length === 0 ? (
              <Box padding="400">
                <Text as="p" variant="bodySm" tone="subdued">
                  No reviews found matching the selected filter.
                </Text>
              </Box>
            ) : (
              <DataTable
                columnContentTypes={["text", "text", "text", "text", "text", "text"]}
                headings={["Customer", "Rating", "Review Text", "Photos", "Status", "Actions"]}
                rows={rows as any}
              />
            )}
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
