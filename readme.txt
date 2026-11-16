================================================================================
                    TRƯỜNG ĐẠI HỌC SÀI GÒN (SGU)
                    KHOA CÔNG NGHỆ THÔNG TIN
          BÁO CÁO ĐỒ ÁN HỌC PHẦN: HỆ THỐNG THÔNG TIN DOANH NGHIỆP
                        MÃ HỌC PHẦN: 841065
================================================================================

1. THÔNG TIN ĐỀ TÀI & NHÓM THỰC HIỆN
- Nhóm: Nhóm 06
- Tên đề tài: Phân tích, Thiết kế và Cài đặt Hệ thống Thông tin Quản lý Quan hệ Khách hàng (CRM) trên Sàn Thương mại Điện tử MIVA
- Giảng viên hướng dẫn: TS. Lê Nhị Lãm Thúy

2. DANH SÁCH THÀNH VIÊN NHÓM 06
+-----+--------------+----------------------+----------------------------------+
| STT | MSSV         | Họ và tên            | Khối lượng công việc (%)         |
+-----+--------------+----------------------+----------------------------------+
|  1  | 3123411021   | Hà Nguyễn Thy Ân     | 100% (Khảo sát, Chương 1-2, Test)|
|  2  | 3123411084   | Mạc Anh Hào          | 100% (BFD, DFD, Survey Module)   |
|  3  | 3123411085   | Nguyễn Tuấn Hào      | 100% (CSDL 23 bảng, Admin 5175)  |
|  4  | 3123411162   | Trần Minh Khoa       | 100% (CRM Manager 5174, Báo cáo) |
|  5  | 3123411182   | Trương Nhật Long     | 100% (Client 5173, Chương 4-5)   |
+-----+--------------+----------------------+----------------------------------+

3. DANH MỤC TẬP TIN BÀN GIAO TRONG ĐỒ ÁN
- Báo cáo Word hoàn chỉnh:
  + ĐỒ-ÁN-HTTTDN_Hoan_Chinh.docx
- Tập tin thông tin nhóm:
  + readme.txt
- Script SQL & Kịch bản Sao lưu / Phục hồi CSDL PostgreSQL 18:
  + database/schema.sql (DDL 16 kiểu ENUM & 23 bảng vật lý chuẩn 3NF)
  + database/backup.ps1 (Kịch bản tự động sao lưu nén pg_dump -Fc -Z 9)
  + database/restore.ps1 (Kịch bản phục hồi có kiểm chứng pg_restore)
  + database/backup/htttdn_crm_20261116_150044.dump (Bản sao lưu dữ liệu Demo đầy đủ 819 bản ghi trên 23 bảng)
- Mã nguồn chương trình (Source Code):
  + backend/  : Máy chủ RESTful API & WebSocket (NestJS 11, Prisma ORM, PostgreSQL 18 - Port 3000)
  + admin/    : Ứng dụng Quản trị tách biệt 2 cổng (Admin Server :5175 & CRM Manager :5174)
  + client/   : Ứng dụng Cổng Khách hàng - Sàn TMĐT MIVA (:5173)

4. TÀI KHOẢN DEMO ĐÃ CHUẨN BỊ SẴN TRONG CSDL
- Cổng Admin Server (http://localhost:5175):
  + Email: admin@miva.vn  | Mật khẩu: 123456 | Vai trò: SUPER_ADMIN
  + Email: admin2@miva.vn | Mật khẩu: 123456 | Vai trò: SUPER_ADMIN
- Cổng Người quản lý CRM (http://localhost:5174):
  + Email: crm@miva.vn    | Mật khẩu: 123456 | Vai trò: CRM_MANAGER
  + Email: crm2@miva.vn   | Mật khẩu: 123456 | Vai trò: CRM_MANAGER
- Cổng Khách hàng MIVA (http://localhost:5173):
  + Email: client1@miva.vn | Mật khẩu: 123456 | Vai trò: CLIENT
  + Email: client2@miva.vn | Mật khẩu: 123456 | Vai trò: CLIENT
- Tài khoản mẫu trạng thái Đã khóa (dùng để test Mở khóa / Chặn đăng nhập):
  + Email: crm.locked@miva.vn   | Mật khẩu: 123456 | Vai trò: CRM_MANAGER (inactive)
  + Email: khach.vipham@miva.vn | Mật khẩu: 123456 | Vai trò: CLIENT (inactive)

5. HƯỚNG DẪN CÀI ĐẶT VÀ KHỞI CHẠY NHANH
- Bước 1: Khởi tạo hoặc phục hồi CSDL PostgreSQL (htttdn_crm, cổng 5433):
    powershell -ExecutionPolicy Bypass -File .\database\restore.ps1 -Latest
  (Hoặc tại thư mục backend chạy: npx prisma migrate deploy && npx prisma db seed)
- Bước 2: Khởi chạy Backend API (Cổng 3000):
    cd backend
    npm install
    npm run start:dev
- Bước 3: Khởi chạy đồng thời 3 cổng giao diện Frontend (5175, 5174, 5173):
    # Terminal 1 (chạy đồng thời cổng CRM :5174 và Admin Server :5175):
    cd admin
    npm install
    npm run dev
    # Terminal 2 (chạy cổng Khách hàng :5173):
    cd client
    npm install
    npm run dev
================================================================================

