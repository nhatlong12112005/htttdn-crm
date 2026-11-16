# Cơ sở dữ liệu PostgreSQL — Hệ thống MIVA CRM (`htttdn_crm`)

Thư mục `database/` chứa toàn bộ tập tin định nghĩa cấu trúc CSDL (23 bảng nghiệp vụ & 16 kiểu `ENUM`), dữ liệu tài khoản mẫu và kịch bản tự động Sao lưu / Phục hồi CSDL theo yêu cầu tại **Mục II.1 (5.0 điểm)**.

## 1. Danh mục tập tin trong thư mục `database/`

| Tập tin | Mô tả chức năng |
| :--- | :--- |
| `schema.sql` | Script DDL khởi tạo toàn bộ 16 kiểu `ENUM`, 23 bảng vật lý, khóa chính `UUID`, chỉ mục (`INDEX`) và khóa ngoại (`FOREIGN KEY`), đồng bộ 100% với `backend/prisma/schema.prisma`. |
| `backup.ps1` | Kịch bản PowerShell sao lưu toàn bộ CSDL bằng `pg_dump` (định dạng nén Custom Format `.dump`), tự động đọc cấu hình từ `backend/.env` và kiểm tra danh mục bảng (TOC). |
| `restore.ps1` | Kịch bản PowerShell phục hồi CSDL bằng `pg_restore --clean --if-exists --no-owner --no-privileges`, hỗ trợ tự động chọn bản sao lưu mới nhất (`-Latest`). |
| `backup/htttdn_crm_20261116_150044.dump` | Bản sao lưu vật lý định dạng `.dump` của CSDL `htttdn_crm` (819 bản ghi dữ liệu Demo hoàn chỉnh trên cả 23 bảng nghiệp vụ; khởi tạo lại bằng lệnh `npx prisma db seed` tại `backend/`). |

---

## 2. Khởi tạo CSDL & Đồng bộ `schema.sql` từ Prisma

```powershell
# Áp dụng đầy đủ các bản ghi migration vào PostgreSQL
cd backend
npx prisma migrate deploy

# Sinh lại file database/schema.sql từ schema.prisma
.\node_modules\.bin\prisma.cmd migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script | Out-File -FilePath ../database/schema.sql -Encoding utf8
```

---

## 3. Hướng dẫn Sao lưu và Phục hồi CSDL (Backup & Restore)

Kịch bản `backup.ps1` và `restore.ps1` tự động đọc thông số kết nối (`Host`, `Port`, `User`, `Password`, `DbName`) từ tập tin `backend/.env` và tự động dò tìm `pg_dump.exe` / `pg_restore.exe` trong hệ thống.

### 3.1. Sao lưu CSDL (Backup)

```powershell
# Cách 1: Tự động đọc cấu hình từ backend/.env (Khuyến nghị)
.\database\backup.ps1

# Cách 2: Truyền tham số tùy chỉnh
.\database\backup.ps1 -DbName htttdn_crm -User user_ecommerce -DbHost localhost -Port 5433
```

### 3.2. Phục hồi CSDL khi gặp sự cố (Restore)

```powershell
# Cách 1: Tự động khôi phục từ bản sao lưu .dump mới nhất trong database/backup/
.\database\restore.ps1 -Latest

# Cách 2: Khôi phục từ một file .dump chỉ định cụ thể
.\database\restore.ps1 -File .\database\backup\htttdn_crm_YYYYMMDD_HHmmss.dump
```
