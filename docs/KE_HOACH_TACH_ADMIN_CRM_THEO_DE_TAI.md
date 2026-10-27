# Kế hoạch tách Admin Server và CRM Management theo đề tài đã chọn

## 1. Phạm vi theo phiếu chấm

Đề tài chọn **mục III.4: Mô phỏng hệ thống CRM**. Hệ thống cần đáp ứng phần chung I (báo cáo, phân tích, thiết kế), phần II (CSDL và Admin Server) và phần III.4 (người quản lý CRM và khách hàng). Không triển khai HRM hoặc MRP để lấy điểm mục III.

| Tác nhân | Chức năng cần có theo phiếu chấm | Giao diện |
| --- | --- | --- |
| Admin Server | Thêm, xóa, phân quyền tài khoản; quản lý tài khoản hệ thống | `http://localhost:5175/system/*` |
| Người quản lý CRM | Thêm, xóa, khóa tài khoản khách hàng; tiếp nhận phản hồi; báo cáo độ tuổi và sở thích; tạo, gửi khảo sát; thống kê kết quả | `http://localhost:5174/*` |
| Khách hàng | Đăng ký, đăng nhập, sửa thông tin; gửi phản hồi sản phẩm; nhận và thực hiện khảo sát | `http://localhost:5173/*` |

Sản phẩm là dữ liệu nền để khách hàng gửi phản hồi và xác định sở thích. Quản lý đơn hàng, voucher và các chức năng bán hàng là phần hỗ trợ demo, không thay thế bảy yêu cầu CRM ở mục 4.1 hoặc năm yêu cầu khách hàng ở mục 4.3.

**Quyết định về CSDL:** Giữ bảng `Admin` cho nhân sự quản trị và quản lý CRM, bảng `Client` cho khách hàng. Phiếu chấm yêu cầu tách *giao diện và quyền*, không yêu cầu tạo bảng `CRMManager` riêng. Phân biệt hai loại tài khoản bằng `roleCode` có giá trị rõ ràng (`SUPER_ADMIN`, `CRM_MANAGER`).

## 2. Hiện trạng sau khi triển khai

- Hai cổng `5175`/`5174` có route, layout, login và bản build theo mode riêng. Frontend đọc `roleCode` đã chuẩn hóa để chuyển hướng.
- Backend kiểm tra quyền `SUPER_ADMIN` hoặc `CRM_MANAGER` từ tài khoản trong CSDL trên từng request. API tài khoản hệ thống và doanh thu chỉ dành cho Admin Server; API CRM mặc định chỉ dành cho CRM Manager.
- Migration đã đổi mặc định `Admin.roleCode` sang `CRM_MANAGER` và đồng bộ vai trò của tài khoản cũ. Luồng tạo/cập nhật nhân sự ghi `roleCode` cùng với vai trò đã chọn.
- Đăng nhập và refresh token kiểm tra vai trò theo cổng; kết nối realtime Admin Server và CRM vào hai room khác nhau.
- URL Admin Server và số liệu test trong báo cáo đã được cập nhật. Số liệu khảo sát và minh chứng đóng góp thành viên vẫn cần đối chiếu với hồ sơ thực tế trước khi nộp.

## 3. Thứ tự triển khai

### Giai đoạn A — Chốt quyền và dữ liệu tài khoản

1. Lập ma trận quyền theo từng API và hành động: `SUPER_ADMIN` quản lý tài khoản hệ thống; `CRM_MANAGER` chỉ quản lý bản ghi khách hàng và nghiệp vụ CRM; `CLIENT` chỉ thao tác trên dữ liệu của chính mình.
2. Dùng `roleCode` làm nguồn quyền duy nhất ở backend. Chuyển dữ liệu hiện có từ `department` sang `roleCode`, cập nhật seed và tạo tài khoản để không mặc định gán `SUPER_ADMIN` cho CRM Manager. Giữ `department` chỉ nếu còn mục đích mô tả phòng ban.
3. Đăng nhập phải xác nhận tài khoản phù hợp cổng Admin hoặc CRM ở phía server. Khi đổi quyền hoặc khóa tài khoản, phiên cũ phải mất quyền ở request tiếp theo.

**Kết quả:** Hai tài khoản demo `admin@miva.vn` và `crm@miva.vn` có quyền đúng trong CSDL và profile; không có tài khoản CRM nào được nâng quyền do giá trị mặc định.

### Giai đoạn B — Tách quyền tại API

