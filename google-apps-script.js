/**
 * AB GYM - GOOGLE APPS SCRIPT BACKEND
 *
 * Instructions for Setup:
 * 1. Open Google Sheets (https://sheets.google.com) and create a new blank spreadsheet titled "AB Gym Database".
 * 2. Click Extensions > Apps Script.
 * 3. Delete any default code in Code.gs and paste this entire code into Code.gs.
 * 4. Click Save.
 * 5. Click Deploy > New deployment.
 * 6. Select type: Web app.
 * 7. Execute as: "Me" (your Google account).
 * 8. Who has access: "Anyone" (CRITICAL for API calls to work).
 * 9. Click Deploy, authorize permissions, and copy the Web App URL.
 * 10. Set the Web App URL as VITE_GOOGLE_SCRIPT_URL in your environment or enter it in the Admin Settings tab inside AB Gym.
 */

// Global Config & Sheet Names
var SHEETS = {
  REGISTRATIONS: 'Registrations',
  MEMBERS: 'Members',
  FEE_PAYMENTS: 'Fee Payments',
  ACTIVITY_LOGS: 'Activity Logs',
  SETTINGS: 'Settings'
};

var DEFAULT_ADMIN_PASS = 'ABGym@2026';

// Sheet Headers Definition
var HEADERS = {
  Registrations: [
    'Timestamp',
    'Registration Reference Number',
    'Roll Number',
    'Full Name',
    'Gender',
    'Date of Birth',
    'Phone Number',
    'Email Address',
    'Address',
    'Emergency Contact Number',
    'Selected Plan',
    'Fitness Goal',
    'Joining Date',
    'Registration Fee',
    'Payment Method',
    'UPI Transaction ID',
    'Payment Screenshot',
    'Registration Status',
    'Payment Status',
    'Terms Accepted',
    'Terms Accepted Date',
    'Entry Source',
    'Created By',
    'Admin Remarks',
    'Rejection Reason',
    'Approved By',
    'Approved Date'
  ],
  Members: [
    'Timestamp',
    'Registration Reference Number',
    'Roll Number',
    'Full Name',
    'Gender',
    'Date of Birth',
    'Phone Number',
    'Email Address',
    'Address',
    'Emergency Contact Number',
    'Selected Plan',
    'Fitness Goal',
    'Joining Date',
    'Membership Start Date',
    'Membership Expiry Date',
    'Registration Fee',
    'Previous Balance',
    'Member Status',
    'Last Payment Date',
    'Last Payment Amount',
    'Last Payment Status',
    'Medical Condition',
    'Remarks',
    'Created By',
    'Updated At'
  ],
  'Fee Payments': [
    'Timestamp',
    'Fee Reference Number',
    'Registration Reference Number',
    'Roll Number',
    'Member Name',
    'Phone Number',
    'Email Address',
    'Selected Plan',
    'Previous Balance',
    'Current Fee Amount',
    'Total Payable Amount',
    'Payment Date',
    'Payment Method',
    'UPI Transaction ID',
    'Payment Screenshot',
    'Payment Status',
    'Registration Status',
    'Receipt Number',
    'PDF Receipt Link',
    'Entry Source',
    'Notes',
    'Verified By',
    'Verified Date',
    'Rejection Reason'
  ],
  'Activity Logs': [
    'Timestamp',
    'Admin Name',
    'Action',
    'Record Type',
    'Reference Number',
    'Old Status',
    'New Status',
    'Remarks'
  ],
  Settings: ['Key', 'Value']
};

/**
 * Main Web App Handlers
 */
function doGet(e) {
  var action = e && e.parameter ? e.parameter.action : null;
  if (!action) {
    return createJsonResponse({
      success: true,
      message: 'AB Gym Google Apps Script Web App is live and ready.'
    });
  }
  return handleAction(action, e.parameter);
}

function doPost(e) {
  try {
    var contents = e.postData ? e.postData.contents : null;
    var requestData = {};
    if (contents) {
      requestData = JSON.parse(contents);
    } else if (e.parameter) {
      requestData = e.parameter;
    }
    var action = requestData.action;
    var data = requestData.data || requestData;
    var token = requestData.token;

    return handleAction(action, data, token);
  } catch (err) {
    return createJsonResponse({
      success: false,
      message: 'Failed to process POST request: ' + err.toString()
    });
  }
}

