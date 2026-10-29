================================================================================
TRƯỜNG ĐẠI HỌC SÀI GÒN — KHOA CÔNG NGHỆ THÔNG TIN
HỌC PHẦN: HỆ THỐNG THÔNG TIN DOANH NGHIỆP (MÃ HP: 841065)
================================================================================

1. THÔNG TIN ĐỀ TÀI & NHÓM THỰC HIỆN
- Nhóm: Nhóm 06
- Tên đề tài: Thương mại điện tử — Phân tích và thiết kế Hệ thống thông tin Quản lý Quan hệ Khách hàng (CRM) cho doanh nghiệp MIVA
- Phân hệ lựa chọn cài đặt: Mục III.4 — Mô phỏng Hệ thống CRM (30 điểm) + Mục II.1 & II.2 — CSDL & Giao diện Admin Server tách biệt (30 điểm) + Mục I — Báo cáo (40 điểm)
- Giảng viên hướng dẫn: Cô Lê Nhị Lãm Thúy

2. DANH SÁCH THÀNH VIÊN NHÓM 06
--------------------------------------------------------------------------------
STT | MSSV       | Họ và tên          | Khối lượng CV (%) | Nội dung phụ trách chính
----+------------+--------------------+-------------------+---------------------
1   | 3123411021 | Hà Nguyễn Thy Ân   | 100%              | Khảo sát HTTT (18 câu hỏi), tổng kết khảo sát, Chương 1 & 2, dữ liệu demo
2   | 3123411084 | Mạc Anh Hào        | 100%              | Phân tích nghiệp vụ, vẽ BFD, DFD Mức 0, DFD Mức 1, Module Khảo sát (Surveys)
3   | 3123411085 | Nguyễn Tuấn Hào    | 100%              | Thiết kế CSDL (23 bảng Prisma/PostgreSQL), vẽ ERD, Cổng Admin Server (Port 5175)
4   | 3123411162 | Trần Minh Khoa     | 100%              | Phân hệ Người quản lý CRM (Port 5174): Quản lý KH, Phản hồi & Báo cáo độ tuổi/sở thích
5   | 3123411182 | Trương Nhật Long   | 100%              | Phân hệ Khách hàng (Port 5173), Socket.IO Notification, Chương 4 & 5
--------------------------------------------------------------------------------

3. KIẾN TRÚC 3 CỔNG GIAO DIỆN ĐỘC LẬP CỦA HỆ THỐNG
- Cổng 1 — Admin Server Console (Mục II.2): http://localhost:5175/system/accounts
  (Tách biệt hoàn toàn với giao diện CRM; thêm/xóa/khóa account và phân quyền chi tiết)
- Cổng 2 — Người quản lý CRM (Mục III.4.1): http://localhost:5174/dashboard
  (Thêm/xóa/khóa khách hàng, tiếp nhận phản hồi, báo cáo độ tuổi & sở thích, tạo & thống kê khảo sát)
- Cổng 3 — Khách hàng / Client Portal (Mục III.4.3): http://localhost:5173/
  (Đăng ký, đăng nhập, chỉnh sửa thông tin, gửi phản hồi sản phẩm, nhận & thực hiện khảo sát)
- Máy chủ Backend API & Socket.IO: http://localhost:5000

4. HƯỚNG DẪN CÀI ĐẶT VÀ KHỞI CHẠY NHANH
Bước 1: Cấu hình CSDL PostgreSQL trong file `backend/.env`
Bước 2: Khởi tạo CSDL & nạp dữ liệu mẫu (Seed):
   cd backend
   npm install
   npx prisma migrate dev
   npm run seed
   npm run dev
Bước 3: Khởi chạy Admin Server (Port 5175) và CRM Portal (Port 5174):
   cd admin
   npm install
   npm run dev
Bước 4: Khởi chạy Client Portal (Port 5173):
   cd client
   npm install
   npm run dev
