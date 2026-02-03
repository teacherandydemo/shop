
/**
 * 寶紅女孩 (Bao Hong Girl) 後端腳本 - 會員、商品與訂單整合版
 */

const PRODUCT_SHEET_ID = '1j5dzYl3_Q7Kw1L3k_5P3XWmbMZexemlhEp0qE4lc4wU';
const MEMBER_SHEET_ID = '1GmAOZ5WFZK1AW7-xhJ6PmlAHs5QXvmrYNn73VOkzSx4';
const ORDER_SHEET_ID = '17Qc9aLSMIwNr0mawZaaloZi1G3qviHfgNvI--E92uW4';

/**
 * SHA-256 雜湊函式
 */
function hashPassword(password) {
  if (!password) return '';
  const signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password, Utilities.Charset.UTF_8);
  let hexString = '';
  for (let i = 0; i < signature.length; i++) {
    let byte = signature[i];
    if (byte < 0) byte += 256;
    let byteHex = byte.toString(16);
    if (byteHex.length === 1) byteHex = '0' + byteHex;
    hexString += byteHex;
  }
  return hexString;
}

/**
 * 格式化日期為 yyyy-MM-dd
 */
function formatDateString(date) {
  if (!date) return '';
  if (date instanceof Date) {
    return Utilities.formatDate(date, "GMT+8", "yyyy-MM-dd");
  }
  const str = date.toString();
  if (str.includes('T')) return str.split('T')[0];
  return str;
}

/**
 * 格式化電話號碼 (確保 0 開頭)
 */
function formatPhoneString(phone) {
  if (!phone) return '';
  let str = phone.toString().replace(/[']/g, ''); // 移除可能的單引號
  if (str.length === 9 && !str.startsWith('0')) return '0' + str;
  return str;
}

function doGet(e) {
  const action = e.parameter.action;
  try {
    if (action === 'getProducts') {
      return handleGetProducts();
    }
    return createResponse({ error: '未知的 action 參數' });
  } catch (err) {
    return createResponse({ error: '伺服器執行錯誤', details: err.toString() });
  }
}

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;

    if (action === 'registerMember') return handleRegisterMember(postData.data);
    if (action === 'loginMember') return handleLoginMember(postData.data);
    if (action === 'updateMember') return handleUpdateMember(postData.data);
    if (action === 'createOrder') return handleCreateOrder(postData.data);
    if (action === 'getOrders') return handleGetOrders(postData.data);
    if (action === 'getAllMembers') return handleGetAllMembers(postData.data);
    
    return createResponse({ error: '未知的 POST action' });
  } catch (err) {
    return createResponse({ error: 'POST 請求處理失敗', details: err.toString() });
  }
}

/**
 * 獲取訂單紀錄
 */
function handleGetOrders(data) {
  const ss = SpreadsheetApp.openById(ORDER_SHEET_ID);
  const sheet = ss.getSheets()[0];
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => h.toString().toLowerCase().trim());
  
  const mIdIdx = headers.indexOf('m_id');
  const rows = values.slice(1);
  
  let filteredRows;
  // 管理員可以看到所有訂單，一般會員只能看到自己的
  if (data.m_level === 'Admin') {
    filteredRows = rows;
  } else {
    filteredRows = rows.filter(row => row[mIdIdx] === data.m_id);
  }

  const result = filteredRows.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  }).reverse(); // 最新訂單在前

  return createResponse({ status: 'success', data: result });
}

/**
 * 獲取所有會員 (管理員專用)
 */
function handleGetAllMembers(data) {
  if (data.m_level !== 'Admin') return createResponse({ status: 'error', message: '權限不足' });
  
  const ss = SpreadsheetApp.openById(MEMBER_SHEET_ID);
  const sheet = ss.getSheets()[0];
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => h.toString().toLowerCase().trim());
  
  const pwdIdx = headers.indexOf('m_password');
  const result = values.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => {
      if (i !== pwdIdx) {
        let val = row[i];
        if (h === 'm_birthday') val = formatDateString(val);
        if (h === 'm_phone') val = formatPhoneString(val);
        obj[h] = val;
      }
    });
    return obj;
  });
  
  return createResponse({ status: 'success', data: result });
}

/**
 * 處理建立訂單
 */
function handleCreateOrder(data) {
  const ssOrder = SpreadsheetApp.openById(ORDER_SHEET_ID);
  const sheetOrder = ssOrder.getSheets()[0];
  
  const ssProd = SpreadsheetApp.openById(PRODUCT_SHEET_ID);
  const sheetProd = ssProd.getSheets().find(s => s.getName().includes('商品')) || ssProd.getSheets()[0];
  const prodData = sheetProd.getDataRange().getValues();
  const prodHeaders = prodData[0].map(h => h.toString().toLowerCase().trim());
  
  const idCol = prodHeaders.indexOf('p_id');
  const stockCol = prodHeaders.indexOf('p_stock');
  
  const items = data.o_items; 
  
  for (let item of items) {
    const rowIdx = prodData.findIndex(row => row[idCol].toString().trim() === item.p_id.toString().trim());
    if (rowIdx === -1) return createResponse({ status: 'error', message: `商品「${item.p_name}」不存在` });
    const currentStock = Number(prodData[rowIdx][stockCol]);
    if (isNaN(currentStock) || currentStock < item.quantity) return createResponse({ status: 'error', message: `商品「${item.p_name}」庫存不足` });
  }
  
  for (let item of items) {
    const rowIdx = prodData.findIndex(row => row[idCol].toString().trim() === item.p_id.toString().trim());
    const currentStock = Number(prodData[rowIdx][stockCol]);
    sheetProd.getRange(rowIdx + 1, stockCol + 1).setValue(currentStock - item.quantity);
  }
  
  const o_id = 'ORD-' + Utilities.formatDate(new Date(), "GMT+8", "yyyyMMdd") + '-' + Math.floor(Math.random() * 9000 + 1000);
  const orderHeaders = sheetOrder.getDataRange().getValues()[0].map(h => h.toString().toLowerCase().trim());
  
  const newOrderRow = orderHeaders.map(h => {
    switch(h) {
      case 'o_id': return o_id;
      case 'm_id': return data.m_id;
      case 'o_items': return JSON.stringify(items.map(i => ({ p_id: i.p_id, p_name: i.p_name, qty: i.quantity, price: i.p_price })));
      case 'o_total': return data.o_total;
      case 'o_status': return '待處理';
      case 'o_shipping_addr': return data.o_shipping_addr;
      case 'o_created_at': return Utilities.formatDate(new Date(), "GMT+8", "yyyy-MM-dd HH:mm:ss");
      default: return '';
    }
  });
  
  sheetOrder.appendRow(newOrderRow);
  SpreadsheetApp.flush();
  return createResponse({ status: 'success', o_id: o_id });
}

