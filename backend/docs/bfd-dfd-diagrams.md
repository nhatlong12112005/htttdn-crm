# Sơ đồ BFD, Sơ đồ Ngữ cảnh (DFD Mức 0) & Luồng Dữ liệu Mức Đỉnh (DFD Mức 1)

Tài liệu được chuẩn hóa theo đúng kiến trúc 3 tác nhân (**Admin Server**, **Người Quản lý CRM**, **Khách hàng**) và lược đồ CSDL `prisma/schema.prisma`.

## 1. Sơ đồ Chức năng Kinh doanh — BFD (Business Function Diagram) (2đ)

```mermaid
flowchart TD
    ROOT["<b>HỆ THỐNG THÔNG TIN QUẢN LÝ KHÁCH HÀNG (CRM)<br/>& THƯƠNG MẠI THỜI TRANG MIVA</b>"]

    F1["<b>1. Quản trị Hệ thống<br/>(Admin Server)</b>"]
    F2["<b>2. Quản lý Hồ sơ<br/>Khách hàng (CRM)</b>"]
    F3["<b>3. Quản lý Phản hồi &<br/>Khảo sát Khách hàng</b>"]
    F4["<b>4. Báo cáo & Phân tích<br/>Khách hàng (CRM Analytics)</b>"]
    F5["<b>5. Quản lý Danh mục, Sản phẩm<br/>& Giao dịch Thương mại</b>"]
    F6["<b>6. Cổng Dịch vụ<br/>Khách hàng (Client Portal)</b>"]

    ROOT --> F1
    ROOT --> F2
    ROOT --> F3
    ROOT --> F4
    ROOT --> F5
    ROOT --> F6

    F1 --> F1_1["1.1. Đăng nhập Admin Server tách biệt"]
    F1 --> F1_2["1.2. Thêm, sửa, xóa tài khoản hệ thống"]
    F1 --> F1_3["1.3. Phân quyền vai trò (SUPER_ADMIN / CRM_MANAGER)"]
    F1 --> F1_4["1.4. Sao lưu & Phục hồi CSDL"]

    F2 --> F2_1["2.1. Thêm mới hồ sơ khách hàng"]
    F2 --> F2_2["2.2. Tra cứu, lọc & cập nhật thông tin KH"]
    F2 --> F2_3["2.3. Khóa / Mở khóa tài khoản khách hàng"]
    F2 --> F2_4["2.4. Xóa tài khoản khách hàng"]

    F3 --> F3_1["3.1. Tiếp nhận đánh giá & phản hồi sản phẩm"]
    F3 --> F3_2["3.2. Trả lời phản hồi của khách hàng"]
    F3 --> F3_3["3.3. Tạo bảng khảo sát & phát hành tới KH"]
    F3 --> F3_4["3.4. Thống kê kết quả khảo sát"]

    F4 --> F4_1["4.1. Thống kê tỷ lệ độ tuổi & độ tuổi trung bình"]
    F4 --> F4_2["4.2. Thống kê cơ cấu giới tính khách hàng"]
    F4 --> F4_3["4.3. Phân tích sở thích theo lượt yêu thích & mua sắm"]
    F4 --> F4_4["4.4. Ma trận sở thích danh mục theo từng độ tuổi"]

    F5 --> F5_1["5.1. Quản lý Danh mục quần áo"]
    F5 --> F5_2["5.2. Quản lý Sản phẩm, Màu sắc, Size & Tồn kho"]
    F5 --> F5_3["5.3. Quản lý Đơn hàng & Thanh toán"]
    F5 --> F5_4["5.4. Quản lý Mã giảm giá (Voucher)"]

    F6 --> F6_1["6.1. Đăng ký, Đăng nhập & Chỉnh sửa hồ sơ"]
    F6 --> F6_2["6.2. Xem sản phẩm, Thả tim yêu thích & Đặt hàng"]
    F6 --> F6_3["6.3. Gửi phản hồi / đánh giá về sản phẩm"]
    F6 --> F6_4["6.4. Nhận thông báo & Thực hiện khảo sát"]
```

## 2. Sơ đồ Ngữ cảnh — Context Diagram (DFD Mức 0) (2đ)

```mermaid
flowchart LR
    ADMIN["<b>ADMIN SERVER</b><br/>(Quản trị hệ thống)"]
    CRM["<b>NGƯỜI QUẢN LÝ CRM</b><br/>(CRM Manager)"]
    CLIENT["<b>KHÁCH HÀNG</b><br/>(Customer / Client)"]

    SYS(("<b>0.</b><br/><b>HỆ THỐNG THÔNG TIN</b><br/><b>QUẢN LÝ KHÁCH HÀNG (CRM)</b><br/><b>& THƯƠNG MẠI MIVA</b>"))

    ADMIN -->|"1. Thông tin đăng nhập Admin, lệnh tạo/xóa/khóa account & phân quyền"| SYS
    SYS -->|"2. Danh sách tài khoản, trạng thái phân quyền & nhật ký hệ thống"| ADMIN

    CRM -->|"3. Thông tin thêm/xóa/khóa KH, sản phẩm, câu trả lời phản hồi, bảng khảo sát"| SYS
    SYS -->|"4. Hồ sơ KH, phản hồi SP, báo cáo tỷ lệ độ tuổi/sở thích & thống kê khảo sát"| CRM

    CLIENT -->|"5. Đăng ký, đăng nhập, sửa hồ sơ, thả tim SP, đặt hàng, gửi phản hồi & nộp khảo sát"| SYS
    SYS -->|"6. Thông tin sản phẩm, trạng thái đơn hàng, câu trả lời CSKH & phiếu khảo sát"| CLIENT
```

