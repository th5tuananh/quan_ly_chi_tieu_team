# Debt Settlement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm settlement record để khi xác nhận A→C Xđ trên simplified view, hệ thống tạo settlement → summary tính lại tự động. ChiTiet gốc không đổi. Anti-duplicate settlement.

**Architecture:** Sheet `ThanhToan` mới lưu settlement records. `getSummary()` trừ settlements khỏi net debt. `simplifyDebts()` và `renderDebtSummary()` không cần thay đổi — chúng tự cập nhật vì phụ thuộc `getSummary()`.

**Tech Stack:** Google Apps Script, Vanilla JS, Node.js tests

---

## File Structure

| File | Thay đổi |
|------|-----------|
| `Code.gs` | Thêm sheet `ThanhToan` vào `initializeSpreadsheet()`, thêm `addSettlement()`, sửa `getSummary()` |
| `utils.html` | Sửa `markPairPaid()` gọi `addSettlement()` thay vì `markAllPaidForMember()` |
| `test/test-utils.js` | Thêm tests cho settlement logic |

---

## Database Schema

### Sheet: `ThanhToan` (settlement records)
| Column | Type | Mô tả |
|--------|------|--------|
| `id` | string | `TT001`, `TT002`, ... |
| `tuId` | string | Member ID của người trả (debtor) |
| `denId` | string | Member ID của người nhận (creditor) |
| `soTien` | number | Số tiền settlement |
| `ngay` | string | ISO timestamp |

---

## Task 1: Sheet Init + `addSettlement()` trong Code.gs

**Files:**
- Modify: `Code.gs` (thêm sheet init vào `initializeSpreadsheet()`, thêm `addSettlement()`)

- [ ] **Step 1: Thêm sheet `ThanhToan` vào `initializeSpreadsheet()`**

Tìm trong `Code.gs`, trong `initializeSpreadsheet()`, sau block `if (!sheetNames.includes('LichSuThanhToan'))`:

```javascript
if (!sheetNames.includes('ThanhToan')) {
  const sheetTT = ss.insertSheet('ThanhToan');
  sheetTT.appendRow(['id', 'tuId', 'denId', 'soTien', 'ngay']);
}
```

- [ ] **Step 2: Thêm hàm `addSettlement()` vào Code.gs**

Thêm sau `getSummary()` (khoảng dòng 425):

```javascript
function addSettlement(tuId, denId, soTien) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = getSpreadsheet();

    // Validate: số tiền settlement không vượt net debt giữa 2 người
    const currentSummary = JSON.parse(getSummary());
    const pairKey = `${tuId}->${denId}`;
    const reverseKey = `${denId}->${tuId}`;

    // Tính net debt từ summary (tuId nợ denId bao nhiêu)
    let netDebt = 0;
    currentSummary.forEach(s => {
      if (s.from === tuId && s.to === denId) netDebt += s.amount;
      if (s.from === denId && s.to === tuId) netDebt -= s.amount;
    });

    // Đã settlement bao nhiêu giữa 2 người này?
    const ttSheet = ss.getSheetByName('ThanhToan');
    const ttData = ttSheet.getDataRange().getValues();
    let daSettled = 0;
    if (ttData.length > 1) {
      ttData.slice(1).forEach(row => {
        if (row[1] === tuId && row[2] === denId) daSettled += parseFloat(row[3]) || 0;
        if (row[1] === denId && row[2] === tuId) daSettled -= parseFloat(row[3]) || 0;
      });
    }

    const conLai = netDebt - daSettled;
    if (soTien > conLai + 0.01) {
      return JSON.stringify({ error: `Số tiền vượt quá số nợ còn lại (${Math.round(conLai)}đ)` });
    }

    // Tạo settlement record
    const ttNewData = ttSheet.getDataRange().getValues();
    let nextNum = 1;
    if (ttNewData.length > 1) {
      const m = ttNewData[ttNewData.length - 1][0].match(/TT(\d+)/);
      if (m) nextNum = parseInt(m[1]) + 1;
    }
    ttSheet.appendRow([`TT${String(nextNum).padStart(4,'0')}`, tuId, denId, soTien, new Date().toISOString()]);

    return JSON.stringify({ success: true, daSettled: daSettled + soTien, conLai: conLai - soTien });
  } catch(e) {
    return JSON.stringify({ error: e.toString() });
  } finally {
    lock.releaseLock();
  }
}
```

- [ ] **Step 3: Chạy gas deploy test (hoặc kiểm tra bằng cách gọi function)**

Vì đây là GAS-specific code không test được bằng Node.js, chỉ kiểm tra syntax bằng cách đọc lại code sau khi thêm.

