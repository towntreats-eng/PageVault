import { useState } from "react";
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
  IndexTable,
  TextField,
  Divider,
  Box,
  ProgressBar,
  useIndexResourceState,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { AGENT_GOALS, type AgentProposal } from "../services/agent.types";
import { AgentService } from "../services/agent.server";
import { DiffPreviewModal, type DiffPreviewData } from "../components/DiffPreviewModal";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  try {
    // Load latest agent run
    const latestRun = await prisma.agentRun.findFirst({
      where: { shopDomain },
      orderBy: { createdAt: "desc" },
    });

    const openIssuesCount = await prisma.seoIssue.count({
      where: { shopDomain, isResolved: false },
    });

    const totalProductsCount = await prisma.productRecord.count({
      where: { shopDomain },
    });

    const pastRuns = await prisma.agentRun.findMany({
      where: { shopDomain },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    let currentProposals: AgentProposal[] = [];
    if (latestRun?.proposalsJson) {
      try {
        currentProposals = JSON.parse(latestRun.proposalsJson);
      } catch (e) {
        currentProposals = [];
      }
    }

    return json({
      goals: AGENT_GOALS,
      latestRun,
      currentProposals,
      openIssuesCount,
      totalProductsCount,
      pastRuns,
      error: null,
    });
  } catch (error: any) {
    if (error instanceof Response) throw error;
    console.error("[Agent Loader Error]", error);
    return json({
      goals: AGENT_GOALS,
      latestRun: null,
      currentProposals: [],
      openIssuesCount: 0,
      totalProductsCount: 0,
      pastRuns: [],
      error: error.message || "Failed to load agent state",
    });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shopDomain = session.shop;
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "launch_agent") {
    const goalId = formData.get("goalId") as string;
    const customGoal = formData.get("customGoal") as string;

    const selectedPreset = AGENT_GOALS.find((g) => g.id === goalId);
    const goalTitle = customGoal?.trim() ? customGoal.trim() : (selectedPreset?.title || "Storewide SEO Optimization");
    const goalCategory = selectedPreset?.category || "custom";

    try {
      const result = await AgentService.runAutonomousAgent(
        admin,
        shopDomain,
        goalTitle,
        goalCategory,
        customGoal
      );

      return json({
        success: true,
        message: `AI Agent successfully formulated strategy and created ${result.proposals.length} high-impact proposals!`,
        runId: result.runId,
      });
    } catch (err: any) {
      return json({ success: false, error: err.message || "Failed to execute AI Agent" }, { status: 500 });
    }
  }

  if (actionType === "apply_proposals") {
    const runId = formData.get("runId") as string;
    const proposalIdsJson = formData.get("proposalIds") as string;
    const proposalIds: string[] = JSON.parse(proposalIdsJson || "[]");

    if (!runId || proposalIds.length === 0) {
      return json({ success: false, error: "No proposals selected to apply" }, { status: 400 });
    }

    try {
      const result = await AgentService.applyApprovedProposals(admin, shopDomain, runId, proposalIds);
      return json({
        success: true,
        message: `Successfully applied ${result.appliedCount} changes to Shopify with 1-click rollback snapshots!`,
        result,
      });
    } catch (err: any) {
      return json({ success: false, error: err.message || "Failed to apply proposals" }, { status: 500 });
    }
  }

  return json({ success: false, error: "Unknown action" });
};

export default function AgentRoute() {
  const { goals, latestRun, currentProposals, openIssuesCount, totalProductsCount, error } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();

  const [selectedGoalId, setSelectedGoalId] = useState<string>("critical_defects");
  const [customGoal, setCustomGoal] = useState<string>("");
  const [previewProposal, setPreviewProposal] = useState<AgentProposal | null>(null);

  const isLaunching = navigation.state === "submitting" && navigation.formData?.get("actionType") === "launch_agent";
  const isApplying = navigation.state === "submitting" && navigation.formData?.get("actionType") === "apply_proposals";

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(currentProposals.map((p) => ({ id: p.id })));

  const handleLaunchAgent = () => {
    submit(
      {
        actionType: "launch_agent",
        goalId: selectedGoalId,
        customGoal,
      },
      { method: "post" }
    );
  };

  const handleApplySelected = () => {
    if (!latestRun) return;
    const idsToApply = selectedResources.length > 0 ? selectedResources : currentProposals.map((p) => p.id);
    submit(
      {
        actionType: "apply_proposals",
        runId: latestRun.id,
        proposalIds: JSON.stringify(idsToApply),
      },
      { method: "post" }
    );
  };

  const handleOpenDiffModal = (proposal: AgentProposal) => {
    setPreviewProposal(proposal);
  };

  const selectedGoalObj = goals.find((g) => g.id === selectedGoalId) || goals[0];

  return (
    <Page
      title="Autonomous AI SEO Agent"
      subtitle="Strategic, multi-step SEO autopilot with strict fact-preservation and mandatory merchant approval"
      primaryAction={{
        content: isLaunching ? "Formulating Strategy..." : "Launch AI Strategy Pipeline",
        onAction: handleLaunchAgent,
        loading: isLaunching,
        disabled: totalProductsCount === 0,
      }}
    >
      <BlockStack gap="500">
        {error && (
          <Banner title="Notice" tone="warning">
            <p>{error}</p>
          </Banner>
        )}

        {actionData?.message && (
          <Banner title="Agent Update" tone="success">
            <p>{actionData.message}</p>
          </Banner>
        )}

        {actionData?.error && (
          <Banner title="Action Failed" tone="critical">
            <p>{actionData.error}</p>
          </Banner>
        )}

        {totalProductsCount === 0 && (
          <Banner title="Catalog Scan Required" tone="info">
            <p>Your store catalog has not been scanned yet. Please run a scan from the Dashboard to allow the AI Agent to formulate strategies.</p>
          </Banner>
        )}

        {/* Strategy Control Center */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  1. Select Strategic Campaign Objective
                </Text>
                <Text as="p" tone="subdued">
                  Choose a battle-tested growth goal or define a tailored niche objective. The AI agent will audit your catalog, align intent, and generate side-by-side proposals.
                </Text>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px" }}>
                  {goals.map((goal) => {
                    const isSelected = selectedGoalId === goal.id;
                    return (
                      <div
                        key={goal.id}
                        onClick={() => setSelectedGoalId(goal.id)}
                        style={{
                          border: isSelected ? "2px solid #008060" : "1px solid #dfe3e8",
                          backgroundColor: isSelected ? "#f4fdf8" : "#ffffff",
                          borderRadius: "8px",
                          padding: "14px",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <BlockStack gap="200">
                          <InlineStack align="space-between">
                            <Text as="h3" variant="headingSm" fontWeight="bold">
                              {goal.title}
                            </Text>
                            <Badge tone={goal.badgeTone}>{goal.category.toUpperCase()}</Badge>
                          </InlineStack>
                          <Text as="p" variant="bodySm" tone="subdued">
                            {goal.description}
                          </Text>
                          <Divider />
                          <Text as="p" variant="bodyXs" fontWeight="bold" tone="success">
                            🎯 Expected Lift: {goal.expectedImpact}
                          </Text>
                        </BlockStack>
                      </div>
                    );
                  })}
                </div>

                <Divider />

                <TextField
                  label="Or enter custom objective / focus niche (optional)"
                  value={customGoal}
                  onChange={setCustomGoal}
                  placeholder="e.g., Optimize for organic spice export buyers in USA and Europe, emphasizing certifications"
                  autoComplete="off"
                  helpText="Provide specific buyer personas, product lines, or regional focus for bespoke AI alignment."
                />
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Quick Metrics & Guardrails */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingSm">
                    Store Readiness
                  </Text>
                  <InlineStack align="space-between">
                    <Text as="span" tone="subdued">Open SEO Defects:</Text>
                    <Badge tone={openIssuesCount > 0 ? "critical" : "success"}>{openIssuesCount} issues</Badge>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="span" tone="subdued">Synced Products:</Text>
                    <Text as="span" fontWeight="bold">{totalProductsCount}</Text>
                  </InlineStack>
                  <Divider />
                  <Text as="h3" variant="headingXs">
                    Safety & Governance
                  </Text>
                  <Text as="p" variant="bodyXs" tone="subdued">
                    🛡️ <strong>Zero Unreviewed Mutations</strong>: No storefront copy changes without merchant preview and approval.
                  </Text>
                  <Text as="p" variant="bodyXs" tone="subdued">
                    🔄 <strong>1-Click Rollback</strong>: Every applied proposal captures pre-change snapshots in <code>ContentVersion</code>.
                  </Text>
                  <Text as="p" variant="bodyXs" tone="subdued">
                    🚫 <strong>Fact Lock</strong>: Generative engine strictly forbids hallucinating claims or materials not in original specs.
                  </Text>
                </BlockStack>
              </Card>

              {latestRun && (
                <Card>
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingSm">Active Session</Text>
                    <Text as="p" variant="bodyXs" tone="subdued">
                      Goal: <strong>{latestRun.goal}</strong>
                    </Text>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyXs">Status:</Text>
                      <Badge tone={latestRun.status === "applied" ? "success" : "attention"}>
                        {latestRun.status.toUpperCase()}
                      </Badge>
                    </InlineStack>
                    <ProgressBar progress={(latestRun.appliedCount / (latestRun.totalProposals || 1)) * 100} size="small" />
                    <Text as="p" variant="bodyXs" tone="subdued">
                      {latestRun.appliedCount} of {latestRun.totalProposals} proposals applied
                    </Text>
                  </BlockStack>
                </Card>
              )}
            </BlockStack>
          </Layout.Section>
        </Layout>

        {/* Latest Reasoning & Strategy Roadmap */}
        {latestRun?.strategy && (
          <Card>
            <BlockStack gap="300">
              <InlineStack align="space-between">
                <Text as="h2" variant="headingMd">
                  🧠 AI Strategy Roadmap & Pipeline Diagnostics
                </Text>
                <Badge tone="info">4-PHASE REASONING</Badge>
              </InlineStack>
              <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                <Text as="p" variant="bodySm" tone="subdued" breakWord>
                  <pre style={{ margin: 0, fontFamily: "inherit", whiteSpace: "pre-wrap" }}>
                    {latestRun.strategy}
                  </pre>
                </Text>
              </Box>
            </BlockStack>
          </Card>
        )}

        {/* Actionable Proposals Table with Approval Gate */}
        {currentProposals.length > 0 ? (
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <div>
                  <Text as="h2" variant="headingMd">
                    2. Strategic Proposals Ready for Approval ({currentProposals.length})
                  </Text>
                  <Text as="p" tone="subdued">
                    Review side-by-side diffs, inspect projected search lifts, and selectively approve changes to push to Shopify.
                  </Text>
                </div>
                <InlineStack gap="200">
                  <Button
                    variant="primary"
                    loading={isApplying}
                    onClick={handleApplySelected}
                    disabled={currentProposals.every((p) => p.status === "applied")}
                  >
                    {isApplying
                      ? "Applying Mutations..."
                      : selectedResources.length > 0
                      ? `Approve & Publish Selected (${selectedResources.length})`
                      : "Approve & Publish All Proposals"}
                  </Button>
                </InlineStack>
              </InlineStack>

              <IndexTable
                resourceName={{ singular: "proposal", plural: "proposals" }}
                itemCount={currentProposals.length}
                selectedItemsCount={allResourcesSelected ? "All" : selectedResources.length}
                onSelectionChange={handleSelectionChange}
                headings={[
                  { title: "Target Resource" },
                  { title: "Proposed SEO Title" },
                  { title: "Defect & Expected Benefit" },
                  { title: "Confidence & Lift" },
                  { title: "Status" },
                  { title: "Action" },
                ]}
              >
                {currentProposals.map((proposal, index) => {
                  const isApplied = proposal.status === "applied";
                  return (
                    <IndexTable.Row
                      id={proposal.id}
                      key={proposal.id}
                      selected={selectedResources.includes(proposal.id)}
                      position={index}
                    >
                      <IndexTable.Cell>
                        <BlockStack gap="100">
                          <Text as="span" fontWeight="bold">
                            {proposal.resourceTitle}
                          </Text>
                          <Text as="span" variant="bodyXs" tone="subdued">
                            {proposal.resourceType.toUpperCase()}
                          </Text>
                        </BlockStack>
                      </IndexTable.Cell>

                      <IndexTable.Cell>
                        <div style={{ maxWidth: "260px" }}>
                          <Text as="span" variant="bodySm">
                            {proposal.proposed.seoTitle}
                          </Text>
                        </div>
                      </IndexTable.Cell>

                      <IndexTable.Cell>
                        <div style={{ maxWidth: "240px" }}>
                          <Text as="p" variant="bodyXs">
                            <strong>Issue:</strong> {proposal.rationale.issueAddressed}
                          </Text>
                          <Text as="p" variant="bodyXs" tone="subdued">
                            <strong>Benefit:</strong> {proposal.rationale.expectedBenefit}
                          </Text>
                        </div>
                      </IndexTable.Cell>

                      <IndexTable.Cell>
                        <BlockStack gap="100">
                          <Badge tone="success">{proposal.rationale.estimatedCtrLift}</Badge>
                          <Text as="span" variant="bodyXs" tone="subdued">
                            {proposal.rationale.confidenceScore}% confidence
                          </Text>
                        </BlockStack>
                      </IndexTable.Cell>

                      <IndexTable.Cell>
                        <Badge tone={isApplied ? "success" : "attention"}>
                          {isApplied ? "APPLIED" : "READY"}
                        </Badge>
                      </IndexTable.Cell>

                      <IndexTable.Cell>
                        <Button size="slim" onClick={() => handleOpenDiffModal(proposal)}>
                          Inspect Diff
                        </Button>
                      </IndexTable.Cell>
                    </IndexTable.Row>
                  );
                })}
              </IndexTable>
            </BlockStack>
          </Card>
        ) : (
          <Card>
            <Box padding="500">
              <BlockStack align="center" inlineAlign="center" gap="300">
                <Text as="h3" variant="headingMd">
                  No Active Proposals Queued
                </Text>
                <Text as="p" tone="subdued">
                  Select a strategic objective above and click "Launch AI Strategy Pipeline" to let the agent formulate bespoke optimization proposals.
                </Text>
              </BlockStack>
            </Box>
          </Card>
        )}
      </BlockStack>

      {/* Side-by-Side Diff Modal */}
      {previewProposal && (
        <DiffPreviewModal
          open={!!previewProposal}
          onClose={() => setPreviewProposal(null)}
          onApply={(edited) => {
            // Apply single proposal from modal
            if (latestRun) {
              submit(
                {
                  actionType: "apply_proposals",
                  runId: latestRun.id,
                  proposalIds: JSON.stringify([previewProposal.id]),
                },
                { method: "post" }
              );
            }
            setPreviewProposal(null);
          }}
          data={{
            resourceGid: previewProposal.resourceGid,
            resourceTitle: previewProposal.resourceTitle,
            original: previewProposal.original,
            proposed: previewProposal.proposed,
          }}
        />
      )}
    </Page>
  );
}
