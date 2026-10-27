-- Xóa các cột khóa ngoại dư thừa trên các bảng giữ lại
ALTER TABLE "Survey" DROP COLUMN IF EXISTS "vendorId" CASCADE;
ALTER TABLE "Notification" DROP COLUMN IF EXISTS "vendorId" CASCADE;
ALTER TABLE "Voucher" DROP COLUMN IF EXISTS "vendorId" CASCADE;
ALTER TABLE "Product" DROP COLUMN IF EXISTS "vendorId" CASCADE;
ALTER TABLE "OrderDetail" DROP COLUMN IF EXISTS "vendorOrderId" CASCADE;
ALTER TABLE "OrderStatusHistory" DROP COLUMN IF EXISTS "vendorId" CASCADE;
ALTER TABLE "OrderStatusHistory" DROP COLUMN IF EXISTS "employeeId" CASCADE;

-- Xóa các bảng không thuộc phạm vi hệ thống CRM (Vendor, Employee, Payroll, Shipping)
DROP TABLE IF EXISTS "ShipmentEvent" CASCADE;
DROP TABLE IF EXISTS "Shipment" CASCADE;
DROP TABLE IF EXISTS "VendorOrder" CASCADE;
DROP TABLE IF EXISTS "EmployeePayroll" CASCADE;
DROP TABLE IF EXISTS "EmployeeAttendance" CASCADE;
DROP TABLE IF EXISTS "EmployeeSalaryHistory" CASCADE;
DROP TABLE IF EXISTS "Employee" CASCADE;
DROP TABLE IF EXISTS "Vendor" CASCADE;

-- Xóa các kiểu ENUM dư thừa
DROP TYPE IF EXISTS "EmploymentType" CASCADE;
DROP TYPE IF EXISTS "AttendanceStatus" CASCADE;
DROP TYPE IF EXISTS "PayrollStatus" CASCADE;
DROP TYPE IF EXISTS "VendorOrderStatus" CASCADE;
DROP TYPE IF EXISTS "ShipmentStatus" CASCADE;
