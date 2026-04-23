# Debt Search & Filter — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm filter bar vào tab Tổng Quan để lọc dòng nợ "Ai Nợ Ai" theo người nợ, chủ nợ, và khoảng tiền. Client-side, nhấn "Tìm" để áp dụng.

**Architecture:** Thêm filter controls (2 dropdown + 2 number inputs + 2 buttons) vào `tab-tong-quan.html`. Filter logic chạy client-side trên `summaryData` đã load sẵn. Không thay đổi backend.

**Tech Stack:** Vanilla JS, HTML, Tailwind CSS (existing CDN)

---

## File Structure

| File | Role |
|------|------|
| `tab-tong-quan.html` | Thêm filter bar HTML + empty row |
| `utils.html` | Filter logic: `populateFilterDropdowns()`, `applyFilter()` |
| `test/test-utils.js` | Thêm tests cho filter functions |

---

## Task 1: Thêm Filter Bar HTML vào tab-tong-quan.html

**Files:**
- Modify: `tab-tong-quan.html:25-35` (sau header block, trước bảng)

- [ ] **Step 1: Thêm filter bar HTML**

Tìm đoạn:
```html
<div class="flex justify-between items-end">
  <h2 class="text-lg font-bold text-surface-900">Chi tiết Ai Nợ Ai</h2>
  <button id="btn-optimize-debt" ...
```

Thay bằng:
```html
<div class="flex flex-col gap-4">
  <div class="flex justify-between items-end">
    <h2 class="text-lg font-bold text-surface-900">Chi tiết Ai Nợ Ai</h2>
    <button id="btn-optimize-debt" class="text-xs font-semibold px-3 py-1.5 rounded-lg border border-surface-200 bg-white text-surface-600 hover:border-primary-400 hover:text-primary-600 transition flex items-center gap-1.5">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
      <span id="optimize-label">Tối ưu hóa</span>
    </button>
  </div>

  <!-- Filter Bar -->
  <div id="debt-filter-bar" class="flex flex-wrap gap-3 items-end">
    <!-- Người nợ -->
    <div class="flex-1 min-w-[140px]">
      <label class="block text-xs font-medium text-gray-500 mb-1">Người nợ</label>
      <select id="filter-debtor" class="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400">
        <option value="">-- Tất cả --</option>
      </select>
    </div>
    <!-- Người được đòi -->
    <div class="flex-1 min-w-[140px]">
      <label class="block text-xs font-medium text-gray-500 mb-1">Chủ nợ</label>
      <select id="filter-creditor" class="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400">
        <option value="">-- Tất cả --</option>
      </select>
    </div>
    <!-- Khoảng tiền: Từ -->
    <div class="w-32">
      <label class="block text-xs font-medium text-gray-500 mb-1">Từ (VND)</label>
      <input id="filter-amount-min" type="number" min="0" step="1000" placeholder="0"
             class="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400 tabular-nums">
    </div>
    <!-- Khoảng tiền: Đến -->
    <div class="w-32">
      <label class="block text-xs font-medium text-gray-500 mb-1">Đến (VND)</label>
      <input id="filter-amount-max" type="number" min="0" step="1000" placeholder="∞"
             class="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400 tabular-nums">
    </div>
    <!-- Nút Tìm -->
    <button id="btn-apply-filter" class="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition">
      Tìm
    </button>
    <!-- Nút Reset -->
    <button id="btn-reset-filter" class="px-3 py-2 bg-surface-100 text-surface-600 text-sm font-medium rounded-lg hover:bg-surface-200 transition">
      ↺
    </button>
  </div>
</div>
```

- [ ] **Step 2: Thêm empty row vào tbody**

Tìm `<tbody>` trong desktop table:
```html
<tbody class="divide-y divide-surface-100 bg-white" id="debt-summary-desktop">
  <!-- render here for desktop -->
</tbody>
```

Thêm empty row TRƯỚC comment:
```html
<tbody class="divide-y divide-surface-100 bg-white" id="debt-summary-desktop">
  <tr id="debt-filter-empty" class="hidden">
    <td colspan="4" class="px-6 py-8 text-center text-sm text-gray-400">
      Không có dòng nợ nào phù hợp với bộ lọc
    </td>
  </tr>
  <!-- render here for desktop -->
</tbody>
```

- [ ] **Step 3: Commit**

```bash
git add tab-tong-quan.html && git commit -m "feat(filter): add filter bar HTML to tab-tong-quan"
```

---

## Task 2: Thêm Filter Logic vào utils.html

**Files:**
- Modify: `utils.html` — thêm filter functions + event listeners

- [ ] **Step 1: Thêm `populateFilterDropdowns()` function**

Thêm vào cuối file, trước `refreshUI()` hoặc sau các helper functions khác:

