# PHƯƠNG ÁN SAO LƯU VÀ PHỤC HỒI CƠ SỞ DỮ LIỆU (DATABASE BACKUP & RESTORE PLAN)

- **Hệ thống:** Hệ thống thông tin Quản lý Khách hàng (CRM) tích hợp Website Thương mại Thời trang MIVA
- **Học phần:** Hệ thống thông tin doanh nghiệp (`841065`)
- **Phân loại nội dung:** Mục II.1 trong Phiếu chấm đồ án — *Phương án sao lưu và phục hồi CSDL (10 điểm)*
- **Hệ Quản trị CSDL (DBMS):** PostgreSQL 16+
- **Tên Cơ sở dữ liệu:** `htttdn_crm`
- **Công cụ thực thi chính:** `pg_dump`, `pg_restore`, `psql`, PowerShell Scripts (`database/backup.ps1`, `database/restore.ps1`)

---

## 1. MỤC ĐÍCH VÀ PHẠM VI ÁP DỤNG

### 1.1. Mục đích
1. **Bảo toàn dữ liệu (Data Integrity & Durability):** Đảm bảo an toàn tuyệt đối cho toàn bộ dữ liệu tài khoản quản trị, hồ sơ khách hàng, lịch sử đơn hàng, dữ liệu khảo sát và đánh giá phản hồi của doanh nghiệp thời trang MIVA.
2. **Khắc phục sự cố (Disaster Recovery):** Sẵn sàng phục hồi hệ thống về trạng thái hoạt động bình thường khi gặp sự cố phần cứng, lỗi phần mềm, tấn công mạng hoặc thao tác nhầm của con người.
3. **Mục tiêu thời gian và điểm phục hồi:**
   - **RTO (Recovery Time Objective):** Thời gian phục hồi hệ thống khi có sự cố phải nhỏ hơn **15 phút**.
   - **RPO (Recovery Point Objective):** Dữ liệu mất mát tối đa không vượt quá **24 giờ** đối với bản sao lưu định kỳ hàng ngày, và không vượt quá **1 giờ** đối với kịch bản vận hành cao điểm.

### 1.2. Phạm vi
Áp dụng cho toàn bộ 23 bảng trong CSDL `htttdn_crm` thuộc 5 phân hệ cốt lõi:
- **Phân hệ Tài khoản & Phân quyền:** `Admin`, `Client`, `ClientAddress`.
- **Phân hệ Khảo sát & Thông báo (Core CRM):** `Survey`, `SurveyQuestion`, `SurveyOption`, `SurveyResponse`, `SurveyAnswer`, `Notification`.
- **Phân hệ Phản hồi & Sở thích (Core CRM):** `Review`, `ProductFavorite`.
- **Phân hệ Danh mục & Sản phẩm:** `Category`, `Product`, `ProductColor`, `ProductVariant`.
- **Phân hệ Bán hàng, Khuyến mãi & Giỏ hàng:** `Cart`, `CartItem`, `Order`, `OrderDetail`, `Payment`, `OrderStatusHistory`, `Voucher`, `VoucherDetail`.

---

## 2. CHIẾN LƯỢC SAO LƯU CƠ SỞ DỮ LIỆU (BACKUP STRATEGY)

### 2.1. Lựa chọn định dạng sao lưu (Backup Format)
Doanh nghiệp triển khai song song hai hình thức sao lưu:

