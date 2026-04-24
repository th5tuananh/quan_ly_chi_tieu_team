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
├── tab-lich-su.html     # Partial: tab Lịch Sử + CSV export (F5b) + Batch Settlement footer (F6)
├── tab-bao-cao.html     # Partial: tab Báo Cáo analytics (F2)
├── tab-thanh-vien.html  # Partial: tab Thành Viên
├── test/
│   └── test-utils.js    # Pure Node.js tests
└── docs/superpowers/
    ├── ideas/
    │   └── ideas.md          # Backlog ý tưởng tính năng
    ├── plans/
    │   ├── 2026-04-18-5-features-implementation.md
    │   ├── 2026-04-22-debt-settlement-design.md
    │   ├── 2026-04-23-batch-settlement.md
    │   └── 2026-04-24-filter-bar-redesign.md
    └── specs/
        ├── 2026-04-23-debt-search-filter-design.md
        └── 2026-04-24-filter-bar-redesign.md
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

### F6 — Batch Settlement (Duyệt trả nợ hàng loạt)
- Checkbox hierarchy trong tab Lịch Sử: header GD tick = chọn ALL ChiTiet unpaid, row checkbox = chọn từng người
- Footer cố định (`fixed bottom-0`) hiện số đã chọn + nút "Xác nhận đã trả (X)"
- Backend: `markBatchPaid(chiTietIds[])` — nhận array, atomic mark `daThanhToan=true` + audit log cho từng dòng
- Frontend: `batchSelectedIds` Set + `handleBatchToggle()`, `handleBatchHeaderToggle()`, `updateBatchFooter()`, `submitBatchSettlement()`
- `refreshUI()` clear selection và ẩn footer sau khi submit thành công

### F7 — Debt Search & Filter (Tìm kiếm/Lọc nợ trong Tổng Quan)
- Filter bar với 2 dropdowns (Người nợ, Chủ nợ) + 2 number inputs (Từ/Đến VND) + nút Tìm/Reset
- Client-side filter trên `summaryData` đã load sẵn, không cần backend changes
- Empty state message khi không có kết quả
- Stats cards ẩn khi filter active
- Layout B: 2-row fixed với spacer `flex-1` đẩy buttons sang phải
- Hàm: `populateFilterDropdowns(members)`, `applyFilter(summaryData)`, `renderDebtSummary(displayData, isOptimized)`
- `window._summaryData` lưu raw summary để filter apply lên data gốc

## 🔧 Testing
```bash
node test/test-utils.js
```
Test coverage: CSV export (8), simplifyDebts (7), aggregate functions (8), validateTransactionData (7), settlement logic (10), markBatchPaid (7) = **47 tests**

## 🤖 Behavioral Guidelines (Dành cho AI Agent)

Nguyên tắc giảm LLM coding mistakes phổ biến. Áp dụng **cùng** các conventions ở trên.

**Tradeoff:** Các nguyên tắc này nghiêng về **cẩn thận** hơn **tốc độ**. Với trivial tasks, dùng judgment.

### 1. Think Before Coding

**Không assume. Không hide confusion. Surface tradeoffs.**

Trước khi implement:
- Nêu assumptions rõ ràng. Nếu không chắc, hỏi.
- Nếu có nhiều cách interpret, present cả — đừng pick im lặng.
- Nếu có approach đơn giản hơn, nói ra. Push back khi có lý do.
- Nếu something unclear, dừng. Nêu rõ cái gì đang confuse. Hỏi.

### 2. Simplicity First

**Code tối thiểu solve problem. Không speculative.**

- Không features ngoài scope request.
- Không abstractions cho single-use code.
- Không "flexibility" không được ask.
- Không error handling cho impossible scenarios.
- Nếu viết 200 lines mà có thể 50, viết lại.

Hỏi: *"Would a senior engineer nói đây là overcomplicated?"* Nếu có, simplify.

### 3. Surgical Changes

**Touch chỉ what you must. Clean up chỉ your own mess.**

Khi edit existing code:
- Đừng "improve" adjacent code, comments, hoặc formatting.
- Đừng refactor things aren't broken.
- Match existing style, even if you'd do differently.
- Nếu notice unrelated dead code, mention it — đừng delete it.

When changes create orphans:
- Remove imports/variables/functions mà YOUR changes làm unused.
- Đừng remove pre-existing dead code unless asked.

**Test:** Every changed line nên trace trực tiếp đến user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks thành verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

Với multi-step tasks, state brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

**These guidelines working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, và clarifying questions come **before** implementation rather than after mistakes.

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
