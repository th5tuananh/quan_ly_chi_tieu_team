// Code.gs

// Thay đổi giá trị này thành ID thật của bạn nếu bạn muốn dùng 1 file Sheet cố định
const MY_SPREADSHEET_ID = '';

function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Quản Lý Chi Tiêu Team')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function initializeSpreadsheet() {
  let ss;
  
  // 1. Trường hợp người dùng có điền ID cứng
  if (MY_SPREADSHEET_ID) {
    try {
      ss = SpreadsheetApp.openById(MY_SPREADSHEET_ID);
    } catch(e) {
      throw new Error("Không thể mở Spreadsheet bằng ID. Vui lòng xem lại quyền hoặc kiểm tra lại chuỗi ID.");
    }
  } 
  // 2. Trường hợp App Script được gắn chung với (container-bound) một file Google Sheets do người dùng vừa tạo
  else if (SpreadsheetApp.getActiveSpreadsheet()) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } 
  // 3. Trường hợp chạy độc lập không gắn vào file nào
  else {
    const props = PropertiesService.getScriptProperties();
    let ssId = props.getProperty('SPREADSHEET_ID');
    if (ssId) {
      try {
        ss = SpreadsheetApp.openById(ssId);
      } catch (e) {
        props.deleteProperty('SPREADSHEET_ID');
        ss = null;
      }
    }
    
    if (!ss) {
      ss = SpreadsheetApp.create('Quản Lý Chi Tiêu Team Data');
      props.setProperty('SPREADSHEET_ID', ss.getId());
    }
  }

  // Khởi tạo các Sheet nếu chưa tồn tại
  const sheets = ss.getSheets();
  const sheetNames = sheets.map(s => s.getName());

  if (!sheetNames.includes('ThanhVien')) {
    let sheetTV = sheets.find(s => s.getName() === 'Trang tính1' || s.getName() === 'Sheet1');
    if (!sheetTV) {
      sheetTV = ss.insertSheet('ThanhVien');
    } else {
      sheetTV.setName('ThanhVien');
    }
    
    // Nếu sheet mới rỗng thì tạo cấu trúc
    if (sheetTV.getLastRow() === 0) {
      sheetTV.appendRow(['id', 'ten', 'ngayThem']);
      const defaultMembers = ['Heo', 'Tuấn Anh', 'Nhi', 'Quỳnh', 'Linh'];
      const dateStr = new Date().toISOString();
      defaultMembers.forEach((name, idx) => {
        sheetTV.appendRow([`TV${String(idx + 1).padStart(3, '0')}`, name, dateStr]);
      });
    }
  }

  if (!sheetNames.includes('GiaoDich')) {
    const sheetGD = ss.insertSheet('GiaoDich');
    sheetGD.appendRow(['id', 'nguoiTra', 'ngay', 'moTa', 'tongTien', 'nguon', 'trangThai']);
  }

  if (!sheetNames.includes('ChiTiet')) {
    const sheetCT = ss.insertSheet('ChiTiet');
    sheetCT.appendRow(['id', 'giaoDichId', 'thanhVienId', 'soTien', 'daThanhToan']);
  }

  if (!sheetNames.includes('LichSuThanhToan')) {
    const sheetLS = ss.insertSheet('LichSuThanhToan');
    sheetLS.appendRow(['id', 'chiTietId', 'ngayThanhToan', 'nguoiXacNhan']);
  }

  return ss;
}

function getSpreadsheet() {
  return initializeSpreadsheet();
}

function getMembers() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('ThanhVien');
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return JSON.stringify([]);
    
    const members = data.slice(1).map(row => ({
      id: row[0],
      ten: row[1],
      ngayThem: row[2]
    }));
    return JSON.stringify(members);
  } catch (e) {
    return JSON.stringify({error: e.toString()});
  }
}

