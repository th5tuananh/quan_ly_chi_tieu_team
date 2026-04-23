# Batch Settlement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm checkbox vào mỗi dòng ChiTiet trong tab Lịch Sử, cho phép chọn nhiều dòng và duyệt trả hàng loạt qua footer button.

**Architecture:** Approach A — checkbox hierarchy: header GD tick = chọn all ChiTiet trong GD đó; ChiTiet checkbox = chọn riêng từng người. Footer cố định hiện số đã chọn + nút "Xác nhận đã trả (X)".

**Tech Stack:** Vanilla JS (utils.html), GAS backend (Code.gs), Tailwind CSS (existing CDN)

---

## File Structure

| File | Responsibility |
|------|---------------|
| `Code.gs` | Thêm `markBatchPaid(chiTietIds)` — nhận array, atomic mark + audit log |
| `utils.html` | State `batchSelectedIds`, checkbox HTML in `renderHistory()`, handlers, footer |
| `tab-lich-su.html` | Thêm footer HTML cố định với batch UI |
| `test/test-utils.js` | Thêm tests cho batch settlement logic |

---

## Task 1: Backend — `markBatchPaid(chiTietIds)`

**Files:**
- Modify: `Code.gs:363` (sau `markAsPaidWithLog()`)

- [ ] **Step 1: Viết test cho `markBatchPaid` trước**

Mở `test/test-utils.js`, thêm test cases mới cho `markBatchPaid`:

```javascript
// Test: markBatchPaid marks multiple ChiTiet as paid
// Mock: chiTietIds = ['CT0001', 'CT0002']
// Expected: đều được set daThanhToan=true, đều có audit log
```

Tìm location test hiện tại để thêm vào:
```bash
grep -n "markAsPaidWithLog\|markAllPaidForMember" test/test-utils.js
```

- [ ] **Step 2: Thêm function `markBatchPaid` vào Code.gs**

Sau `markAsPaidWithLog()` (line 363), thêm:

```javascript
/**
 * marks multiple ChiTiet as paid + writes audit log for each
 * @param {string[]} chiTietIds - array of ChiTietId strings
 * @returns {string} JSON { success: true, count: X }
 */
function markBatchPaid(chiTietIds) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = getSpreadsheet();
    const ctSheet = ss.getSheetByName('ChiTiet');
    const ctData = ctSheet.getDataRange().getValues();
    const lsSheet = ss.getSheetByName('LichSuThanhToan');
    const lsData = lsSheet.getDataRange().getValues();

    // Find next LT ID
    let nextNum = 1;
    if (lsData.length > 1) {
      const m = lsData[lsData.length-1][0].match(/LT(\d+)/);
      if (m) nextNum = parseInt(m[1]) + 1;
    }

    // Build set for fast lookup
    const idSet = new Set(chiTietIds);
    const now = new Date().toISOString();
    let count = 0;

    // Iterate ChiTiet rows: col[0]=id, col[4]=daThanhToan
    for (let i = 1; i < ctData.length; i++) {
      if (idSet.has(ctData[i][0])) {
        ctSheet.getRange(i + 1, 5).setValue(true);
        lsSheet.appendRow([
          `LT${String(nextNum).padStart(4, '0')}`,
          ctData[i][0], // chiTietId
          now,
          '' // confirmedBy empty
        ]);
        nextNum++;
        count++;
      }
    }

    return JSON.stringify({ success: true, count });
  } catch(e) {
    return JSON.stringify({ error: e.toString() });
  } finally {
    lock.releaseLock();
  }
}
```

- [ ] **Step 3: Chạy test để verify**

```bash
node test/test-utils.js
# Tìm test mới đã viết ở Step 1 — should pass
```

- [ ] **Step 4: Commit**

```bash
git add Code.gs test/test-utils.js
git commit -m "feat: add markBatchPaid() for batch settlement"
```

---

## Task 2: Frontend State & Handler Setup

**Files:**
- Modify: `utils.html:782` (sau `markCtPaid`)

- [ ] **Step 1: Thêm `batchSelectedIds` state**

Sau các global variables ở đầu `utils.html`, thêm:

```javascript
let batchSelectedIds = new Set(); // ChiTietId đã tick
```

- [ ] **Step 2: Thêm helper functions cho batch**

Sau `markCtPaid` (line ~782), thêm:

