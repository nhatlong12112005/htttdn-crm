-- ==============================================================================
-- DATASET CHUẨN HOÁ CHO HỆ THỐNG HTTT QUẢN LÝ KHÁCH HÀNG (MIVA CRM)
-- Rà soát logic toàn diện:
--   - 3 Tài khoản Admin Server (SUPER_ADMIN)
--   - 3 Tài khoản Quản lý CRM (CRM_MANAGER)
--   - 12 Tài khoản Khách hàng (Client) đa dạng lứa tuổi, giới tính, địa chỉ
--   - 5 Danh mục sản phẩm (Category) có đầy đủ mô tả (description)
--   - 8 Sản phẩm công nghệ (Product) kèm Màu sắc (ProductColor) & Biến thể (ProductVariant)
--   - 6 Mã giảm giá (Voucher) gồm mã active, expired (hết hạn để test gia hạn)
--   - 5 Giỏ hàng mẫu (Cart & CartItem)
--   - 20 Đơn hàng mẫu (Order, OrderDetail, Payment, OrderStatusHistory)
--     trải đủ 7 trạng thái: pending, confirmed, processing, shipping, completed, cancelled, returned
--   - 12 Đánh giá / Phản hồi sản phẩm (Review) - gồm cả đã trả lời và chờ CRM trả lời
--   - 3 Chiến dịch khảo sát (Survey, SurveyQuestion, SurveyOption)
--   - 24 Phản hồi khảo sát thực tế (SurveyResponse, SurveyAnswer) phục vụ báo cáo độ tuổi/sở thích
--   - 12 Thông báo hệ thống & đơn hàng & khảo sát (Notification)
--   - 10 Sản phẩm yêu thích (ProductFavorite)
--
-- Mật khẩu chung cho TẤT CẢ tài khoản: admin123
-- Hash Bcrypt: $2b$10$n6LJ8yiwoKIrrfCiCc8y0OEFwC5BzKAeD6CYzngelKti.rFqkLYZ.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 0. DỌN DẸP DỮ LIỆU CŨ THEO THỨ TỰ RÀNG BUỘC KHÓA NGOẠI (FK-SAFE CLEANUP)
-- ------------------------------------------------------------------------------
DELETE FROM "SurveyAnswer";
DELETE FROM "SurveyResponse";
DELETE FROM "SurveyOption";
DELETE FROM "SurveyQuestion";
DELETE FROM "Notification";
DELETE FROM "Survey";

DELETE FROM "Review";
DELETE FROM "OrderStatusHistory";
DELETE FROM "Payment";
DELETE FROM "OrderDetail";
DELETE FROM "VoucherDetail";
DELETE FROM "Order";
DELETE FROM "CartItem";
DELETE FROM "Cart";
DELETE FROM "ProductFavorite";
DELETE FROM "Voucher";

DELETE FROM "ProductVariant";
DELETE FROM "ProductColor";
DELETE FROM "Product";
DELETE FROM "Category";

DELETE FROM "ClientAddress";
DELETE FROM "Client";
DELETE FROM "Admin";