- [ ] **Step 4: Commit**

```bash
git add Code.gs
git commit -m "feat: thêm sheet ThanhToan và addSettlement() cho debt settlement"
```

---

## Task 2: Sửa `getSummary()` trừ settlements

**Files:**
- Modify: `Code.gs` — sửa `getSummary()` để trừ settlements

- [ ] **Step 1: Đọc `getSummary()` hiện tại để xác định vị trí chính xác**

```javascript
// Chạy trong GAS editor console hoặc đọc Code.gs dòng 399-425
```

- [ ] **Step 2: Sửa `getSummary()` — thêm logic trừ settlements**

Trong `getSummary()`, sau khi tính `netDebts` (trước `for (const key in netDebts)`), thêm settlement subtraction:

Tìm đoạn:
```javascript
const netDebts = {};
for (const key in debtMap) {
    const [a, b] = key.split('->');
    ...
}
// ← thêm settlement logic vào đây
for (const key in netDebts) {
```

Thay bằng:
```javascript
const netDebts = {};
for (const key in debtMap) {
    const [a, b] = key.split('->');
    ...
}

// Trừ settlements khỏi net debts
const ttSheet = ss.getSheetByName('ThanhToan');
const settlementMap = {};
if (ttSheet) {
  const ttData = ttSheet.getDataRange().getValues();
  if (ttData.length > 1) {
    ttData.slice(1).forEach(row => {
      const tuId = row[1], denId = row[2], soTien = parseFloat(row[3]) || 0;
      settlementMap[`${tuId}->${denId}`] = (settlementMap[`${tuId}->${denId}`] || 0) + soTien;
    });
  }
}

for (const key in netDebts) {
    const [a, b] = key.split('->');
    const settledAB = settlementMap[`${a}->${b}`] || 0;
    const settledBA = settlementMap[`${b}->${a}`] || 0;
    netDebts[key] = Math.max(0, netDebts[key] - (settledAB - settledBA));
}
```

- [ ] **Step 3: Commit**

```bash
git add Code.gs
git commit -m "feat: getSummary() trừ settlements để tính net debt chính xác"
```

---

## Task 3: Sửa `markPairPaid()` trong utils.html

**Files:**
- Modify: `utils.html` — sửa `markPairPaid()` gọi `addSettlement()` với số tiền từ summary

- [ ] **Step 1: Đọc `markPairPaid()` hiện tại**

Xác định vị trí chính xác trong utils.html (dòng ~486).

- [ ] **Step 2: Sửa `markPairPaid()` để gọi `addSettlement()`**

Thay body hiện tại của `markPairPaid()`:

```javascript
window.markPairPaid = async (debtorId, creditorId) => {
  // Lấy số tiền net debt hiện tại từ summary
  const summary = await runAsync('getSummary');
  const parsed = typeof summary === 'string' ? JSON.parse(summary) : summary;
  const pair = parsed.find(s => s.from === debtorId && s.to === creditorId);

  if (!pair) {
    showToast('Không tìm thấy khoản nợ này. Có thể đã được trả hết.', 'error');
    return;
  }

  if (!confirm(`${pair.fromName} đã trả ${pair.toName} ${formatCurrency(pair.amount)} đúng không?`)) return;

  showLoading();
  try {
    const res = await runAsync('addSettlement', debtorId, creditorId, pair.amount);
    if (res.error) throw new Error(res.error);
    transactions = await runAsync('getTransactions');
    refreshUI();
    showToast(`Đã chốt ${pair.fromName} trả ${pair.toName} ${formatCurrency(pair.amount)} đ`);
  } catch(e) { showToast(e.message, 'error'); }
  finally { hideLoading(); }
};
```

**Lưu ý:** `refreshUI()` sẽ gọi `updateDashboard()` → `getSummary()` → đã có settlement subtraction → UI tự cập nhật đúng.

- [ ] **Step 3: Kiểm tra không có breaking changes**

Xác nhận `refreshUI()` chạy đúng sau khi settlement được tạo.

- [ ] **Step 4: Commit**

```bash
git add utils.html
git commit -m "feat: markPairPaid() gọi addSettlement() thay vì markAllPaidForMember"
```

---

## Task 4: Thêm tests cho settlement logic

**Files:**
- Modify: `test/test-utils.js` — thêm tests cho `addSettlement` validation

- [ ] **Step 1: Thêm failing tests**

Append vào cuối `test/test-utils.js`:

