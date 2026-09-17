import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  Badge,
  Button,
  InlineStack,
  BlockStack,
  Banner,
  ProgressBar,
  Divider,
  Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { BillingService } from "../services/billing.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const shopDomain = session.shop;

    const billingInfo = await BillingService.getShopUsage(shopDomain);

    return json({
      shopDomain,
      ...billingInfo,
      error: null,
    });
  } catch (error: any) {
    console.error("[Plans Loader Error]", error);
    return json({
      shopDomain: "",
      currentPlan: {
        id: "free",
        name: "Free Trial",
        price: 0,
        monthlyCredits: 5,
        badgeTone: "info" as const,
        description: "",
        features: [],
      },
      allPlans: [],
      usageCount: 0,
      remainingCredits: 5,
      usagePercent: 0,
      isQuotaExceeded: false,
      error: error.message || "Failed to load billing status",
    });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;
  const formData = await request.formData();
  const targetPlan = formData.get("planId") as string;

  try {
    await BillingService.updatePlan(shopDomain, targetPlan);
    return json({
      success: true,
      message: `Plan updated to ${targetPlan.toUpperCase()} successfully!`,
    });
  } catch (err: any) {
    return json({ success: false, error: err.message || "Failed to update plan" }, { status: 500 });
  }
};

export default function PlansRoute() {
  const { currentPlan, allPlans, usageCount, remainingCredits, usagePercent, isQuotaExceeded, error } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();

  const isSwitching = navigation.state === "submitting";

  const handleSelectPlan = (planId: string) => {
    submit({ planId }, { method: "post" });
  };

  return (
    <Page
      title="SaaS Plans & AI Quota Management"
      subtitle="Transparent usage tracking, scalable tiers, and cost guards with zero surprise charges"
    >
      <BlockStack gap="500">
        {error && (
          <Banner title="Notice" tone="warning">
            <p>{error}</p>
          </Banner>
        )}

        {actionData?.message && (
          <Banner title="Billing Updated" tone="success">
            <p>{actionData.message}</p>
          </Banner>
        )}

        {isQuotaExceeded && (
          <Banner title="Monthly AI Generation Quota Reached" tone="critical">
            <p>
              You have consumed all {currentPlan.monthlyCredits} AI optimizations included in your {currentPlan.name} plan for this calendar month. Upgrade below to immediately unlock additional generation capacity.
            </p>
          </Banner>
        )}

        {/* Current Plan & Usage Gauge */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <div>
                <Text as="h2" variant="headingMd">
                  Current Active Plan: {currentPlan.name}
                </Text>
                <Text as="p" tone="subdued">
                  Renews automatically every calendar month with fresh credits.
                </Text>
              </div>
              <Badge tone={currentPlan.badgeTone}>{currentPlan.name.toUpperCase()}</Badge>
            </InlineStack>

            <Divider />

            <BlockStack gap="200">
              <InlineStack align="space-between">
                <Text as="span" variant="bodySm">
                  Monthly Credits Consumed: <strong>{usageCount}</strong> /{" "}
                  {currentPlan.monthlyCredits >= 9999 ? "Unlimited" : currentPlan.monthlyCredits}
                </Text>
                <Text as="span" variant="bodySm" tone={usagePercent > 80 ? "critical" : "subdued"}>
                  {remainingCredits >= 9999 ? "Unlimited Available" : `${remainingCredits} credits remaining`}
                </Text>
              </InlineStack>
              <ProgressBar progress={usagePercent} size="small" tone={usagePercent > 85 ? "critical" : "primary"} />
            </BlockStack>
          </BlockStack>
        </Card>

        {/* Pricing Matrix */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
          {allPlans.map((plan) => {
            const isCurrent = currentPlan.id === plan.id;
            return (
              <div
                key={plan.id}
                style={{
                  border: isCurrent
                    ? "2px solid #008060"
                    : plan.popular
                    ? "2px solid #637381"
                    : "1px solid #dfe3e8",
                  borderRadius: "10px",
                  padding: "20px",
                  backgroundColor: isCurrent ? "#f4fdf8" : "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: plan.popular ? "0 4px 12px rgba(0,0,0,0.06)" : "none",
                }}
              >
                <BlockStack gap="300">
                  <InlineStack align="space-between">
                    <Text as="h3" variant="headingSm" fontWeight="bold">
                      {plan.name}
                    </Text>
                    {plan.popular && <Badge tone="info">MOST POPULAR</Badge>}
                    {isCurrent && <Badge tone="success">CURRENT PLAN</Badge>}
                  </InlineStack>

                  <div>
                    <Text as="span" variant="heading2xl" fontWeight="bold">
                      ${plan.price}
                    </Text>
                    <Text as="span" tone="subdued">
                      {" "}/ month
                    </Text>
                  </div>

                  <Text as="p" variant="bodySm" tone="subdued">
                    {plan.description}
                  </Text>

                  <Divider />

                  <BlockStack gap="150">
                    <Text as="p" variant="bodyXs" fontWeight="bold">
                      Included Capabilities:
                    </Text>
                    {plan.features.map((feat, idx) => (
                      <Text key={idx} as="p" variant="bodyXs" tone="subdued">
                        ✓ {feat}
                      </Text>
                    ))}
                  </BlockStack>
                </BlockStack>

                <div style={{ marginTop: "24px" }}>
                  <Button
                    fullWidth
                    variant={isCurrent ? "secondary" : plan.popular ? "primary" : "secondary"}
                    disabled={isCurrent}
                    loading={isSwitching}
                    onClick={() => handleSelectPlan(plan.id)}
                  >
                    {isCurrent ? "Active Plan" : `Select ${plan.name}`}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Cost Control & Safeguards Card */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingSm">
                  🛡️ Strict AI Cost Safeguards & Anti-Waste Technology
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  • <strong>Deduplication Caching</strong>: We hash product snapshots. Running optimization on an unchanged item does not re-query AI models or consume unnecessary tokens.
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  • <strong>Transparent Limits</strong>: Once your monthly allotment is reached, generations pause automatically—zero surprise overage charges on your Shopify merchant statement.
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  • <strong>Full Export & Portability</strong>: All generated titles, descriptions, and meta tags are written directly to your Shopify store database and remain yours forever.
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
