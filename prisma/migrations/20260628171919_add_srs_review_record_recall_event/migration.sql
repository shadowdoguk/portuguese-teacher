-- CreateTable
CREATE TABLE "SrsReviewRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "learnerId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "halfLifeMs" REAL NOT NULL,
    "lastReviewedAt" DATETIME,
    "dueAt" DATETIME NOT NULL,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SrsRecallEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "learnerId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "halfLifeBeforeMs" REAL NOT NULL,
    "halfLifeAfterMs" REAL NOT NULL,
    "dueAt" DATETIME NOT NULL,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "SrsReviewRecord_learnerId_idx" ON "SrsReviewRecord"("learnerId");

-- CreateIndex
CREATE INDEX "SrsReviewRecord_learnerId_dueAt_idx" ON "SrsReviewRecord"("learnerId", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "SrsReviewRecord_learnerId_itemId_key" ON "SrsReviewRecord"("learnerId", "itemId");

-- CreateIndex
CREATE INDEX "SrsRecallEvent_learnerId_occurredAt_idx" ON "SrsRecallEvent"("learnerId", "occurredAt");

-- CreateIndex
CREATE INDEX "SrsRecallEvent_itemId_idx" ON "SrsRecallEvent"("itemId");
