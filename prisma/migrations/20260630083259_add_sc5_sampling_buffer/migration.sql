-- CreateTable
CREATE TABLE "Sc5Sample" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "utteranceId" TEXT NOT NULL,
    "audioBlobUrl" TEXT NOT NULL,
    "transcript" TEXT,
    "confidence" REAL,
    "dialect" TEXT NOT NULL DEFAULT 'pt-PT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Sc5Sample_utteranceId_key" ON "Sc5Sample"("utteranceId");

-- CreateIndex
CREATE INDEX "Sc5Sample_createdAt_idx" ON "Sc5Sample"("createdAt");
