ALTER TABLE "Payment" ADD COLUMN "refundedAt" TIMESTAMP(3);
UPDATE "Payment" SET "refundedAt" = "updatedAt" WHERE "status" = 'refunded';