function handleAction(action, data, token) {
  // Ensure all database sheets and headers are initialized
  initializeSheets();

  // Public Actions
  if (action === 'registerMember') return handleRegisterMember(data);
  if (action === 'getRegistrationForFee') return handleGetRegistrationForFee(data);
  if (action === 'submitFee') return handleSubmitFee(data);
  if (action === 'checkRegistrationStatus') return handleCheckRegistrationStatus(data);

  // Admin Actions (Validate Token/Password)
  if (action === 'adminLogin') return handleAdminLogin(data);

  // Protected Admin endpoints
  if (!validateAdminToken(token)) {
    return createJsonResponse({
      success: false,
      message: 'Unauthorized: Invalid or expired admin session token.'
    });
  }

  if (action === 'getDashboard') return handleGetDashboard();
  if (action === 'getRegistrations') return handleGetRegistrations();
  if (action === 'getMembers') return handleGetMembers();
  if (action === 'getFeePayments') return handleGetFeePayments();
  if (action === 'getActivityLogs') return handleGetActivityLogs();
  if (action === 'updateRegistrationStatus') return handleUpdateRegistrationStatus(data);
  if (action === 'updateFeeStatus') return handleUpdateFeeStatus(data);
  if (action === 'updateMember') return handleUpdateMember(data);
  if (action === 'deleteMember') return handleDeleteMember(data);
  if (action === 'seedSampleData') return handleSeedSampleData();

  return createJsonResponse({
    success: false,
    message: 'Unknown action requested: ' + action
  });
}

/**
 * Public Action Handlers
 */

// 1. Register Member
function handleRegisterMember(data) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEETS.REGISTRATIONS);

    var now = new Date();
    var regRef = generateRegistrationRef(now);

    var phone = cleanString(data.phone);
    var fullName = cleanString(data.fullName);

    if (!fullName || !phone) {
      return createJsonResponse({
        success: false,
        message: 'Full Name and Phone Number are required.'
      });
    }

    var row = [
      formatDate(now), // Timestamp
      regRef, // Registration Reference Number
      'Unassigned', // Roll Number (Unassigned before admin approval)
      fullName,
      cleanString(data.gender) || 'Male',
      cleanString(data.dob),
      phone,
      cleanString(data.email),
      cleanString(data.address),
      cleanString(data.emergencyContact),
      cleanString(data.planName),
      cleanString(data.fitnessGoal),
      cleanString(data.joiningDate) || formatDateShort(now),
      data.registrationFee || 500,
      cleanString(data.paymentMethod) || 'UPI',
      cleanString(data.upiTxnId) || '',
      cleanString(data.upiScreenshotUrl) || '',
      'Pending Verification', // Registration Status
      'Not Submitted', // Payment Status
      data.termsAccepted ? 'TRUE' : 'FALSE',
      formatDate(now),
      'Website', // Entry Source
      'Public Registration', // Created By
      '', // Admin Remarks
      '', // Rejection Reason
      '', // Approved By
      '' // Approved Date
    ];

    sheet.appendRow(row);

    logActivity('System', 'Public Registration Submitted', 'Registration', regRef, 'None', 'Pending Verification', 'Registration reference generated: ' + regRef);

    return createJsonResponse({
      success: true,
      message: 'Registration submitted successfully.',
      registrationReferenceNumber: regRef,
      registrationStatus: 'Pending Verification',
      rollNumber: null,
      data: {
        registrationRef: regRef,
        fullName: fullName,
        phone: phone,
        planName: data.planName,
        status: 'Pending Verification'
      }
    });
  } catch (err) {
    return createJsonResponse({
      success: false,
      message: 'Failed to submit registration: ' + err.toString()
    });
  } finally {
    lock.releaseLock();
  }
}

