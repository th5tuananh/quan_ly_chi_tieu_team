# 5 Tính Năng Mới — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bổ sung 5 tính năng vào app GAS: tối ưu hóa nợ, analytics tháng, chỉnh sửa bill, nhắc nợ email, audit log + CSV export.

**Architecture:** Tách `index.html` (957 dòng) thành partial files dùng GAS `HtmlService.include()`. Mọi logic tính toán là Pure JS trong `utils.html`, testable với Node.js. GAS functions chỉ xử lý Sheets I/O, bọc trong `LockService`.

**Tech Stack:** Google Apps Script, Vanilla JS ES6, Tailwind CSS CDN, Chart.js 4.x CDN, Node.js (test only)

---

## File Structure

| File | Trạng thái | Trách nhiệm |
|------|-----------|-------------|
| `Code.gs` | Modify | Thêm `include()`, `editTransaction()`, `markAsPaidWithLog()`, `sendDebtReminders()`, `updateMemberEmail()` |
| `index.html` | Rewrite → shell | `<head>`, `<header>`, mobile nav, loading overlay, `<?!= include(...) ?>` |
| `utils.html` | **Create** | Toàn bộ `<script>` JS: state, utils, render functions, pure functions mới |
| `tab-tong-quan.html` | **Create** | HTML của `#tab-tong-quan` + F1 toggle, F4 button |
| `tab-tao-don.html` | **Create** | HTML của `#tab-tao-don` (không đổi logic) |
| `tab-lich-su.html` | **Create** | HTML của `#tab-lich-su` + F5b export button |
| `tab-bao-cao.html` | **Create** | HTML tab Báo Cáo mới (F2) |
| `tab-thanh-vien.html` | **Create** | HTML của `#tab-thanh-vien` + email input (F4) |
| `edit-modal.html` | **Create** | Modal chỉnh sửa giao dịch (F3) |
| `test/test-utils.js` | **Create** | Node.js tests cho pure JS functions |

---

## Task 1: Partial File System — Infrastructure

**Files:**
- Modify: `Code.gs` (thêm `include()`, sửa `doGet()`)
- Rewrite: `index.html` → shell
- Create: `utils.html`, `tab-tong-quan.html`, `tab-tao-don.html`, `tab-lich-su.html`, `tab-thanh-vien.html`

- [ ] **Step 1: Cập nhật `doGet()` và thêm `include()` vào `Code.gs`**

Thay thế hàm `doGet()` hiện tại (dòng 6-10) và thêm `include()`:

```javascript
function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Quản Lý Chi Tiêu Team')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
```

- [ ] **Step 2: Tạo `utils.html` — chứa toàn bộ `<script>` block từ `index.html`**

Tạo file `utils.html` mới. Nội dung là toàn bộ khối `<script>` từ `index.html` dòng 339-955 (từ `// --- GLOBAL STATE ---` đến hết `</script>`), giữ nguyên tag `<script>`:

```html
<script>
  // --- GLOBAL STATE ---
  let members = [];
  let transactions = [];
  let splitMode = 'even';
  
  // ... (paste toàn bộ JS từ index.html dòng 341-954)
</script>
```

> **Lưu ý:** Giữ nguyên 100% nội dung JS. Bước này chỉ di chuyển, không thay đổi logic.

- [ ] **Step 3: Tạo `tab-tong-quan.html`**

Tạo file `tab-tong-quan.html`, nội dung là div `#tab-tong-quan` từ `index.html` dòng 97-167:

```html
<div id="tab-tong-quan" class="tab-content active">
  <!-- Top Metrics -->
  <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
    <!-- ... (copy từ index.html dòng 99-121) ... -->
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Ai nợ ai — desktop + mobile tables -->
    <!-- ... (copy từ index.html dòng 123-166) ... -->
  </div>
</div>
```

- [ ] **Step 4: Tạo `tab-tao-don.html`, `tab-lich-su.html`, `tab-thanh-vien.html`**

Tương tự Step 3, extract từng div tab từ `index.html`:
- `tab-tao-don.html` ← div `#tab-tao-don` (dòng 170-255)
- `tab-lich-su.html` ← div `#tab-lich-su` (dòng 258-287)
- `tab-thanh-vien.html` ← div `#tab-thanh-vien` (dòng 290-304)

- [ ] **Step 5: Rewrite `index.html` thành shell**

Thay thế toàn bộ nội dung `index.html` bằng:

```html
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Quản Lý Chi Tiêu Team</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
            mono: ['Fira Code', 'ui-monospace', 'monospace'],
          },
          colors: {
            primary: { 50: '#eef2ff', 100: '#e0e7ff', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3' },
            danger: { 50: '#fff1f2', 100: '#ffe4e6', 500: '#f43f5e', 600: '#e11d48' },
            success: { 50: '#ecfdf5', 100: '#d1fae5', 500: '#10b981', 600: '#059669' },
            warning: { 50: '#fffbeb', 100: '#fef3c7', 500: '#f59e0b', 600: '#d97706' },
            surface: { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 800: '#1e293b', 900: '#0f172a' }
          }
        }
      }
    }
  </script>
  <style>
    body { background-color: #f8fafc; color: #0f172a; -webkit-font-smoothing: antialiased; }
    .tabular-nums { font-variant-numeric: tabular-nums; font-family: 'Fira Code', monospace; letter-spacing: -0.02em; }
    .tab-content { display: none; opacity: 0; transition: opacity 0.2s ease; }
    .tab-content.active { display: block; animation: smoothFade 0.3s ease forwards; }
    @keyframes smoothFade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
    .glass-card { background: rgba(255, 255, 255, 0.95); border: 1px solid rgba(0,0,0,0.05); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03); }
    .soft-shadow { box-shadow: 0 1px 3px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.04); }
    .touch-target { min-height: 44px; min-width: 44px; display: flex; align-items: center; justify-content: center; }
    .spinner { border: 3px solid rgba(0,0,0,0.1); border-radius: 50%; border-top-color: #4f46e5; width: 40px; height: 40px; animation: spin 1s linear infinite; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .toast { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); transform: translateY(-100%); opacity: 0; margin-bottom: 0.5rem; }
    @media (max-width: 768px) { .toast { transform: translateY(100%); margin-top: 0; margin-bottom: 0.5rem; } }
    .toast.show { transform: translateY(0); opacity: 1; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
    input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    input[type=number] { -moz-appearance: textfield; }
    .pill-checkbox:checked + div { background-color: #e0e7ff; border-color: #4f46e5; color: #4338ca; }
    .pill-checkbox:checked + div svg { opacity: 1; transform: scale(1); }
  </style>
</head>
<body class="bg-surface-50 text-surface-900 min-h-screen flex flex-col font-sans">

  <header class="bg-white border-b border-surface-200 sticky top-0 z-30">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex flex-col sm:flex-row justify-between items-center py-4">
        <div class="flex items-center space-x-2 text-primary-600 mb-3 sm:mb-0">
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <h1 class="text-xl font-bold tracking-tight">Chi Tiêu Team</h1>
        </div>
        <nav class="hidden md:flex space-x-2 w-full sm:w-auto">
          <button class="nav-tab px-4 py-2 text-sm font-semibold border-b-2 border-primary-600 text-primary-600 transition" data-target="tab-tong-quan">Tổng Quan</button>
          <button class="nav-tab px-4 py-2 text-sm font-semibold border-b-2 border-transparent text-gray-500 hover:text-gray-800 transition" data-target="tab-tao-don">Tạo Đơn</button>
          <button class="nav-tab px-4 py-2 text-sm font-semibold border-b-2 border-transparent text-gray-500 hover:text-gray-800 transition" data-target="tab-lich-su">Lịch Sử</button>
          <button class="nav-tab px-4 py-2 text-sm font-semibold border-b-2 border-transparent text-gray-500 hover:text-gray-800 transition" data-target="tab-bao-cao">Báo Cáo</button>
          <button class="nav-tab px-4 py-2 text-sm font-semibold border-b-2 border-transparent text-gray-500 hover:text-gray-800 transition" data-target="tab-thanh-vien">Thành Viên</button>
        </nav>
      </div>
    </div>
  </header>

  <main class="flex-grow max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full pb-24 md:pb-8">
    <?!= include('tab-tong-quan') ?>
    <?!= include('tab-tao-don') ?>
    <?!= include('tab-lich-su') ?>
    <?!= include('tab-bao-cao') ?>
    <?!= include('tab-thanh-vien') ?>
  </main>

  <?!= include('edit-modal') ?>

  <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md shadow-[0_-2px_15px_rgba(0,0,0,0.05)] border-t border-surface-100 flex justify-around items-center h-16 z-40 px-2 pb-safe">
    <button class="nav-tab mobile-tab flex flex-col items-center justify-center w-full h-full text-primary-600 transition" data-target="tab-tong-quan">
      <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
      <span class="text-[10px] font-semibold leading-none">Tổng quan</span>
    </button>
    <button class="nav-tab mobile-tab flex flex-col items-center justify-center w-full h-full text-surface-400 hover:text-surface-700 transition relative" data-target="tab-tao-don">
      <div class="absolute -top-4 bg-primary-600 text-white p-3 rounded-full shadow-lg border-4 border-white"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg></div>
      <span class="text-[10px] font-semibold leading-none mt-7">Tạo Bill</span>
    </button>
    <button class="nav-tab mobile-tab flex flex-col items-center justify-center w-full h-full text-surface-400 hover:text-surface-700 transition" data-target="tab-lich-su">
      <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      <span class="text-[10px] font-semibold leading-none">Lịch sử</span>
    </button>
    <button class="nav-tab mobile-tab flex flex-col items-center justify-center w-full h-full text-surface-400 hover:text-surface-700 transition" data-target="tab-bao-cao">
      <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
      <span class="text-[10px] font-semibold leading-none">Báo cáo</span>
    </button>
    <button class="nav-tab mobile-tab flex flex-col items-center justify-center w-full h-full text-surface-400 hover:text-surface-700 transition" data-target="tab-thanh-vien">
      <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
      <span class="text-[10px] font-semibold leading-none">Nhóm</span>
    </button>
  </nav>

  <div id="loading" class="fixed inset-0 bg-surface-900/60 backdrop-blur-sm z-50 flex items-center justify-center hidden opacity-0 transition-opacity duration-300">
    <div class="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center w-40">
      <div class="spinner mb-4"></div>
      <p class="font-semibold text-surface-800 text-sm">Đang tải...</p>
    </div>
  </div>

  <div class="fixed top-4 md:top-auto md:bottom-24 left-4 right-4 md:left-auto md:right-8 z-50 flex flex-col gap-2 pointer-events-none items-end" id="toast-container"></div>

  <?!= include('utils') ?>
</body>
</html>
```

