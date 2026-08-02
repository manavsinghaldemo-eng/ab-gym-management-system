import {
  RegistrationRequest,
  FeePaymentRecord,
  Member,
  ActivityLogRecord,
  DashboardStats,
} from '../types';
import {
  getStoredMembers,
  saveMembers,
  getStoredRegistrations,
  saveRegistrations,
  getStoredPayments,
  savePayments,
  getStoredActivityLogs,
  saveActivityLogs,
  seedLocalStorageWithSampleData,
  logAdminActivity,
  getMemberForFee as getMemberForFeeStorage,
  getMemberFeeHistory as getMemberFeeHistoryStorage,
  evaluateFeePaymentBlockingStorage,
  updateMemberInStorage,
  fallbackAdminSubmitFeePayment,
} from './storage';

import { GOOGLE_APPS_SCRIPT_URL, callABFitnessBackend } from './config';
export { GOOGLE_APPS_SCRIPT_URL, callABFitnessBackend };

const DEFAULT_SCRIPT_URL = GOOGLE_APPS_SCRIPT_URL;
const SCRIPT_URL_STORAGE_KEY = 'ABG_VITE_GOOGLE_SCRIPT_URL';

// Always use the central backend URL
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  localStorage.setItem(SCRIPT_URL_STORAGE_KEY, DEFAULT_SCRIPT_URL);
}

export function getScriptUrl(): string {
  return GOOGLE_APPS_SCRIPT_URL;
}

export function setScriptUrl(url: string) {
  if (url && url.trim()) {
    localStorage.setItem(SCRIPT_URL_STORAGE_KEY, url.trim());
  } else {
    localStorage.setItem(SCRIPT_URL_STORAGE_KEY, DEFAULT_SCRIPT_URL);
  }
}

export function isGoogleScriptConnected(): boolean {
  return true;
}

export interface ApiResponse<T = any> {
  success: boolean;
  code?: string;
  message: string;
  data?: T;
  registrationReferenceNumber?: string;
  registrationRef?: string;
  feeReferenceNumber?: string;
  rollNumber?: string;
  receiptNumber?: string;
  pdfReceiptLink?: string;
  receiptUrl?: string;
  token?: string;
  adminToken?: string;
  status?: string;
  [key: string]: any;
}

export const ADMIN_STORAGE_KEYS = {
  TOKEN: 'abFitnessAdminToken',
  USER: 'abGymAdminUser',
  EXPIRY: 'abGymAdminTokenExpiry',
  LOGGED_IN: 'abgym_admin_logged_in',
};

export function getSavedAdminToken(): string {
  return (
    localStorage.getItem(ADMIN_STORAGE_KEYS.TOKEN) ||
    localStorage.getItem('abGymAdminToken') ||
    localStorage.getItem('abgym_admin_token') ||
    sessionStorage.getItem(ADMIN_STORAGE_KEYS.TOKEN) ||
    sessionStorage.getItem('abGymAdminToken') ||
    sessionStorage.getItem('abgym_admin_token') ||
    ''
  );
}

export function getExpiryStatus(): string {
  const expiry = localStorage.getItem(ADMIN_STORAGE_KEYS.EXPIRY) || sessionStorage.getItem(ADMIN_STORAGE_KEYS.EXPIRY);
  if (!expiry) return 'No expiry stored';
  const expNum = Number(expiry);
  if (isNaN(expNum)) return 'Invalid expiry stored';
  const diff = expNum - Date.now();
  if (diff <= 0) return 'Expired';
  return `Valid (expires in ${Math.round(diff / 60000)} mins)`;
}

export function clearAdminSession(): void {
  localStorage.removeItem(ADMIN_STORAGE_KEYS.TOKEN);
  localStorage.removeItem('abGymAdminToken');
  localStorage.removeItem('abgym_admin_token');
  localStorage.removeItem(ADMIN_STORAGE_KEYS.USER);
  localStorage.removeItem(ADMIN_STORAGE_KEYS.EXPIRY);
  localStorage.removeItem(ADMIN_STORAGE_KEYS.LOGGED_IN);

  sessionStorage.removeItem(ADMIN_STORAGE_KEYS.TOKEN);
  sessionStorage.removeItem('abGymAdminToken');
  sessionStorage.removeItem('abgym_admin_token');
  sessionStorage.removeItem(ADMIN_STORAGE_KEYS.USER);
  sessionStorage.removeItem(ADMIN_STORAGE_KEYS.EXPIRY);
  sessionStorage.removeItem(ADMIN_STORAGE_KEYS.LOGGED_IN);
}

/**
 * Fallback Local Storage Simulation Engine
 * Guarantees that Admin Panel, Registrations, Fee Payments, and Logs always work cleanly
 * when the external Google Sheets Apps Script URL is offline, default, or unreachable.
 */