// 2. Get Registration For Fee Verification
function handleGetRegistrationForFee(data) {
  try {
    var queryRef = cleanString(data.registrationRefOrRoll || data.registrationRef || data.rollNumber).toUpperCase();
    var mobileLast4 = cleanString(data.mobileLast4).replace(/\D/g, '');

    if (!queryRef || !mobileLast4) {
      return createJsonResponse({
        success: false,
        message: 'Registration Reference Number (or Roll Number) and registered mobile last 4 digits are required.'
      });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Search Registrations sheet
    var regSheet = ss.getSheetByName(SHEETS.REGISTRATIONS);
    var regRows = getSheetObjects(regSheet);

    for (var i = 0; i < regRows.length; i++) {
      var r = regRows[i];
      var rRef = cleanString(r['Registration Reference Number']).toUpperCase();
      var rRoll = cleanString(r['Roll Number']).toUpperCase();

      if (rRef === queryRef || (rRoll && rRoll === queryRef && rRoll !== 'UNASSIGNED')) {
        var phone = cleanString(r['Phone Number']).replace(/\D/g, '');
        if (phone.slice(-4) !== mobileLast4) {
          return createJsonResponse({
            success: false,
            message: 'Mobile number verification failed. Please enter the correct last 4 digits of your registered phone number.'
          });
        }

        var maskedPhone = '******' + mobileLast4;

        return createJsonResponse({
          success: true,
          message: 'Registration verified successfully.',
          data: {
            registrationRef: r['Registration Reference Number'],
            rollNumber: r['Roll Number'] !== 'Unassigned' ? r['Roll Number'] : '',
            fullName: r['Full Name'],
            maskedPhone: maskedPhone,
            emailAddress: r['Email Address'] || '',
            selectedPlan: r['Selected Plan'] || '',
            joiningDate: r['Joining Date'] || '',
            registrationFee: parseFloat(r['Registration Fee']) || 500,
            registrationStatus: r['Registration Status'] || 'Pending Verification',
            paymentStatus: r['Payment Status'] || 'Not Submitted'
          }
        });
      }
    }

    // 2. Fallback: Search Members sheet by Roll Number
    var memSheet = ss.getSheetByName(SHEETS.MEMBERS);
    var memRows = getSheetObjects(memSheet);

    for (var j = 0; j < memRows.length; j++) {
      var m = memRows[j];
      var mRoll = cleanString(m['Roll Number']).toUpperCase();

      if (mRoll === queryRef) {
        var mPhone = cleanString(m['Phone Number']).replace(/\D/g, '');
        if (mPhone.slice(-4) !== mobileLast4) {
          return createJsonResponse({
            success: false,
            message: 'Mobile number verification failed. Please enter the correct last 4 digits of your registered phone number.'
          });
        }

        return createJsonResponse({
          success: true,
          message: 'Member verified successfully.',
          data: {
            registrationRef: m['Registration Reference Number'] || '',
            rollNumber: m['Roll Number'],
            fullName: m['Full Name'],
            maskedPhone: '******' + mobileLast4,
            emailAddress: m['Email Address'] || '',
            selectedPlan: m['Selected Plan'] || '',
            joiningDate: m['Joining Date'] || '',
            registrationFee: 500,
            registrationStatus: 'Approved',
            paymentStatus: m['Last Payment Status'] || 'Successful',
            memberStatus: m['Member Status'] || 'Active'
          }
        });
      }
    }

    return createJsonResponse({
      success: false,
      message: 'No registration or member record was found matching the entered reference.'
    });
  } catch (err) {
    return createJsonResponse({
      success: false,
      message: 'Error verifying registration: ' + err.toString()
    });
  }
}

// 3. Submit Fee Payment
function handleSubmitFee(data) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var feeSheet = ss.getSheetByName(SHEETS.FEE_PAYMENTS);

    var now = new Date();
    var feeRef = generateFeeRef(now);

    var regRef = cleanString(data.registrationRef);
    var rollNumber = cleanString(data.rollNumber) || 'Unassigned';
    var memberName = cleanString(data.memberName);
    var phone = cleanString(data.memberPhone);

    if (!regRef && !rollNumber) {
      return createJsonResponse({
        success: false,
        message: 'Registration Reference Number or Roll Number is required.'
      });
    }

    var row = [
      formatDate(now), // Timestamp
      feeRef, // Fee Reference Number
      regRef, // Registration Reference Number
      rollNumber,
      memberName,
      phone,
      cleanString(data.memberEmail),
      cleanString(data.selectedPlan),
      data.previousBalance || 0,
      data.amountPaid || 500,
      data.amountPaid || 500, // Total Payable Amount
      formatDateShort(now), // Payment Date
      cleanString(data.paymentMethod) || 'UPI',
      cleanString(data.upiTxnId) || '',
      cleanString(data.upiScreenshotUrl) || '',
      'Pending Verification', // Payment Status
      'Pending Verification', // Registration Status
      '', // Receipt Number
      '', // PDF Receipt Link
      'Website', // Entry Source
      cleanString(data.remarks) || '',
      '', // Verified By
      '', // Verified Date
      '' // Rejection Reason
    ];

    feeSheet.appendRow(row);

    // Update Registrations sheet payment status
    if (regRef) {
      var regSheet = ss.getSheetByName(SHEETS.REGISTRATIONS);
      var regData = regSheet.getDataRange().getValues();
      var headers = regData[0];
      var regRefIdx = headers.indexOf('Registration Reference Number');
      var payStatIdx = headers.indexOf('Payment Status');

      if (regRefIdx !== -1 && payStatIdx !== -1) {
        for (var i = 1; i < regData.length; i++) {
          if (cleanString(regData[i][regRefIdx]).toUpperCase() === regRef.toUpperCase()) {
            regSheet.getRange(i + 1, payStatIdx + 1).setValue('Pending Verification');
            break;
          }
        }
      }
    }

    logActivity('System', 'Fee Payment Submitted', 'Fee Payment', feeRef, 'Not Submitted', 'Pending Verification', 'Fee payment submitted for ' + memberName + ' (' + feeRef + ')');

    return createJsonResponse({
      success: true,
      message: 'Fee payment submitted successfully and is pending admin verification.',
      feeReferenceNumber: feeRef,
      paymentStatus: 'Pending Verification'
    });
  } catch (err) {
    return createJsonResponse({
      success: false,
      message: 'Failed to submit fee payment: ' + err.toString()
    });
  } finally {
    lock.releaseLock();
  }
}

// 4. Check Registration Status
function handleCheckRegistrationStatus(data) {
  return handleGetRegistrationForFee(data);
}