function addMember(name) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('ThanhVien');
    const db = sheet.getDataRange().getValues();
    
    let nextIdNum = 1;
    if (db.length > 1) {
      const lastId = db[db.length - 1][0];
      const match = lastId.match(/TV(\d+)/);
      if (match) nextIdNum = parseInt(match[1]) + 1;
    }
    const newId = `TV${String(nextIdNum).padStart(3, '0')}`;
    
    sheet.appendRow([newId, name, new Date().toISOString()]);
    
    return getMembers(); // Trả về danh sách cập nhật
  } catch (e) {
    return JSON.stringify({error: e.toString()});
  } finally {
    lock.releaseLock();
  }
}

function removeMember(id) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = getSpreadsheet();
    
    const ctSheet = ss.getSheetByName('ChiTiet');
    const ctData = ctSheet.getDataRange().getValues();
    for (let i = 1; i < ctData.length; i++) {
        if (ctData[i][2] === id && ctData[i][4] === false) {
            const gdSheet = ss.getSheetByName('GiaoDich');
            const gdData = gdSheet.getDataRange().getValues();
            let isActive = false;
            for(let j=1; j<gdData.length; j++) {
                if(gdData[j][0] === ctData[i][1] && gdData[j][6] !== 'deleted') {
                    isActive = true; break;
                }
            }
            if(isActive){
                throw new Error("Không thể xoá nhân viên vì vẫn còn nợ chưa thanh toán!");
            }
        }
    }
    
    const tvSheet = ss.getSheetByName('ThanhVien');
    const tvData = tvSheet.getDataRange().getValues();
    for (let i = 1; i < tvData.length; i++) {
        if (tvData[i][0] === id) {
            // Không có trường deleted, nên xóa row khỏi data
            tvSheet.deleteRow(i + 1);
            break;
        }
    }
    return getMembers();
  } catch (e) {
    return JSON.stringify({error: e.toString()});
  } finally {
    lock.releaseLock();
  }
}

function getTransactions() {
  try {
    const ss = getSpreadsheet();

    const gdDb = ss.getSheetByName('GiaoDich').getDataRange().getValues();
    const ctDb = ss.getSheetByName('ChiTiet').getDataRange().getValues();
    const lsDb = ss.getSheetByName('LichSuThanhToan')
      ? ss.getSheetByName('LichSuThanhToan').getDataRange().getValues()
      : [];
    const paidAtMap = {};
    if (lsDb.length > 1) {
      lsDb.slice(1).forEach(row => { paidAtMap[row[1]] = row[2]; });
    }

    if (gdDb.length <= 1) return JSON.stringify([]);

    const chiTietByGd = {};
    if (ctDb.length > 1) {
      ctDb.slice(1).forEach(row => {
        const gdId = row[1];
        if (!chiTietByGd[gdId]) chiTietByGd[gdId] = [];
        chiTietByGd[gdId].push({
          id: row[0],
          thanhVienId: row[2],
          soTien: row[3],
          daThanhToan: row[4],
          paidAt: paidAtMap[row[0]] || null
        });
      });
    }

    const transactions = [];
    gdDb.slice(1).forEach(row => {
      if (row[6] !== 'deleted') {
        transactions.push({
          id: row[0],
          nguoiTra: row[1],
          ngay: row[2],
          moTa: row[3],
          tongTien: row[4],
          nguon: row[5],
          trangThai: row[6],
          chiTiet: chiTietByGd[row[0]] || []
        });
      }
    });
    
    return JSON.stringify(transactions);
  } catch(e) {
     return JSON.stringify({error: e.toString()});
  }
}

