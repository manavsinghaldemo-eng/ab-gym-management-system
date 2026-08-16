import {
  Member,
  RegistrationRequest,
  FeePaymentRecord,
  MembershipPlan,
  Trainer,
  GalleryItem,
  GymSettings,
  ActivityLogRecord,
  AttendanceRecord,
} from '../types';

import {
  INITIAL_MEMBERS,
  INITIAL_PLANS,
  INITIAL_TRAINERS,
  INITIAL_GALLERY,
  INITIAL_REGISTRATIONS,
  INITIAL_PAYMENTS,
  INITIAL_SETTINGS,
  INITIAL_ACTIVITY_LOGS,
  AB_FITNESS_UPI_ID,
} from '../data/initialData';

const KEYS = {
  MEMBERS: 'abgym_members_v1',
  REGISTRATIONS: 'abgym_registrations_v1',
  PAYMENTS: 'abgym_payments_v1',
  PLANS: 'abgym_plans_v1',
  TRAINERS: 'abgym_trainers_v1',
  GALLERY: 'abgym_gallery_v1',
  SETTINGS: 'abgym_settings_v1',
  FEE_SEQ: 'abgym_fee_seq_v1',
  ACTIVITY_LOGS: 'abgym_activity_logs_v1',
};

export const STORAGE_EVENT = 'abgym_storage_change';

