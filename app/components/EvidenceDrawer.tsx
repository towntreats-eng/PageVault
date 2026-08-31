import { Modal, BlockStack, InlineStack, Text, Badge, Box, Link as PolarisLink, Divider } from "@shopify/polaris";
import { reasonCopy, statusFromVerification, statusTone } from "./status";

export interface EvidenceRecord {
  id: string;
  fetched_url: string;
  result: string;
  reason_code: string | null;
  observed_value: string | null;
  attempted_at: string;
  expectedValue?: string | null;
  htmlSnippet?: string | null;
}

/**
 * The signature component. Every number in this app must reach this drawer in
 * two clicks: the live URL we fetched, when we fetched it, and what we actually
 * saw in the HTML. See 12-UI-UX-SPEC.md §5.1.
 */
export function EvidenceDrawer({
  open,
  onClose,
  record,
  title = "Evidence",
}: {
  open: boolean;
  onClose: () => void;
  record: EvidenceRecord | null;
  title?: string;
}) {
  if (!record) return null;

  const status = statusFromVerification(record.result, true);
  const reason = reasonCopy(record.reason_code);

  return (
    <Modal open={open} onClose={onClose} title={title} secondaryActions={[{ content: "Close", onAction: onClose }]}>
      <Modal.Section>
        <BlockStack gap="400">
          <InlineStack gap="200" align="space-between">
            <Badge tone={statusTone(status)}>{status}</Badge>
            <Text as="span" tone="subdued" variant="bodySm">
              {`Checked ${new Date(record.attempted_at).toLocaleString()}`}
            </Text>
          </InlineStack>

          <BlockStack gap="100">
            <Text as="p" variant="bodySm" tone="subdued">Page we fetched</Text>
            <PolarisLink url={record.fetched_url} target="_blank">{record.fetched_url}</PolarisLink>
          </BlockStack>

          <Divider />

          {record.expectedValue && (
            <BlockStack gap="100">
              <Text as="p" variant="bodySm" tone="subdued">What we saved</Text>
              <Box background="bg-surface-secondary" padding="300" borderRadius="200">
                <Text as="p" fontWeight="medium">{record.expectedValue}</Text>
              </Box>
            </BlockStack>
          )}

          <BlockStack gap="100">
            <Text as="p" variant="bodySm" tone="subdued">What is on your live page</Text>
            <Box background="bg-surface-secondary" padding="300" borderRadius="200">
              <Text as="p" fontWeight="medium">
                {record.observed_value ?? "— nothing found —"}
              </Text>
            </Box>
          </BlockStack>

          {record.htmlSnippet && (
            <BlockStack gap="100">
              <Text as="p" variant="bodySm" tone="subdued">Raw HTML we read</Text>
              <Box background="bg-surface-secondary" padding="300" borderRadius="200" overflowX="scroll">
                <pre style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                  {record.htmlSnippet}
                </pre>
              </Box>
            </BlockStack>
          )}

          {reason && (
            <BlockStack gap="100">
              <Text as="p" variant="bodySm" tone="subdued">Why</Text>
              <Text as="p">{reason.headline}</Text>
              {reason.action && reason.actionUrl && (
                <PolarisLink url={reason.actionUrl} target="_blank">{reason.action}</PolarisLink>
              )}
            </BlockStack>
          )}
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
