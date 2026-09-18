-- CreateTable
CREATE TABLE IF NOT EXISTS "AgentRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "goalCategory" TEXT NOT NULL DEFAULT 'defects',
    "status" TEXT NOT NULL DEFAULT 'proposals_ready',
    "strategy" TEXT,
    "proposalsJson" TEXT,
    "appliedCount" INTEGER NOT NULL DEFAULT 0,
    "totalProposals" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AgentRun_shopDomain_fkey" FOREIGN KEY ("shopDomain") REFERENCES "Shop" ("domain") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AgentRun_shopDomain_status_idx" ON "AgentRun"("shopDomain", "status");
