import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useState } from "react";
import {
  Page, Layout, Card, Text, Badge, BlockStack, InlineStack, Banner, Button, Box, Divider,
  Link as PolarisLink,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { getPageDetail } from "../services/pages.server";
import { EvidenceDrawer, type EvidenceRecord } from "../components/EvidenceDrawer";
import { issueCopy, statusFromVerification, statusTone } from "../components/status";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const detail = await getPageDetail(session.shop, params.id!);
  if (!detail) throw new Response("Not found", { status: 404 });
  return json(detail);
};

/** Google truncates by pixel width, not characters. This is a close-enough estimate. */
function pixelWidth(text: string) {
  return Math.round(text.length * 7.6);
}

export default function PageDetail() {
  const { page, live, issues, verifications, changes } = useLoaderData<typeof loader>();
  const [evidence, setEvidence] = useState<EvidenceRecord | null>(null);

  const titleWidth = live.title ? pixelWidth(live.title) : 0;
  const descWidth = live.description ? pixelWidth(live.description) : 0;

  return (
    <Page
      title={page.url.replace(/^https?:\/\/[^/]+/, "")}
      subtitle={`Read live from your storefront just now`}
      backAction={{ content: "Pages", url: "/app/pages" }}
      secondaryActions={[{ content: "Open live page", url: page.url, external: true }]}
    >
      <Layout>
        {!live.reachable && (
          <Layout.Section>
            <Banner tone="critical" title={`We could not load this page (HTTP ${live.statusCode})`}>
              <p>It may be deleted, redirected, or your store is password-protected. Everything below is from the last successful read.</p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">How this looks in Google</Text>
              <Box background="bg-surface-secondary" padding="400" borderRadius="200">
                <BlockStack gap="100">
                  <Text as="p" tone="subdued" variant="bodySm">{page.url}</Text>
                  <Text as="p" variant="headingSm" tone="magic">
                    {live.title ?? "(no title — Google will invent one)"}
                  </Text>
                  <Text as="p" variant="bodySm">
                    {live.description ?? "(no meta description — Google will pick a sentence from the page)"}
                  </Text>
                </BlockStack>
              </Box>
              <InlineStack gap="400">
                <Text as="span" tone={titleWidth > 580 ? "caution" : "subdued"} variant="bodySm">
                  {`Title ≈ ${titleWidth}px${titleWidth > 580 ? " — will be cut off" : ""}`}
                </Text>
                <Text as="span" tone={descWidth > 990 ? "caution" : "subdued"} variant="bodySm">
                  {`Description ≈ ${descWidth}px${descWidth > 990 ? " — will be cut off" : ""}`}
                </Text>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">What is in the HTML right now</Text>
              <Divider />
              <InlineStack gap="800" wrap>
                <BlockStack gap="050">
                  <Text as="p" variant="bodySm" tone="subdued">H1</Text>
                  <Text as="p">{live.h1 ?? "—"}</Text>
                  {live.h1Count > 1 && <Text as="p" tone="caution" variant="bodySm">{`${live.h1Count} H1 tags on this page`}</Text>}
                </BlockStack>
                <BlockStack gap="050">
                  <Text as="p" variant="bodySm" tone="subdued">Canonical</Text>
                  <Text as="p">{live.canonical ?? "—"}</Text>
                </BlockStack>
                <BlockStack gap="050">
                  <Text as="p" variant="bodySm" tone="subdued">Words</Text>
                  <Text as="p">{String(live.wordCount)}</Text>
                </BlockStack>
                <BlockStack gap="050">
                  <Text as="p" variant="bodySm" tone="subdued">Images</Text>
                  <Text as="p">{`${live.imagesTotal - live.imagesMissingAlt} of ${live.imagesTotal} have alt text`}</Text>
                </BlockStack>
                <BlockStack gap="050">
                  <Text as="p" variant="bodySm" tone="subdued">Structured data</Text>
                  <Text as="p">{live.jsonLdTypes.length ? live.jsonLdTypes.join(", ") : "none"}</Text>
                </BlockStack>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {issues.length > 0 && (
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">{`${issues.length} issue${issues.length === 1 ? "" : "s"} on this page`}</Text>
                {issues.map((i) => {
                  const copy = issueCopy(i.code);
                  return (
                    <BlockStack key={i.id} gap="050">
                      <InlineStack gap="200">
                        <Badge tone={i.severity === "critical" ? "critical" : i.severity === "warning" ? "warning" : undefined}>
                          {i.severity}
                        </Badge>
                        <Text as="span" fontWeight="semibold">{copy.label}</Text>
                      </InlineStack>
                      <Text as="span" tone="subdued" variant="bodySm">{i.detail}</Text>
                    </BlockStack>
                  );
                })}
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">What we changed here</Text>
              {changes.length === 0 ? (
                <Text as="p" tone="subdued">We have not written anything to this page.</Text>
              ) : (
                changes.map((c) => {
                  const v = verifications.find((x) => x.id && x.fetched_url === page.url);
                  const status = statusFromVerification(v?.result, true);
                  return (
                    <InlineStack key={c.id} align="space-between" blockAlign="center">
                      <BlockStack gap="050">
                        <Text as="span" fontWeight="semibold">
                          {c.field === "title_tag" ? "Meta title" : c.field === "description_tag" ? "Meta description" : c.field}
                        </Text>
                        <Text as="span" tone="subdued" variant="bodySm">{c.after}</Text>
                      </BlockStack>
                      <InlineStack gap="200">
                        <Badge tone={statusTone(status)}>{status}</Badge>
                        {v && <Button variant="plain" onClick={() => setEvidence({ ...v, expectedValue: c.after })}>Evidence</Button>}
                      </InlineStack>
                    </InlineStack>
                  );
                })
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">Every check we ran on this URL</Text>
              {verifications.length === 0 ? (
                <Text as="p" tone="subdued">No checks yet.</Text>
              ) : (
                verifications.map((v) => {
                  const status = statusFromVerification(v.result, true);
                  return (
                    <InlineStack key={v.id} align="space-between" blockAlign="center">
                      <Text as="span" tone="subdued" variant="bodySm">
                        {new Date(v.attempted_at).toLocaleString()}
                      </Text>
                      <InlineStack gap="200">
                        {v.reason_code && <Text as="span" tone="subdued" variant="bodySm">{v.reason_code}</Text>}
                        <Badge tone={statusTone(status)}>{status}</Badge>
                        <Button variant="plain" onClick={() => setEvidence(v)}>Evidence</Button>
                      </InlineStack>
                    </InlineStack>
                  );
                })
              )}
              <Text as="p" tone="subdued" variant="bodySm">
                <PolarisLink url={page.url} target="_blank">Open the live page</PolarisLink> and use View Source — what you
                see there is what we read.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      <EvidenceDrawer open={Boolean(evidence)} onClose={() => setEvidence(null)} record={evidence} />
    </Page>
  );
}
