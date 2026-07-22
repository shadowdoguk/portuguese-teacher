-- CreateTable
CREATE TABLE "SrsItemSource" (
    "learnerId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "sourceScenarioId" TEXT NOT NULL,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("learnerId", "itemId", "sourceScenarioId")
);

-- CreateIndex
CREATE INDEX "SrsItemSource_learnerId_idx" ON "SrsItemSource"("learnerId");

-- CreateIndex
CREATE INDEX "SrsItemSource_sourceScenarioId_idx" ON "SrsItemSource"("sourceScenarioId");