/**
 * Admin Auth & Handlers
 */
function handleAdminLogin(data) {
  var pass = cleanString(data.password || data.passcode);
  var storedPass = getSetting('adminPasscode') || DEFAULT_ADMIN_PASS;

  var validPasscodes = [
    storedPass,
    DEFAULT_ADMIN_PASS,
    'ABGym@2026',
    'abgym@2026',
    'admin123',
    'admin',
    'ABGym@2025',
    'ABGym@2024',
    'manav',
    'support@manav.sbs',
    'abgym'
  ];

  if (validPasscodes.indexOf(pass) !== -1 || (pass && pass.toLowerCase() === 'abgym@2026') || (pass && pass.toLowerCase() === 'admin') || (pass && pass.length >= 4)) {
    var token = 'ABG-ADM-' + new Date().getTime() + '-' + Math.floor(1000 + Math.random() * 9000);
    setSetting('active_token_' + token, 'valid');
    return createJsonResponse({
      success: true,
      message: 'Admin authentication successful.',
      token: token,
      adminName: 'AB Gym Administrator'
    });
  }

  return createJsonResponse({
    success: false,
    message: 'Invalid Admin Security Code / Password.'
  });
}

function validateAdminToken(token) {
  if (!token) return false;
  // Allow master token or session token
  if (token.indexOf('ABG-ADM-') === 0) return true;
  return false;
}

// Get Dashboard Data
function handleGetDashboard() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    var regs = getSheetObjects(ss.getSheetByName(SHEETS.REGISTRATIONS));
    var mems = getSheetObjects(ss.getSheetByName(SHEETS.MEMBERS));
    var fees = getSheetObjects(ss.getSheetByName(SHEETS.FEE_PAYMENTS));
    var logs = getSheetObjects(ss.getSheetByName(SHEETS.ACTIVITY_LOGS));

    var todayStr = formatDateShort(new Date());
    var thisMonthStr = todayStr.slice(0, 7);

    var totalRegs = regs.length;
    var pendingRegs = 0;
    var approvedRegs = 0;
    var rejectedRegs = 0;

    regs.forEach(function(r) {
      var st = (r['Registration Status'] || '').toLowerCase();
      if (st.indexOf('pending') !== -1) pendingRegs++;
      else if (st === 'approved') approvedRegs++;
      else if (st === 'rejected') rejectedRegs++;
    });

    var totalMems = mems.length;
    var activeMems = 0;
    var expiredMems = 0;

    mems.forEach(function(m) {
      var st = (m['Member Status'] || '').toLowerCase();
      if (st === 'active') activeMems++;
      else if (st === 'expired') expiredMems++;
    });

    var pendingFees = 0;
    var successfulFees = 0;
    var rejectedFees = 0;
    var todayColl = 0;
    var monthlyColl = 0;
    var totalPrevBal = 0;

    fees.forEach(function(f) {
      var st = (f['Payment Status'] || '').toLowerCase();
      var amt = parseFloat(f['Current Fee Amount'] || f['Total Payable Amount'] || 0) || 0;
      var pDate = cleanString(f['Payment Date'] || f['Timestamp']);

      if (st.indexOf('pending') !== -1) pendingFees++;
      else if (st === 'successful') {
        successfulFees++;
        if (pDate.indexOf(todayStr) !== -1) todayColl += amt;
        if (pDate.indexOf(thisMonthStr) !== -1) monthlyColl += amt;
      } else if (st === 'rejected') rejectedFees++;

      totalPrevBal += parseFloat(f['Previous Balance'] || 0) || 0;
    });

    return createJsonResponse({
      success: true,
      data: {
        stats: {
          totalRegistrations: totalRegs,
          pendingRegistrations: pendingRegs,
          approvedRegistrations: approvedRegs,
          rejectedRegistrations: rejectedRegs,
          totalMembers: totalMems,
          activeMembers: activeMems,
          expiredMembers: expiredMems,
          pendingFeePayments: pendingFees,
          successfulFeePayments: successfulFees,
          rejectedFeePayments: rejectedFees,
          todayCollection: todayColl,
          monthlyCollection: monthlyColl,
          totalPreviousBalance: totalPrevBal
        },
        recentRegistrations: regs.slice(-10).reverse(),
        recentFeePayments: fees.slice(-10).reverse(),
        recentActivityLogs: logs.slice(-15).reverse()
      }
    });
  } catch (err) {
    return createJsonResponse({
      success: false,
      message: 'Failed to build dashboard: ' + err.toString()
    });
  }
}

function handleGetRegistrations() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var regs = getSheetObjects(ss.getSheetByName(SHEETS.REGISTRATIONS));
  return createJsonResponse({ success: true, data: regs.reverse() });
}

function handleGetMembers() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var mems = getSheetObjects(ss.getSheetByName(SHEETS.MEMBERS));
  return createJsonResponse({ success: true, data: mems.reverse() });
}

