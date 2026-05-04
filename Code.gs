// ============================================
// IRIGA PPO ATTENDANCE SYSTEM – EMAIL ONLY WHEN 60 DAYS OR LESS REMAINING
// ============================================

const SPREADSHEET_ID = '1yvSK06QRekXYitYpE8iG_v1jYt1uyPlgM06xCzRHmlE';
const SHEET_NAME = 'Test Sheet';
const TRACKING_SHEET_NAME = 'Supervision_Tracking';

// ============================================
// AUTHORIZED EMPLOYEES
// ============================================
const AUTHORIZED_EMPLOYEES = [
  'iace2318i@gmail.com',
  'wq.rodalyn@gmail.com'
];

// ============================================
// EMAIL CONFIGURATION
// ============================================
const MAIN_OFFICE_EMAIL = 'iace2318i@gmail.com';
const SEND_EMAIL_NOTIFICATIONS = true;
const EMAIL_THRESHOLD_DAYS = 60; // Only send email when 60 days or less remaining

// ============================================
// CORS HELPERS
// ============================================
function createCorsOutput(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doOptions(e) {
  return createCorsOutput({ success: true });
}

// ============================================
// TIME CALCULATION (remaining + served only)
// ============================================
function calculateTimeRemaining(endDateStr) {
  if (!endDateStr || endDateStr === 'N/A' || endDateStr === '') return { text: 'No end date specified', days: null };
  try {
    let endDate;
    if (endDateStr.includes('-')) {
      const parts = endDateStr.split('-');
      endDate = new Date(parts[2], parts[0] - 1, parts[1]);
    } else {
      endDate = new Date(endDateStr);
    }
    const today = new Date();
    today.setHours(0,0,0,0);
    if (endDate < today) return { text: 'EXPIRED - Supervision period has ended', days: 0 };
    const diffDays = Math.ceil((endDate - today) / (1000*60*60*24));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    const days = diffDays % 30;
    let text = '';
    if (years > 0) text = `${years} year(s), ${months} month(s), ${days} day(s) remaining`;
    else if (months > 0) text = `${months} month(s), ${days} day(s) remaining`;
    else text = `${diffDays} day(s) remaining`;
    return { text: text, days: diffDays };
  } catch(e) { return { text: 'Unable to calculate', days: null }; }
}

function calculateTimeServed(startDateStr) {
  if (!startDateStr || startDateStr === 'N/A' || startDateStr === '') return 'No start date specified';
  try {
    let startDate;
    if (startDateStr.includes('-')) {
      const parts = startDateStr.split('-');
      startDate = new Date(parts[2], parts[0] - 1, parts[1]);
    } else {
      startDate = new Date(startDateStr);
    }
    const today = new Date();
    today.setHours(0,0,0,0);
    if (startDate > today) return 'Supervision has not started yet';
    const diffDays = Math.ceil((today - startDate) / (1000*60*60*24));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    const days = diffDays % 30;
    if (years > 0) return `${years} year(s), ${months} month(s), ${days} day(s) served`;
    if (months > 0) return `${months} month(s), ${days} day(s) served`;
    return `${diffDays} day(s) served`;
  } catch(e) { return 'Unable to calculate'; }
}

// ============================================
// EMAIL NOTIFICATION - ONLY SENT WHEN <= 60 DAYS REMAINING
// ============================================
function sendAttendanceNotification(data, clientName, clientId) {
  if (!SEND_EMAIL_NOTIFICATIONS) return;
  if (!MAIN_OFFICE_EMAIL || MAIN_OFFICE_EMAIL === 'mainoffice@irigappo.gov.ph') return;
  
  try {
    const endDate = data.endDate || 'N/A';
    const startDate = data.startDate || 'N/A';
    const timeRemainingObj = calculateTimeRemaining(endDate);
    const timeRemaining = timeRemainingObj.text;
    const daysRemaining = timeRemainingObj.days;
    const timeServed = calculateTimeServed(startDate);
    
    // Only send email if days remaining is 60 or less (and not expired)
    if (daysRemaining !== null && daysRemaining <= EMAIL_THRESHOLD_DAYS && daysRemaining > 0) {
      
      let statusEmoji = '🟡';
      let statusText = 'Approaching End Date';
      if (timeRemaining.includes('EXPIRED')) { 
        statusEmoji = '🔴'; 
        statusText = 'EXPIRED'; 
      }
      
      const body = `
🏢 IRIGA CITY PROBATION AND PAROLE OFFICE
==========================================
⚠️ ATTENTION: SUPERVISION ENDING SOON ⚠️
${statusEmoji} Status: ${statusText}

👤 PERSON UNDER SUPERVISION
─────────────────────────────────────────
PS ID: ${clientId || 'N/A'}
Full Name: ${clientName || 'N/A'}
Gender: ${data.gender || 'N/A'}
Age: ${data.age || 'N/A'}
Offense: ${data.offenseCategory || 'N/A'}
Officer: ${data.supervisingOfficer || 'N/A'}
Cluster: ${data.cluster || 'N/A'}

⏰ SUPERVISION TIMELINE
─────────────────────────────────────────
Start: ${startDate}
End:   ${endDate}
✅ Time served: ${timeServed}
⏳ Remaining:   ${timeRemaining}

⚠️ ONLY ${daysRemaining} DAYS REMAINING IN SUPERVISION PERIOD ⚠️

📝 ATTENDANCE DETAILS
─────────────────────────────────────────
Date/Time: ${new Date().toLocaleString()}
REMARKS: ${data.remarks || 'N/A'}
Family Support: ${data.familySupport || 'N/A'}
NOTES: ${data.notes || 'No notes'}

👮 Officer Email: ${data.employeeEmail || 'N/A'}
==========================================
This is an automated alert from the Iriga PPO Attendance System.
Please review this case as the supervision period is ending soon.`;
      
      MailApp.sendEmail({ 
        to: MAIN_OFFICE_EMAIL, 
        subject: `⚠️ ALERT: Supervision Ending Soon - ${clientName} (${clientId}) - ${daysRemaining} days left`, 
        body: body 
      });
      console.log(`✅ Alert email sent for ${clientName} - ${daysRemaining} days remaining`);
    } else if (daysRemaining !== null && daysRemaining > EMAIL_THRESHOLD_DAYS) {
      console.log(`ℹ️ No email sent for ${clientName} - ${daysRemaining} days remaining (threshold: ${EMAIL_THRESHOLD_DAYS})`);
    } else if (daysRemaining === 0) {
      console.log(`ℹ️ Supervision already expired for ${clientName}`);
    } else {
      console.log(`ℹ️ Could not calculate days remaining for ${clientName}`);
    }
  } catch(e) { 
    console.error('Email error:', e.message); 
  }
}

// ============================================
// SUPERVISION TRACKING SHEET
// ============================================
function updateSupervisionTracking(data, clientName, clientId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(TRACKING_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(TRACKING_SHEET_NAME);
    sheet.getRange(1,1,1,9).setValues([[
      'PS ID', 'PS Name', 'Start Date', 'End Date', 'Time Remaining', 'Days Left', 'Status', 'Last Attendance', 'Officer Email'
    ]]);
    sheet.getRange(1,1,1,9).setFontWeight('bold');
  }
  const pusId = clientId || data.clientId || data.pusId || `PS${new Date().getTime()}`;
  const pusName = clientName || data.clientName || data.pusName || 'N/A';
  const startDate = data.startDate || 'N/A';
  const endDate = data.endDate || 'N/A';
  const timeRemainingObj = calculateTimeRemaining(endDate);
  const timeRemaining = timeRemainingObj.text;
  const daysLeft = timeRemainingObj.days;
  
  let status = 'Active';
  if (daysLeft !== null && daysLeft <= 60 && daysLeft > 0) status = '⚠️ Ending Soon';
  else if (daysLeft !== null && daysLeft <= 0) status = 'Expired';
  
  const existing = sheet.getDataRange().getValues();
  let rowIdx = -1;
  for (let i=1; i<existing.length; i++) {
    if (existing[i][0] === pusId) { rowIdx = i+1; break; }
  }
  const newRow = [pusId, pusName, startDate, endDate, timeRemaining, daysLeft !== null ? daysLeft : 'N/A', status, new Date(), data.employeeEmail || ''];
  if (rowIdx === -1) sheet.appendRow(newRow);
  else for (let i=0; i<newRow.length; i++) sheet.getRange(rowIdx, i+1).setValue(newRow[i]);
  console.log(`✅ Tracking sheet updated for ${pusId} - Days left: ${daysLeft}`);
}

// ============================================
// doPost – MAIN ENTRY POINT
// ============================================
function doPost(e) {
  try {
    let data = (e && e.postData && e.postData.contents) ? JSON.parse(e.postData.contents) : {};
    const employeeEmail = data.employeeEmail || data.email;
    if (!employeeEmail) return createCorsOutput({ success: false, error: 'No email' });
    if (!AUTHORIZED_EMPLOYEES.includes(employeeEmail)) return createCorsOutput({ success: false, error: 'Unauthorized' });
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1,1,1,13).setValues([[
        'Timestamp','NAME OF CLIENT','GENDER','OFFENSE CATEGORY',
        'START OF SUPERVISION PERIOD','END OF SUPERVISION PERIOD',
        'NAME OF SUPERVISING OFFICER','CLUSTER','REMARKS',
        'WITH FAMILY SUPPORT GROUP','NOTES','Email Address Of employee','AGE'
      ]]).setFontWeight('bold');
    }
    const clientName = data.clientName || data.pusName || 'N/A';
    const clientId = data.clientId || data.pusId || '';
    const row = [
      new Date(), clientName, data.gender || 'N/A', data.offenseCategory || 'N/A',
      data.startDate || 'N/A', data.endDate || 'N/A', data.supervisingOfficer || 'N/A',
      data.cluster || 'N/A', data.remarks || 'N/A', data.familySupport || 'N/A',
      data.notes || '', employeeEmail, data.age || 'N/A'
    ];
    sheet.appendRow(row);
    Utilities.sleep(500);
    sendAttendanceNotification(data, clientName, clientId);
    updateSupervisionTracking(data, clientName, clientId);
    return createCorsOutput({ success: true, row: sheet.getLastRow(), message: 'Attendance recorded' });
  } catch(err) {
    console.error(err);
    return createCorsOutput({ success: false, error: err.toString() });
  }
}

