-- 1. Bổ sung cột phân quyền cho bảng Admin (SUPER_ADMIN vs CRM_MANAGER)
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "roleCode" VARCHAR(50) NOT NULL DEFAULT 'CRM_MANAGER';
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "permissions" JSONB;

UPDATE "Admin"
SET "roleCode" = 'CRM_MANAGER'
WHERE email IN ('crm@miva.vn', 'admin2@miva.vn') OR department = 'CRM_MANAGER';

UPDATE "Admin" SET "roleCode" = 'SUPER_ADMIN' WHERE department = 'SUPER_ADMIN';
ALTER TABLE "Admin" ALTER COLUMN "roleCode" SET DEFAULT 'CRM_MANAGER';

-- 2. Bổ sung cho bảng Review (Phản hồi sản phẩm trực tiếp & Quản lý trả lời phản hồi)
ALTER TABLE "Review" ALTER COLUMN "orderDetailId" DROP NOT NULL;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "adminReply" TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "repliedAt" TIMESTAMP(3);


-- 3. Bổ sung mô tả cho bảng Category (Mô tả danh mục sản phẩm)
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "description" TEXT;

-- 4. Bổ sung giá trị 'returned' cho enum OrderStatus
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'returned';