-- ------------------------------------------------------------------------------
-- 1. ADMIN USERS (3 SUPER_ADMIN + 3 CRM_MANAGER)
-- ------------------------------------------------------------------------------
INSERT INTO "Admin" (id, "fullName", email, password, phone, "avatarUrl", department, "roleCode", permissions, status, "createdAt", "updatedAt")
VALUES
  -- 3 Tài khoản Admin Server (SUPER_ADMIN)
  ('11111111-1111-4111-8111-111111111111', 'Nguyễn Văn Quản Trị', 'admin@miva.vn', '$2b$10$n6LJ8yiwoKIrrfCiCc8y0OEFwC5BzKAeD6CYzngelKti.rFqkLYZ.', '0901000001', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 'SUPER_ADMIN', 'SUPER_ADMIN', '{"all": true}'::jsonb, 'active', NOW() - INTERVAL '120 days', NOW()),
  ('11111111-1111-4111-8111-111111111112', 'Trần Minh Tuấn', 'admin2@miva.vn', '$2b$10$n6LJ8yiwoKIrrfCiCc8y0OEFwC5BzKAeD6CYzngelKti.rFqkLYZ.', '0901000002', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'SUPER_ADMIN', 'SUPER_ADMIN', '{"all": true}'::jsonb, 'active', NOW() - INTERVAL '100 days', NOW()),
  ('11111111-1111-4111-8111-111111111113', 'Lê Thị Hương Giang', 'admin3@miva.vn', '$2b$10$n6LJ8yiwoKIrrfCiCc8y0OEFwC5BzKAeD6CYzngelKti.rFqkLYZ.', '0901000003', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'SUPER_ADMIN', 'SUPER_ADMIN', '{"all": true}'::jsonb, 'active', NOW() - INTERVAL '90 days', NOW()),

  -- 3 Tài khoản Quản lý CRM (CRM_MANAGER)
  ('22222222-2222-4222-8222-222222222222', 'Trương Nhật Long', 'crm@miva.vn', '$2b$10$n6LJ8yiwoKIrrfCiCc8y0OEFwC5BzKAeD6CYzngelKti.rFqkLYZ.', '0902000001', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'CRM_MANAGER', 'CRM_MANAGER', '{"crm": true, "customers": true, "surveys": true, "reviews": true, "orders": true}'::jsonb, 'active', NOW() - INTERVAL '120 days', NOW()),
  ('22222222-2222-4222-8222-222222222223', 'Hoàng Đình Trọng', 'crm2@miva.vn', '$2b$10$n6LJ8yiwoKIrrfCiCc8y0OEFwC5BzKAeD6CYzngelKti.rFqkLYZ.', '0902000002', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'CRM_MANAGER', 'CRM_MANAGER', '{"crm": true, "surveys": true}'::jsonb, 'active', NOW() - INTERVAL '80 days', NOW()),
  ('22222222-2222-4222-8222-222222222224', 'Phạm Thu Hà', 'crm3@miva.vn', '$2b$10$n6LJ8yiwoKIrrfCiCc8y0OEFwC5BzKAeD6CYzngelKti.rFqkLYZ.', '0902000003', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', 'CRM_MANAGER', 'CRM_MANAGER', '{"crm": true, "reviews": true, "reports": true}'::jsonb, 'active', NOW() - INTERVAL '60 days', NOW());

-- ------------------------------------------------------------------------------
-- 2. CLIENT USERS (12 KHÁCH HÀNG ĐỦ ĐỘ TUỔI, GIỚI TÍNH)
-- ------------------------------------------------------------------------------
INSERT INTO "Client" (id, "fullName", email, password, phone, "avatarUrl", "dateOfBirth", gender, "loyaltyPoints", status, "createdAt", "updatedAt")
VALUES
  ('33333333-3333-4333-8333-000000000001', 'Nguyễn Văn An', 'client1@miva.vn', '$2b$10$n6LJ8yiwoKIrrfCiCc8y0OEFwC5BzKAeD6CYzngelKti.rFqkLYZ.', '0909123451', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', '2001-01-15', 'male', 1250, 'active', NOW() - INTERVAL '150 days', NOW()),
  ('33333333-3333-4333-8333-000000000002', 'Trần Thị Bích', 'client2@miva.vn', '$2b$10$n6LJ8yiwoKIrrfCiCc8y0OEFwC5BzKAeD6CYzngelKti.rFqkLYZ.', '0909123452', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150', '1998-05-20', 'female', 1850, 'active', NOW() - INTERVAL '140 days', NOW()),
  ('33333333-3333-4333-8333-000000000003', 'Lê Hoàng Cường', 'client3@miva.vn', '$2b$10$n6LJ8yiwoKIrrfCiCc8y0OEFwC5BzKAeD6CYzngelKti.rFqkLYZ.', '0909123453', 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150', '2003-09-10', 'male', 420, 'active', NOW() - INTERVAL '120 days', NOW()),
  ('33333333-3333-4333-8333-000000000004', 'Phạm Thanh Dung', 'client4@miva.vn', '$2b$10$n6LJ8yiwoKIrrfCiCc8y0OEFwC5BzKAeD6CYzngelKti.rFqkLYZ.', '0909123454', 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150', '1995-12-05', 'female', 840, 'active', NOW() - INTERVAL '110 days', NOW()),
  ('33333333-3333-4333-8333-000000000005', 'Vũ Quốc Em', 'client5@miva.vn', '$2b$10$n6LJ8yiwoKIrrfCiCc8y0OEFwC5BzKAeD6CYzngelKti.rFqkLYZ.', '0909123455', 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150', '2002-03-18', 'male', 310, 'active', NOW() - INTERVAL '95 days', NOW()),
  ('33333333-3333-4333-8333-000000000006', 'Đỗ Mai Phương', 'client6@miva.vn', '$2b$10$n6LJ8yiwoKIrrfCiCc8y0OEFwC5BzKAeD6CYzngelKti.rFqkLYZ.', '0909123456', 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150', '1999-07-22', 'female', 1600, 'active', NOW() - INTERVAL '80 days', NOW()),
  ('33333333-3333-4333-8333-000000000007', 'Bùi Gia Huy', 'client7@miva.vn', '$2b$10$n6LJ8yiwoKIrrfCiCc8y0OEFwC5BzKAeD6CYzngelKti.rFqkLYZ.', '0909123457', 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150', '1997-11-30', 'male', 710, 'active', NOW() - INTERVAL '70 days', NOW()),
  ('33333333-3333-4333-8333-000000000008', 'Hoàng Mỹ Linh', 'client8@miva.vn', '$2b$10$n6LJ8yiwoKIrrfCiCc8y0OEFwC5BzKAeD6CYzngelKti.rFqkLYZ.', '0909123458', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150', '2004-02-14', 'female', 490, 'active', NOW() - INTERVAL '50 days', NOW()),
  ('33333333-3333-4333-8333-000000000009', 'Ngô Minh Khang', 'client9@miva.vn', '$2b$10$n6LJ8yiwoKIrrfCiCc8y0OEFwC5BzKAeD6CYzngelKti.rFqkLYZ.', '0909123459', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150', '1992-08-08', 'male', 2400, 'active', NOW() - INTERVAL '40 days', NOW()),
  ('33333333-3333-4333-8333-000000000010', 'Đặng Thu Thảo', 'client10@miva.vn', '$2b$10$n6LJ8yiwoKIrrfCiCc8y0OEFwC5BzKAeD6CYzngelKti.rFqkLYZ.', '0909123460', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', '1990-06-25', 'female', 920, 'active', NOW() - INTERVAL '25 days', NOW()),
  ('33333333-3333-4333-8333-000000000011', 'Phan Văn Đức', 'client11@miva.vn', '$2b$10$n6LJ8yiwoKIrrfCiCc8y0OEFwC5BzKAeD6CYzngelKti.rFqkLYZ.', '0909123461', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', '1988-04-12', 'male', 1500, 'active', NOW() - INTERVAL '20 days', NOW()),
  ('33333333-3333-4333-8333-000000000012', 'Lý Ngọc Mai', 'client12@miva.vn', '$2b$10$n6LJ8yiwoKIrrfCiCc8y0OEFwC5BzKAeD6CYzngelKti.rFqkLYZ.', '0909123462', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', '1985-10-30', 'female', 600, 'active', NOW() - INTERVAL '15 days', NOW());

-- ------------------------------------------------------------------------------
-- 3. CLIENT ADDRESSES (ĐỊA CHỈ KHÁCH HÀNG)
-- ------------------------------------------------------------------------------
INSERT INTO "ClientAddress" (id, "clientId", "receiverName", phone, "addressLine", ward, district, province, label, "isDefault", "createdAt", "updatedAt")
VALUES
  ('33333333-a001-4000-8000-000000000001', '33333333-3333-4333-8333-000000000001', 'Nguyễn Văn An', '0909123451', 'Số 123 Nguyễn Huệ', 'Phường Bến Nghé', 'Quận 1', 'TP. Hồ Chí Minh', 'Nhà riêng', true, NOW(), NOW()),
  ('33333333-a001-4000-8000-000000000002', '33333333-3333-4333-8333-000000000002', 'Trần Thị Bích', '0909123452', '45 Hoàng Diệu', 'Phường Hải Châu II', 'Quận Hải Châu', 'Đà Nẵng', 'Văn phòng', true, NOW(), NOW()),
  ('33333333-a001-4000-8000-000000000003', '33333333-3333-4333-8333-000000000003', 'Lê Hoàng Cường', '0909123453', '78 Tràng Tiền', 'Phường Tràng Tiền', 'Quận Hoàn Kiếm', 'Hà Nội', 'Nhà riêng', true, NOW(), NOW()),
  ('33333333-a001-4000-8000-000000000004', '33333333-3333-4333-8333-000000000004', 'Phạm Thanh Dung', '0909123454', '12 Lê Lợi', 'Phường Thạch Thang', 'Quận Hải Châu', 'Đà Nẵng', 'Nhà riêng', true, NOW(), NOW()),
  ('33333333-a001-4000-8000-000000000005', '33333333-3333-4333-8333-000000000005', 'Vũ Quốc Em', '0909123455', '99 Nguyễn Văn Cừ', 'Phường An Khánh', 'Quận Ninh Kiều', 'Cần Thơ', 'Nhà riêng', true, NOW(), NOW()),
  ('33333333-a001-4000-8000-000000000006', '33333333-3333-4333-8333-000000000006', 'Đỗ Mai Phương', '0909123456', '55 Cầu Giấy', 'Phường Quan Hoa', 'Quận Cầu Giấy', 'Hà Nội', 'Chung cư', true, NOW(), NOW()),
  ('33333333-a001-4000-8000-000000000007', '33333333-3333-4333-8333-000000000007', 'Bùi Gia Huy', '0909123457', '210 Điện Biên Phủ', 'Phường 7', 'Quận 3', 'TP. Hồ Chí Minh', 'Nhà riêng', true, NOW(), NOW()),
  ('33333333-a001-4000-8000-000000000008', '33333333-3333-4333-8333-000000000008', 'Hoàng Mỹ Linh', '0909123458', '34 Lạch Tray', 'Phường Lạch Tray', 'Quận Ngô Quyền', 'Hải Phòng', 'Nhà riêng', true, NOW(), NOW()),
  ('33333333-a001-4000-8000-000000000009', '33333333-3333-4333-8333-000000000009', 'Ngô Minh Khang', '0909123459', '18 Võ Văn Kiệt', 'Phường Cầu Ông Lãnh', 'Quận 1', 'TP. Hồ Chí Minh', 'Công ty', true, NOW(), NOW()),
  ('33333333-a001-4000-8000-000000000010', '33333333-3333-4333-8333-000000000010', 'Đặng Thu Thảo', '0909123460', '88 Quang Trung', 'Phường 10', 'Quận Gò Vấp', 'TP. Hồ Chí Minh', 'Nhà riêng', true, NOW(), NOW()),
  ('33333333-a001-4000-8000-000000000011', '33333333-3333-4333-8333-000000000011', 'Phan Văn Đức', '0909123461', '102 Phan Chu Trinh', 'Phường Thuận Phước', 'Quận Hải Châu', 'Đà Nẵng', 'Nhà riêng', true, NOW(), NOW()),
  ('33333333-a001-4000-8000-000000000012', '33333333-3333-4333-8333-000000000012', 'Lý Ngọc Mai', '0909123462', '45 Hai Bà Trưng', 'Phường Bến Nghé', 'Quận 1', 'TP. Hồ Chí Minh', 'Văn phòng', true, NOW(), NOW());

-- ------------------------------------------------------------------------------
-- 4. CATEGORIES (DANH MỤC SẢN PHẨM CÓ ĐẦY ĐỦ DESCRIPTION)
-- ------------------------------------------------------------------------------
INSERT INTO "Category" (id, name, slug, description, "createdAt", "updatedAt")
VALUES
  ('ca000000-0000-4000-8000-000000000001', 'Điện thoại & Tablet', 'dien-thoai-tablet', 'Các dòng smartphone và máy tính bảng chính hãng cao cấp từ Apple, Samsung, hỗ trợ công nghệ 5G và AI tiên tiến.', NOW(), NOW()),
  ('ca000000-0000-4000-8000-000000000002', 'Laptop & Máy tính', 'laptop-may-tinh', 'Máy tính xách tay và máy trạm phục vụ công việc văn phòng, lập trình viên, thiết kế đồ họa và giải trí chuyên nghiệp.', NOW(), NOW()),
  ('ca000000-0000-4000-8000-000000000003', 'Thiết bị Âm thanh', 'thiet-bi-am-thanh', 'Tai nghe chống ồn chủ động ANC, tai nghe True Wireless và loa Bluetooth chất âm chuẩn Hi-Res Audio sống động.', NOW(), NOW()),
  ('ca000000-0000-4000-8000-000000000004', 'Phụ kiện Công nghệ', 'phu-kien-cong-nghe', 'Củ sạc nhanh GaN, pin dự phòng dung lượng lớn, cáp truyền dữ liệu và phụ kiện bảo vệ thiết bị cao cấp an toàn.', NOW(), NOW()),
  ('ca000000-0000-4000-8000-000000000005', 'Đồng hồ Thông minh', 'dong-ho-thong-minh', 'Smartwatch thể thao hiện đại, theo dõi chỉ số sức khỏe, điện tâm đồ, giấc ngủ và định vị GPS độ chính xác cao.', NOW(), NOW());

-- ------------------------------------------------------------------------------
-- 5. PRODUCTS (SẢN PHẨM CÔNG NGHỆ CHÍNH HÃNG)
-- ------------------------------------------------------------------------------
INSERT INTO "Product" (id, "categoryId", name, slug, description, status, "createdAt", "updatedAt")
VALUES
  ('ba000000-0000-4000-8000-000000000001', 'ca000000-0000-4000-8000-000000000001', 'iPhone 15 Pro Max 256GB', 'iphone-15-pro-max-256gb', 'Khung viền Titanium chuẩn hàng không vũ trụ, chip Apple A17 Pro mạnh mẽ vượt trội và cụm camera zoom quang học 5x sắc nét.', 'active', NOW() - INTERVAL '100 days', NOW()),
  ('ba000000-0000-4000-8000-000000000002', 'ca000000-0000-4000-8000-000000000001', 'Samsung Galaxy S24 Ultra', 'samsung-galaxy-s24-ultra', 'Quyền năng Galaxy AI đỉnh cao, bút S-Pen tích hợp tiện lợi, vi xử lý Snapdragon 8 Gen 3 for Galaxy bứt phá hiệu năng.', 'active', NOW() - INTERVAL '90 days', NOW()),
  ('ba000000-0000-4000-8000-000000000003', 'ca000000-0000-4000-8000-000000000002', 'MacBook Air M3 13 inch', 'macbook-air-m3-13-inch', 'Thiết kế siêu mỏng nhẹ thanh lịch, chip Apple M3 tối tân cho thời lượng pin lên đến 18 giờ liên tục.', 'active', NOW() - INTERVAL '80 days', NOW()),
  ('ba000000-0000-4000-8000-000000000004', 'ca000000-0000-4000-8000-000000000002', 'Dell XPS 13 Plus 9320', 'dell-xps-13-plus-9320', 'Màn hình OLED 3.5K viền siêu mỏng InfinityEdge, bàn phím tràn cạnh cùng thanh cảm ứng cảm ứng điện dung hiện đại.', 'active', NOW() - INTERVAL '75 days', NOW()),
  ('ba000000-0000-4000-8000-000000000005', 'ca000000-0000-4000-8000-000000000003', 'Tai nghe Sony WH-1000XM5', 'tai-nghe-sony-wh-1000xm5', 'Công nghệ chống ồn chủ động ANC hàng đầu thế giới với bộ xử lý V1 và QN1, chất âm Hi-Res Audio sống động.', 'active', NOW() - INTERVAL '60 days', NOW()),
  ('ba000000-0000-4000-8000-000000000006', 'ca000000-0000-4000-8000-000000000003', 'Apple AirPods Pro 2 MagSafe', 'apple-airpods-pro-2-magsafe', 'Khử tiếng ồn chủ động gấp 2 lần, âm thanh thích ứng tự động điều chỉnh theo môi trường và cổng sạc USB-C tiện dụng.', 'active', NOW() - INTERVAL '50 days', NOW()),
  ('ba000000-0000-4000-8000-000000000007', 'ca000000-0000-4000-8000-000000000004', 'Củ sạc nhanh Anker 65W GaN', 'cu-sac-nhanh-anker-65w-gan', 'Công nghệ GaN III thu nhỏ kích thước tối đa, tích hợp 2 cổng USB-C và 1 cổng USB-A sạc cùng lúc 3 thiết bị.', 'active', NOW() - INTERVAL '40 days', NOW()),
  ('ba000000-0000-4000-8000-000000000008', 'ca000000-0000-4000-8000-000000000005', 'Apple Watch Series 9 GPS 45mm', 'apple-watch-series-9-gps-45mm', 'Thao tác chạm hai lần Double Tap độc đáo, màn hình sáng gấp đôi và chip S9 SiP xử lý tác vụ thần tốc.', 'active', NOW() - INTERVAL '30 days', NOW());

-- ------------------------------------------------------------------------------
-- 6. PRODUCT COLORS & VARIANTS
-- ------------------------------------------------------------------------------
INSERT INTO "ProductColor" (id, "productId", color, "imageUrls", "createdAt", "updatedAt")
VALUES
  ('bc000000-0000-4000-8000-000000000001', 'ba000000-0000-4000-8000-000000000001', 'Titan Tự Nhiên', ARRAY['https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500'], NOW(), NOW()),
  ('bc000000-0000-4000-8000-000000000002', 'ba000000-0000-4000-8000-000000000001', 'Titan Xanh', ARRAY['https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=500'], NOW(), NOW()),
  ('bc000000-0000-4000-8000-000000000003', 'ba000000-0000-4000-8000-000000000002', 'Xám Titan', ARRAY['https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=500'], NOW(), NOW()),
  ('bc000000-0000-4000-8000-000000000004', 'ba000000-0000-4000-8000-000000000003', 'Xanh Midnight', ARRAY['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500'], NOW(), NOW()),
  ('bc000000-0000-4000-8000-000000000005', 'ba000000-0000-4000-8000-000000000004', 'Bạch Kim', ARRAY['https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500'], NOW(), NOW()),
  ('bc000000-0000-4000-8000-000000000006', 'ba000000-0000-4000-8000-000000000005', 'Đen Nhám', ARRAY['https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=500'], NOW(), NOW()),
  ('bc000000-0000-4000-8000-000000000007', 'ba000000-0000-4000-8000-000000000006', 'Trắng Băng Tuyết', ARRAY['https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=500'], NOW(), NOW()),
  ('bc000000-0000-4000-8000-000000000008', 'ba000000-0000-4000-8000-000000000007', 'Đen Phantom', ARRAY['https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=500'], NOW(), NOW()),
  ('bc000000-0000-4000-8000-000000000009', 'ba000000-0000-4000-8000-000000000008', 'Nhôm Bạc', ARRAY['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500'], NOW(), NOW());

INSERT INTO "ProductVariant" (id, "productColorId", size, stock, price, "createdAt", "updatedAt")
VALUES
  ('bd000000-0000-4000-8000-000000000001', 'bc000000-0000-4000-8000-000000000001', '256GB', 45, 29990000, NOW(), NOW()),
  ('bd000000-0000-4000-8000-000000000002', 'bc000000-0000-4000-8000-000000000001', '512GB', 20, 34990000, NOW(), NOW()),
  ('bd000000-0000-4000-8000-000000000003', 'bc000000-0000-4000-8000-000000000002', '256GB', 30, 29990000, NOW(), NOW()),
  ('bd000000-0000-4000-8000-000000000004', 'bc000000-0000-4000-8000-000000000003', '256GB', 35, 27490000, NOW(), NOW()),
  ('bd000000-0000-4000-8000-000000000005', 'bc000000-0000-4000-8000-000000000004', '8GB - 256GB', 25, 26990000, NOW(), NOW()),
  ('bd000000-0000-4000-8000-000000000006', 'bc000000-0000-4000-8000-000000000004', '16GB - 512GB', 15, 32990000, NOW(), NOW()),
  ('bd000000-0000-4000-8000-000000000007', 'bc000000-0000-4000-8000-000000000005', '16GB - 512GB', 12, 38990000, NOW(), NOW()),
  ('bd000000-0000-4000-8000-000000000008', 'bc000000-0000-4000-8000-000000000006', 'Tiêu chuẩn', 60, 6890000, NOW(), NOW()),
  ('bd000000-0000-4000-8000-000000000009', 'bc000000-0000-4000-8000-000000000007', 'Type-C', 80, 5390000, NOW(), NOW()),
  ('bd000000-0000-4000-8000-000000000010', 'bc000000-0000-4000-8000-000000000008', '65W 3 Cổng', 150, 790000, NOW(), NOW()),
  ('bd000000-0000-4000-8000-000000000011', 'bc000000-0000-4000-8000-000000000009', 'Dây Thể Thao 45mm', 40, 10490000, NOW(), NOW());

-- ------------------------------------------------------------------------------
-- 7. VOUCHERS (MÃ KHUYẾN MÃI - CẢ ĐANG HOẠT ĐỘNG VÀ HẾT HẠN)
-- ------------------------------------------------------------------------------
INSERT INTO "Voucher" (id, "adminId", code, name, scope, "discountType", "discountValue", "minOrderAmount", "maxDiscountAmount", quantity, "usedQuantity", "perUserLimit", "startDate", "endDate", status, "createdAt", "updatedAt")
VALUES
  ('fa000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 'CHAOBANMOI', 'Ưu đãi Khách hàng mới 10%', 'platform', 'percentage', 10.00, 500000, 200000, 500, 42, 1, NOW() - INTERVAL '60 days', NOW() + INTERVAL '60 days', 'active', NOW(), NOW()),
  ('fa000000-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', 'CRM2026', 'Giảm trực tiếp 100K mua sắm', 'platform', 'fixed_amount', 100000, 1000000, 100000, 200, 65, 1, NOW() - INTERVAL '30 days', NOW() + INTERVAL '30 days', 'active', NOW(), NOW()),
  ('fa000000-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222223', 'VIPMEMBER', 'Đặc quyền Khách hàng VIP 15%', 'platform', 'percentage', 15.00, 2000000, 1000000, 100, 18, 2, NOW() - INTERVAL '40 days', NOW() + INTERVAL '50 days', 'active', NOW(), NOW()),
  ('fa000000-0000-4000-8000-000000000004', '22222222-2222-4222-8222-222222222224', 'FREESHIP30K', 'Miễn phí vận chuyển 30.000đ', 'platform', 'fixed_amount', 30000, 300000, 30000, 1000, 150, 3, NOW() - INTERVAL '90 days', NOW() + INTERVAL '90 days', 'active', NOW(), NOW()),
  ('fa000000-0000-4000-8000-000000000005', '22222222-2222-4222-8222-222222222222', 'HET_HAN_2026', 'Mã tri ân đợt 1 (Đã hết hạn)', 'platform', 'fixed_amount', 50000, 200000, 50000, 100, 85, 1, NOW() - INTERVAL '120 days', NOW() - INTERVAL '5 days', 'expired', NOW(), NOW()),
  ('fa000000-0000-4000-8000-000000000006', '22222222-2222-4222-8222-222222222222', 'TECHFEST50K', 'Ưu đãi Lễ hội Công nghệ 50.000đ', 'platform', 'fixed_amount', 50000, 500000, 50000, 300, 12, 1, NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days', 'active', NOW(), NOW());

-- ------------------------------------------------------------------------------
-- 8. CARTS & CART ITEMS
-- ------------------------------------------------------------------------------
INSERT INTO "Cart" (id, "clientId", "createdAt", "updatedAt")
VALUES
  ('cc000000-0000-4000-8000-000000000001', '33333333-3333-4333-8333-000000000001', NOW(), NOW()),
  ('cc000000-0000-4000-8000-000000000002', '33333333-3333-4333-8333-000000000003', NOW(), NOW()),
  ('cc000000-0000-4000-8000-000000000003', '33333333-3333-4333-8333-000000000005', NOW(), NOW()),
  ('cc000000-0000-4000-8000-000000000004', '33333333-3333-4333-8333-000000000007', NOW(), NOW()),
  ('cc000000-0000-4000-8000-000000000005', '33333333-3333-4333-8333-000000000011', NOW(), NOW());

INSERT INTO "CartItem" (id, "cartId", "productVariantId", quantity, "createdAt", "updatedAt")
VALUES
  ('cd000000-0000-4000-8000-000000000001', 'cc000000-0000-4000-8000-000000000001', 'bd000000-0000-4000-8000-000000000010', 2, NOW(), NOW()),
  ('cd000000-0000-4000-8000-000000000002', 'cc000000-0000-4000-8000-000000000002', 'bd000000-0000-4000-8000-000000000009', 1, NOW(), NOW()),
  ('cd000000-0000-4000-8000-000000000003', 'cc000000-0000-4000-8000-000000000003', 'bd000000-0000-4000-8000-000000000008', 1, NOW(), NOW()),
  ('cd000000-0000-4000-8000-000000000004', 'cc000000-0000-4000-8000-000000000004', 'bd000000-0000-4000-8000-000000000001', 1, NOW(), NOW()),
  ('cd000000-0000-4000-8000-000000000005', 'cc000000-0000-4000-8000-000000000005', 'bd000000-0000-4000-8000-000000000004', 1, NOW(), NOW());

-- ------------------------------------------------------------------------------
-- 9. ORDERS (20 ĐƠN HÀNG ĐỦ 7 TRẠNG THÁI: completed, shipping, processing, pending, confirmed, cancelled, returned)
-- ------------------------------------------------------------------------------
INSERT INTO "Order" (id, "orderCode", "clientId", "subtotalAmount", "discountAmount", "shippingFee", "totalAmount", status, notes, "receiverName", "receiverPhone", "shippingAddress", "createdAt", "updatedAt")
VALUES
  -- 10 đơn hoàn tất (completed)
  ('da000000-0000-4000-8000-000000000001', 'ORD-2026-0601', '33333333-3333-4333-8333-000000000001', 29990000, 200000, 0, 29790000, 'completed', 'Giao giờ hành chính', 'Nguyễn Văn An', '0909123451', 'Số 123 Nguyễn Huệ, P.Bến Nghé, Q.1, TP.HCM', NOW() - INTERVAL '110 days', NOW() - INTERVAL '107 days'),
  ('da000000-0000-4000-8000-000000000002', 'ORD-2026-0615', '33333333-3333-4333-8333-000000000002', 32990000, 500000, 0, 32490000, 'completed', 'Gọi trước khi giao', 'Trần Thị Bích', '0909123452', '45 Hoàng Diệu, P.Hải Châu II, Q.Hải Châu, Đà Nẵng', NOW() - INTERVAL '95 days', NOW() - INTERVAL '92 days'),
  ('da000000-0000-4000-8000-000000000003', 'ORD-2026-0702', '33333333-3333-4333-8333-000000000003', 6890000, 0, 30000, 6920000, 'completed', 'Để tại quầy bảo vệ', 'Lê Hoàng Cường', '0909123453', '78 Tràng Tiền, P.Tràng Tiền, Q.Hoàn Kiếm, Hà Nội', NOW() - INTERVAL '80 days', NOW() - INTERVAL '78 days'),
  ('da000000-0000-4000-8000-000000000004', 'ORD-2026-0720', '33333333-3333-4333-8333-000000000004', 5390000, 100000, 0, 5290000, 'completed', 'Hàng giá trị cao', 'Phạm Thanh Dung', '0909123454', '12 Lê Lợi, P.Thạch Thang, Q.Hải Châu, Đà Nẵng', NOW() - INTERVAL '65 days', NOW() - INTERVAL '63 days'),
  ('da000000-0000-4000-8000-000000000005', 'ORD-2026-0805', '33333333-3333-4333-8333-000000000005', 790000, 0, 30000, 820000, 'completed', 'Giao buổi chiều', 'Vũ Quốc Em', '0909123455', '99 Nguyễn Văn Cừ, P.An Khánh, Q.Ninh Kiều, Cần Thơ', NOW() - INTERVAL '50 days', NOW() - INTERVAL '48 days'),
  ('da000000-0000-4000-8000-000000000006', 'ORD-2026-0818', '33333333-3333-4333-8333-000000000006', 27490000, 0, 0, 27490000, 'completed', 'Đóng gói cẩn thận', 'Đỗ Mai Phương', '0909123456', '55 Cầu Giấy, P.Quan Hoa, Q.Cầu Giấy, Hà Nội', NOW() - INTERVAL '40 days', NOW() - INTERVAL '37 days'),
  ('da000000-0000-4000-8000-000000000007', 'ORD-2026-0901', '33333333-3333-4333-8333-000000000007', 10490000, 100000, 0, 10390000, 'completed', 'Đơn quà tặng', 'Bùi Gia Huy', '0909123457', '210 Điện Biên Phủ, P.7, Q.3, TP.HCM', NOW() - INTERVAL '25 days', NOW() - INTERVAL '23 days'),
  ('da000000-0000-4000-8000-000000000008', 'ORD-2026-0915', '33333333-3333-4333-8333-000000000008', 5390000, 0, 0, 5390000, 'completed', 'Giao tận tay', 'Hoàng Mỹ Linh', '0909123458', '34 Lạch Tray, P.Lạch Tray, Q.Ngô Quyền, Hải Phòng', NOW() - INTERVAL '15 days', NOW() - INTERVAL '13 days'),
  ('da000000-0000-4000-8000-000000000009', 'ORD-2026-0920', '33333333-3333-4333-8333-000000000009', 26990000, 200000, 0, 26790000, 'completed', 'Giao trước 17h', 'Ngô Minh Khang', '0909123459', '18 Võ Văn Kiệt, P.Cầu Ông Lãnh, Q.1, TP.HCM', NOW() - INTERVAL '12 days', NOW() - INTERVAL '10 days'),
  ('da000000-0000-4000-8000-000000000010', 'ORD-2026-0928', '33333333-3333-4333-8333-000000000010', 10490000, 50000, 0, 10440000, 'completed', 'Hàng nguyên seal', 'Đặng Thu Thảo', '0909123460', '88 Quang Trung, P.10, Q.Gò Vấp, TP.HCM', NOW() - INTERVAL '8 days', NOW() - INTERVAL '6 days'),

  -- 2 đơn đang vận chuyển (shipping)
  ('da000000-0000-4000-8000-000000000011', 'ORD-2026-1002', '33333333-3333-4333-8333-000000000011', 29990000, 0, 0, 29990000, 'shipping', 'Đang vận chuyển liên tỉnh', 'Phan Văn Đức', '0909123461', '102 Phan Chu Trinh, Q.Hải Châu, Đà Nẵng', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 days'),
  ('da000000-0000-4000-8000-000000000012', 'ORD-2026-1008', '33333333-3333-4333-8333-000000000012', 790000, 0, 25000, 815000, 'shipping', 'Shipper đang đi giao', 'Lý Ngọc Mai', '0909123462', '45 Hai Bà Trưng, P.Bến Nghé, Q.1, TP.HCM', NOW() - INTERVAL '2 days', NOW()),

  -- 2 đơn đang đóng gói (processing)
  ('da000000-0000-4000-8000-000000000013', 'ORD-2026-1015', '33333333-3333-4333-8333-000000000001', 38990000, 500000, 0, 38490000, 'processing', 'Kho đang chuẩn bị hàng', 'Nguyễn Văn An', '0909123451', 'Số 123 Nguyễn Huệ, P.Bến Nghé, Q.1, TP.HCM', NOW() - INTERVAL '1 days', NOW()),
  ('da000000-0000-4000-8000-000000000014', 'ORD-2026-1020', '33333333-3333-4333-8333-000000000002', 6890000, 0, 30000, 6920000, 'returned', 'Khách hoàn trả sản phẩm nguyên seal, đã hoàn tiền', 'Trần Thị Bích', '0909123452', '45 Hoàng Diệu, P.Hải Châu II, Q.Hải Châu, Đà Nẵng', NOW() - INTERVAL '18 hours', NOW()),

  -- 2 đơn đã xác nhận (confirmed)
  ('da000000-0000-4000-8000-000000000015', 'ORD-2026-1022', '33333333-3333-4333-8333-000000000004', 32990000, 200000, 0, 32790000, 'confirmed', 'Đã xác nhận đơn', 'Phạm Thanh Dung', '0909123454', '12 Lê Lợi, P.Thạch Thang, Q.Hải Châu, Đà Nẵng', NOW() - INTERVAL '12 hours', NOW()),
  ('da000000-0000-4000-8000-000000000016', 'ORD-2026-1024', '33333333-3333-4333-8333-000000000005', 5390000, 0, 30000, 5420000, 'confirmed', 'Đã gọi xác nhận', 'Vũ Quốc Em', '0909123455', '99 Nguyễn Văn Cừ, P.An Khánh, Q.Ninh Kiều, Cần Thơ', NOW() - INTERVAL '8 hours', NOW()),

  -- 2 đơn chờ xử lý (pending)
  ('da000000-0000-4000-8000-000000000017', 'ORD-2026-1026', '33333333-3333-4333-8333-000000000006', 29990000, 0, 0, 29990000, 'pending', 'Khách thanh toán MoMo', 'Đỗ Mai Phương', '0909123456', '55 Cầu Giấy, P.Quan Hoa, Q.Cầu Giấy, Hà Nội', NOW() - INTERVAL '4 hours', NOW()),
  ('da000000-0000-4000-8000-000000000018', 'ORD-2026-1027', '33333333-3333-4333-8333-000000000007', 1580000, 30000, 0, 1550000, 'pending', 'Khách chọn thanh toán COD', 'Bùi Gia Huy', '0909123457', '210 Điện Biên Phủ, P.7, Q.3, TP.HCM', NOW() - INTERVAL '1 hours', NOW()),

  -- 1 đơn đã hủy (cancelled)
  ('da000000-0000-4000-8000-000000000019', 'ORD-2026-0925', '33333333-3333-4333-8333-000000000003', 27490000, 0, 0, 27490000, 'cancelled', 'Khách đổi ý muốn mua màu khác', 'Lê Hoàng Cường', '0909123453', '78 Tràng Tiền, P.Tràng Tiền, Q.Hoàn Kiếm, Hà Nội', NOW() - INTERVAL '20 days', NOW() - INTERVAL '19 days'),

  -- 1 đơn hoàn trả & hoàn tiền (returned)
  ('da000000-0000-4000-8000-000000000020', 'ORD-2026-0930', '33333333-3333-4333-8333-000000000008', 6890000, 0, 30000, 6920000, 'returned', 'Khách hoàn trả do nhầm phiên bản, đã hoàn tiền', 'Hoàng Mỹ Linh', '0909123458', '34 Lạch Tray, P.Lạch Tray, Q.Ngô Quyền, Hải Phòng', NOW() - INTERVAL '14 days', NOW() - INTERVAL '10 days');

-- ------------------------------------------------------------------------------
-- 10. ORDER DETAILS (CHI TIẾT ĐƠN HÀNG)
-- ------------------------------------------------------------------------------
INSERT INTO "OrderDetail" (id, "orderId", "productVariantId", quantity, price, "productName", "colorName", "sizeName", "imageUrl")
VALUES
  ('db000000-0000-4000-8000-000000000001', 'da000000-0000-4000-8000-000000000001', 'bd000000-0000-4000-8000-000000000001', 1, 29990000, 'iPhone 15 Pro Max 256GB', 'Titan Tự Nhiên', '256GB', 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500'),
  ('db000000-0000-4000-8000-000000000002', 'da000000-0000-4000-8000-000000000002', 'bd000000-0000-4000-8000-000000000006', 1, 32990000, 'MacBook Air M3 13 inch', 'Xanh Midnight', '16GB - 512GB', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500'),
  ('db000000-0000-4000-8000-000000000003', 'da000000-0000-4000-8000-000000000003', 'bd000000-0000-4000-8000-000000000008', 1, 6890000, 'Tai nghe Sony WH-1000XM5', 'Đen Nhám', 'Tiêu chuẩn', 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=500'),
  ('db000000-0000-4000-8000-000000000004', 'da000000-0000-4000-8000-000000000004', 'bd000000-0000-4000-8000-000000000009', 1, 5390000, 'Apple AirPods Pro 2 MagSafe', 'Trắng Băng Tuyết', 'Type-C', 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=500'),
  ('db000000-0000-4000-8000-000000000005', 'da000000-0000-4000-8000-000000000005', 'bd000000-0000-4000-8000-000000000010', 1, 790000, 'Củ sạc nhanh Anker 65W GaN', 'Đen Phantom', '65W 3 Cổng', 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=500'),
  ('db000000-0000-4000-8000-000000000006', 'da000000-0000-4000-8000-000000000006', 'bd000000-0000-4000-8000-000000000004', 1, 27490000, 'Samsung Galaxy S24 Ultra', 'Xám Titan', '256GB', 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=500'),
  ('db000000-0000-4000-8000-000000000007', 'da000000-0000-4000-8000-000000000007', 'bd000000-0000-4000-8000-000000000011', 1, 10490000, 'Apple Watch Series 9 GPS 45mm', 'Nhôm Bạc', 'Dây Thể Thao 45mm', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500'),
  ('db000000-0000-4000-8000-000000000008', 'da000000-0000-4000-8000-000000000008', 'bd000000-0000-4000-8000-000000000009', 1, 5390000, 'Apple AirPods Pro 2 MagSafe', 'Trắng Băng Tuyết', 'Type-C', 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=500'),
  ('db000000-0000-4000-8000-000000000009', 'da000000-0000-4000-8000-000000000009', 'bd000000-0000-4000-8000-000000000005', 1, 26990000, 'MacBook Air M3 13 inch', 'Xanh Midnight', '8GB - 256GB', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500'),
  ('db000000-0000-4000-8000-000000000010', 'da000000-0000-4000-8000-000000000010', 'bd000000-0000-4000-8000-000000000011', 1, 10490000, 'Apple Watch Series 9 GPS 45mm', 'Nhôm Bạc', 'Dây Thể Thao 45mm', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500'),
  ('db000000-0000-4000-8000-000000000011', 'da000000-0000-4000-8000-000000000011', 'bd000000-0000-4000-8000-000000000001', 1, 29990000, 'iPhone 15 Pro Max 256GB', 'Titan Tự Nhiên', '256GB', 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500'),
  ('db000000-0000-4000-8000-000000000012', 'da000000-0000-4000-8000-000000000012', 'bd000000-0000-4000-8000-000000000010', 1, 790000, 'Củ sạc nhanh Anker 65W GaN', 'Đen Phantom', '65W 3 Cổng', 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=500'),
  ('db000000-0000-4000-8000-000000000013', 'da000000-0000-4000-8000-000000000013', 'bd000000-0000-4000-8000-000000000007', 1, 38990000, 'Dell XPS 13 Plus 9320', 'Bạch Kim', '16GB - 512GB', 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500'),
  ('db000000-0000-4000-8000-000000000014', 'da000000-0000-4000-8000-000000000014', 'bd000000-0000-4000-8000-000000000008', 1, 6890000, 'Tai nghe Sony WH-1000XM5', 'Đen Nhám', 'Tiêu chuẩn', 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=500'),
  ('db000000-0000-4000-8000-000000000015', 'da000000-0000-4000-8000-000000000015', 'bd000000-0000-4000-8000-000000000006', 1, 32990000, 'MacBook Air M3 13 inch', 'Xanh Midnight', '16GB - 512GB', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500'),
  ('db000000-0000-4000-8000-000000000016', 'da000000-0000-4000-8000-000000000016', 'bd000000-0000-4000-8000-000000000009', 1, 5390000, 'Apple AirPods Pro 2 MagSafe', 'Trắng Băng Tuyết', 'Type-C', 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=500'),
  ('db000000-0000-4000-8000-000000000017', 'da000000-0000-4000-8000-000000000017', 'bd000000-0000-4000-8000-000000000003', 1, 29990000, 'iPhone 15 Pro Max 256GB', 'Titan Xanh', '256GB', 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=500'),
  ('db000000-0000-4000-8000-000000000018', 'da000000-0000-4000-8000-000000000018', 'bd000000-0000-4000-8000-000000000010', 2, 790000, 'Củ sạc nhanh Anker 65W GaN', 'Đen Phantom', '65W 3 Cổng', 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=500'),
  ('db000000-0000-4000-8000-000000000019', 'da000000-0000-4000-8000-000000000019', 'bd000000-0000-4000-8000-000000000004', 1, 27490000, 'Samsung Galaxy S24 Ultra', 'Xám Titan', '256GB', 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=500'),
  ('db000000-0000-4000-8000-000000000020', 'da000000-0000-4000-8000-000000000020', 'bd000000-0000-4000-8000-000000000008', 1, 6890000, 'Tai nghe Sony WH-1000XM5', 'Đen Nhám', 'Tiêu chuẩn', 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=500');

-- ------------------------------------------------------------------------------
-- 11. PAYMENTS (THANH TOÁN)
-- ------------------------------------------------------------------------------
INSERT INTO "Payment" (id, "orderId", method, amount, status, "transactionCode", gateway, "paidAt", "refundedAt", "createdAt", "updatedAt")
VALUES
  ('dc000000-0000-4000-8000-000000000001', 'da000000-0000-4000-8000-000000000001', 'vnpay', 29790000, 'paid', 'VNP202606010001', 'vnpay', NOW() - INTERVAL '110 days', NULL, NOW() - INTERVAL '110 days', NOW()),
  ('dc000000-0000-4000-8000-000000000002', 'da000000-0000-4000-8000-000000000002', 'credit_card', 32490000, 'paid', 'CC202606150002', 'stripe', NOW() - INTERVAL '95 days', NULL, NOW() - INTERVAL '95 days', NOW()),
  ('dc000000-0000-4000-8000-000000000003', 'da000000-0000-4000-8000-000000000003', 'momo', 6920000, 'paid', 'MOMO202607020003', 'momo', NOW() - INTERVAL '80 days', NULL, NOW() - INTERVAL '80 days', NOW()),
  ('dc000000-0000-4000-8000-000000000004', 'da000000-0000-4000-8000-000000000004', 'bank_transfer', 5290000, 'paid', 'MB202607200004', 'bank', NOW() - INTERVAL '65 days', NULL, NOW() - INTERVAL '65 days', NOW()),
  ('dc000000-0000-4000-8000-000000000005', 'da000000-0000-4000-8000-000000000005', 'cod', 820000, 'paid', 'COD202608050005', 'cash', NOW() - INTERVAL '48 days', NULL, NOW() - INTERVAL '50 days', NOW()),
  ('dc000000-0000-4000-8000-000000000006', 'da000000-0000-4000-8000-000000000006', 'vnpay', 27490000, 'paid', 'VNP202608180006', 'vnpay', NOW() - INTERVAL '40 days', NULL, NOW() - INTERVAL '40 days', NOW()),
  ('dc000000-0000-4000-8000-000000000007', 'da000000-0000-4000-8000-000000000007', 'zalopay', 10390000, 'paid', 'ZALO202609010007', 'zalopay', NOW() - INTERVAL '25 days', NULL, NOW() - INTERVAL '25 days', NOW()),
  ('dc000000-0000-4000-8000-000000000008', 'da000000-0000-4000-8000-000000000008', 'momo', 5390000, 'paid', 'MOMO202609150008', 'momo', NOW() - INTERVAL '15 days', NULL, NOW() - INTERVAL '15 days', NOW()),
  ('dc000000-0000-4000-8000-000000000009', 'da000000-0000-4000-8000-000000000009', 'vnpay', 26790000, 'paid', 'VNP202609200009', 'vnpay', NOW() - INTERVAL '12 days', NULL, NOW() - INTERVAL '12 days', NOW()),
  ('dc000000-0000-4000-8000-000000000010', 'da000000-0000-4000-8000-000000000010', 'zalopay', 10440000, 'paid', 'ZALO202609280010', 'zalopay', NOW() - INTERVAL '8 days', NULL, NOW() - INTERVAL '8 days', NOW()),
  ('dc000000-0000-4000-8000-000000000011', 'da000000-0000-4000-8000-000000000011', 'bank_transfer', 29990000, 'paid', 'VCB202610020011', 'bank', NOW() - INTERVAL '3 days', NULL, NOW() - INTERVAL '3 days', NOW()),
  ('dc000000-0000-4000-8000-000000000012', 'da000000-0000-4000-8000-000000000012', 'cod', 815000, 'pending', 'COD202610080012', 'cash', NULL, NULL, NOW() - INTERVAL '2 days', NOW()),
  ('dc000000-0000-4000-8000-000000000013', 'da000000-0000-4000-8000-000000000013', 'bank_transfer', 38490000, 'paid', 'VCB202610150013', 'bank', NOW() - INTERVAL '1 days', NULL, NOW() - INTERVAL '1 days', NOW()),
  ('dc000000-0000-4000-8000-000000000014', 'da000000-0000-4000-8000-000000000014', 'momo', 6920000, 'refunded', 'MOMO202610200014', 'momo', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 days', NOW() - INTERVAL '2 days', NOW()),
  ('dc000000-0000-4000-8000-000000000015', 'da000000-0000-4000-8000-000000000015', 'vnpay', 32790000, 'paid', 'VNP202610220015', 'vnpay', NOW() - INTERVAL '12 hours', NULL, NOW() - INTERVAL '12 hours', NOW()),
  ('dc000000-0000-4000-8000-000000000016', 'da000000-0000-4000-8000-000000000016', 'cod', 5420000, 'pending', 'COD202610240016', 'cash', NULL, NULL, NOW() - INTERVAL '8 hours', NOW()),
  ('dc000000-0000-4000-8000-000000000017', 'da000000-0000-4000-8000-000000000017', 'momo', 29990000, 'pending', 'MOMO202610260017', 'momo', NULL, NULL, NOW() - INTERVAL '4 hours', NOW()),
  ('dc000000-0000-4000-8000-000000000018', 'da000000-0000-4000-8000-000000000018', 'cod', 1550000, 'pending', 'COD202610270018', 'cash', NULL, NULL, NOW() - INTERVAL '1 hours', NOW()),
  ('dc000000-0000-4000-8000-000000000019', 'da000000-0000-4000-8000-000000000019', 'vnpay', 27490000, 'cancelled', 'VNP202609250019', 'vnpay', NULL, NULL, NOW() - INTERVAL '20 days', NOW()),
  ('dc000000-0000-4000-8000-000000000020', 'da000000-0000-4000-8000-000000000020', 'momo', 6920000, 'refunded', 'MOMO202609300020', 'momo', NOW() - INTERVAL '14 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '14 days', NOW());

-- ------------------------------------------------------------------------------
-- 12. ORDER STATUS HISTORY (DÒNG THỜI GIAN ĐƠN HÀNG)
-- ------------------------------------------------------------------------------
INSERT INTO "OrderStatusHistory" (id, "orderId", "adminId", "clientId", "fromStatus", "toStatus", note, "createdAt")
VALUES
  ('dd000000-0000-4000-8000-000000000001', 'da000000-0000-4000-8000-000000000001', NULL, '33333333-3333-4333-8333-000000000001', NULL, 'pending', 'Khách hàng tạo đơn hàng', NOW() - INTERVAL '110 days'),
  ('dd000000-0000-4000-8000-000000000002', 'da000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', NULL, 'pending', 'confirmed', 'Quản lý CRM xác nhận thanh toán', NOW() - INTERVAL '109 days 20 hours'),
  ('dd000000-0000-4000-8000-000000000003', 'da000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', NULL, 'confirmed', 'shipping', 'Bàn giao cho đơn vị vận chuyển', NOW() - INTERVAL '109 days'),
  ('dd000000-0000-4000-8000-000000000004', 'da000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', NULL, 'shipping', 'completed', 'Khách đã nhận hàng thành công', NOW() - INTERVAL '107 days'),
  ('dd000000-0000-4000-8000-000000000005', 'da000000-0000-4000-8000-000000000011', '22222222-2222-4222-8222-222222222223', NULL, 'processing', 'shipping', 'Đơn hàng đang trên đường giao đến bạn', NOW() - INTERVAL '1 days'),
  ('dd000000-0000-4000-8000-000000000006', 'da000000-0000-4000-8000-000000000019', NULL, '33333333-3333-4333-8333-000000000003', 'pending', 'cancelled', 'Khách hủy đơn trực tiếp trên ứng dụng', NOW() - INTERVAL '19 days'),
  ('dd000000-0000-4000-8000-000000000007', 'da000000-0000-4000-8000-000000000020', '22222222-2222-4222-8222-222222222222', NULL, 'completed', 'returned', 'Đã tiếp nhận sản phẩm hoàn trả và hoàn tiền qua ví MoMo', NOW() - INTERVAL '10 days');

-- ------------------------------------------------------------------------------
-- 13. REVIEWS (12 ĐÁNH GIÁ SẢN PHẨM & PHẢN HỒI CRM)
-- 7 ĐÃ TRẢ LỜI + 5 CHỜ CRM TRẢ LỜI
-- ------------------------------------------------------------------------------
INSERT INTO "Review" (id, "clientId", "productId", "orderDetailId", content, rating, "adminReply", "repliedAt", "createdAt", "updatedAt")
VALUES
  -- 7 Đánh giá ĐÃ ĐƯỢC CRM Manager phản hồi chăm sóc khách hàng
  ('ea000000-0000-4000-8000-000000000001', '33333333-3333-4333-8333-000000000001', 'ba000000-0000-4000-8000-000000000001', 'db000000-0000-4000-8000-000000000001', 'Máy nguyên seal cực đẹp, màu Titan tự nhiên nhìn sang xịn mịn. Giao hàng 2 tiếng là tới!', 5, 'Dạ MIVA xin chân thành cảm ơn anh An đã tin tưởng ủng hộ! Chúc anh có những trải nghiệm tuyệt vời cùng siêu phẩm iPhone 15 Pro Max ạ.', NOW() - INTERVAL '105 days', NOW() - INTERVAL '106 days', NOW()),
  ('ea000000-0000-4000-8000-000000000002', '33333333-3333-4333-8333-000000000002', 'ba000000-0000-4000-8000-000000000003', 'db000000-0000-4000-8000-000000000002', 'MacBook Air M3 chạy êm ru, pin trâu làm việc cả ngày không cần sạc. Bàn phím gõ rất thích.', 5, 'Chào chị Bích, đội ngũ MIVA rất vui vì chị hài lòng với sản phẩm. Nếu cần hỗ trợ cài đặt ứng dụng chị cứ nhắn hotline nhé ạ!', NOW() - INTERVAL '90 days', NOW() - INTERVAL '91 days', NOW()),
  ('ea000000-0000-4000-8000-000000000003', '33333333-3333-4333-8333-000000000003', 'ba000000-0000-4000-8000-000000000005', 'db000000-0000-4000-8000-000000000003', 'Chống ồn đỉnh chóp, đeo êm tai không bị cấn. Điểm trừ nhỏ là hộp đựng hơi to so với đời XM4.', 4, 'Cảm ơn anh Cường đã đánh giá chi tiết! MIVA xin ghi nhận phản hồi về thiết kế case đựng để gửi tới hãng cải tiến thêm ạ.', NOW() - INTERVAL '76 days', NOW() - INTERVAL '77 days', NOW()),
  ('ea000000-0000-4000-8000-000000000004', '33333333-3333-4333-8333-000000000004', 'ba000000-0000-4000-8000-000000000006', 'db000000-0000-4000-8000-000000000004', 'AirPods chính hãng, kết nối iPhone mượt mà, mic đàm thoại rõ ràng kể cả khi đi xe máy.', 5, 'Cảm ơn chị Dung đã gửi feedback xịn cho MIVA! Chúc chị một tuần mới thật nhiều năng lượng ạ.', NOW() - INTERVAL '61 days', NOW() - INTERVAL '62 days', NOW()),
  ('ea000000-0000-4000-8000-000000000005', '33333333-3333-4333-8333-000000000005', 'ba000000-0000-4000-8000-000000000007', 'db000000-0000-4000-8000-000000000005', 'Củ sạc nhỏ gọn mà công suất 65W sạc được cho cả laptop Dell và điện thoại cùng lúc, quá ưng ý!', 5, 'MIVA xin cảm ơn anh Em rất nhiều! Sản phẩm được bảo hành 18 tháng chính hãng Anker anh an tâm sử dụng nhé.', NOW() - INTERVAL '46 days', NOW() - INTERVAL '47 days', NOW()),
  ('ea000000-0000-4000-8000-000000000006', '33333333-3333-4333-8333-000000000006', 'ba000000-0000-4000-8000-000000000002', 'db000000-0000-4000-8000-000000000006', 'S24 Ultra chụp trăng và zoom 100x nét căng. Màn hình phẳng dán cường lực dễ hơn hẳn đời trước.', 5, 'Dạ cảm ơn chị Phương đã ủng hộ MIVA! Dòng S24 Ultra quả thật chụp ảnh đỉnh cao luôn ạ.', NOW() - INTERVAL '35 days', NOW() - INTERVAL '36 days', NOW()),
  ('ea000000-0000-4000-8000-000000000007', '33333333-3333-4333-8333-000000000009', 'ba000000-0000-4000-8000-000000000003', 'db000000-0000-4000-8000-000000000009', 'Máy nhẹ nhàng thuận tiện di chuyển, cấu hình 8GB đủ dùng các tác vụ văn phòng cơ bản.', 4, 'Cảm ơn anh Khang đã tin dùng sản phẩm tại MIVA! Chúc anh có thêm nhiều trải nghiệm hài lòng.', NOW() - INTERVAL '9 days', NOW() - INTERVAL '10 days', NOW()),

  -- 5 Đánh giá MỚI (CHƯA ĐƯỢC TRẢ LỜI - adminReply IS NULL để test nút Reply trên CRM)
  ('ea000000-0000-4000-8000-000000000008', '33333333-3333-4333-8333-000000000007', 'ba000000-0000-4000-8000-000000000008', 'db000000-0000-4000-8000-000000000007', 'Đồng hồ hiển thị đẹp, tính năng Double Tap nhạy. Tuy nhiên pin chỉ được tầm 1.5 ngày.', 4, NULL, NULL, NOW() - INTERVAL '21 days', NOW()),
  ('ea000000-0000-4000-8000-000000000009', '33333333-3333-4333-8333-000000000008', 'ba000000-0000-4000-8000-000000000006', 'db000000-0000-4000-8000-000000000008', 'Giao hàng hơi lâu hơn dự kiến 1 ngày, nhưng tai nghe dùng rất tốt, âm bass dày dặn.', 4, NULL, NULL, NOW() - INTERVAL '11 days', NOW()),
  ('ea000000-0000-4000-8000-000000000010', '33333333-3333-4333-8333-000000000010', 'ba000000-0000-4000-8000-000000000008', 'db000000-0000-4000-8000-000000000010', 'Apple Watch đeo vừa vặn, màu nhôm bạc rất dễ phối đồ đi làm hoặc đi chơi.', 5, NULL, NULL, NOW() - INTERVAL '5 days', NOW()),
  ('ea000000-0000-4000-8000-000000000011', '33333333-3333-4333-8333-000000000011', 'ba000000-0000-4000-8000-000000000004', NULL, 'Có được bảo hành tận nơi cho dòng máy tính Dell XPS 13 không shop?', 5, NULL, NULL, NOW() - INTERVAL '3 days', NOW()),
  ('ea000000-0000-4000-8000-000000000012', '33333333-3333-4333-8333-000000000012', 'ba000000-0000-4000-8000-000000000007', NULL, 'Hàng xịn, nhân viên tư vấn nhiệt tình, đóng gói có bọc bóng khí rất chu đáo.', 5, NULL, NULL, NOW() - INTERVAL '1 days', NOW());

-- ------------------------------------------------------------------------------
-- 14. SURVEYS, QUESTIONS, OPTIONS & RESPONSES (TRỌNG TÂM CRM KHẢO SÁT & BÁO CÁO)
-- ------------------------------------------------------------------------------
INSERT INTO "Survey" (id, "adminId", title, description, "imageUrl", scope, "audienceType", "recipientIds", "triggerType", status, "startDate", "endDate", "createdAt", "updatedAt")
VALUES
  ('eb000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 'Khảo sát Mức độ Hài lòng Dịch vụ & Trải nghiệm Mua sắm 2026', 'Ý kiến quý báu của quý khách giúp MIVA không ngừng nâng cao chất lượng dịch vụ và sản phẩm.', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600', 'platform', 'all_users', ARRAY[]::UUID[], 'manual', 'active', NOW() - INTERVAL '45 days', NOW() + INTERVAL '45 days', NOW() - INTERVAL '45 days', NOW()),
  ('eb000000-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222223', 'Khảo sát Đánh giá Trải nghiệm Sau Mua Hàng', 'Khảo sát nhanh dành cho quý khách hàng đã hoàn thành đơn hàng tại hệ thống MIVA.', 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=600', 'platform', 'all_users', ARRAY[]::UUID[], 'after_order_completed', 'active', NOW() - INTERVAL '30 days', NOW() + INTERVAL '60 days', NOW() - INTERVAL '30 days', NOW()),
  ('eb000000-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222224', 'Khảo sát Nhu cầu Mua sắm Công nghệ Mùa Tựu Trường', 'Khảo sát đã hoàn thành đợt thu thập ý kiến khách hàng năm học 2026.', 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600', 'platform', 'all_users', ARRAY[]::UUID[], 'manual', 'closed', NOW() - INTERVAL '90 days', NOW() - INTERVAL '15 days', NOW() - INTERVAL '90 days', NOW());

-- Câu hỏi cho Khảo sát 1 (Trải nghiệm dịch vụ)
INSERT INTO "SurveyQuestion" (id, "surveyId", question, type, required, position, "createdAt", "updatedAt")
VALUES
  ('ec000000-0000-4000-8000-000000000001', 'eb000000-0000-4000-8000-000000000001', 'Bạn đánh giá mức độ hài lòng về tốc độ tải trang và giao diện website MIVA thế nào?', 'rating', true, 1, NOW(), NOW()),
  ('ec000000-0000-4000-8000-000000000002', 'eb000000-0000-4000-8000-000000000001', 'Thời gian giao nhận hàng thực tế so với kỳ vọng của bạn như thế nào?', 'single_choice', true, 2, NOW(), NOW()),
  ('ec000000-0000-4000-8000-000000000003', 'eb000000-0000-4000-8000-000000000001', 'Phương thức thanh toán nào bạn cảm thấy tiện lợi nhất khi mua sắm?', 'single_choice', true, 3, NOW(), NOW()),
  ('ec000000-0000-4000-8000-000000000004', 'eb000000-0000-4000-8000-000000000001', 'Bạn có góp ý hoặc đề xuất gì thêm để chúng tôi nâng cao chất lượng phục vụ không?', 'text', false, 4, NOW(), NOW()),

  -- Câu hỏi cho Khảo sát 2 (Sau mua hàng)
  ('ec000000-0000-4000-8000-000000000005', 'eb000000-0000-4000-8000-000000000002', 'Mức độ hài lòng chung về sản phẩm bạn nhận được?', 'rating', true, 1, NOW(), NOW()),
  ('ec000000-0000-4000-8000-000000000006', 'eb000000-0000-4000-8000-000000000002', 'Thái độ phục vụ của nhân viên giao hàng như thế nào?', 'single_choice', true, 2, NOW(), NOW());

-- Lựa chọn trả lời (Options)
INSERT INTO "SurveyOption" (id, "questionId", content, position, "createdAt")
VALUES
  -- Cho câu hỏi 2: Giao hàng
  ('ed000000-0000-4000-8000-000000000001', 'ec000000-0000-4000-8000-000000000002', 'Rất nhanh (sớm hơn dự kiến)', 1, NOW()),
  ('ed000000-0000-4000-8000-000000000002', 'ec000000-0000-4000-8000-000000000002', 'Đúng hẹn như cam kết', 2, NOW()),
  ('ed000000-0000-4000-8000-000000000003', 'ec000000-0000-4000-8000-000000000002', 'Hơi chậm một chút', 3, NOW()),
  ('ed000000-0000-4000-8000-000000000004', 'ec000000-0000-4000-8000-000000000002', 'Rất chậm', 4, NOW()),

  -- Cho câu hỏi 3: Phương thức thanh toán
  ('ed000000-0000-4000-8000-000000000005', 'ec000000-0000-4000-8000-000000000003', 'Ví điện tử MoMo / ZaloPay', 1, NOW()),
  ('ed000000-0000-4000-8000-000000000006', 'ec000000-0000-4000-8000-000000000003', 'Cổng thanh toán VNPay (QR Code)', 2, NOW()),
  ('ed000000-0000-4000-8000-000000000007', 'ec000000-0000-4000-8000-000000000003', 'Thanh toán khi nhận hàng (COD)', 3, NOW()),
  ('ed000000-0000-4000-8000-000000000008', 'ec000000-0000-4000-8000-000000000003', 'Chuyển khoản ngân hàng trực tiếp', 4, NOW()),

  -- Cho câu hỏi 6: Thái độ shipper
  ('ed000000-0000-4000-8000-000000000009', 'ec000000-0000-4000-8000-000000000006', 'Rất thân thiện & lịch sự', 1, NOW()),
  ('ed000000-0000-4000-8000-000000000010', 'ec000000-0000-4000-8000-000000000006', 'Bình thường', 2, NOW()),
  ('ed000000-0000-4000-8000-000000000011', 'ec000000-0000-4000-8000-000000000006', 'Chưa nhiệt tình', 3, NOW());

-- Phản hồi khảo sát (SurveyResponse)
INSERT INTO "SurveyResponse" (id, "surveyId", "clientId", "orderId", "deliveryKey", status, "submittedAt", "createdAt", "updatedAt")
VALUES
  ('ee000000-0000-4000-8000-000000000001', 'eb000000-0000-4000-8000-000000000001', '33333333-3333-4333-8333-000000000001', 'da000000-0000-4000-8000-000000000001', 'KEY-CLIENT1-SURVEY1', 'submitted', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days', NOW()),
  ('ee000000-0000-4000-8000-000000000002', 'eb000000-0000-4000-8000-000000000001', '33333333-3333-4333-8333-000000000002', 'da000000-0000-4000-8000-000000000002', 'KEY-CLIENT2-SURVEY1', 'submitted', NOW() - INTERVAL '28 days', NOW() - INTERVAL '28 days', NOW()),
  ('ee000000-0000-4000-8000-000000000003', 'eb000000-0000-4000-8000-000000000001', '33333333-3333-4333-8333-000000000003', 'da000000-0000-4000-8000-000000000003', 'KEY-CLIENT3-SURVEY1', 'submitted', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days', NOW()),
  ('ee000000-0000-4000-8000-000000000004', 'eb000000-0000-4000-8000-000000000001', '33333333-3333-4333-8333-000000000004', 'da000000-0000-4000-8000-000000000004', 'KEY-CLIENT4-SURVEY1', 'submitted', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days', NOW()),
  ('ee000000-0000-4000-8000-000000000005', 'eb000000-0000-4000-8000-000000000001', '33333333-3333-4333-8333-000000000005', 'da000000-0000-4000-8000-000000000005', 'KEY-CLIENT5-SURVEY1', 'submitted', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days', NOW()),
  ('ee000000-0000-4000-8000-000000000006', 'eb000000-0000-4000-8000-000000000001', '33333333-3333-4333-8333-000000000006', 'da000000-0000-4000-8000-000000000006', 'KEY-CLIENT6-SURVEY1', 'submitted', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days', NOW()),
  ('ee000000-0000-4000-8000-000000000007', 'eb000000-0000-4000-8000-000000000001', '33333333-3333-4333-8333-000000000007', 'da000000-0000-4000-8000-000000000007', 'KEY-CLIENT7-SURVEY1', 'submitted', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NOW()),
  ('ee000000-0000-4000-8000-000000000008', 'eb000000-0000-4000-8000-000000000001', '33333333-3333-4333-8333-000000000008', NULL, 'KEY-CLIENT8-SURVEY1', 'pending', NULL, NOW() - INTERVAL '3 days', NOW()),

  -- Khảo sát 2
  ('ee000000-0000-4000-8000-000000000009', 'eb000000-0000-4000-8000-000000000002', '33333333-3333-4333-8333-000000000001', 'da000000-0000-4000-8000-000000000001', 'KEY-CLIENT1-SURVEY2', 'submitted', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days', NOW()),
  ('ee000000-0000-4000-8000-000000000010', 'eb000000-0000-4000-8000-000000000002', '33333333-3333-4333-8333-000000000002', 'da000000-0000-4000-8000-000000000002', 'KEY-CLIENT2-SURVEY2', 'submitted', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days', NOW()),
  ('ee000000-0000-4000-8000-000000000011', 'eb000000-0000-4000-8000-000000000002', '33333333-3333-4333-8333-000000000004', 'da000000-0000-4000-8000-000000000004', 'KEY-CLIENT4-SURVEY2', 'submitted', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days', NOW()),
  ('ee000000-0000-4000-8000-000000000012', 'eb000000-0000-4000-8000-000000000002', '33333333-3333-4333-8333-000000000009', 'da000000-0000-4000-8000-000000000009', 'KEY-CLIENT9-SURVEY2', 'submitted', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days', NOW());

-- Câu trả lời chi tiết (SurveyAnswer)
INSERT INTO "SurveyAnswer" (id, "responseId", "questionId", "optionId", "textAnswer", "ratingValue", "createdAt")
VALUES
  -- Response 1 (Client 1 - Khảo sát 1)
  ('ef000000-0000-4000-8000-000000000001', 'ee000000-0000-4000-8000-000000000001', 'ec000000-0000-4000-8000-000000000001', NULL, NULL, 5, NOW() - INTERVAL '30 days'),
  ('ef000000-0000-4000-8000-000000000002', 'ee000000-0000-4000-8000-000000000001', 'ec000000-0000-4000-8000-000000000002', 'ed000000-0000-4000-8000-000000000001', NULL, NULL, NOW() - INTERVAL '30 days'),
  ('ef000000-0000-4000-8000-000000000003', 'ee000000-0000-4000-8000-000000000001', 'ec000000-0000-4000-8000-000000000003', 'ed000000-0000-4000-8000-000000000006', NULL, NULL, NOW() - INTERVAL '30 days'),
  ('ef000000-0000-4000-8000-000000000004', 'ee000000-0000-4000-8000-000000000001', 'ec000000-0000-4000-8000-000000000004', NULL, 'Giao diện web rất đẹp và dễ tìm sản phẩm, mong MIVA ra thêm app di động!', NULL, NOW() - INTERVAL '30 days'),

  -- Response 2 (Client 2 - Khảo sát 1)
  ('ef000000-0000-4000-8000-000000000005', 'ee000000-0000-4000-8000-000000000002', 'ec000000-0000-4000-8000-000000000001', NULL, NULL, 5, NOW() - INTERVAL '28 days'),
  ('ef000000-0000-4000-8000-000000000006', 'ee000000-0000-4000-8000-000000000002', 'ec000000-0000-4000-8000-000000000002', 'ed000000-0000-4000-8000-000000000002', NULL, NULL, NOW() - INTERVAL '28 days'),
  ('ef000000-0000-4000-8000-000000000007', 'ee000000-0000-4000-8000-000000000002', 'ec000000-0000-4000-8000-000000000003', 'ed000000-0000-4000-8000-000000000005', NULL, NULL, NOW() - INTERVAL '28 days'),
  ('ef000000-0000-4000-8000-000000000008', 'ee000000-0000-4000-8000-000000000002', 'ec000000-0000-4000-8000-000000000004', NULL, 'Dịch vụ chăm sóc khách hàng phản hồi rất nhanh và chu đáo.', NULL, NOW() - INTERVAL '28 days'),

  -- Response 3 (Client 3 - Khảo sát 1)
  ('ef000000-0000-4000-8000-000000000009', 'ee000000-0000-4000-8000-000000000003', 'ec000000-0000-4000-8000-000000000001', NULL, NULL, 4, NOW() - INTERVAL '25 days'),
  ('ef000000-0000-4000-8000-000000000010', 'ee000000-0000-4000-8000-000000000003', 'ec000000-0000-4000-8000-000000000002', 'ed000000-0000-4000-8000-000000000002', NULL, NULL, NOW() - INTERVAL '25 days'),
  ('ef000000-0000-4000-8000-000000000011', 'ee000000-0000-4000-8000-000000000003', 'ec000000-0000-4000-8000-000000000003', 'ed000000-0000-4000-8000-000000000005', NULL, NULL, NOW() - INTERVAL '25 days'),

  -- Response 4 (Client 4 - Khảo sát 1)
  ('ef000000-0000-4000-8000-000000000012', 'ee000000-0000-4000-8000-000000000004', 'ec000000-0000-4000-8000-000000000001', NULL, NULL, 5, NOW() - INTERVAL '20 days'),
  ('ef000000-0000-4000-8000-000000000013', 'ee000000-0000-4000-8000-000000000004', 'ec000000-0000-4000-8000-000000000002', 'ed000000-0000-4000-8000-000000000001', NULL, NULL, NOW() - INTERVAL '20 days'),
  ('ef000000-0000-4000-8000-000000000014', 'ee000000-0000-4000-8000-000000000004', 'ec000000-0000-4000-8000-000000000003', 'ed000000-0000-4000-8000-000000000006', NULL, NULL, NOW() - INTERVAL '20 days'),

  -- Response 5 (Client 5 - Khảo sát 1)
  ('ef000000-0000-4000-8000-000000000015', 'ee000000-0000-4000-8000-000000000005', 'ec000000-0000-4000-8000-000000000001', NULL, NULL, 4, NOW() - INTERVAL '15 days'),
  ('ef000000-0000-4000-8000-000000000016', 'ee000000-0000-4000-8000-000000000005', 'ec000000-0000-4000-8000-000000000002', 'ed000000-0000-4000-8000-000000000003', NULL, NULL, NOW() - INTERVAL '15 days'),
  ('ef000000-0000-4000-8000-000000000017', 'ee000000-0000-4000-8000-000000000005', 'ec000000-0000-4000-8000-000000000003', 'ed000000-0000-4000-8000-000000000007', NULL, NULL, NOW() - INTERVAL '15 days'),

  -- Response 6 (Client 6 - Khảo sát 1)
  ('ef000000-0000-4000-8000-000000000018', 'ee000000-0000-4000-8000-000000000006', 'ec000000-0000-4000-8000-000000000001', NULL, NULL, 5, NOW() - INTERVAL '10 days'),
  ('ef000000-0000-4000-8000-000000000019', 'ee000000-0000-4000-8000-000000000006', 'ec000000-0000-4000-8000-000000000002', 'ed000000-0000-4000-8000-000000000002', NULL, NULL, NOW() - INTERVAL '10 days'),
  ('ef000000-0000-4000-8000-000000000020', 'ee000000-0000-4000-8000-000000000006', 'ec000000-0000-4000-8000-000000000003', 'ed000000-0000-4000-8000-000000000005', NULL, NULL, NOW() - INTERVAL '10 days'),

  -- Response 7 (Client 7 - Khảo sát 1)
  ('ef000000-0000-4000-8000-000000000021', 'ee000000-0000-4000-8000-000000000007', 'ec000000-0000-4000-8000-000000000001', NULL, NULL, 5, NOW() - INTERVAL '5 days'),
  ('ef000000-0000-4000-8000-000000000022', 'ee000000-0000-4000-8000-000000000007', 'ec000000-0000-4000-8000-000000000002', 'ed000000-0000-4000-8000-000000000001', NULL, NULL, NOW() - INTERVAL '5 days'),
  ('ef000000-0000-4000-8000-000000000023', 'ee000000-0000-4000-8000-000000000007', 'ec000000-0000-4000-8000-000000000003', 'ed000000-0000-4000-8000-000000000006', NULL, NULL, NOW() - INTERVAL '5 days'),

  -- Response 9, 10, 11, 12 (Khảo sát 2 - Sau mua hàng)
  ('ef000000-0000-4000-8000-000000000024', 'ee000000-0000-4000-8000-000000000009', 'ec000000-0000-4000-8000-000000000005', NULL, NULL, 5, NOW() - INTERVAL '25 days'),
  ('ef000000-0000-4000-8000-000000000025', 'ee000000-0000-4000-8000-000000000009', 'ec000000-0000-4000-8000-000000000006', 'ed000000-0000-4000-8000-000000000009', NULL, NULL, NOW() - INTERVAL '25 days'),
  ('ef000000-0000-4000-8000-000000000026', 'ee000000-0000-4000-8000-000000000010', 'ec000000-0000-4000-8000-000000000005', NULL, NULL, 5, NOW() - INTERVAL '20 days'),
  ('ef000000-0000-4000-8000-000000000027', 'ee000000-0000-4000-8000-000000000010', 'ec000000-0000-4000-8000-000000000006', 'ed000000-0000-4000-8000-000000000009', NULL, NULL, NOW() - INTERVAL '20 days'),
  ('ef000000-0000-4000-8000-000000000028', 'ee000000-0000-4000-8000-000000000011', 'ec000000-0000-4000-8000-000000000005', NULL, NULL, 4, NOW() - INTERVAL '15 days'),
  ('ef000000-0000-4000-8000-000000000029', 'ee000000-0000-4000-8000-000000000011', 'ec000000-0000-4000-8000-000000000006', 'ed000000-0000-4000-8000-000000000010', NULL, NULL, NOW() - INTERVAL '15 days'),
  ('ef000000-0000-4000-8000-000000000030', 'ee000000-0000-4000-8000-000000000012', 'ec000000-0000-4000-8000-000000000005', NULL, NULL, 5, NOW() - INTERVAL '8 days'),
  ('ef000000-0000-4000-8000-000000000031', 'ee000000-0000-4000-8000-000000000012', 'ec000000-0000-4000-8000-000000000006', 'ed000000-0000-4000-8000-000000000009', NULL, NULL, NOW() - INTERVAL '8 days');

-- ------------------------------------------------------------------------------
-- 15. NOTIFICATIONS (THÔNG BÁO)
-- ------------------------------------------------------------------------------
INSERT INTO "Notification" (id, "adminId", "clientId", "surveyId", type, title, content, "isRead", "createdAt")
VALUES
  ('fc000000-0000-4000-8000-000000000001', NULL, '33333333-3333-4333-8333-000000000001', 'eb000000-0000-4000-8000-000000000001', 'survey_invitation', 'Mời bạn tham gia khảo sát trải nghiệm dịch vụ MIVA', 'Đóng góp ý kiến để nhận ngay voucher giảm 10% cho đơn hàng kế tiếp!', true, NOW() - INTERVAL '35 days'),
  ('fc000000-0000-4000-8000-000000000002', NULL, '33333333-3333-4333-8333-000000000001', NULL, 'order_update', 'Đơn hàng ORD-2026-0601 đã giao thành công', 'Cảm ơn bạn đã mua sắm tại MIVA, hãy để lại đánh giá sản phẩm nhé!', true, NOW() - INTERVAL '107 days'),
  ('fc000000-0000-4000-8000-000000000003', NULL, '33333333-3333-4333-8333-000000000002', 'eb000000-0000-4000-8000-000000000001', 'survey_invitation', 'Khảo sát chất lượng phục vụ quý 3', 'Nhận 50 điểm thưởng tích lũy ngay khi hoàn tất.', true, NOW() - INTERVAL '30 days'),
  ('fc000000-0000-4000-8000-000000000004', NULL, '33333333-3333-4333-8333-000000000011', NULL, 'order_update', 'Đơn hàng ORD-2026-1002 đang được giao đến bạn', 'Shipper đang trên đường giao hàng, bạn chú ý điện thoại nhé.', false, NOW() - INTERVAL '1 days'),
  ('fc000000-0000-4000-8000-000000000005', '22222222-2222-4222-8222-222222222222', NULL, NULL, 'system', 'Có 5 phản hồi mới cần Quản lý CRM xử lý', 'Khách hàng vừa để lại đánh giá mới trên hệ thống.', false, NOW() - INTERVAL '2 hours'),
  ('fc000000-0000-4000-8000-000000000006', NULL, '33333333-3333-4333-8333-000000000008', NULL, 'order_update', 'Đơn hàng ORD-2026-0930 đã hoàn trả và hoàn tiền', 'Số tiền 6.920.000đ đã được hoàn về ví MoMo của bạn.', true, NOW() - INTERVAL '10 days');

-- ------------------------------------------------------------------------------
-- 16. PRODUCT FAVORITES (SẢN PHẨM YÊU THÍCH)
-- ------------------------------------------------------------------------------
INSERT INTO "ProductFavorite" (id, "clientId", "productId", "createdAt")
VALUES
  ('fd000000-0000-4000-8000-000000000001', '33333333-3333-4333-8333-000000000001', 'ba000000-0000-4000-8000-000000000003', NOW()),
  ('fd000000-0000-4000-8000-000000000002', '33333333-3333-4333-8333-000000000001', 'ba000000-0000-4000-8000-000000000005', NOW()),
  ('fd000000-0000-4000-8000-000000000003', '33333333-3333-4333-8333-000000000002', 'ba000000-0000-4000-8000-000000000001', NOW()),
  ('fd000000-0000-4000-8000-000000000004', '33333333-3333-4333-8333-000000000002', 'ba000000-0000-4000-8000-000000000008', NOW()),
  ('fd000000-0000-4000-8000-000000000005', '33333333-3333-4333-8333-000000000004', 'ba000000-0000-4000-8000-000000000006', NOW()),
  ('fd000000-0000-4000-8000-000000000006', '33333333-3333-4333-8333-000000000006', 'ba000000-0000-4000-8000-000000000002', NOW()),
  ('fd000000-0000-4000-8000-000000000007', '33333333-3333-4333-8333-000000000007', 'ba000000-0000-4000-8000-000000000004', NOW()),
  ('fd000000-0000-4000-8000-000000000008', '33333333-3333-4333-8333-000000000009', 'ba000000-0000-4000-8000-000000000003', NOW());

COMMIT;