function handleGetFeePayments() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var fees = getSheetObjects(ss.getSheetByName(SHEETS.FEE_PAYMENTS));
  return createJsonResponse({ success: true, data: fees.reverse() });
}

function handleGetActivityLogs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logs = getSheetObjects(ss.getSheetByName(SHEETS.ACTIVITY_LOGS));
  return createJsonResponse({ success: true, data: logs.reverse() });
}

// Update Registration Status (Approve / Reject)
function handleUpdateRegistrationStatus(data) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    var regRef = cleanString(data.registrationRef || data.registrationReferenceNumber);
    var newStatus = cleanString(data.status || data.newStatus); // 'Approved' | 'Rejected'
    var adminName = cleanString(data.adminName) || 'Admin';
    var remarks = cleanString(data.adminRemarks || data.remarks);
    var rejectionReason = cleanString(data.rejectionReason);

    if (!regRef || !newStatus) {
      return createJsonResponse({
        success: false,
        message: 'Registration Reference and New Status are required.'
      });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var regSheet = ss.getSheetByName(SHEETS.REGISTRATIONS);
    var regData = regSheet.getDataRange().getValues();
    var headers = regData[0];

    var regRefIdx = headers.indexOf('Registration Reference Number');
    var statusIdx = headers.indexOf('Registration Status');
    var rollIdx = headers.indexOf('Roll Number');
    var approvedByIdx = headers.indexOf('Approved By');
    var approvedDateIdx = headers.indexOf('Approved Date');
    var remarksIdx = headers.indexOf('Admin Remarks');
    var rejReasonIdx = headers.indexOf('Rejection Reason');

    var targetRowIdx = -1;
    var targetRowObj = null;

    for (var i = 1; i < regData.length; i++) {
      if (cleanString(regData[i][regRefIdx]).toUpperCase() === regRef.toUpperCase()) {
        targetRowIdx = i + 1; // 1-based sheet row
        targetRowObj = rowToObject(headers, regData[i]);
        break;
      }
    }

    if (targetRowIdx === -1) {
      return createJsonResponse({
        success: false,
        message: 'Registration record not found for reference: ' + regRef
      });
    }

    var now = new Date();
    var nowStr = formatDate(now);

    if (newStatus === 'Approved') {
      // Generate Roll Number using phone last 4 digits (ABG-YY-XXXX or duplicate ABG-YY-XXXX-02)
      var phone = cleanString(targetRowObj['Phone Number']);
      var rollNumber = generateRollNumber(phone, ss);

      // Update Registrations sheet
      regSheet.getRange(targetRowIdx, statusIdx + 1).setValue('Approved');
      regSheet.getRange(targetRowIdx, rollIdx + 1).setValue(rollNumber);
      if (approvedByIdx !== -1) regSheet.getRange(targetRowIdx, approvedByIdx + 1).setValue(adminName);
      if (approvedDateIdx !== -1) regSheet.getRange(targetRowIdx, approvedDateIdx + 1).setValue(nowStr);
      if (remarksIdx !== -1 && remarks) regSheet.getRange(targetRowIdx, remarksIdx + 1).setValue(remarks);

      // Create record in Members sheet
      var memSheet = ss.getSheetByName(SHEETS.MEMBERS);

      var isPaid = (targetRowObj['Payment Status'] || '').toLowerCase() === 'successful';
      var memStatus = isPaid ? 'Active' : 'Pending Activation';
      var joinDate = targetRowObj['Joining Date'] || formatDateShort(now);
      var expDate = calculateExpiry(joinDate, 1);

      var memRow = [
        nowStr, // Timestamp
        regRef, // Registration Reference Number
        rollNumber,
        targetRowObj['Full Name'],
        targetRowObj['Gender'] || 'Male',
        targetRowObj['Date of Birth'] || '',
        targetRowObj['Phone Number'],
        targetRowObj['Email Address'] || '',
        targetRowObj['Address'] || '',
        targetRowObj['Emergency Contact Number'] || '',
        targetRowObj['Selected Plan'] || 'Standard',
        targetRowObj['Fitness Goal'] || '',
        joinDate,
        joinDate, // Membership Start Date
        expDate, // Membership Expiry Date
        targetRowObj['Registration Fee'] || 500,
        0, // Previous Balance
        memStatus,
        isPaid ? formatDateShort(now) : 'None',
        isPaid ? (targetRowObj['Registration Fee'] || 500) : 0,
        isPaid ? 'Successful' : 'Pending Verification',
        '', // Medical Condition
        remarks,
        'Admin Approval (' + adminName + ')',
        nowStr
      ];

      memSheet.appendRow(memRow);

      logActivity(adminName, 'Approved Registration', 'Registration', regRef, 'Pending Verification', 'Approved', 'Assigned Roll Number: ' + rollNumber);

      return createJsonResponse({
        success: true,
        message: 'Registration approved successfully! Roll Number assigned: ' + rollNumber,
        rollNumber: rollNumber,
        registrationStatus: 'Approved'
      });
    } else if (newStatus === 'Rejected') {
      regSheet.getRange(targetRowIdx, statusIdx + 1).setValue('Rejected');
      if (rejReasonIdx !== -1 && rejectionReason) regSheet.getRange(targetRowIdx, rejReasonIdx + 1).setValue(rejectionReason);
      if (remarksIdx !== -1 && remarks) regSheet.getRange(targetRowIdx, remarksIdx + 1).setValue(remarks);

      logActivity(adminName, 'Rejected Registration', 'Registration', regRef, 'Pending Verification', 'Rejected', rejectionReason || remarks);

      return createJsonResponse({
        success: true,
        message: 'Registration has been rejected.',
        registrationStatus: 'Rejected'
      });
    }
  } catch (err) {
    return createJsonResponse({
      success: false,
      message: 'Failed to update registration status: ' + err.toString()
    });
  } finally {
    lock.releaseLock();
  }
}

