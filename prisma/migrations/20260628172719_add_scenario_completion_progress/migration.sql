-- CreateTable
CREATE TABLE "ScenarioCompletion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "learnerId" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "stars" INTEGER NOT NULL,
    "turnsTaken" INTEGER NOT NULL,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ScenarioProgress" (
    "learnerId" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "bestStars" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "completedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,

    PRIMARY KEY ("learnerId", "scenarioId")
);

-- CreateIndex
CREATE INDEX "ScenarioCompletion_learnerId_completedAt_idx" ON "ScenarioCompletion"("learnerId", "completedAt");

-- CreateIndex
CREATE INDEX "ScenarioCompletion_scenarioId_idx" ON "ScenarioCompletion"("scenarioId");

-- CreateIndex
CREATE INDEX "ScenarioProgress_learnerId_idx" ON "ScenarioProgress"("learnerId");