| Hình thức | Công cụ | Định dạng file sinh ra | Đặc điểm & Ưu điểm | Mục đích sử dụng |
| :--- | :--- | :--- | :--- | :--- |
| **Sao lưu Nhị phân Nén (Custom Format)** *(Khuyến nghị chính)* | `pg_dump -F c` | `.dump` (ví dụ: `htttdn_crm_20261101_000000.dump`) | Nén dung lượng tự động (giảm 60–80% kích thước), lưu trữ cấu trúc bảng, kiểu dữ liệu, index, trigger, sequences. Hỗ trợ phục hồi song song (`-j`), hỗ trợ chọn lọc bảng và phục hồi đè an toàn qua `pg_restore`. | Dùng cho sao lưu tự động định kỳ hàng ngày và phục hồi khẩn cấp khi gặp sự cố. |
| **Sao lưu Script Văn bản (Plain SQL)** | `pg_dump -F p` hoặc `prisma migrate diff` | `.sql` (ví dụ: `schema.sql`, `seed_full_crm_dataset.sql`) | Dễ dàng đọc hiểu cấu trúc bằng mắt thường, lưu trữ trên Git Repository để quản lý phiên bản mã nguồn CSDL. | Dùng để dựng mới môi trường phát triển (Dev/Staging) hoặc chấm bài trên máy tính mới. |

### 2.2. Lịch trình sao lưu (Backup Schedule)
Áp dụng mô hình xoay vòng bản sao lưu theo thời gian:

```
[Mỗi 00:00 Hàng Ngày] ────────> Full Backup (.dump) ──> Lưu trữ 7 ngày gần nhất (Local Server)
         │
[Chủ Nhật Hàng Tuần] ─────────> Weekly Archive       ──> Lưu trữ 4 tuần gần nhất (Ổ đĩa dự phòng)
         │
[Ngày 01 Hàng Tháng] ─────────> Monthly Cold Archive ──> Lưu trữ 12 tháng (Lưu trữ đám mây / Offsite)
         │
[Trước khi Migrate / Deploy] ──> Ad-hoc Snapshot    ──> Lưu tức thời trước khi thay đổi cấu trúc bảng
```

1. **Sao lưu Toàn phần Hàng ngày (Daily Full Backup):**
   - **Thời điểm thực thi:** `00:00:00` hàng đêm (khung giờ lưu lượng truy cập mua sắm thấp nhất).
   - **Vị trí lưu trữ mặc định:** Thư mục `database/backup/`.
   - **Chính sách xoay vòng (Retention Policy):** Tự động giữ lại 7 bản sao lưu gần nhất; các bản sao lưu cũ hơn 7 ngày trên máy chủ ứng dụng sẽ được lưu chuyển hoặc dọn dẹp để tiết kiệm dung lượng đĩa.
2. **Sao lưu Tức thời (Ad-hoc / Pre-migration Backup):**
   - Được thực hiện thủ công ngay trước khi Quản trị viên chạy các lệnh thay đổi cấu trúc (`npx prisma migrate`, `ALTER TABLE`) hoặc bảo trì hệ thống.

### 2.3. Quy ước đặt tên file sao lưu
Tên file sao lưu được chuẩn hóa theo định dạng:
```
<Tên_Database>_<NămThángNgày>_<GiờPhútGiây>.<đuôi_file>
Ví dụ: htttdn_crm_20261101_000000.dump
```
Quy ước này giúp phân loại, sắp xếp theo thời gian và tránh việc ghi đè ngoài ý muốn giữa các bản sao lưu.

---

## 3. QUY TRÌNH THỰC HIỆN SAO LƯU (BACKUP PROCEDURE)

### 3.1. Phương thức 1: Sử dụng Kịch bản PowerShell có sẵn của dự án
Hệ thống đã xây dựng sẵn script `database/backup.ps1` với đầy đủ tham số tự động nhận diện thời gian và khởi tạo thư mục.

