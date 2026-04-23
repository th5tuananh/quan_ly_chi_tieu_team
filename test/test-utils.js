// test/test-utils.js — chạy bằng: node test/test-utils.js
function assert(condition, msg) {
  if (!condition) { console.error('FAIL:', msg); process.exit(1); }
  console.log('PASS:', msg);
}

// ===== IMPLEMENTATIONS =====
function exportToCSV(transactions, members) {
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
}
// ==========================

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

// ===== TEST: simplifyDebts =====
function simplifyDebts(summaryData) {
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
// Kiểm tra net balance của mỗi người được bảo toàn (không kiểm tra total vì algorithm giảm chain)
const calcNet = (debts) => {
  const net = {};
  debts.forEach(d => {
    net[d.from] = (net[d.from] || 0) - d.amount;
    net[d.to] = (net[d.to] || 0) + d.amount;
  });
  return net;
};
const netBefore = calcNet(triangleInput);
const netAfter = calcNet(triangleResult);
const allIds = [...new Set([...Object.keys(netBefore), ...Object.keys(netAfter)])];
const netPreserved = allIds.every(id => Math.abs((netBefore[id] || 0) - (netAfter[id] || 0)) < 2);
assert(netPreserved, 'Net balance của mỗi người bảo toàn sau tối ưu hóa');
console.log('\n✓ Tất cả simplifyDebts tests passed!');

// ===== TEST: Aggregate Functions =====
function aggregateByMonth(transactions) {
  const result = {};
  transactions.forEach(tx => {
    if (!tx.ngay) return;
    const m = new Date(tx.ngay).toISOString().substring(0, 7);
    result[m] = (result[m] || 0) + (parseFloat(tx.tongTien) || 0);
  });
  return result;
}

function aggregateByMember(transactions, members) {
  const result = {};
  members.forEach(m => { result[m.id] = { name: m.ten, totalPaid: 0, totalOwed: 0 }; });
  transactions.forEach(tx => {
    if (result[tx.nguoiTra]) result[tx.nguoiTra].totalPaid += parseFloat(tx.tongTien) || 0;
    tx.chiTiet.forEach(ct => {
      if (result[ct.thanhVienId]) result[ct.thanhVienId].totalOwed += parseFloat(ct.soTien) || 0;
    });
  });
  return result;
}

function aggregateBySource(transactions, monthFilter) {
  const result = {};
  transactions
    .filter(tx => !monthFilter || (tx.ngay && tx.ngay.startsWith(monthFilter)))
    .forEach(tx => {
      result[tx.nguon] = (result[tx.nguon] || 0) + (parseFloat(tx.tongTien) || 0);
    });
  return result;
}

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
assert(bySourceFiltered['ShopeeFood'] === 200000, 'aggregateBySource filter: ShopeeFood tháng 4 đúng');
console.log('\n✓ Tất cả aggregate tests passed!');

// ===== TEST: validateTransactionData =====
function validateTransactionData(data) {
  const errors = [];
  if (!data.nguoiTra) errors.push('Chưa chọn người trả tiền');
  if (!data.ngay) errors.push('Chưa chọn ngày');
  if (!data.moTa || !data.moTa.trim()) errors.push('Chưa điền mô tả');
  if (!data.tongTien || data.tongTien <= 0) errors.push('Tổng tiền phải lớn hơn 0');
  if (!data.chiTiet || data.chiTiet.length === 0) errors.push('Chưa chọn người chia bill');
  if (data.chiTiet && data.tongTien > 0) {
    const sum = data.chiTiet.reduce((s, ct) => s + (parseFloat(ct.soTien) || 0), 0);
    if (Math.abs(sum - data.tongTien) > 10)
      errors.push(`Tổng chia chưa khớp bill`);
  }
  return { valid: errors.length === 0, errors };
}

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
console.log('\n✓ Tất cả validateTransactionData tests passed!');

// ===== TEST: Settlement Logic =====
const createMockSpreadsheet = (thanhToanRows, chiTietRows, giaoDichRows) => ({
  getSheetByName: (name) => {
    if (name === 'ThanhToan') return { getDataRange: () => ({ getValues: () => thanhToanRows }) };
    if (name === 'ChiTiet') return { getDataRange: () => ({ getValues: () => chiTietRows }) };
    if (name === 'GiaoDich') return { getDataRange: () => ({ getValues: () => giaoDichRows }) };
    return null;
  }
});

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

const mockGdRows = [
  ['id','nguoiTra','ngay','moTa','tongTien','nguon','trangThai'],
  ['GD001','TV001','2026-04-10','Ăn trưa','90000','Grab','active'],
  ['GD002','TV002','2026-04-11','Trà sữa','60000','ShopeeFood','active'],
];
const mockCtRows = [
  ['id','giaoDichId','thanhVienId','soTien','daThanhToan'],
  ['CT001','GD001','TV001','30000',false],
  ['CT002','GD001','TV002','30000',false],
  ['CT003','GD001','TV003','30000',false],
  ['CT004','GD002','TV001','20000',false],
  ['CT005','GD002','TV002','20000',false],
  ['CT006','GD002','TV003','20000',false],
];

// netDebts from GD001 (A pays 90k, split 3 ways: A,B,C owe 30k each):
//   TV002->TV001: 30k, TV003->TV001: 30k
// from GD002 (B pays 60k, split 3 ways: A,B,C owe 20k each):
//   TV001->TV002: 20k, TV003->TV002: 20k
// Net: TV002->TV001 = 30k-20k = 10k, TV003->TV001 = 30k, TV003->TV002 = 20k
const netDebts = computeNetDebtFromChiTiet(mockCtRows, mockGdRows);
assert(netDebts['TV002->TV001'] === 10000, 'B nợ A 10k (30k-20k)');
assert(netDebts['TV003->TV001'] === 30000, 'C nợ A 30k');
assert(netDebts['TV003->TV002'] === 20000, 'C nợ B 20k');

const settled0 = [['id','tuId','denId','soTien','ngay']];
const after0 = netDebtAfterSettlement(netDebts, settled0);
assert(after0['TV003->TV001'] === 30000, 'C nợ A 30k (chưa settle)');
assert(after0['TV003->TV002'] === 20000, 'C nợ B 20k (chưa settle)');

const settled1 = [['id','tuId','denId','soTien','ngay'],['TT001','TV003','TV001',10000,'2026-04-15']];
const after1 = netDebtAfterSettlement(netDebts, settled1);
assert(after1['TV003->TV001'] === 20000, 'C nợ A 20k (đã trả 10k)');
assert(after1['TV003->TV002'] === 20000, 'C nợ B 20k (chưa settle)');

const settled2 = [['id','tuId','denId','soTien','ngay'],['TT001','TV003','TV001',30000,'2026-04-15']];
const after2 = netDebtAfterSettlement(netDebts, settled2);
assert(!after2['TV003->TV001'] || after2['TV003->TV001'] === 0, 'C không nợ A nữa');

const settled3 = [['id','tuId','denId','soTien','ngay'],['TT001','TV003','TV001',10000],['TT002','TV001','TV003',5000]];
const after3 = netDebtAfterSettlement(netDebts, settled3);
assert(after3['TV003->TV001'] === 25000, 'Settlement 2 chiều tính đúng: C nợ A 25k');

const netDebts2 = computeNetDebtFromChiTiet(mockCtRows, mockGdRows);
const after4 = netDebtAfterSettlement(netDebts2, settled3);
assert(after4['TV002->TV001'] === 10000, 'B nợ A 10k (A->B settlement không ảnh hưởng)');

console.log('\n✓ Tất cả settlement tests passed!');

// ===== TEST: markBatchPaid logic (pure JS mock) =====
// Mimics the core logic of markBatchPaid without GAS dependencies
const createBatchMockSpreadsheet = (chiTietRows, lichSuRows) => {
  let ctData = chiTietRows.map(r => [...r]);
  let lsData = lichSuRows.map(r => [...r]);
  let nextLtNum = 1;
  if (lsData.length > 1) {
    const m = lsData[lsData.length - 1][0].match(/LT(\d+)/);
    if (m) nextLtNum = parseInt(m[1]) + 1;
  }
  return {
    getSheetByName: (name) => {
      if (name === 'ChiTiet') {
        return {
          getDataRange: () => ({ getValues: () => ctData }),
          getRange: (row, col) => ({
            setValue: (val) => { ctData[row - 1][col - 1] = val; }
          })
        };
      }
      if (name === 'LichSuThanhToan') {
        return {
          getDataRange: () => ({ getValues: () => lsData }),
          appendRow: (row) => {
            lsData.push(row);
            nextLtNum++;
          }
        };
      }
      return null;
    }
  };
};

// Pure JS version of markBatchPaid logic for testing
const markBatchPaidLogic = (ss, chiTietIds) => {
  const ctSheet = ss.getSheetByName('ChiTiet');
  const ctData = ctSheet.getDataRange().getValues();
  const lsSheet = ss.getSheetByName('LichSuThanhToan');
  const lsData = lsSheet.getDataRange().getValues();

  let nextNum = 1;
  if (lsData.length > 1) {
    const m = lsData[lsData.length - 1][0].match(/LT(\d+)/);
    if (m) nextNum = parseInt(m[1]) + 1;
  }

  const idSet = new Set(chiTietIds);
  const now = new Date().toISOString();
  let count = 0;

  for (let i = 1; i < ctData.length; i++) {
    if (idSet.has(ctData[i][0])) {
      ctSheet.getRange(i + 1, 5).setValue(true);
      lsSheet.appendRow([
        `LT${String(nextNum).padStart(4, '0')}`,
        ctData[i][0],
        now,
        ''
      ]);
      nextNum++;
      count++;
    }
  }
  return { success: true, count };
};

// Test data
const batchCtRows = [
  ['id', 'giaoDichId', 'thanhVienId', 'soTien', 'daThanhToan'],
  ['CT001', 'GD001', 'TV001', '30000', false],
  ['CT002', 'GD001', 'TV002', '30000', false],
  ['CT003', 'GD002', 'TV001', '20000', false],
];
const batchLsRows = [
  ['id', 'chiTietId', 'ngayThanhToan', 'nguoiXacNhan'],
];

// Test 1: Mark CT001 and CT002 as paid
const batchSs1 = createBatchMockSpreadsheet(batchCtRows, batchLsRows);
const result1 = markBatchPaidLogic(batchSs1, ['CT001', 'CT002']);
assert(result1.success === true, 'markBatchPaid: returns success=true');
assert(result1.count === 2, 'markBatchPaid: marks 2 items');
assert(batchSs1.getSheetByName('ChiTiet').getDataRange().getValues()[1][4] === true, 'markBatchPaid: CT001 daThanhToan=true');
assert(batchSs1.getSheetByName('ChiTiet').getDataRange().getValues()[2][4] === true, 'markBatchPaid: CT002 daThanhToan=true');
assert(batchSs1.getSheetByName('ChiTiet').getDataRange().getValues()[3][4] === false, 'markBatchPaid: CT003 still false');

// Test 2: Audit log has 2 new entries
const lsAfter = batchSs1.getSheetByName('LichSuThanhToan').getDataRange().getValues();
assert(lsAfter.length === 3, 'markBatchPaid: LichSu has 3 rows (header + 2 logs)');
assert(lsAfter[1][0] === 'LT0001', 'markBatchPaid: first log id=LT0001');
assert(lsAfter[1][1] === 'CT001', 'markBatchPaid: first log chiTietId=CT001');
assert(lsAfter[2][0] === 'LT0002', 'markBatchPaid: second log id=LT0002');
assert(lsAfter[2][1] === 'CT002', 'markBatchPaid: second log chiTietId=CT002');

// Test 3: Mark single item
const batchSs2 = createBatchMockSpreadsheet(batchCtRows, batchLsRows);
const result2 = markBatchPaidLogic(batchSs2, ['CT003']);
assert(result2.count === 1, 'markBatchPaid: single item count=1');
const ctAfter3 = batchSs2.getSheetByName('ChiTiet').getDataRange().getValues();
assert(ctAfter3[3][4] === true, 'markBatchPaid: CT003 now true');

// Test 4: Empty array returns count=0
const batchSs3 = createBatchMockSpreadsheet(batchCtRows, batchLsRows);
const result3 = markBatchPaidLogic(batchSs3, []);
assert(result3.count === 0, 'markBatchPaid: empty array count=0');

// Test 5: IDs not found are silently ignored
const batchSs4 = createBatchMockSpreadsheet(batchCtRows, batchLsRows);
const result4 = markBatchPaidLogic(batchSs4, ['CT001', 'NOTFOUND']);
assert(result4.count === 1, 'markBatchPaid: ignores non-existent IDs');

console.log('\n✓ Tất cả markBatchPaid tests passed!');
