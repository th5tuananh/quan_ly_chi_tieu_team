# Quản Lý Chi Tiêu Team (Google Apps Script)

## 📌 Kiến trúc dự án
Dự án là một web app chạy trên Google Apps Script (GAS), thay thế hệ thống quản lý chi tiêu nội bộ/nhóm không cần server hay database phức tạp.

### Sơ đồ kiến trúc

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (SPA)                          │
│  index.html + Partial HTMLs + Vanilla JS (utils.html)          │
│  ├── Tailwind CSS (CDN)                                        │
│  ├── Chart.js 4.x (CDN)                                        │
│  └── google.script.run (GAS RPC)                              │
└────────────────────┬──────────────────────────────────────────┘
                     │ HTTP (google.script.run)
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│               Google Apps Script Runtime                       │
│  Code.gs                                                         │
│  ├── doGet() → HtmlService                                     │
│  ├── include() → HtmlService                                   │
│  ├── initializeSpreadsheet() → SpreadsheetApp                  │
│  └── [GAS functions] → LockService + Sheets API                │
└────────────────────┬──────────────────────────────────────────┘
                     │ Sheets API
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Google Sheets (Database)                     │
│  ├── ThanhVien   (thành viên)                                  │
│  ├── GiaoDich    (giao dịch chính)                             │
│  ├── ChiTiet     (ai nợ bao nhiêu trong mỗi giao dịch)          │
│  └── LichSuThanhToan (audit log thanh toán)                    │
└─────────────────────────────────────────────────────────────────┘
```

### Sơ đồ luồng dữ liệu (Data Flow)

```
User Action          Frontend (utils.html)          Backend (Code.gs)           Sheets
─────────────────────────────────────────────────────────────────────────────────────
Tạo đơn
  submit form   →   runAsync('addTransaction')  →  addTransaction()        →  GiaoDich + ChiTiet
                      ↓                                    ↓
                 refreshUI()                              return {success}
                 (loadData + render*)

Xem tổng quan
  tab switch    →   runAsync('getTransactions')  →  getTransactions()       →  ChiTiet
                  runAsync('getSummary')       →  getSummary()            →  ChiTiet + GiaoDich
                  runAsync('getMembers')        →  getMembers()            →  ThanhVien

Check trả nợ
  bấm button    →   runAsync('markAsPaidWithLog')  →  markAsPaidWithLog() →  ChiTiet (daThanhToan=true)
                                                                      LichSuThanhToan (audit log)
Xác nhận "đã trả hết"
  bấm button    →   runAsync('markAllPaidForMember')  → markAllPaidForMember() → ChiTiet
                      ↓                                    ↓
                 refreshUI()                              return {success}
```

### File Structure

```
├── Code.gs              # Backend API (GAS)
├── index.html           # Shell SPA — <head>, header, nav, include()
├── utils.html           # Toàn bộ JavaScript (state, render, utils, handlers)
├── edit-modal.html      # Partial: modal chỉnh sửa giao dịch (F3)
├── tab-tong-quan.html   # Partial: tab Tổng Quan + debt toggle (F1)
├── tab-tao-don.html     # Partial: tab Tạo Đơn
├── tab-lich-su.html     # Partial: tab Lịch Sử + CSV export (F5b)
├── tab-bao-cao.html     # Partial: tab Báo Cáo analytics (F2)
├── tab-thanh-vien.html  # Partial: tab Thành Viên
├── test/
│   └── test-utils.js    # Pure Node.js tests
└── docs/superpowers/
    ├── plans/
    │   ├── 2026-04-18-5-features-implementation.md
    │   └── 2026-04-22-debt-settlement-design.md
    └── specs/
