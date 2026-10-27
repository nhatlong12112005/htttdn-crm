-- Migration bổ sung cho phân hệ CRM (Mục 4.1 & 4.3: Phản hồi sản phẩm trực tiếp & Quản lý trả lời phản hồi)
ALTER TABLE "Review" ALTER COLUMN "orderDetailId" DROP NOT NULL;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "adminReply" TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "repliedAt" TIMESTAMP(3);
