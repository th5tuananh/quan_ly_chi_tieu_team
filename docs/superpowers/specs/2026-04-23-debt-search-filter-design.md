# Debt Search & Filter — Design Spec

**Date:** 2026-04-23
**Status:** Draft

---

## 1. Concept & Vision

Thêm search bar + filter controls vào tab **Tổng Quan** để lọc nhanh các dòng nợ "Ai Nợ Ai" theo người nợ, chủ nợ, và khoảng tiền. Không thay đổi dữ liệu gốc — chỉ filter trên UI đã load sẵn. Người dùng nhấn "Tìm" để áp dụng filter.

---

## 2. Layout & Structure

### 2.1 Filter Bar (Expanded Header)

Nằm phía trên bảng "Ai Nợ Ai", cùng block với `btn-optimize-debt`:

```
┌──────────────────────────────────────────────────────────────────────┐
│ Chi tiết Ai Nợ Ai          │ [Search/Dropdown] [Search/Dropdown] [Tìm] │
│                      [Tối ưu hóa ▼]                                    │
└──────────────────────────────────────────────────────────────────────┘
```

Cấu trúc chi tiết:

```
<!-- Filter Bar -->
<div id="debt-filter-bar" class="flex flex-wrap gap-3 items-end">
  <!-- Người nợ -->
  <div class="flex-1 min-w-[140px]">
    <label class="block text-xs font-medium text-gray-500 mb-1">Người nợ</label>
    <select id="filter-debtor" class="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400">
      <option value="">-- Tất cả --</option>
      <!-- options from members -->
    </select>
  </div>
  <!-- Người được đòi -->
  <div class="flex-1 min-w-[140px]">
    <label class="block text-xs font-medium text-gray-500 mb-1">Chủ nợ</label>
    <select id="filter-creditor" class="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400">
      <option value="">-- Tất cả --</option>
      <!-- options from members -->
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
```

### 2.2 Filter Controls Placement

- Filter bar nằm **dưới** header "Chi tiết Ai Nợ Ai" và **trên** bảng table
- Toggle "Tối ưu hóa" vẫn giữ nguyên vị trí bên phải header
- Filter bar dùng `flex wrap` để responsive trên mobile

### 2.3 Empty State

Khi filter không có kết quả, hiện message trong tbody:

```html
<tr id="debt-filter-empty">
  <td colspan="4" class="px-6 py-8 text-center text-sm text-gray-400">
    Không có dòng nợ nào phù hợp với bộ lọc
  </td>
</tr>
```

---

## 3. Components

### 3.1 Filter Bar (`#debt-filter-bar`)

| Element | ID | Type | Default |
|---------|-----|------|---------|
| Dropdown người nợ | `filter-debtor` | `<select>` | `""` (-- Tất cả --) |
| Dropdown chủ nợ | `filter-creditor` | `<select>` | `""` (-- Tất cả --) |
| Input tiền từ | `filter-amount-min` | `number` | `""` |
| Input tiền đến | `filter-amount-max` | `number` | `""` |
| Nút Tìm | `btn-apply-filter` | button | enabled |
| Nút Reset | `btn-reset-filter` | button | enabled |

### 3.2 Dropdown Options

Options được populate từ `members` data khi `refreshUI()` chạy:

```javascript
members.forEach(m => {
  const opt = `<option value="${m.id}">${m.ten}</option>`;
  $('#filter-debtor').append(opt);
  $('#filter-creditor').append(opt);
});
```

### 3.3 Empty Row (`#debt-filter-empty`)

- `display: none` mặc định
- Hiện khi filter applied và 0 rows match
- Ẩn khi có >= 1 row match

---

## 4. Behavior & Interactions

### 4.1 Filter Flow

```
User changes filter → clicks "Tìm" → applyFilter() → filter summaryData →
re-render table with filtered data → show empty row if 0 results
```

### 4.2 Filter Logic (Client-side)

```javascript
function applyFilter() {
  const debtor = $('#filter-debtor').val();
  const creditor = $('#filter-creditor').val();
  const minAmt = parseFloat($('#filter-amount-min').val()) || 0;
  const maxAmt = parseFloat($('#filter-amount-max').val()) || Infinity;

  const filtered = summaryData.filter(row => {
    const matchDebtor = !debtor || row.from === debtor;
    const matchCreditor = !creditor || row.to === creditor;
    const matchAmount = row.amount >= minAmt && row.amount <= maxAmt;
    return matchDebtor && matchCreditor && matchAmount;
  });

  renderDebtSummaryFiltered(filtered);
}
```

### 4.3 Reset Flow

```
User clicks "↺" → clear all inputs → set to "-- Tất cả --" → call applyFilter() → show all rows
```

### 4.4 Toggle "Tối ưu hóa" Interaction

- Filter **KHÔNG ảnh hưởng** đến toggle optimize
- Khi toggle optimize: hiện badge + collapse/expand chains, vẫn filter áp dụng trên data đang hiển thị
- Filter state được giữ khi toggle optimize thay đổi

### 4.5 Edge Cases

| Case | Behavior |
|------|----------|
| `amount-min > amount-max` | Treat as no lower bound (min=0) — ignore min, only use max |
| Empty inputs | Treated as "no filter" (match all) |
| `amount-max = ""` | Treated as Infinity |
| Member deleted | Value stays in dropdown but won't match any row → 0 results |

---

## 5. Data Flow

```
refreshUI()
  → load members → populate filter dropdowns
  → load summaryData → renderDebtSummary(summaryData)

applyFilter()
  → filter summaryData (NOT re-fetch from backend)
  → renderDebtSummary(filtered)
  → toggle empty row visibility

btn-reset-filter → applyFilter() with defaults → renderDebtSummary(summaryData)
```

---

## 6. Compatibility

- **Optimize toggle:** Filter apply trên net debts (post-simplifyDebts output)
- **Batch Settlement footer (F6):** Filter không liên quan — F6 footer hoạt động trên tab Lịch Sử
- **Edit Modal (F3):** Không liên quan

---

## 7. Files to Change

| File | Change |
|------|--------|
| `tab-tong-quan.html` | Thêm filter bar HTML + empty row |
| `utils.html` | Thêm `populateFilterDropdowns()`, `applyFilter()`, `renderDebtSummaryFiltered()` |

---

## 8. Out of Scope (NOT thực hiện trong PR này)

- Filter theo ngày (vì net debts không có date gắn liền)
- Backend filter / API changes
- Export filtered results
- Save filter state
