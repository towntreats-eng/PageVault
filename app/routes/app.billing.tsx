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
  Grid,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { getSubscriptionStatus, createSubscription } from "../services/billing.server";
import { PLAN_CONFIGS } from "../models/plans";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const subscription = await getSubscriptionStatus(session.shop);

  return json({ subscription, shopDomain: session.shop });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const planTier = (formData.get("planTier") as "starter_19" | "growth_49" | "pro_129") || "growth_49";

  const appUrl = process.env.SHOPIFY_APP_URL || "https://pagevault-production.up.railway.app";
  const returnUrl = `${appUrl}/app/billing/callback?shop=${session.shop}`;

  try {
    const { confirmationUrl } = await createSubscription(admin, returnUrl, session.shop, planTier);
    if (confirmationUrl) {
      return redirect(confirmationUrl);
    }
  } catch (err: any) {
    return json({ error: err.message || "Failed to initiate subscription." });
  }

  return json({ success: true, message: `Activated plan tier: ${planTier}` });
};

export default function BillingPage() {
  const { subscription } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();

  const handleSelectPlan = (planTier: string) => {
    if (planTier === "free") return;
    submit({ planTier }, { method: "post" });
  };

  const plansList = Object.values(PLAN_CONFIGS);

  return (
    <Page
      title="💳 Transparent Pricing & Subscription Plans"
      subtitle="Gate by scale and markets. The Proof Engine & core metadata tools are available on every plan."
    >
      <BlockStack gap="500">
        {actionData && "error" in actionData && actionData.error && (
          <Banner title="Billing Error" tone="critical">
            <p>{String(actionData.error)}</p>
          </Banner>
        )}

        {actionData && "message" in actionData && actionData.message && (
          <Banner title="Plan Activated" tone="success">
            <p>{actionData.message}</p>
          </Banner>
        )}

        <Grid>
          {plansList.map((plan) => {
            const isCurrent = subscription.planTier === plan.tier;
            const isFeatured = plan.tier === "growth_49";

            return (
              <Grid.Cell key={plan.tier} columnSpan={{ xs: 6, sm: 6, md: 3, lg: 3, xl: 3 }}>
                <Card padding="500">
                  <BlockStack gap="400">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h2" variant="headingMd" fontWeight="bold">
                        {plan.name}
                      </Text>
                      {isFeatured && <Badge tone="attention">MOST POPULAR</Badge>}
                      {isCurrent && <Badge tone="success">ACTIVE</Badge>}
                    </InlineStack>

                    <InlineStack gap="100" blockAlign="baseline">
                      <Text as="span" variant="heading2xl" fontWeight="bold">
                        ${plan.priceUSD}
                      </Text>
                      <Text as="span" variant="bodyMd" tone="subdued">
                        / mo
                      </Text>
                    </InlineStack>

                    {plan.trialDays > 0 ? (
                      <Badge tone="info">{`${plan.trialDays}-Day Free Trial`}</Badge>
                    ) : (
                      <Badge>Free Forever</Badge>
                    )}

                    <Divider />

                    <BlockStack gap="200">
                      <List type="bullet">
                        {plan.features.map((feat, idx) => (
                          <List.Item key={idx}>
                            <Text as="span" variant="bodySm">
                              {feat}
                            </Text>
                          </List.Item>
                        ))}
                      </List>
                    </BlockStack>

                    <Box paddingBlockStart="400">
                      <Button
                        variant={isFeatured ? "primary" : "secondary"}
                        fullWidth
                        disabled={isCurrent || plan.tier === "free"}
                        onClick={() => handleSelectPlan(plan.tier)}
                      >
                        {isCurrent
                          ? "Current Plan"
                          : plan.tier === "free"
                          ? "Free Plan"
                          : `Choose ${plan.name}`}
                      </Button>
                    </Box>
                  </BlockStack>
                </Card>
              </Grid.Cell>
            );
          })}
        </Grid>
      </BlockStack>
    </Page>
  );
}
