-- CreateTable
CREATE TABLE "Reversal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "lineTotalCents" INTEGER NOT NULL,
    "commissionCents" INTEGER NOT NULL,
    "vendorNetCents" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "restocked" BOOLEAN NOT NULL DEFAULT false,
    "refundRef" TEXT,
    "refundedAt" DATETIME,
    "refundError" TEXT NOT NULL DEFAULT '',
    "payoutId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reversal_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Reversal_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Reversal_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Reversal_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "addressLine" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'DE',
    "note" TEXT NOT NULL DEFAULT '',
    "deliveryNote" TEXT NOT NULL DEFAULT '',
    "subtotalCents" INTEGER NOT NULL,
    "shippingCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "paymentProvider" TEXT NOT NULL DEFAULT '',
    "paymentRef" TEXT,
    "paymentIntent" TEXT,
    "refundedCents" INTEGER NOT NULL DEFAULT 0,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Order" ("addressLine", "city", "country", "createdAt", "currency", "deliveryNote", "email", "id", "name", "note", "number", "paidAt", "paymentProvider", "paymentRef", "postalCode", "shippingCents", "status", "subtotalCents", "totalCents", "updatedAt") SELECT "addressLine", "city", "country", "createdAt", "currency", "deliveryNote", "email", "id", "name", "note", "number", "paidAt", "paymentProvider", "paymentRef", "postalCode", "shippingCents", "status", "subtotalCents", "totalCents", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_number_key" ON "Order"("number");
CREATE UNIQUE INDEX "Order_paymentRef_key" ON "Order"("paymentRef");
CREATE UNIQUE INDEX "Order_paymentIntent_key" ON "Order"("paymentIntent");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Reversal_vendorId_payoutId_idx" ON "Reversal"("vendorId", "payoutId");

-- CreateIndex
CREATE INDEX "Reversal_orderItemId_idx" ON "Reversal"("orderItemId");
