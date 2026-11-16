# Phương án Sao lưu & Phục hồi Cơ sở Dữ liệu (MIVA CRM)

Tài liệu hướng dẫn chi tiết, ngắn gọn và chuẩn xác về giải pháp Sao lưu (Backup) và Phục hồi (Restore) cơ sở dữ liệu cho hệ thống **Quản lý Quan hệ Khách hàng MIVA (CRM)**.

---

## 1. Tổng quan & Mục tiêu Phục hồi

- **Hệ quản trị CSDL:** PostgreSQL 14+ (Mặc định: CSDL `htttdn_crm`).
- **Quy mô cấu trúc:** 16 kiểu ENUM chuẩn hóa, 23 bảng nghiệp vụ (24 bảng tính cả `_prisma_migrations`).
- **Mục tiêu vận hành:**
  - **RTO (Recovery Time Objective):** Thời gian phục hồi toàn diện hệ thống khi có sự cố **dưới 5 phút** (thực tế: ~1.2 giây).
  - **RPO (Recovery Point Objective):** Dữ liệu mất mát tối đa **dưới 24 giờ** (sao lưu tự động hàng đêm).

---

## 2. Cấu trúc thư mục `database/`

| Tệp / Thư mục | Chức năng chính |
| :--- | :--- |
| [`backup.ps1`](./backup.ps1) | Kịch bản tự động sao lưu CSDL ra tệp `.dump` (Custom format, nén mức 9). |
| [`restore.ps1`](./restore.ps1) | Kịch bản phục hồi CSDL tự động 3 bước (Kiểm tra -> Ngắt kết nối -> Tái tạo). |
| `backup/` | Thư mục chứa các tệp sao lưu `.dump` (tự động tạo, đã thêm vào `.gitignore`). |
| [`schema.sql`](./schema.sql) | DDL tạo toàn bộ 16 ENUM và 23 bảng (sinh từ Prisma ORM). |
| [`seed_full_crm_dataset.sql`](./seed_full_crm_dataset.sql) | Bộ dữ liệu mẫu đầy đủ (Tài khoản, đơn hàng, khảo sát, đánh giá). |

---

## 3. Phương án Sao lưu tự động (Backup)

### 3.1. Cơ chế hoạt động
Kịch bản [`database/backup.ps1`](./backup.ps1) vận hành tự động hoàn toàn:
1. Tự động đọc chuỗi kết nối `DATABASE_URL` từ file `backend/.env`.
2. Tự động bổ sung đường dẫn `pg_dump` vào môi trường `PATH` nếu chưa có.
3. Thiết lập bảo mật biến môi trường `PGPASSWORD` (tránh lộ mật khẩu trên màn hình).
4. Thực thi tiện ích `pg_dump` xuất tệp `.dump` chuẩn nén cao cấp.
5. **Tự động kiểm định tính toàn vẹn** qua `pg_restore -l` ngay sau khi xuất tệp.

### 3.2. Lệnh thực thi nhanh (1 dòng)
Mở PowerShell tại thư mục gốc dự án:
```powershell
powershell -ExecutionPolicy Bypass -File .\database\backup.ps1
```
*(Tùy chọn chỉ định tham số: `.\database\backup.ps1 -Port 5433 -User postgres -DbName htttdn_crm`)*

### 3.3. Lệnh `pg_dump` cốt lõi được script thực thi
```powershell
pg_dump -h localhost -p 5433 -U postgres -d htttdn_crm -Fc -Z 9 --no-owner --no-acl -f "database/backup/htttdn_crm_YYYYMMDD_HHmmss.dump"
```
- `-Fc`: Định dạng Custom Binary nén độc quyền của PostgreSQL (tối ưu tốc độ phục hồi).
- `-Z 9`: Mức nén tối đa (giảm kích thước tệp hơn 70%).
- `--no-owner --no-acl`: Loại bỏ thông tin quyền sở hữu và phân quyền cục bộ, giúp tệp có thể phục hồi sang bất kỳ máy chủ hoặc tài khoản người dùng nào mà không phát sinh lỗi quyền.

---

## 4. Phương án Phục hồi dữ liệu (Restore)

### 4.1. Quy trình 3 bước phục hồi an toàn
Kịch bản [`database/restore.ps1`](./restore.ps1) tự động thực thi tuần tự 3 bước nghiêm ngặt:

