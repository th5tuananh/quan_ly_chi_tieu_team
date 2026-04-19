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
