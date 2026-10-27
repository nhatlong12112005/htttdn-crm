-- Cập nhật mật khẩu về 'admin123' và phân quyền chuẩn cho các tài khoản Demo trong htttdn_crm
UPDATE "Admin"
SET password = '$2b$10$n6LJ8yiwoKIrrfCiCc8y0OEFwC5BzKAeD6CYzngelKti.rFqkLYZ.',
    department = 'SUPER_ADMIN',
    status = 'active',
    "deletedAt" = NULL
WHERE email = 'admin1@miva.vn';

UPDATE "Admin"
SET password = '$2b$10$n6LJ8yiwoKIrrfCiCc8y0OEFwC5BzKAeD6CYzngelKti.rFqkLYZ.',
    department = 'CRM_MANAGER',
    status = 'active',
    "deletedAt" = NULL
WHERE email = 'admin2@miva.vn';

INSERT INTO "Admin" (id, "fullName", email, password, phone, department, status, "createdAt", "updatedAt")
VALUES
  ('11111111-1111-4111-8111-111111111111', 'Quản trị Hệ thống (Admin Server)', 'admin@miva.vn', '$2b$10$n6LJ8yiwoKIrrfCiCc8y0OEFwC5BzKAeD6CYzngelKti.rFqkLYZ.', '0901000001', 'SUPER_ADMIN', 'active', NOW(), NOW()),
  ('22222222-2222-4222-8222-222222222222', 'Người Quản lý CRM', 'crm@miva.vn', '$2b$10$n6LJ8yiwoKIrrfCiCc8y0OEFwC5BzKAeD6CYzngelKti.rFqkLYZ.', '0901000002', 'CRM_MANAGER', 'active', NOW(), NOW())
ON CONFLICT (email) DO UPDATE
SET password = EXCLUDED.password,
    department = EXCLUDED.department,
    status = 'active',
    "deletedAt" = NULL;

UPDATE "Client"
SET password = '$2b$10$n6LJ8yiwoKIrrfCiCc8y0OEFwC5BzKAeD6CYzngelKti.rFqkLYZ.',
    status = 'active',
    "deletedAt" = NULL
WHERE email IN ('long@gmail.com', 'kieumai.7kao@hotmail.com', 'test12@gmail.com');

INSERT INTO "Client" (id, "fullName", email, password, phone, gender, "dateOfBirth", status, "createdAt", "updatedAt")
VALUES
  ('33333333-3333-4333-8333-333333333333', 'Nguyễn Văn Khách Hàng', 'client1@miva.vn', '$2b$10$n6LJ8yiwoKIrrfCiCc8y0OEFwC5BzKAeD6CYzngelKti.rFqkLYZ.', '0909123456', 'male', '2001-05-15', 'active', NOW(), NOW())
ON CONFLICT (email) DO UPDATE
SET password = EXCLUDED.password,
    status = 'active',
    "deletedAt" = NULL;