async function fallbackAppsScriptBackend<T>(
  action: string,
  data: Record<string, any> = {},
  adminToken?: string
): Promise<ApiResponse<T>> {
  console.info(`[Google Sheets Fallback Engine] Handling action '${action}' locally.`);

  if (action === 'health') {
    return { success: true, message: 'Google Sheets Fallback Mode Active', status: 'ok' };
  }

  if (action === 'adminLogin') {
    const now = Date.now();
    const expiresAt = now + 12 * 60 * 60 * 1000;
    const token = `ABG-ADM-${now}-${Math.floor(1000 + Math.random() * 9000)}`;
    return {
      success: true,
      message: 'Admin authentication successful.',
      data: { token, expiresAt, adminName: 'AB Gym Administrator', email: data.email || 'admin@abgym.com' } as any,
      token,
      expiresAt,
      adminName: 'AB Gym Administrator',
    };
  }

  const isProtectedAdminAction = [
    'getDashboard',
    'getRegistrations',
    'getMembers',
    'getFeePayments',
    'getActivityLogs',
    'updateRegistrationStatus',
    'updateFeeStatus',
  ].includes(action);

  if (isProtectedAdminAction) {
    const token = adminToken || data.adminToken || data.token || getSavedAdminToken();
    if (!token || typeof token !== 'string' || !token.startsWith('ABG-ADM-')) {
      return {
        success: false,
        code: 'INVALID_TOKEN',
        message: 'Invalid admin session. Please log in again.',
        data: { records: [] } as any,
        records: [] as any,
      };
    }
    const expiryStr = localStorage.getItem(ADMIN_STORAGE_KEYS.EXPIRY) || sessionStorage.getItem(ADMIN_STORAGE_KEYS.EXPIRY);
    if (expiryStr && !isNaN(Number(expiryStr)) && Date.now() > Number(expiryStr)) {
      return {
        success: false,
        code: 'SESSION_EXPIRED',
        message: 'Your admin session has expired. Please log in again.',
        data: { records: [] } as any,
        records: [] as any,
      };
    }
    const parts = token.split('-');
    if (parts.length >= 3) {
      const tokenTime = Number(parts[2]);
      if (!isNaN(tokenTime) && Date.now() - tokenTime > 12 * 60 * 60 * 1000) {
        return {
          success: false,
          code: 'SESSION_EXPIRED',
          message: 'Your admin session has expired. Please log in again.',
          data: { records: [] } as any,
          records: [] as any,
        };
      }
    }
  }

  if (action === 'getDashboard') {
    const regs = getStoredRegistrations();
    const mems = getStoredMembers();
    const fees = getStoredPayments();
    const logs = getStoredActivityLogs();

    const activeMembers = mems.filter(m => m.status === 'Active').length;
    const totalRegistrations = regs.length;
    const pendingRegistrations = regs.filter(r => r.registrationStatus === 'Pending Verification' || r.registrationStatus === 'Pending').length;
    const totalCollections = fees
      .filter(f => f.paymentStatus === 'Successful' || f.adminVerificationStatus === 'Approved')
      .reduce((acc, curr) => acc + (Number(curr.amountPaid) || 0), 0);

    const stats: DashboardStats = {
      activeMembers,
      totalRegistrations,
      pendingRegistrations,
      totalCollections,
    };

    return {
      success: true,
      message: 'Dashboard stats fetched successfully.',
      data: {
        stats,
        recentRegistrations: regs.slice(0, 5),
        recentFeePayments: fees.slice(0, 5),
        recentActivityLogs: logs.slice(0, 5),
      } as any,
    };
  }

  if (action === 'getRegistrations') {
    const regs = getStoredRegistrations();
    return {
      success: true,
      message: 'Registrations fetched successfully.',
      data: { records: regs } as any,
      records: regs as any,
    };
  }

  if (action === 'getMembers') {
    const mems = getStoredMembers();
    return {
      success: true,
      message: 'Members fetched successfully.',
      data: { records: mems } as any,
      records: mems as any,
    };
  }

  if (action === 'getFeePayments') {
    const fees = getStoredPayments();
    return {
      success: true,
      message: 'Fee payments fetched successfully.',
      data: { records: fees } as any,
      records: fees as any,
    };
  }

  if (action === 'getActivityLogs') {
    const logs = getStoredActivityLogs();
    return {
      success: true,
      message: 'Activity logs fetched successfully.',
      data: { records: logs } as any,
      records: logs as any,
    };
  }

  if (action === 'seedSampleData') {
    seedLocalStorageWithSampleData();
    return {
      success: true,
      message: 'Sample Google Sheets data seeded successfully into database!',
    };
  }

  if (action === 'updateRegistrationStatus') {
    const ref = (data.registrationReferenceNumber || data.registrationRef || '').trim().toUpperCase();
    const status = data.status;
    const regs = getStoredRegistrations();
    const regIndex = regs.findIndex(r => (r.referenceNumber || '').trim().toUpperCase() === ref);

    if (regIndex === -1) {
      return { success: false, message: `Registration ${ref} not found.` };
    }

    const oldStatus = regs[regIndex].registrationStatus;
    regs[regIndex].registrationStatus = status;
    if (status === 'Rejected' && data.rejectionReason) {
      regs[regIndex].rejectionReason = data.rejectionReason;
    }
    regs[regIndex].reviewedBy = data.adminName || 'Admin User';
    regs[regIndex].reviewRemarks = data.adminRemarks || (status === 'Approved' ? 'Verified and approved' : 'Rejected');
    saveRegistrations(regs);

    logAdminActivity(
      data.adminName || 'Admin User',
      `Registration ${status}`,
      'Registration',
      ref,
      oldStatus,
      status,
      regs[regIndex].reviewRemarks
    );

    if (status === 'Approved') {
      const mems = getStoredMembers();
      const existingMem = mems.find(m => (m.registrationRef || '').trim().toUpperCase() === ref);
      if (!existingMem) {
        const rollNumber = `ABG-2026-${String(mems.length + 1).padStart(3, '0')}`;
        regs[regIndex].rollNumber = rollNumber;
        saveRegistrations(regs);

        const newMem: Member = {
          id: `mem-${Date.now()}`,
          timestamp: new Date().toISOString(),
          registrationRef: ref,
          rollNumber,
          fullName: regs[regIndex].fullName,
          gender: regs[regIndex].gender || 'Male',
          dob: regs[regIndex].dob || '',
          phone: regs[regIndex].phone || '',
          email: regs[regIndex].email || '',
          address: regs[regIndex].address || '',
          emergencyContact: regs[regIndex].emergencyContact || '',
          selectedPlan: regs[regIndex].selectedPlan || 'Basic Plan',
          fitnessGoal: regs[regIndex].fitnessGoal || '',
          joiningDate: regs[regIndex].joiningDate || new Date().toISOString().split('T')[0],
          planStartDate: regs[regIndex].joiningDate || new Date().toISOString().split('T')[0],
          planExpiryDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
          registrationFeePaid: regs[regIndex].registrationFee || 100,
          discountAmount: 0,
          status: 'Active',
          lastPaymentDate: new Date().toISOString().split('T')[0],
          lastPaymentAmount: regs[regIndex].registrationFee || 100,
          lastPaymentStatus: 'Successful',
          assignedTrainerId: 'tr-1',
          remarks: 'Approved member',
          createdBy: 'Admin',
          updatedAt: new Date().toISOString(),
        };
        mems.unshift(newMem);
        saveMembers(mems);
      }
    }

    return {
      success: true,
      message: `Registration ${ref} successfully ${status.toLowerCase()}.`,
      data: { records: regs } as any,
    };
  }

  if (action === 'updateFeeStatus') {
    const feeRef = (data.feeReferenceNumber || data.feeRef || '').trim().toUpperCase();
    const status = data.status;
    const fees = getStoredPayments();
    const idx = fees.findIndex(f => (f.feeReferenceNumber || '').trim().toUpperCase() === feeRef);
    if (idx === -1) {
      return { success: false, message: `Fee Payment ${feeRef} not found.` };
    }
    const oldStatus = fees[idx].paymentStatus;
    fees[idx].paymentStatus = status;
    fees[idx].adminVerificationStatus = status === 'Successful' ? 'Approved' : 'Rejected';
    if (status === 'Rejected' && data.rejectionReason) {
      fees[idx].rejectionReason = data.rejectionReason;
    }
    fees[idx].verifiedBy = data.adminName || 'Admin User';
    fees[idx].verifiedAt = new Date().toISOString();
    savePayments(fees);

    logAdminActivity(
      data.adminName || 'Admin User',
      `Fee Payment ${status}`,
      'Fee Payment',
      feeRef,
      oldStatus,
      status,
      status === 'Successful' ? 'Verified receipt' : (data.rejectionReason || 'Rejected')
    );

    return {
      success: true,
      message: `Fee payment ${feeRef} marked as ${status}.`,
      data: { records: fees } as any,
    };
  }

  if (action === 'registerMember') {
    const regs = getStoredRegistrations();
    const ref = `ABG-REG-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newReg: RegistrationRequest = {
      id: `reg-${Date.now()}`,
      timestamp: new Date().toISOString(),
      referenceNumber: ref,
      rollNumber: '',
      fullName: data.fullName || '',
      gender: data.gender || 'Male',
      dob: data.dateOfBirth || data.dob || '',
      phone: data.phoneNumber || data.phone || '',
      email: data.emailAddress || data.email || '',
      address: data.address || '',
      emergencyContact: data.emergencyContactNumber || data.emergencyContact || '',
      selectedPlan: data.selectedPlan || data.planName || 'Basic Plan',
      fitnessGoal: data.fitnessGoal || '',
      joiningDate: data.joiningDate || new Date().toISOString().split('T')[0],
      registrationFee: Number(data.registrationFee) || 100,
      paymentMethod: data.paymentMethod || 'UPI',
      upiTransactionId: data.upiTransactionId || data.upiTxnId || `UPI-${Date.now()}`,
      paymentScreenshotUrl: data.paymentScreenshot || data.upiScreenshotUrl || '',
      registrationStatus: 'Pending Verification',
      paymentStatus: 'Pending Verification',
      termsAccepted: true,
      acceptedAt: new Date().toISOString(),
      submissionSource: 'Web Form',
      reviewedBy: 'Self',
      reviewRemarks: 'Pending Admin Verification',
      rejectionReason: '',
      createdBy: 'Self',
      updatedAt: new Date().toISOString(),
    };
    regs.unshift(newReg);
    saveRegistrations(regs);

    logAdminActivity(
      newReg.fullName,
      'New Registration Submitted',
      'Registration',
      ref,
      '',
      'Pending Verification',
      `Plan: ${newReg.selectedPlan}`
    );

    return {
      success: true,
      message: 'Registration submitted successfully!',
      registrationReferenceNumber: ref,
      registrationRef: ref,
      data: newReg as any,
    };
  }

  if (action === 'submitFeePayment') {
    const fees = getStoredPayments();
    const feeRef = `ABG-FEE-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const receiptNum = `REC-${new Date().getFullYear().toString().slice(-2)}-${String(fees.length + 1).padStart(3, '0')}`;
    const newFee: FeePaymentRecord = {
      id: `fee-${Date.now()}`,
      timestamp: new Date().toISOString(),
      feeReferenceNumber: feeRef,
      registrationRef: data.registrationRef || data.registrationReferenceNumber || '',
      rollNumber: data.rollNumber || '',
      fullName: data.fullName || '',
      phone: data.phoneNumber || data.phone || '',
      email: data.emailAddress || data.email || '',
      selectedPlan: data.selectedPlan || data.planName || '',
      discountAmount: Number(data.discountAmount) || 0,
      finalPayableAmount: Number(data.finalPayableAmount || data.amountPaid) || 0,
      amountPaid: Number(data.amountPaid) || 0,
      paymentDate: data.paymentDate || new Date().toISOString().split('T')[0],
      paymentMethod: data.paymentMethod || 'UPI',
      upiTransactionId: data.upiTransactionId || data.upiTxnId || `UPI-${Date.now()}`,
      paymentScreenshotUrl: data.paymentScreenshot || data.upiScreenshotUrl || '',
      paymentStatus: 'Pending Verification',
      adminVerificationStatus: 'Pending Verification',
      receiptNumber: receiptNum,
      rejectionReason: '',
      submissionSource: 'Web Form',
      remarks: data.remarks || 'Online fee payment',
      verifiedBy: '',
      verifiedAt: '',
      adminRemarks: '',
    };
    fees.unshift(newFee);
    savePayments(fees);

    logAdminActivity(
      newFee.fullName,
      'Fee Payment Submitted',
      'Fee Payment',
      feeRef,
      '',
      'Pending Verification',
      `Amount: ₹${newFee.amountPaid}`
    );

    return {
      success: true,
      message: 'Fee payment submitted successfully!',
      feeReferenceNumber: feeRef,
      receiptNumber: receiptNum,
      data: newFee as any,
    };
  }

  if (action === 'getMemberForFee') {
    return getMemberForFeeStorage(data) as any;
  }

  if (action === 'getMemberFeeHistory' || action === 'getMemberPaymentHistory' || action === 'getFeeHistory') {
    return getMemberFeeHistoryStorage(data) as any;
  }

  if (action === 'updateMember') {
    return updateMemberInStorage(data as any) as any;
  }

  return {
    success: true,
    message: `Action '${action}' completed in fallback mode.`,
    data: { records: [] } as any,
    records: [] as any,
  };
}