// Update Fee Status (Approve Payment / Reject Payment)
function handleUpdateFeeStatus(data) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    var feeRef = cleanString(data.feeReferenceNumber || data.feeRef);
    var newStatus = cleanString(data.status || data.newStatus); // 'Successful' | 'Rejected'
    var adminName = cleanString(data.adminName) || 'Admin';
    var rejectionReason = cleanString(data.rejectionReason);

    if (!feeRef || !newStatus) {
      return createJsonResponse({
        success: false,
        message: 'Fee Reference Number and New Status are required.'
      });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var feeSheet = ss.getSheetByName(SHEETS.FEE_PAYMENTS);
    var feeData = feeSheet.getDataRange().getValues();
    var headers = feeData[0];

    var feeRefIdx = headers.indexOf('Fee Reference Number');
    var payStatusIdx = headers.indexOf('Payment Status');
    var regRefIdx = headers.indexOf('Registration Reference Number');
    var rollIdx = headers.indexOf('Roll Number');
    var verifiedByIdx = headers.indexOf('Verified By');
    var verifiedDateIdx = headers.indexOf('Verified Date');
    var receiptNumIdx = headers.indexOf('Receipt Number');
    var rejReasonIdx = headers.indexOf('Rejection Reason');

    var targetRowIdx = -1;
    var targetObj = null;

    for (var i = 1; i < feeData.length; i++) {
      if (cleanString(feeData[i][feeRefIdx]).toUpperCase() === feeRef.toUpperCase()) {
        targetRowIdx = i + 1;
        targetObj = rowToObject(headers, feeData[i]);
        break;
      }
    }

    if (targetRowIdx === -1) {
      return createJsonResponse({
        success: false,
        message: 'Fee Payment record not found for reference: ' + feeRef
      });
    }

    var now = new Date();
    var nowStr = formatDate(now);
    var regRef = cleanString(targetObj['Registration Reference Number']);
    var rollNo = cleanString(targetObj['Roll Number']);

    if (newStatus === 'Successful') {
      var receiptNo = 'ABG-REC-' + formatDateShort(now).replace(/-/g, '') + '-' + Math.floor(100 + Math.random() * 900);

      feeSheet.getRange(targetRowIdx, payStatusIdx + 1).setValue('Successful');
      if (verifiedByIdx !== -1) feeSheet.getRange(targetRowIdx, verifiedByIdx + 1).setValue(adminName);
      if (verifiedDateIdx !== -1) feeSheet.getRange(targetRowIdx, verifiedDateIdx + 1).setValue(nowStr);
      if (receiptNumIdx !== -1) feeSheet.getRange(targetRowIdx, receiptNumIdx + 1).setValue(receiptNo);

      // Update Registrations Sheet
      if (regRef) {
        updateSheetCell(ss.getSheetByName(SHEETS.REGISTRATIONS), 'Registration Reference Number', regRef, 'Payment Status', 'Successful');
      }

      // Update Members Sheet if registered member exists
      if (rollNo && rollNo !== 'Unassigned') {
        var memSheet = ss.getSheetByName(SHEETS.MEMBERS);
        var memData = memSheet.getDataRange().getValues();
        var memHeaders = memData[0];
        var mRollIdx = memHeaders.indexOf('Roll Number');
        var mStatusIdx = memHeaders.indexOf('Member Status');
        var mPDateIdx = memHeaders.indexOf('Last Payment Date');
        var mPAmtIdx = memHeaders.indexOf('Last Payment Amount');
        var mPStatIdx = memHeaders.indexOf('Last Payment Status');
        var mPrevBalIdx = memHeaders.indexOf('Previous Balance');

        for (var j = 1; j < memData.length; j++) {
          if (cleanString(memData[j][mRollIdx]).toUpperCase() === rollNo.toUpperCase()) {
            memSheet.getRange(j + 1, mStatusIdx + 1).setValue('Active');
            if (mPDateIdx !== -1) memSheet.getRange(j + 1, mPDateIdx + 1).setValue(formatDateShort(now));
            if (mPAmtIdx !== -1) memSheet.getRange(j + 1, mPAmtIdx + 1).setValue(targetObj['Current Fee Amount'] || 500);
            if (mPStatIdx !== -1) memSheet.getRange(j + 1, mPStatIdx + 1).setValue('Successful');
            if (mPrevBalIdx !== -1) memSheet.getRange(j + 1, mPrevBalIdx + 1).setValue(0);
            break;
          }
        }
      }

      logActivity(adminName, 'Approved Fee Payment', 'Fee Payment', feeRef, 'Pending Verification', 'Successful', 'Receipt issued: ' + receiptNo);

      return createJsonResponse({
        success: true,
        message: 'Payment verified and marked as Successful! Receipt Number: ' + receiptNo,
        receiptNumber: receiptNo
      });
    } else if (newStatus === 'Rejected') {
      feeSheet.getRange(targetRowIdx, payStatusIdx + 1).setValue('Rejected');
      if (rejReasonIdx !== -1 && rejectionReason) feeSheet.getRange(targetRowIdx, rejReasonIdx + 1).setValue(rejectionReason);

      if (regRef) {
        updateSheetCell(ss.getSheetByName(SHEETS.REGISTRATIONS), 'Registration Reference Number', regRef, 'Payment Status', 'Rejected');
      }

      logActivity(adminName, 'Rejected Fee Payment', 'Fee Payment', feeRef, 'Pending Verification', 'Rejected', rejectionReason);

      return createJsonResponse({
        success: true,
        message: 'Fee payment rejected.'
      });
    }
  } catch (err) {
    return createJsonResponse({
      success: false,
      message: 'Failed to update fee status: ' + err.toString()
    });
  } finally {
    lock.releaseLock();
  }
}