```javascript
// ===== TEST: Settlement Logic =====
// Mock sheets data
const createMockSpreadsheet = (thanhToanRows, chiTietRows, giaoDichRows) => ({
  getSheetByName: (name) => {
    if (name === 'ThanhToan') return { getDataRange: () => ({ getValues: () => thanhToanRows }) };
    if (name === 'ChiTiet') return { getDataRange: () => ({ getValues: () => chiTietRows }) };
    if (name === 'GiaoDich') return { getDataRange: () => ({ getValues: () => giaoDichRows }) };
    return null;
  }
});

// computeNetDebtFromChiTiet: tính net debt từ ChiTiet gốc
const computeNetDebtFromChiTiet = (ctRows, gdRows) => {
  const gdMap = {};
  if (gdRows.length > 1) {
    gdRows.slice(1).forEach(row => {
      if (row[6] !== 'deleted') gdMap[row[0]] = { nguoiTra: row[1] };
    });
  }
  const debtMap = {};
  if (ctRows.length > 1) {
    ctRows.slice(1).forEach(row => {
      const gdId = row[1], debtor = row[2], amount = parseFloat(row[3]) || 0, isPaid = row[4];
      if (gdMap[gdId] && !isPaid) {
        const creditor = gdMap[gdId].nguoiTra;
        if (debtor !== creditor && amount > 0) {
          const key = `${debtor}->${creditor}`;
          debtMap[key] = (debtMap[key] || 0) + amount;
        }
      }
    });
  }
  const netDebts = {};
  for (const key in debtMap) {
    const [a, b] = key.split('->');
    const amountAB = debtMap[key];
    const amountBA = debtMap[`${b}->${a}`] || 0;
    if (amountAB > amountBA) netDebts[`${a}->${b}`] = amountAB - amountBA;
  }
  return netDebts;
};

// computeSettledAmount: tính tổng đã settlement giữa 2 người
const computeSettledAmount = (ttRows, tuId, denId) => {
  let total = 0;
  if (ttRows.length > 1) {
    ttRows.slice(1).forEach(row => {
      if (row[1] === tuId && row[2] === denId) total += parseFloat(row[3]) || 0;
      if (row[1] === denId && row[2] === tuId) total -= parseFloat(row[3]) || 0;
    });
  }
  return total;
};

// netDebtAfterSettlement: net debt sau khi trừ settlements
const netDebtAfterSettlement = (netDebts, ttRows) => {
  const settlementMap = {};
  if (ttRows.length > 1) {
    ttRows.slice(1).forEach(row => {
      const tuId = row[1], denId = row[2], soTien = parseFloat(row[3]) || 0;
      settlementMap[`${tuId}->${denId}`] = (settlementMap[`${tuId}->${denId}`] || 0) + soTien;
    });
  }
  const result = {};
  for (const key in netDebts) {
    const [a, b] = key.split('->');
    const settledAB = settlementMap[`${a}->${b}`] || 0;
    const settledBA = settlementMap[`${b}->${a}`] || 0;
    result[key] = Math.max(0, netDebts[key] - (settledAB - settledBA));
  }
  return result;
};

// Mock data: A đứng trả GD001 90k cho A,B,C (mỗi người nợ A 30k)
const mockGdRows = [
  ['id','nguoiTra','ngay','moTa','tongTien','nguon','trangThai'],
  ['GD001','TV001','2026-04-10','Ăn trưa','90000','Grab','active'],
  ['GD002','TV002','2026-04-11','Trà sữa','60000','ShopeeFood','active'],
];
const mockCtRows = [
  ['id','giaoDichId','thanhVienId','soTien','daThanhToan'],
  ['CT001','GD001','TV001','30000',false], // A tự trả A → đã paid, không nợ
  ['CT002','GD001','TV002','30000',false], // B nợ A 30k
  ['CT003','GD001','TV003','30000',false], // C nợ A 30k
  ['CT004','GD002','TV001','20000',false], // A nợ B 20k
  ['CT005','GD002','TV002','20000',false], // B tự trả → đã paid
  ['CT006','GD002','TV003','20000',false], // C nợ B 20k
];

// Test 1: net debt từ ChiTiet gốc
const netDebts = computeNetDebtFromChiTiet(mockCtRows, mockGdRows);
assert(netDebts['TV002->TV001'] === 30000, 'B nợ A 30k');
assert(netDebts['TV003->TV001'] === 30000, 'C nợ A 30k');
assert(netDebts['TV003->TV002'] === 20000, 'C nợ B 20k');

// Test 2: chưa có settlement → net debt = gross
const settled0 = [['id','tuId','denId','soTien','ngay']];
const after0 = netDebtAfterSettlement(netDebts, settled0);
assert(after0['TV003->TV001'] === 30000, 'C nợ A 30k (chưa settle)');
assert(after0['TV003->TV002'] === 20000, 'C nợ B 20k (chưa settle)');

// Test 3: C đã trả A 10k → C nợ A net = 20k
const settled1 = [['id','tuId','denId','soTien','ngay'],['TT001','TV003','TV001',10000,'2026-04-15']];
const after1 = netDebtAfterSettlement(netDebts, settled1);
assert(after1['TV003->TV001'] === 20000, 'C nợ A 20k (đã trả 10k)');
assert(after1['TV003->TV002'] === 20000, 'C nợ B 20k (chưa settle)');

// Test 4: C đã trả A đủ 30k → C không nợ A nữa
const settled2 = [['id','tuId','denId','soTien','ngay'],['TT001','TV003','TV001',30000,'2026-04-15']];
const after2 = netDebtAfterSettlement(netDebts, settled2);
assert(!after2['TV003->TV001'] || after2['TV003->TV001'] === 0, 'C không nợ A nữa');

// Test 5: settlement A->B và B->A không cancel nhau sai
const settled3 = [['id','tuId','denId','soTien','ngay'],['TT001','TV003','TV001',10000],['TT002','TV001','TV003',5000]];
const after3 = netDebtAfterSettlement(netDebts, settled3);
// netDebt C->A = 30000, settled C->A = 10000, settled A->C = 5000 → net = 30000 - (10000-5000) = 25000
assert(after3['TV003->TV001'] === 25000, 'Settlement 2 chiều tính đúng: C nợ A 25k');

// Test 6: B nợ A 30k, A nợ B 20k → net B->A = 10k (A nhận 10k từ B)
const netDebts2 = computeNetDebtFromChiTiet(mockCtRows, mockGdRows);
const after4 = netDebtAfterSettlement(netDebts2, settled3);
assert(after4['TV002->TV001'] === 30000, 'B nợ A 30k (A->B settlement không ảnh hưởng)');

console.log('\n✓ Tất cả settlement tests passed!');
```