function addTransaction(dataStr) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const data = typeof dataStr === 'string' ? JSON.parse(dataStr) : dataStr;
    const ss = getSpreadsheet();
    
    const gdSheet = ss.getSheetByName('GiaoDich');
    const ctSheet = ss.getSheetByName('ChiTiet');
    
    const gdData = gdSheet.getDataRange().getValues();
    let nextGdIdNum = 1;
    if (gdData.length > 1) {
      const lastId = gdData[gdData.length - 1][0];
      const match = lastId.match(/GD(\d+)/);
      if (match) nextGdIdNum = parseInt(match[1]) + 1;
    }
    const newGdId = `GD${String(nextGdIdNum).padStart(3, '0')}`;
    
    gdSheet.appendRow([
      newGdId, 
      data.nguoiTra, 
      data.ngay, 
      data.moTa, 
      data.tongTien, 
      data.nguon, 
      'active'
    ]);
    
    const ctData = ctSheet.getDataRange().getValues();
    let nextCtIdNum = 1;
    if (ctData.length > 1) {
      const lastId = ctData[ctData.length - 1][0];
      const match = lastId.match(/CT(\d+)/);
      if (match) nextCtIdNum = parseInt(match[1]) + 1;
    }
    
    const ctRows = [];
    data.chiTiet.forEach(ct => {
      const isPaid = (ct.thanhVienId === data.nguoiTra);
      const newCtId = `CT${String(nextCtIdNum++).padStart(4, '0')}`;
      ctRows.push([newCtId, newGdId, ct.thanhVienId, ct.soTien, isPaid]);
    });
    
    if (ctRows.length > 0) {
        ctSheet.getRange(ctSheet.getLastRow() + 1, 1, ctRows.length, ctRows[0].length).setValues(ctRows);
    }
    
    return JSON.stringify({success: true, id: newGdId});
  } catch (e) {
    return JSON.stringify({error: e.toString()});
  } finally {
    lock.releaseLock();
  }
}

function deleteTransaction(id) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = getSpreadsheet();
    const gdSheet = ss.getSheetByName('GiaoDich');
    const data = gdSheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === id) {
            gdSheet.getRange(i + 1, 7).setValue('deleted');
            break;
        }
    }
    return JSON.stringify({success: true});
  } catch (e) {
    return JSON.stringify({error: e.toString()});
  } finally {
    lock.releaseLock();
  }
}

function markAsPaid(chiTietId) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = getSpreadsheet();
    const ctSheet = ss.getSheetByName('ChiTiet');
    const data = ctSheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === chiTietId) {
            ctSheet.getRange(i + 1, 5).setValue(true);
            break;
        }
    }
    return JSON.stringify({success: true});
  } catch (e) {
    return JSON.stringify({error: e.toString()});
  } finally {
    lock.releaseLock();
  }
}

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

/**
 * Marks multiple ChiTiet as paid + writes audit log for each
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
      const m = lsData[lsData.length - 1][0].match(/LT(\d+)/);
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

function markAllPaidForMember(debtorId, creditorId) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = getSpreadsheet();
    
    const gdDb = ss.getSheetByName('GiaoDich').getDataRange().getValues();
    const activeGdIds = new Set();
    for (let i = 1; i < gdDb.length; i++) {
        if (gdDb[i][1] === creditorId && gdDb[i][6] !== 'deleted') {
            activeGdIds.add(gdDb[i][0]);
        }
    }
    
    const ctSheet = ss.getSheetByName('ChiTiet');
    const ctData = ctSheet.getDataRange().getValues();
    
    let changed = false;
    for (let i = 1; i < ctData.length; i++) {
        if (ctData[i][2] === debtorId && ctData[i][4] === false) {
            if (activeGdIds.has(ctData[i][1])) {
                ctSheet.getRange(i + 1, 5).setValue(true);
                changed = true;
            }
        }
    }
    return JSON.stringify({success: true});
  } catch (e) {
    return JSON.stringify({error: e.toString()});
  } finally {
    lock.releaseLock();
  }
}

function getSummary() {
  try {
    let summaryData = [];
    const ss = getSpreadsheet();
    const tvDb = ss.getSheetByName('ThanhVien').getDataRange().getValues();
    const members = {};
    if (tvDb.length > 1) {
      tvDb.slice(1).forEach(row => { members[row[0]] = row[1]; });
    }

    const gdDb = ss.getSheetByName('GiaoDich').getDataRange().getValues();
    const ctDb = ss.getSheetByName('ChiTiet').getDataRange().getValues();
    
    const gdMap = {};
    if (gdDb.length > 1) {
        gdDb.slice(1).forEach(row => {
            if (row[6] !== 'deleted') {
                gdMap[row[0]] = { nguoiTra: row[1] };
            }
        });
    }

    const debtMap = {};
    
    if (ctDb.length > 1) {
        ctDb.slice(1).forEach(row => {
            const gdId = row[1];
            const debtor = row[2];
            const amount = parseFloat(row[3]) || 0;
            const isPaid = row[4];
            
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

        if (amountAB > amountBA) {
            const netAmount = amountAB - amountBA;
            if (netAmount > 0) {
                netDebts[`${a}->${b}`] = netAmount;
            }
        }
    }

    for (const key in netDebts) {
        const [from, to] = key.split('->');
        summaryData.push({
            from: from,
            fromName: members[from] || from,
            to: to,
            toName: members[to] || to,
            amount: netDebts[key]
        });
    }
    
    return JSON.stringify(summaryData);
  } catch (e) {
    return JSON.stringify({error: e.toString()});
  }
}

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

/**
 * Trả về trend analytics: monthly trend, forecast, weekly heatmap, source breakdown, member ranked
 * @param {string} monthFrom - Format "YYYY-MM" hoặc null cho all time
 * @param {string} monthTo - Format "YYYY-MM" hoặc null cho current month
 * @param {Array} sources - Array của source filter hoặc null cho all
 * @param {string} memberId - Member ID hoặc null cho all
 */
