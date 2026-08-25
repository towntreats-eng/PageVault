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
  TextField,
  Button,
  Banner,
  DataTable,
  Box,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { seedPincodeDataset } from "../services/pincode.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  // Ensure DB dataset seeded
  await seedPincodeDataset();

  const rules = await db.pincodeRule.findMany({
    take: 20,
    orderBy: { created_at: "desc" },
  });

  const shopRecord = await db.shop.findUnique({ where: { domain: shopDomain } });

  return {
    shopDomain,
    rules,
    totalRules: await db.pincodeRule.count(),
    currency: shopRecord?.currency || "INR",
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);
  const formData = await request.formData();

  const pincode = String(formData.get("pincode") || "").trim();
  const courier = String(formData.get("courier") || "Express Air").trim();
  const etaDays = Number(formData.get("etaDays") || 3);
  const codAvailable = formData.get("codAvailable") === "true";

  if (!/^\d{6}$/.test(pincode)) {
    return json({ error: "Please enter a valid 6-digit Indian PIN code." }, { status: 400 });
  }

  await db.pincodeRule.upsert({
    where: {
      courier_pincode: { courier, pincode },
    },
    update: {
      cod_available: codAvailable,
      eta_days: etaDays,
    },
    create: {
      pincode,
      courier,
      cod_available: codAvailable,
      prepaid_available: true,
      eta_days: etaDays,
    },
  });

  return json({ success: true, message: `Pincode ${pincode} rule updated successfully!` });
};

export default function ShopForgeIndia() {
  const { rules, totalRules } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();

  const [pincodeInput, setPincodeInput] = useState("");
  const [courierInput, setCourierInput] = useState("BlueDart Air");
  const [etaInput, setEtaInput] = useState("2");
  const [whatsappInput, setWhatsappInput] = useState("+91 98765 43210");

  const handleAddRule = () => {
    const form = new FormData();
    form.append("pincode", pincodeInput);
    form.append("courier", courierInput);
    form.append("etaDays", etaInput);
    form.append("codAvailable", "true");
    submit(form, { method: "post" });
  };

  const rows = rules.map((r) => [
    r.pincode,
    r.courier,
    r.cod_available ? "✓ Available" : "✗ Prepaid Only",
    `~${r.eta_days} Days`,
  ]);

  return (
    <Page title="Shop Forge — India Essentials Pack">
      <TitleBar title="India Essentials | Shop Forge" />
      <BlockStack gap="500">
        {actionData?.error && (
          <Banner title="Input Error" tone="critical">
            <p>{actionData.error}</p>
          </Banner>
        )}

        {actionData?.message && (
          <Banner title="Rule Saved" tone="success">
            <p>{actionData.message}</p>
          </Banner>
        )}

        <Layout>
          {/* Add / Override Custom Pincode Rule */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    Add / Override Courier Pincode Serviceability
                  </Text>
                  <Badge tone="info">{totalRules} PINCODES IN DATABASE</Badge>
                </InlineStack>

                <FormLayoutGrid>
                  <TextField
                    label="Indian PIN Code"
                    value={pincodeInput}
                    onChange={(val) => setPincodeInput(val)}
                    placeholder="e.g. 110001"
                    maxLength={6}
                    autoComplete="off"
                  />
                  <TextField
                    label="Courier Partner Name"
                    value={courierInput}
                    onChange={(val) => setCourierInput(val)}
                    placeholder="e.g. BlueDart Air, Delhivery"
                    autoComplete="off"
                  />
                  <TextField
                    label="Est. Delivery Days (ETA)"
                    type="number"
                    value={etaInput}
                    onChange={(val) => setEtaInput(val)}
                    placeholder="2"
                    autoComplete="off"
                  />
                </FormLayoutGrid>

                <Button variant="primary" onClick={handleAddRule}>
                  Save Pincode Serviceability Rule
                </Button>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* WhatsApp CTA & GST Configuration */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  WhatsApp CTA & GST Notes Setup
                </Text>
                <TextField
                  label="WhatsApp Business Phone Number (with Country Code)"
                  value={whatsappInput}
                  onChange={(val) => setWhatsappInput(val)}
                  helpText="Enables instant 1-click WhatsApp order inquiries on your storefront."
                  autoComplete="off"
                />
                <InlineStack gap="300">
                  <Badge tone="success">Bilingual Copy Supported (EN / HI)</Badge>
                  <Badge tone="success">UPI Trustmarks Enabled</Badge>
                  <Badge tone="success">GST Invoice Notes Enabled</Badge>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Pincode Rules Dataset Table */}
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Maintained Courier Dataset Preview
                </Text>
                <DataTable
                  columnContentTypes={["text", "text", "text", "text"]}
                  headings={["PIN Code", "Courier Partner", "COD Status", "Estimated ETA"]}
                  rows={rows}
                />
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

function FormLayoutGrid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>{children}</div>;
}
