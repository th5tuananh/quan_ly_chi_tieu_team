// test/test-trend.js — chạy bằng: node test/test-trend.js
function assert(condition, msg) {
  if (!condition) { console.error('FAIL:', msg); process.exit(1); }
  console.log('PASS:', msg);
}

// ===== IMPLEMENTATIONS (copied from Code.gs for Node.js testing) =====

function aggregateByMonth(rows, headers) {
  const idxNgay = headers.indexOf('ngay');
  const idxTongTien = headers.indexOf('tongTien');
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const result = {};
  rows.forEach(r => {
    const d = r[idxNgay];
    if (!d) return;
    const month = typeof d === 'string' ? d.substring(0, 7) : d.toISOString().substring(0, 7);
    if (month >= sixMonthsAgo.toISOString().substring(0, 7)) {
      result[month] = (result[month] || 0) + (parseFloat(r[idxTongTien]) || 0);
    }
  });

  return Object.entries(result)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([month, total]) => ({ month, total }));
}

function computeForecast(monthlyTrend) {
  if (monthlyTrend.length < 3) return null;
  const last3 = monthlyTrend.slice(-3).map(m => m.total);
  const sorted = [...last3].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  return {
    nextMonth: nextMonth.toISOString().substring(0, 7),
    predicted: median,
    method: 'median'
  };
}

function aggregateWeeklyHeatmap(rows, headers) {
  const idxNgay = headers.indexOf('ngay');
  const idxTongTien = headers.indexOf('tongTien');
  const now = new Date();
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

  const weeks = {};
  rows.forEach(r => {
    const d = r[idxNgay];
    if (!d) return;
    const date = typeof d === 'string' ? new Date(d) : d;
    if (date < fourWeeksAgo) return;

    const dayOfWeek = (date.getDay() + 6) % 7;
    const weekIndex = Math.floor((now.getTime() - date.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const key = weekIndex;
    if (!weeks[key]) weeks[key] = {};
    if (!weeks[key][dayOfWeek]) weeks[key][dayOfWeek] = [];
    weeks[key][dayOfWeek].push(parseFloat(r[idxTongTien]) || 0);
  });

  const result = [];
  Object.entries(weeks).forEach(([weekIndex, days]) => {
    Object.entries(days).forEach(([dayOfWeek, amounts]) => {
      const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      result.push({ weekIndex: parseInt(weekIndex), dayOfWeek: parseInt(dayOfWeek), avgSpend: avg });
    });
  });
  return result;
}

function aggregateSourceBreakdown(rows, headers) {
  const idxNgay = headers.indexOf('ngay');
  const idxTongTien = headers.indexOf('tongTien');
  const idxNguon = headers.indexOf('nguon');
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const byMonth = {};
  rows.forEach(r => {
    const d = r[idxNgay];
    if (!d) return;
    const month = typeof d === 'string' ? d.substring(0, 7) : d.toISOString().substring(0, 7);
    if (month < sixMonthsAgo.toISOString().substring(0, 7)) return;
    if (!byMonth[month]) byMonth[month] = { grab: 0, shopee: 0, outside: 0, total: 0 };

    const source = r[idxNguon] || 'outside';
    const amount = parseFloat(r[idxTongTien]) || 0;
    byMonth[month].total += amount;
    if (source === 'Grab') byMonth[month].grab += amount;
    else if (source === 'ShopeeFood') byMonth[month].shopee += amount;
    else byMonth[month].outside += amount;
  });

  return Object.entries(byMonth)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([month, data]) => ({
      month,
      grab: data.total > 0 ? Math.round(data.grab / data.total * 100) : 0,
      shopee: data.total > 0 ? Math.round(data.shopee / data.total * 100) : 0,
      outside: data.total > 0 ? Math.round(data.outside / data.total * 100) : 0
    }));
}

function aggregateMemberRanked(rows, headers) {
  const idxNguoiTra = headers.indexOf('nguoiTra');
  const idxTongTien = headers.indexOf('tongTien');
  const idxNgay = headers.indexOf('ngay');

  const members = { TV001: 'Heo', TV002: 'Tuấn Anh', TV003: 'Nhi' };

  const byMember = {};
  rows.forEach(r => {
    const id = r[idxNguoiTra];
    if (!id) return;
    if (!byMember[id]) {
      byMember[id] = { name: members[id] || id, monthly: {}, total: 0 };
    }
    const amount = parseFloat(r[idxTongTien]) || 0;
    byMember[id].total += amount;
    const month = typeof r[idxNgay] === 'string' ? r[idxNgay].substring(0, 7) : r[idxNgay].toISOString().substring(0, 7);
    byMember[id].monthly[month] = (byMember[id].monthly[month] || 0) + amount;
  });

  const result = Object.entries(byMember)
    .map(([id, data]) => {
      const values = Object.values(data.monthly);
      const mean = values.reduce((a, b) => a + b, 0) / (values.length || 1);
      const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (values.length || 1);
      const stddev = Math.sqrt(variance);
      const consistencyScore = mean > 0 ? stddev / mean : 0;

      const now = new Date();
      const sparkline = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const m = d.toISOString().substring(0, 7);
        sparkline.push(data.monthly[m] || 0);
      }

      return {
        id,
        name: data.name,
        totalSpend: data.total,
        consistencyScore: Math.round(consistencyScore * 100) / 100,
        sparkline
      };
    })
    .sort((a, b) => b.totalSpend - a.totalSpend)
    .slice(0, 5);

  return result;
}

