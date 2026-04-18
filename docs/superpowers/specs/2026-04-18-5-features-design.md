# Design: 5 Tính Năng Mới — Quản Lý Chi Tiêu Team
**Ngày:** 2026-04-18  
**Tác giả:** Claude (PM + Tech Lead role)  
**Trạng thái:** Approved bởi user

---

## Tổng Quan

Bổ sung 5 tính năng vào web app Google Apps Script hiện tại (`Code.gs` + `index.html`). Do `index.html` đang ở 957 dòng và sẽ phình to, quyết định kiến trúc quan trọng nhất là **tách partial files** dùng GAS `HtmlService.include()`.

---

## Quyết Định Kiến Trúc

### Tách File theo Partial System của GAS

GAS cho phép inject HTML partials qua cú pháp `<?!= HtmlService.createHtmlOutputFromFile('partial').getContent() ?>`. Cần thêm hàm helper vào `Code.gs`:

```javascript
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
```

Cấu trúc file mới:

```
Code.gs                  → Tất cả GAS backend functions
index.html               → Shell: <head>, nav, bottom nav, include partials
partials/tab-tong-quan.html   → Tổng quan + debt table + F1 toggle + F4 button
partials/tab-tao-don.html     → Form tạo giao dịch (không đổi)
partials/tab-lich-su.html     → Lịch sử + F5 export button
partials/tab-bao-cao.html     → F2: Analytics tab (Chart.js)
partials/tab-thanh-vien.html  → Thành viên + email field (F4)
partials/edit-modal.html      → F3: Modal chỉnh sửa giao dịch
partials/utils.html           → Pure JS functions (testable độc lập)
```

### Nguyên Tắc Pure JS First

Mọi logic tính toán phức tạp nằm trong `partials/utils.html` dưới dạng Pure JS functions không phụ thuộc GAS API. Có thể copy ra file `.js` và test bằng Node.js với mock data.

### Schema Thay Đổi

| Sheet | Thay đổi |
|-------|---------|
| `ThanhVien` | Thêm cột `email` (optional, null = bỏ qua khi gửi mail) |
| `LichSuThanhToan` | **Mới** — `id`, `chiTietId`, `ngayThanhToan`, `nguoiXacNhan` |

---

## Feature 1: Thuật Toán Tối Ưu Hóa Nợ

### Mục tiêu
Thay thế hiển thị "net bilateral debt" bằng "minimum transactions" — giảm số lần chuyển tiền cần thiết cho toàn nhóm.

### Thuật Toán "Minimize Cash Flow" (Greedy)
1. Từ `summaryData[]`, xây dựng `netBalance` map: mỗi người = tổng họ được nhận − tổng họ phải trả
2. Lặp greedy: tìm người có `netBalance` thấp nhất (nợ nhiều nhất) và cao nhất (được nợ nhiều nhất)
3. Transfer = `min(|maxOwes|, |maxOwed|)` → tạo 1 giao dịch, trừ balance cả 2
4. Lặp đến khi tất cả balance = 0

### Interface Pure JS Function
```javascript
// Input: mảng {from, fromName, to, toName, amount} từ getSummary()
// Output: mảng {from, fromName, to, toName, amount} — đã tối ưu, ít phần tử hơn
function simplifyDebts(summaryData) { ... }
```

### Data Flow
- Không cần GAS call mới
- Lấy `summaryData` từ kết quả `getSummary()` đã có trong memory
- Toggle UI giữa "Chi tiết đầy đủ" và "Tối ưu hóa" → chạy lại render với dữ liệu tương ứng

### UI
- Toggle button ở header section "Chi tiết Ai Nợ Ai"
- Khi bật: hiển thị badge "Đã tối ưu — X giao dịch thay vì Y"

### Mock Data để Test Node.js
```javascript
const mockSummary = [
  { from: 'TV001', fromName: 'A', to: 'TV002', toName: 'B', amount: 100000 },
  { from: 'TV003', fromName: 'C', to: 'TV002', toName: 'B', amount: 50000 },
  { from: 'TV002', fromName: 'B', to: 'TV004', toName: 'D', amount: 80000 },
];
// Expected: simplifyDebts(mockSummary).length < mockSummary.length
```

---

## Feature 2: Dashboard Phân Tích Chi Tiêu Theo Tháng

### Mục tiêu
Tab "Báo Cáo" mới với charts trực quan: chi tiêu theo tháng, theo người, theo nguồn đặt.

### Components
- Tab thứ 5 trong nav (desktop + mobile)
- Chart.js qua CDN (`https://cdn.jsdelivr.net/npm/chart.js`)
- Month picker để lọc dữ liệu

