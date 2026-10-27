# HTTT Quản lý khách hàng (CRM) – Đồ án HTTTDN

Đồ án học phần **Hệ thống thông tin doanh nghiệp (841065)** – Trường ĐH Sài Gòn.
Tách ra từ repo [`htttdn`](https://github.com/MAnhhaoo/htttdn), chỉ giữ **Admin** và **Client**.

## Cấu trúc

```
htttdn-crm/
├── backend/    # NestJS + Prisma + PostgreSQL (port 3000)
├── admin/      # Hai giao diện Vite/React tách quyền
│               #   Admin Server :5175/system/* — tài khoản, phân quyền, doanh thu
│               #   CRM Manager  :5174/* — khách hàng, phản hồi, khảo sát, báo cáo
├── client/     # Web khách hàng – Vite/React (port 5173)
├── database/   # schema.sql, seed.sql, backup.ps1, restore.ps1
├── dataset/    # Công cụ sinh dữ liệu demo
├── docs/       # Báo cáo, sơ đồ, ảnh giao diện
└── readme.txt  # Thông tin nhóm
```

## Cài đặt

Yêu cầu: Node.js ≥ 20, PostgreSQL ≥ 14.

```powershell
# 1. Backend
cd backend
copy .env.example .env        # sửa DATABASE_URL, JWT_SECRET
npm install
npx prisma migrate deploy
npx prisma db seed
npm run start:dev             # http://localhost:3000/api

# 2. Admin
cd ../admin
npm install
npm run dev                   # CRM :5174 và Admin Server :5175

# 3. Client
cd ../client
npm install
npm run dev                   # http://localhost:5173
```

## Sao lưu / phục hồi CSDL

Xem [database/README.md](database/README.md).

## Tách quyền Admin Server và CRM

- `SUPER_ADMIN` đăng nhập tại `http://localhost:5175/login/admin`; quản lý tài khoản và phân quyền tại `/system/accounts`.
- `CRM_MANAGER` đăng nhập tại `http://localhost:5174/login/crm`; quản lý khách hàng, phản hồi, khảo sát và báo cáo khách hàng.
- Khách hàng dùng `http://localhost:5173` để đăng ký, sửa hồ sơ, gửi phản hồi và trả lời khảo sát.
- Backend kiểm tra `roleCode` trên từng yêu cầu. Sau khi cập nhật mã nguồn, chạy `npx prisma migrate deploy` trong `backend/` để đồng bộ vai trò cũ và đổi giá trị mặc định an toàn.

Để build riêng hai giao diện: chạy `npm run build:admin` và `npm run build:crm` trong `admin/`. Kết quả nằm tại `admin/dist/admin` và `admin/dist/crm`.