// ===== TESTS =====

const headers = ['ngay', 'tongTien', 'nguon', 'nguoiTra', 'trangThai'];

// Test: aggregateByMonth filters to 6 months and aggregates correctly
function testAggregateByMonth() {
  const rows = [
    ['2026-03-15', 500000, 'Grab', 'TV001', 'Active'],
    ['2026-04-10', 300000, 'Grab', 'TV001', 'Active'],
    ['2026-03-20', 200000, 'ShopeeFood', 'TV002', 'Active'],
  ];
  const result = aggregateByMonth(rows, headers);
  assert(result.length <= 6, 'aggregateByMonth: returns at most 6 months');
  const march = result.find(m => m.month === '2026-03');
  assert(march && march.total === 700000, 'aggregateByMonth: March should be 700k (500k+200k)');
  const april = result.find(m => m.month === '2026-04');
  assert(april && april.total === 300000, 'aggregateByMonth: April should be 300k');
}

// Test: computeForecast returns median of last 3 months
function testComputeForecast() {
  const monthlyTrend = [
    { month: '2026-01', total: 1000000 },
    { month: '2026-02', total: 1200000 },
    { month: '2026-03', total: 900000 },
  ];
  const result = computeForecast(monthlyTrend);
  assert(result !== null, 'computeForecast: returns forecast for >=3 months');
  assert(result.method === 'median', 'computeForecast: method is median');
  assert(result.predicted === 1000000, 'computeForecast: median of 900k,1M,1.2M is 1M');
  assert(result.nextMonth !== undefined, 'computeForecast: has nextMonth');
}

// Test: computeForecast returns null for < 3 months
function testComputeForecastLessThan3Months() {
  const monthlyTrend = [{ month: '2026-01', total: 1000000 }];
  const result = computeForecast(monthlyTrend);
  assert(result === null, 'computeForecast: returns null for < 3 months');
}

// Test: aggregateWeeklyHeatmap groups by week and day
function testAggregateWeeklyHeatmap() {
  const now = new Date();
  const recentDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 1 week ago
  const dateStr = recentDate.toISOString().substring(0, 10);
  const rows = [
    [dateStr, 100000, 'Grab', 'TV001', 'Active'],
    [dateStr, 150000, 'Grab', 'TV002', 'Active'],
  ];
  const result = aggregateWeeklyHeatmap(rows, headers);
  assert(result.length > 0, 'aggregateWeeklyHeatmap: returns data for recent transactions');
  const entry = result[0];
  assert(entry.weekIndex !== undefined, 'aggregateWeeklyHeatmap: has weekIndex');
  assert(entry.dayOfWeek !== undefined, 'aggregateWeeklyHeatmap: has dayOfWeek');
  assert(entry.avgSpend !== undefined, 'aggregateWeeklyHeatmap: has avgSpend');
}

// Test: aggregateSourceBreakdown returns percentages
function testAggregateSourceBreakdown() {
  const rows = [
    ['2026-04-10', 500000, 'Grab', 'TV001', 'Active'],
    ['2026-04-15', 300000, 'ShopeeFood', 'TV002', 'Active'],
    ['2026-04-20', 200000, 'outside', 'TV001', 'Active'],
  ];
  const result = aggregateSourceBreakdown(rows, headers);
  assert(result.length > 0, 'aggregateSourceBreakdown: returns data');
  const april = result.find(r => r.month === '2026-04');
  assert(april !== undefined, 'aggregateSourceBreakdown: includes April');
  assert(april.grab + april.shopee + april.outside === 100, 'aggregateSourceBreakdown: percentages sum to 100');
}

// Test: aggregateMemberRanked returns sorted top 5 with sparkline
function testAggregateMemberRanked() {
  const rows = [
    ['2026-04-10', 500000, 'Grab', 'TV001', 'Active'],
    ['2026-04-15', 300000, 'ShopeeFood', 'TV002', 'Active'],
    ['2026-04-20', 200000, 'Grab', 'TV001', 'Active'],
  ];
  const result = aggregateMemberRanked(rows, headers);
  assert(result.length > 0, 'aggregateMemberRanked: returns results');
  assert(result[0].sparkline && result[0].sparkline.length === 6, 'aggregateMemberRanked: sparkline has 6 points');
  assert(result[0].consistencyScore !== undefined, 'aggregateMemberRanked: has consistencyScore');
  assert(result[0].totalSpend > 0, 'aggregateMemberRanked: has totalSpend');
}

// Run all tests
testAggregateByMonth();
testComputeForecast();
testComputeForecastLessThan3Months();
testAggregateWeeklyHeatmap();
testAggregateSourceBreakdown();
testAggregateMemberRanked();

console.log('\n✓ Tất cả trend analytics tests passed!');