```

### Database Schema (Google Sheets)

| Sheet | Columns | Mô tả |
|-------|---------|--------|
| `ThanhVien` | `id`, `ten`, `ngayThem` | Danh sách thành viên |
| `GiaoDich` | `id`, `nguoiTra`, `ngay`, `moTa`, `tongTien`, `nguon`, `trangThai` | Giao dịch chính |
| `ChiTiet` | `id`, `giaoDichId`, `thanhVienId`, `soTien`, `daThanhToan` | Ai nợ bao nhiêu trong mỗi GD |
| `LichSuThanhToan` | `id`, `chiTietId`, `ngayThanhToan`, `nguoiXacNhan` | Audit log khi check trả nợ |

### Frontend Partial Architecture
`index.html` dùng `<?!= include('filename') ?>` để inject các partial HTML. Mỗi tab là một file riêng. JavaScript gom hết trong `utils.html`.

### ID Conventions
- Thành viên: `TV001`, `TV002`, ...
- Giao dịch: `GD001`, `GD002`, ...
- Chi tiết: `CT0001`, `CT0002`, ...
- Log thanh toán: `LT0001`, `LT0002`, ...

## 🚀 Tech Stack
- **Backend & Host**: Google Apps Script Runtime (JavaScript V8)
- **Frontend**: HTML5, Vanilla ES6, Tailwind CSS (CDN), Chart.js 4.x (CDN)
- **Data Communication**: `google.script.run` với Promise wrapper (`runAsync()`)
- **Testing**: Pure Node.js — không phụ thuộc GAS runtime

## ✅ Tính năng đã triển khai

### F1 — Tối ưu hóa nợ (Minimize Cash Flow)
- Thuật toán greedy gộp chuỗi nợ: A→B→C collapse thành A→C (net balance)
- Toggle button trên tab Tổng Quan: "Tối ưu hóa" ↔ "Đang tối ưu"
- Badge hiển thị số giao dịch sau tối ưu so với ban đầu
- **Chỉ thay đổi UI** — dữ liệu `ChiTiet` gốc không đổi
- **Cách hoạt động:** `simplifyDebts(summaryData)` đọc net debts → balance each person → greedy match debtor/creditor → collapse chains
- **Xác nhận:** `markAllPaidForMember(debtorId, creditorId)` mark các ChiTiet gốc mà debtor nợ creditor trong các GD active là đã trả

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

## 🔧 Testing
```bash
node test/test-utils.js
```
Test coverage: CSV export (8), simplifyDebts (7), aggregate functions (8), validateTransactionData (7), settlement logic (10) = **40 tests**

## ✍️ Conventions (Dành cho AI Agent)

### Backend (Code.gs)
- **Mọi function đều trả về JSON string** — dùng `JSON.stringify()` hoặc `JSON.stringify({error: ...})`
- **Atomic Operations**: Mọi thao tác ghi Sheet phải dùng `LockService.getScriptLock()` với `waitLock(10000)` và `releaseLock()` trong `finally`
- **ID Generation**: Parse ID cuối cùng bằng regex, tăng số, pad zero (e.g., `TV001`, `GD001`)
- **initializeSpreadsheet()** hỗ trợ 3 modes:
  1. `MY_SPREADSHEET_ID` được điền → dùng ID cứng
  2. Container-bound (gắn với Sheet) → dùng `SpreadsheetApp.getActiveSpreadsheet()`
  3. Standalone → tạo Spreadsheet mới và lưu ID vào ScriptProperties

### Frontend (utils.html)
- **runAsync(fnName, ...args)**: Promise wrapper cho `google.script.run`
- **`refreshUI()`**: Load lại data + gọi tất cả render functions
- **`updateDashboard()`**: Chỉ load summary + member → render debt summary
- **Format tiền**: `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })`
- **Partial Files**: index.html là shell, dùng `include()` cho các tab/modal
- **Không chia components**: Tất cả UI logic trong một hàm render lớn

### Naming Conventions
- Sheet columns: snake_case (e.g., `nguoiTra`, `daThanhToan`)
- JS variables/functions: camelCase (e.g., `chiTiet`, `markPairPaid`)
- IDs: UPPER_SNAKE_CASE with number padding (e.g., `TV001`, `CT0001`)