// ============================================
// doGet – ONLY from QR code JSON (no master sheet)
// ============================================
function doGet(e) {
  try {
    const qrData = e.parameter.qr || e.parameter.pusId || e.parameter.clientId;
    const employeeEmail = e.parameter.email;
    if (!AUTHORIZED_EMPLOYEES.includes(employeeEmail)) return createCorsOutput({ success: false, error: 'Unauthorized' });
    if (!qrData) return createCorsOutput({ success: false, error: 'No QR data' });
    let clientData;
    try { clientData = JSON.parse(qrData); }
    catch(parseErr) { return createCorsOutput({ success: false, error: 'Invalid QR code' }); }
    return createCorsOutput({
      success: true,
      client: {
        clientName: clientData.pusName || clientData.clientName,
        clientId: clientData.pusId || clientData.clientId,
        gender: clientData.gender,
        age: clientData.age,
        offenseCategory: clientData.offenseCategory,
        startDate: clientData.startDate,
        endDate: clientData.endDate,
        supervisingOfficer: clientData.supervisingOfficer,
        cluster: clientData.cluster
      }
    });
  } catch(err) {
    return createCorsOutput({ success: false, error: err.toString() });
  }
}

// ============================================
// TEST FUNCTIONS
// ============================================
function testEmailOnly() {
  MailApp.sendEmail({ to: MAIN_OFFICE_EMAIL, subject: 'Test Email', body: 'Email works' });
}

