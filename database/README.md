# Database

| File | Mô tả |
|---|---|
| `schema.sql` | Script tạo CSDL (sinh từ Prisma, xem lệnh bên dưới) |
| `seed.sql` | Dữ liệu demo + tài khoản test |
| `backup.ps1` | Sao lưu CSDL bằng `pg_dump` → `database/backup/*.dump` |
| `restore.ps1` | Phục hồi CSDL bằng `pg_restore` |

## Sinh `schema.sql` từ Prisma

```powershell
cd backend
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > ../database/schema.sql
```

## Sao lưu / phục hồi

```powershell
.\database\backup.ps1 -DbName htttdn_crm -User postgres
.\database\restore.ps1 -File .\database\backup\htttdn_crm_YYYYMMDD_HHmmss.dump
```

> Yêu cầu `pg_dump`, `pg_restore` có trong PATH (thư mục `bin` của PostgreSQL).
