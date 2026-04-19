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
          daThanhToan: row[4]
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