- [ ] **Step 2: Chạy tests**

```bash
node test/test-utils.js
```

Expected: `✓ Tất cả settlement tests passed!`

- [ ] **Step 3: Copy implementation vào test file (thay thế throw error), chạy lại**

Thay `throw new Error('not implemented')` bằng implementation thực tế từ test (các hàm mock), rồi chạy lại confirm PASS.

- [ ] **Step 4: Commit**

```bash
git add test/test-utils.js
git commit -m "test: thêm tests cho settlement logic"
```

---

## Task 5: Deploy và kiểm tra end-to-end

**Files:**
- (Không thay đổi code, chỉ verify)

- [ ] **Step 1: Deploy lên GAS**

GAS Editor → Deploy → New deployment → Web app → Execute as: Me, Access: Anyone → Deploy.

- [ ] **Step 2: Tạo dữ liệu test**

Tạo vài transaction để có chain nợ (ví dụ: A trả → B nợ → C nợ → D nợ).

- [ ] **Step 3: Bật tối ưu hóa, bấm "Xác nhận" trên 1 dòng đã simplified**

Kiểm tra:
- Toast "Đã chốt X trả Y Xđ" hiển thị
- Dòng đã xác nhận biến mất khỏi summary
- Sheet `ThanhToan` có record mới
- Lịch sử giao dịch: các ChiTiet gốc vẫn hiển thị "Check trả nợ" bình thường

- [ ] **Step 4: Double-click prevention**

Bấm "Xác nhận" 2 lần nhanh trên cùng 1 dòng → lần 2 phải báo lỗi "Số tiền vượt quá số nợ còn lại".

---

## Self-Review Checklist

1. **Spec coverage:** Mỗi requirement trong spec có task tương ứng?
   - Settlement record tạo được → Task 1 ✓
   - Summary trừ settlements → Task 2 ✓
   - markPairPaid gọi addSettlement → Task 3 ✓
   - Anti-duplicate validation → Task 1 Step 2 ✓
   - Tests → Task 4 ✓
   - End-to-end verify → Task 5 ✓

2. **Placeholder scan:** Không có TBD/TODO trong plan.

3. **Type consistency:**
   - `addSettlement(tuId, denId, soTien)` — đúng 3 params
   - Sheet columns: `id, tuId, denId, soTien, ngay` — nhất quán
   - `getSummary()` trả JSON string — nhất quán với các function khác

4. **Edge cases covered:**
   - Anti-duplicate: kiểm tra `conLai` trước khi insert
   - Partial settlement: vẫn cho phép nếu `soTien <= conLai`
   - Bidirectional settlements: `settledAB - settledBA` đúng
   - Không settle quá net debt: `Math.max(0, ...)` guard