### Pure JS Aggregate Functions
```javascript
// Trả về { [YYYY-MM]: totalAmount }
function aggregateByMonth(transactions) { ... }

// Trả về { [memberId]: { name, totalPaid, totalOwed } }
function aggregateByMember(transactions, members) { ... }

// Trả về { [source]: totalAmount }
function aggregateBySource(transactions, monthFilter) { ... }
```

### Charts Hiển Thị
| Chart | Type | Dữ liệu |
|-------|------|---------|
| Chi tiêu theo tháng (6 tháng gần nhất) | Bar | `aggregateByMonth()` |
| Phân bổ theo người | Horizontal Bar | `aggregateByMember()` |
| Phân bổ theo nguồn | Doughnut | `aggregateBySource()` |

### Data Flow
- **Không cần GAS call mới** — dùng `transactions[]` đã load vào memory lúc khởi động
- Khi chuyển sang tab Báo Cáo: gọi aggregate functions → render charts

### Mock Data để Test Node.js
```javascript
const mockTransactions = [
  { ngay: '2026-03-15', tongTien: 250000, nguon: 'Grab', nguoiTra: 'TV001', chiTiet: [...] },
  { ngay: '2026-04-10', tongTien: 180000, nguon: 'ShopeeFood', nguoiTra: 'TV002', chiTiet: [...] },
];
```

---

## Feature 3: Chỉnh Sửa Giao Dịch

### Mục tiêu
Cho phép sửa thông tin bill đã tạo (người trả, ngày, mô tả, tổng tiền, cách chia) mà không cần xóa tạo lại.

### GAS Backend: `editTransaction(id, newDataStr)`
Logic trong `LockService` block:
1. Parse `newDataStr` → `newData`
2. Tìm row GD theo `id` → update 5 cột (nguoiTra, ngay, moTa, tongTien, nguon)
3. Xóa **tất cả** ChiTiet rows có `giaoDichId === id`
4. Insert ChiTiet rows mới từ `newData.chiTiet`
5. Return `JSON.stringify({success: true})`

### Pure JS Validation
```javascript
// Validate trước khi gọi GAS — tránh lãng phí lock time
function validateTransactionData(data) {
  // Check: payer exists, total > 0, sum of chiTiet ≈ total (±10đ), ≥1 participant
  // Returns: { valid: bool, errors: string[] }
}
```

### UI
- Nút "Chỉnh sửa" thêm vào card expand (cạnh "Xoá Bill")
- Click → mở modal full-screen reuse layout của form Tạo Đơn
- Pre-populate toàn bộ fields từ transaction hiện tại
- Submit → `editTransaction()` → close modal → reload + toast

### Schema Không Đổi — Chỉ Logic GAS Thay Đổi

### Mock Data để Test Node.js
```javascript
// Test validateTransactionData với edge cases:
// - sum ≠ total (lỗi)
// - không chọn ai (lỗi)
// - payer không trong chiTiet (valid — payer tự trả)
```

---

## Feature 4: Nhắc Nợ Tự Động qua Gmail

### Mục tiêu
1 nút → GAS gửi email cá nhân hóa tới từng thành viên nợ, liệt kê chi tiết họ nợ ai bao nhiêu.

### Schema Thay Đổi: `ThanhVien` + cột `email`
Cột thêm vào cuối → **backwards compatible** (code cũ đọc 3 cột đầu không ảnh hưởng).

### GAS Backend: `sendDebtReminders()`
```
1. getRemainingDailyQuota() → nếu < số người cần gửi → throw error cụ thể
2. Lấy summaryData từ getSummary()
3. Lấy members với email từ ThanhVien
4. Group debts theo debtor
5. Với mỗi debtor có email: MailApp.sendEmail(email, subject, htmlBody)
6. Return { sent: N, skipped: M, reason: 'no_email' }
```

### Pure JS Email Template Builder
```javascript
// Trả về HTML string — testable độc lập không cần MailApp
function buildReminderEmailHtml(memberName, debts) {
  // debts: [{ creditorName, amount }]
  // Returns: HTML email body tiếng Việt
}
```

### UI
- Nút "Nhắc nợ team 📧" ở cuối section "Chi tiết Ai Nợ Ai" (tab Tổng Quan)
- Response toast: "Đã gửi 3 email, bỏ qua 1 người (chưa có email)"
- Tab Thành Viên: thêm input email vào từng member card (có thể bỏ trống)
- Thêm hàm `updateMemberEmail(id, email)` trong `Code.gs`

