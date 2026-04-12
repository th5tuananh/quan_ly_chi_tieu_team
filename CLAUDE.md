# Quản Lý Chi Tiêu Team (Google Apps Script)

## 📌 Kiến trúc dự án
Dự án này là một web app chạy trên nền tảng Google Apps Script (GAS), đóng vai trò như một hệ thống quản lý chi tiêu nội bộ/nhóm tiện lợi, không cần server hay database phức tạp.
- **Code.gs**: Backend API của dự án. Chứa logic xử lý nội bộ, thao tác đọc/ghi với Google Sheets, tính toán công nợ và trả về JSON cho frontend. Khởi chạy app thông qua `doGet()`.
- **index.html**: Frontend Single-Page Application (SPA). Toàn bộ giao diện được gom trong một file duy nhất bao gồm cả HTML, CSS styling (Tailwind CSS thông qua CDN), và logic Vanilla Javascript.
- **Database**: Sử dụng Google Sheets đóng vai trò thay thế hệ quản trị CSDL. Dữ liệu bao gồm:
  - `ThanhVien`: Cấu trúc (`id`, `ten`, `ngayThem`)
  - `GiaoDich`: Cấu trúc (`id`, `nguoiTra`, `ngay`, `moTa`, `tongTien`, `nguon`, `trangThai`)
  - `ChiTiet`: Lưu chi tiết giao dịch ai nợ bao nhiêu trong mỗi lần chi (`id`, `giaoDichId`, `thanhVienId`, `soTien`, `daThanhToan`)

## 🚀 Tư duy công nghệ (Tech Stack)
- **Backend & Host**: Trực tiếp trên nền nền Google Apps Script Runtime (Javascript V8).
- **Frontend**: HTML5 truyền thống, Vanilla ECMAScript, TailwindCSS (tiếp cận utility-first).
- **Giao tiếp Dữ liệu**: Không dùng REST API `.fetch()` mà dùng hàm native của Google là `google.script.run` kết hợp với Promise pattern (`runAsync()` wrapper được định nghĩa sẵn bên trong `index.html`).

## ✍️ Hướng dẫn code & Conventions (Dành cho AI Agent)
- **Keep it Single File**: Bám sát việc không chia rẽ cấu trúc UI thành nhiều components hay framework. Mọi thứ phải gói gọn ở `Code.gs` và `index.html`.
- **Async/Await**: Sử dụng modern JS, promise wrapper để bắt lỗi mượt mà.
- **UI/UX Tiếng Việt**: Văn phong, label, tooltip 100% sử dụng Tiếng Việt có dấu, rành mạch và dễ hiểu. Sử dụng format tiện tệ với `Intl.NumberFormat('vi-VN')`.
- **Atomic Operations trên GAS**: Mọi thao tác làm thay đổi dữ liệu Database (Sheet) phải nằm giữa vòng block của `[LockService.getScriptLock()]` để tránh lỗi Race Condition khi nhiều người dùng cùng request tạo đơn hoặc thanh toán.
