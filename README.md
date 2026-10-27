# HTTT Quản lý khách hàng (CRM) – Đồ án HTTTDN

Đồ án học phần **Hệ thống thông tin doanh nghiệp (841065)** – Trường ĐH Sài Gòn.
Tách ra từ repo [`htttdn`](https://github.com/MAnhhaoo/htttdn), chỉ giữ **Admin** và **Client**.

## Cấu trúc

```
htttdn-crm/
├── backend/    # NestJS + Prisma + PostgreSQL (port 3000)
├── admin/      # Web quản trị – Vite/React (port 5174)
│               #   /system : tài khoản, phân quyền, sao lưu CSDL
│               #   /crm    : khách hàng, phản hồi, khảo sát, báo cáo
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
npm run dev                   # http://localhost:5174

# 3. Client
cd ../client
npm install
npm run dev                   # http://localhost:5173
```

## Sao lưu / phục hồi CSDL

Xem [database/README.md](database/README.md).
