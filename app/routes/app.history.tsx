import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation, useSubmit } from "@remix-run/react";
import {
  Page,
  Card,
  IndexTable,
  Text,
  Badge,
  Button,
  Banner,
  BlockStack,
  Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { getVersionHistory, rollbackContentVersion } from "../services/versions.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const history = await getVersionHistory(session.shop, 100);

    return json({ history });
  } catch (error) {
    console.error("[History Loader Error]", error);
    return json({ history: [] });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const versionId = formData.get("versionId") as string;

  try {
    const result = await rollbackContentVersion(admin, versionId, session.shop);
    return json({ success: true, message: result.message });
  } catch (err: any) {
    return json({ success: false, message: err.message }, { status: 400 });
  }
};

export default function HistoryPage() {
  const { history } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();

  const isRollingBack = navigation.state === "submitting";

  const handleRollback = (versionId: string) => {
    submit({ versionId }, { method: "post" });
  };

  const rowMarkup = history.map((item, index) => (
    <IndexTable.Row id={item.id} key={item.id} position={index}>
      <IndexTable.Cell>
        <Text as="span" variant="bodySm" fontWeight="bold">
          {new Date(item.appliedAt).toLocaleString()}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone="info">{item.resourceType.toUpperCase()}</Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" variant="bodySm" fontWeight="bold">
          {item.field}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <div style={{ maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <Text as="span" variant="bodyXs" tone="subdued">
            {item.beforeValue || "(empty)"}
          </Text>
        </div>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <div style={{ maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <Text as="span" variant="bodyXs">
            {item.afterValue}
          </Text>
        </div>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone={item.revertedAt ? "subdued" : "success"}>
          {item.revertedAt ? "Reverted" : "Active Live"}
        </Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {!item.revertedAt ? (
          <Button
            size="micro"
            tone="critical"
            variant="secondary"
            onClick={() => handleRollback(item.id)}
            loading={isRollingBack && navigation.formData?.get("versionId") === item.id}
          >
            Rollback
          </Button>
        ) : (
          <Text as="span" variant="bodyXs" tone="subdued">
            Restored
          </Text>
        )}
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page
      title="Version History & 1-Click Rollback"
      subtitle="Complete audit trail of all AI-generated copy changes with instant restoration to pre-change values"
    >
      <BlockStack gap="400">
        {actionData?.message && (
          <Banner tone={actionData.success ? "success" : "critical"}>
            <p>{actionData.message}</p>
          </Banner>
        )}

        <Card padding="0">
          {history.length === 0 ? (
            <Box padding="400">
              <Text as="p" tone="subdued" alignment="center">
                No optimization snapshots recorded yet. When you optimize and approve product or theme copy, full pre-change snapshots will appear here.
              </Text>
            </Box>
          ) : (
            <IndexTable
              resourceName={{ singular: "version", plural: "versions" }}
              itemCount={history.length}
              headings={[
                { title: "Applied At" },
                { title: "Resource" },
                { title: "Field" },
                { title: "Original (Before)" },
                { title: "Optimized (After)" },
                { title: "Status" },
                { title: "Action" },
              ]}
              selectable={false}
            >
              {rowMarkup}
            </IndexTable>
          )}
        </Card>
      </BlockStack>
    </Page>
  );
}