function getTrendAnalytics(monthFrom, monthTo, sources, memberId) {
  try {
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);

    const sheet = SpreadsheetApp.getSpreadsheet().getSheetByName('GiaoDich');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);

    // Filter transactions
    let filtered = rows.filter(r => r[headers.indexOf('trangThai')] !== 'DaHuy');

    if (monthFrom) {
      filtered = filtered.filter(r => r[headers.indexOf('ngay')] >= monthFrom + '-01');
    }
    if (monthTo) {
      const lastDay = new Date(monthTo + '-01');
      lastDay.setMonth(lastDay.getMonth() + 1);
      const toDate = lastDay.toISOString().split('T')[0];
      filtered = filtered.filter(r => r[headers.indexOf('ngay')] <= toDate);
    }
    if (sources && sources.length > 0 && sources.length < 3) {
      filtered = filtered.filter(r => sources.includes(r[headers.indexOf('nguon')]));
    }
    if (memberId) {
      filtered = filtered.filter(r => r[headers.indexOf('nguoiTra')] === memberId);
    }

    const result = {
      monthlyTrend: aggregateByMonth(filtered, headers),
      forecast: computeForecast(aggregateByMonth(filtered, headers)),
      weeklyHeatmap: aggregateWeeklyHeatmap(filtered, headers),
      sourceBreakdown: aggregateSourceBreakdown(filtered, headers),
      memberRanked: aggregateMemberRanked(filtered, headers)
    };

    lock.releaseLock();
    return JSON.stringify(result);

  } catch (e) {
    return JSON.stringify({ error: e.message });
  }
}

/**
 * Aggregate chi tiêu theo tháng (6 tháng gần nhất)
 */
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

/**
 * Compute forecast = median of last 3 months
 */
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

/**
 * Aggregate chi tiêu theo ngày trong tuần (4-5 tuần gần nhất)
 */
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

/**
 * Aggregate % theo nguồn theo tháng
 */
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

/**
 * Aggregate top members by spend + consistency score + sparkline
 */
function aggregateMemberRanked(rows, headers) {
  const idxNguoiTra = headers.indexOf('nguoiTra');
  const idxTongTien = headers.indexOf('tongTien');
  const idxNgay = headers.indexOf('ngay');

  const memberSheet = SpreadsheetApp.getSpreadsheet().getSheetByName('ThanhVien');
  const memberData = memberSheet.getDataRange().getValues();
  const memberHeaders = memberData[0];
  const members = {};
  memberData.slice(1).forEach(r => {
    members[r[memberHeaders.indexOf('id')]] = r[memberHeaders.indexOf('ten')];
  });

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

/* Node.js test exports - ignore in GAS */
/* module.exports = { aggregateByMonth, computeForecast, aggregateWeeklyHeatmap, aggregateSourceBreakdown, aggregateMemberRanked }; */