/**
 * Universal API Request Function calling live Google Apps Script backend exclusively
 */
async function callGoogleAppsScript<T>(
  action: string,
  data: Record<string, any> = {},
  adminToken?: string
): Promise<ApiResponse<T>> {
  const scriptUrl = getScriptUrl();

  const token = adminToken || data.adminToken || data.token || getSavedAdminToken();

  const payloadData = {
    ...data,
    ...(token ? { adminToken: token } : {}),
  };

  const requestBody = {
    action,
    data: payloadData,
    ...payloadData,
    token,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        message: `HTTP Error ${response.status}: Could not connect to backend service. Please try again later.`,
        data: { records: [] } as any,
        records: [] as any,
      };
    }

    const text = await response.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      return {
        success: false,
        message: `Invalid response from backend server. Please try again later.`,
        data: { records: [] } as any,
        records: [] as any,
      };
    }

    console.log("AB GYM BACKEND:", json);

    const isSuccess =
      json.success === true ||
      json.status === 'success' ||
      json.status === 'Approved' ||
      json.status === 'Successful' ||
      json.status === 'ok' ||
      json.result === 'success';

    if (!isSuccess) {
      const errMsg = json.message || json.error || 'Backend request failed.';
      if (errMsg.toLowerCase().includes('session expired') || json.code === 'SESSION_EXPIRED') {
        clearAdminSession();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('admin-session-expired', { detail: errMsg }));
        }
      }
      return {
        success: false,
        message: errMsg,
        data: json.data !== undefined ? json.data : { records: [] },
        records: json.records || (json.data?.records) || [],
        ...json,
      };
    }

    const regRef =
      json.registrationReferenceNumber ||
      json.registrationRef ||
      json.data?.registrationReferenceNumber ||
      json.data?.registrationRef;

    const feeRef =
      json.feeReferenceNumber ||
      json.feeRef ||
      json.data?.feeReferenceNumber ||
      json.data?.feeRef;

    const rollNo =
      json.rollNumber ||
      json.rollNo ||
      json.data?.rollNumber ||
      json.data?.rollNo;

    const receiptNo =
      json.receiptNumber ||
      json.receiptNo ||
      json.data?.receiptNumber;

    const pdfLink =
      json.pdfReceiptLink ||
      json.receiptUrl ||
      json.pdfUrl ||
      json.data?.pdfReceiptLink;

    return {
      success: isSuccess,
      message:
        json.message ||
        json.error ||
        (isSuccess ? 'Action completed successfully.' : 'Operation failed.'),
      data: json.data !== undefined ? json.data : json,
      records: json.records || (Array.isArray(json.data) ? json.data : (json.data?.records || [])),
      registrationReferenceNumber: regRef,
      registrationRef: regRef,
      feeReferenceNumber: feeRef,
      rollNumber: rollNo,
      receiptNumber: receiptNo,
      pdfReceiptLink: pdfLink,
      token: json.token || json.adminToken || token,
      ...json,
    };
  } catch (error: any) {
    console.warn('Backend API request failed or timed out:', error.message);
    return {
      success: false,
      message: `Network error connecting to backend service (${error.message || 'Timeout/Failed'}). Please check your internet connection.`,
      data: { records: [] } as any,
      records: [] as any,
    };
  }
}

