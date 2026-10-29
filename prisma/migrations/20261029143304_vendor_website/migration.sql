-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Vendor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "logoPath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "commissionPercent" REAL NOT NULL DEFAULT 15,
    "autoApprove" BOOLEAN NOT NULL DEFAULT false,
    "payoutIban" TEXT NOT NULL DEFAULT '',
    "payoutHolder" TEXT NOT NULL DEFAULT '',
    "payoutNote" TEXT NOT NULL DEFAULT '',
    "addressLine" TEXT NOT NULL DEFAULT '',
    "postalCode" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Vendor" ("addressLine", "autoApprove", "city", "commissionPercent", "createdAt", "description", "email", "id", "logoPath", "name", "payoutHolder", "payoutIban", "payoutNote", "phone", "postalCode", "slug", "status", "updatedAt") SELECT "addressLine", "autoApprove", "city", "commissionPercent", "createdAt", "description", "email", "id", "logoPath", "name", "payoutHolder", "payoutIban", "payoutNote", "phone", "postalCode", "slug", "status", "updatedAt" FROM "Vendor";
DROP TABLE "Vendor";
ALTER TABLE "new_Vendor" RENAME TO "Vendor";
CREATE UNIQUE INDEX "Vendor_slug_key" ON "Vendor"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