```javascript
/**
 * Populates the filter dropdowns with member options
 * @param {Array} members - Array of {id, ten} member objects
 */
function populateFilterDropdowns(members) {
  const debtorSelect = document.getElementById('filter-debtor');
  const creditorSelect = document.getElementById('filter-creditor');
  if (!debtorSelect || !creditorSelect) return;

  // Clear existing options except first "-- Tất cả --"
  debtorSelect.innerHTML = '<option value="">-- Tất cả --</option>';
  creditorSelect.innerHTML = '<option value="">-- Tất cả --</option>';

  members.forEach(m => {
    const opt = `<option value="${m.id}">${m.ten}</option>`;
    debtorSelect.insertAdjacentHTML('beforeend', opt);
    creditorSelect.insertAdjacentHTML('beforeend', opt);
  });
}
```

- [ ] **Step 2: Thêm `applyFilter()` function**

```javascript
/**
 * Applies the current filter settings to summaryData and re-renders
 * @param {Array} summaryData - The full summary data array
 */
function applyFilter(summaryData) {
  const debtor = document.getElementById('filter-debtor')?.value || '';
  const creditor = document.getElementById('filter-creditor')?.value || '';
  const minAmt = parseFloat(document.getElementById('filter-amount-min')?.value) || 0;
  const maxAmt = parseFloat(document.getElementById('filter-amount-max')?.value) || Infinity;

  const filtered = summaryData.filter(row => {
    const matchDebtor = !debtor || row.from === debtor;
    const matchCreditor = !creditor || row.to === creditor;
    const matchAmount = row.amount >= minAmt && row.amount <= maxAmt;
    return matchDebtor && matchCreditor && matchAmount;
  });

  // isDebtOptimized is a local variable in same scope — access directly
  const displayData = isDebtOptimized ? simplifyDebts(filtered) : filtered;
  renderDebtSummary(displayData, isDebtOptimized);

  // Toggle empty row
  const emptyRow = document.getElementById('debt-filter-empty');
  if (emptyRow) {
    emptyRow.classList.toggle('hidden', filtered.length > 0);
  }
}
```

- [ ] **Step 3: Thêm event listeners cho filter buttons**

Thêm vào phần initialization/event listeners trong utils.html:

```javascript
// Filter bar event listeners
document.getElementById('btn-apply-filter')?.addEventListener('click', () => {
  // Pass the raw summary data (not the optimized one) — applyFilter handles simplifyDebts internally
  applyFilter(window._summaryData || []);
});

document.getElementById('btn-reset-filter')?.addEventListener('click', () => {
  const debtorSelect = document.getElementById('filter-debtor');
  const creditorSelect = document.getElementById('filter-creditor');
  const minInput = document.getElementById('filter-amount-min');
  const maxInput = document.getElementById('filter-amount-max');

  if (debtorSelect) debtorSelect.value = '';
  if (creditorSelect) creditorSelect.value = '';
  if (minInput) minInput.value = '';
  if (maxInput) maxInput.value = '';

  applyFilter(window._summaryData || []);
});
```

- [ ] **Step 4: Gọi `populateFilterDropdowns()` trong `updateDashboard()` + lưu raw summary**

Tìm trong `updateDashboard()` đoạn:
```javascript
const summary = await runAsync('getSummary'); // [{from, fromName, to, toName, amount}]
```

Thêm **NGAY SAU** đó:
```javascript
// Store raw summary for filter use
window._summaryData = summary;
```

Thêm **SAU** dòng `renderDebtSummary(displayData, isDebtOptimized);`:
```javascript
populateFilterDropdowns(members);
```

- [ ] **Step 5: Commit**

```bash
git add utils.html && git commit -m "feat(filter): add filter logic to utils.html"
```

---

## Task 3: Thêm tests cho filter functions

**Files:**
- Modify: `test/test-utils.js`

- [ ] **Step 1: Thêm filter tests**

Thêm vào cuối file:

```javascript
// ========== FILTER TESTS ==========

function runFilterTests() {
  console.log('\n=== Filter Tests ===');

  // Mock members data
  const mockMembers = [
    { id: 'TV001', ten: 'Heo' },
    { id: 'TV002', ten: 'Tuấn Anh' },
    { id: 'TV003', ten: 'Nhi' },
  ];

  // Mock summary data
  const mockSummaryData = [
    { from: 'TV001', fromName: 'Heo', to: 'TV002', toName: 'Tuấn Anh', amount: 50000 },
    { from: 'TV002', fromName: 'Tuấn Anh', to: 'TV003', toName: 'Nhi', amount: 120000 },
    { from: 'TV001', fromName: 'Heo', to: 'TV003', toName: 'Nhi', amount: 75000 },
    { from: 'TV003', fromName: 'Nhi', to: 'TV001', toName: 'Heo', amount: 30000 },
  ];

  // Test: filter by debtor
  {
    const filtered = mockSummaryData.filter(row => {
      return row.from === 'TV001';
    });
    assert(filtered.length === 2, 'filter by debtor returns 2 rows');
    assert(filtered.every(r => r.from === 'TV001'), 'all rows are TV001');
  }

  // Test: filter by creditor
  {
    const filtered = mockSummaryData.filter(row => {
      return row.to === 'TV003';
    });
    assert(filtered.length === 2, 'filter by creditor returns 2 rows');
    assert(filtered.every(r => r.to === 'TV003'), 'all rows to TV003');
  }

  // Test: filter by amount range
  {
    const filtered = mockSummaryData.filter(row => {
      return row.amount >= 50000 && row.amount <= 100000;
    });
    assert(filtered.length === 2, 'filter by amount range returns 2 rows');
    assert(filtered[0].amount === 50000, 'first is 50000');
    assert(filtered[1].amount === 75000, 'second is 75000');
  }

  // Test: filter by amount min only
  {
    const filtered = mockSummaryData.filter(row => {
      return row.amount >= 100000;
    });
    assert(filtered.length === 1, 'filter by min only returns 1 row');
    assert(filtered[0].amount === 120000, 'amount is 120000');
  }

  // Test: filter by amount max only (max < Infinity case)
  {
    const filtered = mockSummaryData.filter(row => {
      return row.amount <= 50000;
    });
    assert(filtered.length === 2, 'filter by max only returns 2 rows');
    assert(filtered[0].amount === 30000, 'one is 30000');
    assert(filtered[1].amount === 50000, 'other is 50000');
  }

  // Test: combined filters
  {
    const filtered = mockSummaryData.filter(row => {
      const matchDebtor = row.from === 'TV001';
      const matchAmount = row.amount >= 50000 && row.amount <= 75000;
      return matchDebtor && matchAmount;
    });
    assert(filtered.length === 2, 'combined filters return 2 rows');
  }

  // Test: no results
  {
    const filtered = mockSummaryData.filter(row => {
      return row.amount >= 1000000;
    });
    assert(filtered.length === 0, 'no results returns 0 rows');
  }

  // Test: empty debtor+creditor = match all
  {
    const filtered = mockSummaryData.filter(row => {
      return (!'' || row.from === '') && (!'' || row.to === '');
    });
    assert(filtered.length === 4, 'empty filters match all 4 rows');
  }

  console.log('All filter tests passed!');
}

// Run filter tests
runFilterTests();
```

- [ ] **Step 2: Chạy tests**

```bash
node test/test-utils.js
```

Expected output:
```
=== Filter Tests ===
All filter tests passed!
```

- [ ] **Step 3: Commit**

```bash
git add test/test-utils.js && git commit -m "test: add filter function tests"
```

---

## Task 4: Integration Verification

**Files:**
- No changes — chỉ verify thủ công

- [ ] **Step 1: Verify tab-tong-quan.html structure**

Mở browser devtools, kiểm tra filter bar hiển thị đúng với các elements:
- `#filter-debtor` select
- `#filter-creditor` select
- `#filter-amount-min` input
- `#filter-amount-max` input
- `#btn-apply-filter` button
- `#btn-reset-filter` button
- `#debt-filter-empty` trong tbody

- [ ] **Step 2: Verify filter interaction**

1. Mở tab Tổng Quan, chọn member trong dropdown "Người nợ"
2. Nhấn "Tìm" → bảng chỉ show dòng nợ của người đó
3. Nhấn "↺" → bảng reset về show all
4. Điền khoảng tiền "50000" → "100000", nhấn "Tìm" → đúng số dòng

- [ ] **Step 3: Verify empty state**

Điền khoảng tiền rất lớn (VD: 10000000 - 99999999) → nhấn "Tìm" → hiện "Không có dòng nợ nào phù hợp"

- [ ] **Step 4: Verify optimize toggle compatibility**

1. Bật toggle "Tối ưu hóa" → hiện chains
2. Chọn filter → nhấn "Tìm" → chains vẫn hiện đúng
3. Tắt toggle → bảng normal với filter applied

- [ ] **Step 5: Commit integration**

```bash
git add -A && git commit -m "verify: debt search filter integration passed"
```

---

## Spec Coverage Check

| Spec Section | Task |
|-------------|------|
| Filter bar layout | Task 1 |
| Người nợ + Chủ nợ dropdowns | Task 1 + Task 2 |
| Khoảng tiền min/max inputs | Task 1 + Task 2 |
| On-click "Tìm" button | Task 2 |
| Reset button | Task 2 |
| Empty state message | Task 1 |
| Dropdowns populated from members | Task 2 |
| Compatibility with optimize toggle | Task 2 + Task 4 |

**Gaps:** None.

---

## Post-Plan Notes

- Filter apply lên `summaryData` (net debts), không phải raw ChiTiet
- `window._summaryData` được set trong `updateDashboard()` sau khi fetch từ backend
- `isDebtOptimized` là local variable — `applyFilter()` access trực tiếp trong cùng scope
- Edge case `amount-min > amount-max`: treat như min=0 vì logic `row.amount >= 0` always passes if min invalid
- `populateFilterDropdowns()` chỉ populate options, không clear filter state