- [ ] **Step 6: Deploy lên GAS và kiểm tra app vẫn hoạt động bình thường**

Mở GAS Editor → Deploy → Test as web app → Kiểm tra 4 tab cũ còn load đúng, thêm/xóa bill/member vẫn hoạt động. Tab "Báo Cáo" hiển thị nhưng rỗng (bình thường).

- [ ] **Step 7: Commit**

```bash
git add Code.gs index.html utils.html tab-tong-quan.html tab-tao-don.html tab-lich-su.html tab-thanh-vien.html
git commit -m "refactor: tách index.html thành partial files dùng GAS include()"
```

---

## Task 2: F5b — CSV Export

**Files:**
- Modify: `utils.html` (thêm `exportToCSV()` + event handler)
- Modify: `tab-lich-su.html` (thêm nút Xuất CSV)
- Create: `test/test-utils.js`

- [ ] **Step 1: Tạo file test với failing test cho `exportToCSV()`**

Tạo `test/test-utils.js`:

```javascript
// test/test-utils.js — chạy bằng: node test/test-utils.js
function assert(condition, msg) {
  if (!condition) { console.error('FAIL:', msg); process.exit(1); }
  console.log('PASS:', msg);
}

// ===== COPY FUNCTIONS ĐỂ TEST (paste implementation vào đây) =====
function exportToCSV(transactions, members) {
  throw new Error('Not implemented');
}
// =================================================================

const mockMembers = [
  { id: 'TV001', ten: 'Heo' },
  { id: 'TV002', ten: 'Tuấn Anh' },
];
const mockTransactions = [
  {
    id: 'GD001', nguoiTra: 'TV001', ngay: '2026-04-10T00:00:00.000Z',
    moTa: 'Trà sữa Gong Cha', tongTien: 200000, nguon: 'Grab',
    chiTiet: [
      { id: 'CT001', thanhVienId: 'TV001', soTien: 100000, daThanhToan: true },
      { id: 'CT002', thanhVienId: 'TV002', soTien: 100000, daThanhToan: false },
    ]
  }
];

const csv = exportToCSV(mockTransactions, mockMembers);
const lines = csv.split('\n');
assert(lines.length >= 3, 'CSV có header + ít nhất 2 data rows (1 tx × 2 members)');
assert(lines[0].includes('Ngày'), 'Header có cột Ngày');
assert(csv.includes('Trà sữa Gong Cha'), 'CSV chứa mô tả giao dịch');
assert(csv.includes('Grab'), 'CSV chứa nguồn đặt');
assert(csv.includes('Heo'), 'CSV chứa tên người trả');
assert(csv.includes('Tuấn Anh'), 'CSV chứa tên người chia');
assert(csv.includes('Đã trả'), 'CSV chứa trạng thái Đã trả');
assert(csv.includes('Chưa trả'), 'CSV chứa trạng thái Chưa trả');
console.log('\n✓ Tất cả CSV tests passed!');
```

- [ ] **Step 2: Chạy test — xác nhận FAIL**

```bash
node test/test-utils.js
```

Expected output: `Error: Not implemented`

- [ ] **Step 3: Implement `exportToCSV()` trong `utils.html`**

Thêm vào `utils.html` bên trong `<script>`, trước `DOMContentLoaded`:

```javascript
const exportToCSV = (transactions, members) => {
  const memberMap = {};
  members.forEach(m => { memberMap[m.id] = m.ten; });

  const BOM = '\uFEFF';
  const headers = ['Ngày', 'Mô tả', 'Nguồn', 'Người trả', 'Tổng tiền', 'Người chia', 'Số tiền', 'Đã thanh toán'];
  const escape = (s) => `"${String(s).replace(/"/g, '""')}"`;

  const rows = [headers.join(',')];
  transactions.forEach(tx => {
    const date = tx.ngay ? tx.ngay.substring(0, 10) : '';
    const payerName = memberMap[tx.nguoiTra] || tx.nguoiTra;
    tx.chiTiet.forEach(ct => {
      rows.push([
        date,
        escape(tx.moTa),
        tx.nguon,
        payerName,
        tx.tongTien,
        memberMap[ct.thanhVienId] || ct.thanhVienId,
        ct.soTien,
        ct.daThanhToan ? 'Đã trả' : 'Chưa trả'
      ].join(','));
    });
  });
  return BOM + rows.join('\n');
};
```

- [ ] **Step 4: Copy implementation vào `test/test-utils.js`, chạy lại — xác nhận PASS**

Thay thế dòng `throw new Error('Not implemented')` trong test file bằng toàn bộ body của `exportToCSV` vừa viết, rồi:

```bash
node test/test-utils.js
```

Expected: `✓ Tất cả CSV tests passed!`

- [ ] **Step 5: Thêm nút "Xuất CSV" vào `tab-lich-su.html`**

Trong div filter bar (chứa `btn-refresh-history`), thêm button ngay sau button "Tải lại":

```html
<div class="w-full md:w-auto">
  <button id="btn-export-csv" class="w-full md:w-auto px-4 border border-surface-200 rounded-xl font-medium touch-target hover:bg-surface-50 flex items-center justify-center transition text-surface-700 bg-white">
    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
    Xuất CSV
  </button>
