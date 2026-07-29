import {
  Member,
  RegistrationRequest,
  FeePaymentRecord,
  MembershipPlan,
  Trainer,
  GalleryItem,
  GymSettings,
  ActivityLogRecord,
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
  rollNumber?: string;
  mobileLast4?: string;
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
}

export interface GetMemberForFeeResponse {
  success: boolean;
  message: string;
  data?: MemberFeeDetailsData;
}

/**
 * Fee Verification: Fetch record by Registration Reference Number or Roll Number + Mobile Last 4 digits
 */
export function getMemberForFee(data: GetMemberForFeeData): GetMemberForFeeResponse {
  const queryRef = String(data.registrationRefOrRoll || data.rollNumber || "").trim().toUpperCase();
  const mobileLast4 = String(data.mobileLast4 || "").replace(/\D/g, "");

  if (!queryRef || !mobileLast4) {
    return {
      success: false,
      message: "Registration Reference Number (or Roll Number) and registered mobile last 4 digits are required."
    };
  }

  // Validate Mobile Last 4 digits format
  if (!/^\d{4}$/.test(mobileLast4)) {
    return {
      success: false,
      message: "Enter exactly 4 digits from your registered mobile number."
    };
  }

  // 1. Search Registrations list
  const regs = getStoredRegistrations();
  const matchedReg = regs.find(
    (r) =>
      r.registrationRef.trim().toUpperCase() === queryRef ||
      (r.rollNumber && r.rollNumber.trim().toUpperCase() === queryRef)
  );

  if (matchedReg) {
    const storedPhoneDigits = String(matchedReg.phone || "").replace(/\D/g, "");
    const storedMobileLast4 = storedPhoneDigits.slice(-4);

    if (storedMobileLast4 !== mobileLast4) {
      return {
        success: false,
        message: "The mobile number verification failed. Please enter the correct last 4 digits of your registered mobile number."
      };
    }

    const maskedPhone = `******${storedMobileLast4}`;
    const payments = getStoredPayments();
    const existingPayment = payments.find(
      (p) => p.registrationRef === matchedReg.registrationRef || (matchedReg.rollNumber && p.rollNumber === matchedReg.rollNumber)
    );

    return {
      success: true,
      message: "Registration verified successfully.",
      data: {
        registrationRef: matchedReg.registrationRef,
        rollNumber: matchedReg.rollNumber || "",
        fullName: matchedReg.fullName,
        maskedPhone: maskedPhone,
        emailAddress: matchedReg.email || "",
        selectedPlan: matchedReg.planName || "",
        joiningDate: matchedReg.createdAt ? new Date(matchedReg.createdAt).toLocaleDateString() : matchedReg.joiningDate,
        membershipStartDate: matchedReg.joiningDate || "",
        membershipExpiryDate: calculateExpiryDate(matchedReg.joiningDate, 1),
        registrationStatus: matchedReg.status,
        memberStatus: matchedReg.status === 'Approved' ? 'Active' : 'Pending Approval',
        paymentStatus: existingPayment ? existingPayment.status : 'Pending Verification',
        registrationFee: matchedReg.registrationFee || 100,
        previousBalance: 0,
        lastPaymentDate: existingPayment ? existingPayment.paymentDate : 'None',
        lastPaymentAmount: existingPayment ? existingPayment.amountPaid : 0,
        lastPaymentStatus: existingPayment ? existingPayment.status : 'Pending Verification',
        planId: matchedReg.planId,
        id: matchedReg.id,
      }
    };
  }

  // 2. Fallback: Search Members list by Roll Number
  const members = getStoredMembers();
  const matchedMember = members.find(
    (m) => m.rollNumber.trim().toUpperCase() === queryRef
  );

  if (matchedMember) {
    const storedPhoneDigits = String(matchedMember.phone || "").replace(/\D/g, "");
    const storedMobileLast4 = storedPhoneDigits.slice(-4);

    if (storedMobileLast4 !== mobileLast4) {
      return {
        success: false,
        message: "The mobile number verification failed. Please enter the correct last 4 digits of your registered mobile number."
      };
    }

    const maskedPhone = `******${storedMobileLast4}`;

    return {
      success: true,
      message: "Member verified successfully.",
      data: {
        registrationRef: "",
        rollNumber: matchedMember.rollNumber,
        fullName: matchedMember.fullName,
        maskedPhone: maskedPhone,
        emailAddress: matchedMember.email || "",
        selectedPlan: matchedMember.planName || "",
        joiningDate: matchedMember.joiningDate || "",
        membershipStartDate: matchedMember.joiningDate || "",
        membershipExpiryDate: matchedMember.membershipExpiry || "",
        registrationStatus: 'Approved',
        memberStatus: matchedMember.status || 'Active',
        paymentStatus: 'Successful',
        registrationFee: 100,
        previousBalance: matchedMember.previousBalance || 0,
        lastPaymentDate: matchedMember.lastPaymentDate || "",
        lastPaymentAmount: 0,
        lastPaymentStatus: 'Successful',
        planId: matchedMember.planId,
        id: matchedMember.id,
      }
    };
  }

  return {
    success: false,
    message: "No registration or member record was found matching the entered reference number."
  };
}
