# Quản Lý Chi Tiêu Team (Google Apps Script)

## 📌 Kiến trúc dự án
Dự án là một web app chạy trên Google Apps Script (GAS), thay thế hệ thống quản lý chi tiêu nội bộ/nhóm không cần server hay database phức tạp.

### File Structure
```
├── Code.gs              # Backend API (GAS)
├── index.html           # Shell SPA — chỉ chứa <head>, header, nav, include()
├── utils.html           # Toàn bộ JavaScript (state, render, utils, event handlers)
├── edit-modal.html      # Partial: modal chỉnh sửa giao dịch (F3)
├── tab-tong-quan.html   # Partial: tab Tổng Quan + debt toggle (F1)
├── tab-tao-don.html     # Partial: tab Tạo Đơn
├── tab-lich-su.html     # Partial: tab Lịch Sử + CSV export (F5b)
├── tab-bao-cao.html     # Partial: tab Báo Cáo analytics (F2)
├── tab-thanh-vien.html  # Partial: tab Thành Viên
├── test/
│   └── test-utils.js    # Pure Node.js tests (CSV, simplifyDebts, aggregate, validate)
└── docs/superpowers/plans/2026-04-18-5-features-implementation.md
```

### Database Schema (Google Sheets)
| Sheet | Columns |
|-------|---------|
| `ThanhVien` | `id`, `ten`, `ngayThem` |
| `GiaoDich` | `id`, `nguoiTra`, `ngay`, `moTa`, `tongTien`, `nguon`, `trangThai` |
| `ChiTiet` | `id`, `giaoDichId`, `thanhVienId`, `soTien`, `daThanhToan` |
| `LichSuThanhToan` | `id`, `chiTietId`, `ngayThanhToan`, `nguoiXacNhan` |

### Frontend Partial Architecture
`index.html` dùng `<?!= include('filename') ?>` để inject các partial HTML. Mỗi tab là một file riêng. JavaScript gom hết trong `utils.html`.

## 🚀 Tech Stack
- **Backend & Host**: Google Apps Script Runtime (JavaScript V8)
- **Frontend**: HTML5, Vanilla ES6, Tailwind CSS (CDN), Chart.js 4.x (CDN)
- **Data Communication**: `google.script.run` với Promise wrapper (`runAsync()`)
- **Testing**: Pure Node.js — không phụ thuộc GAS runtime

## ✅ Tính năng đã triển khai

### F1 — Tối ưu hóa nợ (Minimize Cash Flow)
- Thuật toán greedy gộp chuỗi nợ: A→B→C collapse thành A→C
- Toggle button trên tab Tổng Quan: "Tối ưu hóa" ↔ "Đang tối ưu"
- Badge hiển thị số giao dịch sau tối ưu so với ban đầu
- Hàm: `simplifyDebts(summaryData)` trong `utils.html`

### F2 — Analytics Dashboard (Chart.js)
- Bar chart: chi tiêu 6 tháng gần nhất
- Doughnut chart: phân bổ theo nguồn đặt (Grab / ShopeeFood / Bên ngoài)
- Horizontal bar chart: chi tiêu theo thành viên (đứng ra trả vs phần chia)
- Filter theo tháng, so sánh tháng này vs tháng trước
- Hàm: `aggregateByMonth()`, `aggregateByMember()`, `aggregateBySource()`, `renderAnalytics()`

### F3 — Chỉnh sửa giao dịch (Edit Transaction)
- Modal `edit-modal.html` với form đầy đủ: payer, date, description, source, split
- `openEditModal(txId)` pre-populate form từ transaction data
- Client-side validation: `validateTransactionData()` kiểm tra tổng chia khớp bill
- Backend atomic: `editTransaction()` trong Code.gs dùng LockService, xóa ChiTiet cũ → insert mới
- Submit handler trong `form-edit-tx` event listener

### F5a — Audit log lịch sử thanh toán
- Sheet `LichSuThanhToan` ghi lại: ai thanh toán, lúc nào, xác nhận bởi ai
- `markAsPaidWithLog()` thay thế `markAsPaid()` — atomic với LockService
- `getTransactions()` join `paidAt` timestamp từ audit log
- Render timestamp dưới badge "Đã trả" trong `renderHistory()`

### F5b — Xuất CSV lịch sử giao dịch
- BOM UTF-8 để Excel hiển thị tiếng Việt đúng
- Columns: Ngày, Mô tả, Nguồn, Người trả, Tổng tiền, Người chia, Số tiền, Đã thanh toán
- Hàm: `exportToCSV(transactions, members)`
- Nút "Xuất CSV" trong filter bar tab Lịch Sử

## ✍️ Conventions (Dành cho AI Agent)
- **Keep it Single File**: Không chia UI thành components hay framework
- **Async/Await**: Mọi `google.script.run` gọi qua `runAsync()` wrapper
- **Atomic Operations**: Mọi thao tác ghi Sheet phải dùng `LockService.getScriptLock()`
- **UI/UX Tiếng Việt**: 100% label/tooltip tiếng Việt có dấu, format tiền `Intl.NumberFormat('vi-VN')`
- **TDD cho Pure JS**: Logic tính toán viết trong `utils.html`, test bằng `node test/test-utils.js`
- **Partial Files**: index.html là shell, dùng `include()` cho các tab/modal

## 🔧 Testing
```bash
node test/test-utils.js
```
Test coverage: CSV export (8), simplifyDebts (7), aggregate functions (8), validateTransactionData (7) = **30 tests**