function testWrite() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1,1,1,13).setValues([[
      'Timestamp','NAME OF CLIENT','GENDER','OFFENSE CATEGORY',
      'START OF SUPERVISION PERIOD','END OF SUPERVISION PERIOD',
      'NAME OF SUPERVISING OFFICER','CLUSTER','REMARKS',
      'WITH FAMILY SUPPORT GROUP','NOTES','Email Address Of employee','AGE'
    ]]).setFontWeight('bold');
  }
  sheet.appendRow([new Date(),'TEST – Works!','Male','Drug Offense','01-01-2024','12-31-2024',
    'SSPO JANET B. PAVIA','IRIGA','Test','Yes','Test row','test@example.com','35']);
  return '✅ Test row added.';
}

function testThresholdAlert() {
  // Test with a date that is 45 days from now (should trigger alert)
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + 45);
  const futureDateStr = `${(futureDate.getMonth()+1).toString().padStart(2,'0')}-${futureDate.getDate().toString().padStart(2,'0')}-${futureDate.getFullYear()}`;
  
  const testData = {
    employeeEmail: 'iace2318i@gmail.com',
    clientName: 'TEST - Threshold Alert',
    clientId: 'TEST001',
    gender: 'Male',
    age: '35',
    offenseCategory: 'Drug Offense',
    startDate: '01-01-2024',
    endDate: futureDateStr,
    supervisingOfficer: 'SSPO TEST',
    cluster: 'IRIGA',
    remarks: 'Test',
    familySupport: 'Yes',
    notes: 'This should trigger an alert email'
  };
  
  sendAttendanceNotification(testData, 'TEST - Threshold Alert', 'TEST001');
  return '✅ Test threshold alert sent if applicable';
}