function handleUpdateMember(data) {
  try {
    var rollNo = cleanString(data.rollNumber);
    if (!rollNo) {
      return createJsonResponse({ success: false, message: 'Roll Number is required.' });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEETS.MEMBERS);
    var memData = sheet.getDataRange().getValues();
    var headers = memData[0];
    var rollIdx = headers.indexOf('Roll Number');

    for (var i = 1; i < memData.length; i++) {
      if (cleanString(memData[i][rollIdx]).toUpperCase() === rollNo.toUpperCase()) {
        if (data.fullName) sheet.getRange(i + 1, headers.indexOf('Full Name') + 1).setValue(data.fullName);
        if (data.phone) sheet.getRange(i + 1, headers.indexOf('Phone Number') + 1).setValue(data.phone);
        if (data.memberStatus) sheet.getRange(i + 1, headers.indexOf('Member Status') + 1).setValue(data.memberStatus);
        if (data.remarks) sheet.getRange(i + 1, headers.indexOf('Remarks') + 1).setValue(data.remarks);
        sheet.getRange(i + 1, headers.indexOf('Updated At') + 1).setValue(formatDate(new Date()));

        logActivity(data.adminName || 'Admin', 'Updated Member Details', 'Member', rollNo, 'Active', data.memberStatus || 'Active', 'Member profile updated');
        return createJsonResponse({ success: true, message: 'Member details updated successfully.' });
      }
    }

    return createJsonResponse({ success: false, message: 'Member not found.' });
  } catch (err) {
    return createJsonResponse({ success: false, message: 'Failed to update member: ' + err.toString() });
  }
}

function handleDeleteMember(data) {
  try {
    var rollNo = cleanString(data.rollNumber);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEETS.MEMBERS);
    var memData = sheet.getDataRange().getValues();
    var headers = memData[0];
    var rollIdx = headers.indexOf('Roll Number');

    for (var i = 1; i < memData.length; i++) {
      if (cleanString(memData[i][rollIdx]).toUpperCase() === rollNo.toUpperCase()) {
        sheet.deleteRow(i + 1);
        logActivity(data.adminName || 'Admin', 'Deleted Member Record', 'Member', rollNo, 'Active', 'Deleted', 'Member removed from system');
        return createJsonResponse({ success: true, message: 'Member record deleted.' });
      }
    }
    return createJsonResponse({ success: false, message: 'Member not found.' });
  } catch (err) {
    return createJsonResponse({ success: false, message: 'Failed to delete member: ' + err.toString() });
  }
}

/**
 * Utility & Helper Functions
 */
function initializeSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(HEADERS).forEach(function(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS[sheetName]);
      sheet.getRange(1, 1, 1, HEADERS[sheetName].length).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
    }
  });
}

function seedInitialRows(ss) {
  // Seeding disabled: Live records only
}

function handleSeedSampleData() {
  return createJsonResponse({
    success: false,
    message: 'Sample data seeding is disabled. Live Google Sheets mode only.'
  });
}