## 3. Sơ đồ Luồng Dữ liệu Mức Đỉnh — Top-Level DFD (DFD Mức 1) (4đ)

```mermaid
flowchart TD
    %% External Entities
    ADMIN["<b>ADMIN SERVER</b>"]
    CRM["<b>NGƯỜI QUẢN LÝ CRM</b>"]
    CLIENT["<b>KHÁCH HÀNG</b>"]

    %% Processes
    P1(("<b>1.0</b><br/><b>Quản trị Tài khoản</b><br/><b>& Phân quyền</b>"))
    P2(("<b>2.0</b><br/><b>Quản lý Hồ sơ</b><br/><b>Khách hàng</b>"))
    P3(("<b>3.0</b><br/><b>Quản lý Sản phẩm,</b><br/><b>Yêu thích & Đơn hàng</b>"))
    P4(("<b>4.0</b><br/><b>Tiếp nhận & Xử lý</b><br/><b>Phản hồi Sản phẩm</b>"))
    P5(("<b>5.0</b><br/><b>Tạo, Gửi & Thống kê</b><br/><b>Khảo sát CRM</b>"))
    P6(("<b>6.0</b><br/><b>Tổng hợp Báo cáo</b><br/><b>Độ tuổi & Sở thích</b>"))

    %% Data Stores
    D1[("<b>D1: Tài khoản Quản trị</b><br/>(Admin)")]
    D2[("<b>D2: Hồ sơ Khách hàng</b><br/>(Client, ClientAddress)")]
    D3[("<b>D3: Danh mục & Sản phẩm</b><br/>(Category, Product, Color, Variant)")]
    D4[("<b>D4: Yêu thích, Giỏ hàng & Voucher</b><br/>(ProductFavorite, Cart, Voucher)")]
    D5[("<b>D5: Đơn hàng & Thanh toán</b><br/>(Order, OrderDetail, Payment)")]
    D6[("<b>D6: Phản hồi & Đánh giá</b><br/>(Review)")]
    D7[("<b>D7: Khảo sát & Thông báo</b><br/>(Survey, Question, Response, Notification)")]

    %% Flows for P1: Admin Account & RBAC
    ADMIN -->|"Thêm, xóa, khóa, phân quyền account"| P1
    P1 -->|"Danh sách & trạng thái tài khoản"| ADMIN
    P1 <-->|"Đọc / Ghi tài khoản Admin & CRM"| D1
    P1 <-->|"Kiểm tra email & trạng thái KH"| D2

    %% Flows for P2: Customer Management & Profile
    CLIENT -->|"Đăng ký, đăng nhập, sửa thông tin (ngày sinh, giới tính)"| P2
    CRM -->|"Thêm mới, xóa, khóa tài khoản khách hàng"| P2
    P2 -->|"Hồ sơ cá nhân & JWT Token"| CLIENT
    P2 -->|"Danh sách & trạng thái khách hàng"| CRM
    P2 <-->|"Lưu & truy vấn hồ sơ khách hàng"| D2

    %% Flows for P3: Catalog, Favorites & Orders
    CRM -->|"Thêm/sửa/xóa danh mục, sản phẩm, màu, size, voucher"| P3
    CLIENT -->|"Tìm kiếm SP, thả tim yêu thích, đặt hàng"| P3
    P3 -->|"Thông tin SP, giỏ hàng, hóa đơn"| CLIENT
    P3 <-->|"Cập nhật sản phẩm & tồn kho"| D3
    P3 <-->|"Lưu lượt thả tim yêu thích, giỏ hàng, voucher"| D4
    P3 <-->|"Lưu đơn hàng & chi tiết mua sắm"| D5

    %% Flows for P4: Product Feedback / Reviews
    CLIENT -->|"Gửi đánh giá sao & phản hồi về sản phẩm"| P4
    CRM -->|"Tiếp nhận & gửi câu trả lời (adminReply)"| P4
    P4 -->|"Hiển thị đánh giá & phản hồi của shop"| CLIENT
    P4 -->|"Danh sách phản hồi khách hàng"| CRM
    D3 -->|"Thông tin sản phẩm được đánh giá"| P4
    D5 -->|"Xác thực mặt hàng đã mua"| P4
    P4 <-->|"Lưu đánh giá & câu trả lời CSKH"| D6

    %% Flows for P5: Surveys & Survey Analytics
    CRM -->|"Tạo bảng khảo sát & phát hành tới tài khoản KH"| P5
    P5 -->|"Gửi thông báo & phiếu khảo sát"| CLIENT
    CLIENT -->|"Thực hiện & nộp câu trả lời khảo sát"| P5
    P5 -->|"Báo cáo thống kê kết quả khảo sát"| CRM
    D2 -->|"Danh sách khách hàng nhận khảo sát"| P5
    P5 <-->|"Lưu chiến dịch, câu hỏi, phiếu trả lời & thông báo"| D7

    %% Flows for P6: Customer Demographics & Preferences Report
    CRM -->|"Yêu cầu xem báo cáo KH, độ tuổi, sở thích"| P6
    D2 -->|"Ngày sinh (dateOfBirth) & Giới tính (gender)"| P6
    D4 -->|"Dữ liệu thả tim yêu thích & giỏ hàng"| P6
    D5 -->|"Lịch sử sản phẩm/danh mục đã mua"| P6
    D6 -->|"Điểm đánh giá mức độ hài lòng"| P6
    P6 -->|"Báo cáo tỷ lệ độ tuổi, giới tính & ma trận sở thích"| CRM
```