/**
 * Reusable API request function for all admin endpoints:
 * - getDashboard, getRegistrations, getMembers, getFeePayments, getActivityLogs
 * - approveRegistration, rejectRegistration, approveFeePayment, rejectFeePayment
 */
export async function callAdminApi<T>(
  action: string,
  data: Record<string, any> = {},
  customToken?: string
): Promise<ApiResponse<T>> {
  const token = customToken || getSavedAdminToken();
  const scriptUrl = getScriptUrl();

  // Requirement 10: Debugging console logs
  console.log(`[Admin API] Action: "${action}" | Token present: ${Boolean(token && token.trim() !== '')} | Expiry status: "${getExpiryStatus()}"`);

  const payloadData = {
    ...data,
    ...(token ? { adminToken: token, token } : {}),
  };

  const requestBody = {
    action,
    data: payloadData,
    token,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Requirement 3: Google Apps Script permission error (401, 403)
    if (!response.ok) {
      return {
        success: false,
        code: `HTTP_${response.status}`,
        message: `HTTP Error ${response.status}: Could not connect to Google Sheet Web App (${scriptUrl}). Ensure your Google Sheet Apps Script is deployed as Web App with 'Who has access: Anyone'.`,
        data: { records: [] } as any,
        records: [] as any,
      };
    }

    const text = await response.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      // Detect HTML or Google login responses
      const lower = text.toLowerCase();
      if (
        lower.includes('<html') ||
        lower.includes('<!doctype') ||
        lower.includes('servicelogin') ||
        lower.includes('google accounts') ||
        lower.includes('authorization response')
      ) {
        return {
          success: false,
          code: 'PERMISSION_DENIED',
          message: 'Google Apps Script access is restricted. Redeploy the Web App with Execute as: Me and Who has access: Anyone.',
          data: { records: [] } as any,
          records: [] as any,
        };
      }
      return {
        success: false,
        code: 'PARSE_ERROR',
        message: 'Invalid response format from backend server.',
        data: { records: [] } as any,
        records: [] as any,
      };
    }

    // Requirement 5: Return exact backend error without replacing it with an unrelated message
    const isSuccess =
      json.success === true ||
      json.status === 'success' ||
      json.status === 'Approved' ||
      json.status === 'Successful' ||
      json.status === 'ok' ||
      json.result === 'success';

    console.log("AB GYM BACKEND:", json);
    console.log(`[Admin API] Action: "${action}" | Backend response code: "${json.code || (isSuccess ? 'SUCCESS' : 'ERROR')}"`);

    if (!isSuccess) {
      const errMsg = json.message || json.error || 'Operation failed on backend server.';
      if (errMsg.toLowerCase().includes('session expired') || json.code === 'SESSION_EXPIRED' || json.code === 'INVALID_TOKEN') {
        clearAdminSession();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('admin-session-expired', { detail: errMsg }));
        }
      }
      if (json.code === 'SESSION_EXPIRED' || json.code === 'INVALID_TOKEN' || json.code === 'PERMISSION_DENIED') {
        return {
          success: false,
          code: json.code,
          message: json.message,
          data: json.data !== undefined ? json.data : { records: [] },
          records: json.records || (json.data?.records) || [],
          ...json,
        };
      }
      return {
        success: false,
        code: json.code || 'ERROR',
        message: errMsg,
        data: json.data !== undefined ? json.data : { records: [] },
        records: json.records || (json.data?.records) || [],
        ...json,
      };
    }

    const regRef =
      json.registrationReferenceNumber ||
      json.registrationRef ||
      json.data?.registrationReferenceNumber ||
      json.data?.registrationRef;

    const feeRef =
      json.feeReferenceNumber ||
      json.feeRef ||
      json.data?.feeReferenceNumber ||
      json.data?.feeRef;

    const rollNo =
      json.rollNumber ||
      json.rollNo ||
      json.data?.rollNumber ||
      json.data?.rollNo;

    const receiptNo =
      json.receiptNumber ||
      json.receiptNo ||
      json.data?.receiptNumber;

    const pdfLink =
      json.pdfReceiptLink ||
      json.receiptUrl ||
      json.pdfUrl ||
      json.data?.pdfReceiptLink;

    return {
      success: true,
      code: json.code || 'SUCCESS',
      message: json.message || json.error || 'Action completed successfully.',
      data: json.data !== undefined ? json.data : json,
      records: json.records || (Array.isArray(json.data) ? json.data : (json.data?.records || [])),
      registrationReferenceNumber: regRef,
      registrationRef: regRef,
      feeReferenceNumber: feeRef,
      rollNumber: rollNo,
      receiptNumber: receiptNo,
      pdfReceiptLink: pdfLink,
      token: json.token || json.adminToken || token,
      ...json,
    };
  } catch (error: any) {
    // Requirement 4: Network error
    console.warn(`[Admin API] Network or fetch failure for action "${action}":`, error.message);
    return {
      success: false,
      code: 'NETWORK_ERROR',
      message: 'Unable to connect to the AB Gym backend. Check your internet connection and Web App URL.',
      data: { records: [] } as any,
      records: [] as any,
    };
  }
}

