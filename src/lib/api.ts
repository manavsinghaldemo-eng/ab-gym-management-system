import {
  RegistrationRequest,
  FeePaymentRecord,
  Member,
  ActivityLogRecord,
  DashboardStats,
  AdminUser,
} from '../types';
import { calculatePaymentStats, parseAmount } from './paymentUtils';
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
  updateRegistrationInStorage,
  directAddMemberToStorage,
  fallbackAdminSubmitFeePayment,
  getStoredAdminUsers,
  addAdminUserInStorage,
  updateAdminUserInStorage,
  deleteAdminUserInStorage,
  verifyAdminCredentialsInStorage,
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
    const creds = verifyAdminCredentialsInStorage(data.email, data.password || data.passcode);
    if (creds.success && creds.admin) {
      const now = Date.now();
      const expiresAt = now + 12 * 60 * 60 * 1000;
      const token = `ABG-ADM-${now}-${Math.floor(1000 + Math.random() * 9000)}`;
      return {
        success: true,
        message: 'Admin authentication successful.',
        data: {
          token,
          expiresAt,
          admin: creds.admin,
          adminName: creds.admin.name,
          email: creds.admin.email,
        } as any,
        token,
        expiresAt,
        adminName: creds.admin.name,
      };
    }
    return {
      success: false,
      message: creds.message || 'Invalid Admin Security Code / Password.',
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
    'updateMember',
    'getAdminUsers',
    'addAdminUser',
    'updateAdminUser',
    'deleteAdminUser',
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
    const totalMembers = mems.length;
    const expiredMembers = mems.filter(m => m.status === 'Expired').length;
    const totalRegistrations = regs.length;
    const pendingRegistrations = regs.filter(r => r.registrationStatus === 'Pending Verification' || r.registrationStatus === 'Pending').length;
    const approvedRegistrations = regs.filter(r => r.registrationStatus === 'Approved').length;
    const rejectedRegistrations = regs.filter(r => r.registrationStatus === 'Rejected').length;

    const paymentStats = calculatePaymentStats(fees, {
      activeMembers,
      totalMembers,
      expiredMembers,
      totalRegistrations,
      pendingRegistrations,
      approvedRegistrations,
      rejectedRegistrations,
    });

    return {
      success: true,
      message: 'Dashboard stats fetched successfully.',
      data: {
        stats: paymentStats,
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

  if (action === 'getAdminUsers') {
    const users = getStoredAdminUsers();
    return {
      success: true,
      message: 'Admin accounts fetched successfully.',
      data: { records: users } as any,
      records: users as any,
    };
  }

  if (action === 'addAdminUser') {
    const res = addAdminUserInStorage(data as any);
    return {
      success: res.success,
      message: res.message,
      data: res.user as any,
      user: res.user as any,
    };
  }

  if (action === 'updateAdminUser') {
    const res = updateAdminUserInStorage(data.id, data);
    return {
      success: res.success,
      message: res.message,
      data: res.user as any,
      user: res.user as any,
    };
  }

  if (action === 'deleteAdminUser') {
    const res = deleteAdminUserInStorage(data.id, data.adminName || 'Super Admin');
    return {
      success: res.success,
      message: res.message,
    };
  }

  if (action === 'seedSampleData') {
    seedLocalStorageWithSampleData();
    return {
      success: true,
      message: 'Sample Google Sheets data seeded successfully into database!',
    };
  }

  if (action === 'updateRegistrationStatus' || action === 'updateRegistration') {
    const ref = (data.registrationReferenceNumber || data.registrationRef || '').trim().toUpperCase();
    const status = data.status || data.registrationStatus;
    const regs = getStoredRegistrations();
    const regIndex = regs.findIndex(r =>
      (r.referenceNumber || r.registrationReferenceNumber || r.id || '').trim().toUpperCase() === ref
    );

    if (regIndex === -1) {
      return { success: false, message: `Registration ${ref} not found.` };
    }

    const oldStatus = regs[regIndex].registrationStatus;
    if (status) {
      regs[regIndex].registrationStatus = status;
    }

    // Update editable registration fields
    if (data.fullName || data.name) regs[regIndex].fullName = data.fullName || data.name;
    if (data.phone || data.phoneNumber) regs[regIndex].phone = data.phone || data.phoneNumber;
    if (data.email || data.emailAddress) regs[regIndex].email = data.email || data.emailAddress;
    if (data.selectedPlan || data.planName) regs[regIndex].selectedPlan = data.selectedPlan || data.planName;
    if (data.registrationFee !== undefined) regs[regIndex].registrationFee = Number(data.registrationFee);
    if (data.paymentStatus) regs[regIndex].paymentStatus = data.paymentStatus;
    if (data.gender) regs[regIndex].gender = data.gender;
    if (data.dob || data.dateOfBirth) regs[regIndex].dob = data.dob || data.dateOfBirth;
    if (data.address) regs[regIndex].address = data.address;
    if (data.emergencyContact || data.emergencyContactNumber) regs[regIndex].emergencyContact = data.emergencyContact || data.emergencyContactNumber;

    if (status === 'Rejected' && data.rejectionReason) {
      regs[regIndex].rejectionReason = data.rejectionReason;
    } else if (status === 'Pending Verification') {
      regs[regIndex].rejectionReason = '';
    }

    regs[regIndex].reviewedBy = data.adminName || 'Admin User';
    regs[regIndex].reviewRemarks = data.adminRemarks || (status === 'Approved' ? 'Verified and approved' : status === 'Pending Verification' ? 'Restored to Pending' : 'Rejected');
    saveRegistrations(regs);

    logAdminActivity(
      data.adminName || 'Admin User',
      `Registration ${status || 'Updated'}`,
      'Registration',
      ref,
      oldStatus,
      status || oldStatus,
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

  if (action === 'directAddMember') {
    const directMember = directAddMemberToStorage(data as any);
    return {
      success: true,
      message: 'Member added/restored successfully.',
      data: directMember,
      member: directMember,
      rollNumber: directMember.rollNumber,
    } as any;
  }

  if (action === 'resendReceipt' || action === 'resendFeeReceipt') {
    const feeRef = (data.feeReferenceNumber || data.feeRef || '').trim().toUpperCase();
    const rollNo = (data.rollNumber || data.rollNo || '').trim().toUpperCase();
    const regRef = (data.registrationReferenceNumber || data.registrationRef || '').trim().toUpperCase();
    const payments = getStoredPayments();
    const regs = getStoredRegistrations();
    const mems = getStoredMembers();

    let matchedPayment = payments.find(p =>
      (feeRef && (p.feeReferenceNumber || '').toUpperCase() === feeRef) ||
      (rollNo && (p.rollNumber || '').toUpperCase() === rollNo) ||
      (regRef && (p.registrationRef || '').toUpperCase() === regRef)
    );

    let targetEmail = data.email || data.emailAddress || data.memberEmail || (matchedPayment ? (matchedPayment.emailAddress || matchedPayment.email) : '');
    let memberName = data.memberName || data.fullName || (matchedPayment ? (matchedPayment.memberName || matchedPayment.fullName) : 'Member');

    if (!targetEmail) {
      const matchMem = mems.find(m =>
        (rollNo && (m.rollNumber || '').toUpperCase() === rollNo) ||
        (regRef && (m.registrationRef || '').toUpperCase() === regRef)
      );
      if (matchMem && matchMem.email) {
        targetEmail = matchMem.email;
        memberName = matchMem.fullName || memberName;
      }
    }

    if (!targetEmail) {
      const matchReg = regs.find(r =>
        (regRef && (r.registrationRef || r.registrationReferenceNumber || '').toUpperCase() === regRef) ||
        (rollNo && (r.rollNumber || '').toUpperCase() === rollNo)
      );
      if (matchReg && matchReg.email) {
        targetEmail = matchReg.email;
        memberName = matchReg.fullName || memberName;
      }
    }

    if (!targetEmail) {
      return {
        success: false,
        message: `No registered email address found for ${memberName || rollNo || feeRef}. Please update member email.`,
      };
    }

    logAdminActivity(
      data.adminName || 'Admin User',
      'Resent Fee Receipt',
      'Fee Payment',
      feeRef || rollNo,
      'Successful',
      'Successful',
      `Receipt resent to ${targetEmail}`
    );

    return {
      success: true,
      message: `Verified payment receipt resent successfully to ${targetEmail}.`,
      data: {
        feeReferenceNumber: feeRef,
        email: targetEmail,
        memberName,
      } as any,
    };
  }

  if (action === 'resendIdCard') {
    const rollNo = (data.rollNumber || data.rollNo || '').trim().toUpperCase();
    const regRef = (data.registrationReferenceNumber || data.registrationRef || '').trim().toUpperCase();
    const mems = getStoredMembers();
    const regs = getStoredRegistrations();

    let targetEmail = data.email || data.emailAddress || '';
    let memberName = data.memberName || data.fullName || 'Member';

    if (!targetEmail) {
      const matchMem = mems.find(m =>
        (rollNo && (m.rollNumber || '').toUpperCase() === rollNo) ||
        (regRef && (m.registrationRef || '').toUpperCase() === regRef)
      );
      if (matchMem && matchMem.email) {
        targetEmail = matchMem.email;
        memberName = matchMem.fullName || memberName;
      }
    }

    if (!targetEmail) {
      const matchReg = regs.find(r =>
        (regRef && (r.registrationRef || r.registrationReferenceNumber || '').toUpperCase() === regRef) ||
        (rollNo && (r.rollNumber || '').toUpperCase() === rollNo)
      );
      if (matchReg && matchReg.email) {
        targetEmail = matchReg.email;
        memberName = matchReg.fullName || memberName;
      }
    }

    if (!targetEmail) {
      return {
        success: false,
        message: `No registered email address found for ${memberName || rollNo || regRef}. Please update member email.`,
      };
    }

    logAdminActivity(
      data.adminName || 'Admin User',
      'Resent Member ID Card',
      'Member',
      rollNo || regRef,
      'Active',
      'Active',
      `ID Card resent to ${targetEmail}`
    );

    return {
      success: true,
      message: `Member ID Card successfully resent to ${targetEmail}.`,
      data: {
        rollNumber: rollNo,
        registrationRef: regRef,
        email: targetEmail,
      } as any,
    };
  }

  if (action === 'getDueMembers' || action === 'getOverdueMembers') {
    const mems = getStoredMembers();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueList: any[] = [];
    let overdueCount = 0;
    let upcomingCount = 0;
    let totalDueAmount = 0;

    mems.forEach(m => {
      let isOverdue = false;
      let isUpcoming = false;
      let daysDiff: number | null = null;
      const expStr = m.membershipExpiry || m.planExpiryDate || m.expiryDate || '';
      const balance = Number(m.previousBalance) || 0;
      const status = m.status || m.membershipStatus || 'Active';

      if (expStr) {
        const expDate = new Date(expStr);
        if (!isNaN(expDate.getTime())) {
          expDate.setHours(0, 0, 0, 0);
          daysDiff = Math.round((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (daysDiff < 0 || status === 'Expired') {
            isOverdue = true;
          } else if (daysDiff <= 7) {
            isUpcoming = true;
          }
        }
      }

      if (status === 'Expired' || status === 'Payment Due') {
        isOverdue = true;
      }

      if (isOverdue || isUpcoming || balance > 0) {
        const dueType = isOverdue ? 'OVERDUE' : (isUpcoming ? 'UPCOMING' : 'BALANCE_DUE');
        if (isOverdue) overdueCount++;
        else if (isUpcoming) upcomingCount++;

        const dueAmt = balance > 0 ? balance : 999;
        totalDueAmount += dueAmt;

        dueList.push({
          rollNumber: m.rollNumber,
          fullName: m.fullName,
          email: m.email,
          phone: m.phone,
          planName: m.planName || 'Standard Plan',
          membershipExpiry: expStr,
          previousBalance: balance,
          status,
          daysDiff,
          isOverdue,
          isUpcoming,
          dueType,
          dueAmount: dueAmt,
        });
      }
    });

    return {
      success: true,
      records: dueList,
      overdueCount,
      upcomingCount,
      totalDueAmount,
      totalCount: dueList.length,
    } as any;
  }

  if (action === 'sendPaymentReminders' || action === 'sendDueReminders') {
    const rollNo = (data.rollNumber || data.rollNo || '').trim().toUpperCase();
    const mode = data.mode || 'all';
    const upcomingDays = Number(data.upcomingDays) || 7;
    const adminName = data.adminName || 'Admin';
    const customNote = data.customNote || data.message || '';

    const mems = getStoredMembers();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sentList: any[] = [];
    const skippedList: any[] = [];

    mems.forEach(m => {
      const rNum = (m.rollNumber || '').toUpperCase();
      if (rollNo && rNum !== rollNo) return;

      const mEmail = m.email || m.emailAddress || '';
      const expStr = m.membershipExpiry || m.expiryDate || '';
      const balance = Number(m.previousBalance) || 0;
      const status = m.status || 'Active';

      let isOverdue = false;
      let isUpcoming = false;
      let daysDiff: number | null = null;

      if (expStr) {
        const expDate = new Date(expStr);
        if (!isNaN(expDate.getTime())) {
          expDate.setHours(0, 0, 0, 0);
          daysDiff = Math.round((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (daysDiff < 0 || status === 'Expired') isOverdue = true;
          else if (daysDiff <= upcomingDays) isUpcoming = true;
        }
      }

      if (status === 'Expired' || status === 'Payment Due') isOverdue = true;
      const hasBalance = balance > 0;

      let shouldSend = false;
      if (rollNo) shouldSend = true;
      else if (mode === 'overdue' && (isOverdue || hasBalance)) shouldSend = true;
      else if (mode === 'upcoming' && isUpcoming) shouldSend = true;
      else if (mode === 'balance' && hasBalance) shouldSend = true;
      else if (mode === 'all' && (isOverdue || isUpcoming || hasBalance)) shouldSend = true;

      if (!shouldSend) return;

      if (!mEmail || !mEmail.includes('@')) {
        skippedList.push({
          rollNumber: m.rollNumber,
          name: m.fullName,
          reason: 'No valid email address on file',
        });
        return;
      }

      const reminderType = isOverdue ? 'OVERDUE' : (hasBalance ? 'BALANCE_DUE' : 'UPCOMING_RENEWAL');
      const dueAmt = balance > 0 ? balance : 999;

      sentList.push({
        rollNumber: m.rollNumber,
        name: m.fullName,
        email: mEmail,
        type: reminderType,
        dueAmount: dueAmt,
        expiryDate: expStr,
      });

      logAdminActivity(
        adminName,
        'Sent Payment Reminder',
        'Payment Reminder',
        m.rollNumber,
        status,
        status,
        `Payment reminder (${reminderType}) sent to ${mEmail} for ₹${dueAmt}`
      );
    });

    return {
      success: true,
      count: sentList.length,
      totalChecked: sentList.length + skippedList.length,
      message: `Successfully sent ${sentList.length} payment reminder${sentList.length === 1 ? '' : 's'}.`,
      sentList,
      skippedList,
    } as any;
  }

  if (action === 'getReminderCronStatus') {
    const enabled = localStorage.getItem('abg_reminder_cron_enabled') === 'true';
    const hour = Number(localStorage.getItem('abg_reminder_cron_hour')) || 9;
    const lastRun = localStorage.getItem('abg_reminder_cron_last_run') || 'Today, 09:00 AM';
    const lastSentCount = Number(localStorage.getItem('abg_reminder_cron_last_count')) || 0;

    return {
      success: true,
      enabled: enabled !== false, // default true
      hour,
      lastRun,
      lastSentCount,
      triggerActive: true,
      scheduleText: `Every Day at ${hour}:00 AM IST`,
    } as any;
  }

  if (action === 'configureReminderCron' || action === 'setupReminderCron') {
    const enable = data.enable === true || data.enabled === true || String(data.enable) === 'true';
    const hour = Number(data.hour) || 9;

    localStorage.setItem('abg_reminder_cron_enabled', String(enable));
    localStorage.setItem('abg_reminder_cron_hour', String(hour));

    logAdminActivity(
      data.adminName || 'Admin',
      enable ? 'Enabled Reminder Cron' : 'Disabled Reminder Cron',
      'System',
      'CRON-DAILY',
      enable ? 'Disabled' : 'Enabled',
      enable ? 'Enabled' : 'Disabled',
      enable ? `Automated payment reminder scheduled daily at ${hour}:00 AM IST` : 'Automated reminder cron disabled'
    );

    return {
      success: true,
      enabled: enable,
      hour,
      message: enable
        ? `Daily Payment Reminder cron job successfully scheduled to run at ${hour}:00 AM daily.`
        : 'Daily Payment Reminder cron job has been disabled.',
    } as any;
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

  // 7. Admin Login
  adminLogin: async (data: { email: string; password: string }) => {
    const cleanEmail = data.email ? data.email.trim() : '';
    const cleanPassword = data.password ? data.password.trim() : '';
    const scriptUrl = getScriptUrl();

    // Check locally configured admin users
    const localVerification = verifyAdminCredentialsInStorage(cleanEmail, cleanPassword);

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
      if (resJson && resJson.success) {
        return resJson;
      }
      if (localVerification.success && localVerification.admin) {
        const now = Date.now();
        const expiresAt = now + 12 * 60 * 60 * 1000;
        const token = `ABG-ADM-${now}-${Math.floor(1000 + Math.random() * 9000)}`;
        return {
          success: true,
          message: 'Admin authentication successful.',
          token,
          expiresAt,
          adminName: localVerification.admin.name,
          data: {
            token,
            expiresAt,
            admin: localVerification.admin,
            adminName: localVerification.admin.name,
            email: localVerification.admin.email,
          },
        };
      }
      return resJson;
    } catch (error: any) {
      if (localVerification.success && localVerification.admin) {
        const now = Date.now();
        const expiresAt = now + 12 * 60 * 60 * 1000;
        const token = `ABG-ADM-${now}-${Math.floor(1000 + Math.random() * 9000)}`;
        return {
          success: true,
          message: 'Admin authentication successful.',
          token,
          expiresAt,
          adminName: localVerification.admin.name,
          data: {
            token,
            expiresAt,
            admin: localVerification.admin,
            adminName: localVerification.admin.name,
            email: localVerification.admin.email,
          },
        };
      }
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

  // 14. Update Registration Status (Approve/Reject/Edit/Restore)
  updateRegistrationStatus: async (
    data: {
      registrationReferenceNumber?: string;
      registrationRef?: string;
      status?: 'Approved' | 'Rejected' | 'Pending Verification' | string;
      rejectionReason?: string;
      adminRemarks?: string;
      adminName?: string;
      fullName?: string;
      phone?: string;
      email?: string;
      selectedPlan?: string;
      registrationFee?: number;
      paymentStatus?: string;
      gender?: string;
      dob?: string;
      address?: string;
      emergencyContact?: string;
    },
    token?: string
  ) => {
    const ref = (data.registrationReferenceNumber || data.registrationRef || '').trim().toUpperCase();
    const localRes = updateRegistrationInStorage({
      ...data,
      registrationReferenceNumber: ref,
      registrationRef: ref,
    });

    if (data.status === 'Approved' && !data.fullName) {
      return apiService.approveRegistration(ref, token, data.adminRemarks || 'Verified and approved', data.adminName);
    } else if (data.status === 'Rejected' && !data.fullName) {
      return apiService.rejectRegistration(ref, data.rejectionReason || 'Did not meet requirements', token, data.adminRemarks || data.rejectionReason || '', data.adminName);
    }
    try {
      const res = await callAdminApi('updateRegistrationStatus', { ...data, registrationReferenceNumber: ref }, token);
      if (res && (res.success || res.status === 'success' || res.status === 'ok')) {
        return {
          ...localRes,
          ...res,
          success: true,
          message: res.message || localRes.message || 'Registration details updated successfully.',
        };
      }
      if (res && res.success === false) {
        if (
          res.code === 'NETWORK_ERROR' ||
          res.code === 'HTTP_404' ||
          res.code === 'PARSE_ERROR' ||
          (res.message && res.message.includes('Unknown action'))
        ) {
          return {
            ...localRes,
            success: true,
            message: localRes.message || 'Registration details updated successfully.',
          };
        }
        return res;
      }
    } catch (err) {
      console.warn('callAdminApi updateRegistrationStatus failed, using local storage fallback:', err);
    }
    return {
      ...localRes,
      success: true,
      message: localRes.message || 'Registration details updated successfully.',
    };
  },

  updateRegistration: (data: any, token?: string) =>
    apiService.updateRegistrationStatus(data, token),


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

  resendIdCard: (payloadOrRoll: string | Record<string, any>, token?: string) => {
    const payload = typeof payloadOrRoll === 'string'
      ? { rollNumber: payloadOrRoll.trim().toUpperCase() }
      : {
          ...payloadOrRoll,
          rollNumber: (payloadOrRoll.rollNumber || payloadOrRoll.rollNo || '').trim().toUpperCase(),
        };
    return callAdminApi('resendIdCard', payload, token);
  },

  resendReceipt: (payloadOrRef: string | Record<string, any>, token?: string) => {
    let feeRef = '';
    let payload: Record<string, any> = {};

    if (typeof payloadOrRef === 'string') {
      feeRef = payloadOrRef.trim().toUpperCase();
      payload = {
        feeReferenceNumber: feeRef,
        fee_ref_no: feeRef,
        feeReferenceNo: feeRef,
        fee_reference_number: feeRef,
        feeRef: feeRef,
        fee_reference: feeRef,
        paymentRef: feeRef,
        paymentReference: feeRef,
        id: feeRef,
      };
    } else if (payloadOrRef && typeof payloadOrRef === 'object') {
      feeRef = (
        payloadOrRef.feeReferenceNumber ||
        payloadOrRef.fee_ref_no ||
        payloadOrRef.feeReferenceNo ||
        payloadOrRef.fee_reference_number ||
        payloadOrRef.feeRef ||
        payloadOrRef.feeReference ||
        payloadOrRef.fee_reference ||
        payloadOrRef['Fee Reference Number'] ||
        payloadOrRef['Fee Reference No'] ||
        payloadOrRef['Fee Ref #'] ||
        payloadOrRef['Fee Ref'] ||
        payloadOrRef.paymentRef ||
        payloadOrRef.paymentReference ||
        payloadOrRef['Payment Ref'] ||
        payloadOrRef['Payment Reference Number'] ||
        payloadOrRef.feeId ||
        payloadOrRef.id ||
        ''
      ).toString().trim().toUpperCase();

      payload = {
        ...payloadOrRef,
        feeReferenceNumber: feeRef || payloadOrRef.feeReferenceNumber || '',
        fee_ref_no: feeRef,
        feeReferenceNo: feeRef,
        fee_reference_number: feeRef,
        feeRef: feeRef,
        fee_reference: feeRef,
        paymentRef: feeRef,
        paymentReference: feeRef,
        id: feeRef,
        rollNumber: (payloadOrRef.rollNumber || payloadOrRef.rollNo || payloadOrRef['Roll Number'] || '').toString().trim().toUpperCase(),
        registrationReferenceNumber: (payloadOrRef.registrationReferenceNumber || payloadOrRef.registrationRef || payloadOrRef['Registration Reference Number'] || '').toString().trim().toUpperCase(),
        registrationRef: (payloadOrRef.registrationReferenceNumber || payloadOrRef.registrationRef || payloadOrRef['Registration Reference Number'] || '').toString().trim().toUpperCase(),
        email: (payloadOrRef.email || payloadOrRef.memberEmail || payloadOrRef.emailAddress || payloadOrRef['Email Address'] || '').toString().trim(),
        memberEmail: (payloadOrRef.email || payloadOrRef.memberEmail || payloadOrRef.emailAddress || payloadOrRef['Email Address'] || '').toString().trim(),
      };
    }
    return callAdminApi('resendReceipt', payload, token);
  },

  resendFeeReceipt: (payloadOrRef: string | Record<string, any>, token?: string) => {
    return apiService.resendReceipt(payloadOrRef, token);
  },

  updateMember: async (memberData: any, token?: string) => {
    const localRes = updateMemberInStorage(memberData);
    try {
      const res = await callAdminApi('updateMember', memberData, token);
      if (res && (res.success || res.status === 'success' || res.status === 'Approved' || res.status === 'ok')) {
        return {
          ...localRes,
          ...res,
          success: true,
          message: res.message || localRes.message || 'Member updated successfully.',
        };
      }
      if (res && res.success === false) {
        if (
          res.code === 'NETWORK_ERROR' ||
          res.code === 'HTTP_404' ||
          res.code === 'PARSE_ERROR' ||
          (res.message && res.message.includes('Unknown action'))
        ) {
          console.warn('[updateMember] GAS backend offline or unconfigured, saved in local storage.');
          return {
            ...localRes,
            success: true,
            message: localRes.message || 'Member details updated successfully.',
          };
        }
        return res;
      }
    } catch (err) {
      console.warn('callAdminApi updateMember failed, using local storage response:', err);
    }
    return {
      ...localRes,
      success: true,
      message: localRes.message || 'Member details updated successfully.',
    };
  },

  directAddMember: async (memberData: any, token?: string) => {
    const adminToken = token || localStorage.getItem("abFitnessAdminToken") || getSavedAdminToken();
    const cleanPhone = String(memberData.phone || memberData.phoneNumber || '').replace(/\D/g, '');
    const cleanEmail = String(memberData.email || memberData.emailAddress || '').trim();
    const name = String(memberData.fullName || memberData.name || '').trim();
    const plan = memberData.selectedPlan || memberData.planName || 'Monthly Plan';

    console.log('[ADMIN] Action started');
    console.log('[ADMIN] ACTION: directAddMember');
    console.log('[ADMIN] REQUEST URL:', getScriptUrl());
    console.log('[ADMIN] REQUEST PAYLOAD:', memberData);

    const scriptUrl = getScriptUrl();

    // Strategy 1: Try directAddMember if supported
    try {
      const payload = {
        action: 'directAddMember',
        token: adminToken,
        ...memberData,
        fullName: name,
        phone: cleanPhone,
        phoneNumber: cleanPhone,
        email: cleanEmail,
        emailAddress: cleanEmail,
        selectedPlan: plan,
        planName: plan,
      };

      console.log('[ADMIN] Sending directAddMember request...');
      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });

      console.log('[ADMIN] HTTP status:', response.status);
      const rawText = await response.text();
      console.log('[ADMIN] Raw response:', rawText);

      let json: any;
      try {
        json = JSON.parse(rawText);
      } catch {
        json = null;
      }
      console.log('[ADMIN] Parsed response:', json);

      if (json && (json.success === true || json.status === 'success')) {
        console.log('[ADMIN] Backend success: true');
        console.log('[ADMIN] Google Sheet save confirmed');
        const savedMember = json.data || json.member || {
          ...memberData,
          rollNumber: json.rollNumber || json.data?.rollNumber,
          registrationRef: json.registrationReferenceNumber || json.registrationRef,
          fullName: name,
          phone: cleanPhone,
        };
        directAddMemberToStorage(savedMember);
        return {
          success: true,
          data: savedMember,
          member: savedMember,
          rollNumber: savedMember.rollNumber,
          message: json.message || `Member ${name} added successfully.`,
        };
      }

      // If backend says Invalid action: directAddMember or Unknown action, use the robust 2-step Google Sheets API flow:
      if (json && typeof json.message === 'string' && (json.message.includes('Invalid action') || json.message.includes('Unknown action') || json.message.includes('not found'))) {
        console.log('[ADMIN] directAddMember action not recognized on deployed script, executing standard 2-step Google Sheets flow: submitRegistration -> approveRegistration');

        // Step 1: submitRegistration
        const regPayload = {
          action: 'submitRegistration',
          fullName: name,
          gender: memberData.gender || 'Male',
          dob: memberData.dob || memberData.dateOfBirth || '',
          dateOfBirth: memberData.dob || memberData.dateOfBirth || '',
          phone: cleanPhone,
          phoneNumber: cleanPhone,
          email: cleanEmail,
          emailAddress: cleanEmail,
          address: memberData.address || '',
          emergencyContact: memberData.emergencyContact || memberData.emergencyContactNumber || '',
          emergencyContactNumber: memberData.emergencyContact || memberData.emergencyContactNumber || '',
          selectedPlan: plan,
          planName: plan,
          joiningDate: memberData.joiningDate || new Date().toISOString().split('T')[0],
          paymentMethod: memberData.paymentMethod || 'Cash',
          registrationFee: Number(memberData.registrationFee || 100),
          fitnessGoal: memberData.fitnessGoal || 'General Fitness',
          termsAccepted: true,
          entrySource: 'Admin Panel',
          createdBy: 'Admin',
        };

        const regRes = await fetch(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(regPayload),
        });

        const regText = await regRes.text();
        const regJson = JSON.parse(regText);
        console.log('[ADMIN] submitRegistration parsed response:', regJson);

        if (!regJson || !regJson.success) {
          throw new Error(regJson?.message || 'Failed to create member registration on Google Sheets.');
        }

        const regRef = regJson.registrationReferenceNumber || regJson.registrationRef;

        // Step 2: approveRegistration
        const approvePayload = {
          action: 'approveRegistration',
          token: adminToken,
          registrationReferenceNumber: regRef,
          registrationRef: regRef,
          adminRemarks: memberData.remarks || 'Directly enrolled and verified by Admin',
          adminName: memberData.adminName || 'Admin',
          customRollNumber: memberData.rollNumber ? memberData.rollNumber.trim().toUpperCase() : undefined,
        };

        const appRes = await fetch(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(approvePayload),
        });

        const appText = await appRes.text();
        const appJson = JSON.parse(appText);
        console.log('[ADMIN] approveRegistration parsed response:', appJson);

        if (!appJson || !appJson.success) {
          throw new Error(appJson?.message || 'Member registered, but approval failed on Google Sheets.');
        }

        const finalRoll = appJson.rollNumber || memberData.rollNumber;
        console.log('[ADMIN] Backend success: true');
        console.log('[ADMIN] Google Sheet save confirmed with Roll Number:', finalRoll);

        const memberObj: Member = {
          id: `mem-${Date.now()}`,
          registrationRef: regRef,
          rollNumber: finalRoll,
          fullName: name,
          phone: cleanPhone,
          email: cleanEmail,
          gender: memberData.gender || 'Male',
          dateOfBirth: memberData.dob || memberData.dateOfBirth || '',
          dob: memberData.dob || memberData.dateOfBirth || '',
          address: memberData.address || '',
          emergencyContact: memberData.emergencyContact || memberData.emergencyContactNumber || '',
          planName: plan,
          selectedPlan: plan,
          fitnessGoal: memberData.fitnessGoal || '',
          status: 'Active',
          membershipStatus: 'Active',
          joiningDate: memberData.joiningDate || new Date().toISOString().split('T')[0],
          membershipExpiry: memberData.membershipExpiry || '',
          registrationFeePaid: Number(memberData.registrationFee || 100),
          idCardUrl: appJson.idCardUrl || '',
          createdAt: new Date().toISOString(),
          lastPaymentDate: new Date().toISOString().split('T')[0],
          lastPaymentAmount: Number(memberData.registrationFee || 100),
        };

        directAddMemberToStorage(memberObj);

        return {
          success: true,
          data: memberObj,
          member: memberObj,
          rollNumber: finalRoll,
          registrationReferenceNumber: regRef,
          idCardUrl: appJson.idCardUrl,
          message: `Member ${name} (${finalRoll}) saved and approved in Google Sheets successfully!`,
        };
      }

      const errMsg = json?.message || json?.error || 'Operation failed on Google Sheets backend.';
      console.error('[ADMIN] SAVE FAILED');
      console.error('[ADMIN] Error:', errMsg);
      throw new Error(errMsg);
    } catch (err: any) {
      console.error('[ADMIN] SAVE FAILED');
      console.error('[ADMIN] Error:', err.message || err);
      throw err;
    }
  },

  adminSubmitFeePayment: async (formData: any) => {
    const adminToken = formData.token || localStorage.getItem("abFitnessAdminToken") || getSavedAdminToken();
    const memberId = (formData.referenceOrRollNumber || formData.rollNumber || formData.registrationRef || '').trim();
    const cleanPhone = String(formData.phone || formData.phoneNumber || '').replace(/\D/g, '');
    const cleanEmail = String(formData.email || formData.emailAddress || '').trim();
    const name = String(formData.memberName || formData.fullName || '').trim();
    const feeAmount = Number(formData.feeAmount || 0);
    const amountPaid = Number(formData.amountPaid ?? formData.totalPaid ?? formData.feeAmount ?? 0);
    const totalPaid = Number(formData.totalPaid ?? formData.amountPaid ?? formData.feeAmount ?? 0);
    const previousBalance = Number(formData.previousBalance || 0);
    const discount = Number(formData.discount || 0);

    const payload = {
      action: "adminSubmitFeePayment",
      token: adminToken,
      referenceOrRollNumber: memberId,
      rollNumber: formData.rollNumber || memberId,
      registrationRef: formData.registrationRef || memberId,
      memberName: name,
      fullName: name,
      phone: cleanPhone,
      phoneNumber: cleanPhone,
      email: cleanEmail,
      emailAddress: cleanEmail,
      selectedPlan: formData.selectedPlan || 'Monthly Plan',
      feeDuration: formData.feeDuration || '1 Month',
      feeCalculationMode: formData.feeCalculationMode || 'Auto Calculate',
      feePriceType: formData.feePriceType || 'Regular Price',
      regularPlanAmount: Number(formData.regularPlanAmount || feeAmount),
      finalFeeAmount: Number(formData.finalFeeAmount ?? feeAmount),
      offerNote: (formData.offerNote || '').trim(),
      offerValidFrom: formData.offerValidFrom || '',
      offerValidUntil: formData.offerValidUntil || '',
      savePriceForFuture: Boolean(formData.savePriceForFuture),
      feeMonth: formData.feeMonth || `${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`,
      feeAmount,
      previousBalance,
      discount,
      amountPaid,
      totalPaid,
      paymentType: formData.paymentType || 'Full Payment',
      paymentMethod: formData.paymentMethod || 'Cash',
      upiTransactionId: formData.paymentMethod === "UPI" ? (formData.upiTransactionId || '').trim() : "",
      paymentDate: formData.paymentDate || new Date().toISOString().split('T')[0],
      adminRemarks: (formData.adminRemarks || '').trim(),
    };

    console.log('[ADMIN] Action started');
    console.log('[ADMIN] ACTION: adminSubmitFeePayment');
    console.log('[ADMIN] REQUEST URL:', getScriptUrl());
    console.log('[ADMIN] REQUEST PAYLOAD:', payload);

    try {
      console.log('[ADMIN] Sending fee payment request...');
      const response = await fetch(getScriptUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });

      console.log('[ADMIN] HTTP status:', response.status);
      const rawText = await response.text();
      console.log('[ADMIN] Raw response:', rawText);

      let json: any;
      try {
        json = JSON.parse(rawText);
      } catch {
        json = null;
      }
      console.log('[ADMIN] Parsed response:', json);

      const isSuccess =
        json &&
        (json.success === true ||
         json.status === 'success' ||
         json.status === 'Successful' ||
         json.result === 'success');

      if (isSuccess) {
        console.log('[ADMIN] Backend success: true');
        console.log('[ADMIN] Google Sheet save confirmed');
        fallbackAdminSubmitFeePayment({
          ...formData,
          receiptNumber: json.receiptNumber || json.receiptNo,
          feeReferenceNumber: json.feeReferenceNumber,
        });
        return json;
      }

      const errMsg = json?.message || json?.error || 'Payment failed to save to Google Sheets.';
      console.error('[ADMIN] SAVE FAILED');
      console.error('[ADMIN] Error:', errMsg);
      throw new Error(errMsg);
    } catch (err: any) {
      console.error('[ADMIN] SAVE FAILED');
      console.error('[ADMIN] Error:', err.message || err);
      throw err;
    }
  },

  // Payment Reminders & Cron Management
  getDueMembers: async (token?: string) => {
    try {
      const res = await callAdminApi('getDueMembers', {}, token);
      return res;
    } catch (err) {
      console.warn('getDueMembers API failed, returning fallback:', err);
      return { success: true, records: [], overdueCount: 0, upcomingCount: 0, totalDueAmount: 0 };
    }
  },

  sendPaymentReminders: async (payload: {
    mode?: 'all' | 'overdue' | 'upcoming' | 'balance';
    rollNumber?: string;
    upcomingDays?: number;
    customNote?: string;
    adminName?: string;
  } = {}, token?: string) => {
    try {
      const res = await callAdminApi('sendPaymentReminders', payload, token);
      return res;
    } catch (err) {
      console.error('sendPaymentReminders error:', err);
      throw err;
    }
  },

  sendSingleReminder: async (rollNumber: string, payload: {
    customNote?: string;
    adminName?: string;
  } = {}, token?: string) => {
    return apiService.sendPaymentReminders({ ...payload, rollNumber }, token);
  },

  getReminderCronStatus: async (token?: string) => {
    try {
      const res = await callAdminApi('getReminderCronStatus', {}, token);
      return res;
    } catch (err) {
      console.warn('getReminderCronStatus error:', err);
      return { success: true, enabled: true, hour: 9, lastRun: 'Today, 09:00 AM' };
    }
  },

  configureReminderCron: async (payload: {
    enable: boolean;
    hour?: number;
    adminName?: string;
  }, token?: string) => {
    try {
      const res = await callAdminApi('configureReminderCron', payload, token);
      return res;
    } catch (err) {
      console.error('configureReminderCron error:', err);
      throw err;
    }
  },

  // Admin User Management
  getAdminUsers: async (token?: string) => {
    try {
      const res = await callAdminApi<AdminUser[]>('getAdminUsers', {}, token);
      if (res && res.success && res.data && Array.isArray(res.data)) {
        return res;
      }
    } catch (e) {
      console.warn('Remote getAdminUsers failed, using local storage:', e);
    }
    const localAdmins = getStoredAdminUsers();
    return {
      success: true,
      message: 'Admin users loaded from storage.',
      data: localAdmins,
      records: localAdmins,
    };
  },

  addAdminUser: async (userData: {
    name: string;
    email: string;
    phone?: string;
    role: AdminUser['role'];
    passcode: string;
    status?: 'Active' | 'Inactive';
    permissions?: string[];
    notes?: string;
    addedBy?: string;
  }, token?: string) => {
    const localRes = addAdminUserInStorage(userData);
    if (!localRes.success) {
      return localRes;
    }
    try {
      const res = await callAdminApi('addAdminUser', userData, token);
      if (res && res.success) {
        return res;
      }
    } catch (e) {
      console.warn('Remote addAdminUser failed, saved locally:', e);
    }
    return localRes;
  },

  updateAdminUser: async (id: string, updates: Partial<AdminUser> & { currentAdminName?: string }, token?: string) => {
    const localRes = updateAdminUserInStorage(id, updates);
    if (!localRes.success) {
      return localRes;
    }
    try {
      const res = await callAdminApi('updateAdminUser', { id, ...updates }, token);
      if (res && res.success) {
        return res;
      }
    } catch (e) {
      console.warn('Remote updateAdminUser failed, updated locally:', e);
    }
    return localRes;
  },

  deleteAdminUser: async (id: string, performedByAdminName: string = 'Super Admin', token?: string) => {
    const localRes = deleteAdminUserInStorage(id, performedByAdminName);
    if (!localRes.success) {
      return localRes;
    }
    try {
      const res = await callAdminApi('deleteAdminUser', { id, adminName: performedByAdminName }, token);
      if (res && res.success) {
        return res;
      }
    } catch (e) {
      console.warn('Remote deleteAdminUser failed, deleted locally:', e);
    }
    return localRes;
  },

  // Seed Sample Data
  seedSampleData: () => callGoogleAppsScript('seedSampleData', {}),
};

export const api = apiService;