```javascript
/**
 * Toggle a single ChiTiet row checkbox
 */
window.handleBatchToggle = (ctId) => {
  if (batchSelectedIds.has(ctId)) {
    batchSelectedIds.delete(ctId);
  } else {
    batchSelectedIds.add(ctId);
  }
  // Uncheck header if it was fully selected (user modified individual selection)
  updateBatchFooter();
};

/**
 * Toggle all ChiTiet in a GD (header checkbox)
 */
window.handleBatchHeaderToggle = (gdId) => {
  const tx = transactions.find(t => t.id === gdId);
  if (!tx) return;
  // Check if ALL unpaid ChiTiet in this GD are currently selected
  const unpaidCtIds = tx.chiTiet
    .filter(ct => ct.thanhVienId !== tx.nguoiTra && !ct.daThanhToan)
    .map(ct => ct.id);
  const allSelected = unpaidCtIds.every(id => batchSelectedIds.has(id));
  
  if (allSelected) {
    // Uncheck all in this GD
    unpaidCtIds.forEach(id => batchSelectedIds.delete(id));
  } else {
    // Check all unpaid in this GD
    unpaidCtIds.forEach(id => batchSelectedIds.add(id));
  }
  updateBatchFooter();
};

/**
 * Update footer: count + enable/disable button
 */
window.updateBatchFooter = () => {
  const footer = document.getElementById('batch-footer');
  const countSpan = document.getElementById('batch-count');
  const btn = document.getElementById('batch-confirm-btn');
  if (!footer) return;
  
  const count = batchSelectedIds.size;
  if (count === 0) {
    footer.classList.add('hidden');
  } else {
    footer.classList.remove('hidden');
    countSpan.textContent = `Đã chọn: ${count} dòng`;
    btn.disabled = false;
    btn.textContent = `Xác nhận đã trả (${count})`;
  }
};

/**
 * Submit batch settlement — called from footer button
 */
window.submitBatchSettlement = async () => {
  if (batchSelectedIds.size === 0) return;
  showLoading();
  try {
    const ids = [...batchSelectedIds];
    await runAsync('markBatchPaid', ids);
    batchSelectedIds.clear();
    transactions = await runAsync('getTransactions');
    refreshUI();
    showToast(`Đã duyệt trả ${ids.length} dòng`);
  } catch(e) {
    showToast('Lỗi: ' + e.message, 'error');
  } finally {
    hideLoading();
  }
};
```

- [ ] **Step 3: Commit**

```bash
git add utils.html
git commit -m "feat: add batchSelectedIds state and handlers"
```

---

## Task 3: Footer HTML

**Files:**
- Modify: `tab-lich-su.html:35` (sau `<div id="history-list"`)

- [ ] **Step 1: Thêm batch footer vào tab-lich-su.html**

Trước `</body>`, thêm:

```html
<!-- Batch Settlement Footer -->
<div id="batch-footer" class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg hidden z-50">
  <div class="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
    <span id="batch-count" class="text-sm font-medium text-gray-700">Đã chọn: 0 dòng</span>
    <button id="batch-confirm-btn" disabled
            onclick="submitBatchSettlement()"
            class="bg-green-500 hover:bg-green-600 text-white font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
      Xác nhận đã trả (0)
    </button>
  </div>
</div>
```

**Chú ý:** Footer dùng `fixed bottom-0`, z-50 cao hơn content thông thường. `hidden` class = ẩn ban đầu.

- [ ] **Step 2: Commit**

```bash
git add tab-lich-su.html
git commit -m "feat: add batch settlement footer HTML"
```

---

## Task 4: Checkbox UI trong `renderHistory()`

**Files:**
- Modify: `utils.html:683-765` (`renderHistory`)

- [ ] **Step 1: Đọc kỹ renderHistory() hiện tại**

Cần thấy chính xác:
- Header GD rendered ở dòng nào (để thêm checkbox trước badge đầu tiên)
- ChiTiet row rendered ở dòng nào (để thêm checkbox vào mỗi row)

Tìm header HTML và chi tiết HTML:
```bash
grep -n "card.*rounded\|chiTiet.forEach\|nguoTra.*return" utils.html | head -20
```

- [ ] **Step 2: Thêm checkbox vào GD header**

Tìm dòng render header GD — thường là dòng bắt đầu card. Thêm checkbox vào đầu header:

```javascript
// Tìm dòng gần "class='glass card'" hoặc "cursor-pointer"
// Thêm: 
const headerCheckbox = `<input type="checkbox" 
  onclick="handleBatchHeaderToggle('${t.id}')"
  class="batch-header-cb w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500 mr-2 cursor-pointer"
  ${/* check if all unpaid in this GD are selected */}'
>`;
```

- [ ] **Step 3: Thêm checkbox vào mỗi ChiTiet row (unpaid only)**

