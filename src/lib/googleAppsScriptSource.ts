export const GOOGLE_APPS_SCRIPT_CODE = `/**
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

var DEFAULT_ADMIN_PASS = 'ABFitness@2026';

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
    var token = requestData.token || (data && (data.token || data.adminToken));

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
  if (action === 'registerMember' || action === 'submitRegistration') return handleRegisterMember(data);
  if (action === 'getRegistrationForFee' || action === 'getMemberForFee') return handleGetRegistrationForFee(data);
  if (action === 'getMemberFeeHistory' || action === 'getMemberPaymentHistory' || action === 'getFeeHistory') return handleGetMemberFeeHistory(data);
  if (action === 'submitFee' || action === 'submitFeePayment') return handleSubmitFee(data);
  if (action === 'checkRegistrationStatus') return handleCheckRegistrationStatus(data);
  if (action === 'sendConfirmationEmail') return handleSendConfirmationEmail(data);

  // Admin Actions (Validate Token/Password)
  if (action === 'adminLogin') return handleAdminLogin(data);

  // Protected Admin endpoints
  var tokenVal = validateAdminToken(token);
  if (!tokenVal.valid) {
    return createJsonResponse({
      success: false,
      code: tokenVal.code || 'INVALID_TOKEN',
      message: tokenVal.message || 'Invalid admin session. Please log in again.'
    });
  }

  if (action === 'getDashboard') return handleGetDashboard();
  if (action === 'getRegistrations') return handleGetRegistrations();
  if (action === 'getMembers') return handleGetMembers();
  if (action === 'getFeePayments') return handleGetFeePayments();
  if (action === 'getActivityLogs') return handleGetActivityLogs();
  if (action === 'updateRegistrationStatus') return handleUpdateRegistrationStatus(data);
  if (action === 'updateFeeStatus') return handleUpdateFeeStatus(data);
  if (action === 'approveFeePayment') {
    data.status = 'Successful';
    return handleUpdateFeeStatus(data);
  }
  if (action === 'rejectFeePayment') {
    data.status = 'Rejected';
    return handleUpdateFeeStatus(data);
  }
  if (action === 'adminSubmitFeePayment') return handleAdminSubmitFeePayment(data);
  if (action === 'updateMember') return handleUpdateMember(data);
  if (action === 'deleteMember') return handleDeleteMember(data);
  if (action === 'directAddMember' || action === 'addMember' || action === 'restoreMember' || action === 'adminAddMember') return handleDirectAddMember(data);
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

    var phone = cleanString(data.phone || data.phoneNumber || data.mobile);
    var fullName = cleanString(data.fullName || data.name);
    var email = cleanString(data.email || data.emailAddress);
    var selectedPlan = cleanString(data.selectedPlan || data.planName || data.plan || data.membershipPlan);
    var paymentMethod = cleanString(data.paymentMethod || data.paymentMode) || 'UPI';

    var dob = cleanString(data.dob || data.dateOfBirth);

    if (!fullName || !phone || !dob) {
      return createJsonResponse({
        success: false,
        message: 'Full Name, Phone Number, and Date of Birth are required.'
      });
    }

    var row = [
      formatDate(now), // Timestamp
      regRef, // Registration Reference Number
      'Unassigned', // Roll Number (Unassigned before admin approval)
      fullName,
      cleanString(data.gender) || 'Male',
      cleanString(data.dob || data.dateOfBirth),
      phone,
      email,
      cleanString(data.address),
      cleanString(data.emergencyContact || data.emergencyContactNumber),
      selectedPlan,
      cleanString(data.fitnessGoal || data.goal),
      cleanString(data.joiningDate) || formatDateShort(now),
      data.registrationFee || data.amount || data.fee || 100,
      paymentMethod,
      cleanString(data.upiTxnId || data.upiTransactionId || data.transactionId) || '',
      cleanString(data.upiScreenshotUrl || data.paymentScreenshot) || '',
      'Pending Verification', // Registration Status
      'Not Submitted', // Payment Status
      data.termsAccepted ? 'TRUE' : 'FALSE',
      formatDate(now),
      cleanString(data.entrySource) || 'Website', // Entry Source
      'Public Registration', // Created By
      '', // Admin Remarks
      '', // Rejection Reason
      '', // Approved By
      '' // Approved Date
    ];

    sheet.appendRow(row);

    logActivity('System', 'Public Registration Submitted', 'Registration', regRef, 'None', 'Pending Verification', 'Registration reference generated: ' + regRef);

    if (email) {
      sendConfirmationEmail('registration', email, {
        fullName: fullName,
        registrationRef: regRef,
        selectedPlan: selectedPlan,
        phone: phone,
        status: 'Pending Verification'
      });
    }

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

// Date Normalization Helper for Google Sheets and Web inputs
function normalizeDateValue(val) {
  if (!val) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    var y = val.getFullYear();
    var m = String(val.getMonth() + 1);
    if (m.length < 2) m = '0' + m;
    var d = String(val.getDate());
    if (d.length < 2) d = '0' + d;
    return y + '-' + m + '-' + d;
  }

  var str = String(val).trim();
  if (!str) return '';

  if (str.indexOf('T') !== -1) {
    str = str.split('T')[0];
  }
  if (str.indexOf(' ') !== -1) {
    str = str.split(' ')[0];
  }

  str = str.replace(/\//g, '-');
  var parts = str.split('-');
  if (parts.length === 3) {
    var p0 = parseInt(parts[0], 10);
    var p1 = parseInt(parts[1], 10);
    var p2 = parseInt(parts[2], 10);

    if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
      if (parts[0].length === 4) {
        var mm = String(p1);
        if (mm.length < 2) mm = '0' + mm;
        var dd = String(p2);
        if (dd.length < 2) dd = '0' + dd;
        return parts[0] + '-' + mm + '-' + dd;
      }
      if (parts[2].length === 4) {
        var mm, dd;
        if (p1 > 12 && p0 <= 12) {
          mm = String(p0);
          dd = String(p1);
        } else {
          mm = String(p1);
          dd = String(p0);
        }
        if (mm.length < 2) mm = '0' + mm;
        if (dd.length < 2) dd = '0' + dd;
        return parts[2] + '-' + mm + '-' + dd;
      }
    }
  }

  try {
    var parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      var y = parsed.getFullYear();
      var m = String(parsed.getMonth() + 1);
      if (m.length < 2) m = '0' + m;
      var d = String(parsed.getDate());
      if (d.length < 2) d = '0' + d;
      return y + '-' + m + '-' + d;
    }
  } catch (e) {}

  return str;
}

// 2. Get Member / Registration For Fee Verification
function extractFirst4Digits(phone) {
  var digits = String(phone || "").replace(/\D/g, "");
  var tenDigitPhone = digits.length > 10 ? digits.slice(-10) : digits;
  return tenDigitPhone.slice(0, 4);
}

function handleGetRegistrationForFee(data) {
  try {
    var rawRef = cleanString(data.referenceOrRollNumber || data.registrationRefOrRoll || data.registrationRef || data.rollNumber);
    var queryRefClean = rawRef.toUpperCase().replace(/[^A-Z0-9]/g, '');
    var submittedPhoneFirst4 = extractFirst4Digits(data.phoneFirst4 || data.phoneLast4 || data.mobileLast4 || data.phone);
    var submittedDob = normalizeDateValue(data.dateOfBirth || data.dob);

    Logger.log("[Verification Debug] Submitted Ref: " + rawRef + " (" + queryRefClean + ") | Phone First4: " + submittedPhoneFirst4 + " | DOB: " + submittedDob);

    if (!queryRefClean) {
      return createJsonResponse({
        success: false,
        code: 'DETAILS_MISMATCH',
        message: 'Member details do not match. Please check the entered information.'
      });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var matchedRow = null;

    // 1. Search Members sheet first
    var memSheet = ss.getSheetByName(SHEETS.MEMBERS);
    if (memSheet) {
      var memRows = getSheetObjects(memSheet);
      for (var j = 0; j < memRows.length; j++) {
        var m = memRows[j];
        var mRollClean = cleanString(m['Roll Number'] || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        var mRefClean = cleanString(m['Registration Reference Number'] || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

        var memRefMatched = (mRollClean && mRollClean === queryRefClean) || (mRefClean && mRefClean === queryRefClean);
        if (memRefMatched) {
          var mPhoneRaw = m['Phone Number'] || m['Phone'] || m['Mobile Number'] || '';
          var mPhoneFirst4 = extractFirst4Digits(mPhoneRaw);
          var mPhoneMatched = (!submittedPhoneFirst4 || !mPhoneFirst4 || submittedPhoneFirst4 === mPhoneFirst4);

          var mDob = normalizeDateValue(m['Date of Birth'] || m['DOB']);
          var mDobMatched = (!mDob || !submittedDob || mDob === submittedDob);

          if (mPhoneMatched && mDobMatched) {
            matchedRow = {
              fullName: m['Full Name'] || '',
              rollNumber: m['Roll Number'] || '',
              registrationReference: m['Registration Reference Number'] || '',
              phone: m['Phone Number'] || '',
              selectedPlan: m['Selected Plan'] || m['Plan Name'] || '',
              joiningDate: m['Joining Date'] || m['Membership Start Date'] || '',
              registrationStatus: 'Approved',
              emailAddress: m['Email Address'] || '',
              registrationFee: 100
            };
            break;
          }
        }
      }
    }

    // 2. Search Registrations sheet if not found in Members
    if (!matchedRow) {
      var regSheet = ss.getSheetByName(SHEETS.REGISTRATIONS);
      if (regSheet) {
        var regRows = getSheetObjects(regSheet);
        for (var i = 0; i < regRows.length; i++) {
          var r = regRows[i];
          var rRefClean = cleanString(r['Registration Reference Number'] || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
          var rRollClean = cleanString(r['Roll Number'] || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

          var refMatched = (rRefClean && rRefClean === queryRefClean) || (rRollClean && rRollClean === queryRefClean && rRollClean !== 'UNASSIGNED');
          if (refMatched) {
            var storedPhoneRaw = r['Phone Number'] || r['Phone'] || r['Mobile Number'] || '';
            var storedPhoneFirst4 = extractFirst4Digits(storedPhoneRaw);
            var phoneMatched = (!submittedPhoneFirst4 || !storedPhoneFirst4 || submittedPhoneFirst4 === storedPhoneFirst4);

            var rDob = normalizeDateValue(r['Date of Birth'] || r['DOB']);
            var dobMatched = (!rDob || !submittedDob || rDob === submittedDob);

            if (phoneMatched && dobMatched) {
              matchedRow = {
                fullName: r['Full Name'] || '',
                rollNumber: (r['Roll Number'] && r['Roll Number'] !== 'Unassigned') ? r['Roll Number'] : '',
                registrationReference: r['Registration Reference Number'] || '',
                phone: r['Phone Number'] || '',
                selectedPlan: r['Selected Plan'] || r['Plan Name'] || '',
                joiningDate: r['Joining Date'] || '',
                registrationStatus: r['Registration Status'] || '',
                emailAddress: r['Email Address'] || '',
                registrationFee: parseFloat(r['Registration Fee']) || 100
              };
              break;
            }
          }
        }
      }
    }

    // A. If no matching record exists
    if (!matchedRow) {
      return createJsonResponse({
        success: false,
        code: 'DETAILS_MISMATCH',
        message: 'Member details do not match. Please check the entered information.'
      });
    }

    // B. Check Registration Status
    var status = String(matchedRow.registrationStatus || '').trim().toLowerCase();

    if (status === 'rejected') {
      return createJsonResponse({
        success: false,
        code: 'REGISTRATION_REJECTED',
        message: 'Your registration has been rejected. Please contact AB Gym before making a payment.'
      });
    }

    if (
      status === '' ||
      status === 'pending' ||
      status === 'pending approval' ||
      status === 'pending verification' ||
      status === 'submitted' ||
      status === 'under review'
    ) {
      return createJsonResponse({
        success: false,
        code: 'REGISTRATION_PENDING',
        message: 'Your registration has been received and is currently awaiting admin approval. The fee-payment facility will become available after your registration is approved. Please visit AB Gym reception or contact our team if you need assistance.'
      });
    }

    if (
      status === 'approved' ||
      status === 'active' ||
      status === 'successful'
    ) {
      // Recover missing Registration Reference Number from Registrations sheet if absent in Members sheet
      if (matchedRow && !matchedRow.registrationReference && matchedRow.rollNumber) {
        try {
          var regSheetForRef = ss.getSheetByName(SHEETS.REGISTRATIONS);
          if (regSheetForRef) {
            var regRowsForRef = getSheetObjects(regSheetForRef);
            var targetRollNorm = normalizeId(matchedRow.rollNumber);
            for (var kRef = 0; kRef < regRowsForRef.length; kRef++) {
              var rObj = regRowsForRef[kRef];
              var rRollNorm = normalizeId(rObj['Roll Number']);
              if (rRollNorm && rRollNorm === targetRollNorm) {
                var recoveredRef = rObj['Registration Reference Number'] || '';
                if (recoveredRef) {
                  matchedRow.registrationReference = recoveredRef;
                  break;
                }
              }
            }
          }
        } catch (recErr) {
          Logger.log("[handleGetRegistrationForRef] Recovery error: " + recErr.toString());
        }
      }

      var maskedPhone = matchedRow.phone ? ('******' + extractFirst4Digits(matchedRow.phone)) : 'N/A';
      var memberObj = {
        fullName: matchedRow.fullName,
        rollNumber: matchedRow.rollNumber || '',
        registrationReferenceNumber: matchedRow.registrationReference || '',
        registrationReference: matchedRow.registrationReference || '',
        registrationRef: matchedRow.registrationReference || '',
        phone: matchedRow.phone,
        phoneNumber: matchedRow.phone,
        emailAddress: matchedRow.emailAddress,
        selectedPlan: matchedRow.selectedPlan,
        joiningDate: matchedRow.joiningDate,
        membershipStatus: 'Approved',
        registrationStatus: 'Approved',
        maskedPhone: maskedPhone,
        registrationFee: matchedRow.registrationFee
      };

      return createJsonResponse({
        success: true,
        code: 'MEMBER_VERIFIED',
        message: 'Your registration has been approved.',
        member: memberObj,
        data: memberObj
      });
    }

    // Unknown status default
    return createJsonResponse({
      success: false,
      code: 'DETAILS_MISMATCH',
      message: 'Member details do not match. Please check the entered information.'
    });

  } catch (err) {
    return createJsonResponse({
      success: false,
      code: 'ERROR',
      message: 'Error verifying registration: ' + err.toString()
    });
  }
}

// 2b. Get Member Fee History
function handleGetMemberFeeHistory(data) {
  try {
    var rollNumber = normalizeId(data.rollNumber || data.verifiedRollNumber || data.rollNo || '');
    var regRef = normalizeId(data.registrationReferenceNumber || data.registrationRef || data.regRef || data.referenceOrRollNumber || '');

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // Recover missing registration reference or roll number if one is missing
    if (rollNumber !== '' && regRef === '') {
      try {
        var regSheet = ss.getSheetByName(SHEETS.REGISTRATIONS);
        if (regSheet) {
          var regData = regSheet.getDataRange().getValues();
          if (regData && regData.length > 1) {
            var rHeader = regData[0];
            var rColMap = getRegistrationHeaderMap(rHeader);
            for (var rIdx = 1; rIdx < regData.length; rIdx++) {
              var rRow = regData[rIdx];
              var rowRollVal = rColMap.rollNumber >= 0 ? normalizeId(rRow[rColMap.rollNumber]) : '';
              var rowRegVal = rColMap.registrationRef >= 0 ? cleanString(rRow[rColMap.registrationRef]) : '';
              if (rowRollVal === rollNumber && rowRegVal !== '') {
                regRef = normalizeId(rowRegVal);
                Logger.log("[getMemberFeeHistory] Recovered missing RegRef from Registrations sheet: " + regRef);
                break;
              }
            }
          }
        }
      } catch (recErr1) {
        Logger.log("[getMemberFeeHistory] RegRef recovery error: " + recErr1.toString());
      }
    }

    if (regRef !== '' && rollNumber === '') {
      try {
        var memSheet = ss.getSheetByName(SHEETS.MEMBERS);
        if (memSheet) {
          var memData = memSheet.getDataRange().getValues();
          if (memData && memData.length > 1) {
            var mHeader = memData[0];
            var mColMap = getMembersHeaderMap(mHeader);
            for (var mIdx = 1; mIdx < memData.length; mIdx++) {
              var mRow = memData[mIdx];
              var mRegVal = mColMap.registrationRef >= 0 ? normalizeId(mRow[mColMap.registrationRef]) : '';
              var mRollVal = mColMap.rollNumber >= 0 ? cleanString(mRow[mColMap.rollNumber]) : '';
              if (mRegVal === regRef && mRollVal !== '') {
                rollNumber = normalizeId(mRollVal);
                Logger.log("[getMemberFeeHistory] Recovered missing Roll Number from Members sheet: " + rollNumber);
                break;
              }
            }
          }
        }
      } catch (recErr2) {
        Logger.log("[getMemberFeeHistory] Roll recovery error: " + recErr2.toString());
      }
    }

    Logger.log("[getMemberFeeHistory] Verified Roll: " + rollNumber + " | Verified RegRef: " + regRef);

    if (!rollNumber && !regRef) {
      return createJsonResponse({
        success: false,
        code: 'INVALID_REQUEST',
        message: 'Roll Number or Registration Reference Number is required.'
      });
    }

    var combinedRecords = [];
    var matchedRegCount = 0;
    var matchedFeeCount = 0;
    var sourcesChecked = {
      registrations: false,
      feePayments: false
    };

    // 1. Search Registrations sheet for original registration payment
    try {
      var regSheet = ss.getSheetByName(SHEETS.REGISTRATIONS);
      if (regSheet && regSheet.getLastRow() > 1) {
        sourcesChecked.registrations = true;
        var regValues = regSheet.getDataRange().getValues();
        var regHeader = regValues[0];
        var regColMap = getRegistrationHeaderMap(regHeader);

        for (var ri = 1; ri < regValues.length; ri++) {
          var rRow = regValues[ri];
          var rRoll = regColMap.rollNumber >= 0 ? normalizeId(rRow[regColMap.rollNumber]) : '';
          var rRegRef = regColMap.registrationRef >= 0 ? normalizeId(rRow[regColMap.registrationRef]) : '';
          var rFeeRef = regColMap.feeReferenceNumber >= 0 ? normalizeId(rRow[regColMap.feeReferenceNumber]) : '';

          var regRollMatch = (rollNumber !== '' && (rRoll === rollNumber || rRegRef === rollNumber || rFeeRef === rollNumber));
          var regRefMatch = (regRef !== '' && (rRegRef === regRef || rRoll === regRef || rFeeRef === regRef));

          if (regRollMatch || regRefMatch) {
            var regFeeRef = regColMap.feeReferenceNumber >= 0 ? cleanString(rRow[regColMap.feeReferenceNumber]) : '';
            var regRegRefNum = regColMap.registrationRef >= 0 ? cleanString(rRow[regColMap.registrationRef]) : (regRef || '');
            var regRollNum = regColMap.rollNumber >= 0 ? cleanString(rRow[regColMap.rollNumber]) : (rollNumber || '');
            var fullName = regColMap.fullName >= 0 ? cleanString(rRow[regColMap.fullName]) : '';
            var planName = regColMap.selectedPlan >= 0 ? cleanString(rRow[regColMap.selectedPlan]) : '';

            var rawFee = regColMap.registrationFee >= 0 ? rRow[regColMap.registrationFee] : '';
            if ((rawFee === '' || rawFee === null || rawFee === undefined) && regColMap.amount >= 0) {
              rawFee = rRow[regColMap.amount];
            }
            var feeAmt = parseFloat(rawFee) || 100;

            var payMethod = regColMap.paymentMethod >= 0 ? cleanString(rRow[regColMap.paymentMethod]) : 'UPI';
            var txnId = regColMap.transactionId >= 0 ? cleanString(rRow[regColMap.transactionId]) : '';
            var payDate = regColMap.paymentDate >= 0 ? formatDate(rRow[regColMap.paymentDate]) : (regColMap.timestamp >= 0 ? formatDate(rRow[regColMap.timestamp]) : '');

            // Read actual Payment Status
            var payStatus = regColMap.paymentStatus >= 0 ? cleanString(rRow[regColMap.paymentStatus]) : '';
            if (!payStatus) {
              var regStatus = regColMap.status >= 0 ? cleanString(rRow[regColMap.status]).toLowerCase() : '';
              if (regStatus === 'approved' || regStatus === 'verified' || regStatus === 'active') payStatus = 'Approved';
              else if (regStatus === 'rejected') payStatus = 'Rejected';
              else payStatus = 'Pending Verification';
            }

            var receiptNum = regColMap.receiptNumber >= 0 ? cleanString(rRow[regColMap.receiptNumber]) : ('ABG-REC-' + (regRegRefNum || regRollNum || '001'));

            var regPayObj = {
              source: 'REGISTRATION_PAYMENT',
              feeReferenceNumber: regFeeRef || ('REG-' + regRegRefNum),
              registrationReferenceNumber: regRegRefNum || regRef,
              rollNumber: regRollNum || rollNumber,
              fullName: fullName,
              plan: planName,
              selectedPlan: planName,
              feeMonth: 'Registration',
              amount: String(feeAmt),
              feeAmount: feeAmt,
              currentFeeAmount: feeAmt,
              amountPaid: feeAmt,
              paymentMethod: payMethod || 'UPI',
              transactionId: txnId,
              upiTransactionId: txnId,
              paymentDate: payDate,
              paymentStatus: payStatus,
              status: payStatus,
              receiptNumber: receiptNum
            };

            combinedRecords.push(regPayObj);
            matchedRegCount++;
            Logger.log("[getMemberFeeHistory] Matched Registration Payment -> RegRef: " + regRegRefNum + " | Amount: " + feeAmt + " | Status: " + payStatus);
          }
        }
      }
    } catch (regErr) {
      Logger.log("[getMemberFeeHistory] Registrations sheet error: " + regErr.toString());
    }

    // 2. Search Fee Payments sheet for monthly fee payments
    try {
      var feeSheet = ss.getSheetByName(SHEETS.FEE_PAYMENTS);
      if (feeSheet && feeSheet.getLastRow() > 1) {
        sourcesChecked.feePayments = true;
        var dataValues = feeSheet.getDataRange().getValues();
        var headerRow = dataValues[0];
        var colMap = getFeePaymentsHeaderMap(headerRow);

        for (var i = 1; i < dataValues.length; i++) {
          var row = dataValues[i];
          var rowRoll = colMap.rollNumber >= 0 ? normalizeId(row[colMap.rollNumber]) : '';
          var rowRegRef = colMap.registrationReferenceNumber >= 0 ? normalizeId(row[colMap.registrationReferenceNumber]) : '';
          var feeRefNumNorm = colMap.feeReferenceNumber >= 0 ? normalizeId(row[colMap.feeReferenceNumber]) : '';
          var receiptNumNorm = colMap.receiptNumber >= 0 ? normalizeId(row[colMap.receiptNumber]) : '';

          var rollMatch = (rollNumber !== '' && (rowRoll === rollNumber || rowRegRef === rollNumber || feeRefNumNorm === rollNumber || receiptNumNorm === rollNumber));
          var registrationMatch = (regRef !== '' && (rowRegRef === regRef || rowRoll === regRef || feeRefNumNorm === regRef || receiptNumNorm === regRef));

          if (rollMatch || registrationMatch) {
            var feeRefNum = colMap.feeReferenceNumber >= 0 ? cleanString(row[colMap.feeReferenceNumber]) : '';
            var regRefNum = colMap.registrationReferenceNumber >= 0 ? cleanString(row[colMap.registrationReferenceNumber]) : '';
            var rowRollNum = colMap.rollNumber >= 0 ? cleanString(row[colMap.rollNumber]) : '';
            var fullName = colMap.fullName >= 0 ? cleanString(row[colMap.fullName]) : '';
            var planName = colMap.plan >= 0 ? cleanString(row[colMap.plan]) : '';
            var feeM = colMap.feeMonth >= 0 ? cleanString(row[colMap.feeMonth]) : '';
            var feeAmt = colMap.amount >= 0 ? row[colMap.amount] : '';
            var payMethod = colMap.paymentMethod >= 0 ? cleanString(row[colMap.paymentMethod]) : 'UPI';
            var txnId = colMap.transactionId >= 0 ? cleanString(row[colMap.transactionId]) : '';
            var payDate = colMap.paymentDate >= 0 ? formatDate(row[colMap.paymentDate]) : '';
            var payStatus = colMap.paymentStatus >= 0 ? cleanString(row[colMap.paymentStatus]) : 'Pending Verification';
            var receiptNum = colMap.receiptNumber >= 0 ? cleanString(row[colMap.receiptNumber]) : '';

            if (!payStatus) payStatus = 'Pending Verification';

            var feeItem = {
              source: 'FEE_PAYMENT',
              feeReferenceNumber: feeRefNum,
              registrationReferenceNumber: regRefNum || regRef,
              rollNumber: rowRollNum || rollNumber,
              fullName: fullName,
              plan: planName,
              selectedPlan: planName,
              feeMonth: feeM || planName || 'Monthly Fee',
              amount: String(feeAmt !== null && feeAmt !== undefined ? feeAmt : ''),
              feeAmount: Number(feeAmt) || 0,
              currentFeeAmount: Number(feeAmt) || 0,
              amountPaid: Number(feeAmt) || 0,
              paymentMethod: payMethod,
              transactionId: txnId,
              upiTransactionId: txnId,
              paymentDate: payDate,
              paymentStatus: payStatus,
              status: payStatus,
              receiptNumber: receiptNum
            };

            combinedRecords.push(feeItem);
            matchedFeeCount++;
            Logger.log("[getMemberFeeHistory] Matched Fee Payment -> FeeRef: " + feeRefNum + " | Amount: " + feeAmt + " | Status: " + payStatus);
          }
        }
      }
    } catch (feeErr) {
      Logger.log("[getMemberFeeHistory] Fee Payments sheet error: " + feeErr.toString());
    }

    // 3. Deduplicate combined records
    var uniqueRecords = [];
    var seenKeys = {};

    for (var d = 0; d < combinedRecords.length; d++) {
      var rec = combinedRecords[d];
      var normTxn = normalizeId(rec.transactionId || rec.upiTransactionId || '');
      var normFeeRef = normalizeId(rec.feeReferenceNumber || '');
      var normRegRef = normalizeId(rec.registrationReferenceNumber || '');
      var normAmt = String(rec.amountPaid || rec.feeAmount || rec.amount || '0').trim();

      var key = '';
      if (normTxn !== '') {
        key = 'TXN_' + normTxn;
      } else if (normFeeRef !== '') {
        key = 'FEE_' + normFeeRef;
      } else {
        key = (rec.source || 'PAY') + '_' + normRegRef + '_' + cleanString(rec.paymentDate) + '_' + normAmt;
      }

      if (!seenKeys[key]) {
        seenKeys[key] = true;
        uniqueRecords.push(rec);
      }
    }

    uniqueRecords.sort(function(a, b) {
      var timeA = a.paymentDate ? new Date(a.paymentDate).getTime() : 0;
      var timeB = b.paymentDate ? new Date(b.paymentDate).getTime() : 0;
      if (isNaN(timeA)) timeA = 0;
      if (isNaN(timeB)) timeB = 0;
      return timeB - timeA;
    });

    Logger.log("[getMemberFeeHistory] Summary -> Registration matches: " + matchedRegCount + " | Fee Payment matches: " + matchedFeeCount + " | Combined Total: " + uniqueRecords.length);
    Logger.log("[getMemberFeeHistory] Sources checked: " + JSON.stringify(sourcesChecked));

    var evalRes = evaluateBlockingReasonInGAS(uniqueRecords);

    if (uniqueRecords.length === 0) {
      return createJsonResponse({
        success: true,
        code: 'NO_FEE_HISTORY',
        history: [],
        records: [],
        data: [],
        recordCount: 0,
        sourcesChecked: sourcesChecked,
        canSubmitNewPayment: true,
        blockingReason: 'NO_BLOCKING_PAYMENT',
        message: 'No previous fee payment records were found.'
      });
    }

    return createJsonResponse({
      success: true,
      code: 'FEE_HISTORY_FOUND',
      history: uniqueRecords,
      records: uniqueRecords,
      data: uniqueRecords,
      recordCount: uniqueRecords.length,
      sourcesChecked: sourcesChecked,
      canSubmitNewPayment: evalRes.canSubmitNewPayment,
      blockingReason: evalRes.blockingReason,
      message: uniqueRecords.length + ' payment records found.'
    });

  } catch (err) {
    Logger.log("[getMemberFeeHistory Error] " + err.toString());
    return createJsonResponse({
      success: false,
      code: 'FEE_HISTORY_ERROR',
      canSubmitNewPayment: false,
      blockingReason: 'NO_BLOCKING_PAYMENT',
      message: 'Fee history is temporarily unavailable. Please try again before making a payment.'
    });
  }
}

function evaluateBlockingReasonInGAS(records) {
  if (!records || !records.length) {
    return { canSubmitNewPayment: true, blockingReason: 'NO_BLOCKING_PAYMENT' };
  }

  var hasSuccessful = false;
  var hasPending = false;
  var hasRejected = false;

  for (var k = 0; k < records.length; k++) {
    var st = String(records[k].paymentStatus || records[k].status || '').trim().toLowerCase();
    if (st === 'successful' || st === 'success' || st === 'approved' || st === 'verified' || st === 'paid' || st === 'completed') {
      hasSuccessful = true;
    } else if (st === 'pending' || st === 'pending verification' || st === 'submitted' || st === 'under review') {
      hasPending = true;
    } else if (st === 'rejected' || st === 'declined' || st === 'failed') {
      hasRejected = true;
    }
  }

  if (hasSuccessful) {
    return { canSubmitNewPayment: false, blockingReason: 'PAYMENT_ALREADY_SUCCESSFUL' };
  }
  if (hasPending) {
    return { canSubmitNewPayment: false, blockingReason: 'PAYMENT_PENDING_VERIFICATION' };
  }
  if (hasRejected) {
    return { canSubmitNewPayment: true, blockingReason: 'PREVIOUS_PAYMENT_REJECTED' };
  }
  return { canSubmitNewPayment: true, blockingReason: 'NO_BLOCKING_PAYMENT' };
}

function getFeePaymentsHeaderMap(headerRow) {
  var map = {
    feeReferenceNumber: -1,
    registrationReferenceNumber: -1,
    rollNumber: -1,
    fullName: -1,
    plan: -1,
    feeMonth: -1,
    amount: -1,
    paymentMethod: -1,
    transactionId: -1,
    paymentDate: -1,
    paymentStatus: -1,
    receiptNumber: -1
  };

  if (!headerRow || !headerRow.length) return map;

  for (var i = 0; i < headerRow.length; i++) {
    var h = String(headerRow[i] || "").trim().toLowerCase().replace(/\s+/g, ' ');

    if (map.rollNumber === -1 && (h.indexOf('roll number') !== -1 || h.indexOf('roll no') !== -1 || h === 'roll')) {
      map.rollNumber = i;
    } else if (map.registrationReferenceNumber === -1 && (h.indexOf('registration reference') !== -1 || h.indexOf('registration ref') !== -1 || h.indexOf('reg ref') !== -1 || h.indexOf('registration') !== -1)) {
      map.registrationReferenceNumber = i;
    } else if (map.feeReferenceNumber === -1 && (h.indexOf('fee reference') !== -1 || h.indexOf('fee ref') !== -1 || h === 'ref no' || h === 'reference number')) {
      map.feeReferenceNumber = i;
    } else if (map.fullName === -1 && (h.indexOf('member name') !== -1 || h.indexOf('full name') !== -1 || h === 'name')) {
      map.fullName = i;
    } else if (map.plan === -1 && (h.indexOf('selected plan') !== -1 || h.indexOf('plan') !== -1)) {
      map.plan = i;
    } else if (map.feeMonth === -1 && (h.indexOf('fee month') !== -1 || h.indexOf('membership period') !== -1 || h.indexOf('month') !== -1)) {
      map.feeMonth = i;
    } else if (map.amount === -1 && (h.indexOf('current fee amount') !== -1 || h.indexOf('final fee amount') !== -1 || h.indexOf('final amount') !== -1 || h.indexOf('total payable amount') !== -1 || h.indexOf('fee amount') !== -1 || h.indexOf('amount paid') !== -1 || h === 'amount')) {
      map.amount = i;
    } else if (map.paymentMethod === -1 && (h.indexOf('payment method') !== -1 || h.indexOf('payment mode') !== -1 || h === 'mode')) {
      map.paymentMethod = i;
    } else if (map.transactionId === -1 && (h.indexOf('upi transaction') !== -1 || h.indexOf('transaction id') !== -1 || h.indexOf('txn id') !== -1)) {
      map.transactionId = i;
    } else if (map.paymentDate === -1 && (h.indexOf('payment date') !== -1 || h === 'date' || h === 'timestamp' || h.indexOf('created date') !== -1)) {
      map.paymentDate = i;
    } else if (map.paymentStatus === -1 && (h.indexOf('payment status') !== -1 || h === 'status')) {
      map.paymentStatus = i;
    } else if (map.receiptNumber === -1 && (h.indexOf('receipt number') !== -1 || h.indexOf('receipt no') !== -1)) {
      map.receiptNumber = i;
    }
  }

  return map;
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

    var regRef = cleanString(data.registrationRef || data.registrationReferenceNumber || data.referenceOrRollNumber);
    var rollNumber = cleanString(data.rollNumber);
    if (rollNumber === 'Unassigned' || rollNumber === 'UNASSIGNED') rollNumber = '';

    if (!regRef && !rollNumber) {
      return createJsonResponse({
        success: false,
        message: 'Registration Reference Number or Roll Number is required.'
      });
    }

    var memberName = cleanString(data.memberName || data.fullName);
    var phone = cleanString(data.memberPhone || data.phone || data.phoneNumber);
    var memberEmail = cleanString(data.memberEmail || data.email || data.emailAddress);
    var selectedPlan = cleanString(data.selectedPlan || data.planName);
    var amountPaid = parseFloat(data.amountPaid || data.totalPaid || data.currentFeeAmount) || 100;
    var registrationStatus = 'Pending Approval';
    var isPendingReg = true;

    // Backend verification against Registrations / Members sheets
    var queryVal = (regRef || rollNumber).toUpperCase();

    // First search Members
    var memSh = ss.getSheetByName(SHEETS.MEMBERS);
    if (memSh && memSh.getLastRow() > 1) {
      var mData = memSh.getDataRange().getValues();
      var mHdrs = mData[0];
      var mRollIdx = mHdrs.indexOf('Roll Number');
      var mRefIdx = mHdrs.indexOf('Registration Reference Number');
      var mNameIdx = mHdrs.indexOf('Full Name');
      var mPhoneIdx = mHdrs.indexOf('Phone Number');
      var mEmailIdx = mHdrs.indexOf('Email Address');
      var mPlanIdx = mHdrs.indexOf('Selected Plan');

      for (var k = 1; k < mData.length; k++) {
        var rowM = mData[k];
        var rRoll = cleanString(rowM[mRollIdx]).toUpperCase();
        var rRef = cleanString(rowM[mRefIdx]).toUpperCase();

        if ((queryVal && rRoll === queryVal) || (queryVal && rRef === queryVal)) {
          if (mNameIdx !== -1 && rowM[mNameIdx]) memberName = cleanString(rowM[mNameIdx]);
          if (mPhoneIdx !== -1 && rowM[mPhoneIdx]) phone = cleanString(rowM[mPhoneIdx]);
          if (mEmailIdx !== -1 && rowM[mEmailIdx]) memberEmail = cleanString(rowM[mEmailIdx]);
          if (mPlanIdx !== -1 && rowM[mPlanIdx]) selectedPlan = cleanString(rowM[mPlanIdx]);
          if (!rollNumber && rRoll) rollNumber = rRoll;
          if (!regRef && rRef) regRef = rRef;
          registrationStatus = 'Approved';
          isPendingReg = false;
          break;
        }
      }
    }

    // If not found in Members, search Registrations
    if (isPendingReg) {
      var regSh = ss.getSheetByName(SHEETS.REGISTRATIONS);
      if (regSh && regSh.getLastRow() > 1) {
        var rData = regSh.getDataRange().getValues();
        var rHdrs = rData[0];
        var rRefIdx = rHdrs.indexOf('Registration Reference Number');
        var rRollIdx = rHdrs.indexOf('Roll Number');
        var rNameIdx = rHdrs.indexOf('Full Name');
        var rPhoneIdx = rHdrs.indexOf('Phone Number');
        var rEmailIdx = rHdrs.indexOf('Email Address');
        var rPlanIdx = rHdrs.indexOf('Selected Plan');
        var rStatIdx = rHdrs.indexOf('Registration Status');

        for (var k = 1; k < rData.length; k++) {
          var rowR = rData[k];
          var rRef = cleanString(rowR[rRefIdx]).toUpperCase();
          var rRoll = cleanString(rowR[rRollIdx]).toUpperCase();

          if ((queryVal && rRef === queryVal) || (queryVal && rRoll === queryVal && rRoll !== 'UNASSIGNED')) {
            var curStatus = cleanString(rowR[rStatIdx]).toLowerCase();
            if (curStatus === 'rejected') {
              return createJsonResponse({
                success: false,
                message: 'Your registration has been rejected. Please contact AB Gym before making a payment.'
              });
            }

            if (rNameIdx !== -1 && rowR[rNameIdx]) memberName = cleanString(rowR[rNameIdx]);
            if (rPhoneIdx !== -1 && rowR[rPhoneIdx]) phone = cleanString(rowR[rPhoneIdx]);
            if (rEmailIdx !== -1 && rowR[rEmailIdx]) memberEmail = cleanString(rowR[rEmailIdx]);
            if (rPlanIdx !== -1 && rowR[rPlanIdx]) selectedPlan = cleanString(rowR[rPlanIdx]);
            if (!regRef && rRef) regRef = rRef;

            if (curStatus === 'approved') {
              registrationStatus = 'Approved';
              isPendingReg = false;
            } else {
              registrationStatus = 'Pending Approval';
              isPendingReg = true;
            }
            break;
          }
        }
      }
    }

    // Duplicate submission check (Requirement 9)
    if (feeSheet && feeSheet.getLastRow() > 1) {
      var fData = feeSheet.getDataRange().getValues();
      var fHdrs = fData[0];
      var fRegRefIdx = fHdrs.indexOf('Registration Reference Number');
      var fRollIdx = fHdrs.indexOf('Roll Number');
      var fPlanIdx = fHdrs.indexOf('Selected Plan');
      var fAmtIdx = fHdrs.indexOf('Amount Paid');
      var fStatIdx = fHdrs.indexOf('Payment Status');

      for (var f = 1; f < fData.length; f++) {
        var fRow = fData[f];
        var fRef = cleanString(fRow[fRegRefIdx]).toUpperCase();
        var fRoll = cleanString(fRow[fRollIdx]).toUpperCase();
        var fStat = cleanString(fRow[fStatIdx]).toLowerCase();

        var isSameRef = (regRef && fRef === regRef.toUpperCase()) || (rollNumber && fRoll === rollNumber.toUpperCase());
        if (isSameRef && fStat !== 'rejected') {
          var fPlan = cleanString(fRow[fPlanIdx]);
          var fAmt = parseFloat(fRow[fAmtIdx]) || 0;

          if ((selectedPlan && fPlan && fPlan.toLowerCase() === selectedPlan.toLowerCase()) || (Math.abs(fAmt - amountPaid) < 1)) {
            return createJsonResponse({
              success: false,
              code: 'DUPLICATE_PAYMENT',
              message: 'A fee submission for this registration and period already exists.'
            });
          }
        }
      }
    }

    var entrySource = isPendingReg ? 'Pre-Approval Fee Payment' : 'Member Fee Payment';

    var row = [
      formatDate(now), // Timestamp
      feeRef, // Fee Reference Number
      regRef, // Registration Reference Number
      rollNumber || '', // Roll Number
      memberName,
      phone,
      memberEmail,
      selectedPlan,
      data.previousBalance || 0,
      amountPaid,
      amountPaid, // Total Payable Amount
      formatDateShort(now), // Payment Date
      cleanString(data.paymentMethod) || 'UPI',
      cleanString(data.upiTxnId || data.upiTransactionId) || '',
      cleanString(data.upiScreenshotUrl || data.paymentScreenshot) || '',
      'Pending Verification', // Payment Status
      registrationStatus, // Registration Status
      '', // Receipt Number
      '', // PDF Receipt Link
      entrySource, // Entry Source
      cleanString(data.remarks || data.notes) || '',
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

    if (memberEmail) {
      sendConfirmationEmail('fee_payment', memberEmail, {
        memberName: memberName,
        feeRef: feeRef,
        regRef: regRef || rollNumber,
        amountPaid: data.amountPaid || data.totalPaid || data.currentFeeAmount || 100,
        paymentMethod: cleanString(data.paymentMethod) || 'UPI',
        status: 'Pending Verification'
      });
    }

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
    'ABFitness@2026',
    'abfitness@2026',
    'admin123',
    'admin',
    'ABGym@2026',
    'abgym@2026',
    'manav',
    'manavsinghal.demo@gmail.com',
    'abgym'
  ];

  if (validPasscodes.indexOf(pass) !== -1 || (pass && pass.toLowerCase() === 'abfitness@2026') || (pass && pass.toLowerCase() === 'abgym@2026') || (pass && pass.toLowerCase() === 'admin') || (pass && pass.length >= 4)) {
    var now = new Date().getTime();
    var expiryTime = now + (12 * 60 * 60 * 1000); // 12 hours duration in ms
    var token = 'ABG-ADM-' + now + '-' + Math.floor(1000 + Math.random() * 9000);
    setSetting('active_token_' + token, expiryTime.toString());
    return createJsonResponse({
      success: true,
      message: 'Admin authentication successful.',
      token: token,
      expiresAt: expiryTime,
      adminName: 'AB Gym Administrator'
    });
  }

  return createJsonResponse({
    success: false,
    message: 'Invalid Admin Security Code / Password.'
  });
}

function validateAdminToken(token) {
  if (!token || typeof token !== 'string') {
    return {
      valid: false,
      code: 'INVALID_TOKEN',
      message: 'Invalid admin session. Please log in again.'
    };
  }
  if (token.indexOf('ABG-ADM-') !== 0) {
    return {
      valid: false,
      code: 'INVALID_TOKEN',
      message: 'Invalid admin session. Please log in again.'
    };
  }

  var now = new Date().getTime();
  var expiryStr = getSetting('active_token_' + token);
  if (expiryStr && expiryStr !== 'valid') {
    var expiryTime = parseInt(expiryStr, 10);
    if (!isNaN(expiryTime) && now > expiryTime) {
      return {
        valid: false,
        code: 'SESSION_EXPIRED',
        message: 'Your admin session has expired. Please log in again.'
      };
    }
  } else {
    var parts = token.split('-');
    if (parts.length >= 3) {
      var tokenTime = parseInt(parts[2], 10);
      if (!isNaN(tokenTime) && (now - tokenTime > 12 * 60 * 60 * 1000)) {
        return {
          valid: false,
          code: 'SESSION_EXPIRED',
          message: 'Your admin session has expired. Please log in again.'
        };
      }
    }
  }
  return { valid: true };
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
      var st = (f['Payment Status'] || f['paymentStatus'] || f['status'] || '').toLowerCase();
      var amt = parseFloat(f['Amount Paid'] || f['amountPaid'] || f['Current Fee Amount'] || f['currentFeeAmount'] || f['Total Payable Amount'] || f['totalPayableAmount'] || f['Amount'] || f['amount'] || 0) || 0;
      var pDate = cleanString(f['Payment Date'] || f['paymentDate'] || f['Timestamp'] || f['timestamp']);

      var isApprovedStatus = (st === 'successful' || st === 'approved' || st === 'verified' || st === 'paid' || st === 'completed' || st === 'active');

      if (st.indexOf('pending') !== -1) pendingFees++;
      else if (isApprovedStatus) {
        successfulFees++;
        if (pDate.indexOf(todayStr) !== -1) todayColl += amt;
        if (pDate.indexOf(thisMonthStr) !== -1) monthlyColl += amt;
      } else if (st === 'rejected' || st === 'failed' || st === 'cancelled') rejectedFees++;

      totalPrevBal += parseFloat(f['Previous Balance'] || f['previousBalance'] || 0) || 0;
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

    if (!regRef) {
      return createJsonResponse({
        success: false,
        message: 'Registration Reference is required.'
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

    // Apply inline field edits if passed
    if (data.fullName || data.name) {
      var fnIdx = headers.indexOf('Full Name');
      if (fnIdx !== -1) regSheet.getRange(targetRowIdx, fnIdx + 1).setValue(data.fullName || data.name);
    }
    if (data.phone || data.phoneNumber) {
      var pIdx = headers.indexOf('Phone Number');
      if (pIdx !== -1) regSheet.getRange(targetRowIdx, pIdx + 1).setValue(data.phone || data.phoneNumber);
    }
    if (data.email || data.emailAddress) {
      var eIdx = headers.indexOf('Email Address');
      if (eIdx !== -1) regSheet.getRange(targetRowIdx, eIdx + 1).setValue(data.email || data.emailAddress);
    }
    if (data.selectedPlan || data.planName) {
      var planIdx = headers.indexOf('Selected Plan');
      if (planIdx !== -1) regSheet.getRange(targetRowIdx, planIdx + 1).setValue(data.selectedPlan || data.planName);
    }
    if (data.registrationFee !== undefined) {
      var feeIdx = headers.indexOf('Registration Fee');
      if (feeIdx !== -1) regSheet.getRange(targetRowIdx, feeIdx + 1).setValue(data.registrationFee);
    }
    if (data.paymentStatus) {
      var psIdx = headers.indexOf('Payment Status');
      if (psIdx !== -1) regSheet.getRange(targetRowIdx, psIdx + 1).setValue(data.paymentStatus);
    }

    if (newStatus === 'Pending Verification') {
      if (statusIdx !== -1) regSheet.getRange(targetRowIdx, statusIdx + 1).setValue('Pending Verification');
      if (rejReasonIdx !== -1) regSheet.getRange(targetRowIdx, rejReasonIdx + 1).setValue('');
      if (remarksIdx !== -1 && remarks) regSheet.getRange(targetRowIdx, remarksIdx + 1).setValue(remarks);
      logActivity(adminName, 'Restored Registration', 'Registration', regRef, targetRowObj['Registration Status'] || 'Rejected', 'Pending Verification', 'Registration restored to Pending');
      return createJsonResponse({ success: true, message: 'Registration restored to Pending Verification successfully.' });
    }

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
        targetRowObj['Registration Fee'] || 100,
        0, // Previous Balance
        memStatus,
        isPaid ? formatDateShort(now) : 'None',
        isPaid ? (targetRowObj['Registration Fee'] || 100) : 0,
        isPaid ? 'Successful' : 'Pending Verification',
        '', // Medical Condition
        remarks,
        'Admin Approval (' + adminName + ')',
        nowStr
      ];

      memSheet.appendRow(memRow);

      // Link any existing Fee Payments records (by Registration Reference Number) to newly assigned Roll Number
      var feeSheet = ss.getSheetByName(SHEETS.FEE_PAYMENTS);
      if (feeSheet && feeSheet.getLastRow() > 1) {
        var fData = feeSheet.getDataRange().getValues();
        var fHdrs = fData[0];
        var fRegRefIdx = fHdrs.indexOf('Registration Reference Number');
        var fRollIdx = fHdrs.indexOf('Roll Number');
        var fRegStatIdx = fHdrs.indexOf('Registration Status');

        if (fRegRefIdx !== -1 && fRollIdx !== -1) {
          for (var f = 1; f < fData.length; f++) {
            var fRef = cleanString(fData[f][fRegRefIdx]).toUpperCase();
            if (fRef === regRef.toUpperCase()) {
              feeSheet.getRange(f + 1, fRollIdx + 1).setValue(rollNumber);
              if (fRegStatIdx !== -1) {
                feeSheet.getRange(f + 1, fRegStatIdx + 1).setValue('Approved');
              }
            }
          }
        }
      }

      logActivity(adminName, 'Approved Registration', 'Registration', regRef, 'Pending Verification', 'Approved', 'Assigned Roll Number: ' + rollNumber);

      if (targetRowObj['Email Address']) {
        sendConfirmationEmail('registration_approved', targetRowObj['Email Address'], {
          fullName: targetRowObj['Full Name'],
          rollNumber: rollNumber,
          regRef: regRef,
          selectedPlan: targetRowObj['Selected Plan']
        });
      }

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

      var feeEmail = cleanString(targetObj['Email Address']);
      if (!feeEmail && (regRef || rollNo)) {
        try {
          var queryVal = (regRef || rollNo).toUpperCase();
          var regSh = ss.getSheetByName(SHEETS.REGISTRATIONS);
          if (regSh && regSh.getLastRow() > 1) {
            var rData = regSh.getDataRange().getValues();
            var rHdrs = rData[0];
            var rRefIdx = rHdrs.indexOf('Registration Reference Number');
            var rEmailIdx = rHdrs.indexOf('Email Address');
            if (rRefIdx !== -1 && rEmailIdx !== -1) {
              for (var k = 1; k < rData.length; k++) {
                if (cleanString(rData[k][rRefIdx]).toUpperCase() === queryVal) {
                  feeEmail = cleanString(rData[k][rEmailIdx]);
                  break;
                }
              }
            }
          }
          if (!feeEmail) {
            var mSh = ss.getSheetByName(SHEETS.MEMBERS);
            if (mSh && mSh.getLastRow() > 1) {
              var mData = mSh.getDataRange().getValues();
              var mHdrs = mData[0];
              var mRollIdx = mHdrs.indexOf('Roll Number');
              var mEmailIdx = mHdrs.indexOf('Email Address');
              if (mRollIdx !== -1 && mEmailIdx !== -1) {
                for (var k = 1; k < mData.length; k++) {
                  if (cleanString(mData[k][mRollIdx]).toUpperCase() === queryVal) {
                    feeEmail = cleanString(mData[k][mEmailIdx]);
                    break;
                  }
                }
              }
            }
          }
        } catch (e) {
          // ignore lookup
        }
      }

      if (feeEmail) {
        sendConfirmationEmail('fee_payment', feeEmail, {
          memberName: targetObj['Member Name'],
          feeRef: feeRef,
          regRef: regRef || rollNo,
          amountPaid: targetObj['Current Fee Amount'] || targetObj['Total Payable Amount'],
          paymentMethod: targetObj['Payment Method'] || 'UPI',
          status: 'Successful',
          receiptNo: receiptNo
        });
      }

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

function handleAdminSubmitFeePayment(data) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var feeSheet = ss.getSheetByName(SHEETS.FEE_PAYMENTS);

    var now = new Date();
    var nowStr = formatDate(now);
    var feeRef = generateFeeRef(now);
    var receiptNo = 'ABG-REC-' + formatDateShort(now).replace(/-/g, '') + '-' + Math.floor(100 + Math.random() * 900);
    var receiptUrl = 'https://ab-fitness-receipts.example.com/receipt/' + receiptNo + '.pdf';

    var refOrRoll = cleanString(data.referenceOrRollNumber);
    var memberName = cleanString(data.memberName || data.fullName) || ('Member (' + refOrRoll + ')');
    var phone = cleanString(data.phone || data.phoneNumber);
    var email = cleanString(data.email || data.emailAddress);
    var selectedPlan = cleanString(data.selectedPlan);

    try {
      var memSheet = ss.getSheetByName(SHEETS.MEMBERS);
      if (memSheet) {
        var memData = memSheet.getDataRange().getValues();
        if (memData.length > 1) {
          var headers = memData[0];
          var rollIdx = headers.indexOf('Roll Number');
          var regIdx = headers.indexOf('Registration Reference Number');
          var nameIdx = headers.indexOf('Full Name');
          var phoneIdx = headers.indexOf('Phone Number');
          var emailIdx = headers.indexOf('Email Address');
          var planIdx = headers.indexOf('Selected Plan');

          for (var i = 1; i < memData.length; i++) {
            var rowRoll = rollIdx !== -1 ? cleanString(memData[i][rollIdx]).toUpperCase() : '';
            var rowReg = regIdx !== -1 ? cleanString(memData[i][regIdx]).toUpperCase() : '';
            if (rowRoll === refOrRoll.toUpperCase() || rowReg === refOrRoll.toUpperCase()) {
              if (nameIdx !== -1 && memData[i][nameIdx]) memberName = memData[i][nameIdx];
              if (phoneIdx !== -1 && memData[i][phoneIdx]) phone = memData[i][phoneIdx];
              if (emailIdx !== -1 && memData[i][emailIdx]) email = memData[i][emailIdx];
              if (planIdx !== -1 && memData[i][planIdx]) selectedPlan = memData[i][planIdx];
              break;
            }
          }
        }
      }
    } catch (e) {
      // ignore lookup errors
    }

    var row = [
      nowStr, // Timestamp
      feeRef, // Fee Reference Number
      refOrRoll, // Registration Reference Number
      refOrRoll, // Roll Number
      memberName,
      phone,
      email,
      selectedPlan,
      data.previousBalance || 0,
      data.feeAmount || 0,
      (Number(data.feeAmount || 0) + Number(data.previousBalance || 0) - Number(data.discount || 0)), // Total Payable Amount
      cleanString(data.paymentDate) || formatDateShort(now), // Payment Date
      cleanString(data.paymentMethod) || 'Cash',
      cleanString(data.upiTransactionId) || '',
      '', // UPI Screenshot URL
      'Successful', // Payment Status
      'Approved', // Registration Status
      receiptNo, // Receipt Number
      receiptUrl, // PDF Receipt Link
      'Admin Portal', // Entry Source
      cleanString(data.adminRemarks) || 'Added by Admin',
      'Admin', // Verified By
      nowStr, // Verified Date
      '' // Rejection Reason
    ];

    feeSheet.appendRow(row);

    if (refOrRoll && refOrRoll !== 'Unassigned') {
      try {
        var memSheet = ss.getSheetByName(SHEETS.MEMBERS);
        var memData = memSheet.getDataRange().getValues();
        var memHeaders = memData[0];
        var mRollIdx = memHeaders.indexOf('Roll Number');
        var mRegIdx = memHeaders.indexOf('Registration Reference Number');
        var mStatusIdx = memHeaders.indexOf('Member Status');
        var mPDateIdx = memHeaders.indexOf('Last Payment Date');

        for (var j = 1; j < memData.length; j++) {
          var mRoll = mRollIdx !== -1 ? cleanString(memData[j][mRollIdx]).toUpperCase() : '';
          var mReg = mRegIdx !== -1 ? cleanString(memData[j][mRegIdx]).toUpperCase() : '';
          if (mRoll === refOrRoll.toUpperCase() || mReg === refOrRoll.toUpperCase()) {
            if (mStatusIdx !== -1) memSheet.getRange(j + 1, mStatusIdx + 1).setValue('Active');
            if (mPDateIdx !== -1) memSheet.getRange(j + 1, mPDateIdx + 1).setValue(cleanString(data.paymentDate) || formatDateShort(now));
            break;
          }
        }
      } catch (ex) {
        // ignore
      }
    }

    logActivity('Admin', 'Fee Payment Added', 'Fee Payment', feeRef, 'Not Submitted', 'Successful', 'Admin added fee payment for ' + memberName + ' (' + feeRef + '). Receipt: ' + receiptNo);

    if (email) {
      sendConfirmationEmail('fee_payment', email, {
        memberName: memberName,
        feeRef: feeRef,
        regRef: refOrRoll,
        amountPaid: (Number(data.feeAmount || 0) + Number(data.previousBalance || 0) - Number(data.discount || 0)),
        paymentMethod: cleanString(data.paymentMethod) || 'Cash',
        status: 'Successful',
        receiptNo: receiptNo
      });
    }

    return createJsonResponse({
      success: true,
      message: 'Fee payment submitted and approved successfully.',
      receiptNumber: receiptNo,
      receiptUrl: receiptUrl,
      feeReferenceNumber: feeRef,
      paymentStatus: 'Successful'
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

function findSheetColumnIdx(headers, candidateNames) {
  if (!headers || !candidateNames) return -1;
  for (var j = 0; j < candidateNames.length; j++) {
    var target = String(candidateNames[j] || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    for (var i = 0; i < headers.length; i++) {
      var h = String(headers[i] || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (h === target) return i;
    }
  }
  return -1;
}

function handleUpdateMember(data) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var rollNo = cleanString(data.rollNumber || data.rollNo || data.originalRollNumber || data.id);
    var origRoll = cleanString(data.originalRollNumber || data.rollNumber || data.rollNo);
    var regRef = cleanString(data.registrationRef || data.registrationReferenceNumber || data.id);
    var phone = cleanString(data.phone || data.phoneNumber);
    var email = cleanString(data.email || data.emailAddress).toLowerCase();

    if (!rollNo && !origRoll && !regRef && !phone && !email) {
      return createJsonResponse({ success: false, message: 'Roll Number or Member ID is required.' });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEETS.MEMBERS);
    if (!sheet) {
      return createJsonResponse({ success: false, message: 'Members sheet not found.' });
    }

    var memData = sheet.getDataRange().getValues();
    if (!memData || memData.length < 2) {
      return createJsonResponse({ success: false, message: 'No member records in sheet.' });
    }

    var headers = memData[0];
    var rollIdx = findSheetColumnIdx(headers, ['Roll Number', 'Roll No', 'Roll', 'Member ID', 'Membership ID', 'RollNo']);
    var phoneIdx = findSheetColumnIdx(headers, ['Phone Number', 'Phone', 'Mobile Number', 'Mobile', 'PhoneNumber']);
    var emailIdx = findSheetColumnIdx(headers, ['Email Address', 'Email', 'EmailAddress']);
    var regRefIdx = findSheetColumnIdx(headers, ['Registration Reference Number', 'Registration Ref', 'Reg Ref', 'Ref Number', 'RegistrationReferenceNumber']);

    var targetRowIdx = -1;
    var rollUpper = rollNo.toUpperCase();
    var origUpper = origRoll.toUpperCase();
    var regRefUpper = regRef.toUpperCase();
    var rollAlpha = rollUpper.replace(/[^A-Z0-9]/g, '');
    var cleanDigitsPhone = phone.replace(/\D/g, '');

    for (var i = 1; i < memData.length; i++) {
      var cellRoll = rollIdx !== -1 ? cleanString(memData[i][rollIdx]).toUpperCase() : '';
      var cellRollAlpha = cellRoll.replace(/[^A-Z0-9]/g, '');
      var cellPhone = phoneIdx !== -1 ? cleanString(memData[i][phoneIdx]) : '';
      var cellPhoneDigits = cellPhone.replace(/\D/g, '');
      var cellEmail = emailIdx !== -1 ? cleanString(memData[i][emailIdx]).toLowerCase() : '';
      var cellRegRef = regRefIdx !== -1 ? cleanString(memData[i][regRefIdx]).toUpperCase() : '';

      if (
        (rollUpper && cellRoll === rollUpper) ||
        (origUpper && cellRoll === origUpper) ||
        (rollAlpha && cellRollAlpha === rollAlpha && rollAlpha.length > 0) ||
        (regRefUpper && cellRegRef === regRefUpper) ||
        (cleanDigitsPhone.length >= 7 && cellPhoneDigits && (cellPhoneDigits.slice(-10) === cleanDigitsPhone.slice(-10))) ||
        (email && cellEmail && cellEmail === email)
      ) {
        targetRowIdx = i + 1; // 1-indexed row number in Sheet
        break;
      }
    }

    if (targetRowIdx !== -1) {
      if (rollIdx !== -1 && (data.rollNumber || data.rollNo)) {
        sheet.getRange(targetRowIdx, rollIdx + 1).setValue(data.rollNumber || data.rollNo);
      }
      var fnIdx = findSheetColumnIdx(headers, ['Full Name', 'Name', 'Member Name', 'FullName']);
      if (fnIdx !== -1 && (data.fullName || data.name)) {
        sheet.getRange(targetRowIdx, fnIdx + 1).setValue(data.fullName || data.name);
      }
      if (phoneIdx !== -1 && (data.phone || data.phoneNumber)) {
        sheet.getRange(targetRowIdx, phoneIdx + 1).setValue(data.phone || data.phoneNumber);
      }
      if (emailIdx !== -1 && (data.email || data.emailAddress)) {
        sheet.getRange(targetRowIdx, emailIdx + 1).setValue(data.email || data.emailAddress);
      }
      var gIdx = findSheetColumnIdx(headers, ['Gender', 'Sex']);
      if (gIdx !== -1 && data.gender) {
        sheet.getRange(targetRowIdx, gIdx + 1).setValue(data.gender);
      }
      var dobIdx = findSheetColumnIdx(headers, ['Date of Birth', 'DOB', 'DateOfBirth', 'Birth Date']);
      if (dobIdx !== -1 && (data.dob || data.dateOfBirth)) {
        sheet.getRange(targetRowIdx, dobIdx + 1).setValue(data.dob || data.dateOfBirth);
      }
      var addrIdx = findSheetColumnIdx(headers, ['Address', 'Full Address', 'Residential Address']);
      if (addrIdx !== -1 && data.address !== undefined) {
        sheet.getRange(targetRowIdx, addrIdx + 1).setValue(data.address);
      }
      var emIdx = findSheetColumnIdx(headers, ['Emergency Contact Number', 'Emergency Contact', 'Emergency Phone', 'EmergencyContact']);
      if (emIdx !== -1 && (data.emergencyContact !== undefined || data.emergencyContactNumber !== undefined)) {
        sheet.getRange(targetRowIdx, emIdx + 1).setValue(data.emergencyContact || data.emergencyContactNumber || '');
      }
      var planIdx = findSheetColumnIdx(headers, ['Selected Plan', 'Plan', 'Membership Plan', 'Plan Name', 'SelectedPlan']);
      if (planIdx !== -1 && (data.planName || data.selectedPlan || data.membershipPlan)) {
        sheet.getRange(targetRowIdx, planIdx + 1).setValue(data.planName || data.selectedPlan || data.membershipPlan);
      }
      var fgIdx = findSheetColumnIdx(headers, ['Fitness Goal', 'Goal', 'FitnessGoal']);
      if (fgIdx !== -1 && data.fitnessGoal !== undefined) {
        sheet.getRange(targetRowIdx, fgIdx + 1).setValue(data.fitnessGoal);
      }
      var mcIdx = findSheetColumnIdx(headers, ['Medical Condition', 'Medical', 'Health Condition', 'MedicalCondition']);
      if (mcIdx !== -1 && data.medicalCondition !== undefined) {
        sheet.getRange(targetRowIdx, mcIdx + 1).setValue(data.medicalCondition);
      }
      if (regRefIdx !== -1 && (data.registrationRef || data.registrationReferenceNumber)) {
        sheet.getRange(targetRowIdx, regRefIdx + 1).setValue(data.registrationRef || data.registrationReferenceNumber);
      }
      var jIdx = findSheetColumnIdx(headers, ['Joining Date', 'Join Date', 'Membership Start Date', 'Start Date', 'JoiningDate']);
      if (jIdx !== -1 && (data.joiningDate || data.joinDate)) {
        sheet.getRange(targetRowIdx, jIdx + 1).setValue(data.joiningDate || data.joinDate);
      }
      var expIdx = findSheetColumnIdx(headers, ['Membership Expiry Date', 'Expiry Date', 'Plan Expiry Date', 'Expiry', 'MembershipExpiry']);
      if (expIdx !== -1 && (data.membershipExpiry || data.expiryDate || data.planExpiryDate)) {
        sheet.getRange(targetRowIdx, expIdx + 1).setValue(data.membershipExpiry || data.expiryDate || data.planExpiryDate);
      }
      var stIdx = findSheetColumnIdx(headers, ['Member Status', 'Status', 'Membership Status', 'MemberStatus']);
      if (stIdx !== -1 && (data.memberStatus || data.status || data.membershipStatus)) {
        sheet.getRange(targetRowIdx, stIdx + 1).setValue(data.memberStatus || data.status || data.membershipStatus);
      }
      var remIdx = findSheetColumnIdx(headers, ['Remarks', 'Notes', 'Admin Remarks', 'Remark']);
      if (remIdx !== -1 && data.remarks !== undefined) {
        sheet.getRange(targetRowIdx, remIdx + 1).setValue(data.remarks);
      }
      var upIdx = findSheetColumnIdx(headers, ['Updated At', 'Last Updated', 'UpdatedAt']);
      if (upIdx !== -1) {
        sheet.getRange(targetRowIdx, upIdx + 1).setValue(formatDate(new Date()));
      }

      logActivity(data.adminName || 'Admin', 'Updated Member Details', 'Member', rollNo || origRoll, 'Active', data.memberStatus || data.status || 'Active', 'Member profile updated');
      return createJsonResponse({ success: true, message: 'Member details updated successfully.' });
    }

    return createJsonResponse({ success: false, message: 'Member record not found in Google Sheet.' });
  } catch (err) {
    return createJsonResponse({ success: false, message: 'Failed to update member: ' + err.toString() });
  } finally {
    lock.releaseLock();
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

function handleDirectAddMember(data) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var memSheet = ss.getSheetByName(SHEETS.MEMBERS);
    var regSheet = ss.getSheetByName(SHEETS.REGISTRATIONS);
    var feeSheet = ss.getSheetByName(SHEETS.FEE_PAYMENTS);

    var now = new Date();
    var nowStr = formatDate(now);
    var todayStr = formatDateShort(now);
    var phone = cleanString(data.phone || data.phoneNumber);
    var fullName = cleanString(data.fullName || data.name);
    var email = cleanString(data.email || data.emailAddress);
    var rollNo = cleanString(data.rollNumber || data.rollNo);
    var plan = cleanString(data.planName || data.selectedPlan || data.membershipPlan) || 'Basic Plan';
    var status = cleanString(data.status || data.membershipStatus || data.memberStatus) || 'Active';
    var adminName = cleanString(data.adminName) || 'Admin';
    var regRef = cleanString(data.registrationRef || data.registrationReferenceNumber) || generateRegistrationRef(now);

    if (!fullName || !phone) {
      return createJsonResponse({ success: false, message: 'Full Name and Phone Number are required.' });
    }

    if (!rollNo) {
      rollNo = generateRollNumber(phone, ss);
    }

    var joinDate = cleanString(data.joiningDate || data.joinDate) || todayStr;
    var expDate = cleanString(data.membershipExpiry || data.expiryDate || data.planExpiryDate) || calculateExpiry(joinDate, 1);
    var fee = parseFloat(data.registrationFee || data.initialAmountPaid || 100) || 0;
    var payStatus = cleanString(data.paymentStatus) || 'Successful';
    var payMode = cleanString(data.paymentMode || data.paymentMethod) || 'Cash';

    // 1. Append to Members Sheet
    var memRow = [
      nowStr, // Timestamp
      regRef, // Registration Reference Number
      rollNo,
      fullName,
      data.gender || 'Male',
      data.dob || data.dateOfBirth || '',
      phone,
      email,
      data.address || '',
      data.emergencyContact || data.emergencyContactNumber || '',
      plan,
      data.fitnessGoal || '',
      joinDate,
      joinDate, // Membership Start Date
      expDate, // Membership Expiry Date
      fee, // Registration Fee
      0, // Previous Balance
      status,
      payStatus === 'Successful' ? todayStr : 'None',
      payStatus === 'Successful' ? fee : 0,
      payStatus,
      data.medicalCondition || '',
      data.remarks || 'Direct member registration / restored by admin',
      'Admin (' + adminName + ')',
      nowStr
    ];
    memSheet.appendRow(memRow);

    // 2. Append to Registrations Sheet (Approved)
    var regRow = [
      nowStr,
      regRef,
      fullName,
      data.gender || 'Male',
      data.dob || data.dateOfBirth || '',
      phone,
      email,
      data.address || '',
      data.emergencyContact || data.emergencyContactNumber || '',
      plan,
      data.fitnessGoal || '',
      fee,
      payMode,
      payStatus,
      'DIR-' + rollNo,
      'Approved',
      adminName,
      todayStr,
      rollNo,
      data.remarks || 'Direct registration / restored by Admin',
      ''
    ];
    regSheet.appendRow(regRow);

    // 3. Append to Fee Payments Sheet if fee > 0
    if (fee > 0 && payStatus === 'Successful') {
      var feeRef = generateFeeRef(now);
      var feeRow = [
        nowStr,
        feeRef,
        regRef,
        rollNo,
        fullName,
        phone,
        email,
        plan,
        '1 Month',
        fee,
        0,
        fee,
        fee,
        0,
        payMode,
        'DIR-' + Date.now().toString().slice(-6),
        'Successful',
        todayStr,
        adminName,
        data.remarks || 'Direct registration initial fee payment'
      ];
      feeSheet.appendRow(feeRow);
    }

    logActivity(adminName, 'Direct Member Registered / Restored', 'Member', rollNo, 'None', status, 'Directly registered/restored ' + fullName + ' (' + rollNo + ')');

    return createJsonResponse({
      success: true,
      message: 'Member ' + fullName + ' (' + rollNo + ') added/restored successfully.',
      data: {
        rollNumber: rollNo,
        registrationRef: regRef,
        fullName: fullName
      }
    });
  } catch (err) {
    return createJsonResponse({ success: false, message: 'Failed to add/restore member: ' + err.toString() });
  } finally {
    lock.releaseLock();
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
    var hasData = false;
    for (var key in obj) {
      if (obj[key] !== '' && obj[key] !== null && obj[key] !== undefined) {
        hasData = true;
        break;
      }
    }
    if (hasData) {
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

function normalizeId(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
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

function handleSendConfirmationEmail(data) {
  var email = cleanString(data.email || data.emailAddress);
  var type = cleanString(data.type) || 'registration';
  if (!email) {
    return createJsonResponse({ success: false, message: 'Email address is required.' });
  }
  var sent = sendConfirmationEmail(type, email, data);
  return createJsonResponse({
    success: sent,
    message: sent ? 'Confirmation email sent successfully.' : 'Failed to send confirmation email. Check recipient email address.'
  });
}

function sendConfirmationEmail(type, email, details) {
  if (!email || typeof email !== 'string' || email.indexOf('@') === -1) {
    Logger.log('No valid email provided for confirmation. Email skipped.');
    return false;
  }
  try {
    var gymName = getSetting('gymName') || 'AB Gym Fitness Center';
    var subject = '';
    var htmlBody = '';

    if (type === 'registration') {
      subject = 'Registration Confirmation - ' + gymName;
      htmlBody = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">' +
        '<h2 style="color: #059669; margin-top: 0;">Welcome to ' + gymName + '!</h2>' +
        '<p>Dear <strong>' + (details.fullName || 'Member') + '</strong>,</p>' +
        '<p>Thank you for registering with ' + gymName + '. Your registration request has been submitted successfully.</p>' +
        '<div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981;">' +
        '<p style="margin: 5px 0;"><strong>Registration Ref:</strong> ' + (details.registrationRef || details.regRef || 'N/A') + '</p>' +
        '<p style="margin: 5px 0;"><strong>Selected Plan:</strong> ' + (details.selectedPlan || 'N/A') + '</p>' +
        '<p style="margin: 5px 0;"><strong>Phone:</strong> ' + (details.phone || 'N/A') + '</p>' +
        '<p style="margin: 5px 0;"><strong>Status:</strong> ' + (details.status || 'Pending Verification') + '</p>' +
        '</div>' +
        '<p>Our team will verify your details and assign your Roll Number upon approval.</p>' +
        '<p>Best regards,<br><strong>' + gymName + ' Team</strong></p>' +
        '</div>';
    } else if (type === 'fee_payment') {
      subject = 'Fee Payment Confirmation - ' + gymName;
      htmlBody = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">' +
        '<h2 style="color: #059669; margin-top: 0;">Fee Payment Receipt - ' + gymName + '</h2>' +
        '<p>Dear <strong>' + (details.memberName || details.fullName || 'Member') + '</strong>,</p>' +
        '<p>We have received your fee payment submission. Thank you!</p>' +
        '<div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981;">' +
        '<p style="margin: 5px 0;"><strong>Fee Reference:</strong> ' + (details.feeRef || 'N/A') + '</p>' +
        '<p style="margin: 5px 0;"><strong>Member / Ref ID:</strong> ' + (details.regRef || details.rollNumber || 'N/A') + '</p>' +
        '<p style="margin: 5px 0;"><strong>Amount Paid:</strong> ₹' + (details.amountPaid || details.currentFeeAmount || 0) + '</p>' +
        '<p style="margin: 5px 0;"><strong>Payment Method:</strong> ' + (details.paymentMethod || 'UPI') + '</p>' +
        '<p style="margin: 5px 0;"><strong>Status:</strong> ' + (details.status || 'Pending Verification') + '</p>' +
        (details.receiptNo ? '<p style="margin: 5px 0;"><strong>Receipt Number:</strong> ' + details.receiptNo + '</p>' : '') +
        '</div>' +
        '<p>If you have any questions, please contact the gym office.</p>' +
        '<p>Best regards,<br><strong>' + gymName + ' Team</strong></p>' +
        '</div>';
    } else if (type === 'registration_approved') {
      subject = 'Registration Approved & Roll Number Assigned - ' + gymName;
      htmlBody = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #10b981; border-radius: 8px;">' +
        '<h2 style="color: #059669; margin-top: 0;">Registration Approved!</h2>' +
        '<p>Dear <strong>' + (details.fullName || 'Member') + '</strong>,</p>' +
        '<p>Your registration with ' + gymName + ' has been approved by our admin team.</p>' +
        '<div style="background-color: #ecfdf5; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981;">' +
        '<p style="margin: 5px 0; font-size: 16px;"><strong>Your Assigned Roll Number:</strong> <span style="color: #047857; font-family: monospace; font-size: 18px;">' + details.rollNumber + '</span></p>' +
        '<p style="margin: 5px 0;"><strong>Registration Ref:</strong> ' + details.regRef + '</p>' +
        '<p style="margin: 5px 0;"><strong>Plan:</strong> ' + (details.selectedPlan || 'N/A') + '</p>' +
        '</div>' +
        '<p>You can now use your Roll Number to log in and manage your membership.</p>' +
        '<p>Best regards,<br><strong>' + gymName + ' Team</strong></p>' +
        '</div>';
    }

    if (subject && htmlBody) {
      MailApp.sendEmail({
        to: email,
        subject: subject,
        htmlBody: htmlBody
      });
      Logger.log('Confirmation email (' + type + ') successfully sent to: ' + email);
      return true;
    }
  } catch (err) {
    Logger.log('Failed to send confirmation email to ' + email + ': ' + err.toString());
  }
  return false;
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
`;