</div>
```

- [ ] **Step 6: Thêm event handler trong `utils.html`**

Trong block `DOMContentLoaded`, sau phần setup filter listeners:

```javascript
document.getElementById('btn-export-csv').addEventListener('click', () => {
  if (transactions.length === 0) return showToast('Chưa có dữ liệu để xuất', 'error');
  const csv = exportToCSV(transactions, members);
  const encodedUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `chi-tieu-team-${new Date().toISOString().substring(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Đã xuất file CSV');
});
```

- [ ] **Step 7: Deploy GAS, mở tab Lịch Sử, nhấn "Xuất CSV" — kiểm tra file tải về đúng**

- [ ] **Step 8: Commit**

```bash
git add utils.html tab-lich-su.html test/test-utils.js
git commit -m "feat: F5b - thêm chức năng xuất CSV lịch sử giao dịch"
```

---

## Task 3: F1 — Thuật Toán Tối Ưu Hóa Nợ

**Files:**
- Modify: `utils.html` (thêm `simplifyDebts()` + toggle logic)
- Modify: `tab-tong-quan.html` (thêm toggle UI)
- Modify: `test/test-utils.js` (thêm debt tests)

- [ ] **Step 1: Thêm failing test cho `simplifyDebts()` vào `test/test-utils.js`**

Append vào cuối `test/test-utils.js` (trước `console.log` cuối):

```javascript
// ===== TEST: simplifyDebts =====
function simplifyDebts(summaryData) {
  throw new Error('simplifyDebts not implemented');
}

// Test 1: Chain A→B→C nên collapse thành A→C
const chainInput = [
  { from: 'TV001', fromName: 'A', to: 'TV002', toName: 'B', amount: 100000 },
  { from: 'TV002', fromName: 'B', to: 'TV003', toName: 'C', amount: 100000 },
];
const chainResult = simplifyDebts(chainInput);
assert(chainResult.length === 1, 'Chain A→B→C collapse còn 1 transaction');
assert(chainResult[0].from === 'TV001', 'Chain: A là debtor');
assert(chainResult[0].to === 'TV003', 'Chain: C là creditor');
assert(chainResult[0].amount === 100000, 'Chain: amount đúng 100000');

// Test 2: Empty input
assert(simplifyDebts([]).length === 0, 'Empty input → empty output');

// Test 3: Single debt không thay đổi
const singleInput = [{ from: 'TV001', fromName: 'A', to: 'TV002', toName: 'B', amount: 50000 }];
const singleResult = simplifyDebts(singleInput);
assert(singleResult.length === 1, 'Single debt giữ nguyên');
assert(singleResult[0].amount === 50000, 'Single debt amount đúng');

// Test 4: Tam giác — tối ưu hóa giảm transaction count
const triangleInput = [
  { from: 'TV001', fromName: 'A', to: 'TV002', toName: 'B', amount: 100000 },
  { from: 'TV003', fromName: 'C', to: 'TV002', toName: 'B', amount: 50000 },
  { from: 'TV002', fromName: 'B', to: 'TV004', toName: 'D', amount: 80000 },
];
const triangleResult = simplifyDebts(triangleInput);
assert(triangleResult.length <= triangleInput.length, 'Tam giác: kết quả ≤ input count');
const totalBefore = triangleInput.reduce((s, x) => s + x.amount, 0);
const totalAfter = triangleResult.reduce((s, x) => s + x.amount, 0);
assert(Math.abs(totalBefore - totalAfter) < 2, 'Tổng tiền bảo toàn sau tối ưu hóa');
```

- [ ] **Step 2: Chạy test — xác nhận FAIL**

```bash
node test/test-utils.js
```

Expected: `Error: simplifyDebts not implemented`

- [ ] **Step 3: Implement `simplifyDebts()` trong `utils.html`**

Thêm vào `utils.html` trong `<script>`:

```javascript
const simplifyDebts = (summaryData) => {
  if (!summaryData.length) return [];

  const nameMap = {};
  const balance = {};

  summaryData.forEach(s => {
    nameMap[s.from] = s.fromName;
    nameMap[s.to] = s.toName;
    balance[s.from] = (balance[s.from] || 0) - s.amount;
    balance[s.to] = (balance[s.to] || 0) + s.amount;
  });

  const result = [];
  const b = { ...balance };

  for (let i = 0; i < 1000; i++) {
    Object.keys(b).forEach(k => { if (Math.abs(b[k]) < 1) delete b[k]; });
    if (!Object.keys(b).length) break;

    const entries = Object.entries(b);
    const [maxId, maxAmt] = entries.reduce((a, c) => c[1] > a[1] ? c : a);
    const [minId, minAmt] = entries.reduce((a, c) => c[1] < a[1] ? c : a);
    if (maxAmt <= 0 || minAmt >= 0) break;

    const transfer = Math.min(maxAmt, -minAmt);
    result.push({ from: minId, fromName: nameMap[minId], to: maxId, toName: nameMap[maxId], amount: Math.round(transfer) });
    b[maxId] -= transfer;
    b[minId] += transfer;
  }
  return result;
};
```

- [ ] **Step 4: Copy implementation vào test file, chạy lại — xác nhận PASS**

```bash
node test/test-utils.js
```

Expected: `✓ Tất cả CSV tests passed!` + `PASS: Chain A→B→C...` + `PASS: Tổng tiền bảo toàn...`

- [ ] **Step 5: Thêm toggle UI vào `tab-tong-quan.html`**

Trong div `flex justify-between items-end` trước table "Chi tiết Ai Nợ Ai", thêm toggle button:

```html
<div class="flex justify-between items-end">
  <h2 class="text-lg font-bold text-surface-900">Chi tiết Ai Nợ Ai</h2>
  <button id="btn-optimize-debt" class="text-xs font-semibold px-3 py-1.5 rounded-lg border border-surface-200 bg-white text-surface-600 hover:border-primary-400 hover:text-primary-600 transition flex items-center gap-1.5">
    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
    <span id="optimize-label">Tối ưu hóa</span>
  </button>
</div>
<div id="optimize-badge" class="hidden text-xs text-primary-700 bg-primary-50 border border-primary-100 px-3 py-1.5 rounded-lg font-medium"></div>
```

- [ ] **Step 6: Thêm toggle logic trong `utils.html`**

Thêm biến state và handler trong `DOMContentLoaded`:

```javascript
let isDebtOptimized = false;

document.getElementById('btn-optimize-debt').addEventListener('click', () => {
  isDebtOptimized = !isDebtOptimized;
  const btn = document.getElementById('btn-optimize-debt');
  const label = document.getElementById('optimize-label');
  const badge = document.getElementById('optimize-badge');
  if (isDebtOptimized) {
    btn.classList.add('border-primary-400', 'text-primary-600', 'bg-primary-50');
    btn.classList.remove('bg-white', 'text-surface-600');
    label.textContent = 'Đang tối ưu';
  } else {
    btn.classList.remove('border-primary-400', 'text-primary-600', 'bg-primary-50');
    btn.classList.add('bg-white', 'text-surface-600');
    label.textContent = 'Tối ưu hóa';
    badge.classList.add('hidden');
  }
  updateDashboard();
});
```

Trong hàm `updateDashboard()`, sau khi nhận `summary` từ `getSummary()`, thêm:

```javascript
const displayData = isDebtOptimized ? simplifyDebts(summary) : summary;
const badge = document.getElementById('optimize-badge');
if (isDebtOptimized && summary.length > 0) {
  badge.classList.remove('hidden');
  badge.textContent = `Tối ưu: ${displayData.length} giao dịch thay vì ${summary.length}`;
}
// Thay summary → displayData trong tất cả các chỗ render bên dưới
```

> **Lưu ý:** Trong phần render `tbodyDesktop` và `containerMobile`, đổi `summary.forEach(...)` thành `displayData.forEach(...)`. Hàm `markPairPaid` dùng id thật từ `summary`, không phải `displayData` — `displayData` chỉ dùng để hiển thị.

- [ ] **Step 7: Deploy GAS, kiểm tra toggle hoạt động — badge hiển thị đúng số lượng**

- [ ] **Step 8: Commit**

```bash
git add utils.html tab-tong-quan.html test/test-utils.js
git commit -m "feat: F1 - thêm thuật toán tối ưu hóa nợ (minimize cash flow)"
```

---

## Task 4: F2 — Analytics Dashboard

**Files:**
- Modify: `index.html` (thêm Chart.js CDN)
- Create: `tab-bao-cao.html`
- Modify: `utils.html` (thêm aggregate functions + `renderAnalytics()`)
- Modify: `test/test-utils.js` (thêm aggregate tests)

- [ ] **Step 1: Thêm Chart.js CDN vào `index.html`**

Trong `<head>`, sau thẻ Tailwind script:

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>
```

- [ ] **Step 2: Thêm failing tests cho aggregate functions vào `test/test-utils.js`**

Append vào cuối test file:

```javascript
// ===== TEST: Aggregate Functions =====
function aggregateByMonth(transactions) { throw new Error('not implemented'); }
function aggregateByMember(transactions, members) { throw new Error('not implemented'); }
function aggregateBySource(transactions, monthFilter) { throw new Error('not implemented'); }

const txMocks = [
  { ngay: '2026-03-10T00:00:00Z', tongTien: 300000, nguon: 'Grab', nguoiTra: 'TV001',
    chiTiet: [{ thanhVienId: 'TV001', soTien: 150000 }, { thanhVienId: 'TV002', soTien: 150000 }] },
  { ngay: '2026-04-05T00:00:00Z', tongTien: 200000, nguon: 'ShopeeFood', nguoiTra: 'TV002',
    chiTiet: [{ thanhVienId: 'TV001', soTien: 100000 }, { thanhVienId: 'TV002', soTien: 100000 }] },
  { ngay: '2026-04-15T00:00:00Z', tongTien: 180000, nguon: 'Grab', nguoiTra: 'TV001',
    chiTiet: [{ thanhVienId: 'TV001', soTien: 90000 }, { thanhVienId: 'TV002', soTien: 90000 }] },
];
const memMocks = [{ id: 'TV001', ten: 'Heo' }, { id: 'TV002', ten: 'Tuấn Anh' }];

const byMonth = aggregateByMonth(txMocks);
assert(byMonth['2026-03'] === 300000, 'aggregateByMonth: tháng 3 đúng');
assert(byMonth['2026-04'] === 380000, 'aggregateByMonth: tháng 4 đúng (200k+180k)');

const byMember = aggregateByMember(txMocks, memMocks);
assert(byMember['TV001'].totalPaid === 480000, 'aggregateByMember: TV001 totalPaid đúng (300k+180k)');
assert(byMember['TV002'].totalPaid === 200000, 'aggregateByMember: TV002 totalPaid đúng');

const bySource = aggregateBySource(txMocks, null);
assert(bySource['Grab'] === 480000, 'aggregateBySource: Grab đúng (300k+180k)');
assert(bySource['ShopeeFood'] === 200000, 'aggregateBySource: ShopeeFood đúng');

const bySourceFiltered = aggregateBySource(txMocks, '2026-04');
assert(bySourceFiltered['Grab'] === 180000, 'aggregateBySource với filter tháng 4: Grab đúng');
assert(!bySourceFiltered['ShopeeFood'] || bySourceFiltered['ShopeeFood'] === 200000, 'aggregateBySource filter: ShopeeFood tháng 4 đúng');
```

- [ ] **Step 3: Chạy test — xác nhận FAIL**

```bash
node test/test-utils.js
```

- [ ] **Step 4: Implement 3 aggregate functions trong `utils.html`**

```javascript
const aggregateByMonth = (txs) => {
  const result = {};
  txs.forEach(tx => {
    if (!tx.ngay) return;
    const m = new Date(tx.ngay).toISOString().substring(0, 7);
    result[m] = (result[m] || 0) + (parseFloat(tx.tongTien) || 0);
  });
  return result;
};

const aggregateByMember = (txs, mems) => {
  const result = {};
  mems.forEach(m => { result[m.id] = { name: m.ten, totalPaid: 0, totalOwed: 0 }; });
  txs.forEach(tx => {
    if (result[tx.nguoiTra]) result[tx.nguoiTra].totalPaid += parseFloat(tx.tongTien) || 0;
    tx.chiTiet.forEach(ct => {
      if (result[ct.thanhVienId]) result[ct.thanhVienId].totalOwed += parseFloat(ct.soTien) || 0;
    });
  });
  return result;
};

const aggregateBySource = (txs, monthFilter) => {
  const result = {};
  txs
    .filter(tx => !monthFilter || (tx.ngay && tx.ngay.startsWith(monthFilter)))
    .forEach(tx => {
      result[tx.nguon] = (result[tx.nguon] || 0) + (parseFloat(tx.tongTien) || 0);
    });
  return result;
};
```

- [ ] **Step 5: Copy implementations vào test file, chạy — xác nhận PASS**

```bash
node test/test-utils.js
```

- [ ] **Step 6: Tạo `tab-bao-cao.html`**

```html
<div id="tab-bao-cao" class="tab-content">
  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
    <h2 class="text-lg font-bold text-surface-900">Báo Cáo Chi Tiêu</h2>
    <select id="analytics-month" class="border border-surface-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-primary-500">
      <option value="">Tất cả thời gian</option>
    </select>
  </div>

  <div class="grid grid-cols-2 gap-4 mb-6">
    <div class="glass-card p-5 rounded-2xl">
      <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tháng này</p>
      <p id="analytics-this-month" class="text-2xl font-bold tabular-nums text-primary-600">0 đ</p>
    </div>
    <div class="glass-card p-5 rounded-2xl">
      <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tháng trước</p>
      <p id="analytics-last-month" class="text-2xl font-bold tabular-nums text-surface-700">0 đ</p>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div class="glass-card p-5 rounded-2xl">
      <h3 class="text-sm font-bold mb-4 text-surface-700">Chi tiêu theo tháng (6 tháng gần nhất)</h3>
      <canvas id="chart-monthly"></canvas>
    </div>
    <div class="glass-card p-5 rounded-2xl">
      <h3 class="text-sm font-bold mb-4 text-surface-700">Phân bổ theo nguồn đặt</h3>
      <canvas id="chart-source"></canvas>
    </div>
    <div class="glass-card p-5 rounded-2xl lg:col-span-2">
      <h3 class="text-sm font-bold mb-4 text-surface-700">Chi tiêu theo thành viên</h3>
      <canvas id="chart-member"></canvas>
    </div>
  </div>

  <div id="analytics-no-chart" class="hidden text-center py-10 text-surface-500">
    <p class="font-medium">Không thể tải Chart.js. Vui lòng kiểm tra kết nối mạng.</p>
  </div>
</div>
```

- [ ] **Step 7: Thêm `renderAnalytics()` vào `utils.html`**

```javascript
let monthlyChart = null, sourceChart = null, memberChart = null;

const renderAnalytics = () => {
  if (typeof Chart === 'undefined') {
    document.getElementById('analytics-no-chart').classList.remove('hidden');
    return;
  }

  const monthFilter = document.getElementById('analytics-month').value || null;
  const byMonth = aggregateByMonth(transactions);
  const bySource = aggregateBySource(transactions, monthFilter);
  const byMember = aggregateByMember(transactions, members);

  // Populate month selector (one-time)
  const sel = document.getElementById('analytics-month');
  const existingVals = Array.from(sel.options).map(o => o.value);
  Object.keys(byMonth).sort().reverse().forEach(m => {
    if (!existingVals.includes(m)) {
      const [y, mo] = m.split('-');
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = `Tháng ${mo}/${y}`;
      sel.appendChild(opt);
    }
  });

  // Summary cards
  const now = new Date();
  const thisM = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const lastMDate = new Date(now.getFullYear(), now.getMonth()-1, 1);
  const lastM = `${lastMDate.getFullYear()}-${String(lastMDate.getMonth()+1).padStart(2,'0')}`;
  document.getElementById('analytics-this-month').textContent = formatCurrency(byMonth[thisM] || 0);
  document.getElementById('analytics-last-month').textContent = formatCurrency(byMonth[lastM] || 0);

  // Bar chart: last 6 months
  const last6 = Array.from({length: 6}, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  });
  if (monthlyChart) monthlyChart.destroy();
  monthlyChart = new Chart(document.getElementById('chart-monthly'), {
    type: 'bar',
    data: {
      labels: last6.map(m => { const [y,mo] = m.split('-'); return `T${mo}/${y.slice(2)}`; }),
      datasets: [{ label: 'Chi tiêu', data: last6.map(m => byMonth[m] || 0),
        backgroundColor: '#6366f1', borderRadius: 6 }]
    },
    options: { responsive: true, plugins: { legend: { display: false } },
      scales: { y: { ticks: { callback: v => new Intl.NumberFormat('vi-VN',{notation:'compact'}).format(v) } } } }
  });

  // Doughnut: by source
  const srcLabels = Object.keys(bySource);
  const srcColors = { 'Grab': '#10b981', 'ShopeeFood': '#f59e0b', 'Bên ngoài': '#6366f1' };
  if (sourceChart) sourceChart.destroy();
  sourceChart = new Chart(document.getElementById('chart-source'), {
    type: 'doughnut',
    data: {
      labels: srcLabels,
      datasets: [{ data: srcLabels.map(s => bySource[s]),
        backgroundColor: srcLabels.map(s => srcColors[s] || '#94a3b8'), borderWidth: 0 }]
    },
    options: { responsive: true, plugins: {
      legend: { position: 'bottom' },
      tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${formatCurrency(ctx.raw)}` } }
    }}
  });

  // Horizontal bar: by member
  const memEntries = Object.values(byMember).filter(m => m.totalPaid > 0 || m.totalOwed > 0);
  if (memberChart) memberChart.destroy();
  memberChart = new Chart(document.getElementById('chart-member'), {
    type: 'bar',
    data: {
      labels: memEntries.map(m => m.name),
      datasets: [
        { label: 'Đứng ra trả', data: memEntries.map(m => m.totalPaid), backgroundColor: '#6366f1', borderRadius: 4 },
        { label: 'Phần chia', data: memEntries.map(m => m.totalOwed), backgroundColor: '#e2e8f0', borderRadius: 4 }
      ]
    },
    options: { responsive: true, indexAxis: 'y',
      plugins: { legend: { position: 'bottom' } },
      scales: { x: { ticks: { callback: v => new Intl.NumberFormat('vi-VN',{notation:'compact'}).format(v) } } } }
  });
};
```

- [ ] **Step 8: Kích hoạt `renderAnalytics()` khi chuyển tab và khi filter thay đổi**

Trong hàm `setupTabs()` (trong `utils.html`), thêm sau khi activate tab:

```javascript
if (targetId === 'tab-bao-cao') renderAnalytics();
```

Trong `DOMContentLoaded`, thêm:

```javascript
document.getElementById('analytics-month').addEventListener('change', renderAnalytics);
```

- [ ] **Step 9: Deploy GAS, mở tab Báo Cáo — kiểm tra 3 charts hiển thị đúng**

- [ ] **Step 10: Commit**

```bash
git add index.html tab-bao-cao.html utils.html test/test-utils.js
git commit -m "feat: F2 - thêm dashboard phân tích chi tiêu theo tháng với Chart.js"
```

---

## Task 5: F3 — Chỉnh Sửa Giao Dịch

**Files:**
- Modify: `Code.gs` (thêm `editTransaction()`)
- Create: `edit-modal.html`
- Modify: `utils.html` (thêm `validateTransactionData()`, `openEditModal()`, form logic)
- Modify: `tab-lich-su.html` (thêm nút Chỉnh sửa vào card)
- Modify: `test/test-utils.js` (thêm validation tests)

- [ ] **Step 1: Thêm failing test cho `validateTransactionData()`**

Append vào `test/test-utils.js`:

```javascript
// ===== TEST: validateTransactionData =====
function validateTransactionData(data) { throw new Error('not implemented'); }

const validData = {
  nguoiTra: 'TV001', ngay: '2026-04-18', moTa: 'Cơm trưa', tongTien: 200000,
  chiTiet: [{ thanhVienId: 'TV001', soTien: 100000 }, { thanhVienId: 'TV002', soTien: 100000 }]
};
const r1 = validateTransactionData(validData);
assert(r1.valid === true, 'validate: data hợp lệ → valid=true');
assert(r1.errors.length === 0, 'validate: data hợp lệ → không có lỗi');

const r2 = validateTransactionData({ ...validData, nguoiTra: '' });
assert(r2.valid === false, 'validate: thiếu người trả → invalid');
assert(r2.errors.some(e => e.includes('người trả')), 'validate: error message đề cập người trả');

const r3 = validateTransactionData({ ...validData, tongTien: 0 });
assert(r3.valid === false, 'validate: tongTien=0 → invalid');

const r4 = validateTransactionData({ ...validData, chiTiet: [] });
assert(r4.valid === false, 'validate: chiTiet rỗng → invalid');

const r5 = validateTransactionData({ ...validData,
  chiTiet: [{ thanhVienId: 'TV001', soTien: 50000 }, { thanhVienId: 'TV002', soTien: 50000 }]
});
assert(r5.valid === false, 'validate: sum chiTiet ≠ tongTien → invalid');
```

- [ ] **Step 2: Chạy test — xác nhận FAIL**

```bash
node test/test-utils.js
```

- [ ] **Step 3: Implement `validateTransactionData()` trong `utils.html`**

```javascript
const validateTransactionData = (data) => {
  const errors = [];
  if (!data.nguoiTra) errors.push('Chưa chọn người trả tiền');
  if (!data.ngay) errors.push('Chưa chọn ngày');
  if (!data.moTa || !data.moTa.trim()) errors.push('Chưa điền mô tả');
  if (!data.tongTien || data.tongTien <= 0) errors.push('Tổng tiền phải lớn hơn 0');
  if (!data.chiTiet || data.chiTiet.length === 0) errors.push('Chưa chọn người chia bill');
  if (data.chiTiet && data.tongTien > 0) {
    const sum = data.chiTiet.reduce((s, ct) => s + (parseFloat(ct.soTien) || 0), 0);
    if (Math.abs(sum - data.tongTien) > 10)
      errors.push(`Tổng chia (${formatCurrency(sum)}) chưa khớp bill (${formatCurrency(data.tongTien)})`);
  }
  return { valid: errors.length === 0, errors };
};
```

- [ ] **Step 4: Copy vào test, chạy lại — xác nhận PASS**

```bash
node test/test-utils.js
```

- [ ] **Step 5: Thêm `editTransaction()` vào `Code.gs`**

```javascript
function editTransaction(id, newDataStr) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const data = typeof newDataStr === 'string' ? JSON.parse(newDataStr) : newDataStr;
    const ss = getSpreadsheet();
    const gdSheet = ss.getSheetByName('GiaoDich');
    const ctSheet = ss.getSheetByName('ChiTiet');

    // Update GiaoDich row
    const gdData = gdSheet.getDataRange().getValues();
    let gdRowIdx = -1;
    for (let i = 1; i < gdData.length; i++) {
      if (gdData[i][0] === id) { gdRowIdx = i + 1; break; }
    }
    if (gdRowIdx === -1) throw new Error('Không tìm thấy giao dịch ' + id);
    gdSheet.getRange(gdRowIdx, 2, 1, 5).setValues([[
      data.nguoiTra, data.ngay, data.moTa, data.tongTien, data.nguon
    ]]);

    // Xóa ChiTiet cũ (từ dưới lên để index không lệch)
    const ctData = ctSheet.getDataRange().getValues();
    for (let i = ctData.length - 1; i >= 1; i--) {
      if (ctData[i][1] === id) ctSheet.deleteRow(i + 1);
    }

    // Insert ChiTiet mới
    const freshCt = ctSheet.getDataRange().getValues();
    let nextNum = 1;
    if (freshCt.length > 1) {
      const m = freshCt[freshCt.length - 1][0].match(/CT(\d+)/);
      if (m) nextNum = parseInt(m[1]) + 1;
    }
    const rows = data.chiTiet.map(ct => {
      const isPaid = ct.thanhVienId === data.nguoiTra;
      return [`CT${String(nextNum++).padStart(4,'0')}`, id, ct.thanhVienId, ct.soTien, isPaid];
    });
    if (rows.length) ctSheet.getRange(ctSheet.getLastRow()+1, 1, rows.length, 5).setValues(rows);

    return JSON.stringify({ success: true });
  } catch (e) {
    return JSON.stringify({ error: e.toString() });
  } finally {
    lock.releaseLock();
  }
}
```

- [ ] **Step 6: Tạo `edit-modal.html`**

```html
<div id="edit-modal" class="fixed inset-0 bg-surface-900/60 backdrop-blur-sm z-50 hidden items-center justify-center p-4" style="display:none;">
  <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
    <div class="flex justify-between items-center p-5 border-b border-surface-100 sticky top-0 bg-white">
      <h2 class="text-xl font-bold flex items-center">
        <svg class="w-6 h-6 mr-2 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
        Chỉnh Sửa Giao Dịch
      </h2>
      <button onclick="closeEditModal()" class="p-2 hover:bg-surface-100 rounded-xl transition">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
    </div>
    <form id="form-edit-tx" class="p-5 space-y-5">
      <input type="hidden" id="edit-tx-id">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label class="block text-sm font-semibold text-surface-700 mb-1.5">Người đứng ra trả</label>
          <select id="edit-tx-payer" class="w-full touch-target bg-surface-50 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 pl-3 pr-8 outline-none" required></select>
        </div>
        <div>
          <label class="block text-sm font-semibold text-surface-700 mb-1.5">Ngày</label>
          <input type="date" id="edit-tx-date" class="w-full touch-target bg-surface-50 border border-surface-200 rounded-xl px-3 focus:ring-2 focus:ring-primary-500 outline-none" required>
        </div>
      </div>
      <div>
        <label class="block text-sm font-semibold text-surface-700 mb-1.5">Mô tả</label>
        <input type="text" id="edit-tx-desc" class="w-full touch-target bg-surface-50 border border-surface-200 rounded-xl px-3 focus:ring-2 focus:ring-primary-500 outline-none" required>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label class="block text-sm font-semibold text-surface-700 mb-2">Nguồn đặt</label>
          <div class="flex flex-wrap gap-2 text-sm">
            <label class="cursor-pointer"><input type="radio" name="edit-tx-source" value="Grab" class="peer sr-only"><div class="px-3 min-h-[36px] flex items-center rounded-lg border border-surface-200 bg-white text-surface-600 peer-checked:border-success-500 peer-checked:bg-success-50 peer-checked:text-success-700 peer-checked:font-medium transition">Grab</div></label>
            <label class="cursor-pointer"><input type="radio" name="edit-tx-source" value="ShopeeFood" class="peer sr-only"><div class="px-3 min-h-[36px] flex items-center rounded-lg border border-surface-200 bg-white text-surface-600 peer-checked:border-warning-500 peer-checked:bg-warning-50 peer-checked:text-warning-700 peer-checked:font-medium transition">ShopeeFood</div></label>
            <label class="cursor-pointer"><input type="radio" name="edit-tx-source" value="Bên ngoài" class="peer sr-only"><div class="px-3 min-h-[36px] flex items-center rounded-lg border border-surface-200 bg-white text-surface-600 peer-checked:border-primary-500 peer-checked:bg-primary-50 peer-checked:text-primary-700 peer-checked:font-medium transition">Bên ngoài</div></label>
          </div>
        </div>
        <div>
          <label class="block text-sm font-semibold text-surface-700 mb-1.5">Tổng tiền (VNĐ)</label>
          <div class="relative">
            <input type="number" id="edit-tx-total" min="0" class="w-full touch-target bg-surface-50 border border-surface-200 rounded-xl pl-3 pr-10 focus:ring-2 focus:ring-primary-500 font-bold text-xl tabular-nums text-right outline-none" required>
            <span class="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-surface-500">đ</span>
          </div>
        </div>
      </div>
      <div id="edit-split-list" class="space-y-2"></div>
      <div id="edit-split-info" class="p-4 bg-primary-50 rounded-xl border border-primary-100 text-sm hidden justify-between font-semibold gap-2">
        <span class="text-primary-800">Tổng: <span id="edit-subtotal" class="tabular-nums">0</span> đ</span>
        <span id="edit-remaining-wrap" class="text-warning-600">Còn lệch: <span id="edit-remaining" class="tabular-nums bg-white px-2 py-0.5 rounded border ml-2">0</span> đ</span>
      </div>
      <div class="flex gap-3 pt-2">
        <button type="button" onclick="closeEditModal()" class="flex-1 py-3 border border-surface-200 rounded-xl font-semibold text-surface-700 hover:bg-surface-50 transition">Hủy</button>
        <button type="submit" class="flex-1 bg-primary-600 text-white font-bold py-3 rounded-xl hover:bg-primary-700 transition shadow-md">Lưu Thay Đổi</button>
      </div>
    </form>
  </div>
</div>
```

- [ ] **Step 7: Thêm nút "Chỉnh sửa" vào card trong `tab-lich-su.html`**

Trong phần expand detail của card (div `id="detail-${t.id}"`), thêm nút "Chỉnh sửa" cạnh nút "Xoá Bill". Template hiển thị trong `renderHistory()` — tìm dòng có `deleteTx` và thêm vào `flex` container:

Tìm trong `utils.html` hàm `renderHistory()`, trong phần tạo card HTML, tìm:
```javascript
<button onclick="deleteTx('${t.id}')" ...>Xoá Bill</button>
```
Thêm button trước nó:
```javascript
<button onclick="openEditModal('${t.id}')" class="text-xs text-primary-600 bg-white border border-primary-100 hover:bg-primary-50 px-4 py-2 touch-target rounded-lg font-semibold flex items-center transition shadow-sm outline-none mr-2">
  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
  Sửa
</button>
```

- [ ] **Step 8: Thêm `openEditModal()`, `closeEditModal()`, form logic trong `utils.html`**

```javascript
window.openEditModal = (txId) => {
  const tx = transactions.find(t => t.id === txId);
  if (!tx) return;

  document.getElementById('edit-tx-id').value = tx.id;
  document.getElementById('edit-tx-date').value = tx.ngay ? tx.ngay.substring(0, 10) : '';
  document.getElementById('edit-tx-desc').value = tx.moTa;
  document.getElementById('edit-tx-total').value = tx.tongTien;

  // Payer dropdown
  const payerSel = document.getElementById('edit-tx-payer');
  payerSel.innerHTML = '<option value="">-- Chọn --</option>';
  members.forEach(m => {
    payerSel.innerHTML += `<option value="${m.id}" ${m.id === tx.nguoiTra ? 'selected' : ''}>${m.ten}</option>`;
  });

  // Source radio
  const srcRadio = document.querySelector(`input[name="edit-tx-source"][value="${tx.nguon}"]`);
  if (srcRadio) srcRadio.checked = true;

  // Split list
  const splitContainer = document.getElementById('edit-split-list');
  splitContainer.innerHTML = '';
  members.forEach(m => {
    const ct = tx.chiTiet.find(c => c.thanhVienId === m.id);
    const initials = m.ten.substring(0, 2).toUpperCase();
    const div = document.createElement('div');
    div.className = 'flex items-center justify-between p-3 border border-surface-200 rounded-xl bg-white';
    div.innerHTML = `
      <div class="flex items-center">
        <input type="checkbox" id="edit-check-${m.id}" class="edit-split-check w-5 h-5 text-primary-600 rounded mr-3" data-id="${m.id}" ${ct ? 'checked' : ''} onchange="calcEditSplit()">
        <div class="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center mr-2">${initials}</div>
        <span class="font-semibold text-surface-800">${m.ten}</span>
      </div>
      <div class="relative">
        <input type="number" id="edit-input-${m.id}" min="0" value="${ct ? ct.soTien : 0}"
          class="border border-surface-300 touch-target w-32 text-right rounded-lg pl-2 pr-6 tabular-nums font-medium focus:ring-2 focus:ring-primary-500 outline-none" oninput="calcEditSplit()">
        <span class="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-surface-500 text-sm">đ</span>
      </div>
    `;
    splitContainer.appendChild(div);
  });

  document.getElementById('edit-split-info').classList.remove('hidden');
  document.getElementById('edit-split-info').classList.add('flex');
  calcEditSplit();

  const modal = document.getElementById('edit-modal');
  modal.style.display = 'flex';
  modal.classList.remove('hidden');
};

window.closeEditModal = () => {
  const modal = document.getElementById('edit-modal');
  modal.style.display = 'none';
};

window.calcEditSplit = () => {
  const total = parseFloat(document.getElementById('edit-tx-total').value || 0);
  let sum = 0;
  document.querySelectorAll('.edit-split-check:checked').forEach(cb => {
    sum += parseFloat(document.getElementById(`edit-input-${cb.dataset.id}`).value || 0);
  });
  document.getElementById('edit-subtotal').textContent = new Intl.NumberFormat('vi-VN').format(sum);
  const rem = total - sum;
  document.getElementById('edit-remaining').textContent = new Intl.NumberFormat('vi-VN').format(rem);
  const wrap = document.getElementById('edit-remaining-wrap');
  wrap.className = `flex items-center ${rem < -10 ? 'text-danger-600' : Math.abs(rem) <= 10 ? 'text-success-600' : 'text-warning-600'}`;
};

document.getElementById('form-edit-tx').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('edit-tx-id').value;
  const nguoiTra = document.getElementById('edit-tx-payer').value;
  const ngay = document.getElementById('edit-tx-date').value;
  const moTa = document.getElementById('edit-tx-desc').value;
  const tongTien = parseFloat(document.getElementById('edit-tx-total').value);
  const nguon = document.querySelector('input[name="edit-tx-source"]:checked')?.value || 'Bên ngoài';

  const chiTiet = [];
  document.querySelectorAll('.edit-split-check:checked').forEach(cb => {
    const mId = cb.dataset.id;
    const soTien = parseFloat(document.getElementById(`edit-input-${mId}`).value || 0);
    if (soTien > 0) chiTiet.push({ thanhVienId: mId, soTien });
  });

  const validation = validateTransactionData({ nguoiTra, ngay, moTa, tongTien, chiTiet });
  if (!validation.valid) return showToast(validation.errors[0], 'error');

  showLoading();
  try {
    const res = await runAsync('editTransaction', id, JSON.stringify({ nguoiTra, ngay, moTa, tongTien, nguon, chiTiet }));
    if (res.error) throw new Error(res.error);
    transactions = await runAsync('getTransactions');
    refreshUI();
    closeEditModal();
    showToast('Đã cập nhật giao dịch');
  } catch(err) {
    showToast(err.message, 'error');
  } finally {
    hideLoading();
  }
});
```

- [ ] **Step 9: Deploy GAS, mở Lịch Sử → click Sửa trên 1 bill → kiểm tra modal pre-populate đúng dữ liệu → submit → kiểm tra bill đã cập nhật**

- [ ] **Step 10: Commit**

```bash
git add Code.gs edit-modal.html utils.html tab-lich-su.html test/test-utils.js
git commit -m "feat: F3 - thêm chức năng chỉnh sửa giao dịch với edit modal"
```

---

## Task 6: F5a — Audit Log (Lịch Sử Thanh Toán)

**Files:**
- Modify: `Code.gs` (init sheet, `markAsPaidWithLog()`, update `getTransactions()`)
- Modify: `utils.html` (update `markCtPaid()` + hiển thị `paidAt`)

- [ ] **Step 1: Thêm init `LichSuThanhToan` sheet vào `initializeSpreadsheet()` trong `Code.gs`**

Trong hàm `initializeSpreadsheet()`, sau block `if (!sheetNames.includes('ChiTiet'))`:

```javascript
if (!sheetNames.includes('LichSuThanhToan')) {
  const sheetLS = ss.insertSheet('LichSuThanhToan');
  sheetLS.appendRow(['id', 'chiTietId', 'ngayThanhToan', 'nguoiXacNhan']);
}
```

- [ ] **Step 2: Thêm `markAsPaidWithLog()` vào `Code.gs`**

```javascript
function markAsPaidWithLog(chiTietId, confirmedBy) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = getSpreadsheet();

    // Mark ChiTiet row as paid
    const ctSheet = ss.getSheetByName('ChiTiet');
    const ctData = ctSheet.getDataRange().getValues();
    for (let i = 1; i < ctData.length; i++) {
      if (ctData[i][0] === chiTietId) { ctSheet.getRange(i+1, 5).setValue(true); break; }
    }

    // Append audit log
    const lsSheet = ss.getSheetByName('LichSuThanhToan');
    const lsData = lsSheet.getDataRange().getValues();
    let nextNum = 1;
    if (lsData.length > 1) {
      const m = lsData[lsData.length-1][0].match(/LT(\d+)/);
      if (m) nextNum = parseInt(m[1]) + 1;
    }
    lsSheet.appendRow([`LT${String(nextNum).padStart(4,'0')}`, chiTietId, new Date().toISOString(), confirmedBy || '']);

    return JSON.stringify({ success: true });
  } catch(e) {
    return JSON.stringify({ error: e.toString() });
  } finally {
    lock.releaseLock();
  }
}
```

- [ ] **Step 3: Cập nhật `getTransactions()` trong `Code.gs` để join `paidAt`**

Trong `getTransactions()`, sau dòng khai báo `ctDb`, thêm:

```javascript
const lsDb = ss.getSheetByName('LichSuThanhToan') 
  ? ss.getSheetByName('LichSuThanhToan').getDataRange().getValues() 
  : [];
const paidAtMap = {};
if (lsDb.length > 1) {
  lsDb.slice(1).forEach(row => { paidAtMap[row[1]] = row[2]; });
}
```

Trong phần build `chiTietByGd`, thêm `paidAt` vào object:

```javascript
chiTietByGd[gdId].push({
  id: row[0],
  thanhVienId: row[2],
  soTien: row[3],
  daThanhToan: row[4],
  paidAt: paidAtMap[row[0]] || null
});
```

- [ ] **Step 4: Cập nhật `markCtPaid()` trong `utils.html` — gọi `markAsPaidWithLog` thay vì `markAsPaid`**

Tìm hàm `markCtPaid` trong `utils.html`, thay:
```javascript
await runAsync('markAsPaid', ctId);
```
thành:
```javascript
await runAsync('markAsPaidWithLog', ctId, '');
```

- [ ] **Step 5: Cập nhật `renderHistory()` trong `utils.html` — hiển thị timestamp khi đã thanh toán**

Trong phần tạo `statusHtml` cho từng `chiTiet`, tìm đoạn:
```javascript
const statusHtml = ct.daThanhToan 
  ? `<span ...>Đã trả</span>`
```
Thay bằng:
```javascript
const paidTime = ct.paidAt ? (() => {
  const d = new Date(ct.paidAt);
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')} ${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}`;
})() : '';
const statusHtml = ct.daThanhToan 
  ? `<div class="flex flex-col items-end"><span class="px-2 py-1 text-[10px] uppercase font-bold rounded bg-success-50 text-success-600 border border-success-200">Đã trả</span>${paidTime ? `<span class="text-[9px] text-surface-400 mt-0.5">${paidTime}</span>` : ''}</div>`
```

- [ ] **Step 6: Deploy GAS, mark paid 1 khoản — kiểm tra hiển thị timestamp dưới badge "Đã trả"**

- [ ] **Step 7: Commit**

```bash
git add Code.gs utils.html
git commit -m "feat: F5a - thêm audit log lịch sử thanh toán với timestamp"
```

---

## Task 7: F4 — Nhắc Nợ Tự Động qua Gmail

**Files:**
- Modify: `Code.gs` (migration email column, `updateMemberEmail()`, `buildReminderEmailHtml()`, `sendDebtReminders()`, update `getMembers()`)
- Modify: `tab-thanh-vien.html` (thêm email input vào member card)
- Modify: `tab-tong-quan.html` (thêm nút nhắc nợ)
- Modify: `utils.html` (handler gửi mail + update member email)
- Modify: `test/test-utils.js` (test email template)

- [ ] **Step 1: Thêm failing test cho `buildReminderEmailHtml()` vào `test/test-utils.js`**

```javascript
// ===== TEST: buildReminderEmailHtml =====
function buildReminderEmailHtml(memberName, debts) { throw new Error('not implemented'); }

const emailHtml = buildReminderEmailHtml('Heo', [
  { creditorName: 'Tuấn Anh', amount: 150000 },
  { creditorName: 'Nhi', amount: 80000 },
]);
assert(typeof emailHtml === 'string', 'buildReminderEmailHtml trả về string');
assert(emailHtml.includes('Heo'), 'Email chứa tên người nợ');
assert(emailHtml.includes('Tuấn Anh'), 'Email chứa tên chủ nợ 1');
assert(emailHtml.includes('80'), 'Email chứa số tiền');
assert(emailHtml.includes('230'), 'Email chứa tổng tiền (150k+80k=230k)');
assert(emailHtml.toLowerCase().includes('<table'), 'Email có cấu trúc table');
```

- [ ] **Step 2: Chạy test — xác nhận FAIL**

```bash
node test/test-utils.js
```

- [ ] **Step 3: Implement `buildReminderEmailHtml()` trong `Code.gs`**

```javascript
function buildReminderEmailHtml(memberName, debts) {
  const rows = debts.map(d => `
    <tr>
      <td style="padding:8px 16px;border-bottom:1px solid #f1f5f9;">${d.creditorName}</td>
      <td style="padding:8px 16px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:bold;color:#e11d48;">
        ${new Intl.NumberFormat('vi-VN').format(d.amount)} đ
      </td>
    </tr>`).join('');
  const total = debts.reduce((s, d) => s + d.amount, 0);
  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;">
      <div style="background:#4f46e5;padding:24px;text-align:center;border-radius:12px 12px 0 0;">
        <h1 style="color:white;margin:0;font-size:20px;">&#128176; Nhắc nhở thanh toán</h1>
      </div>
      <div style="padding:24px;">
        <p style="color:#334155;margin-bottom:16px;">Xin chào <strong>${memberName}</strong>,</p>
        <p style="color:#334155;margin-bottom:16px;">Bạn có các khoản nợ chưa thanh toán:</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <thead><tr style="background:#f8fafc;">
            <th style="padding:8px 16px;text-align:left;font-size:12px;color:#94a3b8;text-transform:uppercase;">Nợ ai</th>
            <th style="padding:8px 16px;text-align:right;font-size:12px;color:#94a3b8;text-transform:uppercase;">Số tiền</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="background:#fff1f2;border-radius:8px;padding:12px 16px;border-left:4px solid #e11d48;">
          <strong style="color:#e11d48;">Tổng cần trả: ${new Intl.NumberFormat('vi-VN').format(total)} đ</strong>
        </div>
        <p style="color:#94a3b8;font-size:12px;margin-top:16px;">Email tự động từ Chi Tiêu Team.</p>
      </div>
    </div>`;
}
```

- [ ] **Step 4: Copy `buildReminderEmailHtml` vào test file, chạy — xác nhận PASS**

```bash
node test/test-utils.js
```

- [ ] **Step 5: Cập nhật `getMembers()` trong `Code.gs` để trả về field `email`**

Trong `getMembers()`, sửa map:

```javascript
const members = data.slice(1).map(row => ({
  id: row[0],
  ten: row[1],
  ngayThem: row[2],
  email: row[3] || ''
}));
```

- [ ] **Step 6: Thêm `updateMemberEmail()` và `sendDebtReminders()` vào `Code.gs`**

```javascript
function updateMemberEmail(id, email) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('ThanhVien');
    // Ensure email column header exists
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (!headers.includes('email')) sheet.getRange(1, headers.length + 1).setValue('email');

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) { sheet.getRange(i+1, 4).setValue(email); break; }
    }
    return getMembers();
  } catch(e) {
    return JSON.stringify({ error: e.toString() });
  } finally {
    lock.releaseLock();
  }
}

function sendDebtReminders() {
  try {
    const summary = JSON.parse(getSummary());
    if (summary.error) throw new Error(summary.error);
    if (!summary.length) return JSON.stringify({ sent: 0, skipped: 0, message: 'Không có khoản nợ nào' });

    const tvData = getSpreadsheet().getSheetByName('ThanhVien').getDataRange().getValues();
    const emailMap = {};
    if (tvData.length > 1) tvData.slice(1).forEach(r => { if (r[3]) emailMap[r[0]] = { ten: r[1], email: r[3] }; });

    const debtsByDebtor = {};
    summary.forEach(s => {
      if (!debtsByDebtor[s.from]) debtsByDebtor[s.from] = { name: s.fromName, debts: [] };
      debtsByDebtor[s.from].debts.push({ creditorName: s.toName, amount: s.amount });
    });

    const toSend = Object.keys(debtsByDebtor).filter(id => emailMap[id]);
    const remaining = MailApp.getRemainingDailyQuota();
    if (remaining < toSend.length) throw new Error(`Hết quota email hôm nay (còn ${remaining}, cần ${toSend.length})`);

    let sent = 0, skipped = 0;
    Object.keys(debtsByDebtor).forEach(id => {
      const info = emailMap[id];
      if (!info) { skipped++; return; }
      MailApp.sendEmail({
        to: info.email,
        subject: '💰 Chi Tiêu Team — Bạn có khoản nợ chưa thanh toán',
        htmlBody: buildReminderEmailHtml(debtsByDebtor[id].name, debtsByDebtor[id].debts)
      });
      sent++;
    });
    return JSON.stringify({ sent, skipped, message: `Đã gửi ${sent} email, bỏ qua ${skipped} người (chưa có email)` });
  } catch(e) {
    return JSON.stringify({ error: e.toString() });
  }
}
```

- [ ] **Step 7: Thêm email input vào `tab-thanh-vien.html`**

Trong phần render member card (trong `renderMembersTab()` ở `utils.html`), tìm nơi render thông tin thành viên và thêm email input. Trong hàm `renderMembersTab()`, thêm vào HTML card (sau phần net balance, trước nút Đuổi):

```javascript
<div class="pt-3 border-t border-surface-50 mt-3">
  <div class="flex items-center gap-2">
    <input type="email" id="email-input-${m.id}" value="${m.email || ''}" placeholder="Email để nhận nhắc nợ..."
      class="flex-1 text-xs border border-surface-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-primary-400 outline-none bg-surface-50">
    <button onclick="saveMemberEmail('${m.id}')"
      class="text-xs text-primary-600 bg-primary-50 border border-primary-100 px-2 py-1.5 rounded-lg font-semibold hover:bg-primary-100 transition">Lưu</button>
  </div>
</div>
```

- [ ] **Step 8: Thêm handler `saveMemberEmail()` trong `utils.html`**

```javascript
window.saveMemberEmail = async (id) => {
  const email = document.getElementById(`email-input-${id}`).value.trim();
  showLoading();
  try {
    const res = await runAsync('updateMemberEmail', id, email);
    if (res.error) throw new Error(res.error);
    members = res;
    showToast(email ? 'Đã lưu email' : 'Đã xóa email');
  } catch(e) {
    showToast(e.message, 'error');
  } finally {
    hideLoading();
  }
};
```

- [ ] **Step 9: Thêm nút "Nhắc nợ team" vào `tab-tong-quan.html`**

Trong tab Tổng Quan, bên dưới section "Chi tiết Ai Nợ Ai" (sau closing tag của glass-card chứa table nợ):

```html
<div class="mt-4 flex justify-end">
  <button id="btn-send-reminders" class="flex items-center gap-2 px-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm font-semibold text-surface-700 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition shadow-sm">
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
    Nhắc nợ team 📧
  </button>
</div>
```

- [ ] **Step 10: Thêm event handler trong `utils.html`**

Trong `DOMContentLoaded`:

```javascript
document.getElementById('btn-send-reminders').addEventListener('click', async () => {
  if (!confirm('Gửi email nhắc nợ đến tất cả thành viên có khoản nợ chưa trả?')) return;
  showLoading();
  try {
    const res = await runAsync('sendDebtReminders');
    if (res.error) throw new Error(res.error);
    showToast(res.message);
  } catch(e) {
    showToast(e.message, 'error');
  } finally {
    hideLoading();
  }
});
```

- [ ] **Step 11: Deploy GAS — vào tab Thành Viên, thêm email cho 1 người → vào Tổng Quan → nhấn "Nhắc nợ team" → kiểm tra email đến inbox**

> **Yêu cầu:** GAS script cần được authorize scope `https://www.googleapis.com/auth/script.send_mail`. GAS sẽ tự hỏi permission lần đầu deploy.

- [ ] **Step 12: Commit**

```bash
git add Code.gs tab-tong-quan.html tab-thanh-vien.html utils.html test/test-utils.js
git commit -m "feat: F4 - thêm chức năng nhắc nợ tự động qua Gmail"
```

---

## Self-Review Checklist

| Spec requirement | Task |
|-----------------|------|
| Partial file system với include() | Task 1 |
| F5b: Export CSV với BOM UTF-8 | Task 2 |
| F1: simplifyDebts greedy algorithm | Task 3 |
| F2: Analytics với Chart.js | Task 4 |
| F3: editTransaction atomic với LockService | Task 5 |
| F5a: Audit log LichSuThanhToan sheet | Task 6 |
| F4: MailApp quota guard | Task 7, Step 6 |
| F4: buildReminderEmailHtml testable | Task 7, Steps 1-4 |
| validateTransactionData reused cho Edit | Task 5, Step 8 |
| Pure JS testable với Node.js | test/test-utils.js trong Tasks 2-7 |
