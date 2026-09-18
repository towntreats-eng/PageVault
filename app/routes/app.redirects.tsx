import { useState } from "react";
import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation, useSubmit, useRouteError } from "@remix-run/react";
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
  IndexTable,
  TextField,
  Divider,
  Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { RedirectsService, type ShopifyRedirectNode } from "../services/redirects.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  try {
    const redirects = await RedirectsService.getRedirects(admin);

    return json({
      redirects,
      error: null,
    });
  } catch (error: any) {
    if (error instanceof Response) throw error;
    console.error("[Redirects Loader Error]", error);
    return json({
      redirects: [],
      error: error.message || "Failed to load store redirects",
    });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "create_redirect") {
    const fromPath = formData.get("fromPath") as string;
    const toTarget = formData.get("toTarget") as string;

    if (!fromPath || !toTarget) {
      return json({ success: false, error: "Both source path and destination target are required." }, { status: 400 });
    }

    try {
      await RedirectsService.createRedirect(admin, fromPath, toTarget);
      return json({
        success: true,
        message: `301 Redirect created successfully: ${fromPath} → ${toTarget}`,
      });
    } catch (err: any) {
      return json({ success: false, error: err.message || "Failed to create 301 redirect" }, { status: 500 });
    }
  }

  if (actionType === "delete_redirect") {
    const redirectId = formData.get("redirectId") as string;
    if (!redirectId) return json({ success: false, error: "Missing redirect ID" }, { status: 400 });

    try {
      await RedirectsService.deleteRedirect(admin, redirectId);
      return json({
        success: true,
        message: "Redirect deleted successfully.",
      });
    } catch (err: any) {
      return json({ success: false, error: err.message || "Failed to delete redirect" }, { status: 500 });
    }
  }

  return json({ success: false, error: "Unknown action" });
};

export default function RedirectsRoute() {
  const { redirects, error } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();

  const [fromPath, setFromPath] = useState("");
  const [toTarget, setToTarget] = useState("");

  const isCreating =
    navigation.state === "submitting" && navigation.formData?.get("actionType") === "create_redirect";

  const handleCreate = () => {
    if (!fromPath.trim() || !toTarget.trim()) return;
    submit(
      {
        actionType: "create_redirect",
        fromPath,
        toTarget,
      },
      { method: "post" }
    );
    setFromPath("");
    setToTarget("");
  };

  const handleDelete = (id: string) => {
    submit(
      {
        actionType: "delete_redirect",
        redirectId: id,
      },
      { method: "post" }
    );
  };

  return (
    <Page
      title="Shopify Native 301 URL Redirects & 404 Shield"
      subtitle="Safeguard Google organic rankings, retain backlink equity, and fix broken links directly via Shopify GraphQL API"
    >
      <BlockStack gap="500">
        {error && (
          <Banner title="Notice" tone="warning">
            <p>{error}</p>
          </Banner>
        )}

        {actionData?.message && (
          <Banner title="Success" tone="success">
            <p>{actionData.message}</p>
          </Banner>
        )}

        {actionData?.error && (
          <Banner title="Redirect Error" tone="critical">
            <p>{actionData.error}</p>
          </Banner>
        )}

        <Banner title="SEO Link Equity Protection" tone="info">
          <p>
            When product titles or handles change, old indexed URLs can trigger 404 Not Found errors. 301 Permanent Redirects instruct Googlebot and search engines to transfer 95-99% of historical ranking authority directly to your new product page.
          </p>
        </Banner>

        {/* Quick Creator Card */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              ⚡ Create New Shopify 301 Redirect
            </Text>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "12px", alignItems: "end" }}>
              <TextField
                label="Old Broken Path (From)"
                value={fromPath}
                onChange={setFromPath}
                placeholder="/products/old-handle-name"
                autoComplete="off"
                helpText="Relative path starting with /"
              />
              <TextField
                label="New Active Destination (To)"
                value={toTarget}
                onChange={setToTarget}
                placeholder="/products/new-optimized-product"
                autoComplete="off"
                helpText="Can be internal path or full URL"
              />
              <div style={{ paddingBottom: "4px" }}>
                <Button variant="primary" loading={isCreating} onClick={handleCreate}>
                  Create 301 Redirect
                </Button>
              </div>
            </div>
          </BlockStack>
        </Card>

        {/* Active Redirects Table */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <div>
                <Text as="h2" variant="headingMd">
                  Active Store 301 Redirects ({redirects.length})
                </Text>
                <Text as="p" tone="subdued">
                  Managed natively within your Shopify Online Store Navigation settings.
                </Text>
              </div>
              <Badge tone="success">NATIVE SHOPIFY API</Badge>
            </InlineStack>

            {redirects.length > 0 ? (
              <IndexTable
                resourceName={{ singular: "redirect", plural: "redirects" }}
                itemCount={redirects.length}
                headings={[
                  { title: "Old Source Path (From)" },
                  { title: "Target Destination (To)" },
                  { title: "HTTP Status" },
                  { title: "Action" },
                ]}
                selectable={false}
              >
                {redirects.map((r, index) => (
                  <IndexTable.Row id={r.id} key={r.id} position={index}>
                    <IndexTable.Cell>
                      <Text as="span" fontWeight="bold" fontFamily="monospace">
                        {r.path}
                      </Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Text as="span" fontFamily="monospace" tone="subdued">
                        {r.target}
                      </Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Badge tone="success">301 PERMANENT</Badge>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Button size="slim" tone="critical" onClick={() => handleDelete(r.id)}>
                        Remove
                      </Button>
                    </IndexTable.Cell>
                  </IndexTable.Row>
                ))}
              </IndexTable>
            ) : (
              <Box padding="400">
                <Text as="p" tone="subdued" alignment="center">
                  No 301 URL redirects found on this store. Create one above to safely redirect legacy or renamed product URLs.
                </Text>
              </Box>
            )}
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  console.error("[Redirects Route ErrorBoundary]", error);

  return (
    <Page title="Shopify 301 Redirects Manager">
      <Banner
        title="Redirects Manager Error"
        tone="critical"
        action={{
          content: "Reload",
          onAction: () => window.location.reload(),
        }}
      >
        <p>An unexpected error occurred while loading store redirects.</p>
        {(error as any)?.message && (
          <p style={{ marginTop: "8px", fontFamily: "monospace", color: "#c53030" }}>
            {(error as any).message}
          </p>
        )}
      </Banner>
    </Page>
  );
}
