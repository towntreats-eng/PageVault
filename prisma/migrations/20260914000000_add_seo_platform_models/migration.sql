-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "domain" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "plan" TEXT NOT NULL DEFAULT 'free',
    "geminiApiKey" TEXT,
    "brandVoice" TEXT NOT NULL DEFAULT 'professional',
    "customVoiceRules" TEXT,
    "installedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProductRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "shopifyGid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "handle" TEXT NOT NULL,
    "productType" TEXT,
    "vendor" TEXT,
    "tags" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "imagesJson" TEXT,
    "isOptimized" BOOLEAN NOT NULL DEFAULT false,
    "lastScannedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductRecord_shopDomain_fkey" FOREIGN KEY ("shopDomain") REFERENCES "Shop" ("domain") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CollectionRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "shopifyGid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "handle" TEXT NOT NULL,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "isOptimized" BOOLEAN NOT NULL DEFAULT false,
    "lastScannedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CollectionRecord_shopDomain_fkey" FOREIGN KEY ("shopDomain") REFERENCES "Shop" ("domain") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PageRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "shopifyGid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "handle" TEXT NOT NULL,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "lastScannedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PageRecord_shopDomain_fkey" FOREIGN KEY ("shopDomain") REFERENCES "Shop" ("domain") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ArticleRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "shopifyGid" TEXT NOT NULL,
    "blogGid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "handle" TEXT NOT NULL,
    "author" TEXT,
    "tags" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "lastScannedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ArticleRecord_shopDomain_fkey" FOREIGN KEY ("shopDomain") REFERENCES "Shop" ("domain") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SeoIssue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceGid" TEXT NOT NULL,
    "issueType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "recommendedFix" TEXT NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SeoIssue_shopDomain_fkey" FOREIGN KEY ("shopDomain") REFERENCES "Shop" ("domain") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KeywordTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "searchIntent" TEXT NOT NULL,
    "searchVolume" INTEGER,
    "difficulty" INTEGER,
    "cpc" REAL,
    "targetUrl" TEXT,
    "mappedResource" TEXT,
    "status" TEXT NOT NULL DEFAULT 'opportunity',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "KeywordTarget_shopDomain_fkey" FOREIGN KEY ("shopDomain") REFERENCES "Shop" ("domain") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CompetitorTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "notes" TEXT,
    "trackedKeywordsJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CompetitorTarget_shopDomain_fkey" FOREIGN KEY ("shopDomain") REFERENCES "Shop" ("domain") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContentVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceGid" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "beforeValue" TEXT NOT NULL,
    "afterValue" TEXT NOT NULL,
    "reason" TEXT,
    "confidence" INTEGER,
    "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revertedAt" DATETIME,
    CONSTRAINT "ContentVersion_shopDomain_fkey" FOREIGN KEY ("shopDomain") REFERENCES "Shop" ("domain") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OptimizationJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OptimizationJob_shopDomain_fkey" FOREIGN KEY ("shopDomain") REFERENCES "Shop" ("domain") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AiUsageRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiUsageRecord_shopDomain_fkey" FOREIGN KEY ("shopDomain") REFERENCES "Shop" ("domain") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Shop_domain_key" ON "Shop"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "ProductRecord_shopifyGid_key" ON "ProductRecord"("shopifyGid");

-- CreateIndex
CREATE INDEX "ProductRecord_shopDomain_idx" ON "ProductRecord"("shopDomain");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionRecord_shopifyGid_key" ON "CollectionRecord"("shopifyGid");

-- CreateIndex
CREATE INDEX "CollectionRecord_shopDomain_idx" ON "CollectionRecord"("shopDomain");

-- CreateIndex
CREATE UNIQUE INDEX "PageRecord_shopifyGid_key" ON "PageRecord"("shopifyGid");

-- CreateIndex
CREATE INDEX "PageRecord_shopDomain_idx" ON "PageRecord"("shopDomain");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleRecord_shopifyGid_key" ON "ArticleRecord"("shopifyGid");

-- CreateIndex
CREATE INDEX "ArticleRecord_shopDomain_idx" ON "ArticleRecord"("shopDomain");

-- CreateIndex
CREATE INDEX "SeoIssue_shopDomain_severity_idx" ON "SeoIssue"("shopDomain", "severity");

-- CreateIndex
CREATE INDEX "SeoIssue_resourceGid_idx" ON "SeoIssue"("resourceGid");

-- CreateIndex
CREATE UNIQUE INDEX "KeywordTarget_shopDomain_keyword_key" ON "KeywordTarget"("shopDomain", "keyword");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitorTarget_shopDomain_domain_key" ON "CompetitorTarget"("shopDomain", "domain");

-- CreateIndex
CREATE INDEX "ContentVersion_shopDomain_resourceGid_idx" ON "ContentVersion"("shopDomain", "resourceGid");

-- CreateIndex
CREATE INDEX "OptimizationJob_shopDomain_status_idx" ON "OptimizationJob"("shopDomain", "status");

-- CreateIndex
CREATE INDEX "AiUsageRecord_shopDomain_createdAt_idx" ON "AiUsageRecord"("shopDomain", "createdAt");