function notifyStorageChange() {
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

function isDemoData(data: string | null): boolean {
  if (!data) return false;
  return (
    data.includes('Rahul Sharma') ||
    data.includes('Priya Patel') ||
    data.includes('Vikram Singh') ||
    data.includes('Amit Kumar') ||
    data.includes('ABG-REG-260724-1001') ||
    data.includes('ABG-REG-260724-1002') ||
    data.includes('ABG-REG-260724-1003') ||
    data.includes('ABG-REG-260724-1004') ||
    data.includes('ABG-FEE-260701-001') ||
    data.includes('ABG-FEE-260615-002') ||
    data.includes('ABG-FEE-260725-003') ||
    data.includes('mem-1') ||
    data.includes('mem-2') ||
    data.includes('mem-3') ||
    data.includes('reg-1') ||
    data.includes('reg-2') ||
    data.includes('reg-3') ||
    data.includes('reg-4') ||
    data.includes('fee-1') ||
    data.includes('fee-2') ||
    data.includes('fee-3') ||
    data.includes('log-1') ||
    data.includes('log-2') ||
    data.includes('log-3') ||
    data.includes('Manav Singhal')
  );
}

// Helpers - Local Storage and Fallback Persistence
export function getStoredMembers(): Member[] {
  const data = localStorage.getItem(KEYS.MEMBERS);
  if (!data || isDemoData(data)) {
    if (data && isDemoData(data)) localStorage.removeItem(KEYS.MEMBERS);
    return [];
  }
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveMembers(members: Member[]) {
  localStorage.setItem(KEYS.MEMBERS, JSON.stringify(members));
  notifyStorageChange();
}

export function getStoredRegistrations(): RegistrationRequest[] {
  const data = localStorage.getItem(KEYS.REGISTRATIONS);
  if (!data || isDemoData(data)) {
    if (data && isDemoData(data)) localStorage.removeItem(KEYS.REGISTRATIONS);
    return [];
  }
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveRegistrations(regs: RegistrationRequest[]) {
  localStorage.setItem(KEYS.REGISTRATIONS, JSON.stringify(regs));
  notifyStorageChange();
}

export function getStoredPayments(): FeePaymentRecord[] {
  const data = localStorage.getItem(KEYS.PAYMENTS);
  if (!data || isDemoData(data)) {
    if (data && isDemoData(data)) localStorage.removeItem(KEYS.PAYMENTS);
    return [];
  }
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function savePayments(payments: FeePaymentRecord[]) {
  localStorage.setItem(KEYS.PAYMENTS, JSON.stringify(payments));
  notifyStorageChange();
}

export function getStoredActivityLogs(): ActivityLogRecord[] {
  const data = localStorage.getItem(KEYS.ACTIVITY_LOGS);
  if (!data || isDemoData(data)) {
    if (data && isDemoData(data)) localStorage.removeItem(KEYS.ACTIVITY_LOGS);
    return [];
  }
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveActivityLogs(logs: ActivityLogRecord[]) {
  localStorage.setItem(KEYS.ACTIVITY_LOGS, JSON.stringify(logs));
  notifyStorageChange();
}

export function seedLocalStorageWithSampleData() {
  localStorage.removeItem(KEYS.MEMBERS);
  localStorage.removeItem(KEYS.REGISTRATIONS);
  localStorage.removeItem(KEYS.PAYMENTS);
  localStorage.removeItem(KEYS.ACTIVITY_LOGS);
  localStorage.setItem(KEYS.PLANS, JSON.stringify(INITIAL_PLANS));
  localStorage.setItem(KEYS.TRAINERS, JSON.stringify(INITIAL_TRAINERS));
  localStorage.setItem(KEYS.GALLERY, JSON.stringify(INITIAL_GALLERY));
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
  notifyStorageChange();
}

export function logAdminActivity(
  adminName: string,
  action: string,
  recordType: string,
  referenceNumber: string,
  oldStatus: string = '',
  newStatus: string = '',
  remarks: string = ''
) {
  const logs = getStoredActivityLogs();
  const newLog: ActivityLogRecord = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    adminName: adminName || 'Admin / System',
    action,
    recordType,
    referenceNumber: referenceNumber || 'N/A',
    oldStatus,
    newStatus,
    remarks,
  };
  logs.unshift(newLog);
  saveActivityLogs(logs);
}

export function getStoredPlans(): MembershipPlan[] {
  const data = localStorage.getItem(KEYS.PLANS);
  if (!data) {
    localStorage.setItem(KEYS.PLANS, JSON.stringify(INITIAL_PLANS));
    return INITIAL_PLANS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_PLANS;
  }
}

export function savePlans(plans: MembershipPlan[]) {
  localStorage.setItem(KEYS.PLANS, JSON.stringify(plans));
  notifyStorageChange();
}

export function getStoredTrainers(): Trainer[] {
  const data = localStorage.getItem(KEYS.TRAINERS);
  if (!data) {
    localStorage.setItem(KEYS.TRAINERS, JSON.stringify(INITIAL_TRAINERS));
    return INITIAL_TRAINERS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_TRAINERS;
  }
}

export function saveTrainers(trainers: Trainer[]) {
  localStorage.setItem(KEYS.TRAINERS, JSON.stringify(trainers));
  notifyStorageChange();
}

export function getStoredGallery(): GalleryItem[] {
  const data = localStorage.getItem(KEYS.GALLERY);
  if (!data) {
    localStorage.setItem(KEYS.GALLERY, JSON.stringify(INITIAL_GALLERY));
    return INITIAL_GALLERY;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_GALLERY;
  }
}

export function saveGallery(items: GalleryItem[]) {
  localStorage.setItem(KEYS.GALLERY, JSON.stringify(items));
  notifyStorageChange();
}

export function getStoredSettings(): GymSettings {
  const data = localStorage.getItem(KEYS.SETTINGS);
  if (!data) {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    return INITIAL_SETTINGS;
  }
  try {
    const parsed = JSON.parse(data);
    const currentUpi = parsed.upiId && parsed.upiId.includes('@') ? parsed.upiId : AB_FITNESS_UPI_ID;
    const phone = !parsed.phone || parsed.phone === '9868400688' ? INITIAL_SETTINGS.phone : parsed.phone;
    const email = !parsed.email || parsed.email === 'info@abgym.com' ? INITIAL_SETTINGS.email : parsed.email;
    const altPhone = parsed.altPhone === '011-28912345' ? '' : (parsed.altPhone || '');
    const merged = {
      ...INITIAL_SETTINGS,
      ...parsed,
      phone,
      email,
      altPhone,
      upiId: currentUpi,
      upiName: parsed.upiName || INITIAL_SETTINGS.upiName || 'AB Fitness',
      registrationFeeDefault: parsed.registrationFeeDefault ?? INITIAL_SETTINGS.registrationFeeDefault ?? 100,
      qrCodeUrl: parsed.qrCodeUrl ?? INITIAL_SETTINGS.qrCodeUrl ?? '',
    };
    if (parsed.upiId !== currentUpi || parsed.phone !== phone || parsed.email !== email) {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(merged));
    }
    return merged;
  } catch {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    return INITIAL_SETTINGS;
  }
}

export function saveSettings(settings: GymSettings) {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  notifyStorageChange();
}

/**
 * Generate AB Gym Roll Number based on 10-digit mobile number
 * Format: ABG-YY-Last4Digits
 * Example: 9868400688 -> ABG-26-0688
 * If duplicate exists: ABG-26-0688-02, ABG-26-0688-03
 */
export function generateRollNumber(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length < 4) {
    return 'ABG-26-XXXX';
  }

  const currentYearTwoDigits = new Date().getFullYear().toString().slice(-2);
  const last4 = cleanPhone.slice(-4);
  const baseRoll = `ABG-${currentYearTwoDigits}-${last4}`;

  const members = getStoredMembers();
  const regs = getStoredRegistrations();

  const allExistingRolls = [
    ...members.map((m) => m.rollNumber),
    ...regs.map((r) => r.rollNumber),
  ];

  if (!allExistingRolls.includes(baseRoll)) {
    return baseRoll;
  }

  // Find duplicate suffix count
  let index = 2;
  while (true) {
    const suffixed = `${baseRoll}-${index < 10 ? `0${index}` : index}`;
    if (!allExistingRolls.includes(suffixed)) {
      return suffixed;
    }
    index++;
  }
}

/**
 * Generate Registration Reference Number
 * Format: ABG-REG-YYMMDD-XXXX
 * Example: ABG-REG-260724-1284
 */
export function generateRegistrationRef(): string {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  const dd = now.getDate().toString().padStart(2, '0');
  const dateStr = `${yy}${mm}${dd}`;
  const randFour = Math.floor(1000 + Math.random() * 9000);
  return `ABG-REG-${dateStr}-${randFour}`;
}

/**
 * Generate Fee Reference Number
 * Format: ABG-FEE-YYMMDD-001
 * Increments sequentially per day
 */
export function generateFeeReferenceNumber(): string {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  const dd = now.getDate().toString().padStart(2, '0');
  const dateKey = `${yy}${mm}${dd}`;

  const seqData = localStorage.getItem(KEYS.FEE_SEQ);
  let seqMap: Record<string, number> = {};
  if (seqData) {
    try {
      seqMap = JSON.parse(seqData);
    } catch {
      seqMap = {};
    }
  }

  const currentCount = (seqMap[dateKey] || 0) + 1;
  seqMap[dateKey] = currentCount;
  localStorage.setItem(KEYS.FEE_SEQ, JSON.stringify(seqMap));

  const seqStr = currentCount.toString().padStart(3, '0');
  return `ABG-FEE-${dateKey}-${seqStr}`;
}

/**
 * Find Member by Roll Number or Phone or Email
 */
export function findMemberByRoll(query: string): Member | undefined {
  const trimmed = query.trim().toUpperCase();
  if (!trimmed) return undefined;
  const members = getStoredMembers();
  return members.find(
    (m) =>
      m.rollNumber.toUpperCase() === trimmed ||
      m.phone.replace(/\D/g, '') === trimmed.replace(/\D/g, '') ||
      m.email.toLowerCase() === query.trim().toLowerCase()
  );
}

/**
 * Helper to calculate updated membership expiry date when extending plan
 */
export function calculateExpiryDate(startDateStr: string, durationMonths: number): string {
  const start = new Date(startDateStr);
  if (isNaN(start.getTime())) {
    const today = new Date();
    today.setMonth(today.getMonth() + durationMonths);
    return today.toISOString().split('T')[0];
  }
  const expiry = new Date(start);
  expiry.setMonth(expiry.getMonth() + durationMonths);
  return expiry.toISOString().split('T')[0];
}

export interface GetMemberForFeeData {
  action?: string;
  registrationRefOrRoll?: string;
  referenceOrRollNumber?: string;
  rollNumber?: string;
  mobileLast4?: string;
  phoneLast4?: string;
  phoneFirst4?: string;
  phone?: string;
  dateOfBirth?: string;
  dob?: string;
}

export interface MemberFeeDetailsData {
  registrationRef: string;
  registrationReferenceNumber?: string;
  rollNumber: string;
  fullName: string;
  maskedPhone: string;
  emailAddress: string;
  selectedPlan: string;
  joiningDate: string;
  membershipStartDate: string;
  membershipExpiryDate: string;
  registrationStatus: string;
  memberStatus: string;
  paymentStatus: string;
  registrationFee: number;
  regularPlanAmount?: number | string;
  finalFeeAmount?: number | string;
  offerAmount?: number | string;
  feePriceType?: string;
  offerNote?: string;
  priceNote?: string;
  offerValidFrom?: string;
  offerValidUntil?: string;
  previousBalance: number | string;
  outstandingBalance?: number | string;
  discountAmount?: number | string;
  discount?: number | string;
  lastPaymentDate: string;
  lastPaymentAmount: number | string;
  lastPaymentStatus: string;
  planId?: string;
  id?: string;
  isPendingRegistration?: boolean;
}

export interface GetMemberForFeeResponse {
  success: boolean;
  code?: string;
  message: string;
  member?: any;
  data?: MemberFeeDetailsData;
  statusNotice?: string;
  statusNoticeType?: string;
}

export function normalizeDate(val: any): string {
  if (!val) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  let str = String(val).trim();
  if (!str) return '';

  if (str.includes('T')) {
    str = str.split('T')[0];
  }
  if (str.includes(' ')) {
    str = str.split(' ')[0];
  }

  str = str.replace(/\//g, '-');
  const parts = str.split('-');
  if (parts.length === 3) {
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    const p2 = parseInt(parts[2], 10);

    if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
      if (parts[0].length === 4) {
        const mm = String(p1).padStart(2, '0');
        const dd = String(p2).padStart(2, '0');
        return `${parts[0]}-${mm}-${dd}`;
      }
      if (parts[2].length === 4) {
        const mm = String(p1).padStart(2, '0');
        const dd = String(p0).padStart(2, '0');
        return `${parts[2]}-${mm}-${dd}`;
      }
    }
  }

  try {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  } catch (e) {}

  return str;
}

export function extractFirst4Digits(phone: string | number | null | undefined): string {
  const digits = String(phone || "").replace(/\D/g, "");
  const tenDigitPhone = digits.length > 10 ? digits.slice(-10) : digits;
  return tenDigitPhone.slice(0, 4);
}

/**
 * Fee Verification: Fetch record by Registration Reference Number or Roll Number + Mobile First 4 digits
 */
export function getMemberForFee(data: GetMemberForFeeData): GetMemberForFeeResponse {
  const rawRef = String(data.referenceOrRollNumber || data.registrationRefOrRoll || data.rollNumber || "").trim();
  const queryRefClean = rawRef.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const submittedPhoneFirst4 = extractFirst4Digits(data.phoneFirst4 || data.phoneLast4 || data.mobileLast4 || data.phone);
  const submittedDob = normalizeDate(data.dateOfBirth || data.dob);

  if (!queryRefClean) {
    return {
      success: false,
      code: "DETAILS_MISMATCH",
      message: "Member details do not match. Please check the entered information."
    };
  }

  let matchedRecord: any = null;
  let isFromMembers = false;

  // 1. First search Members list
  const members = getStoredMembers();
  for (const m of members) {
    const mRollClean = (m.rollNumber || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const mRefClean = (m.registrationRef || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    const memRefMatched = (mRollClean && mRollClean === queryRefClean) || (mRefClean && mRefClean === queryRefClean);
    if (memRefMatched) {
      const mPhoneFirst4 = extractFirst4Digits(m.phone);
      const mPhoneMatched = (!submittedPhoneFirst4 || !mPhoneFirst4 || submittedPhoneFirst4 === mPhoneFirst4);

      const mDob = normalizeDate(m.dob || (m as any).dateOfBirth);
      const mDobMatched = (!mDob || !submittedDob || mDob === submittedDob);

      if (mPhoneMatched && mDobMatched) {
        matchedRecord = {
          registrationRef: m.registrationRef || "",
          rollNumber: m.rollNumber,
          fullName: m.fullName,
          phone: m.phone || "",
          emailAddress: m.email || "",
          selectedPlan: m.planName || "",
          joiningDate: m.joiningDate || "",
          registrationStatus: 'Approved',
          registrationFee: 100
        };
        isFromMembers = true;
        break;
      }
    }
  }

  // 2. Fallback: Search Registrations list if not found in Members
  if (!matchedRecord) {
    const regs = getStoredRegistrations();
    for (const r of regs) {
      const rRefClean = (r.registrationRef || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      const rRollClean = (r.rollNumber || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

      const refMatched = (rRefClean && rRefClean === queryRefClean) || (rRollClean && rRollClean === queryRefClean && rRollClean !== 'UNASSIGNED');
      if (refMatched) {
        const storedPhoneFirst4 = extractFirst4Digits(r.phone);
        const phoneMatched = (!submittedPhoneFirst4 || !storedPhoneFirst4 || submittedPhoneFirst4 === storedPhoneFirst4);

        const storedDob = normalizeDate(r.dob || (r as any).dateOfBirth);
        const dobMatched = (!storedDob || !submittedDob || storedDob === submittedDob);

        if (phoneMatched && dobMatched) {
          matchedRecord = {
            registrationRef: r.registrationRef,
            rollNumber: r.rollNumber || "",
            fullName: r.fullName,
            phone: r.phone || "",
            emailAddress: r.email || "",
            selectedPlan: r.planName || "",
            joiningDate: r.joiningDate || "",
            registrationStatus: r.status,
            registrationFee: r.registrationFee || 100
          };
          break;
        }
      }
    }
  }

  // A. If no matching record exists
  if (!matchedRecord) {
    return {
      success: false,
      code: "DETAILS_MISMATCH",
      message: "Member details do not match. Please check the entered information."
    };
  }

  // B. Check Registration Status
  const status = String(matchedRecord.registrationStatus || '').trim().toLowerCase();

  if (status === 'rejected') {
    return {
      success: false,
      code: "REGISTRATION_REJECTED",
      message: "Your registration has been rejected. Please contact AB Gym before making a payment."
    };
  }

  if (
    status === '' ||
    status === 'pending' ||
    status === 'pending approval' ||
    status === 'pending verification' ||
    status === 'submitted' ||
    status === 'under review'
  ) {
    return {
      success: false,
      code: "REGISTRATION_PENDING",
      message: "Your registration has been received and is currently awaiting admin approval. The fee-payment facility will become available after your registration is approved. Please visit AB Gym reception or contact our team if you need assistance."
    };
  }

  if (
    status === 'approved' ||
    status === 'active' ||
    status === 'successful'
  ) {
    // Recover missing registrationRef if absent in Members record
    if (matchedRecord && !matchedRecord.registrationRef && matchedRecord.rollNumber) {
      const regs = getStoredRegistrations();
      const targetRollNorm = normalizeId(matchedRecord.rollNumber);
      for (const r of regs) {
        const rRollNorm = normalizeId(r.rollNumber);
        if (rRollNorm && rRollNorm === targetRollNorm) {
          if (r.registrationRef) {
            matchedRecord.registrationRef = r.registrationRef;
            break;
          }
        }
      }
    }

    const maskedPhone = matchedRecord.phone ? (`******${extractFirst4Digits(matchedRecord.phone)}`) : 'N/A';
    const payments = getStoredPayments();
    const existingPayment = payments.find(
      (p) => p.registrationRef === matchedRecord.registrationRef || (matchedRecord.rollNumber && p.rollNumber === matchedRecord.rollNumber)
    );

    const feeData: MemberFeeDetailsData & { registrationReferenceNumber?: string } = {
      registrationRef: matchedRecord.registrationRef,
      registrationReferenceNumber: matchedRecord.registrationRef,
      rollNumber: matchedRecord.rollNumber || "",
      fullName: matchedRecord.fullName,
      maskedPhone: maskedPhone,
      emailAddress: matchedRecord.emailAddress || "",
      selectedPlan: matchedRecord.selectedPlan || "",
      joiningDate: matchedRecord.joiningDate || "",
      membershipStartDate: matchedRecord.joiningDate || "",
      membershipExpiryDate: calculateExpiryDate(matchedRecord.joiningDate || new Date().toISOString(), 1),
      registrationStatus: 'Approved',
      memberStatus: 'Approved',
      paymentStatus: existingPayment ? existingPayment.status : 'Pending',
      registrationFee: matchedRecord.registrationFee || 100,
      previousBalance: 0,
      lastPaymentDate: existingPayment ? existingPayment.paymentDate : 'None',
      lastPaymentAmount: existingPayment ? existingPayment.amountPaid : 0,
      lastPaymentStatus: existingPayment ? existingPayment.status : 'None'
    };

    return {
      success: true,
      code: "MEMBER_VERIFIED",
      message: "Your registration has been approved.",
      member: feeData,
      data: feeData
    };
  }

  return {
    success: false,
    code: "DETAILS_MISMATCH",
    message: "Member details do not match. Please check the entered information."
  };
}

export function normalizeId(value: any): string {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
}

export function evaluateFeePaymentBlockingStorage(records: FeePaymentRecord[]): {
  canSubmitNewPayment: boolean;
  blockingReason: 'PAYMENT_ALREADY_SUCCESSFUL' | 'PAYMENT_PENDING_VERIFICATION' | 'PREVIOUS_PAYMENT_REJECTED' | 'NO_BLOCKING_PAYMENT';
} {
  if (!records || !Array.isArray(records) || records.length === 0) {
    return { canSubmitNewPayment: true, blockingReason: 'NO_BLOCKING_PAYMENT' };
  }

  let hasSuccessful = false;
  let hasPending = false;
  let hasRejected = false;

  for (const r of records) {
    const st = String(r.paymentStatus || r.status || '').trim().toLowerCase();
    if (['successful', 'success', 'approved', 'verified', 'paid', 'completed'].includes(st)) {
      hasSuccessful = true;
    } else if (['pending', 'pending verification', 'submitted', 'under review'].includes(st)) {
      hasPending = true;
    } else if (['rejected', 'declined', 'failed'].includes(st)) {
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

export function linkRollNumberToPaymentsStorage(regRef: string, rollNumber: string): void {
  const normRef = normalizeId(regRef);
  const normRoll = normalizeId(rollNumber);
  if (!normRef || !normRoll) return;

  const payments = getStoredPayments();
  let changed = false;

  payments.forEach((p) => {
    const pRef = normalizeId(p.registrationRef || p.registrationReferenceNumber);
    if (pRef === normRef) {
      if (!p.rollNumber || p.rollNumber === 'UNASSIGNED' || p.rollNumber !== normRoll) {
        p.rollNumber = rollNumber;
        changed = true;
      }
    }
  });

  if (changed) {
    savePayments(payments);
  }
}

export function getMemberFeeHistory(data: {
  rollNumber?: string;
  registrationReferenceNumber?: string;
  registrationRef?: string;
  referenceOrRollNumber?: string;
  phoneFirst4?: string;
  dateOfBirth?: string;
}): {
  success: boolean;
  code: string;
  message: string;
  history: FeePaymentRecord[];
  canSubmitNewPayment: boolean;
  blockingReason: string;
  recordCount: number;
  sourcesChecked: { registrations: boolean; feePayments: boolean };
} {
  const normRoll = normalizeId(data.rollNumber);
  const normRegRef = normalizeId(data.registrationReferenceNumber || data.registrationRef);
  const normRawRef = normalizeId(data.referenceOrRollNumber);

  const targetIds = Array.from(new Set([normRoll, normRegRef, normRawRef].filter(Boolean)));

  if (targetIds.length === 0) {
    return {
      success: false,
      code: 'INVALID_REQUEST',
      message: 'Roll number or registration reference number is required.',
      history: [],
      canSubmitNewPayment: false,
      blockingReason: 'NO_BLOCKING_PAYMENT',
      recordCount: 0,
      sourcesChecked: { registrations: false, feePayments: false }
    };
  }

  const combinedRecords: FeePaymentRecord[] = [];
  const sourcesChecked = { registrations: true, feePayments: true };

  // 1. Search Registrations for initial registration fee payment
  try {
    const storedRegs = getStoredRegistrations();
    storedRegs.forEach((r) => {
      const rAny = r as any;
      const rRoll = normalizeId(rAny.rollNumber);
      const rRegRef = normalizeId(rAny.registrationRef || rAny.registrationReferenceNumber || rAny.referenceNumber || rAny.regRef || rAny.id);

      const isMatch = targetIds.some(id => (rRoll && rRoll === id) || (rRegRef && rRegRef === id));

      if (isMatch) {
        const feeAmt = Number(rAny.registrationFee || rAny.amountPaid || rAny.finalFeeAmount || rAny.amount || rAny.feeAmount || 100);
        const txnId = rAny.upiTransactionId || rAny.upiTxnId || rAny.transactionId || '';
        const payMethod = rAny.paymentMethod || 'UPI';
        const displayRegRef = rAny.registrationRef || rAny.registrationReferenceNumber || rAny.referenceNumber || normRegRef || normRawRef;
        const displayRoll = rAny.rollNumber || normRoll || normRawRef;

        const regPayObj: FeePaymentRecord = {
          id: `reg-pay-${rAny.id || displayRegRef}`,
          source: 'REGISTRATION_PAYMENT',
          feeReferenceNumber: rAny.feeReferenceNumber || `REG-${displayRegRef}`,
          registrationReferenceNumber: displayRegRef,
          rollNumber: displayRoll,
          fullName: rAny.fullName || '',
          plan: rAny.selectedPlan || rAny.planName || '',
          selectedPlan: rAny.selectedPlan || rAny.planName || '',
          feeMonth: 'Registration',
          amount: String(feeAmt),
          feeAmount: feeAmt,
          currentFeeAmount: feeAmt,
          amountPaid: feeAmt,
          paymentMethod: payMethod,
          transactionId: txnId,
          upiTransactionId: txnId,
          paymentDate: rAny.paymentDate || rAny.createdDate || rAny.timestamp || rAny.createdAt || new Date().toISOString().split('T')[0],
          paymentStatus: rAny.paymentStatus || rAny.status || rAny.registrationStatus || 'Approved',
          status: rAny.paymentStatus || rAny.status || rAny.registrationStatus || 'Approved',
          receiptNumber: rAny.receiptNumber || `ABG-REC-${normalizeId(displayRegRef)}`
        };

        combinedRecords.push(regPayObj);
      }
    });
  } catch (err) {
    console.error('Error matching registration payments in storage:', err);
  }

  // 2. Search Fee Payments
  try {
    const allPayments = getStoredPayments();
    let updatedPayments = false;

    allPayments.forEach((p) => {
      const pAny = p as any;
      const pRoll = normalizeId(pAny.rollNumber);
      const pRef = normalizeId(pAny.registrationRef || pAny.registrationReferenceNumber || pAny.referenceNumber);
      const pFeeRef = normalizeId(pAny.feeReferenceNumber);
      const pReceipt = normalizeId(pAny.receiptNumber);

      const isMatch = targetIds.some(id => 
        (pRoll && pRoll === id) || 
        (pRef && pRef === id) || 
        (pFeeRef && pFeeRef === id) || 
        (pReceipt && pReceipt === id)
      );

      if (isMatch) {
        if (normRoll !== '' && (!pRoll || pRoll === 'UNASSIGNED') && (pRef === normRegRef || pRef === normRawRef)) {
          p.rollNumber = data.rollNumber || normRoll;
          updatedPayments = true;
        }

        combinedRecords.push({
          ...p,
          source: p.source || 'FEE_PAYMENT'
        });
      }
    });

    if (updatedPayments) {
      savePayments(allPayments);
    }
  } catch (err) {
    console.error('Error matching fee payments in storage:', err);
  }

  // Deduplicate combined records
  const uniqueRecords: FeePaymentRecord[] = [];
  const seenKeys = new Set<string>();

  for (const rec of combinedRecords) {
    const normTxn = normalizeId(rec.transactionId || rec.upiTransactionId);
    const normFeeRef = normalizeId(rec.feeReferenceNumber);
    const normRegRef = normalizeId(rec.registrationReferenceNumber || rec.registrationRef);
    const normAmt = String(rec.amountPaid || rec.feeAmount || rec.amount || '0').trim();

    let key = '';
    if (normTxn) {
      key = `TXN_${normTxn}`;
    } else if (normFeeRef) {
      key = `FEE_${normFeeRef}`;
    } else {
      key = `${rec.source || 'PAY'}_${normRegRef}_${rec.paymentDate}_${normAmt}`;
    }

    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueRecords.push(rec);
    }
  }

  uniqueRecords.sort((a, b) => {
    const timeA = new Date(a.paymentDate || a.createdDate || a.createdAt || a.timestamp || 0).getTime();
    const timeB = new Date(b.paymentDate || b.createdDate || b.createdAt || b.timestamp || 0).getTime();
    return timeB - timeA;
  });

  const evaluation = evaluateFeePaymentBlockingStorage(uniqueRecords);

  if (uniqueRecords.length === 0) {
    return {
      success: true,
      code: 'NO_FEE_HISTORY',
      message: 'No previous fee payment records were found.',
      history: [],
      canSubmitNewPayment: true,
      blockingReason: 'NO_BLOCKING_PAYMENT',
      recordCount: 0,
      sourcesChecked
    };
  }

  return {
    success: true,
    code: 'FEE_HISTORY_FOUND',
    message: `${uniqueRecords.length} payment records found.`,
    history: uniqueRecords,
    canSubmitNewPayment: evaluation.canSubmitNewPayment,
    blockingReason: evaluation.blockingReason,
    recordCount: uniqueRecords.length,
    sourcesChecked
  };
}

export function updateMemberInStorage(updatedData: Partial<Member> & { rollNumber: string }) {
  const members = getStoredMembers();
  const rollClean = (updatedData.rollNumber || '').trim().toUpperCase();
  const origRollClean = ((updatedData as any).originalRollNumber || '').trim().toUpperCase();
  const regRefClean = (updatedData.registrationRef || (updatedData as any).registrationReferenceNumber || '').trim().toUpperCase();
  const rollAlphanumeric = rollClean.replace(/[^A-Z0-9]/g, '');

  const idx = members.findIndex(
    m => (updatedData.id && m.id === updatedData.id) ||
         (m.rollNumber || '').trim().toUpperCase() === rollClean ||
         (origRollClean && (m.rollNumber || '').trim().toUpperCase() === origRollClean) ||
         (regRefClean && (m.registrationRef || (m as any).registrationReferenceNumber || '').trim().toUpperCase() === regRefClean) ||
         ((m.rollNumber || '').toUpperCase().replace(/[^A-Z0-9]/g, '') === rollAlphanumeric && rollAlphanumeric.length > 0)
  );

  let updatedMemberObj: Member;

  if (idx !== -1) {
    const existing = members[idx];
    const newPlan = updatedData.planName || updatedData.selectedPlan || updatedData.membershipPlan || existing.planName || 'Basic Plan';
    const newJoining = updatedData.joiningDate || updatedData.joinDate || existing.joiningDate || existing.joinDate || new Date().toISOString().split('T')[0];
    const newExpiry = updatedData.membershipExpiry || updatedData.planExpiryDate || updatedData.expiryDate || existing.membershipExpiry || existing.expiryDate || '';
    const newStatus = updatedData.status || updatedData.membershipStatus || updatedData.memberStatus || existing.status || 'Active';

    updatedMemberObj = {
      ...existing,
      ...updatedData,
      id: existing.id || updatedData.id || `mem-${Date.now()}`,
      rollNumber: updatedData.rollNumber || existing.rollNumber,
      rollNo: updatedData.rollNumber || existing.rollNumber,
      fullName: updatedData.fullName || updatedData.name || existing.fullName,
      name: updatedData.fullName || updatedData.name || existing.fullName,
      phone: updatedData.phone || updatedData.phoneNumber || existing.phone,
      phoneNumber: updatedData.phone || updatedData.phoneNumber || existing.phone,
      email: updatedData.email || updatedData.emailAddress || existing.email,
      emailAddress: updatedData.email || updatedData.emailAddress || existing.email,
      planName: newPlan,
      selectedPlan: newPlan,
      membershipPlan: newPlan,
      joiningDate: newJoining,
      joinDate: newJoining,
      membershipExpiry: newExpiry,
      expiryDate: newExpiry,
      planExpiryDate: newExpiry,
      status: newStatus as any,
      membershipStatus: newStatus as any,
      dob: updatedData.dob || updatedData.dateOfBirth || existing.dob,
      dateOfBirth: updatedData.dob || updatedData.dateOfBirth || existing.dob,
      gender: updatedData.gender || existing.gender || 'Male',
      address: updatedData.address || existing.address || '',
      emergencyContact: updatedData.emergencyContact || updatedData.emergencyContactNumber || existing.emergencyContact || '',
      emergencyContactNumber: updatedData.emergencyContact || updatedData.emergencyContactNumber || existing.emergencyContact || '',
      fitnessGoal: updatedData.fitnessGoal !== undefined ? updatedData.fitnessGoal : existing.fitnessGoal || '',
      medicalCondition: updatedData.medicalCondition !== undefined ? updatedData.medicalCondition : existing.medicalCondition || '',
      remarks: updatedData.remarks !== undefined ? updatedData.remarks : existing.remarks || '',
      updatedAt: new Date().toISOString(),
    };
    members[idx] = updatedMemberObj;
    saveMembers(members);
  } else {
    const newPlan = updatedData.planName || updatedData.selectedPlan || updatedData.membershipPlan || 'Basic Plan';
    const newJoining = updatedData.joiningDate || updatedData.joinDate || new Date().toISOString().split('T')[0];
    const newExpiry = updatedData.membershipExpiry || updatedData.planExpiryDate || updatedData.expiryDate || '';
    const newStatus = updatedData.status || updatedData.membershipStatus || updatedData.memberStatus || 'Active';

    updatedMemberObj = {
      id: updatedData.id || `mem-${Date.now()}`,
      rollNumber: updatedData.rollNumber,
      rollNo: updatedData.rollNumber,
      registrationRef: updatedData.registrationRef || `REG-${updatedData.rollNumber}`,
      fullName: updatedData.fullName || updatedData.name || '',
      name: updatedData.fullName || updatedData.name || '',
      phone: updatedData.phone || updatedData.phoneNumber || '',
      phoneNumber: updatedData.phone || updatedData.phoneNumber || '',
      email: updatedData.email || updatedData.emailAddress || '',
      emailAddress: updatedData.email || updatedData.emailAddress || '',
      planName: newPlan,
      selectedPlan: newPlan,
      membershipPlan: newPlan,
      joiningDate: newJoining,
      joinDate: newJoining,
      membershipExpiry: newExpiry,
      expiryDate: newExpiry,
      planExpiryDate: newExpiry,
      status: newStatus as any,
      membershipStatus: newStatus as any,
      dob: updatedData.dob || updatedData.dateOfBirth || '',
      dateOfBirth: updatedData.dob || updatedData.dateOfBirth || '',
      gender: updatedData.gender || 'Male',
      address: updatedData.address || '',
      emergencyContact: updatedData.emergencyContact || updatedData.emergencyContactNumber || '',
      emergencyContactNumber: updatedData.emergencyContact || updatedData.emergencyContactNumber || '',
      remarks: updatedData.remarks || '',
      fitnessGoal: updatedData.fitnessGoal || '',
      timestamp: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    members.unshift(updatedMemberObj);
    saveMembers(members);
  }

  const regs = getStoredRegistrations();
  const regIdx = regs.findIndex(
    r => (r.rollNumber || '').trim().toUpperCase() === rollClean ||
         (r.registrationRef || r.referenceNumber || '').trim().toUpperCase() === (updatedData.registrationRef || '').trim().toUpperCase()
  );
  if (regIdx !== -1) {
    if (updatedData.fullName) regs[regIdx].fullName = updatedData.fullName;
    if (updatedData.phone) regs[regIdx].phone = updatedData.phone;
    if (updatedData.email) regs[regIdx].email = updatedData.email;
    if (updatedData.planName) regs[regIdx].selectedPlan = updatedData.planName;
    if (updatedData.joiningDate) regs[regIdx].joiningDate = updatedData.joiningDate;
    saveRegistrations(regs);
  }

  logAdminActivity(
    'Admin',
    'Updated Member Details',
    'Member',
    rollClean,
    'Active',
    updatedMemberObj.status || 'Active',
    `Updated details for ${updatedMemberObj.fullName}`
  );

  return {
    success: true,
    message: 'Member details updated successfully.',
    data: updatedMemberObj,
    member: updatedMemberObj,
  };
}

export function directAddMemberToStorage(memberData: {
  rollNumber?: string;
  fullName: string;
  phone: string;
  email?: string;
  gender?: string;
  dob?: string;
  planName?: string;
  status?: string;
  joiningDate?: string;
  membershipExpiry?: string;
  registrationFee?: number;
  initialAmountPaid?: number;
  paymentStatus?: string;
  paymentMode?: string;
  address?: string;
  emergencyContact?: string;
  fitnessGoal?: string;
  medicalCondition?: string;
  remarks?: string;
  adminName?: string;
}) {
  const members = getStoredMembers();
  const regs = getStoredRegistrations();
  const payments = getStoredPayments();

  const phone = (memberData.phone || '').trim();
  const cleanDigits = phone.replace(/\D/g, '');
  const mobileLast4 = cleanDigits.length >= 4 ? cleanDigits.slice(-4) : '0001';
  const yy = new Date().getFullYear().toString().slice(-2);
  
  let roll = (memberData.rollNumber || '').trim().toUpperCase();
  if (!roll) {
    let candidate = `ABG-${yy}-${mobileLast4}`;
    const existingRolls = new Set(members.map(m => (m.rollNumber || '').toUpperCase()));
    if (existingRolls.has(candidate)) {
      let counter = 2;
      while (existingRolls.has(`${candidate}-${counter < 10 ? '0' + counter : counter}`)) {
        counter++;
      }
      candidate = `${candidate}-${counter < 10 ? '0' + counter : counter}`;
    }
    roll = candidate;
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const todayStr = nowIso.split('T')[0];
  const randFour = Math.floor(1000 + Math.random() * 9000);
  const regRef = `ABG-REG-${yy}${('0' + (now.getMonth() + 1)).slice(-2)}${('0' + now.getDate()).slice(-2)}-${randFour}`;

  const plan = memberData.planName || 'Basic Plan';
  const joinDate = memberData.joiningDate || todayStr;
  let expiryDate = memberData.membershipExpiry || '';
  if (!expiryDate) {
    const d = new Date(joinDate);
    d.setMonth(d.getMonth() + 1);
    expiryDate = isNaN(d.getTime()) ? todayStr : d.toISOString().split('T')[0];
  }

  const status = memberData.status || 'Active';
  const fee = Number(memberData.registrationFee ?? memberData.initialAmountPaid ?? 100);
  const payStatus = memberData.paymentStatus || 'Successful';

  const newMemberObj: Member = {
    id: `mem-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    rollNumber: roll,
    rollNo: roll,
    registrationRef: regRef,
    fullName: memberData.fullName.trim(),
    name: memberData.fullName.trim(),
    phone: phone,
    phoneNumber: phone,
    email: (memberData.email || '').trim(),
    emailAddress: (memberData.email || '').trim(),
    gender: (memberData.gender as any) || 'Male',
    dob: memberData.dob || '',
    dateOfBirth: memberData.dob || '',
    address: memberData.address || '',
    emergencyContact: memberData.emergencyContact || '',
    emergencyContactNumber: memberData.emergencyContact || '',
    planName: plan,
    selectedPlan: plan,
    membershipPlan: plan,
    fitnessGoal: memberData.fitnessGoal || '',
    medicalCondition: memberData.medicalCondition || '',
    joiningDate: joinDate,
    joinDate: joinDate,
    membershipExpiry: expiryDate,
    planExpiryDate: expiryDate,
    expiryDate: expiryDate,
    registrationFeePaid: fee,
    previousBalance: 0,
    status: status as any,
    membershipStatus: status as any,
    memberStatus: status as any,
    lastPaymentDate: payStatus === 'Successful' ? todayStr : 'None',
    lastPaymentAmount: payStatus === 'Successful' ? fee : 0,
    lastPaymentStatus: payStatus,
    remarks: memberData.remarks || 'Direct member registration / restored by admin',
    createdBy: memberData.adminName || 'Admin',
    timestamp: nowIso,
    updatedAt: nowIso,
  };

  // Upsert member: replace if roll matches or prepend
  const existingIdx = members.findIndex(m => (m.rollNumber || '').toUpperCase() === roll);
  if (existingIdx !== -1) {
    members[existingIdx] = { ...members[existingIdx], ...newMemberObj };
  } else {
    members.unshift(newMemberObj);
  }
  saveMembers(members);

  // Add corresponding registration record (Approved)
  const newReg: RegistrationRequest = {
    id: `reg-${Date.now()}`,
    registrationRef: regRef,
    registrationReferenceNumber: regRef,
    referenceNumber: regRef,
    rollNumber: roll,
    fullName: memberData.fullName.trim(),
    phone: phone,
    phoneNumber: phone,
    email: memberData.email || '',
    emailAddress: memberData.email || '',
    gender: (memberData.gender as any) || 'Male',
    dob: memberData.dob || '',
    dateOfBirth: memberData.dob || '',
    address: memberData.address || '',
    emergencyContact: memberData.emergencyContact || '',
    emergencyContactNumber: memberData.emergencyContact || '',
    selectedPlan: plan,
    planName: plan,
    fitnessGoal: memberData.fitnessGoal || '',
    medicalCondition: memberData.medicalCondition || '',
    registrationFee: fee,
    paymentMethod: (memberData.paymentMode as any) || 'Cash',
    paymentStatus: payStatus as any,
    registrationStatus: 'Approved',
    status: 'Approved',
    approvedBy: memberData.adminName || 'Admin',
    approvedDate: todayStr,
    timestamp: nowIso,
    adminRemarks: memberData.remarks || 'Direct registration / restored by Admin',
  };
  regs.unshift(newReg);
  saveRegistrations(regs);

  // Add fee payment if fee > 0 and marked paid/successful
  if (fee > 0 && payStatus === 'Successful') {
    const randThree = Math.floor(100 + Math.random() * 900);
    const feeRef = `ABG-FEE-${yy}${('0' + (now.getMonth() + 1)).slice(-2)}${('0' + now.getDate()).slice(-2)}-${randThree}`;
    const newFee: FeePaymentRecord = {
      id: `fee-${Date.now()}`,
      feeReferenceNumber: feeRef,
      registrationRef: regRef,
      rollNumber: roll,
      memberName: memberData.fullName.trim(),
      phone: phone,
      email: memberData.email || '',
      selectedPlan: plan,
      feeDuration: '1 Month',
      regularPlanAmount: fee,
      discountAmount: 0,
      totalPayableAmount: fee,
      amountPaid: fee,
      remainingBalance: 0,
      paymentMethod: memberData.paymentMode || 'Cash',
      transactionId: `DIR-${Date.now().toString().slice(-6)}`,
      paymentStatus: 'Successful',
      status: 'Successful',
      paymentDate: todayStr,
      timestamp: nowIso,
      verifiedBy: memberData.adminName || 'Admin',
      notes: memberData.remarks || 'Direct registration initial fee payment',
    };
    payments.unshift(newFee);
    savePayments(payments);
  }

  logAdminActivity(
    memberData.adminName || 'Admin',
    'Direct Member Registered / Restored',
    'Member',
    roll,
    'None',
    status,
    `Directly registered/restored ${newMemberObj.fullName} (${roll}) - Plan: ${plan}`
  );

  return newMemberObj;
}

export function fallbackAdminSubmitFeePayment(formData: any) {
  const payments = getStoredPayments();
  const now = new Date();
  const feeRef = `ABG-FEE-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const receiptNum = `ABG-REC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

  const feeAmt = Number(formData.feeAmount || formData.finalFeeAmount || 0);
  const prevBal = Number(formData.previousBalance || 0);
  const disc = Number(formData.discount || 0);
  const totalPayable = Math.max(0, feeAmt + prevBal - disc);
  const amtPaid = Number(formData.totalPaid ?? formData.amountPaid ?? totalPayable);
  const remBal = Math.max(0, totalPayable - amtPaid);

  const refOrRoll = (formData.referenceOrRollNumber || formData.rollNumber || formData.registrationRef || '').trim();
  const memberName = (formData.fullName || formData.memberName || 'Member').trim();
  const phone = (formData.phoneNumber || formData.phone || '').trim();
  const email = (formData.emailAddress || formData.email || '').trim();
  const plan = formData.selectedPlan || 'Gym Membership';
  const feeMonth = formData.feeMonth || `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;

  const newFeeRecord: FeePaymentRecord = {
    id: `fee-admin-${Date.now()}`,
    timestamp: now.toISOString(),
    feeReferenceNumber: feeRef,
    registrationRef: refOrRoll,
    rollNumber: refOrRoll,
    fullName: memberName,
    phone,
    email,
    selectedPlan: plan,
    plan,
    feeMonth,
    amount: String(feeAmt),
    feeAmount: feeAmt,
    currentFeeAmount: feeAmt,
    previousBalance: prevBal,
    discountAmount: disc,
    finalPayableAmount: totalPayable,
    amountPaid: amtPaid,
    remainingBalance: remBal,
    paymentDate: formData.paymentDate || now.toISOString().split('T')[0],
    paymentMethod: formData.paymentMethod || 'Cash',
    upiTransactionId: formData.upiTransactionId || '',
    paymentStatus: 'Approved',
    status: 'Approved',
    adminVerificationStatus: 'Approved',
    receiptNumber: receiptNum,
    submissionSource: 'Admin Portal',
    remarks: formData.adminRemarks || 'Added by Admin',
    verifiedBy: 'Admin',
    verifiedAt: now.toISOString(),
    adminRemarks: formData.adminRemarks || 'Added by Admin',
  };

  payments.unshift(newFeeRecord);
  savePayments(payments);

  logAdminActivity(
    'Admin',
    'Admin Fee Payment Added',
    'Fee Payment',
    feeRef,
    'Pending',
    'Approved',
    `Member: ${memberName} (${refOrRoll}) | Paid: ₹${amtPaid} | Rem: ₹${remBal}`
  );

  return {
    success: true,
    message: `Fee payment recorded successfully! Receipt #: ${receiptNum} | Remaining Balance: ₹${remBal.toLocaleString('en-IN')}`,
    receiptNumber: receiptNum,
    receiptNo: receiptNum,
    feeReferenceNumber: feeRef,
    remainingBalance: remBal,
    data: newFeeRecord,
  };
}

const ATTENDANCE_KEY = 'ab_gym_attendance_records';

export function getStoredAttendance(): AttendanceRecord[] {
  try {
    const raw = localStorage.getItem(ATTENDANCE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveAttendance(records: AttendanceRecord[]) {
  try {
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(records));
  } catch (err) {
    console.error('Error saving attendance records:', err);
  }
}

export function markMemberAttendance(query: string, scanSource = 'Reception QR Scanner'): {
  success: boolean;
  message: string;
  member?: Member;
  record?: AttendanceRecord;
} {
  const members = getStoredMembers();
  const clean = query.trim().toUpperCase();
  const alphanumeric = clean.replace(/[^A-Z0-9]/g, '');

  let rollToFind = clean;
  let parsedJson: any = null;

  if (query.trim().startsWith('{') && query.trim().endsWith('}')) {
    try {
      parsedJson = JSON.parse(query.trim());
      if (parsedJson.rollNumber) {
        rollToFind = parsedJson.rollNumber.trim().toUpperCase();
      }
    } catch {
      // ignore
    }
  }

  const member = members.find(m => {
    const mRoll = (m.rollNumber || m.id || '').trim().toUpperCase();
    const mAlpha = mRoll.replace(/[^A-Z0-9]/g, '');
    return mRoll === rollToFind || (alphanumeric.length > 0 && mAlpha === alphanumeric);
  });

  if (!member) {
    return {
      success: false,
      message: `No gym member record found matching "${rollToFind || query}".`,
    };
  }

  const attendanceList = getStoredAttendance();
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const record: AttendanceRecord = {
    id: `att-${Date.now()}`,
    timestamp: now.toISOString(),
    rollNumber: member.rollNumber,
    memberName: member.fullName,
    planName: member.planName || member.membershipPlan || 'Basic Plan',
    status: member.status || 'Active',
    date: dateStr,
    time: timeStr,
    scanSource,
  };

  attendanceList.unshift(record);
  saveAttendance(attendanceList);

  logAdminActivity(
    'Reception',
    'Attendance Marked via QR Scan',
    'Attendance',
    member.rollNumber,
    'Present',
    'Present',
    `Member: ${member.fullName} (${member.rollNumber})`
  );

  return {
    success: true,
    message: `Attendance marked successfully for ${member.fullName}!`,
    member,
    record,
  };
}