```
[Bước 1: Kiểm tra tệp] ──> [Bước 2: Ngắt kết nối] ──> [Bước 3: Tái tạo sạch]
   pg_restore -l             pg_terminate_backend       pg_restore --clean --if-exists
(Đảm bảo tệp không lỗi)   (Giải phóng tài nguyên khóa)  (Nạp 16 ENUM, 23 bảng & dữ liệu)
```

1. **Bước 1 — Kiểm tra mục lục (`pg_restore -l`)**: Đọc bảng mục lục bên trong tệp `.dump` để xác thực tệp nguyên vẹn, không bị hỏng hóc hay thiếu dữ liệu.
2. **Bước 2 — Ngắt các kết nối nền (`pg_terminate_backend`)**: Gửi truy vấn SQL đóng tất cả các phiên làm việc đang chiếm dụng CSDL `htttdn_crm` (tránh xung đột bảng đang bị lock).
3. **Bước 3 — Tái tạo sạch CSDL (`pg_restore --clean --if-exists`)**: Xóa và khởi tạo lại toàn bộ 16 kiểu ENUM, 23 bảng nghiệp vụ cùng các ràng buộc khóa ngoại và nạp dữ liệu.

### 4.2. Lệnh thực thi nhanh (1 dòng)
- **Tự động phục hồi từ bản sao lưu `.dump` mới nhất:**
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\database\restore.ps1
  ```
- **Hoặc chỉ định chính xác một bản sao lưu cụ thể:**
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\database\restore.ps1 -File .\database\backup\htttdn_crm_20261105_092611.dump
  ```

### 4.3. Lệnh `pg_restore` cốt lõi được script thực thi
```powershell
pg_restore -h localhost -p 5433 -U postgres -d htttdn_crm --clean --if-exists --no-owner --no-acl -v "database/backup/htttdn_crm_20261105_092611.dump"
```

---

## 5. Kết quả Thực nghiệm & Kiểm định số liệu

| Chỉ số kiểm nghiệm | Kết quả thực tế | Ý nghĩa & Đánh giá |
| :--- | :---: | :--- |
| **Tệp sao lưu thực nghiệm** | `htttdn_crm_20261105_092611.dump` | Định dạng Custom Binary nén cao cấp. |
| **Dung lượng tệp sao lưu** | **111.53 KB** | Tiết kiệm hơn 70% dung lượng đĩa lưu trữ. |
| **Thời gian thực thi sao lưu** | **0.85 giây** | Nhanh chóng, không làm gián đoạn tải của hệ thống. |
| **Thời gian khôi phục (RTO)** | **~1.20 giây** | **RTO < 5 phút** (Đạt chuẩn khắt khe của hệ thống doanh nghiệp). |
| **Độ toàn vẹn kiểu dữ liệu** | **16/16 ENUM** | Bảo toàn 100% kiểu liệt kê nghiệp vụ. |
| **Độ toàn vẹn cấu trúc bảng** | **23/23 Bảng** *(24 bảng có migration)* | Đầy đủ khóa chính, khóa ngoại, sequence, index. |
| **Độ toàn vẹn bản ghi** | **562 bản ghi** | Không thất thoát bất kỳ bản ghi nào sau phục hồi. |

---

## 6. Lên lịch Sao lưu tự động (Windows Task Scheduler)

Để hệ thống tự động sao lưu định kỳ hàng đêm vào `00:00:00`, thực hiện như sau:

1. Mở **Windows Task Scheduler** (`taskschd.msc`).
2. Chọn **Create Basic Task**:
   - **Name:** `MIVA_CRM_Daily_DB_Backup`
   - **Trigger:** Chọn `Daily` (Hàng ngày), đặt giờ `00:00:00`.
   - **Action:** Chọn `Start a program`.
   - **Program/script:** `powershell.exe`
   - **Add arguments:** `-ExecutionPolicy Bypass -File "C:\CRM\htttdn-crm\database\backup.ps1"`
   - **Start in:** `C:\CRM\htttdn-crm`
3. Nhấn **Finish**. Hệ thống sẽ tự động xuất tệp `.dump` định kỳ vào thư mục `database/backup/`.