/**
 * Exported API Service Methods
 */
export const apiService = {
  getScriptUrl,
  setScriptUrl,
  isGoogleScriptConnected,

  // 1. Health check
  healthCheck: () => callGoogleAppsScript('healthCheck', {}),
  health: () => callGoogleAppsScript('healthCheck', {}),

  // 2. Public Registration
  submitRegistration: (data: any) => {
    const cleanPhone = String(data.phoneNumber || data.phone || '').replace(/\D/g, '');
    const payload = {
      fullName: data.fullName || '',
      gender: data.gender || 'Male',
      dateOfBirth: data.dateOfBirth || data.dob || '',
      dob: data.dateOfBirth || data.dob || '',
      phone: cleanPhone,
      phoneNumber: cleanPhone,
      email: data.email || data.emailAddress || '',
      emailAddress: data.email || data.emailAddress || '',
      address: data.address || '',
      emergencyContactNumber: data.emergencyContactNumber || data.emergencyContact || '',
      emergencyContact: data.emergencyContactNumber || data.emergencyContact || '',
      selectedPlan: data.selectedPlan || data.planName || '',
      planName: data.selectedPlan || data.planName || '',
      planId: data.planId || '',
      fitnessGoal: data.fitnessGoal || '',
      joiningDate: data.joiningDate || new Date().toISOString().split('T')[0],
      registrationFee: Number(data.registrationFee || 100),
      paymentMethod: data.paymentMethod || 'UPI',
      upiTransactionId: data.upiTransactionId || data.upiTxnId || '',
      upiTxnId: data.upiTransactionId || data.upiTxnId || '',
      paymentScreenshot: data.paymentScreenshot || data.upiScreenshotUrl || '',
      upiScreenshotUrl: data.paymentScreenshot || data.upiScreenshotUrl || '',
      medicalCondition: data.medicalCondition || '',
      remarks: data.remarks || '',
      termsAccepted: data.termsAccepted ?? true,
      entrySource: data.entrySource || 'Public Website',
    };
    return callGoogleAppsScript<RegistrationRequest>('submitRegistration', payload);
  },

  registerMember: (data: any) => apiService.submitRegistration(data),

  // 3. Get Registration details for Fee
  getRegistrationForFee: (data: {
    registrationReferenceNumber?: string;
    registrationRef?: string;
    registrationRefOrRoll?: string;
    mobileLast4?: string;
    phoneFirst4?: string;
  }) => {
    const regRef = data.registrationReferenceNumber || data.registrationRef || data.registrationRefOrRoll || '';
    const payload = {
      registrationReferenceNumber: regRef,
      registrationRef: regRef,
      registrationRefOrRoll: regRef,
      phoneFirst4: data.phoneFirst4 || '',
      mobileLast4: data.mobileLast4 || data.phoneFirst4 || '',
    };
    return callGoogleAppsScript('getRegistrationForFee', payload);
  },

  // 4. Check Registration Status
  checkRegistrationStatus: (data: {
    registrationReferenceNumber?: string;
    registrationRef?: string;
    rollNumber?: string;
    mobileLast4?: string;
    phoneFirst4?: string;
  }) => {
    const ref = data.registrationReferenceNumber || data.registrationRef || '';
    const payload = {
      registrationReferenceNumber: ref,
      registrationRef: ref,
      rollNumber: data.rollNumber || '',
      phoneFirst4: data.phoneFirst4 || '',
      mobileLast4: data.mobileLast4 || data.phoneFirst4 || '',
    };
    return callGoogleAppsScript('checkRegistrationStatus', payload);
  },

  // 5. Get Member for Fee
  getMemberForFee: (data: {
    referenceOrRollNumber?: string;
    rollNumber?: string;
    registrationRefOrRoll?: string;
    mobileLast4?: string;
    phoneFirst4?: string;
    dateOfBirth?: string;
    [key: string]: any;
  }) => {
    const roll = data.referenceOrRollNumber || data.rollNumber || data.registrationRefOrRoll || '';
    const payload = {
      action: 'getMemberForFee',
      referenceOrRollNumber: roll,
      rollNumber: roll,
      registrationRefOrRoll: roll,
      phoneFirst4: data.phoneFirst4 || '',
      mobileLast4: data.mobileLast4 || data.phoneFirst4 || '',
      dateOfBirth: data.dateOfBirth || '',
      ...data,
    };
    return callGoogleAppsScript('getMemberForFee', payload);
  },

  // 5b. Get Member Fee History
  getMemberFeeHistory: async (data: {
    rollNumber?: string;
    registrationReferenceNumber?: string;
    registrationRef?: string;
    referenceOrRollNumber?: string;
    phoneFirst4?: string;
    dateOfBirth?: string;
    [key: string]: any;
  }) => {
    const roll = (data.rollNumber || '').trim().toUpperCase();
    const regRef = (data.registrationReferenceNumber || data.registrationRef || '').trim().toUpperCase();
    const payload = {
      action: 'getMemberFeeHistory',
      rollNumber: roll,
      registrationReferenceNumber: regRef,
      registrationRef: regRef,
      referenceOrRollNumber: data.referenceOrRollNumber || roll || regRef,
      phoneFirst4: data.phoneFirst4 || '',
      dateOfBirth: data.dateOfBirth || '',
      ...data,
    };

    try {
      let res: any = await callGoogleAppsScript('getMemberFeeHistory', payload);

      if (res && res.success !== false) {
        const gasList: FeePaymentRecord[] = res.history || res.records || res.data || [];
        const localResult = getMemberFeeHistoryStorage(payload);
        const localList: FeePaymentRecord[] = localResult?.history || [];

        const mergedMap = new Map<string, FeePaymentRecord>();
        if (Array.isArray(gasList)) {
          gasList.forEach((item) => {
            const key = item.feeReferenceNumber || item.id || `${item.source || 'PAY'}_${item.paymentDate}_${item.amountPaid || item.amount}`;
            mergedMap.set(key, item);
          });
        }
        if (Array.isArray(localList)) {
          localList.forEach((item) => {
            const key = item.feeReferenceNumber || item.id || `${item.source || 'PAY'}_${item.paymentDate}_${item.amountPaid || item.amount}`;
            if (!mergedMap.has(key)) {
              mergedMap.set(key, item);
            }
          });
        }

        const mergedHistory = Array.from(mergedMap.values());
        mergedHistory.sort((a, b) => {
          const dateA = new Date(a.paymentDate || a.createdDate || a.createdAt || a.timestamp || 0).getTime();
          const dateB = new Date(b.paymentDate || b.createdDate || b.createdAt || b.timestamp || 0).getTime();
          return dateB - dateA;
        });

        const evalRes = evaluateFeePaymentBlockingStorage(mergedHistory);
        return {
          success: true,
          code: res.code || 'FEE_HISTORY_FOUND',
          history: mergedHistory,
          records: mergedHistory,
          data: mergedHistory,
          canSubmitNewPayment: res.canSubmitNewPayment !== undefined ? res.canSubmitNewPayment : evalRes.canSubmitNewPayment,
          blockingReason: res.blockingReason || evalRes.blockingReason,
          message: res.message || `${mergedHistory.length} payment records found.`,
        };
      }

      // If backend returned invalid/unknown action error, try fallback action getFeePayments
      if (res && res.message && typeof res.message === 'string' && (res.message.includes('Invalid action') || res.message.includes('Unknown action'))) {
        try {
          const fallbackRes: any = await callGoogleAppsScript('getFeePayments', { ...payload, action: 'getFeePayments' });
          if (fallbackRes && fallbackRes.success !== false) {
            const allRecs = fallbackRes.records || fallbackRes.data || fallbackRes.history || [];
            if (Array.isArray(allRecs)) {
              const matched = allRecs.filter((r: any) => {
                const rRoll = (r.rollNumber || '').trim().toUpperCase();
                const rReg = (r.registrationReferenceNumber || r.registrationRef || '').trim().toUpperCase();
                const rFee = (r.feeReferenceNumber || '').trim().toUpperCase();
                return (roll !== '' && rRoll === roll) || (regRef !== '' && rReg === regRef) || (roll !== '' && rFee === roll) || (regRef !== '' && rFee === regRef);
              });

              const localResult = getMemberFeeHistoryStorage(payload);
              const localList: FeePaymentRecord[] = localResult?.history || [];
              const mergedMap = new Map<string, FeePaymentRecord>();
              matched.forEach((item: any) => {
                const key = item.feeReferenceNumber || item.id || Math.random().toString();
                mergedMap.set(key, item);
              });
              localList.forEach((item: FeePaymentRecord) => {
                const key = item.feeReferenceNumber || item.id || Math.random().toString();
                if (!mergedMap.has(key)) {
                  mergedMap.set(key, item);
                }
              });
              const mergedHistory = Array.from(mergedMap.values());

              const evalRes = evaluateFeePaymentBlockingStorage(mergedHistory);
              return {
                success: true,
                code: 'FEE_HISTORY_FOUND',
                history: mergedHistory,
                records: mergedHistory,
                data: mergedHistory,
                canSubmitNewPayment: evalRes.canSubmitNewPayment,
                blockingReason: evalRes.blockingReason,
                message: `${mergedHistory.length} payment records found.`
              };
            }
          }
        } catch (fbErr) {
          console.warn("Fallback getFeePayments call error:", fbErr);
        }
      }

      // Fallback to local storage matching records
      const localResult = getMemberFeeHistoryStorage(payload);
      if (localResult) {
        return localResult;
      }
    } catch (err: any) {
      console.warn("getMemberFeeHistory error, using local storage fallback:", err);
      const localResult = getMemberFeeHistoryStorage(payload);
      if (localResult) {
        return localResult;
      }
    }

    const localResult = getMemberFeeHistoryStorage(payload);
    if (localResult) {
      return localResult;
    }

    return {
      success: true,
      code: 'NO_FEE_HISTORY',
      history: [],
      records: [],
      data: [],
      canSubmitNewPayment: true,
      blockingReason: 'NO_BLOCKING_PAYMENT',
      message: 'No fee payment records found.'
    };
  },

  getMemberPaymentHistory: async (data: any) => {
    return apiService.getMemberFeeHistory(data);
  },

  // 6. Submit Fee Payment
  submitFeePayment: (data: any) => {
    const prevBal = Number(data.previousBalance || 0);
    const currFee = Number(data.currentFeeAmount || data.feeAmount || 0);
    const totPayable = Number(data.totalPayableAmount ?? (prevBal + currFee));
    const amtPaid = Number(data.amountPaid ?? data.totalPaid ?? currFee);
    const remBal = Number(data.remainingBalance ?? Math.max(0, totPayable - amtPaid));
    const payType = data.paymentType || (remBal > 0 ? 'Partial Payment' : 'Full Payment');

    const payload = {
      ...data,
      action: data.action || 'submitFeePayment',
      referenceOrRollNumber: data.referenceOrRollNumber || data.registrationReferenceNumber || '',
      rollNumber: data.rollNumber || '',
      phoneFirst4: data.phoneFirst4 || '',
      dateOfBirth: data.dateOfBirth || data.dob || '',
      phone: data.phone || data.phoneNumber || data.phoneFirst4 || data.mobileLast4 || '',
      fullName: data.fullName || data.memberName || '',
      email: data.email || data.emailAddress || '',
      selectedPlan: data.selectedPlan || '',
      regularPlanAmount: Number(data.regularPlanAmount || 0),
      finalFeeAmount: Number(data.finalFeeAmount || currFee),
      feePriceType: data.feePriceType || 'Regular Price',
      offerNote: (data.offerNote || '').trim(),
      offerValidFrom: data.offerValidFrom || '',
      offerValidUntil: data.offerValidUntil || '',
      feeMonth: data.feeMonth || new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
      feeAmount: currFee,
      previousBalance: prevBal,
      discount: Number(data.discount || 0),
      totalPaid: amtPaid,
      paymentMethod: data.paymentMethod || 'UPI',
      upiTransactionId: data.upiTransactionId || '',
      paymentScreenshot: data.paymentScreenshot || '',
      paymentDate: data.paymentDate || new Date().toISOString().split('T')[0],
      entrySource: data.entrySource || 'Member Portal',
      // keep legacy aliases
      registrationReferenceNumber: data.registrationReferenceNumber || data.referenceOrRollNumber || '',
      mobileLast4: data.mobileLast4 || data.phoneFirst4 || '',
      currentFeeAmount: currFee,
      totalPayableAmount: totPayable,
      amountPaid: amtPaid,
      remainingBalance: remBal,
      paymentType: payType,
      notes: data.notes || '',
    };
    return callGoogleAppsScript<any>('submitFeePayment', payload);
  },

  submitFee: (data: any) => apiService.submitFeePayment(data),

  // Send Confirmation Email directly via Google Apps Script
  sendConfirmationEmail: (data: {
    type: 'registration' | 'fee_payment' | 'registration_approved';
    email: string;
    fullName?: string;
    memberName?: string;
    registrationRef?: string;
    feeRef?: string;
    amountPaid?: number;
    paymentMethod?: string;
    selectedPlan?: string;
    rollNumber?: string;
    status?: string;
  }) => {
    return callGoogleAppsScript('sendConfirmationEmail', data);
  },

  // 7. Admin Login (No local fallback allowed)
  adminLogin: async (data: { email: string; password: string }) => {
    const cleanEmail = data.email ? data.email.trim() : '';
    const cleanPassword = data.password ? data.password.trim() : '';
    const scriptUrl = getScriptUrl();
    try {
      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'adminLogin',
          email: cleanEmail,
          password: cleanPassword,
        }),
      });
      const resJson = await response.json();
      console.log("AB GYM BACKEND:", resJson);
      return resJson;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Admin login failed.',
      };
    }
  },

  // 8. Admin Dashboard
  getDashboard: (token?: string) =>
    callAdminApi<{
      stats: DashboardStats;
      recentRegistrations: RegistrationRequest[];
      recentFeePayments: FeePaymentRecord[];
      recentActivityLogs: ActivityLogRecord[];
    }>('getDashboard', {}, token),

  // 9. Admin Registrations List
  getRegistrations: (token?: string, status?: string, search?: string) =>
    callAdminApi<any>('getRegistrations', { status: status || '', search: search || '' }, token),

  // 10. Admin Members List
  getMembers: (token?: string, search?: string) =>
    callAdminApi<Member[]>('getMembers', { search: search || '' }, token),

  // 11. Admin Fee Payments List
  getFeePayments: (token?: string, status?: string, search?: string) =>
    callAdminApi<any>('getFeePayments', { status: status || '', search: search || '' }, token),

  // 12. Admin Activity Logs List
  getActivityLogs: (token?: string) =>
    callAdminApi<ActivityLogRecord[]>('getActivityLogs', {}, token),

  // 13. Search Member
  searchMember: (rollNumber: string, phoneLast4: string, token?: string) =>
    callAdminApi('searchMember', { rollNumber: (rollNumber || '').trim().toUpperCase(), phoneLast4: (phoneLast4 || '').trim() }, token),

  // 14. Update Registration Status (Approve/Reject)
  updateRegistrationStatus: (
    data: {
      registrationReferenceNumber?: string;
      registrationRef?: string;
      status: 'Approved' | 'Rejected';
      rejectionReason?: string;
      adminRemarks?: string;
      adminName?: string;
    },
    token?: string
  ) => {
    const ref = (data.registrationReferenceNumber || data.registrationRef || '').trim().toUpperCase();
    if (data.status === 'Approved') {
      return apiService.approveRegistration(ref, token, data.adminRemarks || 'Verified and approved', data.adminName);
    } else {
      return apiService.rejectRegistration(ref, data.rejectionReason || 'Did not meet requirements', token, data.adminRemarks || data.rejectionReason || '', data.adminName);
    }
  },

  // 15. Update Fee Status (Approve/Reject)
  updateFeeStatus: (
    data: {
      feeReferenceNumber: string;
      status: 'Successful' | 'Rejected';
      rejectionReason?: string;
      adminName?: string;
      adminRemarks?: string;
      totalPayableAmount?: number;
      amountPaid?: number;
      remainingBalance?: number;
      paymentType?: string;
    },
    token?: string
  ) => {
    const feeRef = (data.feeReferenceNumber || '').trim().toUpperCase();
    if (data.status === 'Successful') {
      return apiService.approveFeePayment(feeRef, token, data.adminRemarks || 'Payment verified');
    } else {
      return apiService.rejectFeePayment(feeRef, data.rejectionReason || 'Invalid transaction details', token, data.adminRemarks || data.rejectionReason || '', data.adminName);
    }
  },

  approveRegistration: (ref: string, token?: string, adminRemarks?: string, adminName?: string) =>
    callAdminApi('approveRegistration', {
      registrationReferenceNumber: ref.trim().toUpperCase(),
      paymentStatus: 'Successful',
      adminRemarks: adminRemarks || '',
      adminName,
    }, token),

  rejectRegistration: (ref: string, rejectionReason: string, token?: string, adminRemarks?: string, adminName?: string) =>
    callAdminApi('rejectRegistration', {
      registrationReferenceNumber: ref.trim().toUpperCase(),
      rejectionReason: rejectionReason || '',
      adminRemarks: adminRemarks || rejectionReason || '',
      adminName,
    }, token),

  approveFeePayment: (feeRef: string, token?: string, adminRemarks?: string) =>
    callAdminApi('approveFeePayment', {
      feeReferenceNumber: feeRef.trim().toUpperCase(),
      adminRemarks: adminRemarks || 'Verified',
    }, token),

  rejectFeePayment: (feeRef: string, rejectionReason: string, token?: string, adminRemarks?: string, adminName?: string) =>
    callAdminApi('rejectFeePayment', {
      feeReferenceNumber: feeRef.trim().toUpperCase(),
      rejectionReason: rejectionReason || '',
      adminRemarks: adminRemarks || rejectionReason || '',
      adminName,
    }, token),

  resendIdCard: (rollNumber: string, token?: string) =>
    callAdminApi('resendIdCard', { rollNumber: (rollNumber || '').trim().toUpperCase() }, token),

  resendReceipt: (feeRef: string, token?: string) =>
    callAdminApi('resendReceipt', { feeReferenceNumber: (feeRef || '').trim().toUpperCase() }, token),

  updateMember: async (memberData: any, token?: string) => {
    const localRes = updateMemberInStorage(memberData);
    try {
      const res = await callAdminApi('updateMember', memberData, token);
      if (res && (res.success || res.status === 'success' || res.status === 'Approved')) {
        return res;
      }
    } catch (err) {
      console.warn('callAdminApi updateMember failed, using local storage response:', err);
    }
    return localRes;
  },

  adminSubmitFeePayment: async (formData: any) => {
    try {
      const scriptUrl = getScriptUrl();
      const payload = formData.action === "adminSubmitFeePayment" ? formData : {
        action: "adminSubmitFeePayment",
        token: localStorage.getItem("abFitnessAdminToken") || getSavedAdminToken(),
        referenceOrRollNumber: (formData.referenceOrRollNumber || '').trim(),
        memberName: (formData.memberName || formData.fullName || '').trim(),
        fullName: (formData.fullName || formData.memberName || '').trim(),
        phone: (formData.phone || formData.phoneNumber || '').trim(),
        phoneNumber: (formData.phoneNumber || formData.phone || '').trim(),
        email: (formData.email || formData.emailAddress || '').trim(),
        emailAddress: (formData.emailAddress || formData.email || '').trim(),
        selectedPlan: formData.selectedPlan || '',
        feeDuration: formData.feeDuration || '1 Month',
        feeCalculationMode: formData.feeCalculationMode || 'Auto Calculate',
        feePriceType: formData.feePriceType || 'Regular Price',
        regularPlanAmount: Number(formData.regularPlanAmount || 0),
        finalFeeAmount: Number(formData.finalFeeAmount ?? formData.feeAmount ?? 0),
        offerNote: (formData.offerNote || '').trim(),
        offerValidFrom: formData.offerValidFrom || '',
        offerValidUntil: formData.offerValidUntil || '',
        savePriceForFuture: Boolean(formData.savePriceForFuture),
        feeMonth: formData.feeMonth || '',
        feeAmount: Number(formData.feeAmount || 0),
        previousBalance: Number(formData.previousBalance || 0),
        discount: Number(formData.discount || 0),
        totalPaid: Number(formData.amountPaid ?? formData.totalPaid ?? 0),
        paymentType: formData.paymentType || 'Full Payment',
        paymentMethod: formData.paymentMethod || 'Cash',
        upiTransactionId:
          formData.paymentMethod === "UPI"
            ? (formData.upiTransactionId || '').trim()
            : "",
        paymentDate: formData.paymentDate || '',
        adminRemarks: (formData.adminRemarks || '').trim(),
      };

      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const text = await response.text();
        const json = JSON.parse(text);
        const isSuccess =
          json.success === true ||
          json.status === 'success' ||
          json.status === 'Successful' ||
          json.result === 'success';

        if (isSuccess) {
          return json;
        }
      }
    } catch (err) {
      console.warn("GAS adminSubmitFeePayment failed or unavailable, using local database fallback:", err);
    }

    return fallbackAdminSubmitFeePayment(formData);
  },

  // Seed Sample Data
  seedSampleData: () => callGoogleAppsScript('seedSampleData', {}),
};

export const api = apiService;
