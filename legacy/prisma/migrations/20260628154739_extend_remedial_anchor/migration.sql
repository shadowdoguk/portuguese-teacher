/*
  Warnings:

  - Added the required column `gapArea` to the `RemedialAnchor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `weight` to the `RemedialAnchor` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RemedialAnchor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromUnitId" TEXT NOT NULL,
    "toUnitId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "gapArea" TEXT NOT NULL,
    "weight" REAL NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RemedialAnchor_fromUnitId_fkey" FOREIGN KEY ("fromUnitId") REFERENCES "Unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RemedialAnchor_toUnitId_fkey" FOREIGN KEY ("toUnitId") REFERENCES "Unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_RemedialAnchor" ("fromUnitId", "id", "note", "reason", "toUnitId") SELECT "fromUnitId", "id", "note", "reason", "toUnitId" FROM "RemedialAnchor";
DROP TABLE "RemedialAnchor";
ALTER TABLE "new_RemedialAnchor" RENAME TO "RemedialAnchor";
CREATE INDEX "RemedialAnchor_fromUnitId_idx" ON "RemedialAnchor"("fromUnitId");
CREATE INDEX "RemedialAnchor_toUnitId_idx" ON "RemedialAnchor"("toUnitId");
CREATE INDEX "RemedialAnchor_gapArea_idx" ON "RemedialAnchor"("gapArea");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