### Quota Guard
```javascript
const remaining = MailApp.getRemainingDailyQuota(); // free: 100/ngày
if (remaining < debtorsWithEmail.length) {
  throw new Error(`Hết quota email hôm nay (còn ${remaining}, cần ${debtorsWithEmail.length})`);
}
```

---

## Feature 5a: Lịch Sử Thanh Toán (Audit Log)

### Mục tiêu
Ghi lại timestamp khi mỗi khoản nợ được mark paid — hiển thị "Đã trả lúc 14:30 ngày 15/04".

### Schema Mới: Sheet `LichSuThanhToan`
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | String | `LT0001`, `LT0002`... |
| `chiTietId` | String | FK → ChiTiet.id |
| `ngayThanhToan` | ISO String | Timestamp lúc mark paid |
| `nguoiXacNhan` | String | Tên hoặc ID người bấm nút |

### GAS Thay Đổi: `markAsPaidWithLog(chiTietId, confirmedBy)`
Thay thế `markAsPaid()` — cùng logic + thêm append row vào `LichSuThanhToan` trong cùng lock block.  
`confirmedBy`: string tên người xác nhận — truyền từ frontend (không có auth system, dùng dropdown "Ai xác nhận?" trong UI).  
**Lưu ý:** Frontend functions `markCtPaid()` và `markPairPaid()` phải update tham số sang `markAsPaidWithLog()`. `markAsPaid()` cũ giữ lại để backward-compatible hoặc xóa bỏ trong bước refactor.

### UI Thay Đổi
- Badge "Đã trả" trong transaction detail → thêm tooltip/subtext "lúc HH:MM DD/MM"
- `getTransactions()` cần join với `LichSuThanhToan` để trả về `paidAt` timestamp

---

## Feature 5b: Export CSV

### Mục tiêu
Tải toàn bộ lịch sử giao dịch ra file `.csv` — dùng cho Excel/kế toán.

### Pure JS Function
```javascript
// Input: transactions[], members[]
// Output: CSV string
function exportToCSV(transactions, members) {
  const headers = ['Ngày', 'Mô tả', 'Nguồn', 'Người trả', 'Tổng tiền', 'Người chia', 'Số tiền', 'Đã thanh toán'];
  // flatten chiTiet rows
  // Returns: CSV với BOM UTF-8 cho Excel đọc đúng tiếng Việt
}
```

### UI
- Nút "Xuất CSV 📥" trong thanh filter của tab Lịch Sử
- Click → gọi `exportToCSV()` → tạo `<a>` với `href="data:text/csv;charset=utf-8,..."` → auto click → download

### Không Cần GAS Call — 100% Pure Frontend

---

## Chiến Lược Test Tổng Thể

Tất cả Pure JS functions trong `partials/utils.html` đều có thể extract ra `test/utils.test.js` và chạy bằng Node.js với mock data:

```
test/
  mocks/
    transactions.mock.js    → Mảng transactions giả
    members.mock.js         → Mảng members giả
    summary.mock.js         → Mảng debt summary giả
  utils.test.js             → Test simplifyDebts, aggregate, validate, buildEmail, exportCSV
```

**GAS-specific functions** (`editTransaction`, `sendDebtReminders`, `markAsPaidWithLog`) được test bằng cách deploy lên GAS test environment — không mock GAS internals.

---

## Thứ Tự Triển Khai Đề Xuất

| Bước | Nội dung | Lý do |
|------|---------|-------|
| 1 | Tách partial files | Nền tảng, làm trước để các bước sau không conflict |
| 2 | F5b: Export CSV | Nhanh, không rủi ro, validate partial system hoạt động |
| 3 | F1: Debt simplification | Pure JS, không động backend |
| 4 | F2: Analytics | Pure JS + CDN |
| 5 | F3: Edit transaction | Backend phức tạp nhất |
| 6 | F5a: Audit log | Cần schema mới, test kỹ |
| 7 | F4: Email | Cuối cùng vì cần email data từ users thực |

---

## Rủi Ro & Giảm Thiểu

| Rủi ro | Mức độ | Giảm thiểu |
|--------|--------|-----------|
| `editTransaction` race condition | Medium | LockService bao toàn bộ delete + insert |
| Email quota cạn | Low | Guard `getRemainingDailyQuota()` trước khi send |
| Chart.js CDN offline | Low | Graceful fallback: ẩn tab Báo Cáo nếu Chart.js không load |
| `index.html` partial không load | Low | Error boundary trong `doGet()` |