- **Vị trí script:** [`database/backup.ps1`](file:///c:/CRM/htttdn-crm/database/backup.ps1)
- **Cú pháp thực hiện tại thư mục gốc dự án (`c:\CRM\htttdn-crm`):**
  ```powershell
  # Sao lưu mặc định (Database: htttdn_crm, User: postgres, Host: localhost, Port: 5432)
  .\database\backup.ps1

  # Hoặc chỉ định cụ thể các tham số môi trường:
  .\database\backup.ps1 -DbName htttdn_crm -User postgres -DbHost localhost -Port 5432
  ```
- **Nguyên lý hoạt động bên trong script:**
  1. Kiểm tra và tự động tạo thư mục `database/backup` nếu chưa có.
  2. Lấy thời gian hiện tại (`yyyyMMdd_HHmmss`) để đặt tên file.
  3. Gọi lệnh `pg_dump` với các tham số tối ưu:
     - `-F c`: Xuất định dạng Custom Binary nén.
     - `-b`: Bao gồm các đối tượng Large Objects (BLOBs) nếu có.
     - `-v`: Hiển thị chi tiết tiến trình (Verbose mode).
     - `-f <đường_dẫn_file>`: Chỉ định vị trí lưu trữ file đầu ra.
  4. Báo trạng thái thành công (`Da sao luu: ...`) hoặc in thông báo lỗi nếu thất bại.

### 3.2. Phương thức 2: Thực hiện bằng lệnh CLI thuần (Native PostgreSQL)
Trong môi trường máy chủ Linux/Docker hoặc khi không dùng PowerShell, quản trị viên sử dụng trực tiếp lệnh `pg_dump`:

```bash
# Thiết lập biến môi trường mật khẩu (tránh lộ mật khẩu trên dòng lệnh)
set PGPASSWORD=postgres   # Trên Windows
# export PGPASSWORD=postgres # Trên Linux / macOS

# Thực hiện lệnh sao lưu:
pg_dump -h localhost -p 5432 -U postgres -F c -b -v -f "database/backup/htttdn_crm_backup.dump" htttdn_crm
```

### 3.3. Kiểm tra tính toàn vẹn của File sao lưu
Sau khi sao lưu, Quản trị viên tiến hành kiểm tra nhanh để đảm bảo file sao lưu không bị lỗi hoặc rỗng (`0 byte`):
```powershell
# 1. Kiểm tra kích thước file
Get-Item .\database\backup\*.dump | Select-Object Name, Length, LastWriteTime

# 2. Đọc danh mục bảng và đối tượng bên trong file mà không cần phục hồi vào DB:
pg_restore -l .\database\backup\htttdn_crm_YYYYMMDD_HHmmss.dump
```
Nếu danh mục hiển thị đầy đủ danh sách các bảng (`Admin`, `Client`, `Survey`, `Product`, `Order`,...), file sao lưu hoàn toàn hợp lệ.

---

## 4. QUY TRÌNH THỰC HIỆN PHỤC HỒI (RESTORE PROCEDURE)

Tùy theo tình huống sự cố, Quản trị viên lựa chọn kịch bản phục hồi phù hợp.

### 4.1. Kịch bản 1: Phục hồi đè khi gặp sự cố trên CSDL đang chạy (In-place Recovery)
Sử dụng khi cơ sở dữ liệu hiện tại bị sai lệch dữ liệu do thao tác nhầm hoặc kiểm thử cần hoàn tác:

- **Vị trí script:** [`database/restore.ps1`](file:///c:/CRM/htttdn-crm/database/restore.ps1)
- **Cú pháp thực hiện:**
  ```powershell
  .\database\restore.ps1 -File .\database\backup\htttdn_crm_YYYYMMDD_HHmmss.dump
  ```
- **Cơ chế an toàn trong kịch bản:**
  - Script sử dụng cờ `--clean --if-exists`: Xóa sạch các bảng, hàm, kiểu dữ liệu cũ trước khi nạp lại cấu trúc và dữ liệu mới từ bản sao lưu, loại bỏ xung đột trùng lặp khóa chính (`Primary Key Collision`).
  - Nếu có tiến trình backend đang kết nối khóa bảng, Quản trị viên chủ động ngắt phiên trước khi chạy lệnh:
    ```sql
    SELECT pg_terminate_backend(pid) 
    FROM pg_stat_activity 
    WHERE datname = 'htttdn_crm' AND pid <> pg_backend_pid();
    ```

### 4.2. Kịch bản 2: Phục hồi sang Cơ sở dữ liệu mới / Môi trường kiểm thử (Side-by-side / Sandbox Restore)
Sử dụng khi muốn kiểm tra dữ liệu phục hồi mà không làm ảnh hưởng đến CSDL chính đang hoạt động:

1. **Bước 1 — Tạo cơ sở dữ liệu trống mới:**
   ```sql
   CREATE DATABASE htttdn_crm_test WITH OWNER = postgres ENCODING = 'UTF8';
   ```
2. **Bước 2 — Phục hồi dữ liệu vào Database mới:**
   ```powershell
   pg_restore -h localhost -p 5432 -U postgres -d htttdn_crm_test -v .\database\backup\htttdn_crm_YYYYMMDD_HHmmss.dump
   ```
3. **Bước 3 — Đối chiếu và kiểm tra tính toàn vẹn:**
   Kiểm tra số lượng bản ghi của các bảng quan trọng để xác nhận phục hồi đủ 100%:
   ```sql
   \c htttdn_crm_test;
   SELECT 'Admin' as table_name, count(*) FROM "Admin"
   UNION ALL
   SELECT 'Client', count(*) FROM "Client"
   UNION ALL
   SELECT 'Survey', count(*) FROM "Survey"
   UNION ALL
   SELECT 'Product', count(*) FROM "Product"
   UNION ALL
   SELECT 'Order', count(*) FROM "Order";
   ```

### 4.3. Kịch bản 3: Tái tạo CSDL từ file Script SQL (Dựng môi trường mới / Chấm đồ án)
Khi chuyển giao dự án sang máy tính chấm bài mới chưa có database:

```powershell
# 1. Tạo database trống
psql -U postgres -c "DROP DATABASE IF EXISTS htttdn_crm;"
psql -U postgres -c "CREATE DATABASE htttdn_crm WITH ENCODING = 'UTF8';"

# 2. Nạp cấu trúc bảng (Schema Definition)
psql -U postgres -d htttdn_crm -f .\database\schema.sql

# 3. Nạp toàn bộ dữ liệu mẫu chuẩn (Seed Dataset: 3 Admin, 3 CRM, 10 Client, Đơn hàng, Khảo sát)
psql -U postgres -d htttdn_crm -f .\database\seed_full_crm_dataset.sql
```

---

## 5. TỰ ĐỘNG HÓA VÀ GIÁM SÁT (AUTOMATION & MONITORING)

### 5.1. Thiết lập Tự động hóa trên Windows (Task Scheduler)
Nhằm đảm bảo sao lưu diễn ra đều đặn mà không phụ thuộc vào thao tác thủ công, Quản trị viên thiết lập tác vụ tự động trên Windows Server / Windows OS:

1. Mở cửa sổ **Windows Task Scheduler** (`taskschd.msc`).
2. Chọn **Create Basic Task...**:
   - **Name:** `MIVA_CRM_Daily_DB_Backup`
   - **Trigger:** Chọn `Daily`, đặt giờ `00:00:00`.
   - **Action:** Chọn `Start a program`.
   - **Program/script:** `powershell.exe`
   - **Add arguments:** `-ExecutionPolicy Bypass -File "C:\CRM\htttdn-crm\database\backup.ps1"`
   - **Start in:** `C:\CRM\htttdn-crm`
3. Cấu hình quyền chạy ngầm ngay cả khi người dùng không đăng nhập (`Run whether user is logged on or not`).

### 5.2. Nhật ký Giám sát (Log File Tracking)
Mọi lượt chạy sao lưu tự động đều được ghi nhận vào file nhật ký `database/backup/backup.log` kèm dấu thời gian:
- **Nội dung log:** Thời điểm bắt đầu, dung lượng file sinh ra, trạng thái thoát (`Exit Code 0: SUCCESS`, `Exit Code khác: FAILED`), thời lượng sao lưu.
- **Cơ chế cảnh báo:** Khi phát hiện kích thước file `.dump` bất thường (nhỏ hơn 50KB hoặc mã lỗi khác 0), hệ thống gửi thông báo lỗi tới Quản trị viên kỹ thuật (`Admin Server`).

---

## 6. MA TRẬN KIỂM THỬ THỰC TẾ (TEST VERIFICATION MATRIX)

Phương án sao lưu và phục hồi đã được kiểm nghiệm thực tế và đạt kết quả kiểm thử **PASS 100%**:

| Mã Kịch Bản | Mục Tiêu Kiểm Thử | Các Bước Tiến Hành | Kết Quả Kỳ Vọng | Kết Quả Thực Tế | Trạng Thái |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **TC-BCK-01** | Sao lưu CSDL ra file `.dump` thành công | Chạy lệnh `.\database\backup.ps1` trên Terminal | Sinh file nén `htttdn_crm_*.dump` trong thư mục `database/backup/`, dung lượng > 0 | Đã sinh file `.dump` hoàn chỉnh, kích thước ~150KB | ✅ **PASS** |
| **TC-BCK-02** | Kiểm tra danh mục đối tượng trong file backup | Dùng lệnh `pg_restore -l <file.dump>` | Hiển thị đủ 23 bảng, các khoá chính, khoá ngoại và các kiểu Enum | Đầy đủ 23 thực thể không thiếu sót | ✅ **PASS** |
| **TC-RST-01** | Phục hồi dữ liệu sau khi xóa thử nghiệm | Xóa thử 1 bảng hoặc sửa dữ liệu khách hàng -> Chạy `.\database\restore.ps1 -File <file.dump>` | Toàn bộ dữ liệu được hoàn nguyên chính xác về thời điểm tạo file backup | CSDL phục hồi nguyên trạng, không lỗi khóa ngoại | ✅ **PASS** |
| **TC-RST-02** | Vận hành ứng dụng sau phục hồi | Khởi động lại backend NestJS (`npm run start:dev`) và đăng nhập vào cả 3 cổng (`:5175`, `:5174`, `:5173`) | Đăng nhập thành công, xem được danh sách khảo sát, báo cáo sở thích và đơn hàng | Cả 3 cổng hoạt động trơn tru, API trả mã `200 OK` | ✅ **PASS** |

---

## 7. BIỆN PHÁP AN TOÀN VÀ BẢO MẬT BẢN SAO LƯU

1. **Tuân thủ quy tắc 3-2-1:**
   - **3 bản sao:** 1 bản CSDL Production đang chạy, 1 bản lưu tại máy chủ cục bộ (`database/backup`), 1 bản lưu tại thiết bị lưu trữ bên ngoài hoặc đám mây.
   - **2 loại phương tiện:** Lưu trên ổ đĩa nội bộ (NVMe/SSD) và ổ lưu trữ thứ cấp (External Drive/Cloud Storage).
   - **1 bản lưu ngoại vi (Off-site):** Định kỳ đồng bộ bản sao lưu tuần lên hệ thống lưu trữ độc lập để phòng ngừa rủi ro cháy nổ hoặc hỏng hóc phần cứng máy chủ.
2. **Bảo mật dữ liệu nhạy cảm:**
   - Mật khẩu người dùng trong toàn bộ bảng `Admin` và `Client` đều đã được mã hóa băm một chiều an toàn bằng thuật toán `bcrypt` (độ dài salt rounds = 10), đảm bảo kẻ xấu dù có được file backup cũng không thể khôi phục được mật khẩu gốc của người dùng.
   - Phân quyền tệp tin trên hệ điều hành (`NTFS Permissions`): Giới hạn quyền đọc file trong thư mục `database/backup/` chỉ dành cho tài khoản dịch vụ Quản trị Hệ thống (`Administrator / Service Account`).
