import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useSubmit, useActionData } from "@remix-run/react";
import {
  Page,
  Card,
  Text,
  Badge,
  BlockStack,
  InlineStack,
  Button,
  Banner,
  List,
  Box,
  Divider,
} from "@shopify/polaris";
import { CheckIcon, StarIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import { getSubscriptionStatus, createProSubscription } from "../services/billing.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const subscription = await getSubscriptionStatus(session.shop);

  return json({ subscription, shopDomain: session.shop });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const appUrl = process.env.SHOPIFY_APP_URL || "https://pagevault-production.up.railway.app";
  const returnUrl = `${appUrl}/app/billing/callback?shop=${session.shop}`;

  try {
    const { confirmationUrl } = await createProSubscription(admin, returnUrl, session.shop);
    if (confirmationUrl) {
      return redirect(confirmationUrl);
    }
  } catch (err: any) {
    return json({ error: err.message || "Failed to initiate subscription." });
  }

  return json({ success: true, message: "Subscribed to $29/mo Unlimited SEO Pro Plan!" });
};

export default function BillingPage() {
  const { subscription } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();

  const handleSubscribe = () => {
    submit({}, { method: "post" });
  };

  return (
    <Page
      title="💳 Pro Subscription & Pricing Plan"
      subtitle="Simple, transparent pricing for complete store SEO & image optimization."
    >
      <BlockStack gap="500">
        {actionData?.error && (
          <Banner title="Billing Error" status="critical">
            <p>{actionData.error}</p>
          </Banner>
        )}

        {actionData?.message && (
          <Banner title="Plan Activated" status="success">
            <p>{actionData.message}</p>
          </Banner>
        )}

        <Box padding="600" background="bg-surface-secondary" borderRadius="300">
          <BlockStack gap="400" align="center">
            <Badge tone="attention" size="large">⭐ ALL-IN-ONE AUTOMATED PLAN</Badge>
            <Text as="h1" variant="heading2Xl" alignment="center">
              Unlimited Auto SEO & Image Compression
            </Text>
            <Text as="p" variant="bodyLg" tone="subdued" alignment="center">
              Everything your Shopify store needs to rank higher on Google and load blazingly fast.
            </Text>

            <InlineStack gap="100" align="center" blockAlign="baseline">
              <Text as="span" variant="heading3Xl" fontWeight="bold">$29</Text>
              <Text as="span" variant="headingLg" tone="subdued">/ month</Text>
            </InlineStack>
            <Badge tone="success">7-DAY FREE TRIAL INCLUDED</Badge>

            <Button
              variant="primary"
              size="large"
              onClick={handleSubscribe}
            >
              {subscription.isActive ? "Active Subscription ($29/mo)" : "Start 7-Day Free Trial ($29/mo)"}
            </Button>
          </BlockStack>
        </Box>

        <Card padding="500">
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">What's Included in the $29/month Pro Plan:</Text>
            <Divider />
            <List type="bullet">
              <List.Item>
                <Text as="span" fontWeight="bold">Unlimited Smart WebP Image Compression:</Text> Compress all product, collection & blog images automatically (saving 60-80% bandwidth).
              </List.Item>
              <List.Item>
                <Text as="span" fontWeight="bold">Automatic Image ALT Text Generator:</Text> Auto-fix missing ALT tags for 100% Google Image search indexability.
              </List.Item>
              <List.Item>
                <Text as="span" fontWeight="bold">Auto Product & Collection Meta Titles/Descriptions:</Text> Define high-CTR templates to eliminate missing meta tags.
              </List.Item>
              <List.Item>
                <Text as="span" fontWeight="bold">Google JSON-LD Rich Snippet Schema Injection:</Text> Enable Product ratings, price badges, and sitelinks searchbox.
              </List.Item>
              <List.Item>
                <Text as="span" fontWeight="bold">404 Broken Link Scanner & Auto Redirects:</Text> Prevent lost traffic with instant redirect rules.
              </List.Item>
              <List.Item>
                <Text as="span" fontWeight="bold">24/7 Priority Support & Daily Auto Scans:</Text> Continuous background monitoring for your store.
              </List.Item>
            </List>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