/**
 * 處理會員登入
 */
function handleLoginMember(data) {
  const ss = SpreadsheetApp.openById(MEMBER_SHEET_ID);
  const sheet = ss.getSheets()[0];
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => h.toString().toLowerCase().trim());
  
  const emailIdx = headers.indexOf('m_email');
  const passwordIdx = headers.indexOf('m_password');
  
  const inputEmail = data.m_email;
  const inputHashedPwd = hashPassword(data.m_password);
  
  const userRow = values.slice(1).find(row => row[emailIdx] === inputEmail && row[passwordIdx] === inputHashedPwd);
  
  if (userRow) {
    let userData = {};
    headers.forEach((h, i) => {
      if (h !== 'm_password') {
        let val = userRow[i];
        if (h === 'm_birthday') val = formatDateString(val);
        if (h === 'm_phone') val = formatPhoneString(val);
        userData[h] = val;
      }
    });
    return createResponse({ status: 'success', data: userData });
  } else {
    return createResponse({ status: 'error', message: '電子郵件或密碼錯誤' });
  }
}

/**
 * 處理會員資料更新
 */
function handleUpdateMember(data) {
  const ss = SpreadsheetApp.openById(MEMBER_SHEET_ID);
  const sheet = ss.getSheets()[0];
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => h.toString().toLowerCase().trim());
  
  const idIdx = headers.indexOf('m_id');
  const rowIndex = values.findIndex(row => row[idIdx] === data.m_id);
  
  if (rowIndex === -1) return createResponse({ status: 'error', message: '找不到會員資料' });

  const updatable = ['m_name', 'm_phone', 'm_address', 'm_birthday'];
  updatable.forEach(key => {
    const colIdx = headers.indexOf(key);
    if (colIdx !== -1 && data[key] !== undefined) {
      let val = data[key];
      if (key === 'm_phone') {
        val = val.toString();
        if (val.length === 9 && !val.startsWith('0')) val = '0' + val;
        val = "'" + val; 
      }
      sheet.getRange(rowIndex + 1, colIdx + 1).setValue(val);
    }
  });

  SpreadsheetApp.flush();
  return createResponse({ status: 'success', message: '資料更新成功' });
}

/**
 * 處理會員註冊
 */
function handleRegisterMember(data) {
  const ss = SpreadsheetApp.openById(MEMBER_SHEET_ID);
  const sheet = ss.getSheets()[0];
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => h.toString().toLowerCase().trim());
  
  const emailIdx = headers.indexOf('m_email');
  const existingEmails = values.slice(1).map(row => row[emailIdx]);
  if (existingEmails.includes(data.m_email)) {
    return createResponse({ status: 'error', message: '此電子郵件已註冊過會員' });
  }

  const nextId = 'M-' + (1000 + values.length);
  const now = new Date();
  const hashedPwd = hashPassword(data.m_password);
  
  const newRow = headers.map(header => {
    switch(header) {
      case 'm_id': return nextId;
      case 'm_email': return data.m_email;
      case 'm_password': return hashedPwd; 
      case 'm_name': return data.m_name;
      case 'm_phone': 
        let phone = data.m_phone.toString();
        if (phone.length === 9 && !phone.startsWith('0')) phone = '0' + phone;
        return "'" + phone;
      case 'm_address': return data.m_address || '';
      case 'm_birthday': return data.m_birthday || '';
      case 'm_level': return 'General';
      case 'm_created_at': return Utilities.formatDate(now, "GMT+8", "yyyy-MM-dd HH:mm:ss");
      default: return '';
    }
  });

  sheet.appendRow(newRow);
  SpreadsheetApp.flush();
  return createResponse({ status: 'success', message: '註冊成功' });
}

function handleGetProducts() {
  const ss = SpreadsheetApp.openById(PRODUCT_SHEET_ID);
  const sheet = ss.getSheets().find(s => s.getName().includes('商品')) || ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  const headers = data.shift().map(h => h.toString().trim().toLowerCase());
  const products = data.map((row, index) => {
    let obj = {};
    headers.forEach((h, i) => {
      let value = row[i];
      if (h === 'p_image') {
        if (value && typeof value === 'string' && value.includes('drive.google.com')) {
          const match = value.match(/\/file\/d\/([^\/\\\?#]+)/) || value.match(/id=([^\/\\\?#&]+)/);
          if (match) value = `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
        }
      }
      obj[h] = value;
    });
    return obj;
  });
  return createResponse({ status: 'success', data: products.filter(p => p.p_status !== 'Inactive') });
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
