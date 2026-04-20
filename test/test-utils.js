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