1. Tạo guard/decorator kiểm tra `roleCode` từ CSDL cho các API nhạy cảm.
2. Giới hạn API quản lý tài khoản hệ thống, phân quyền và báo cáo doanh thu cho `SUPER_ADMIN`.
3. Giới hạn CRM Manager khi gọi API khách hàng: chỉ tạo, đọc, cập nhật trạng thái và xóa mềm `Client`; không được tạo/sửa/xóa `Admin` hoặc tự nâng quyền.
4. Cho `CRM_MANAGER` truy cập đúng API phản hồi, khảo sát và báo cáo khách hàng. Khách hàng chỉ được sửa hồ sơ, phản hồi và trả lời khảo sát thuộc tài khoản của mình.

**Kết quả:** Gọi API trực tiếp bằng cookie CRM vào API Admin Server trả `403`; gọi API CRM bằng cookie khách hàng cũng trả `403`. Kiểm tra quyền không phụ thuộc URL frontend hay `x-app-role`.

### Giai đoạn C — Hoàn thiện giao diện tách biệt

1. Admin Server `:5175`: chỉ hiển thị đăng nhập Admin, quản lý tài khoản và phân quyền. CRM `:5174`: chỉ hiển thị đăng nhập CRM và các trang nghiệp vụ CRM. Client `:5173`: chỉ hiển thị luồng khách hàng.
2. Chuyển hướng bằng `roleCode` lấy từ profile. Chặn truy cập sai cổng, kể cả nhập URL trực tiếp hoặc tải lại trang.
3. Sắp xếp menu CRM để bảy chức năng mục 4.1 dễ tìm và dễ demo. Chức năng bán hàng hỗ trợ có thể đặt sau nhóm CRM hoặc ẩn khỏi kịch bản chấm chính.

**Kết quả:** Người chấm thấy rõ hai giao diện Admin Server và CRM Manager độc lập, đồng thời không thể vượt quyền qua API.

### Giai đoạn D — Kiểm thử theo phiếu chấm

Chuẩn bị ba tài khoản demo và dữ liệu: khách hàng có ngày sinh/sở thích, sản phẩm có phản hồi, khảo sát đã gửi và có câu trả lời. Chạy kiểm thử các luồng sau:

- **Admin:** thêm tài khoản CRM, gán quyền, khóa/xóa tài khoản; CRM không gọi được API Admin.
- **CRM:** thêm, khóa, xóa mềm khách hàng; nhận và trả lời phản hồi; xem tỷ lệ độ tuổi và sở thích; tạo, gửi khảo sát; xem thống kê kết quả.
- **Khách hàng:** đăng ký, đăng nhập, sửa hồ sơ, gửi phản hồi, nhận và trả lời khảo sát; không xem dữ liệu khách hàng khác.
- **CSDL:** tạo backup, khôi phục trên CSDL thử nghiệm và kiểm tra dữ liệu sau khôi phục.

Chỉ ghi `PASS` và số lượng test trong báo cáo sau khi chạy lại, lưu lệnh, thời điểm và kết quả thực tế.

### Giai đoạn E — Hồ sơ nộp theo phần I và II

1. Báo cáo in: giới thiệu doanh nghiệp; khảo sát HTTT ít nhất 15 câu và kết quả có nguồn; bài toán chi tiết; BFD, sơ đồ ngữ cảnh, DFD mức đỉnh; lược đồ và mô tả CSDL; ảnh giao diện; phương án cài đặt/chuyển đổi; hướng dẫn sử dụng; tổng kết và hướng phát triển.
2. Lập kế hoạch làm việc 15 tuần, ghi rõ phần việc và tỷ lệ đóng góp từng thành viên. Không ghi kết quả khảo sát hoặc đóng góp như dữ liệu đã thu thập nếu chưa có minh chứng.
3. Hồ sơ điện tử: `readme.txt`, source code, báo cáo và script SQL. Đồng bộ URL, cổng chạy, ảnh chụp màn hình và bảng test với phiên bản cuối.

## 4. Ưu tiên hoàn thành

1. **Bắt buộc trước demo:** Giai đoạn A và B; đây là điều kiện để việc tách Admin/CRM có hiệu lực thật.
2. **Bắt buộc để đạt mục III.4:** Giai đoạn C và các luồng CRM/khách hàng trong D.
3. **Bắt buộc trước nộp:** Backup/restore, dữ liệu demo và toàn bộ tài liệu ở E.

Không mở rộng HRM, MRP hoặc chức năng bán hàng mới trước khi các mục trên hoàn tất và được kiểm chứng.
