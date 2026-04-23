# Filter Bar Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure filter bar in tab-tong-quan.html to 2-row fixed layout (Layout B), with amount inputs wider and buttons right-aligned.

**Architecture:** Single HTML file change in `tab-tong-quan.html`. Wrap filter bar in `flex flex-col gap-3`, split into 2 explicit rows with a spacer before action buttons. No JS changes.

**Tech Stack:** Vanilla HTML, Tailwind CSS

---

## File Structure

| File | Change |
|------|--------|
| `tab-tong-quan.html` | Restructure filter bar HTML from single-row flex-wrap to 2-row flex-col layout |

---

## Task 1: Restructure Filter Bar HTML

**Files:**
- Modify: `tab-tong-quan.html` (filter bar section, lines ~39-75)

### Step 1: Identify current filter bar

Current code (lines 39-75):
```html
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
```

### Step 2: Replace with new 2-row layout

Replace the entire `<div id="debt-filter-bar" ...>` with:

```html
<!-- Filter Bar: 2-row fixed layout -->
<div id="debt-filter-bar" class="flex flex-col gap-3">
  <!-- Row 1: Member dropdowns -->
  <div class="flex flex-wrap gap-3">
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
  </div>
  <!-- Row 2: Amount inputs + spacer + buttons -->
  <div class="flex flex-wrap gap-3 items-end">
    <!-- Khoảng tiền: Từ -->
    <div class="w-[110px]">
      <label class="block text-xs font-medium text-gray-500 mb-1">Từ (VND)</label>
      <input id="filter-amount-min" type="number" min="0" step="1000" placeholder="0"
             class="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400 tabular-nums">
    </div>
    <!-- Khoảng tiền: Đến -->
    <div class="w-[110px]">
      <label class="block text-xs font-medium text-gray-500 mb-1">Đến (VND)</label>
      <input id="filter-amount-max" type="number" min="0" step="1000" placeholder="∞"
             class="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400 tabular-nums">
    </div>
    <!-- Spacer to push buttons right -->
    <div class="flex-1"></div>
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

### Step 3: Commit

```bash
git add tab-tong-quan.html && git commit -m "feat(filter): restructure filter bar to 2-row fixed layout"
```

---

## Spec Coverage Check

| Spec Section | Task |
|-------------|------|
| Layout B: 2-row fixed | Task 1 |
| Amount inputs w-[110px] | Task 1 |
| Spacer flex-1 before buttons | Task 1 |
| Vị trí A (dưới header) | Task 1 (no change — already there) |
| max-w-5xl (already done) | Already committed in previous step |

**Gaps:** None — max-w-5xl was already committed separately.

---

## Post-Plan Notes

- No JS changes needed — event listeners already attached to IDs that remain unchanged
- No test changes needed — this is purely presentational HTML/Tailwind
- All IDs unchanged: `filter-debtor`, `filter-creditor`, `filter-amount-min`, `filter-amount-max`, `btn-apply-filter`, `btn-reset-filter`
- `index.html` max-w-5xl change already committed separately
