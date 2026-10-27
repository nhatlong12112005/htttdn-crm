-- 1. Bổ sung cột phân quyền cho bảng Admin (SUPER_ADMIN vs CRM_MANAGER)
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "roleCode" VARCHAR(50) NOT NULL DEFAULT 'SUPER_ADMIN';
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "permissions" JSONB;

UPDATE "Admin"
SET "roleCode" = 'CRM_MANAGER'
WHERE email IN ('crm@miva.vn', 'admin2@miva.vn') OR department = 'CRM_MANAGER';

-- 2. Bổ sung cho bảng Review (Phản hồi sản phẩm trực tiếp & Quản lý trả lời phản hồi)
ALTER TABLE "Review" ALTER COLUMN "orderDetailId" DROP NOT NULL;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "adminReply" TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "repliedAt" TIMESTAMP(3);
