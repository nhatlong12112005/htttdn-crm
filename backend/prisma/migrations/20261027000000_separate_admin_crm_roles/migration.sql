-- Backfill legacy accounts before changing the default. The old default
-- marked newly created CRM managers as SUPER_ADMIN.
UPDATE "Admin"
SET "roleCode" = 'CRM_MANAGER'
WHERE "department" = 'CRM_MANAGER';

UPDATE "Admin"
SET "roleCode" = 'SUPER_ADMIN'
WHERE "department" = 'SUPER_ADMIN';

ALTER TABLE "Admin" ALTER COLUMN "roleCode" SET DEFAULT 'CRM_MANAGER';
