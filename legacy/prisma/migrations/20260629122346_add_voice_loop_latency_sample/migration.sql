-- CreateTable
CREATE TABLE "VoiceLoopLatencySample" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stage" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ok" BOOLEAN NOT NULL DEFAULT true,
    "learnerId" TEXT,
    "tier" INTEGER,
    "practiceMode" TEXT
);

-- CreateIndex
CREATE INDEX "VoiceLoopLatencySample_occurredAt_idx" ON "VoiceLoopLatencySample"("occurredAt");

-- CreateIndex
CREATE INDEX "VoiceLoopLatencySample_stage_occurredAt_idx" ON "VoiceLoopLatencySample"("stage", "occurredAt");

-- CreateIndex
CREATE INDEX "VoiceLoopLatencySample_learnerId_occurredAt_idx" ON "VoiceLoopLatencySample"("learnerId", "occurredAt");