Trong `chiTiet.forEach` loop, thêm checkbox cho `daThanhToan=false`:

```javascript
// Trong chiTiet.forEach, khi daThanhToan=false:
// Thêm checkbox trước member name hoặc amount
const rowCheckbox = `<input type="checkbox"
  onclick="handleBatchToggle('${ct.id}')"
  class="batch-row-cb w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500 cursor-pointer"
  ${batchSelectedIds.has(ct.id) ? 'checked' : ''}
>`;
```

- [ ] **Step 4: Bổ sung CSS cho checkbox**

Thêm vào `<style>` trong `index.html` hoặc inline:

```css
<style>
  .batch-header-cb, .batch-row-cb {
    cursor: pointer;
  }
</style>
```

Hoặc dùng Tailwind classes đã có ở trên.

- [ ] **Step 5: Test — mở app, tick checkbox, kiểm tra footer hiện ra**

Manual test:
1. Mở tab Lịch Sử
2. Tick checkbox ở 1 ChiTiet row → footer hiện, count = 1
3. Tick header GD → tất cả unpaid trong GD đó được tick
4. Click "Xác nhận đã trả (X)" → các dòng được mark paid, footer ẩn

- [ ] **Step 6: Commit**

```bash
git add utils.html
git commit -m "feat: add checkboxes to renderHistory for batch selection"
```

---

## Task 5: Integration — Clear Selection on Refresh

**Files:**
- Modify: `utils.html` (hàm `refreshUI()` hoặc `loadData()`)

- [ ] **Step 1: Đảm bảo `batchSelectedIds.clear()` được gọi khi refresh**

Trong `refreshUI()`, thêm:

```javascript
window.refreshUI = async () => {
  batchSelectedIds.clear(); // reset batch selection
  updateBatchFooter(); // ensure footer hidden after refresh
  // ... rest of existing refreshUI logic
};
```

Tìm refreshUI:
```bash
grep -n "refreshUI\s*=" utils.html
```

- [ ] **Step 2: Commit**

```bash
git add utils.html
git commit -m "fix: clear batch selection on refreshUI"
```

---

## Task 6: Final Verification & Tobi Test

**Files:**
- Review: `Code.gs`, `utils.html`, `tab-lich-su.html`

- [ ] **Step 1: Chạy tất cả tests**

```bash
node test/test-utils.js
# Expected: all existing tests pass + new batch tests pass
```

- [ ] **Step 2: Manual full flow test**

1. Tạo 1 GD mới với 3 thành viên (A trả, B và C nợ)
2. Mở tab Lịch Sử
3. Tick checkbox C (1 người) → footer hiện "Đã chọn: 1 dòng"
4. Tick header GD → B và C đều được tick → "Đã chọn: 2 dòng"
5. Untick B → "Đã chọn: 1 dòng" (chỉ C)
6. Click "Xác nhận đã trả (1)"
7. C được mark paid, badge "Đã trả" hiện, footer ẩn
8. Tick lại header → chỉ B được tick (C đã paid nên không tick được)
9. Click footer → B được mark paid

- [ ] **Step 3: Toast notification test**

Sau khi batch settle thành công, toast "Đã duyệt trả X dòng" xuất hiện.

- [ ] **Step 4: Commit toàn bộ**

```bash
git add .
git commit -m "feat: batch settlement - select multiple ChiTiet rows and mark as paid in one click"
```

---

## Self-Review Checklist

- [ ] `markBatchPaid` nhận array `chiTietIds[]`, không phải single id
- [ ] `markBatchPaid` viết audit log cho TỪNG dòng được mark (không phải 1 log chung)
- [ ] Footer ẩn khi chưa tick gì (`hidden` class)
- [ ] Header checkbox tick = chọn ALL unpaid ChiTiet trong GD đó
- [ ] ChiTiet đã `daThanhToan=true` không hiện checkbox (không tick được)
- [ ] `batchSelectedIds.clear()` khi `refreshUI()` — không lưu tick khi reload
- [ ] Tên function `submitBatchSettlement` khớp với `onclick` trong footer HTML
- [ ] Tên function `handleBatchHeaderToggle` và `handleBatchToggle` khớp với `onclick` trong checkbox HTML
- [ ] Tests cho `markBatchPaid` pass

---

## Spec Coverage

| Spec Section | Task |
|-------------|------|
| Backend `markBatchPaid` | Task 1 |
| State `batchSelectedIds` + handlers | Task 2 |
| Footer HTML | Task 3 |
| Checkbox UI in `renderHistory` | Task 4 |
| Clear selection on refresh | Task 5 |
| Full verification | Task 6 |