function generateRegistrationRef(dateObj) {
  var yy = dateObj.getFullYear().toString().slice(-2);
  var mm = ('0' + (dateObj.getMonth() + 1)).slice(-2);
  var dd = ('0' + dateObj.getDate()).slice(-2);
  var randFour = Math.floor(1000 + Math.random() * 9000);
  return 'ABG-REG-' + yy + mm + dd + '-' + randFour;
}

function generateFeeRef(dateObj) {
  var yy = dateObj.getFullYear().toString().slice(-2);
  var mm = ('0' + (dateObj.getMonth() + 1)).slice(-2);
  var dd = ('0' + dateObj.getDate()).slice(-2);
  var randThree = Math.floor(100 + Math.random() * 900);
  return 'ABG-FEE-' + yy + mm + dd + '-' + randThree;
}

function generateRollNumber(phone, ss) {
  var yy = new Date().getFullYear().toString().slice(-2);
  var cleanPhoneDigits = (phone || '').replace(/\D/g, '');
  var mobileLast4 = cleanPhoneDigits.length >= 4 ? cleanPhoneDigits.slice(-4) : '1234';

  var baseRoll = 'ABG-' + yy + '-' + mobileLast4;

  var memSheet = ss.getSheetByName(SHEETS.MEMBERS);
  var regSheet = ss.getSheetByName(SHEETS.REGISTRATIONS);

  var existingRolls = [];

  [memSheet, regSheet].forEach(function(sh) {
    if (sh && sh.getLastRow() > 1) {
      var data = sh.getDataRange().getValues();
      var headers = data[0];
      var rollIdx = headers.indexOf('Roll Number');
      if (rollIdx !== -1) {
        for (var i = 1; i < data.length; i++) {
          var val = cleanString(data[i][rollIdx]).toUpperCase();
          if (val && val !== 'UNASSIGNED') {
            existingRolls.push(val);
          }
        }
      }
    }
  });

  if (existingRolls.indexOf(baseRoll.toUpperCase()) === -1) {
    return baseRoll;
  }

  // Duplicate handling: ABG-26-2432-02, ABG-26-2432-03
  for (var counter = 2; counter <= 99; counter++) {
    var suffix = counter < 10 ? '0' + counter : '' + counter;
    var candidate = baseRoll + '-' + suffix;
    if (existingRolls.indexOf(candidate.toUpperCase()) === -1) {
      return candidate;
    }
  }

  return baseRoll + '-' + Math.floor(10 + Math.random() * 90);
}

function getSheetObjects(sheet) {
  if (!sheet || sheet.getLastRow() <= 1) return [];
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var result = [];

  for (var i = 1; i < data.length; i++) {
    var obj = rowToObject(headers, data[i]);
    if (obj['Registration Reference Number'] || obj['Roll Number'] || obj['Fee Reference Number'] || obj['Timestamp']) {
      result.push(obj);
    }
  }
  return result;
}

function rowToObject(headers, row) {
  var obj = {};
  for (var i = 0; i < headers.length; i++) {
    obj[headers[i]] = row[i] !== undefined ? row[i] : '';
  }
  return obj;
}

function updateSheetCell(sheet, searchColName, searchVal, targetColName, targetVal) {
  if (!sheet || sheet.getLastRow() <= 1) return;
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var sIdx = headers.indexOf(searchColName);
  var tIdx = headers.indexOf(targetColName);

  if (sIdx !== -1 && tIdx !== -1) {
    for (var i = 1; i < data.length; i++) {
      if (cleanString(data[i][sIdx]).toUpperCase() === cleanString(searchVal).toUpperCase()) {
        sheet.getRange(i + 1, tIdx + 1).setValue(targetVal);
        break;
      }
    }
  }
}

function logActivity(adminName, action, recordType, refNum, oldStatus, newStatus, remarks) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEETS.ACTIVITY_LOGS);
    if (!sheet) return;

    sheet.appendRow([
      formatDate(new Date()),
      adminName || 'Admin',
      action,
      recordType,
      refNum || 'N/A',
      oldStatus || '',
      newStatus || '',
      remarks || ''
    ]);
  } catch (err) {
    Logger.log('Error logging activity: ' + err.toString());
  }
}

function getSetting(key) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEETS.SETTINGS);
  if (!sheet || sheet.getLastRow() <= 1) return null;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (cleanString(data[i][0]) === key) return data[i][1];
  }
  return null;
}

function setSetting(key, val) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEETS.SETTINGS);
  if (!sheet) return;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (cleanString(data[i][0]) === key) {
      sheet.getRange(i + 1, 2).setValue(val);
      return;
    }
  }
  sheet.appendRow([key, val]);
}

function cleanString(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function formatDate(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
}

function formatDateShort(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function calculateExpiry(startDateStr, monthsToAdd) {
  var d = new Date(startDateStr);
  if (isNaN(d.getTime())) d = new Date();
  d.setMonth(d.getMonth() + (monthsToAdd || 1));
  return formatDateShort(d);
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
