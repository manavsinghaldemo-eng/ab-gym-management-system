import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { apiService, getSavedAdminToken, clearAdminSession, ADMIN_STORAGE_KEYS, GOOGLE_APPS_SCRIPT_URL } from '../lib/api';

import { GOOGLE_APPS_SCRIPT_CODE } from '../lib/googleAppsScriptSource';
import {
  Member,
  RegistrationRequest,
  FeePaymentRecord,
  ActivityLogRecord,
  DashboardStats,
  GymSettings,
  AttendanceRecord,
} from '../types';
import { downloadMemberCardPDF, downloadFeeReceiptPDF } from '../lib/pdf';
import { MemberCardModal } from '../components/MemberCardModal';
import { ReceiptModal } from '../components/ReceiptModal';
import { getStoredSettings, saveSettings, getStoredAttendance, markMemberAttendance, getStoredMembers, getStoredPlans, updateMemberInStorage, directAddMemberToStorage } from '../lib/storage';
import { AB_FITNESS_UPI_ID } from '../data/initialData';
import abGymLogo from '../assets/logo';

import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  CreditCard,
  Settings as SettingsIcon,
  Search,
  CheckCircle2,
  XCircle,
  Download,
  LogOut,
  IndianRupee,
  Activity,
  AlertCircle,
  FileSpreadsheet,
  Lock,
  Mail,
  Calendar,
  Check,
  Eye,
  X,
  EyeOff,
  RefreshCw,
  Copy,
  Clock,
  UserCheck,
  UserX,
  FileText,
  Filter,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Loader2,
  Database,
  Plus,
  UserPlus,
  Edit3,
  QrCode,
  History,
  ArrowUpDown,
} from 'lucide-react';

const getRegistrationReference = (registration: any) =>
  String(
    registration?.registrationReferenceNumber ||
    registration?.registrationRef ||
    registration?.["Registration Reference Number"] ||
    ""
  ).trim();

const normalizeRegistration = (record: any, idx: number): RegistrationRequest => {
  if (!record) return {} as RegistrationRequest;
  const regRef = String(record['Registration Reference Number'] ?? record['registrationReferenceNumber'] ?? record['registrationRef'] ?? record['id'] ?? `reg-${record['rowNumber'] || idx + 1}`);
  const roll = String(record['Roll Number'] ?? record['rollNumber'] ?? record['rollNo'] ?? 'Unassigned');
  const name = String(record['Full Name'] ?? record['fullName'] ?? record['name'] ?? record['memberName'] ?? 'Gym Athlete');
  const phone = String(record['Phone Number'] ?? record['phoneNumber'] ?? record['phone'] ?? record['memberPhone'] ?? '');
  const email = String(record['Email Address'] ?? record['emailAddress'] ?? record['email'] ?? record['memberEmail'] ?? '');
  const dob = String(record['Date of Birth'] ?? record['dateOfBirth'] ?? record['dob'] ?? '');
  const plan = String(record['Selected Plan'] ?? record['selectedPlan'] ?? record['planName'] ?? record['membershipPlan'] ?? 'Basic Plan');
  const status = String(record['Registration Status'] ?? record['registrationStatus'] ?? record['status'] ?? 'Pending Verification');
  const remarks = String(record['Admin Remarks'] ?? record['adminRemarks'] ?? record['remarks'] ?? record['notes'] ?? '');
  const emergency = String(record['Emergency Contact Number'] ?? record['emergencyContactNumber'] ?? record['emergencyContact'] ?? '');
  const upiId = String(record['UPI Transaction ID'] ?? record['upiTransactionId'] ?? record['upiTxnId'] ?? '');
  const upiUrl = String(record['Payment Screenshot'] ?? record['paymentScreenshot'] ?? record['upiScreenshotUrl'] ?? '');
  const ts = String(record['Timestamp'] ?? record['timestamp'] ?? record['createdAt'] ?? new Date().toISOString());

  return {
    ...record,
    rowNumber: Number(record['rowNumber'] || record['rowNo'] || idx + 1),
    timestamp: ts,
    createdAt: ts,
    id: regRef,
    registrationRef: regRef,
    registrationReferenceNumber: regRef,
    rollNumber: roll,
    fullName: name,
    gender: record['Gender'] ?? record['gender'] ?? 'Male',
    dateOfBirth: dob,
    dob: dob,
    phoneNumber: phone,
    phone: phone,
    emailAddress: email,
    email: email,
    address: String(record['Address'] ?? record['address'] ?? ''),
    emergencyContactNumber: emergency,
    emergencyContact: emergency,
    selectedPlan: plan,
    planName: plan,
    fitnessGoal: String(record['Fitness Goal'] ?? record['fitnessGoal'] ?? ''),
    joiningDate: String(record['Joining Date'] ?? record['joiningDate'] ?? record['joinDate'] ?? ''),
    registrationFee: Number(record['Registration Fee'] ?? record['registrationFee'] ?? 500),
    paymentMethod: String(record['Payment Method'] ?? record['paymentMethod'] ?? 'UPI'),
    upiTransactionId: upiId,
    upiTxnId: upiId,
    paymentScreenshot: upiUrl,
    upiScreenshotUrl: upiUrl,
    registrationStatus: status,
    status: status,
    paymentStatus: record['Payment Status'] ?? record['paymentStatus'] ?? 'Submitted',
    feeReferenceNumber: record['Fee Reference Number'] ?? record['feeReferenceNumber'] ?? '',
    termsAccepted: Boolean(record['Terms Accepted'] ?? record['termsAccepted'] ?? true),
    termsAcceptedDate: record['Terms Accepted Date'] ?? record['termsAcceptedDate'] ?? ts,
    entrySource: record['Entry Source'] ?? record['entrySource'] ?? 'Web Form',
    createdBy: record['Created By'] ?? record['createdBy'] ?? 'Self',
    adminRemarks: remarks,
    remarks: remarks,
    rejectionReason: record['Rejection Reason'] ?? record['rejectionReason'] ?? '',
    approvedBy: record['Approved By'] ?? record['approvedBy'] ?? '',
    approvedDate: record['Approved Date'] ?? record['approvedDate'] ?? '',
  };
};

export const normalizeDateForInput = (val: any): string => {
  if (!val) return '';
  const s = String(val).trim();
  if (!s || s.toLowerCase() === 'undefined' || s.toLowerCase() === 'null') return '';

  // Check if it's already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s;
  }

  // Check ISO format like 2026-08-15T... or 2026-08-15 10:30:00
  if (/^\d{4}-\d{2}-\d{2}[T\s]/.test(s)) {
    return s.substring(0, 10);
  }

  // Check DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Check YYYY/MM/DD
  const ymdMatch = s.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Try parsing with standard Date
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return '';
};

const normalizeMember = (record: any, idx: number): Member => {
  if (!record) return {} as Member;
  const roll = String(record['rollNumber'] ?? record['rollNo'] ?? record['Roll Number'] ?? record['id'] ?? `ABG-2026-${String(idx + 1).padStart(3, '0')}`);
  const name = String(record['fullName'] ?? record['name'] ?? record['memberName'] ?? record['Full Name'] ?? 'Gym Member');
  const phone = String(record['phone'] ?? record['phoneNumber'] ?? record['memberPhone'] ?? record['Phone Number'] ?? '');
  const email = String(record['email'] ?? record['emailAddress'] ?? record['memberEmail'] ?? record['Email Address'] ?? '');
  const dob = String(record['dob'] ?? record['dateOfBirth'] ?? record['Date of Birth'] ?? '');
  const plan = String(record['planName'] ?? record['selectedPlan'] ?? record['membershipPlan'] ?? record['Plan Name'] ?? record['Membership Plan'] ?? 'Basic Plan');
  const status = String(record['status'] ?? record['membershipStatus'] ?? record['memberStatus'] ?? record['Membership Status'] ?? 'Active');
  const emergency = String(record['emergencyContact'] ?? record['emergencyContactNumber'] ?? record['Emergency Contact Number'] ?? '');
  const regRef = String(record['registrationRef'] ?? record['registrationReferenceNumber'] ?? record['Registration Reference Number'] ?? '');

  const joining = String(record['joiningDate'] ?? record['joinDate'] ?? record['Joining Date'] ?? record['Join Date'] ?? new Date().toISOString().split('T')[0]);
  const expiry = String(record['membershipExpiry'] ?? record['expiryDate'] ?? record['planExpiryDate'] ?? record['Membership Expiry'] ?? record['Expiry Date'] ?? '');

  return {
    ...record,
    id: record['id'] || roll,
    rollNumber: roll,
    rollNo: roll,
    fullName: name,
    name: name,
    phone: phone,
    phoneNumber: phone,
    email: email,
    emailAddress: email,
    gender: String(record['gender'] ?? record['Gender'] ?? 'Male'),
    dob: dob,
    dateOfBirth: dob,
    planName: plan,
    membershipPlan: plan,
    selectedPlan: plan,
    status: status,
    membershipStatus: status,
    joiningDate: joining,
    joinDate: joining,
    membershipExpiry: expiry,
    expiryDate: expiry,
    planExpiryDate: expiry,
    emergencyContact: emergency,
    emergencyContactNumber: emergency,
    address: String(record['address'] ?? record['Address'] ?? ''),
    fitnessGoal: String(record['fitnessGoal'] ?? record['Fitness Goal'] ?? ''),
    medicalCondition: String(record['medicalCondition'] ?? record['Medical Condition'] ?? ''),
    bloodGroup: String(record['bloodGroup'] ?? record['Blood Group'] ?? ''),
    photoUrl: String(record['photoUrl'] ?? record['Photo URL'] ?? ''),
    registrationReferenceNumber: regRef,
    registrationRef: regRef,
    remarks: String(record['remarks'] ?? record['Remarks'] ?? ''),
  };
};

export const resolveFeeMemberName = (
  record: any,
  membersList?: Member[],
  regsList?: RegistrationRequest[]
): string => {
  if (!record) return 'Gym Member';

  const rawName = String(
    record['Member Name'] ??
    record['memberName'] ??
    record['Full Name'] ??
    record['fullName'] ??
    record['Name'] ??
    record['name'] ??
    ''
  ).trim();

  const isGeneric =
    !rawName ||
    rawName.toLowerCase() === 'gym member' ||
    rawName.toLowerCase() === 'gym athlete' ||
    rawName.toLowerCase() === 'member' ||
    rawName.toLowerCase() === 'unassigned' ||
    rawName.toLowerCase() === 'n/a' ||
    rawName.toLowerCase() === 'null' ||
    rawName.toLowerCase() === 'undefined';

  if (!isGeneric) {
    return rawName;
  }

  const roll = String(
    record['Roll Number'] ?? record['rollNumber'] ?? record['rollNo'] ?? ''
  ).trim().toUpperCase();

  const regRef = String(
    record['Registration Reference Number'] ??
    record['registrationReferenceNumber'] ??
    record['registrationRef'] ??
    ''
  ).trim().toUpperCase();

  const phone = String(
    record['Phone Number'] ?? record['phoneNumber'] ?? record['memberPhone'] ?? record['phone'] ?? ''
  ).trim();

  if (membersList && membersList.length > 0) {
    const found = membersList.find((m) => {
      const mRoll = ((m.rollNumber || (m as any).rollNo || m.id || '') as string).trim().toUpperCase();
      const mReg = ((((m as any).registrationReferenceNumber || m.registrationRef || '') as string)).trim().toUpperCase();
      const mPhone = ((m.phone || (m as any).phoneNumber || '') as string).trim();
      return (
        (roll !== '' && roll !== 'UNASSIGNED' && mRoll === roll) ||
        (regRef !== '' && mReg === regRef) ||
        (phone !== '' && mPhone !== '' && mPhone === phone)
      );
    });
    if (found) {
      const mName = (found.fullName || (found as any).name || '').trim();
      if (
        mName &&
        mName.toLowerCase() !== 'gym member' &&
        mName.toLowerCase() !== 'gym athlete' &&
        mName.toLowerCase() !== 'member'
      ) {
        return mName;
      }
    }
  }

  if (regsList && regsList.length > 0) {
    const found = regsList.find((r) => {
      const rReg = ((r.registrationReferenceNumber || r.registrationRef || r.id || '') as string).trim().toUpperCase();
      const rRoll = ((r.rollNumber || '') as string).trim().toUpperCase();
      const rPhone = ((r.phone || (r as any).phoneNumber || '') as string).trim();
      return (
        (regRef !== '' && rReg === regRef) ||
        (roll !== '' && roll !== 'UNASSIGNED' && rRoll === roll) ||
        (phone !== '' && rPhone !== '' && rPhone === phone)
      );
    });
    if (found) {
      const rName = (found.fullName || (found as any).name || '').trim();
      if (
        rName &&
        rName.toLowerCase() !== 'gym member' &&
        rName.toLowerCase() !== 'gym athlete' &&
        rName.toLowerCase() !== 'member'
      ) {
        return rName;
      }
    }
  }

  return !isGeneric ? rawName : 'Gym Member';
};

const normalizeFeePayment = (
  record: any,
  idx: number,
  allMembers?: Member[],
  allRegs?: RegistrationRequest[]
): FeePaymentRecord => {
  if (!record) return {} as FeePaymentRecord;
  const feeRef = String(record['Fee Reference Number'] ?? record['feeReferenceNumber'] ?? record['feeRef'] ?? record['id'] ?? `fee-${record['rowNumber'] || idx + 1}`);
  const regRef = String(record['Registration Reference Number'] ?? record['registrationReferenceNumber'] ?? record['registrationRef'] ?? '');
  const roll = String(record['Roll Number'] ?? record['rollNumber'] ?? record['rollNo'] ?? 'Unassigned');
  const name = resolveFeeMemberName(record, allMembers, allRegs);
  const phone = String(record['Phone Number'] ?? record['phoneNumber'] ?? record['memberPhone'] ?? record['phone'] ?? '');
  const email = String(record['Email Address'] ?? record['emailAddress'] ?? record['memberEmail'] ?? record['email'] ?? '');
  const plan = String(record['Selected Plan'] ?? record['selectedPlan'] ?? record['planName'] ?? record['membershipPlan'] ?? 'Basic Plan');
  const status = String(record['Payment Status'] ?? record['paymentStatus'] ?? record['status'] ?? 'Pending Verification');
  const remarks = String(record['Notes'] ?? record['notes'] ?? record['remarks'] ?? record['adminRemarks'] ?? '');
  const upiId = String(record['UPI Transaction ID'] ?? record['upiTransactionId'] ?? record['upiTxnId'] ?? '');
  const upiUrl = String(record['Payment Screenshot'] ?? record['paymentScreenshot'] ?? record['upiScreenshotUrl'] ?? '');
  const ts = String(record['Timestamp'] ?? record['timestamp'] ?? record['createdAt'] ?? new Date().toISOString());
  const amt = Number(record['Amount Paid'] ?? record['amountPaid'] ?? record['Current Fee Amount'] ?? record['currentFeeAmount'] ?? record['amount'] ?? 0);

  return {
    ...record,
    rowNumber: Number(record['rowNumber'] || record['rowNo'] || idx + 1),
    timestamp: ts,
    id: feeRef,
    feeReferenceNumber: feeRef,
    registrationReferenceNumber: regRef,
    registrationRef: regRef,
    rollNumber: roll,
    memberName: name,
    phoneNumber: phone,
    memberPhone: phone,
    emailAddress: email,
    memberEmail: email,
    selectedPlan: plan,
    planName: plan,
    previousBalance: Number(record['Previous Balance'] ?? record['previousBalance'] ?? 0),
    currentFeeAmount: amt,
    totalPayableAmount: Number(record['Total Payable Amount'] ?? record['totalPayableAmount'] ?? amt),
    amountPaid: amt,
    remainingBalance: Number(record['Remaining Balance'] ?? record['remainingBalance'] ?? 0),
    paymentType: record['Payment Type'] ?? record['paymentType'] ?? (Number(record['Remaining Balance'] || record['remainingBalance'] || 0) > 0 ? 'Partial Payment' : 'Full Payment'),
    paymentDate: record['Payment Date'] ?? record['paymentDate'] ?? ts.split('T')[0],
    paymentMethod: record['Payment Method'] ?? record['paymentMethod'] ?? 'UPI',
    upiTransactionId: upiId,
    upiTxnId: upiId,
    paymentScreenshot: upiUrl,
    upiScreenshotUrl: upiUrl,
    paymentStatus: status,
    status: status,
    registrationStatus: record['Registration Status'] ?? record['registrationStatus'] ?? '',
    receiptNumber: record['Receipt Number'] ?? record['receiptNumber'] ?? record['receiptNo'] ?? '',
    pdfReceiptLink: record['PDF Receipt Link'] ?? record['pdfReceiptLink'] ?? record['receiptUrl'] ?? '',
    entrySource: record['Entry Source'] ?? record['entrySource'] ?? 'Web Form',
    notes: remarks,
    remarks: remarks,
    verifiedBy: record['Verified By'] ?? record['verifiedBy'] ?? '',
    verifiedDate: record['Verified Date'] ?? record['verifiedDate'] ?? '',
    rejectionReason: record['Rejection Reason'] ?? record['rejectionReason'] ?? '',
  };
};

const normalizeActivityLog = (record: any, idx: number): ActivityLogRecord => {
  if (!record) return {} as ActivityLogRecord;
  const id = record['id'] ?? record['Log ID'] ?? `log-${idx + 1}`;
  const ts = record['timestamp'] ?? record['Timestamp'] ?? record['createdAt'] ?? new Date().toISOString();
  const actor = record['actor'] ?? record['Actor'] ?? record['user'] ?? 'System';
  const action = record['action'] ?? record['Action'] ?? 'Activity Logged';
  const targetType = record['targetType'] ?? record['Target Type'] ?? 'System';
  const targetId = record['targetId'] ?? record['Target ID'] ?? 'N/A';
  const oldVal = record['oldValue'] ?? record['Old Value'] ?? '-';
  const newVal = record['newValue'] ?? record['New Value'] ?? '-';
  const details = record['details'] ?? record['Details'] ?? record['description'] ?? '';

  return {
    ...record,
    id,
    timestamp: ts,
    actor,
    action,
    targetType,
    targetId,
    oldValue: oldVal,
    newValue: newVal,
    details,
  };
};

const getFeeReferenceNumber = (payment: any) =>
  String(
    payment?.feeReferenceNumber ||
    payment?.feeReference ||
    payment?.["Fee Reference Number"] ||
    payment?.feeRef ||
    payment?.id ||
    ""
  ).trim().toUpperCase();

const isStatusApproved = (status?: unknown): boolean => {
  if (!status) return false;
  const s = String(status).trim().toLowerCase();
  return s === 'approved' || s === 'successful' || s === 'active' || s === 'verified' || s === 'paid' || s === 'completed';
};

const isStatusRejected = (status?: unknown): boolean => {
  if (!status) return false;
  const s = String(status).trim().toLowerCase();
  return s === 'rejected' || s === 'failed' || s === 'cancelled' || s === 'inactive';
};

const callBackend = async (payload: Record<string, unknown>) => {
  const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(payload)
  });

  const rawText = await response.text();

  console.log("BACKEND RAW RESPONSE:", rawText);

  let result;

  try {
    result = JSON.parse(rawText);
  } catch {
    throw new Error(
      "Backend returned an invalid response: " + rawText
    );
  }

  console.log("AB GYM BACKEND:", result);

  if (!result || typeof result !== "object") {
    throw new Error("Backend returned an invalid JSON object: " + rawText);
  }

  if (!result.success) {
    throw new Error(
      String(result.message || "Backend request failed.")
    );
  }

  return result;
};

interface AdminPageProps {
  currentPath?: string;
  onNavigate: (path: string) => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ currentPath = '/admin/dashboard', onNavigate }) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const token = getSavedAdminToken();
    const expiry = localStorage.getItem(ADMIN_STORAGE_KEYS.EXPIRY) || sessionStorage.getItem(ADMIN_STORAGE_KEYS.EXPIRY);
    if (expiry && !isNaN(Number(expiry)) && Date.now() > Number(expiry)) {
      return false;
    }
    return Boolean(token) || localStorage.getItem(ADMIN_STORAGE_KEYS.LOGGED_IN) === 'true' || sessionStorage.getItem(ADMIN_STORAGE_KEYS.LOGGED_IN) === 'true';
  });
  const [adminToken, setAdminToken] = useState<string>(() => {
    return getSavedAdminToken();
  });

  const handleSessionExpired = useCallback((msg?: string) => {
    clearAdminSession();
    setIsAuthenticated(false);
    setAdminToken('');
    alert(msg || "Your admin session has expired. Please log in again.");
    onNavigate('/admin/login');
  }, [onNavigate]);

  // Idle Session Timeout (30 Minutes Inactivity)
  useEffect(() => {
    if (!isAuthenticated) return;

    const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
    let timeoutId: ReturnType<typeof setTimeout>;
    let lastResetTime = Date.now();

    const logoutDueToInactivity = () => {
      handleSessionExpired("You have been automatically logged out due to 30 minutes of inactivity.");
    };

    const resetIdleTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(logoutDueToInactivity, IDLE_TIMEOUT_MS);
      lastResetTime = Date.now();
    };

    // Throttle activity listeners to avoid unnecessary timer resets on continuous motion
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastResetTime > 3000) {
        resetIdleTimer();
      }
    };

    // Start initial timer
    resetIdleTimer();

    const activityEvents: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
    };
  }, [isAuthenticated, handleSessionExpired]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Derive Sub-tab from currentPath
  const getTabFromPath = (path: string): string => {
    if (path.includes('/admin/registrations')) return 'registrations';
    if (path.includes('/admin/members')) return 'members';
    if (path.includes('/admin/fee-records')) return 'fee-records';
    if (path.includes('/admin/payment-history')) return 'payment-history';
    if (path.includes('/admin/attendance')) return 'attendance';
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState<string>(getTabFromPath(currentPath));

  useEffect(() => {
    setActiveTab(getTabFromPath(currentPath));
  }, [currentPath]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    onNavigate(`/admin/${tab}`);
  };

  // Data States
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationRequest[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [feePayments, setFeePayments] = useState<FeePaymentRecord[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogRecord[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(getStoredAttendance());
  const [scanQuery, setScanQuery] = useState('');
  const [scanMessage, setScanMessage] = useState<{ success: boolean; text: string; member?: Member } | null>(null);

  const handleScanAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanQuery.trim()) return;
    const res = markMemberAttendance(scanQuery, 'Reception Scanner');
    setScanMessage({
      success: res.success,
      text: res.message,
      member: res.member,
    });
    setAttendanceRecords(getStoredAttendance());
    setScanQuery('');
  };
  const [settings, setSettingsState] = useState<GymSettings>(getStoredSettings());

  // Loading & Sync States
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'connected' | 'local'>('connected');
  const [sheetError, setSheetError] = useState<string>('');

  // Filters & Search
  const [regSearch, setRegSearch] = useState('');
  const [regStatusFilter, setRegStatusFilter] = useState('All Statuses');
  const [regPaymentFilter, setRegPaymentFilter] = useState('All');

  const [memberSearch, setMemberSearch] = useState('');
  const [memberStatusFilter, setMemberStatusFilter] = useState('All');

  const [feeSearch, setFeeSearch] = useState('');
  const [feeStatusFilter, setFeeStatusFilter] = useState('All Statuses');

  // Payment History Filters & Sorting
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('All');
  const [historyMethodFilter, setHistoryMethodFilter] = useState('All');
  const [historySortOrder, setHistorySortOrder] = useState<'newest' | 'oldest'>('newest');

  // Modals & Interactivity
  const [screenshotModalUrl, setScreenshotModalUrl] = useState<string | null>(null);
  const [viewRegModal, setViewRegModal] = useState<RegistrationRequest | null>(null);
  const [rejectRegModal, setRejectRegModal] = useState<RegistrationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingId, setProcessingId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [processingAction, setProcessingAction] = useState<{
    type: 'approve' | 'reject';
    id: string;
  } | null>(null);
  const [successAction, setSuccessAction] = useState<{
    type: 'approve' | 'reject';
    id: string;
    rollNumber?: string;
    message?: string;
    subtext?: string;
  } | null>(null);

  useEffect(() => {
    if (successAction) {
      const timer = setTimeout(() => {
        setSuccessAction(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [successAction]);

  const [rejectFeeModal, setRejectFeeModal] = useState<FeePaymentRecord | null>(null);
  const [feeRejectionReason, setFeeRejectionReason] = useState('');

  const [cardModalMember, setCardModalMember] = useState<Member | null>(null);
  const [receiptModalRecord, setReceiptModalRecord] = useState<FeePaymentRecord | null>(null);

  // Edit Member Modal State
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<{
    rollNumber: string;
    fullName: string;
    phone: string;
    email: string;
    planName: string;
    joiningDate: string;
    membershipExpiry: string;
    status: string;
    dob: string;
    gender: string;
    address: string;
    emergencyContact: string;
    fitnessGoal: string;
    medicalCondition: string;
    remarks: string;
  }>({
    rollNumber: '',
    fullName: '',
    phone: '',
    email: '',
    planName: '',
    joiningDate: '',
    membershipExpiry: '',
    status: 'Active',
    dob: '',
    gender: 'Male',
    address: '',
    emergencyContact: '',
    fitnessGoal: '',
    medicalCondition: '',
    remarks: '',
  });
  const [isUpdatingMember, setIsUpdatingMember] = useState(false);
  const [editMemberError, setEditMemberError] = useState('');
  const [memberSuccessToast, setMemberSuccessToast] = useState<{
    message: string;
    memberName?: string;
    rollNumber?: string;
  } | null>(null);

  useEffect(() => {
    if (memberSuccessToast) {
      const timer = setTimeout(() => {
        setMemberSuccessToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [memberSuccessToast]);

  // Edit & Restore Registration Modal State
  const [editingRegistration, setEditingRegistration] = useState<RegistrationRequest | null>(null);
  const [editRegForm, setEditRegForm] = useState<{
    fullName: string;
    phone: string;
    email: string;
    gender: string;
    dob: string;
    selectedPlan: string;
    registrationFee: number;
    status: 'Pending Verification' | 'Approved' | 'Rejected';
    paymentStatus: string;
    address: string;
    emergencyContact: string;
    adminRemarks: string;
    rejectionReason: string;
  }>({
    fullName: '',
    phone: '',
    email: '',
    gender: 'Male',
    dob: '',
    selectedPlan: 'Basic Plan',
    registrationFee: 100,
    status: 'Pending Verification',
    paymentStatus: 'Submitted',
    address: '',
    emergencyContact: '',
    adminRemarks: '',
    rejectionReason: '',
  });
  const [isUpdatingRegistration, setIsUpdatingRegistration] = useState(false);
  const [editRegError, setEditRegError] = useState('');

  useEffect(() => {
    if (editingRegistration) {
      setEditRegForm({
        fullName: editingRegistration.fullName || '',
        phone: editingRegistration.phoneNumber || editingRegistration.phone || '',
        email: editingRegistration.emailAddress || editingRegistration.email || '',
        gender: editingRegistration.gender || 'Male',
        dob: editingRegistration.dateOfBirth || editingRegistration.dob || '',
        selectedPlan: editingRegistration.selectedPlan || editingRegistration.planName || 'Basic Plan',
        registrationFee: editingRegistration.registrationFee ?? 100,
        status: (editingRegistration.registrationStatus || editingRegistration.status || 'Pending Verification') as any,
        paymentStatus: editingRegistration.paymentStatus || 'Submitted',
        address: editingRegistration.address || '',
        emergencyContact: editingRegistration.emergencyContactNumber || editingRegistration.emergencyContact || '',
        adminRemarks: editingRegistration.adminRemarks || '',
        rejectionReason: editingRegistration.rejectionReason || '',
      });
      setEditRegError('');
    }
  }, [editingRegistration]);

  const handleSaveEditRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRegForm.fullName.trim()) {
      setEditRegError('Full Name is required.');
      return;
    }
    if (!editRegForm.phone.trim()) {
      setEditRegError('Phone Number is required.');
      return;
    }

    setIsUpdatingRegistration(true);
    setEditRegError('');

    try {
      const regRef = (
        editingRegistration?.registrationReferenceNumber ||
        editingRegistration?.registrationRef ||
        editingRegistration?.id ||
        ''
      ).trim().toUpperCase();

      const payload = {
        action: 'updateRegistrationStatus',
        registrationReferenceNumber: regRef,
        registrationRef: regRef,
        fullName: editRegForm.fullName.trim(),
        name: editRegForm.fullName.trim(),
        phone: editRegForm.phone.trim(),
        phoneNumber: editRegForm.phone.trim(),
        email: editRegForm.email.trim(),
        emailAddress: editRegForm.email.trim(),
        gender: editRegForm.gender,
        dob: editRegForm.dob,
        dateOfBirth: editRegForm.dob,
        selectedPlan: editRegForm.selectedPlan.trim(),
        planName: editRegForm.selectedPlan.trim(),
        registrationFee: Number(editRegForm.registrationFee) || 0,
        status: editRegForm.status,
        registrationStatus: editRegForm.status,
        paymentStatus: editRegForm.paymentStatus,
        address: editRegForm.address,
        emergencyContact: editRegForm.emergencyContact,
        emergencyContactNumber: editRegForm.emergencyContact,
        adminRemarks: editRegForm.adminRemarks,
        rejectionReason: editRegForm.status === 'Rejected' ? editRegForm.rejectionReason : '',
        adminName: 'Admin',
      };

      const res = await apiService.updateRegistrationStatus(payload as any);
      if (res && res.success === false) {
        setEditRegError(res.message || 'Failed to update registration.');
        return;
      }

      // Optimistically update React state
      setRegistrations(prevRegs =>
        prevRegs.map(r => {
          const rRef = (r.registrationReferenceNumber || r.registrationRef || r.id || '').trim().toUpperCase();
          if (rRef === regRef) {
            return {
              ...r,
              fullName: editRegForm.fullName.trim(),
              phone: editRegForm.phone.trim(),
              phoneNumber: editRegForm.phone.trim(),
              email: editRegForm.email.trim(),
              emailAddress: editRegForm.email.trim(),
              gender: editRegForm.gender,
              dob: editRegForm.dob,
              dateOfBirth: editRegForm.dob,
              selectedPlan: editRegForm.selectedPlan.trim(),
              planName: editRegForm.selectedPlan.trim(),
              registrationFee: Number(editRegForm.registrationFee) || 0,
              status: editRegForm.status as any,
              registrationStatus: editRegForm.status as any,
              paymentStatus: editRegForm.paymentStatus,
              address: editRegForm.address,
              emergencyContact: editRegForm.emergencyContact,
              emergencyContactNumber: editRegForm.emergencyContact,
              adminRemarks: editRegForm.adminRemarks,
              rejectionReason: editRegForm.status === 'Rejected' ? editRegForm.rejectionReason : '',
            };
          }
          return r;
        })
      );

      setEditingRegistration(null);

      // Refresh background data
      await Promise.all([
        loadRegistrations(),
        loadMembers(),
        loadDashboard(),
        loadActivityLogs(),
      ]);
    } catch (err: any) {
      setEditRegError(err.message || 'Error updating registration details.');
    } finally {
      setIsUpdatingRegistration(false);
    }
  };

  const handleEditMember = (member: Member) => {
    console.log('EDIT CLICKED', member);
    console.log('selected member ID:', member.rollNumber || member.id || (member as any).rollNo);
    console.log('selected member object:', member);

    if (!member) return;

    setEditingMember(member);
    setEditFormData({
      rollNumber: member.rollNumber || (member as any).rollNo || (member as any)['Roll Number'] || member.id || '',
      fullName: member.fullName || (member as any).name || (member as any).memberName || (member as any)['Full Name'] || '',
      phone: member.phone || (member as any).phoneNumber || (member as any).memberPhone || (member as any)['Phone Number'] || '',
      email: member.email || (member as any).emailAddress || (member as any).memberEmail || (member as any)['Email Address'] || '',
      planName: member.planName || (member as any).membershipPlan || (member as any).selectedPlan || (member as any)['Plan Name'] || 'Basic Plan',
      joiningDate: normalizeDateForInput(member.joiningDate || (member as any).joinDate || (member as any).planStartDate || (member as any)['Joining Date'] || (member as any)['Join Date']),
      membershipExpiry: normalizeDateForInput(member.membershipExpiry || (member as any).expiryDate || (member as any).planExpiryDate || (member as any)['Membership Expiry'] || (member as any)['Expiry Date']),
      status: String(member.status || (member as any).membershipStatus || (member as any).memberStatus || (member as any)['Membership Status'] || 'Active'),
      dob: normalizeDateForInput(member.dob || (member as any).dateOfBirth || (member as any)['Date of Birth']),
      gender: member.gender || (member as any)['Gender'] || 'Male',
      address: member.address || (member as any)['Address'] || '',
      emergencyContact: member.emergencyContact || (member as any).emergencyContactNumber || (member as any)['Emergency Contact Number'] || '',
      fitnessGoal: member.fitnessGoal || (member as any)['Fitness Goal'] || '',
      medicalCondition: member.medicalCondition || (member as any)['Medical Condition'] || '',
      remarks: member.remarks || (member as any)['Remarks'] || '',
    });
    setEditMemberError('');
    setIsEditModalOpen(true);
    console.log('edit modal opened');
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('SAVE MEMBER CLICKED');
    console.log('EDIT DATA:', editFormData);

    const rollNoToUse = (
      editFormData.rollNumber ||
      editingMember?.rollNumber ||
      (editingMember as any)?.rollNo ||
      editingMember?.id ||
      ''
    ).trim();

    if (!rollNoToUse) {
      setEditMemberError('Roll Number / Member ID is required.');
      return;
    }
    if (!editFormData.fullName.trim()) {
      setEditMemberError('Full Name is required.');
      return;
    }

    const targetId = editingMember?.id;
    const targetRoll = editingMember?.rollNumber || (editingMember as any)?.rollNo || rollNoToUse;
    const origRoll = editingMember?.rollNumber || (editingMember as any)?.rollNo || rollNoToUse;
    const regRef = editingMember?.registrationRef || (editingMember as any)?.registrationReferenceNumber || '';

    const payload = {
      action: 'updateMember',
      id: targetId || rollNoToUse,
      rollNumber: rollNoToUse,
      rollNo: rollNoToUse,
      originalRollNumber: origRoll,
      fullName: editFormData.fullName.trim(),
      name: editFormData.fullName.trim(),
      phone: editFormData.phone.trim(),
      phoneNumber: editFormData.phone.trim(),
      email: editFormData.email.trim(),
      emailAddress: editFormData.email.trim(),
      planName: editFormData.planName.trim(),
      selectedPlan: editFormData.planName.trim(),
      membershipPlan: editFormData.planName.trim(),
      joiningDate: editFormData.joiningDate,
      joinDate: editFormData.joiningDate,
      membershipExpiry: editFormData.membershipExpiry,
      planExpiryDate: editFormData.membershipExpiry,
      expiryDate: editFormData.membershipExpiry,
      status: editFormData.status,
      memberStatus: editFormData.status,
      membershipStatus: editFormData.status,
      dob: editFormData.dob,
      dateOfBirth: editFormData.dob,
      gender: editFormData.gender,
      address: editFormData.address.trim(),
      emergencyContact: editFormData.emergencyContact.trim(),
      emergencyContactNumber: editFormData.emergencyContact.trim(),
      fitnessGoal: editFormData.fitnessGoal.trim(),
      medicalCondition: editFormData.medicalCondition.trim(),
      remarks: editFormData.remarks.trim(),
      registrationRef: regRef,
      registrationReferenceNumber: regRef,
      adminName: 'Admin',
    };

    console.log('Member ID:', rollNoToUse);
    console.log('Request payload:', payload);

    // 1. Immediately update Local Storage
    updateMemberInStorage({
      ...(editingMember || {}),
      ...payload,
      id: targetId || rollNoToUse,
      rollNumber: rollNoToUse,
      status: editFormData.status as any,
    });

    // 2. Immediately update UI state (optimistic update)
    const updatedMemberObj: Member = normalizeMember({
      ...(editingMember || {}),
      ...payload,
      id: targetId || editingMember?.id || rollNoToUse,
      rollNumber: rollNoToUse,
      updatedAt: new Date().toISOString(),
    }, 0);

    setMembers(prevMembers =>
      prevMembers.map(m => {
        const isMatch =
          (targetId && m.id === targetId) ||
          (targetRoll && m.rollNumber === targetRoll) ||
          (origRoll && m.rollNumber === origRoll) ||
          (m.rollNumber === rollNoToUse);
        return isMatch ? { ...m, ...updatedMemberObj } : m;
      })
    );

    // 3. Immediately close modal and show success toast
    setIsEditModalOpen(false);
    setEditingMember(null);
    setMemberSuccessToast({
      message: 'Member details updated successfully.',
      memberName: updatedMemberObj.fullName,
      rollNumber: updatedMemberObj.rollNumber,
    });

    // 4. Send update to live Google Sheets backend
    setIsUpdatingMember(true);
    setEditMemberError('');

    try {
      const res = await apiService.updateMember(payload);
      console.log('API response:', res);

      if (res && res.success === false) {
        if (
          res.code !== 'NETWORK_ERROR' &&
          res.code !== 'HTTP_404' &&
          res.code !== 'PARSE_ERROR' &&
          !(res.message && res.message.includes('Unknown action'))
        ) {
          console.error('Backend error:', res.message);
          setEditMemberError(`Failed to update member: ${res.message}`);
        }
      } else {
        console.log('Backend update successful:', res);
      }
    } catch (err: any) {
      console.error('Backend error:', err);
    } finally {
      setIsUpdatingMember(false);
      // Background re-fetch to keep everything in sync
      Promise.all([
        fetchMembers(),
        fetchDashboard(),
        fetchActivityLogs(),
      ]).catch(err => {
        console.warn('[Admin Edit Member] Background refresh warning:', err);
      });
    }
  };

  // Direct Add / Restoration Form State
  const [isDirectAddModalOpen, setIsDirectAddModalOpen] = useState(false);
  const [directAddMode, setDirectAddMode] = useState<'auto' | 'custom'>('auto');
  const [directAddForm, setDirectAddForm] = useState<{
    rollNumber: string;
    fullName: string;
    phone: string;
    email: string;
    gender: string;
    dob: string;
    planName: string;
    status: string;
    joiningDate: string;
    membershipExpiry: string;
    registrationFee: number;
    initialAmountPaid: number;
    paymentStatus: string;
    paymentMode: string;
    address: string;
    emergencyContact: string;
    fitnessGoal: string;
    medicalCondition: string;
    remarks: string;
    autoGenerateIdCard: boolean;
    recordFeePayment: boolean;
  }>({
    rollNumber: '',
    fullName: '',
    phone: '',
    email: '',
    gender: 'Male',
    dob: '',
    planName: 'Standard Plan',
    status: 'Active',
    joiningDate: new Date().toISOString().split('T')[0],
    membershipExpiry: '',
    registrationFee: 100,
    initialAmountPaid: 100,
    paymentStatus: 'Successful',
    paymentMode: 'Cash',
    address: '',
    emergencyContact: '',
    fitnessGoal: 'General Fitness',
    medicalCondition: '',
    remarks: 'Direct member registration / restored by admin',
    autoGenerateIdCard: true,
    recordFeePayment: true,
  });
  const [isSubmittingDirectAdd, setIsSubmittingDirectAdd] = useState(false);
  const [directAddError, setDirectAddError] = useState('');

  const calculateAutoExpiry = (joinDateStr: string, plan: string) => {
    const d = new Date(joinDateStr || new Date().toISOString().split('T')[0]);
    if (isNaN(d.getTime())) return '';
    const p = (plan || '').toLowerCase();
    if (p.includes('year') || p.includes('12 month') || p.includes('annual')) {
      d.setFullYear(d.getFullYear() + 1);
    } else if (p.includes('6 month') || p.includes('half')) {
      d.setMonth(d.getMonth() + 6);
    } else if (p.includes('3 month') || p.includes('quarter')) {
      d.setMonth(d.getMonth() + 3);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    return d.toISOString().split('T')[0];
  };

  const handleOpenDirectAddModal = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const expStr = calculateAutoExpiry(todayStr, 'Standard Plan');

    setDirectAddForm({
      rollNumber: '',
      fullName: '',
      phone: '',
      email: '',
      gender: 'Male',
      dob: '',
      planName: 'Standard Plan',
      status: 'Active',
      joiningDate: todayStr,
      membershipExpiry: expStr,
      registrationFee: 100,
      initialAmountPaid: 100,
      paymentStatus: 'Successful',
      paymentMode: 'Cash',
      address: '',
      emergencyContact: '',
      fitnessGoal: 'General Fitness',
      medicalCondition: '',
      remarks: 'Direct member registration / restored by admin',
      autoGenerateIdCard: true,
      recordFeePayment: true,
    });
    setDirectAddMode('auto');
    setDirectAddError('');
    setIsDirectAddModalOpen(true);
  };

  const handleDirectAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = directAddForm.fullName.trim();
    if (!name) {
      setDirectAddError('Full Name is required.');
      return;
    }
    const cleanPhone = directAddForm.phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setDirectAddError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (directAddMode === 'custom' && !directAddForm.rollNumber.trim()) {
      setDirectAddError('Please enter the custom / restored Roll Number (e.g. ABG-26-0001).');
      return;
    }

    setIsSubmittingDirectAdd(true);
    setDirectAddError('');

    try {
      const payload = {
        ...directAddForm,
        fullName: name,
        phone: cleanPhone,
        rollNumber: directAddMode === 'custom' ? directAddForm.rollNumber.trim().toUpperCase() : '',
        adminName: 'Admin',
      };

      console.log('[ADMIN] SUBMITTING DIRECT MEMBER REGISTRATION / RESTORATION:', payload);
      const res = await apiService.directAddMember(payload);
      console.log('[ADMIN] Direct Add / Restoration Result:', res);

      if (!res || res.success !== true) {
        throw new Error(res?.message || 'Failed to save member to Google Sheets.');
      }

      const addedMember: Member = (res && (res.data || res.member)) ? (res.data || res.member) : null;

      if (addedMember) {
        setMembers(prev => {
          const targetRoll = (addedMember.rollNumber || '').trim().toUpperCase();
          const exists = prev.some(m => (m.rollNumber || '').trim().toUpperCase() === targetRoll);
          return exists
            ? prev.map(m => (m.rollNumber || '').trim().toUpperCase() === targetRoll ? addedMember : m)
            : [addedMember, ...prev];
        });
      }

      setIsDirectAddModalOpen(false);

      // Trigger Confetti Celebration!
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}

      setMemberSuccessToast({
        message: `Member added successfully. ${name} (${addedMember?.rollNumber || 'Active'}) has been enrolled.`,
        memberName: name,
        rollNumber: addedMember?.rollNumber,
      });

      // Auto-open ID Card modal if option is checked
      if (directAddForm.autoGenerateIdCard && addedMember) {
        setCardModalMember(addedMember);
      }

      // Background re-fetch to sync across all tabs
      Promise.all([
        fetchMembers(),
        fetchRegistrations(),
        fetchFeePayments(),
        fetchDashboard(),
        fetchActivityLogs(),
      ]).catch(err => {
        console.warn('[Direct Add Member] Background refresh warning:', err);
      });
    } catch (err: any) {
      console.error('Failed to add member directly:', err);
      setDirectAddError(`Unable to save. ${err.message || String(err)}`);
    } finally {
      setIsSubmittingDirectAdd(false);
    }
  };

  // Add Fee Payment Modal State
  const [isAddFeeModalOpen, setIsAddFeeModalOpen] = useState(false);
  const [isSearchingMember, setIsSearchingMember] = useState(false);
  const [searchMemberError, setSearchMemberError] = useState('');
  const [isSubmittingFee, setIsSubmittingFee] = useState(false);
  const [submitFeeError, setSubmitFeeError] = useState('');
  const [feeSuccessToast, setFeeSuccessToast] = useState<{ receiptNumber: string; receiptUrl: string; message: string } | null>(null);
  const [addFeeForm, setAddFeeForm] = useState({
    referenceOrRollNumber: '',
    fullName: '',
    phoneNumber: '',
    emailAddress: '',
    selectedPlan: '',
    feeDuration: '1 Month',
    feeCalculationMode: 'Auto Calculate' as 'Auto Calculate' | 'Custom Amount',
    feePriceType: 'Regular Price' as 'Regular Price' | 'Offer Price' | 'Custom Price',
    regularPlanAmount: 0,
    finalFeeAmount: '',
    offerNote: '',
    offerValidFrom: '',
    offerValidUntil: '',
    savePriceForFuture: false,
    originalPlanAmount: 0,
    originalPlanDuration: 1,
    feeMonth: '',
    feeAmount: '',
    previousBalance: '0',
    discount: '0',
    amountPaid: '',
    paymentType: 'Full Payment' as 'Full Payment' | 'Partial Payment',
    paymentMethod: 'Cash' as 'Cash' | 'UPI',
    upiTransactionId: '',
    paymentDate: new Date().toISOString().split('T')[0],
    adminRemarks: '',
  });

  // Settings Form State
  const [scriptUrlInput, setScriptUrlInput] = useState(apiService.getScriptUrl());
  const [copiedScriptCode, setCopiedScriptCode] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Fetch Individual State Sections
  const fetchRegistrations = useCallback(async () => {
    const token = getSavedAdminToken();
    try {
      const regRes = await apiService.getRegistrations(token);
      if (regRes && regRes.success !== false) {
        const records = (regRes as any)?.data?.records ?? (Array.isArray((regRes as any)?.data) ? (regRes as any).data : ((regRes as any)?.records ?? []));
        const mappedRecords: RegistrationRequest[] = (Array.isArray(records) ? records : []).map((record: any, idx: number) => normalizeRegistration(record, idx));
        setRegistrations(mappedRecords);
      }
    } catch (err) {
      console.error('Error fetching registrations:', err);
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    const token = getSavedAdminToken();
    try {
      const memRes = await apiService.getMembers(token);
      let remoteMembers: Member[] = [];
      if (memRes && memRes.success !== false) {
        const memData = (memRes as any)?.data?.records ?? (Array.isArray((memRes as any)?.data) ? (memRes as any).data : ((memRes as any)?.records ?? []));
        remoteMembers = (Array.isArray(memData) ? memData : []).map((m: any, idx: number) => normalizeMember(m, idx));
      }

      const localMembers = getStoredMembers();
      if (localMembers && localMembers.length > 0) {
        const mergedMap = new Map<string, Member>();
        remoteMembers.forEach(m => {
          const key = (m.rollNumber || m.id || '').trim().toUpperCase();
          if (key) mergedMap.set(key, m);
        });
        localMembers.forEach(m => {
          const key = (m.rollNumber || m.id || '').trim().toUpperCase();
          if (key) {
            const normalizedLocal = normalizeMember(m, 0);
            const existing = mergedMap.get(key);
            if (!existing || new Date(m.updatedAt || m.timestamp || 0) >= new Date(existing.updatedAt || existing.timestamp || 0)) {
              mergedMap.set(key, normalizedLocal);
            }
          }
        });
        setMembers(Array.from(mergedMap.values()));
      } else {
        setMembers(remoteMembers);
      }
    } catch (err) {
      console.error('Error fetching members:', err);
      setMembers(getStoredMembers().map((m, idx) => normalizeMember(m, idx)));
    }
  }, []);

  const fetchDashboard = useCallback(async () => {
    const token = getSavedAdminToken();
    try {
      const dashRes = await apiService.getDashboard(token);
      if (dashRes && dashRes.success !== false && dashRes.data?.stats) {
        setStats(dashRes.data.stats);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    }
  }, []);

  const fetchFeePayments = useCallback(async () => {
    const token = getSavedAdminToken();
    try {
      const feeRes = await apiService.getFeePayments(token);
      if (feeRes && feeRes.success !== false) {
        const rawFeeRecords = (feeRes as any)?.data?.records ?? (Array.isArray((feeRes as any)?.data) ? (feeRes as any).data : ((feeRes as any)?.records ?? []));
        const mappedFeeRecords = (Array.isArray(rawFeeRecords) ? rawFeeRecords : []).map((record: any, idx: number) => normalizeFeePayment(record, idx));
        setFeePayments(mappedFeeRecords);
      }
    } catch (err) {
      console.error('Error fetching fee payments:', err);
    }
  }, []);

  const fetchActivityLogs = useCallback(async () => {
    const token = getSavedAdminToken();
    try {
      const logRes = await apiService.getActivityLogs(token);
      if (logRes && logRes.success !== false) {
        const logData = (logRes as any)?.data?.records ?? (Array.isArray((logRes as any)?.data) ? (logRes as any).data : ((logRes as any)?.records ?? []));
        setActivityLogs((Array.isArray(logData) ? logData : []).map((l: any, idx: number) => normalizeActivityLog(l, idx)));
      }
    } catch (err) {
      console.error('Error fetching activity logs:', err);
    }
  }, []);

  const loadRegistrations = fetchRegistrations;
  const loadMembers = fetchMembers;
  const loadDashboard = fetchDashboard;
  const loadActivityLogs = fetchActivityLogs;
  const loadFeePayments = fetchFeePayments;

  // Fetch Live Data
  const loadLiveData = useCallback(async () => {
    setIsLoading(true);
    const isConn = apiService.isGoogleScriptConnected();
    setSyncStatus(isConn ? 'connected' : 'local');

    const token = getSavedAdminToken();

    try {
      const [dashRes, regRes, memRes, feeRes, logRes] = await Promise.all([
        apiService.getDashboard(token),
        apiService.getRegistrations(token),
        apiService.getMembers(token),
        apiService.getFeePayments(token),
        apiService.getActivityLogs(token),
      ]);

      const sessionErrorRes = [regRes, memRes, feeRes, dashRes, logRes].find(
        (r) => r && (r.code === 'SESSION_EXPIRED' || r.code === 'INVALID_TOKEN')
      );

      if (sessionErrorRes) {
        handleSessionExpired(sessionErrorRes.message);
        return;
      }

      let foundError = '';
      if (regRes && regRes.success === false) foundError = regRes.message;
      if (memRes && memRes.success === false) foundError = memRes.message;
      if (feeRes && feeRes.success === false) foundError = feeRes.message;
      if (dashRes && dashRes.success === false) foundError = dashRes.message;
      if (logRes && logRes.success === false) foundError = logRes.message;
      setSheetError(foundError || '');

      console.log('Raw registration response:', regRes);

      const records = (regRes as any)?.data?.records ?? (Array.isArray((regRes as any)?.data) ? (regRes as any).data : ((regRes as any)?.records ?? []));
      console.log('Registration records:', records);

      const mappedRecords: RegistrationRequest[] = (Array.isArray(records) ? records : []).map((record: any, idx: number) => normalizeRegistration(record, idx));
      console.log('Mapped records:', mappedRecords);
      setRegistrations(mappedRecords);

      const parsedMembers: Member[] = (memRes && memRes.success !== false)
        ? ((memRes as any)?.data?.records ?? (Array.isArray((memRes as any)?.data) ? (memRes as any).data : ((memRes as any)?.records ?? []))).map((m: any, idx: number) => normalizeMember(m, idx))
        : [];
      setMembers(parsedMembers);

      // Process & Map Fee Payments
      console.log("Raw fee response:", feeRes);

      const rawFeeRecords = (feeRes as any)?.data?.records ?? (Array.isArray((feeRes as any)?.data) ? (feeRes as any).data : ((feeRes as any)?.records ?? []));
      const mappedFeeRecords = (Array.isArray(rawFeeRecords) ? rawFeeRecords : []).map((record: any, idx: number) => normalizeFeePayment(record, idx, parsedMembers, mappedRecords));
      console.log("Mapped fee records:", mappedFeeRecords);
      setFeePayments(mappedFeeRecords);

      if (dashRes && dashRes.success !== false && dashRes.data?.stats) {
        setStats(dashRes.data.stats);
      } else {
        setStats({ activeMembers: 0, totalRegistrations: 0, pendingRegistrations: 0, totalCollections: 0 });
      }
      if (logRes && logRes.success !== false) {
        const logData = (logRes as any)?.data?.records ?? (Array.isArray((logRes as any)?.data) ? (logRes as any).data : ((logRes as any)?.records ?? []));
        setActivityLogs((Array.isArray(logData) ? logData : []).map((l: any, idx: number) => normalizeActivityLog(l, idx)));
      } else {
        setActivityLogs([]);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [handleSessionExpired]);

  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadLiveData();
    } else if (!isAuthenticated) {
      hasLoadedRef.current = false;
    }
  }, [isAuthenticated, loadLiveData]);

  useEffect(() => {
    if (feePayments.length > 0 && (members.length > 0 || registrations.length > 0)) {
      setFeePayments((prevList) => {
        let changed = false;
        const updated = prevList.map((fee) => {
          const resolvedName = resolveFeeMemberName(fee, members, registrations);
          if (resolvedName !== fee.memberName && resolvedName !== 'Gym Member') {
            changed = true;
            return {
              ...fee,
              memberName: resolvedName,
              fullName: resolvedName,
            };
          }
          return fee;
        });
        return changed ? updated : prevList;
      });
    }
  }, [members, registrations, feePayments.length]);

  useEffect(() => {
    const token = getSavedAdminToken();
    const expiry = localStorage.getItem(ADMIN_STORAGE_KEYS.EXPIRY) || sessionStorage.getItem(ADMIN_STORAGE_KEYS.EXPIRY);
    const isExpired = expiry && !isNaN(Number(expiry)) && Date.now() > Number(expiry);

    if ((!token || isExpired) && currentPath !== '/admin/login') {
      if (isExpired) {
        handleSessionExpired("Your admin session has expired. Please log in again.");
      } else {
        setIsAuthenticated(false);
        onNavigate('/admin/login');
      }
    }
  }, [currentPath, onNavigate, handleSessionExpired]);

  // Admin Login Handler
  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setLoginError("Please enter admin email and password.");
      return;
    }

    setIsLoggingIn(true);
    setLoginError("");

    try {
      const response = await fetch(
        GOOGLE_APPS_SCRIPT_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "text/plain;charset=utf-8"
          },
          body: JSON.stringify({
            action: "adminLogin",
            email: cleanEmail,
            password: cleanPassword
          })
        }
      );

      const result = await response.json();
      console.log("AB GYM BACKEND:", result);

      if (!result.success) {
        throw new Error(
          result.message || "Admin login failed."
        );
      }

      localStorage.setItem(
        "abFitnessAdminToken",
        result.token
      );

      localStorage.setItem(
        "abFitnessAdminEmail",
        cleanEmail
      );

      const token = result.token || `token-${Date.now()}`;
      localStorage.setItem(ADMIN_STORAGE_KEYS.TOKEN, token);
      sessionStorage.setItem('abGymAdminToken', token);
      sessionStorage.setItem('abgym_admin_token', token);
      setAdminToken(token);

      const adminUser = result.data?.admin || result.admin || { email: cleanEmail };
      const userStr = typeof adminUser === 'string' ? adminUser : JSON.stringify(adminUser);
      localStorage.setItem(ADMIN_STORAGE_KEYS.USER, userStr);
      sessionStorage.setItem('abGymAdminUser', userStr);

      const expiresAt = result.data?.expiresAt || result.expiresAt || (Date.now() + 12 * 60 * 60 * 1000);
      localStorage.setItem(ADMIN_STORAGE_KEYS.EXPIRY, expiresAt.toString());
      sessionStorage.setItem(ADMIN_STORAGE_KEYS.EXPIRY, expiresAt.toString());

      localStorage.setItem(ADMIN_STORAGE_KEYS.LOGGED_IN, 'true');
      sessionStorage.setItem('abgym_admin_logged_in', 'true');

      setIsAuthenticated(true);
      onNavigate("/admin");
    } catch (error) {
      setLoginError(
        error instanceof Error
          ? error.message
          : "Admin login failed."
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    clearAdminSession();
    setIsAuthenticated(false);
    setAdminToken('');
    setPassword('');
    setEmail('');
    onNavigate('/admin/login');
  };

  // Live Google Sheets mode: Seeding sample data removed.

  // Actions: Registration Approval
  const handleApproveRegistration = async (registration: any) => {
    console.log("APPROVE BUTTON CLICKED", registration);

    if (isStatusApproved(registration?.registrationStatus || registration?.status)) {
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      setSuccessAction({
        type: 'approve',
        id: getRegistrationReference(registration),
        message: 'Already Approved!',
        subtext: 'This registration has already been verified and approved.'
      });
      return;
    }

    const token =
      localStorage.getItem("abFitnessAdminToken") ||
      localStorage.getItem("adminToken") ||
      localStorage.getItem("abGymAdminToken");

    console.log("ADMIN TOKEN FOUND:", Boolean(token));

    const registrationReferenceNumber =
      getRegistrationReference(registration);

    console.log(
      "APPROVE REFERENCE:",
      registrationReferenceNumber
    );

    setProcessingId(registrationReferenceNumber || "");
    setError("");

    try {
      if (!token) {
        throw new Error("Admin session expired. Please log in again.");
      }

      if (!registrationReferenceNumber) {
        throw new Error("Registration reference number is missing.");
      }

      const response = await fetch(
        GOOGLE_APPS_SCRIPT_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "text/plain;charset=utf-8"
          },
          body: JSON.stringify({
            action: "approveRegistration",
            token,
            registrationReferenceNumber,
            paymentStatus: "Successful",
            adminRemarks: "Registration verified and approved."
          })
        }
      );

      const rawText = await response.text();

      console.log("APPROVE RAW RESPONSE:", rawText);

      let result;

      try {
        result = JSON.parse(rawText);
      } catch {
        throw new Error(
          "Backend returned an invalid response: " + rawText
        );
      }

      console.log("AB GYM BACKEND:", result);

      if (!result.success) {
        throw new Error(
          result.message || "Registration approval failed."
        );
      }

      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#10B981', '#34D399', '#059669', '#F59E0B', '#FBBF24']
      });
      setSuccessAction({
        type: 'approve',
        id: registrationReferenceNumber,
        rollNumber: result.rollNumber,
        message: 'Registration Approved!',
        subtext: `Member successfully verified and assigned Roll Number: ${result.rollNumber}`
      });

      try {
        await loadRegistrations();
      } catch (err) {
        console.error("Failed to reload registrations:", err);
      }
      try {
        await loadMembers();
      } catch (err) {
        console.error("Failed to reload members:", err);
      }
      try {
        await loadDashboard();
      } catch (err) {
        console.error("Failed to reload dashboard:", err);
      }
      try {
        await loadActivityLogs();
      } catch (err) {
        console.error("Failed to reload activity logs:", err);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      const lowerMsg = message.toLowerCase();
      if (
        lowerMsg.includes("already approved") ||
        lowerMsg.includes("already assigned") ||
        lowerMsg.includes("already successful") ||
        lowerMsg.includes("already verified")
      ) {
        console.info("Registration already approved on backend:", registrationReferenceNumber);
        setError("");
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
        setSuccessAction({
          type: 'approve',
          id: registrationReferenceNumber,
          message: 'Already Approved!',
          subtext: 'This registration was already verified and approved on the backend.'
        });
        try {
          await loadRegistrations();
          await loadMembers();
          await loadDashboard();
          await loadActivityLogs();
        } catch {}
        return;
      }

      console.error("APPROVE FAILED:", error);
      setError(message);
      alert(message);
    } finally {
      setProcessingId("");
    }
  };

  const handleApprove = handleApproveRegistration;

  // Actions: Registration Rejection
  const handleRejectRegistration = async (registration: any, reason?: string) => {
    console.log("REJECT BUTTON CLICKED", registration);

    if (isStatusRejected(registration?.registrationStatus || registration?.status)) {
      setSuccessAction({
        type: 'reject',
        id: getRegistrationReference(registration),
        message: 'Already Rejected',
        subtext: 'This registration is already marked as rejected.'
      });
      return;
    }

    const token =
      localStorage.getItem("abFitnessAdminToken") ||
      localStorage.getItem("adminToken") ||
      localStorage.getItem("abGymAdminToken");

    console.log("ADMIN TOKEN FOUND:", Boolean(token));

    const registrationReferenceNumber =
      getRegistrationReference(registration);

    console.log(
      "REJECT REFERENCE:",
      registrationReferenceNumber
    );

    const rejectionReasonToUse = reason || rejectionReason || "Rejected by admin";

    setProcessingId(registrationReferenceNumber || "");
    setError("");

    try {
      if (!token) {
        throw new Error("Admin session expired. Please log in again.");
      }

      if (!registrationReferenceNumber) {
        throw new Error("Registration reference number is missing.");
      }

      const response = await fetch(
        GOOGLE_APPS_SCRIPT_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "text/plain;charset=utf-8"
          },
          body: JSON.stringify({
            action: "rejectRegistration",
            token,
            registrationReferenceNumber,
            rejectionReason: rejectionReasonToUse,
            adminRemarks: rejectionReasonToUse
          })
        }
      );

      const rawText = await response.text();

      console.log("REJECT RAW RESPONSE:", rawText);

      let result;

      try {
        result = JSON.parse(rawText);
      } catch {
        throw new Error(
          "Backend returned an invalid response: " + rawText
        );
      }

      console.log("AB GYM BACKEND:", result);

      if (!result.success) {
        throw new Error(
          result.message || "Registration rejection failed."
        );
      }

      setSuccessAction({
        type: 'reject',
        id: registrationReferenceNumber,
        message: 'Registration Rejected',
        subtext: `Registration ${registrationReferenceNumber} has been rejected and logged.`
      });

      try {
        await loadRegistrations();
      } catch (err) {
        console.error("Failed to reload registrations:", err);
      }
      try {
        await loadDashboard();
      } catch (err) {
        console.error("Failed to reload dashboard:", err);
      }
      try {
        await loadActivityLogs();
      } catch (err) {
        console.error("Failed to reload activity logs:", err);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      const lowerMsg = message.toLowerCase();
      if (lowerMsg.includes("already rejected")) {
        console.info("Registration already rejected on backend:", registrationReferenceNumber);
        setError("");
        setSuccessAction({
          type: 'reject',
          id: registrationReferenceNumber,
          message: 'Already Rejected',
          subtext: 'This registration is already marked as rejected on the backend.'
        });
        try {
          await loadRegistrations();
          await loadDashboard();
          await loadActivityLogs();
        } catch {}
        return;
      }

      console.error("REJECT FAILED:", error);
      setError(message);
      alert(message);
    } finally {
      setProcessingId("");
    }
  };

  const handleConfirmRejectRegistration = async () => {
    if (rejectRegModal) {
      await handleRejectRegistration(rejectRegModal, rejectionReason);
      setRejectRegModal(null);
      setRejectionReason('');
    }
  };

  // Actions: Fee Payment Approval
  const handleApproveFeePayment = async (payment: any) => {
    const token = localStorage.getItem("abFitnessAdminToken") || getSavedAdminToken();
    const feeReferenceNumber = getFeeReferenceNumber(payment);

    if (!token) {
      setError("Admin session expired. Please log in again.");
      return;
    }

    if (!feeReferenceNumber) {
      setError("Fee reference number is missing.");
      return;
    }

    if (isStatusApproved(payment?.paymentStatus || payment?.status)) {
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      setSuccessAction({
        type: 'approve',
        id: feeReferenceNumber,
        message: 'Already Approved!',
        subtext: 'This fee payment is already approved and marked as Successful.'
      });
      return;
    }

    setProcessingId(feeReferenceNumber);
    setError("");

    try {
      const result = await callBackend({
        action: "approveFeePayment",
        token,
        feeReferenceNumber,
        adminRemarks: "Payment checked and verified by admin."
      });

      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#10B981', '#34D399', '#059669', '#F59E0B', '#FBBF24']
      });
      setSuccessAction({
        type: 'approve',
        id: feeReferenceNumber,
        rollNumber: result.receiptNumber ? `Receipt: ${result.receiptNumber}` : undefined,
        message: 'Fee Payment Approved!',
        subtext: `Payment of ₹${payment?.amountPaid || 'fee'} verified as Successful.`
      });

      await loadFeePayments();
      await loadDashboard();
      await loadActivityLogs();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      const lowerMsg = message.toLowerCase();
      if (
        lowerMsg.includes("already approved") ||
        lowerMsg.includes("already marked") ||
        lowerMsg.includes("already successful") ||
        lowerMsg.includes("already verified") ||
        lowerMsg.includes("already paid")
      ) {
        console.info("Fee payment already approved on backend:", feeReferenceNumber);
        setError("");
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
        setSuccessAction({
          type: 'approve',
          id: feeReferenceNumber,
          message: 'Already Approved!',
          subtext: 'This fee payment is already approved and marked as Successful.'
        });
        try {
          await loadFeePayments();
          await loadDashboard();
          await loadActivityLogs();
        } catch {}
        return;
      }

      console.error("APPROVE FEE ERROR:", error);
      setError(message);
      alert(message);
    } finally {
      setProcessingId("");
    }
  };

  // Actions: Fee Payment Rejection
  const handleRejectFeePayment = async (payment: any, reason?: string) => {
    const token = localStorage.getItem("abFitnessAdminToken") || getSavedAdminToken();
    const feeReferenceNumber = getFeeReferenceNumber(payment);

    if (!token) {
      setError("Admin session expired. Please log in again.");
      return;
    }

    if (!feeReferenceNumber) {
      setError("Fee reference number is missing.");
      return;
    }

    if (isStatusRejected(payment?.paymentStatus || payment?.status)) {
      setSuccessAction({
        type: 'reject',
        id: feeReferenceNumber,
        message: 'Already Rejected',
        subtext: 'This fee payment is already marked as Rejected.'
      });
      return;
    }

    const reasonToUse = reason || feeRejectionReason || "Transaction rejected by admin";

    if (!reasonToUse.trim()) {
      setError("Please provide a rejection reason.");
      return;
    }

    setProcessingId(feeReferenceNumber);
    setError("");

    try {
      await callBackend({
        action: "rejectFeePayment",
        token,
        feeReferenceNumber,
        rejectionReason: reasonToUse.trim(),
        adminRemarks: reasonToUse.trim()
      });

      setSuccessAction({
        type: 'reject',
        id: feeReferenceNumber,
        message: 'Fee Payment Rejected',
        subtext: `Payment ${feeReferenceNumber} marked as rejected.`
      });

      await loadFeePayments();
      await loadDashboard();
      await loadActivityLogs();
      setRejectFeeModal(null);
      setFeeRejectionReason('');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      const lowerMsg = message.toLowerCase();
      if (lowerMsg.includes("already rejected") || lowerMsg.includes("already marked as rejected")) {
        console.info("Fee payment already rejected on backend:", feeReferenceNumber);
        setError("");
        setSuccessAction({
          type: 'reject',
          id: feeReferenceNumber,
          message: 'Already Rejected',
          subtext: 'This fee payment is already marked as Rejected.'
        });
        try {
          await loadFeePayments();
          await loadDashboard();
          await loadActivityLogs();
        } catch {}
        return;
      }

      console.error("REJECT FEE ERROR:", error);
      setError(message);
      alert(message);
    } finally {
      setProcessingId("");
    }
  };

  const handleConfirmRejectFee = async () => {
    if (rejectFeeModal) {
      await handleRejectFeePayment(rejectFeeModal, feeRejectionReason);
      setRejectFeeModal(null);
      setFeeRejectionReason('');
    }
  };

  // Helper to determine fee amount from plan name
  const getPlanAmount = (planName: string) => {
    const plan = String(planName || "").toLowerCase();

    if (plan.includes("basic")) return 999;
    if (plan.includes("monthly gold")) return 999;
    if (plan.includes("standard")) return 2499;
    if (plan.includes("premium")) return 4999;

    return 0;
  };

  // Helper to parse plan duration and plan amount
  const parsePlanDetails = (planName: string) => {
    const name = String(planName || "");
    let durationMonths = 1;
    let durationLabel = "1 Month";

    if (/12\s*Month|12\s*month|1\s*Year|1\s*year|Yearly|yearly/i.test(name)) {
      durationMonths = 12;
      durationLabel = "12 Months";
    } else if (/6\s*Month|6\s*month|Half\s*Yearly|Half-Yearly/i.test(name)) {
      durationMonths = 6;
      durationLabel = "6 Months";
    } else if (/3\s*Month|3\s*month|Quarterly|quarterly/i.test(name)) {
      durationMonths = 3;
      durationLabel = "3 Months";
    } else if (/2\s*Month|2\s*month/i.test(name)) {
      durationMonths = 2;
      durationLabel = "2 Months";
    } else if (/1\s*Month|1\s*month|Monthly|monthly|Basic|Gold/i.test(name)) {
      durationMonths = 1;
      durationLabel = "1 Month";
    }

    const priceMatch = name.match(/₹\s*(\d+)/) || name.match(/(\d+)\s*(INR|Rs)/i);
    let planAmount = 0;
    if (priceMatch && priceMatch[1]) {
      planAmount = Number(priceMatch[1]);
    } else {
      planAmount = getPlanAmount(name);
    }

    return { durationMonths, durationLabel, planAmount };
  };

  const parseDurationMonths = (durationStr: string) => {
    if (/12\s*Month|12\s*month|1\s*Year|1\s*year/i.test(durationStr)) return 12;
    if (/6\s*Month|6\s*month/i.test(durationStr)) return 6;
    if (/3\s*Month|3\s*month/i.test(durationStr)) return 3;
    if (/2\s*Month|2\s*month/i.test(durationStr)) return 2;
    if (/1\s*Month|1\s*month/i.test(durationStr)) return 1;
    const num = parseInt(durationStr, 10);
    return isNaN(num) || num <= 0 ? 1 : num;
  };

  const generateFeeMonthStr = (durationStr: string, baseDateStr?: string) => {
    const monthsCount = parseDurationMonths(durationStr);
    const baseDate = baseDateStr ? new Date(baseDateStr) : new Date();
    if (isNaN(baseDate.getTime())) return "";

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    const startMonthName = monthNames[baseDate.getMonth()];
    const startYear = baseDate.getFullYear();

    if (monthsCount <= 1) {
      return `${startMonthName} ${startYear}`;
    } else {
      const endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + monthsCount - 1, 1);
      const endMonthName = monthNames[endDate.getMonth()];
      const endYear = endDate.getFullYear();
      return `${startMonthName} ${startYear} - ${endMonthName} ${endYear}`;
    }
  };

  const handleDurationChange = (newDuration: string) => {
    setAddFeeForm((prev) => {
      const isCustom = newDuration === 'Custom';
      const newMode = isCustom ? 'Custom Amount' : prev.feeCalculationMode;

      let newFeeAmount = prev.feeAmount;
      if (newMode === 'Auto Calculate' && !isCustom) {
        const months = parseDurationMonths(newDuration);
        const monthlyFee = (prev.originalPlanAmount || 0) / (prev.originalPlanDuration || 1);
        newFeeAmount = String(Math.round(monthlyFee * months));
      }

      const newFeeMonth = generateFeeMonthStr(newDuration, prev.paymentDate);

      const numericFee = Number(newFeeAmount || 0);
      const numericPrevBal = Number(prev.previousBalance || 0);
      const numericDiscount = Number(prev.discount || 0);
      const totalPayable = Math.max(0, numericFee + numericPrevBal - numericDiscount);

      return {
        ...prev,
        feeDuration: newDuration,
        feeCalculationMode: newMode,
        feeAmount: newFeeAmount,
        feeMonth: newFeeMonth || prev.feeMonth,
        amountPaid: prev.paymentType === 'Full Payment' ? String(totalPayable) : prev.amountPaid,
      };
    });
  };

  const handleCalculationModeChange = (newMode: 'Auto Calculate' | 'Custom Amount') => {
    setAddFeeForm((prev) => {
      let newFeeAmount = prev.feeAmount;
      if (newMode === 'Auto Calculate' && prev.feeDuration !== 'Custom') {
        const months = parseDurationMonths(prev.feeDuration);
        const monthlyFee = (prev.originalPlanAmount || 0) / (prev.originalPlanDuration || 1);
        newFeeAmount = String(Math.round(monthlyFee * months));
      }

      const numericFee = Number(newFeeAmount || 0);
      const numericPrevBal = Number(prev.previousBalance || 0);
      const numericDiscount = Number(prev.discount || 0);
      const totalPayable = Math.max(0, numericFee + numericPrevBal - numericDiscount);

      return {
        ...prev,
        feeCalculationMode: newMode,
        feeAmount: newFeeAmount,
        amountPaid: prev.paymentType === 'Full Payment' ? String(totalPayable) : prev.amountPaid,
      };
    });
  };

  const handleFeePriceTypeChange = (newType: 'Regular Price' | 'Offer Price' | 'Custom Price') => {
    setAddFeeForm((prev) => {
      let newCalcMode = prev.feeCalculationMode;
      let newFeeAmount = prev.feeAmount;

      if (newType === 'Regular Price') {
        newCalcMode = 'Auto Calculate';
        const months = parseDurationMonths(prev.feeDuration);
        const basePrice = prev.regularPlanAmount || prev.originalPlanAmount || 0;
        const monthlyFee = basePrice / (prev.originalPlanDuration || 1);
        newFeeAmount = String(Math.round(monthlyFee * months));
      } else if (newType === 'Offer Price') {
        newCalcMode = 'Custom Amount';
        if (prev.finalFeeAmount && Number(prev.finalFeeAmount) > 0) {
          newFeeAmount = String(prev.finalFeeAmount);
        }
      } else if (newType === 'Custom Price') {
        newCalcMode = 'Custom Amount';
      }

      const numericFee = Number(newFeeAmount || 0);
      const numericPrevBal = Number(prev.previousBalance || 0);
      const numericDiscount = Number(prev.discount || 0);
      const totalPayable = Math.max(0, numericFee + numericPrevBal - numericDiscount);

      return {
        ...prev,
        feePriceType: newType,
        feeCalculationMode: newCalcMode,
        feeAmount: newFeeAmount,
        amountPaid: prev.paymentType === 'Full Payment' ? String(totalPayable) : prev.amountPaid,
      };
    });
  };

  // Helper: Open Pay Fee modal for a specific member or empty
  const handleOpenAddFeeForMember = (member?: Member) => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (member) {
      const selectedPlan = member.planName || 'Standard Plan';
      const planInfo = parsePlanDetails(selectedPlan);
      const regularAmount = planInfo.planAmount || getPlanAmount(selectedPlan) || 500;
      const prevBalance = Number(member.previousBalance ?? 0);
      const defaultDurationLabel = planInfo.durationLabel;
      const feeMonthStr = generateFeeMonthStr(defaultDurationLabel, todayStr);

      const parsedPriceType = ((member as any).feePriceType || 'Regular Price') as 'Regular Price' | 'Offer Price' | 'Custom Price';
      const parsedFinalFee = (member as any).finalFeeAmount ? Number((member as any).finalFeeAmount) : regularAmount;
      const resolvedFeeAmount = parsedPriceType !== 'Regular Price' ? parsedFinalFee : regularAmount;
      const totalPayable = Math.max(0, resolvedFeeAmount + prevBalance);

      setAddFeeForm({
        referenceOrRollNumber: member.rollNumber || member.registrationRef || '',
        fullName: member.fullName || '',
        phoneNumber: member.phone || '',
        emailAddress: member.email || '',
        selectedPlan: selectedPlan,
        feeDuration: defaultDurationLabel,
        feeCalculationMode: parsedPriceType !== 'Regular Price' ? 'Custom Amount' : 'Auto Calculate',
        feePriceType: parsedPriceType,
        regularPlanAmount: regularAmount,
        finalFeeAmount: String(parsedFinalFee),
        offerNote: (member as any).offerNote || '',
        offerValidFrom: (member as any).offerValidFrom || '',
        offerValidUntil: (member as any).offerValidUntil || '',
        savePriceForFuture: false,
        originalPlanAmount: regularAmount,
        originalPlanDuration: planInfo.durationMonths,
        feeMonth: feeMonthStr,
        feeAmount: String(resolvedFeeAmount),
        previousBalance: String(prevBalance),
        discount: '0',
        paymentType: 'Full Payment',
        amountPaid: String(totalPayable),
        paymentMethod: 'Cash',
        upiTransactionId: '',
        paymentDate: todayStr,
        adminRemarks: '',
      });
    } else {
      setAddFeeForm({
        referenceOrRollNumber: '',
        fullName: '',
        phoneNumber: '',
        emailAddress: '',
        selectedPlan: '',
        feeDuration: '1 Month',
        feeCalculationMode: 'Auto Calculate',
        feePriceType: 'Regular Price',
        regularPlanAmount: 0,
        finalFeeAmount: '',
        offerNote: '',
        offerValidFrom: '',
        offerValidUntil: '',
        savePriceForFuture: false,
        originalPlanAmount: 0,
        originalPlanDuration: 1,
        feeMonth: '',
        feeAmount: '',
        previousBalance: '0',
        discount: '0',
        paymentType: 'Full Payment',
        amountPaid: '',
        paymentMethod: 'Cash',
        upiTransactionId: '',
        paymentDate: todayStr,
        adminRemarks: '',
      });
    }
    setSearchMemberError('');
    setSubmitFeeError('');
    setIsAddFeeModalOpen(true);
  };

  // Actions: Search Member For Fee
  const handleSearchMemberForFee = async () => {
    const rawQuery = (addFeeForm.referenceOrRollNumber || '').trim();
    if (!rawQuery) {
      setSearchMemberError('Please enter a Roll Number, Registration Reference, Name, or Phone.');
      return;
    }

    setIsSearchingMember(true);
    setSearchMemberError('');

    try {
      const queryLower = rawQuery.toLowerCase();
      const queryClean = rawQuery.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const queryDigits = rawQuery.replace(/\D/g, '');

      // 1. Search in local members list
      let selectedMember: any = members.find((m: any) => {
        const mRoll = String(m.rollNumber || '').trim().toLowerCase();
        const mRollClean = String(m.rollNumber || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const mReg = String(m.registrationReferenceNumber || m.registrationRef || '').trim().toLowerCase();
        const mRegClean = String(m.registrationReferenceNumber || m.registrationRef || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const mName = String(m.fullName || m.name || '').trim().toLowerCase();
        const mPhone = String(m.phone || m.phoneNumber || '').replace(/\D/g, '');

        if (mRoll === queryLower || (queryClean && mRollClean === queryClean)) return true;
        if (mReg === queryLower || (queryClean && mRegClean === queryClean)) return true;
        if (mName && mName.includes(queryLower)) return true;
        if (queryDigits.length >= 4 && mPhone && mPhone.includes(queryDigits)) return true;
        return false;
      });

      // 2. Search in local registrations list if not found
      if (!selectedMember) {
        selectedMember = registrations.find((r: any) => {
          const rRoll = String(r.rollNumber || '').trim().toLowerCase();
          const rRollClean = String(r.rollNumber || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
          const rReg = getRegistrationReference(r).trim().toLowerCase();
          const rRegClean = getRegistrationReference(r).toUpperCase().replace(/[^A-Z0-9]/g, '');
          const rName = String(r.fullName || '').trim().toLowerCase();
          const rPhone = String(r.phone || r.phoneNumber || '').replace(/\D/g, '');

          if (rRoll === queryLower || (queryClean && rRollClean === queryClean)) return true;
          if (rReg === queryLower || (queryClean && rRegClean === queryClean)) return true;
          if (rName && rName.includes(queryLower)) return true;
          if (queryDigits.length >= 4 && rPhone && rPhone.includes(queryDigits)) return true;
          return false;
        }) || {};
      }

      const referenceOrRollNumber =
        selectedMember.rollNumber ||
        selectedMember.registrationReferenceNumber ||
        selectedMember.registrationRef ||
        rawQuery;

      const phoneFirst4 = String(
        selectedMember.phone ||
        selectedMember.phoneNumber ||
        selectedMember["Phone Number"] ||
        ""
      ).replace(/\D/g, "").slice(0, 4);

      const dateOfBirth =
        selectedMember.dateOfBirth ||
        selectedMember.dob ||
        selectedMember["Date of Birth"] ||
        "";

      const payload = {
        action: "getMemberForFee",
        referenceOrRollNumber,
        phoneFirst4,
        dateOfBirth,
      };

      const result: any = await apiService.getMemberForFee(payload);

      console.log("ADMIN MEMBER SEARCH RESPONSE:", result);

      if (!result || result.success === false) {
        const errorMsg = result?.message || result?.error || `No member found matching "${rawQuery}". Please check the Roll Number or Reg Ref.`;
        setSearchMemberError(errorMsg);
        return;
      }

      const memberData =
        result.member ||
        result.data ||
        result;

      console.log("ADMIN MEMBER DATA:", memberData);

      const selectedPlan =
        memberData.selectedPlan ||
        memberData["Selected Plan"] ||
        selectedMember.selectedPlan ||
        "";

      const previousBalance = Number(
        memberData.previousBalance ??
        memberData.outstandingBalance ??
        result.previousBalance ??
        result.outstandingBalance ??
        0
      );

      const planInfo = parsePlanDetails(selectedPlan);

      const parsedRegularPlanAmount = Number(
        memberData.regularPlanAmount ??
        memberData.planAmount ??
        memberData["Regular Plan Amount"] ??
        memberData["Plan Amount"] ??
        result.regularPlanAmount ??
        result.planAmount ??
        planInfo.planAmount ??
        getPlanAmount(selectedPlan) ??
        0
      );

      const baseRegularPrice = parsedRegularPlanAmount > 0 ? parsedRegularPlanAmount : (planInfo.planAmount || getPlanAmount(selectedPlan));

      const parsedFeePriceType = (
        memberData.feePriceType ||
        memberData["Fee Price Type"] ||
        result.feePriceType ||
        "Regular Price"
      ) as 'Regular Price' | 'Offer Price' | 'Custom Price';

      const parsedFinalFeeAmount = Number(
        memberData.finalFeeAmount ??
        memberData.offerAmount ??
        memberData["Final Fee Amount"] ??
        memberData["Offer Amount"] ??
        result.finalFeeAmount ??
        result.offerAmount ??
        0
      );

      const offerNote =
        memberData.offerNote ||
        memberData["Offer Note"] ||
        memberData.priceNote ||
        memberData["Price Note"] ||
        result.offerNote ||
        "";

      const offerValidFrom =
        memberData.offerValidFrom ||
        memberData["Offer Valid From"] ||
        result.offerValidFrom ||
        "";

      const offerValidUntil =
        memberData.offerValidUntil ||
        memberData["Offer Valid Until"] ||
        result.offerValidUntil ||
        "";

      let isOfferExpired = false;
      if (offerValidUntil) {
        const todayStr = new Date().toISOString().split('T')[0];
        if (todayStr > offerValidUntil) {
          isOfferExpired = true;
        }
      }

      const isOfferActive = !isOfferExpired && parsedFinalFeeAmount > 0 && parsedFeePriceType !== "Regular Price";
      const resolvedPriceType = isOfferActive ? parsedFeePriceType : "Regular Price";
      const resolvedFeeAmount = isOfferActive ? parsedFinalFeeAmount : baseRegularPrice;

      const originalPlanDuration = planInfo.durationMonths;
      const defaultDurationLabel = planInfo.durationLabel;

      const initialFeeMonth = generateFeeMonthStr(defaultDurationLabel, addFeeForm.paymentDate);

      console.log("ADMIN FEE AMOUNT:", resolvedFeeAmount);
      console.log("ADMIN PREVIOUS BALANCE:", previousBalance);
      console.log("PARSED PLAN DETAILS:", planInfo);

      const fullName =
        memberData.fullName ||
        memberData["Full Name"] ||
        selectedMember.fullName ||
        selectedMember.name ||
        "";

      const phoneNumber =
        memberData.phoneNumber ||
        memberData.phone ||
        memberData["Phone Number"] ||
        selectedMember.phone ||
        selectedMember.phoneNumber ||
        "";

      const emailAddress =
        memberData.emailAddress ||
        memberData.email ||
        memberData["Email"] ||
        selectedMember.email ||
        selectedMember.emailAddress ||
        "";

      const resolvedRefOrRoll = selectedMember.rollNumber || memberData.rollNumber || selectedMember.registrationReferenceNumber || memberData.registrationReference || rawQuery;

      setAddFeeForm((prev) => ({
        ...prev,
        referenceOrRollNumber: resolvedRefOrRoll,
        fullName,
        phoneNumber,
        emailAddress,
        selectedPlan,
        feeDuration: defaultDurationLabel,
        feeCalculationMode: isOfferActive ? 'Custom Amount' : 'Auto Calculate',
        feePriceType: resolvedPriceType,
        regularPlanAmount: baseRegularPrice,
        finalFeeAmount: String(parsedFinalFeeAmount > 0 ? parsedFinalFeeAmount : resolvedFeeAmount),
        offerNote,
        offerValidFrom,
        offerValidUntil,
        savePriceForFuture: false,
        originalPlanAmount: baseRegularPrice,
        originalPlanDuration,
        feeMonth: initialFeeMonth,
        feeAmount: String(resolvedFeeAmount),
        previousBalance: String(previousBalance),
        discount: "0",
        paymentType: "Full Payment",
        amountPaid: String(
          Math.max(0, resolvedFeeAmount + previousBalance)
        ),
      }));
    } catch (err: any) {
      console.error("getMemberForFee failed:", err);
      setSearchMemberError(err.message || String(err) || 'Error searching for member.');
    } finally {
      setIsSearchingMember(false);
    }
  };

  // Actions: Submit Add Fee Payment
  const handleSubmitAddFeePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFeeForm.referenceOrRollNumber.trim()) {
      setSubmitFeeError('Please enter a Roll Number or Registration Reference.');
      return;
    }

    let resolvedFeeMonth = addFeeForm.feeMonth.trim();
    if (!resolvedFeeMonth) {
      const now = new Date();
      resolvedFeeMonth = `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
    }

    let resolvedFullName = (addFeeForm.fullName || (addFeeForm as any).memberName || '').trim();
    let resolvedPhone = (addFeeForm.phoneNumber || (addFeeForm as any).phone || '').trim();
    let resolvedEmail = (addFeeForm.emailAddress || (addFeeForm as any).email || '').trim();
    let resolvedPlan = addFeeForm.selectedPlan || '';

    if (!resolvedFullName || !resolvedPlan) {
      const queryClean = addFeeForm.referenceOrRollNumber.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      const matchMem = members.find(m =>
        (m.rollNumber || '').toUpperCase().replace(/[^A-Z0-9]/g, '') === queryClean ||
        (m.registrationRef || '').toUpperCase().replace(/[^A-Z0-9]/g, '') === queryClean
      );
      if (matchMem) {
        if (!resolvedFullName) resolvedFullName = matchMem.fullName;
        if (!resolvedPhone) resolvedPhone = matchMem.phone;
        if (!resolvedEmail) resolvedEmail = matchMem.email;
        if (!resolvedPlan) resolvedPlan = matchMem.planName;
      } else {
        const matchReg = registrations.find(r =>
          (r.rollNumber || '').toUpperCase().replace(/[^A-Z0-9]/g, '') === queryClean ||
          getRegistrationReference(r).toUpperCase().replace(/[^A-Z0-9]/g, '') === queryClean
        );
        if (matchReg) {
          if (!resolvedFullName) resolvedFullName = matchReg.fullName;
          if (!resolvedPhone) resolvedPhone = matchReg.phone;
          if (!resolvedEmail) resolvedEmail = matchReg.email;
          if (!resolvedPlan) resolvedPlan = matchReg.selectedPlan;
        }
      }
    }

    if (!addFeeForm.feeAmount || isNaN(Number(addFeeForm.feeAmount))) {
      setSubmitFeeError('Please enter a valid Fee Amount.');
      return;
    }

    const feeAmount = Number(addFeeForm.feeAmount || 0);
    const previousBalance = Number(addFeeForm.previousBalance || 0);
    const discount = Number(addFeeForm.discount || 0);
    const totalPayable = Math.max(0, feeAmount + previousBalance - discount);

    const amountPaid = addFeeForm.paymentType === 'Full Payment'
      ? totalPayable
      : Number(addFeeForm.amountPaid || 0);

    const remainingBalance = Math.max(0, totalPayable - amountPaid);

    if (addFeeForm.paymentMethod === 'UPI' && !addFeeForm.upiTransactionId.trim()) {
      setSubmitFeeError('Please enter the UPI Transaction ID.');
      return;
    }

    setIsSubmittingFee(true);
    setSubmitFeeError('');

    const payload = {
      action: "adminSubmitFeePayment",
      token: localStorage.getItem("abFitnessAdminToken") || getSavedAdminToken(),
      referenceOrRollNumber: addFeeForm.referenceOrRollNumber.trim(),
      memberName: resolvedFullName || `Member (${addFeeForm.referenceOrRollNumber.trim()})`,
      fullName: resolvedFullName || `Member (${addFeeForm.referenceOrRollNumber.trim()})`,
      phone: resolvedPhone,
      phoneNumber: resolvedPhone,
      email: resolvedEmail,
      emailAddress: resolvedEmail,
      selectedPlan: resolvedPlan || 'Gym Membership',
      feeDuration: addFeeForm.feeDuration,
      feeCalculationMode: addFeeForm.feeCalculationMode,
      feePriceType: addFeeForm.feePriceType,
      regularPlanAmount: Number(addFeeForm.regularPlanAmount || addFeeForm.originalPlanAmount || 0),
      finalFeeAmount: Number(addFeeForm.feeAmount || 0),
      offerNote: addFeeForm.offerNote.trim(),
      offerValidFrom: addFeeForm.offerValidFrom || '',
      offerValidUntil: addFeeForm.offerValidUntil || '',
      savePriceForFuture: addFeeForm.savePriceForFuture,
      feeMonth: resolvedFeeMonth,
      feeAmount,
      previousBalance,
      discount,
      totalPaid: amountPaid,
      paymentType: addFeeForm.paymentType,
      paymentMethod: addFeeForm.paymentMethod,
      upiTransactionId:
        addFeeForm.paymentMethod === "UPI"
          ? addFeeForm.upiTransactionId.trim()
          : "",
      paymentDate: addFeeForm.paymentDate,
      adminRemarks: addFeeForm.adminRemarks.trim()
    };

    try {
      console.log('[ADMIN] SUBMITTING ADMIN FEE PAYMENT:', payload);
      const result = await apiService.adminSubmitFeePayment(payload);
      console.log('[ADMIN] Admin Fee Payment Result:', result);

      if (!result || result.success !== true) {
        throw new Error(result?.message || 'Failed to record fee payment on Google Sheets.');
      }

      setIsAddFeeModalOpen(false);

      const receiptNumber = result.receiptNumber || result.receiptNo || 'Generated';
      const receiptUrl = result.receiptUrl || '';
      const finalRemainingBal = result.remainingBalance !== undefined ? Number(result.remainingBalance) : remainingBalance;

      setFeeSuccessToast({
        message: result.message || `Payment recorded successfully. Receipt #: ${receiptNumber} | Remaining Balance: ₹${finalRemainingBal.toLocaleString("en-IN")}`,
        receiptNumber,
        receiptUrl,
      });

      await Promise.all([
        fetchFeePayments(),
        fetchMembers(),
        fetchDashboard(),
        fetchActivityLogs(),
      ]);
    } catch (err: any) {
      setSubmitFeeError(`Unable to save. ${err.message || String(err)}`);
    } finally {
      setIsSubmittingFee(false);
    }
  };

  // Actions: Resend ID Card
  const handleResendIdCard = async (member: Member) => {
    const token = getSavedAdminToken();
    if (!token) {
      handleSessionExpired('Admin session expired. Please log in again.');
      return;
    }
    if (!member.rollNumber) {
      alert('Roll Number is required to resend ID card.');
      return;
    }
    if (!window.confirm(`Are you sure you want to resend the ID Card to ${member.fullName} (${member.email || member.phone})?`)) {
      return;
    }
    setProcessingId(`resend-id-${member.rollNumber}`);
    try {
      const res = await apiService.resendIdCard(member.rollNumber, token);
      if (res.success) {
        alert(res.message || `ID Card resent successfully to ${member.fullName}.`);
      } else {
        if (res.code === 'SESSION_EXPIRED' || res.code === 'INVALID_TOKEN') {
          handleSessionExpired(res.message);
          return;
        }
        alert(res.message || 'Failed to resend ID Card.');
      }
    } catch (err: any) {
      alert(err.message || 'Error resending ID Card.');
    } finally {
      setProcessingId('');
    }
  };

  // Actions: Resend Receipt
  const handleResendReceipt = async (fee: FeePaymentRecord) => {
    const token = getSavedAdminToken();
    if (!token) {
      handleSessionExpired('Admin session expired. Please log in again.');
      return;
    }
    if (!fee.feeReferenceNumber) {
      alert('Fee Reference Number is required to resend receipt.');
      return;
    }
    if (!window.confirm(`Are you sure you want to resend the verified fee receipt for ${fee.feeReferenceNumber} to ${fee.memberName || 'the member'}?`)) {
      return;
    }
    setProcessingId(`resend-receipt-${fee.feeReferenceNumber}`);
    try {
      const res = await apiService.resendReceipt(fee.feeReferenceNumber, token);
      if (res.success) {
        alert(res.message || `Receipt resent successfully for ${fee.feeReferenceNumber}.`);
      } else {
        if (res.code === 'SESSION_EXPIRED' || res.code === 'INVALID_TOKEN') {
          handleSessionExpired(res.message);
          return;
        }
        alert(res.message || 'Failed to resend receipt.');
      }
    } catch (err: any) {
      alert(err.message || 'Error resending receipt.');
    } finally {
      setProcessingId('');
    }
  };

  // Save Apps Script Endpoint URL
  const handleSaveScriptUrl = (e: React.FormEvent) => {
    e.preventDefault();
    apiService.setScriptUrl(scriptUrlInput.trim());
    localStorage.removeItem('abgym_members_v1');
    localStorage.removeItem('abgym_registrations_v1');
    localStorage.removeItem('abgym_payments_v1');
    localStorage.removeItem('abgym_activity_logs_v1');
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
    loadLiveData();
    alert('Google Sheet URL saved! Local cache cleared to ensure strictly live Google Sheet data is used.');
  };

  const handleSaveGymSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings(settings);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
    alert('Payment & Gym settings saved successfully!');
  };

  const handleCopyScriptCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopiedScriptCode(true);
    setTimeout(() => setCopiedScriptCode(false), 3000);
  };

  const handleForceRefresh = () => {
    localStorage.removeItem('abgym_members_v1');
    localStorage.removeItem('abgym_registrations_v1');
    localStorage.removeItem('abgym_payments_v1');
    localStorage.removeItem('abgym_activity_logs_v1');
    loadLiveData();
    alert('Local cache purged. Fetching strictly from your Google Sheet URL!');
  };

  // Render Login Screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050505] text-[#f5f5f4] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated Background Ambience */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.25, 0.15],
            x: [0, 20, 0],
            y: [0, -20, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/4 right-1/4 w-96 h-96 bg-red-600/20 blur-[120px] rounded-full pointer-events-none"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.2, 0.1],
            x: [0, -30, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md bg-[#0F0F12]/95 backdrop-blur-xl border border-zinc-800/90 rounded-3xl p-8 space-y-6 shadow-2xl relative z-10 overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 blur-3xl rounded-full" />
          <div className="text-center space-y-3">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="flex justify-center"
            >
              <img
                src={abGymLogo}
                alt="AB Gym Official Logo"
                referrerPolicy="no-referrer"
                loading="eager"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallbackEl = document.getElementById('admin-login-logo-fallback');
                  if (fallbackEl) fallbackEl.style.display = 'flex';
                }}
                className="h-16 w-auto object-contain filter drop-shadow-[0_0_14px_rgba(37,99,235,0.45)]"
              />
              <div
                id="admin-login-logo-fallback"
                style={{ display: 'none' }}
                className="w-14 h-14 mx-auto rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-500 items-center justify-center"
              >
                <ShieldCheck className="w-7 h-7" />
              </div>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              className="text-2xl font-black text-white font-mono uppercase tracking-tight"
            >
              ADMINISTRATOR LOGIN
            </motion.h1>
          </div>

          <AnimatePresence mode="wait">
            {loginError && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                transition={{ duration: 0.25 }}
                className="p-3.5 bg-red-950/60 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2 overflow-hidden"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* DEMO CREDENTIALS HINT */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-xl text-xs space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-red-500" /> Default Admin Credentials
              </span>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => {
                  setEmail("manavsinghal.demo@gmail.com");
                  setPassword("ABFitness@2026");
                  setLoginError("");
                }}
                className="text-[11px] text-red-400 hover:text-red-300 font-bold underline cursor-pointer transition-colors"
              >
                Autofill Credentials
              </motion.button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
              <div className="bg-zinc-950/60 p-2 rounded border border-zinc-800/80">
                <span className="text-zinc-500 block text-[10px]">Email:</span>
                <span className="text-zinc-200 font-semibold select-all break-all">manavsinghal.demo@gmail.com</span>
              </div>
              <div className="bg-zinc-950/60 p-2 rounded border border-zinc-800/80">
                <span className="text-zinc-500 block text-[10px]">Password:</span>
                <span className="text-zinc-200 font-semibold select-all">ABFitness@2026</span>
              </div>
            </div>
          </motion.div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* ADMIN EMAIL */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Admin Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  placeholder="manavsinghal.demo@gmail.com"
                  className="w-full px-4 py-3 bg-[#18181B] border border-zinc-700/80 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all pr-10"
                  required
                />
                <Mail className="w-4 h-4 text-zinc-500 absolute right-3.5 top-3.5" />
              </div>
            </div>

            {/* ADMIN PASSWORD */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Admin Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter admin password"
                  className="w-full px-4 py-3 bg-[#18181B] border border-zinc-700/80 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 bg-gradient-to-r from-red-600 via-red-500 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-sm tracking-wider uppercase rounded-xl transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>AUTHENTICATE & ACCESS</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>

          <div className="text-center pt-2">
            <motion.button
              whileHover={{ x: -3 }}
              onClick={() => onNavigate('/')}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              &larr; Back to AB Gym Home
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Filtered Datasets
  const filteredRegs = registrations.filter((r) => {
    const query = regSearch.trim().toLowerCase();
    const refNum = String(r.registrationReferenceNumber || r.registrationRef || '');
    const name = String(r.fullName || '');
    const phone = String(r.phoneNumber || r.phone || '');
    const email = String(r.emailAddress || r.email || '');
    const roll = String(r.rollNumber || '');

    const matchesSearch =
      !query ||
      refNum.toLowerCase().includes(query) ||
      roll.toLowerCase().includes(query) ||
      name.toLowerCase().includes(query) ||
      phone.toLowerCase().includes(query) ||
      email.toLowerCase().includes(query);

    const statusVal = r.registrationStatus || r.status;
    const matchesStatus =
      regStatusFilter === 'All Statuses' ||
      regStatusFilter === 'All' ||
      statusVal === regStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const filteredMembers = members.filter((m) => {
    const query = memberSearch.trim().toLowerCase();
    const name = String(m.fullName || m.name || '');
    const roll = String(m.rollNumber || m.rollNo || '');
    const phone = String(m.phone || m.phoneNumber || '');
    const email = String(m.email || m.emailAddress || '');

    const matchesSearch =
      !query ||
      name.toLowerCase().includes(query) ||
      roll.toLowerCase().includes(query) ||
      phone.toLowerCase().includes(query) ||
      email.toLowerCase().includes(query);

    const matchesStatus = memberStatusFilter === 'All' || m.status === memberStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredFees = feePayments.filter((record) => {
    const query = feeSearch.trim().toLowerCase();

    const feeRef = String(record.feeReferenceNumber || record.feeRef || '');
    const regRef = String(record.registrationReferenceNumber || record.registrationRef || '');
    const roll = String(record.rollNumber || '');
    const name = String(record.memberName || record.fullName || '');
    const phone = String(record.phoneNumber || record.memberPhone || record.phone || '');

    const matchesSearch =
      !query ||
      feeRef.toLowerCase().includes(query) ||
      regRef.toLowerCase().includes(query) ||
      roll.toLowerCase().includes(query) ||
      name.toLowerCase().includes(query) ||
      phone.toLowerCase().includes(query);

    const matchesStatus =
      feeStatusFilter === "All Statuses" ||
      feeStatusFilter === "All" ||
      record.paymentStatus === feeStatusFilter ||
      record.status === feeStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const parsePaymentDateForSort = (record: FeePaymentRecord): number => {
    const dStr = record.paymentDate || record.timestamp || record.createdAt || (record as any).date || '';
    if (!dStr) return 0;
    const parsed = Date.parse(dStr);
    if (!isNaN(parsed)) return parsed;

    const parts = dStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d.getTime();
    }
    return 0;
  };

  const filteredPaymentHistory = feePayments
    .filter((record) => {
      const query = historySearch.trim().toLowerCase();

      const feeRef = String(record.feeReferenceNumber || record.feeRef || '');
      const regRef = String(record.registrationReferenceNumber || record.registrationRef || '');
      const roll = String(record.rollNumber || '');
      const name = String(record.memberName || record.fullName || '');
      const phone = String(record.phoneNumber || record.memberPhone || record.phone || '');
      const upi = String(record.upiTransactionId || record.upiTxnId || '');
      const receipt = String(record.receiptNumber || '');

      const matchesSearch =
        !query ||
        feeRef.toLowerCase().includes(query) ||
        regRef.toLowerCase().includes(query) ||
        roll.toLowerCase().includes(query) ||
        name.toLowerCase().includes(query) ||
        phone.toLowerCase().includes(query) ||
        upi.toLowerCase().includes(query) ||
        receipt.toLowerCase().includes(query);

      const status = record.paymentStatus || record.status || '';
      const matchesStatus =
        historyStatusFilter === 'All' ||
        (historyStatusFilter === 'Successful' && (status === 'Successful' || status === 'Approved')) ||
        (historyStatusFilter === 'Pending Verification' && (status === 'Pending Verification' || status === 'Pending')) ||
        (historyStatusFilter === 'Rejected' && status === 'Rejected');

      const method = String(record.paymentMethod || '');
      const matchesMethod =
        historyMethodFilter === 'All' ||
        method.toLowerCase() === historyMethodFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesMethod;
    })
    .sort((a, b) => {
      const dateA = parsePaymentDateForSort(a);
      const dateB = parsePaymentDateForSort(b);
      if (historySortOrder === 'newest') {
        return dateB - dateA;
      } else {
        return dateA - dateB;
      }
    });

  return (
    <div className="min-h-screen bg-[#050505] text-[#f5f5f4] flex flex-col font-sans">
      {/* Top Admin Navigation Header */}
      <header className="bg-[#0A0A0D] border-b border-zinc-800/80 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Title & Sync Indicator */}
            <div className="flex items-center gap-3">
              <img
                src={abGymLogo}
                alt="AB Gym Official Logo"
                referrerPolicy="no-referrer"
                loading="eager"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallbackEl = document.getElementById('admin-hdr-logo-fallback');
                  if (fallbackEl) fallbackEl.style.display = 'flex';
                }}
                className="h-10 w-auto object-contain filter drop-shadow-[0_0_8px_rgba(37,99,235,0.3)]"
              />
              <div
                id="admin-hdr-logo-fallback"
                style={{ display: 'none' }}
                className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-500 items-center justify-center"
              >
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                  AB GYM ADMIN
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-400 font-mono font-normal uppercase">
                    v2.0
                  </span>
                </h1>
                <p className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      syncStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  />
                  <span>
                    {syncStatus === 'connected' ? 'Google Sheets Live Sync' : 'Google Sheets Sync Engine'}
                  </span>
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <motion.button
                whileHover={{ scale: 1.04, y: -1 }}
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={() => handleOpenAddFeeForMember()}
                className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-900/40 transition-all cursor-pointer"
                title="Record Member Fee Payment"
              >
                <IndianRupee className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">+ Pay Fee</span>
                <span className="sm:hidden">+ Fee</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.04, y: -1 }}
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={handleOpenDirectAddModal}
                className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-900/40 transition-all cursor-pointer"
                title="Directly enroll new member or restore past record"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">+ Direct Add / Restore Member</span>
                <span className="sm:hidden">+ Add Member</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={loadLiveData}
                disabled={isLoading}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                title="Refresh Live Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh Data</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleLogout}
                className="px-3 py-1.5 bg-red-950/40 border border-red-600/30 hover:bg-red-900/40 text-red-400 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </motion.button>
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                className="bg-red-950/80 border border-red-500 text-red-200 px-4 py-3 rounded-2xl my-2 flex items-center justify-between font-sans text-sm overflow-hidden"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                  <span>{error}</span>
                </div>
                <button type="button" onClick={() => setError('')} className="text-red-400 font-bold ml-4 hover:text-white cursor-pointer">✕</button>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {sheetError && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                className="bg-red-950/40 border border-red-500/40 rounded-2xl p-4 my-2 flex items-start gap-3.5 overflow-hidden"
              >
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-red-300">Google Sheet Connection Notice</h4>
                  <p className="text-xs text-red-200/90 mt-1 leading-relaxed">
                    {sheetError}
                  </p>
                  <div className="mt-2 text-[11px] text-zinc-400">
                    💡 <strong className="text-zinc-300">Fix tip:</strong> Ensure your Google Apps Script Web App URL is deployed with <span className="font-mono bg-zinc-800 px-1 py-0.5 rounded text-zinc-200">Who has access: Anyone</span>.
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sub Navigation Tabs */}
          <nav className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none border-t border-zinc-800/40 pt-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
              { id: 'registrations', label: 'Registrations', icon: UserCheck, count: registrations.filter(r => r.status === 'Pending Verification' || (r.status as string) === 'Pending').length, path: '/admin/registrations' },
              { id: 'members', label: 'Members', icon: Users, count: members.length, path: '/admin/members' },
              { id: 'fee-records', label: 'Fee Payments', icon: CreditCard, count: feePayments.filter(f => f.status === 'Pending Verification').length, path: '/admin/fee-records' },
              { id: 'payment-history', label: 'Payment History', icon: History, count: feePayments.length, path: '/admin/payment-history' },
              { id: 'attendance', label: 'QR Attendance', icon: QrCode, count: attendanceRecords.filter(a => a.date === new Date().toISOString().split('T')[0]).length, path: '/admin/attendance' },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleTabChange(tab.id)}
                  className={`relative px-3.5 py-2.5 rounded-t-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer z-10 ${
                    isActive
                      ? 'text-white'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeAdminTabIndicator"
                      className="absolute inset-0 bg-zinc-800/80 rounded-t-lg border-b-2 border-red-500 z-[-1]"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    />
                  )}
                  <Icon className={`w-4 h-4 ${isActive ? 'text-red-500' : 'text-zinc-400'}`} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <motion.span
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-red-600 text-white font-bold shadow-sm shadow-red-600/50"
                    >
                      {tab.count}
                    </motion.span>
                  )}
                </motion.button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-8"
            >
              {/* KPI Cards Grid */}
              <div className="space-y-3">
                <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4 text-red-500" />
                  Live Key Performance Metrics
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {/* 1. Registrations */}
                  <motion.div
                    whileHover={{ y: -3, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="p-4 bg-[#0F0F12] border border-zinc-800/80 hover:border-zinc-700 rounded-2xl space-y-1 shadow-md hover:shadow-xl transition-colors"
                  >
                    <span className="text-[11px] font-bold text-zinc-400 uppercase">Total Registrations</span>
                    <div className="text-2xl font-black text-white font-mono">{stats?.totalRegistrations ?? registrations.length}</div>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -3, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="p-4 bg-[#0F0F12] border border-amber-500/20 hover:border-amber-500/40 rounded-2xl space-y-1 shadow-md hover:shadow-xl transition-colors"
                  >
                    <span className="text-[11px] font-bold text-amber-400 uppercase">Pending Regs</span>
                    <div className="text-2xl font-black text-amber-400 font-mono">
                      {stats?.pendingRegistrations ?? registrations.filter(r => r.status === 'Pending Verification' || (r.status as string) === 'Pending').length}
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -3, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="p-4 bg-[#0F0F12] border border-emerald-500/20 hover:border-emerald-500/40 rounded-2xl space-y-1 shadow-md hover:shadow-xl transition-colors"
                  >
                    <span className="text-[11px] font-bold text-emerald-400 uppercase">Approved Regs</span>
                    <div className="text-2xl font-black text-emerald-400 font-mono">
                      {stats?.approvedRegistrations ?? registrations.filter(r => isStatusApproved(r.status)).length}
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -3, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="p-4 bg-[#0F0F12] border border-red-500/20 hover:border-red-500/40 rounded-2xl space-y-1 shadow-md hover:shadow-xl transition-colors"
                  >
                    <span className="text-[11px] font-bold text-red-400 uppercase">Rejected Regs</span>
                    <div className="text-2xl font-black text-red-400 font-mono">
                      {stats?.rejectedRegistrations ?? registrations.filter(r => isStatusRejected(r.status)).length}
                    </div>
                  </motion.div>

                  {/* 2. Members */}
                  <motion.div
                    whileHover={{ y: -3, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="p-4 bg-[#0F0F12] border border-zinc-800/80 hover:border-zinc-700 rounded-2xl space-y-1 shadow-md hover:shadow-xl transition-colors"
                  >
                    <span className="text-[11px] font-bold text-zinc-400 uppercase">Total Members</span>
                    <div className="text-2xl font-black text-white font-mono">{stats?.totalMembers ?? members.length}</div>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -3, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="p-4 bg-[#0F0F12] border border-emerald-500/20 hover:border-emerald-500/40 rounded-2xl space-y-1 shadow-md hover:shadow-xl transition-colors"
                  >
                    <span className="text-[11px] font-bold text-emerald-400 uppercase">Active Members</span>
                    <div className="text-2xl font-black text-emerald-400 font-mono">
                      {stats?.activeMembers ?? members.filter(m => isStatusApproved(m.status)).length}
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -3, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="p-4 bg-[#0F0F12] border border-zinc-700/60 hover:border-zinc-600 rounded-2xl space-y-1 shadow-md hover:shadow-xl transition-colors"
                  >
                    <span className="text-[11px] font-bold text-zinc-400 uppercase">Expired Members</span>
                    <div className="text-2xl font-black text-zinc-400 font-mono">
                      {stats?.expiredMembers ?? members.filter(m => m.status === 'Expired').length}
                    </div>
                  </motion.div>

                  {/* 3. Fee Payments */}
                  <motion.div
                    whileHover={{ y: -3, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="p-4 bg-[#0F0F12] border border-amber-500/20 hover:border-amber-500/40 rounded-2xl space-y-1 shadow-md hover:shadow-xl transition-colors"
                  >
                    <span className="text-[11px] font-bold text-amber-400 uppercase">Pending Fee Payments</span>
                    <div className="text-2xl font-black text-amber-400 font-mono">
                      {stats?.pendingFeePayments ?? feePayments.filter(f => !isStatusApproved(f.status) && !isStatusRejected(f.status)).length}
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -3, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="p-4 bg-[#0F0F12] border border-emerald-500/20 hover:border-emerald-500/40 rounded-2xl space-y-1 shadow-md hover:shadow-xl transition-colors"
                  >
                    <span className="text-[11px] font-bold text-emerald-400 uppercase">Successful Fees</span>
                    <div className="text-2xl font-black text-emerald-400 font-mono">
                      {stats?.successfulFeePayments ?? feePayments.filter(f => isStatusApproved(f.status)).length}
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -3, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="p-4 bg-[#0F0F12] border border-red-500/20 hover:border-red-500/40 rounded-2xl space-y-1 shadow-md hover:shadow-xl transition-colors"
                  >
                    <span className="text-[11px] font-bold text-red-400 uppercase">Rejected Fees</span>
                    <div className="text-2xl font-black text-red-400 font-mono">
                      {stats?.rejectedFeePayments ?? feePayments.filter(f => isStatusRejected(f.status)).length}
                    </div>
                  </motion.div>

                  {/* 4. Revenue */}
                  <motion.div
                    whileHover={{ y: -3, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="p-4 bg-gradient-to-br from-emerald-950/40 to-emerald-900/20 border border-emerald-500/30 hover:border-emerald-500/60 rounded-2xl space-y-1 shadow-md hover:shadow-xl transition-colors"
                  >
                    <span className="text-[11px] font-bold text-emerald-300 uppercase">Today's Collection</span>
                    <div className="text-2xl font-black text-emerald-300 font-mono">
                      ₹{(stats?.todayCollection ?? 0).toLocaleString()}
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -3, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="p-4 bg-gradient-to-br from-blue-950/40 to-blue-900/20 border border-blue-500/30 hover:border-blue-500/60 rounded-2xl space-y-1 shadow-md hover:shadow-xl transition-colors"
                  >
                    <span className="text-[11px] font-bold text-blue-300 uppercase">Monthly Collection</span>
                    <div className="text-2xl font-black text-blue-300 font-mono">
                      ₹{(stats?.monthlyCollection ?? feePayments.filter(f => isStatusApproved(f.status)).reduce((a, b) => a + (Number(b.amountPaid) || 0), 0)).toLocaleString()}
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Recent Activity Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Registrations Card */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-[#0F0F12] border border-zinc-800/80 rounded-3xl p-6 space-y-4 shadow-xl"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-red-500" />
                      Recent Registrations
                    </h3>
                    <motion.button
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleTabChange('registrations')}
                      className="text-xs text-red-400 hover:text-red-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span>View All</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3">Reg Ref</th>
                          <th className="py-2.5 px-3">Name & Phone</th>
                          <th className="py-2.5 px-3">Plan</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50 text-zinc-300 font-mono">
                        {registrations.slice(0, 5).map((r) => (
                          <tr key={r.id || r.registrationRef} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="py-2.5 px-3 font-bold text-red-400">{r.registrationRef}</td>
                            <td className="py-2.5 px-3 font-sans">
                              <div className="font-bold text-white">{r.fullName}</div>
                              <div className="text-[11px] text-zinc-400">{r.phone}</div>
                            </td>
                            <td className="py-2.5 px-3 font-sans text-zinc-300">{r.planName}</td>
                            <td className="py-2.5 px-3 font-sans">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isStatusApproved(r.status)
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : isStatusRejected(r.status)
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-amber-500/20 text-amber-400 animate-pulse'
                                }`}
                              >
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {registrations.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-zinc-500 font-sans">
                              No live records found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>

                {/* Recent Fee Payments Card */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="bg-[#0F0F12] border border-zinc-800/80 rounded-3xl p-6 space-y-4 shadow-xl"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-500" />
                      Recent Fee Payments
                    </h3>
                    <motion.button
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleTabChange('fee-records')}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span>View All</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3">Fee Ref</th>
                          <th className="py-2.5 px-3">Member</th>
                          <th className="py-2.5 px-3">Amount</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50 text-zinc-300 font-mono">
                        {feePayments.slice(0, 5).map((f) => (
                          <tr key={f.id || f.feeReferenceNumber} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="py-2.5 px-3 font-bold text-emerald-400">{f.feeReferenceNumber}</td>
                            <td className="py-2.5 px-3 font-sans font-bold text-white">{f.memberName}</td>
                            <td className="py-2.5 px-3 font-bold text-white">₹{f.amountPaid}</td>
                            <td className="py-2.5 px-3 font-sans">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isStatusApproved(f.status)
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : isStatusRejected(f.status)
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-amber-500/20 text-amber-400'
                                }`}
                              >
                                {f.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {feePayments.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-zinc-500 font-sans">
                              No live records found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

        {/* TAB 2: REGISTRATIONS */}
        {activeTab === 'registrations' && (
          <motion.div
            key="registrations"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            {error && (
              <div className="bg-red-950/80 border border-red-500 text-red-200 px-4 py-3 rounded-xl font-sans text-sm flex items-center justify-between animate-in fade-in">
                <span>{error}</span>
                <button type="button" onClick={() => setError('')} className="text-red-400 font-bold ml-4 hover:text-white cursor-pointer">✕</button>
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white font-mono uppercase tracking-tight flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-red-500" />
                  REGISTRATION REQUESTS ({registrations.length})
                </h2>
                <p className="text-xs text-zinc-400">
                  Manage incoming user registrations, verify payments, assign Roll Numbers, and approve memberships.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <form onSubmit={(e) => e.preventDefault()} className="flex items-center gap-1.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      value={regSearch}
                      onChange={(e) => setRegSearch(e.target.value)}
                      placeholder="Search Ref, Name, Phone..."
                      className="pl-9 pr-8 py-2 bg-[#0F0F12] border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-all"
                    />
                    {regSearch && (
                      <button
                        type="button"
                        onClick={() => setRegSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer p-0.5"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Search</span>
                  </button>
                </form>

                <select
                  value={regStatusFilter}
                  onChange={(e) => setRegStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-[#0F0F12] border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                >
                  <option value="All Statuses">All Statuses</option>
                  <option value="Pending Verification">Pending Verification</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>

                <button
                  type="button"
                  onClick={handleOpenDirectAddModal}
                  className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">+ Direct Add / Restore</span>
                  <span className="md:hidden">+ Add</span>
                </button>
              </div>
            </div>

            {/* Registrations Table */}
            <div className="bg-[#0F0F12] border border-zinc-800/80 rounded-3xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#141419] border-b border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Registration Ref</th>
                      <th className="py-3 px-4">Assigned Roll</th>
                      <th className="py-3 px-4">Athlete Details</th>
                      <th className="py-3 px-4">Selected Plan</th>
                      <th className="py-3 px-4">Fee & Method</th>
                      <th className="py-3 px-4">Screenshot</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300 font-mono">
                    {isLoading ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-zinc-400 font-sans">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin text-red-500" />
                            <span>Loading registrations from live Google Sheets...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredRegs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-zinc-500 font-sans font-bold">
                          No live records found.
                        </td>
                      </tr>
                    ) : (
                      filteredRegs.map((registration) => {
                        const reg = registration;
                        const refNum = reg.registrationReferenceNumber || reg.registrationRef;
                        const statusVal = reg.registrationStatus || reg.status;
                        const rollVal = reg.rollNumber;
                        const phoneVal = reg.phoneNumber || reg.phone;
                        const emailVal = reg.emailAddress || reg.email;
                        const planVal = reg.selectedPlan || reg.planName;
                        const screenshotVal = reg.paymentScreenshot || reg.upiScreenshotUrl;
                        const txnVal = reg.upiTransactionId || reg.upiTxnId;

                        const linkedFee = feePayments.find(p => {
                          const pRef = (p.registrationRef || p.registrationReferenceNumber || '').trim().toUpperCase();
                          const pRoll = (p.rollNumber || '').trim().toUpperCase();
                          return (
                            (refNum && pRef === refNum.trim().toUpperCase()) ||
                            (rollVal && rollVal !== 'Unassigned' && pRoll === rollVal.trim().toUpperCase())
                          );
                        });

                        let feeBadge = null;
                        if (linkedFee) {
                          const pStat = (linkedFee.paymentStatus || '').toLowerCase();
                          if (pStat === 'approved' || pStat === 'verified' || pStat === 'successful') {
                            feeBadge = (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                Fee Verified
                              </span>
                            );
                          } else if (pStat === 'rejected') {
                            feeBadge = (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                                Payment Rejected
                              </span>
                            );
                          } else {
                            feeBadge = (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                                Fee Submitted – Pending Verification
                              </span>
                            );
                          }
                        } else if ((reg.paymentStatus || '').toLowerCase() === 'successful') {
                          feeBadge = (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Fee Verified
                            </span>
                          );
                        } else if ((reg.paymentStatus || '').toLowerCase() === 'pending verification') {
                          feeBadge = (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                              Fee Submitted – Pending Verification
                            </span>
                          );
                        } else {
                          feeBadge = (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                              Fee Not Submitted
                            </span>
                          );
                        }

                        return (
                          <tr key={reg.id || refNum} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-red-400 whitespace-nowrap">
                              {refNum}
                              <div className="text-[10px] text-zinc-500 font-normal">
                                {reg.timestamp || (reg.createdAt ? new Date(reg.createdAt).toLocaleDateString() : 'Recent')}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              {rollVal && rollVal !== 'Unassigned' && rollVal !== 'Pending' ? (
                                <span className="px-2 py-0.5 rounded bg-blue-950/60 text-blue-400 border border-blue-500/30 font-bold text-[11px]">
                                  {rollVal}
                                </span>
                              ) : (
                                <span className="text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[11px] font-sans font-semibold">
                                  Pending Approval
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-sans">
                              <div className="font-bold text-white text-sm">{reg.fullName}</div>
                              <div className="text-xs text-zinc-400 font-mono">
                                {phoneVal}{emailVal ? ` | ${emailVal}` : ''}
                              </div>
                              {(reg.gender || reg.fitnessGoal) && (
                                <div className="text-[10px] text-zinc-500">
                                  {reg.gender}{reg.fitnessGoal ? `, Goal: ${reg.fitnessGoal}` : ''}
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-sans font-medium text-zinc-200">
                              {planVal || 'Standard'}
                            </td>
                            <td className="py-3.5 px-4 font-sans">
                              <div className="mb-1">{feeBadge}</div>
                              <div className="text-xs font-bold text-emerald-400 font-mono mt-1">₹{linkedFee?.amountPaid || reg.registrationFee || 100}</div>
                              <div className="text-[10px] text-zinc-400 uppercase font-mono">
                                {linkedFee?.paymentMethod || reg.paymentMethod || 'UPI'} {(linkedFee?.upiTxnId || txnVal) ? `(${linkedFee?.upiTxnId || txnVal})` : ''}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              {(linkedFee?.paymentScreenshot || screenshotVal) ? (
                                <button
                                  onClick={() => setScreenshotModalUrl(linkedFee?.paymentScreenshot || screenshotVal)}
                                  className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-[11px] font-sans font-semibold flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5 text-blue-400" />
                                  <span>View Receipt</span>
                                </button>
                              ) : (
                                <span className="text-zinc-600 text-[11px] font-sans">No attachment</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-sans">
                              <motion.span
                                key={statusVal}
                                initial={{ scale: 0.7, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-block ${
                                  isStatusApproved(statusVal)
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : isStatusRejected(statusVal)
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                                }`}
                              >
                                {statusVal}
                              </motion.span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2 font-sans flex-wrap">
                                <button
                                  onClick={() => setViewRegModal(reg)}
                                  className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                  title="View Registration Details"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View Details</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setEditingRegistration(reg)}
                                  className="px-2.5 py-1.5 bg-purple-900/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Edit Registration & Restoration Options"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                                  <span>Edit / Restore</span>
                                </button>

                                {linkedFee && (linkedFee.paymentStatus === 'Pending Verification' || linkedFee.paymentStatus === 'Pending' || linkedFee.paymentStatus === 'Submitted') && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleApproveFeePayment(linkedFee)}
                                      className="px-2 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                                      title="Verify Fee Payment"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Verify Fee</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setRejectFeeModal(linkedFee)}
                                      className="px-2 py-1.5 bg-red-900/80 hover:bg-red-800 text-red-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                                      title="Reject Fee Payment"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      <span>Reject Fee</span>
                                    </button>
                                  </>
                                )}

                                {!isStatusApproved(statusVal) && (
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    type="button"
                                    onClick={() => handleApproveRegistration(registration)}
                                    disabled={
                                      processingId === getRegistrationReference(registration)
                                    }
                                    className="px-2.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 disabled:opacity-60 disabled:cursor-not-allowed"
                                  >
                                    {processingId === getRegistrationReference(registration) ? (
                                      <>
                                        <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                                        <span>Approving...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Check className="w-3.5 h-3.5 text-white" />
                                        <span>Approve</span>
                                      </>
                                    )}
                                  </motion.button>
                                )}

                                {!isStatusRejected(statusVal) && (
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    type="button"
                                    onClick={() => setRejectRegModal(registration)}
                                    disabled={
                                      processingId === getRegistrationReference(registration)
                                    }
                                    className="px-2.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer bg-red-950/60 border border-red-600/40 hover:bg-red-900/60 text-red-400 disabled:opacity-60 disabled:cursor-not-allowed"
                                  >
                                    {processingId === getRegistrationReference(registration) ? (
                                      <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Processing...</span>
                                      </>
                                    ) : (
                                      <>
                                        <XCircle className="w-3.5 h-3.5" />
                                        <span>Reject</span>
                                      </>
                                    )}
                                  </motion.button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 3: MEMBERS */}
        {activeTab === 'members' && (
          <motion.div
            key="members"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white font-mono uppercase tracking-tight flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-500" />
                  APPROVED GYM MEMBERS ({filteredMembers.length})
                </h2>
                <p className="text-xs text-zinc-400">
                  Official active and past member directory with digital ID card generation.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <form onSubmit={(e) => e.preventDefault()} className="flex items-center gap-1.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Search Roll, Name, Phone..."
                      className="pl-9 pr-8 py-2 bg-[#0F0F12] border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-all"
                    />
                    {memberSearch && (
                      <button
                        type="button"
                        onClick={() => setMemberSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer p-0.5"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Search</span>
                  </button>
                </form>

                <select
                  value={memberStatusFilter}
                  onChange={(e) => setMemberStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-[#0F0F12] border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Expired">Expired</option>
                </select>

                <button
                  type="button"
                  onClick={handleOpenDirectAddModal}
                  className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">+ Direct Add / Restore Member</span>
                  <span className="md:hidden">+ Add Member</span>
                </button>
              </div>
            </div>

            {/* Members Table */}
            <div className="bg-[#0F0F12] border border-zinc-800/80 rounded-3xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#141419] border-b border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Roll Number</th>
                      <th className="py-3 px-4">Member Details</th>
                      <th className="py-3 px-4">Plan & Expiry</th>
                      <th className="py-3 px-4">Joining Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300 font-mono">
                    {filteredMembers.map((m) => (
                      <tr key={m.id || m.rollNumber} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-blue-400 whitespace-nowrap">
                          {m.rollNumber}
                        </td>
                        <td className="py-3.5 px-4 font-sans">
                          <div className="font-bold text-white text-sm">{m.fullName}</div>
                          <div className="text-xs text-zinc-400 font-mono">{m.phone} | {m.email}</div>
                        </td>
                        <td className="py-3.5 px-4 font-sans">
                          <div className="font-bold text-zinc-200">{m.planName}</div>
                          <div className="text-[11px] text-zinc-400 font-mono">Expires: {m.membershipExpiry}</div>
                        </td>
                        <td className="py-3.5 px-4 text-zinc-400">{m.joiningDate}</td>
                        <td className="py-3.5 px-4 font-sans">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-block ${
                              m.status === 'Active'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                            }`}
                          >
                            {m.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2 font-sans">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenAddFeeForMember(m);
                              }}
                              className="px-2.5 py-1.5 bg-emerald-950/60 border border-emerald-500/30 hover:bg-emerald-900/60 text-emerald-400 rounded-lg font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                              title="Collect / Record Fee Payment"
                            >
                              <IndianRupee className="w-3.5 h-3.5" />
                              <span>Pay Fee</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditMember(m);
                              }}
                              className="px-2.5 py-1.5 bg-purple-950/60 border border-purple-500/30 hover:bg-purple-900/60 text-purple-300 rounded-lg font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                              title="Edit Member Details"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>

                            <button
                              onClick={() => setCardModalMember(m)}
                              className="px-2.5 py-1.5 bg-blue-950/60 border border-blue-500/30 hover:bg-blue-900/60 text-blue-400 rounded-lg font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>ID Card</span>
                            </button>

                            <button
                              onClick={() => handleResendIdCard(m)}
                              disabled={processingId === `resend-id-${m.rollNumber}`}
                              className="px-2.5 py-1.5 bg-amber-950/60 border border-amber-500/30 hover:bg-amber-900/60 text-amber-400 rounded-lg font-bold text-xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                            >
                              {processingId === `resend-id-${m.rollNumber}` ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Mail className="w-3.5 h-3.5" />
                              )}
                              <span>Resend ID Card</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredMembers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-zinc-500 font-sans">
                          No live records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 4: FEE PAYMENTS */}
        {activeTab === 'fee-records' && (
          <motion.div
            key="fee-records"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white font-mono uppercase tracking-tight flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-500" />
                  FEE PAYMENT RESPONSES ({feePayments.length})
                </h2>
                <p className="text-xs text-zinc-400">
                  Verify fee payment transactions submitted by members and issue verified receipts.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenAddFeeForMember()}
                  className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Fee Payment
                </button>

                <form onSubmit={(e) => e.preventDefault()} className="flex items-center gap-1.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      value={feeSearch}
                      onChange={(e) => setFeeSearch(e.target.value)}
                      placeholder="Search Fee Ref, Reg Ref, Roll, Name..."
                      className="pl-9 pr-8 py-2 bg-[#0F0F12] border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-all"
                    />
                    {feeSearch && (
                      <button
                        type="button"
                        onClick={() => setFeeSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer p-0.5"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Search</span>
                  </button>
                </form>

                <select
                  value={feeStatusFilter}
                  onChange={(e) => setFeeStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-[#0F0F12] border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="All Statuses">All Statuses</option>
                  <option value="Pending Verification">Pending Verification</option>
                  <option value="Successful">Successful</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>

            {/* Fee Payments Table */}
            <div className="bg-[#0F0F12] border border-zinc-800/80 rounded-3xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#141419] border-b border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">FEE REF #</th>
                      <th className="py-3 px-4">REG / ROLL REF</th>
                      <th className="py-3 px-4">MEMBER NAME</th>
                      <th className="py-3 px-4">AMOUNT & METHOD</th>
                      <th className="py-3 px-4">PAYMENT SCREENSHOT</th>
                      <th className="py-3 px-4">STATUS</th>
                      <th className="py-3 px-4 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300 font-mono">
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-zinc-400 font-sans">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
                            <span>Loading fee payments from live Google Sheets...</span>
                          </div>
                        </td>
                      </tr>
                    ) : feePayments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-zinc-500 font-sans font-bold">
                          No live records found.
                        </td>
                      </tr>
                    ) : filteredFees.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-zinc-500 font-sans font-bold">
                          No fee payments match the selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredFees.map((payment) => {
                        const fee = payment;
                        const feeRef = getFeeReferenceNumber(fee);
                        const regRef = fee.registrationReferenceNumber || fee.registrationRef;
                        const rollNo = fee.rollNumber;
                        const memberName = fee.memberName;
                        const phone = fee.phoneNumber || fee.memberPhone;
                        const email = fee.emailAddress || fee.memberEmail;
                        const amtPaid = fee.amountPaid ?? fee.currentFeeAmount ?? 0;
                        const totalPayable = fee.totalPayableAmount ?? ((fee.previousBalance || 0) + (fee.currentFeeAmount || 0));
                        const remBal = fee.remainingBalance ?? Math.max(0, totalPayable - amtPaid);
                        const payType = fee.paymentType || (remBal > 0 ? 'Partial Payment' : 'Full Payment');
                        const method = fee.paymentMethod;
                        const upiTxn = fee.upiTransactionId || fee.upiTxnId;
                        const screenshot = fee.paymentScreenshot || fee.upiScreenshotUrl;
                        const statusVal = fee.paymentStatus || fee.status;

                        return (
                          <tr key={fee.id || feeRef} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-emerald-400 whitespace-nowrap">
                              {feeRef}
                              <div className="text-[10px] text-zinc-500 font-normal">{fee.paymentDate || fee.timestamp}</div>
                            </td>
                            <td className="py-3.5 px-4 font-sans">
                              <div className="font-bold text-blue-400 font-mono">{regRef || '-'}</div>
                              {rollNo && (
                                <div className="mt-0.5">
                                  <span className="px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-500/30 text-[10px] font-mono font-bold">
                                    {rollNo}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-sans">
                              <div className="font-bold text-white text-sm">{memberName}</div>
                              <div className="text-xs text-zinc-400 font-mono">
                                {phone}{email ? ` | ${email}` : ''}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-sans">
                              <div className="flex items-center gap-1.5 font-mono">
                                <span className="font-bold text-emerald-400 text-sm">₹{amtPaid}</span>
                                <span className="text-[10px] text-zinc-500">/ ₹{totalPayable}</span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                                    payType === 'Partial Payment' || remBal > 0
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  }`}
                                >
                                  {payType}
                                </span>
                                {remBal > 0 && (
                                  <span className="text-[10px] text-amber-400 font-mono font-bold">
                                    (₹{remBal} Due)
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-zinc-500 font-mono uppercase mt-0.5">
                                {method} {upiTxn ? `(${upiTxn})` : ''}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-sans">
                              {screenshot ? (
                                <a
                                  href={screenshot}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-blue-400 hover:text-blue-300 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>Open Screenshot</span>
                                </a>
                              ) : (
                                <span className="text-zinc-600 text-[11px]">No screenshot</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-sans">
                              <motion.span
                                key={statusVal}
                                initial={{ scale: 0.7, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-block ${
                                  isStatusApproved(statusVal)
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : isStatusRejected(statusVal)
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                                }`}
                              >
                                {statusVal}
                              </motion.span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2 font-sans">
                                <button
                                  onClick={() => setReceiptModalRecord(fee)}
                                  className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                  title="View Details & Receipt"
                                >
                                  <Eye className="w-3.5 h-3.5 text-blue-400" />
                                  <span>View Details</span>
                                </button>

                                {!isStatusApproved(statusVal) && (
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    type="button"
                                    onClick={() => handleApproveFeePayment(payment)}
                                    disabled={
                                      processingId === getFeeReferenceNumber(payment)
                                    }
                                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-lg shadow-emerald-600/20"
                                  >
                                    {processingId === getFeeReferenceNumber(payment) ? (
                                      <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                                        <span>Approving...</span>
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>Approve</span>
                                      </>
                                    )}
                                  </motion.button>
                                )}

                                {isStatusApproved(statusVal) && (
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleResendReceipt(fee)}
                                    disabled={processingId === `resend-receipt-${feeRef}`}
                                    className="px-2.5 py-1.5 bg-blue-950/60 border border-blue-500/30 hover:bg-blue-900/60 text-blue-400 rounded-lg font-bold text-xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                                    title="Resend Verified Receipt"
                                  >
                                    {processingId === `resend-receipt-${feeRef}` ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Mail className="w-3.5 h-3.5" />
                                    )}
                                    <span>Resend Receipt</span>
                                  </motion.button>
                                )}

                                {!isStatusRejected(statusVal) && (
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    type="button"
                                    onClick={() => setRejectFeeModal(payment)}
                                    disabled={
                                      processingId === getFeeReferenceNumber(payment)
                                    }
                                    className="px-2.5 py-1.5 bg-red-950/60 border border-red-600/40 hover:bg-red-900/60 disabled:opacity-50 disabled:cursor-not-allowed text-red-400 rounded-lg font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                                  >
                                    {processingId === getFeeReferenceNumber(payment) ? (
                                      <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Processing...</span>
                                      </>
                                    ) : (
                                      <>
                                        <XCircle className="w-3.5 h-3.5" />
                                        <span>Reject</span>
                                      </>
                                    )}
                                  </motion.button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 5: PAYMENT HISTORY */}
        {activeTab === 'payment-history' && (
          <motion.div
            key="payment-history"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            {/* Header / KPI Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0F0F12] border border-zinc-800/80 p-6 rounded-3xl shadow-xl">
              <div>
                <h2 className="text-xl font-black text-white font-mono uppercase tracking-tight flex items-center gap-2.5">
                  <History className="w-6 h-6 text-blue-500" />
                  PAYMENT HISTORY & TRANSACTIONS
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Full historical archive of all fee payment submissions, verified transactions, and receipts.
                </p>
              </div>

              {/* Summary Stats */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-[#141419] border border-zinc-800 rounded-2xl px-4 py-2.5 min-w-[120px]">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase block">Total Records</span>
                  <span className="text-lg font-black text-white font-mono">{feePayments.length}</span>
                </div>
                <div className="bg-[#141419] border border-emerald-500/20 rounded-2xl px-4 py-2.5 min-w-[130px]">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase block">Total Collection</span>
                  <span className="text-lg font-black text-emerald-400 font-mono">
                    ₹{feePayments
                      .filter(f => isStatusApproved(f.paymentStatus || f.status))
                      .reduce((sum, f) => {
                        const amt = Number(f.amountPaid) || Number(f.feeAmount) || Number(f.currentFeeAmount) || Number(f.amount) || Number(f.finalPayableAmount) || 0;
                        return sum + amt;
                      }, 0)
                      .toLocaleString()}
                  </span>
                </div>
                <div className="bg-[#141419] border border-blue-500/20 rounded-2xl px-4 py-2.5 min-w-[130px]">
                  <span className="text-[10px] font-bold text-blue-400 uppercase block">Filtered Count</span>
                  <span className="text-lg font-black text-blue-400 font-mono">{filteredPaymentHistory.length}</span>
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-[#0F0F12] border border-zinc-800/80 p-4 rounded-2xl space-y-3">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                {/* Search Form */}
                <form onSubmit={(e) => e.preventDefault()} className="relative flex-1 flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="Search by Roll #, Reg Ref #, Fee Ref #, Name, Phone..."
                      className="w-full pl-10 pr-9 py-2.5 bg-[#141419] border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-all font-mono"
                    />
                    {historySearch && (
                      <button
                        type="button"
                        onClick={() => setHistorySearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                        title="Clear search"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-lg shadow-blue-600/20 active:scale-95"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Search</span>
                  </button>
                </form>

                {/* Filter Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Status Filter */}
                  <select
                    value={historyStatusFilter}
                    onChange={(e) => setHistoryStatusFilter(e.target.value)}
                    className="bg-[#141419] border border-zinc-800 text-zinc-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 cursor-pointer font-sans"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Successful">Successful / Approved</option>
                    <option value="Pending Verification">Pending Verification</option>
                    <option value="Rejected">Rejected</option>
                  </select>

                  {/* Payment Method Filter */}
                  <select
                    value={historyMethodFilter}
                    onChange={(e) => setHistoryMethodFilter(e.target.value)}
                    className="bg-[#141419] border border-zinc-800 text-zinc-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 cursor-pointer font-sans"
                  >
                    <option value="All">All Methods</option>
                    <option value="UPI">UPI Payment</option>
                    <option value="Cash">Cash</option>
                  </select>

                  {/* Date Sort Order Toggle */}
                  <button
                    type="button"
                    onClick={() => setHistorySortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                    className="px-3 py-2.5 bg-[#141419] hover:bg-zinc-800 border border-zinc-800 text-zinc-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                    title={`Sort by Date: currently ${historySortOrder === 'newest' ? 'Newest First' : 'Oldest First'}`}
                  >
                    <ArrowUpDown className="w-3.5 h-3.5 text-blue-400" />
                    <span>{historySortOrder === 'newest' ? 'Date: Newest First' : 'Date: Oldest First'}</span>
                  </button>

                  {/* Reset Filters */}
                  {(historySearch || historyStatusFilter !== 'All' || historyMethodFilter !== 'All' || historySortOrder !== 'newest') && (
                    <button
                      type="button"
                      onClick={() => {
                        setHistorySearch('');
                        setHistoryStatusFilter('All');
                        setHistoryMethodFilter('All');
                        setHistorySortOrder('newest');
                      }}
                      className="px-3 py-2.5 bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/50 text-zinc-400 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Payment History Table */}
            <div className="bg-[#0F0F12] border border-zinc-800/80 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300 font-sans">
                  <thead className="bg-[#141419] border-b border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider font-mono">
                    <tr>
                      <th className="py-3.5 px-4">Fee Ref / Receipt</th>
                      <th className="py-3.5 px-4">Member Info</th>
                      <th className="py-3.5 px-4">Plan Details</th>
                      <th className="py-3.5 px-4">Amount &amp; Method</th>
                      <th className="py-3.5 px-4">Payment Date</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono">
                    {filteredPaymentHistory.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-zinc-500 font-sans">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <History className="w-10 h-10 text-zinc-600 mb-1" />
                            <p className="text-sm font-bold text-zinc-400">No payment records found</p>
                            <p className="text-xs text-zinc-500">
                              {historySearch || historyStatusFilter !== 'All' || historyMethodFilter !== 'All'
                                ? 'Try adjusting your search criteria or filters.'
                                : 'Fee payments will appear here once submitted.'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredPaymentHistory.map((record) => {
                        const statusVal = record.paymentStatus || record.status || 'Pending Verification';
                        const isApproved = isStatusApproved(statusVal);
                        const isRejected = isStatusRejected(statusVal);

                        const feeRef = record.feeReferenceNumber || record.feeRef || 'N/A';
                        const regRef = record.registrationReferenceNumber || record.registrationRef || '';
                        const rollNo = record.rollNumber || '';
                        const name = record.memberName || record.fullName || 'N/A';
                        const phone = record.phoneNumber || record.memberPhone || record.phone || 'N/A';
                        const amount = record.amountPaid || record.finalPayableAmount || 0;
                        const dateStr = record.paymentDate || record.timestamp || record.createdAt || 'N/A';
                        const method = record.paymentMethod || 'UPI';
                        const upiId = record.upiTransactionId || record.upiTxnId || '';
                        const screenshotUrl = record.paymentScreenshotUrl || record.upiScreenshotUrl || record.paymentScreenshot;

                        return (
                          <tr key={record.id || feeRef} className="hover:bg-zinc-800/30 transition-colors">
                            {/* Fee Ref & Receipt */}
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-emerald-400">{feeRef}</div>
                              {record.receiptNumber && (
                                <div className="text-[10px] text-zinc-400 mt-0.5">
                                  Receipt #: <span className="text-zinc-200">{record.receiptNumber}</span>
                                </div>
                              )}
                            </td>

                            {/* Member Info */}
                            <td className="py-3.5 px-4 font-sans">
                              <div className="font-bold text-white text-sm">{name}</div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1 font-mono text-[11px]">
                                {rollNo ? (
                                  <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded text-[10px] font-bold">
                                    {rollNo}
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded text-[10px]">
                                    No Roll #
                                  </span>
                                )}
                                {regRef && (
                                  <span className="px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded text-[10px]">
                                    {regRef}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-zinc-400 mt-0.5">{phone}</div>
                            </td>

                            {/* Plan Details */}
                            <td className="py-3.5 px-4 font-sans">
                              <div className="font-bold text-zinc-200">{record.selectedPlan || record.planName || 'Gym Membership'}</div>
                              {record.feeDuration && (
                                <div className="text-[10px] text-zinc-400 mt-0.5">{record.feeDuration}</div>
                              )}
                            </td>

                            {/* Amount & Method */}
                            <td className="py-3.5 px-4">
                              <div className="font-black text-white text-sm">₹{Number(amount).toLocaleString()}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-300 rounded text-[10px] uppercase font-bold">
                                  {method}
                                </span>
                                {upiId && (
                                  <span className="text-[10px] text-zinc-400 font-mono truncate max-w-[100px]" title={upiId}>
                                    Txn: {upiId}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Payment Date */}
                            <td className="py-3.5 px-4 text-zinc-300 text-xs">
                              {dateStr}
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4">
                              {isApproved ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Successful
                                </span>
                              ) : isRejected ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] font-bold">
                                  <XCircle className="w-3.5 h-3.5" />
                                  Rejected
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-bold">
                                  <Clock className="w-3.5 h-3.5" />
                                  Pending Verification
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {/* Receipt PDF Button */}
                                <button
                                  type="button"
                                  onClick={() => setReceiptModalRecord(record)}
                                  className="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                  title="View & Download Fee Receipt"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>Receipt</span>
                                </button>

                                {/* Screenshot Button if available */}
                                {screenshotUrl && (
                                  <button
                                    type="button"
                                    onClick={() => setScreenshotModalUrl(screenshotUrl)}
                                    className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                    title="View Payment Screenshot"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Proof</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 6: QR CODE ATTENDANCE SCANNER */}
        {activeTab === 'attendance' && (
          <motion.div
            key="attendance"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            {/* Header & Scanner Bar */}
            <div className="bg-[#0F0F12] border border-zinc-800/80 p-6 rounded-3xl shadow-xl space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-white font-mono uppercase tracking-tight flex items-center gap-2.5">
                    <QrCode className="w-6 h-6 text-red-500" />
                    <span>Reception Gym Attendance Scanner</span>
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Scan member QR codes or input Roll Numbers for instant reception check-in.
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl text-xs font-mono text-zinc-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Today's Check-ins: <strong className="text-white">{attendanceRecords.filter(a => a.date === new Date().toISOString().split('T')[0]).length}</strong></span>
                </div>
              </div>

              {/* Scan Form */}
              <form onSubmit={handleScanAttendance} className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <QrCode className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-red-500 pointer-events-none" />
                  <input
                    type="text"
                    value={scanQuery}
                    onChange={(e) => setScanQuery(e.target.value)}
                    placeholder="Scan QR code data or enter Member Roll Number (e.g. ABG-2026-001)..."
                    className="w-full pl-11 pr-4 py-3 bg-[#050505] border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 font-mono"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer shrink-0 shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark Attendance</span>
                </button>
              </form>

              {/* Notification Banner */}
              {scanMessage && (
                <div
                  className={`p-4 rounded-2xl border flex items-start gap-3.5 animate-in fade-in ${
                    scanMessage.success
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-red-950/40 border-red-500/40 text-red-300'
                  }`}
                >
                  {scanMessage.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="text-sm font-bold">{scanMessage.text}</p>
                    {scanMessage.member && (
                      <p className="text-xs text-zinc-300">
                        Member: <strong className="text-white">{scanMessage.member.fullName}</strong> | Plan:{' '}
                        <span className="text-red-400">{scanMessage.member.planName}</span> | Status:{' '}
                        <span className="text-emerald-400">{scanMessage.member.status}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Attendance Logs Table */}
            <div className="bg-[#0F0F12] border border-zinc-800/80 rounded-3xl overflow-hidden shadow-xl">
              <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <History className="w-4 h-4 text-red-500" />
                  <span>Recent Attendance Logs</span>
                </h3>
                <span className="text-xs text-zinc-400 font-mono">
                  Total Logs: {attendanceRecords.length}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-[#08080A] text-zinc-400 font-bold uppercase text-[10px] tracking-wider border-b border-zinc-800">
                    <tr>
                      <th className="py-3.5 px-4">Member Name</th>
                      <th className="py-3.5 px-4">Roll Number</th>
                      <th className="py-3.5 px-4">Plan</th>
                      <th className="py-3.5 px-4">Check-In Time</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono">
                    {attendanceRecords.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-zinc-500">
                          No attendance scanned today yet. Scan a member pass above.
                        </td>
                      </tr>
                    ) : (
                      attendanceRecords.map((att) => (
                        <tr key={att.id} className="hover:bg-zinc-900/40 transition-colors">
                          <td className="py-3.5 px-4 font-sans font-bold text-white">{att.memberName}</td>
                          <td className="py-3.5 px-4 text-red-400 font-bold">{att.rollNumber}</td>
                          <td className="py-3.5 px-4 text-zinc-300 font-sans">{att.planName}</td>
                          <td className="py-3.5 px-4 text-zinc-200">{att.time}</td>
                          <td className="py-3.5 px-4 text-zinc-400">{att.date}</td>
                          <td className="py-3.5 px-4 text-right">
                            <span className="px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold font-sans">
                              PRESENT
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 7: GOOGLE SHEETS BACKEND SETUP */}
        {activeTab === 'settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-8 max-w-4xl mx-auto"
          >
            {/* SECTION 1: UPI PAYMENT & QR CODE SETTINGS */}
            <form onSubmit={handleSaveGymSettings} className="bg-[#0F0F12] border border-zinc-800/80 rounded-3xl p-6 space-y-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/80 pb-4 gap-3">
                <div>
                  <h2 className="text-base font-black text-white font-mono uppercase tracking-tight flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-emerald-400" />
                    UPI PAYMENT &amp; QR CODE SETTINGS
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Configure your gym's receiving UPI ID, default registration fee, and custom payment QR code.
                  </p>
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 shrink-0"
                >
                  <Check className="w-4 h-4" />
                  Save Payment Settings
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <div className="md:col-span-2 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-zinc-300 uppercase">UPI ID / VPA *</label>
                      <input
                        type="text"
                        value={settings.upiId || ''}
                        onChange={(e) => setSettingsState({ ...settings, upiId: e.target.value })}
                        placeholder={AB_FITNESS_UPI_ID}
                        required
                        className="w-full px-3.5 py-2.5 bg-[#18181B] border border-zinc-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                      />
                      <span className="text-[10px] text-zinc-500 block">All online fee payments direct to this UPI address</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-zinc-300 uppercase">Payee Name *</label>
                      <input
                        type="text"
                        value={settings.upiName || ''}
                        onChange={(e) => setSettingsState({ ...settings, upiName: e.target.value })}
                        placeholder="AB Fitness"
                        required
                        className="w-full px-3.5 py-2.5 bg-[#18181B] border border-zinc-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-zinc-300 uppercase">Default Registration Fee (₹) *</label>
                      <input
                        type="number"
                        min="0"
                        value={settings.registrationFeeDefault ?? 100}
                        onChange={(e) => setSettingsState({ ...settings, registrationFeeDefault: Number(e.target.value) || 0 })}
                        required
                        className="w-full px-3.5 py-2.5 bg-[#18181B] border border-zinc-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-zinc-300 uppercase">Custom QR Image URL <span className="text-zinc-500 font-normal">(Optional)</span></label>
                      <input
                        type="url"
                        value={settings.qrCodeUrl || ''}
                        onChange={(e) => setSettingsState({ ...settings, qrCodeUrl: e.target.value })}
                        placeholder="https://.../my-qr-sticker.png"
                        className="w-full px-3.5 py-2.5 bg-[#18181B] border border-zinc-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                      />
                      <span className="text-[10px] text-zinc-500 block">Leave blank to auto-generate dynamic QR from UPI ID</span>
                    </div>
                  </div>
                </div>

                  {/* Live QR Code Preview */}
                  <div className="bg-black/80 border border-zinc-800 p-4 rounded-2xl text-center space-y-2 flex flex-col items-center justify-center">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Live QR Preview</span>
                    {(() => {
                      const upiVpa = settings.upiId || AB_FITNESS_UPI_ID;
                      const previewUri =
                        `upi://pay?pa=${encodeURIComponent(upiVpa)}` +
                        `&pn=${encodeURIComponent("AB Fitness")}` +
                        `&am=${encodeURIComponent(Number(settings.registrationFeeDefault || 100).toFixed(2))}` +
                        `&cu=INR` +
                        `&tn=${encodeURIComponent("AB Fitness Fee")}`;
                      const autoQr = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(previewUri)}`;
                      const previewQr = settings.qrCodeUrl?.trim() ? settings.qrCodeUrl : autoQr;
                      return (
                        <div className="w-36 h-36 bg-white p-2 rounded-xl shadow-md flex items-center justify-center overflow-hidden border border-emerald-500/30">
                          <img src={previewQr} alt="QR Preview" className="w-full h-full object-contain" />
                        </div>
                      );
                    })()}
                    <span className="text-[10px] font-mono text-emerald-400 block break-all">{settings.upiId || AB_FITNESS_UPI_ID}</span>
                  </div>
              </div>
            </form>

            <div>
              <h2 className="text-xl font-black text-white font-mono uppercase tracking-tight flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                GOOGLE SHEETS BACKEND INTEGRATION
              </h2>
              <p className="text-xs text-zinc-400">
                Connect your AB Gym application to a Google Spreadsheet backend running on Google Apps Script.
              </p>
            </div>

            {/* Connection Status Box */}
            <div className={`p-6 rounded-3xl border ${
              syncStatus === 'connected'
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                    syncStatus === 'connected' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {syncStatus === 'connected' ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm uppercase">
                      {syncStatus === 'connected' ? 'Connected to Google Sheets Web App' : 'Google Sheets Web App (Setup Pending)'}
                    </h3>
                    <p className="text-xs opacity-80 font-sans mt-0.5">
                      {syncStatus === 'connected'
                        ? 'All registrations, members, fee payments, and logs are actively saving directly to your Google Spreadsheet.'
                        : 'Demo data is disabled. Paste your Google Apps Script Web App URL below to sync strictly with your Google Sheet!'}
                    </p>
                    {syncStatus === 'connected' && (
                      <div className="mt-2 text-[11px] font-mono bg-emerald-950/60 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-emerald-300 break-all">
                        <span className="font-bold uppercase text-[10px] text-emerald-400 block mb-0.5">Active Web App Endpoint:</span>
                        {apiService.getScriptUrl()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>



            {/* Endpoint URL Config Form */}
            <form onSubmit={handleSaveScriptUrl} className="bg-[#0F0F12] border border-zinc-800/80 rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Google Apps Script Web App Endpoint URL
              </h3>
              
              <div className="space-y-2">
                <input
                  type="url"
                  value={scriptUrlInput}
                  onChange={(e) => setScriptUrlInput(e.target.value)}
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  className="w-full px-4 py-3 bg-[#18181B] border border-zinc-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-zinc-500">
                  You can set this in your environment as <code className="text-zinc-300 font-mono">VITE_GOOGLE_SCRIPT_URL</code> or save it directly here.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-600/20"
                >
                  Save Web App Endpoint URL
                </button>
                {settingsSaved && (
                  <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in">
                    <Check className="w-4 h-4" />
                    Endpoint Saved Successfully!
                  </span>
                )}
              </div>
            </form>

            {/* One-Click Copy Google Apps Script Code */}
            <div className="bg-[#0F0F12] border border-zinc-800/80 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Copy className="w-4 h-4 text-blue-400" />
                    Copy Google Apps Script Code
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Paste this entire script into your Google Spreadsheet Apps Script editor (<code className="text-zinc-300">Extensions -&gt; Apps Script</code>).
                  </p>
                </div>

                <button
                  onClick={handleCopyScriptCode}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {copiedScriptCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedScriptCode ? 'Code Copied!' : 'Copy Script Code'}</span>
                </button>
              </div>

              <pre className="p-4 bg-[#050505] border border-zinc-800 rounded-xl text-[11px] font-mono text-zinc-300 max-h-64 overflow-y-auto leading-relaxed">
                {GOOGLE_APPS_SCRIPT_CODE}
              </pre>
            </div>

            {/* Force Refresh Google Sheet Data */}
            <div className="bg-[#0F0F12] border border-zinc-800/80 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  Live Google Sheets Data Engine
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Demo data is disabled. Admin panel syncs strictly with your connected Google Sheet Web App URL. Click below to clear any local cache and force refresh from your sheet.
                </p>
              </div>
              <button
                onClick={handleForceRefresh}
                disabled={isLoading}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-600/20 whitespace-nowrap flex items-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh Google Sheet Data
              </button>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </main>

      {/* MODAL 1: Payment Screenshot Viewer */}
      <AnimatePresence>
        {screenshotModalUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative max-w-2xl w-full bg-[#0F0F12] border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-400" />
                  Payment Proof / Screenshot
                </h3>
                <button
                  onClick={() => setScreenshotModalUrl(null)}
                  className="text-zinc-400 hover:text-white p-1 rounded-lg cursor-pointer"
                >
                  &times;
                </button>
              </div>
              <div className="max-h-[70vh] overflow-auto flex justify-center bg-black/50 p-4 rounded-2xl">
                <img src={screenshotModalUrl} alt="Payment Screenshot" className="max-w-full h-auto rounded-xl shadow-lg" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 2: View Registration Full Details */}
      <AnimatePresence>
        {viewRegModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative max-w-lg w-full bg-[#0F0F12] border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  REGISTRATION: {viewRegModal.registrationReferenceNumber || viewRegModal.registrationRef}
                </h3>
                <button
                  onClick={() => setViewRegModal(null)}
                  className="text-zinc-400 hover:text-white text-lg font-bold cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <div className="space-y-3 text-xs text-zinc-300 font-sans max-h-[65vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-2 p-3 bg-[#141419] rounded-xl font-mono text-[11px]">
                  <div><span className="text-zinc-500">Full Name:</span> <strong className="text-white font-sans">{viewRegModal.fullName}</strong></div>
                  <div><span className="text-zinc-500">Assigned Roll:</span> <span className="text-blue-400 font-bold">{viewRegModal.rollNumber || 'Unassigned'}</span></div>
                  <div><span className="text-zinc-500">Gender:</span> {viewRegModal.gender || 'N/A'}</div>
                  <div><span className="text-zinc-500">Date of Birth:</span> {viewRegModal.dateOfBirth || viewRegModal.dob || 'N/A'}</div>
                  <div><span className="text-zinc-500">Phone:</span> {viewRegModal.phoneNumber || viewRegModal.phone || 'N/A'}</div>
                  <div><span className="text-zinc-500">Email:</span> {viewRegModal.emailAddress || viewRegModal.email || 'N/A'}</div>
                  <div><span className="text-zinc-500">Selected Plan:</span> {viewRegModal.selectedPlan || viewRegModal.planName || 'N/A'}</div>
                  <div><span className="text-zinc-500">Registration Fee:</span> ₹{viewRegModal.registrationFee}</div>
                  <div><span className="text-zinc-500">Payment Method:</span> {viewRegModal.paymentMethod || 'N/A'}</div>
                  <div><span className="text-zinc-500">Payment Status:</span> {viewRegModal.paymentStatus || 'N/A'}</div>
                  <div><span className="text-zinc-500">UPI Txn ID:</span> {viewRegModal.upiTransactionId || viewRegModal.upiTxnId || 'N/A'}</div>
                  <div><span className="text-zinc-500">Status:</span> <span className="font-bold text-amber-400">{viewRegModal.registrationStatus || viewRegModal.status}</span></div>
                </div>

                <div>
                  <span className="text-zinc-500 font-mono">Address:</span> <p className="text-white mt-0.5">{viewRegModal.address || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-zinc-500 font-mono">Emergency Contact:</span> <p className="text-white mt-0.5">{viewRegModal.emergencyContactNumber || viewRegModal.emergencyContact || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-zinc-500 font-mono">Fitness Goal:</span> <p className="text-white mt-0.5">{viewRegModal.fitnessGoal || 'N/A'}</p>
                </div>
                {viewRegModal.adminRemarks && (
                  <div>
                    <span className="text-zinc-500 font-mono">Admin Remarks:</span> <p className="text-zinc-300 mt-0.5">{viewRegModal.adminRemarks}</p>
                  </div>
                )}
                {viewRegModal.rejectionReason && (
                  <div>
                    <span className="text-red-400 font-mono">Rejection Reason:</span> <p className="text-red-300 mt-0.5">{viewRegModal.rejectionReason}</p>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-zinc-800">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const reg = viewRegModal;
                      setViewRegModal(null);
                      setEditingRegistration(reg);
                    }}
                    className="px-3 py-1.5 bg-purple-900/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                    <span>Edit / Restore</span>
                  </button>
                  {!isStatusApproved(viewRegModal.registrationStatus || viewRegModal.status) && (
                    <button
                      type="button"
                      onClick={() => {
                        const reg = viewRegModal;
                        setViewRegModal(null);
                        handleApproveRegistration(reg);
                      }}
                      disabled={
                        processingId === getRegistrationReference(viewRegModal)
                      }
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>
                        {processingId === getRegistrationReference(viewRegModal)
                          ? "Approving..."
                          : "Approve"}
                      </span>
                    </button>
                  )}
                  {!isStatusRejected(viewRegModal.registrationStatus || viewRegModal.status) && (
                    <button
                      type="button"
                      onClick={() => {
                        const reg = viewRegModal;
                        setViewRegModal(null);
                        setRejectRegModal(reg);
                      }}
                      disabled={
                        processingId === getRegistrationReference(viewRegModal)
                      }
                      className="px-3 py-1.5 bg-red-950/60 border border-red-600/40 hover:bg-red-900/60 text-red-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>
                        {processingId === getRegistrationReference(viewRegModal)
                          ? "Processing..."
                          : "Reject"}
                      </span>
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setViewRegModal(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Rejection Reason Dialog for Registration */}
      <AnimatePresence>
        {rejectRegModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative max-w-md w-full bg-[#0F0F12] border border-red-500/30 rounded-3xl p-6 space-y-4 shadow-2xl"
            >
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                Reject Registration: {rejectRegModal.registrationRef}
              </h3>

              <p className="text-xs text-zinc-400">
                Please enter the reason for rejecting {rejectRegModal.fullName}'s registration.
              </p>

              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Invalid transaction reference / Payment screenshot unclear"
                className="w-full h-24 p-3 bg-[#18181B] border border-zinc-700 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
              />

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setRejectRegModal(null)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRejectRegistration}
                  disabled={Boolean(processingAction)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {processingAction?.type === 'reject' ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Rejecting...</span>
                    </>
                  ) : (
                    <span>Confirm Rejection</span>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 4: Rejection Reason Dialog for Fee Payment */}
      <AnimatePresence>
        {rejectFeeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative max-w-md w-full bg-[#0F0F12] border border-red-500/30 rounded-3xl p-6 space-y-4 shadow-2xl"
            >
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                Reject Fee Payment: {rejectFeeModal.feeReferenceNumber}
              </h3>

              <p className="text-xs text-zinc-400">
                Please enter the reason for rejecting fee payment for {rejectFeeModal.memberName}.
              </p>

              <textarea
                value={feeRejectionReason}
                onChange={(e) => setFeeRejectionReason(e.target.value)}
                placeholder="e.g. Transaction ID mismatch with bank records"
                className="w-full h-24 p-3 bg-[#18181B] border border-zinc-700 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
              />

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setRejectFeeModal(null)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRejectFee}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Confirm Rejection
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Member Card Modal */}
      {cardModalMember && (
        <MemberCardModal
          member={cardModalMember}
          onClose={() => setCardModalMember(null)}
          onDownload={() => downloadMemberCardPDF(cardModalMember, settings)}
        />
      )}

      {/* Receipt Modal */}
      {receiptModalRecord && (
        <ReceiptModal
          record={receiptModalRecord}
          onClose={() => setReceiptModalRecord(null)}
          onDownload={() => downloadFeeReceiptPDF(receiptModalRecord, settings)}
        />
      )}

      {/* Edit Member Modal */}
      <AnimatePresence>
        {editingMember && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="bg-[#141419] border border-zinc-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-6 my-8"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                    <Edit3 className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white font-mono uppercase tracking-wide">
                      EDIT MEMBER DETAILS
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Roll Number: <span className="font-mono text-purple-400 font-bold">{editingMember.rollNumber}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingMember(null);
                  }}
                  className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {editMemberError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editMemberError}</span>
                </div>
              )}

              <form onSubmit={handleSaveMember} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Roll Number */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      Roll Number / Member ID *
                    </label>
                    <input
                      type="text"
                      value={editFormData.rollNumber}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, rollNumber: e.target.value }))}
                      placeholder="e.g. ABG-26-0001"
                      className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono font-bold"
                      required
                    />
                  </div>

                  {/* Full Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={editFormData.fullName}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, fullName: e.target.value }))}
                      className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                      required
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Plan Name */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      Selected Plan
                    </label>
                    <input
                      type="text"
                      list="edit-member-plans-list"
                      value={editFormData.planName}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, planName: e.target.value }))}
                      placeholder="e.g. Basic Plan"
                      className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                    <datalist id="edit-member-plans-list">
                      {getStoredPlans().map((p: any) => (
                        <option key={p.id || p.name} value={p.name} />
                      ))}
                    </datalist>
                  </div>

                  {/* Member Status */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      Member Status
                    </label>
                    <select
                      value={editFormData.status}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-sans"
                    >
                      <option value="Active">Active</option>
                      <option value="Expired">Expired</option>
                      <option value="Payment Due">Payment Due</option>
                      <option value="Suspended">Suspended</option>
                      <option value="Pending Activation">Pending Activation</option>
                    </select>
                  </div>

                  {/* Joining Date */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      Joining Date
                    </label>
                    <input
                      type="date"
                      value={editFormData.joiningDate}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, joiningDate: e.target.value }))}
                      className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>

                  {/* Membership Expiry Date */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      Membership Expiry Date
                    </label>
                    <input
                      type="date"
                      value={editFormData.membershipExpiry}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, membershipExpiry: e.target.value }))}
                      className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      Gender
                    </label>
                    <select
                      value={editFormData.gender}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, gender: e.target.value }))}
                      className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-sans"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={editFormData.dob}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, dob: e.target.value }))}
                      className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>

                  {/* Fitness Goal */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      Fitness Goal
                    </label>
                    <input
                      type="text"
                      value={editFormData.fitnessGoal}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, fitnessGoal: e.target.value }))}
                      placeholder="e.g. Muscle Gain, Weight Loss, General Fitness"
                      className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Medical Condition */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      Medical Condition (if any)
                    </label>
                    <input
                      type="text"
                      value={editFormData.medicalCondition}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, medicalCondition: e.target.value }))}
                      placeholder="e.g. None, Asthma, Knee injury"
                      className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Emergency Contact */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      Emergency Contact Number
                    </label>
                    <input
                      type="text"
                      value={editFormData.emergencyContact}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, emergencyContact: e.target.value }))}
                      placeholder="e.g. +91 98765 43210 (Guardian/Contact)"
                      className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>

                  {/* Address */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      Address
                    </label>
                    <input
                      type="text"
                      value={editFormData.address}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Full residential address"
                      className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Remarks / Notes */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                      Remarks / Admin Notes
                    </label>
                    <input
                      type="text"
                      value={editFormData.remarks}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, remarks: e.target.value }))}
                      placeholder="Special instructions or notes"
                      className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setEditingMember(null);
                    }}
                    disabled={isUpdatingMember}
                    className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingMember}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-2 shadow-lg shadow-purple-600/20 cursor-pointer"
                  >
                    {isUpdatingMember ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 text-white" />
                        <span>Save Member Details</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit & Restore Registration Modal */}
      <AnimatePresence>
        {editingRegistration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="bg-[#141419] border border-zinc-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-6 my-8"
            >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <Edit3 className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white font-mono uppercase tracking-wide">
                    EDIT / RESTORE REGISTRATION
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Ref #: <span className="font-mono text-purple-400 font-bold">{editingRegistration.registrationReferenceNumber || editingRegistration.registrationRef}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingRegistration(null)}
                className="text-zinc-500 hover:text-white p-1 text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {editRegError && (
              <div className="p-3 bg-red-950/80 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{editRegError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditRegistration} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editRegForm.fullName}
                    onChange={(e) => setEditRegForm(prev => ({ ...prev, fullName: e.target.value }))}
                    className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={editRegForm.phone}
                    onChange={(e) => setEditRegForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editRegForm.email}
                    onChange={(e) => setEditRegForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Selected Plan</label>
                  <input
                    type="text"
                    value={editRegForm.selectedPlan}
                    onChange={(e) => setEditRegForm(prev => ({ ...prev, selectedPlan: e.target.value }))}
                    className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Registration Status (Restoration / Approval)</label>
                  <select
                    value={editRegForm.status}
                    onChange={(e) => setEditRegForm(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-bold"
                  >
                    <option value="Pending Verification">Pending Verification (Restore)</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Registration Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={editRegForm.registrationFee}
                    onChange={(e) => setEditRegForm(prev => ({ ...prev, registrationFee: Number(e.target.value) || 0 }))}
                    className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Payment Status</label>
                  <select
                    value={editRegForm.paymentStatus}
                    onChange={(e) => setEditRegForm(prev => ({ ...prev, paymentStatus: e.target.value }))}
                    className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Submitted">Submitted</option>
                    <option value="Successful">Successful</option>
                    <option value="Pending Verification">Pending Verification</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Gender</label>
                  <select
                    value={editRegForm.gender}
                    onChange={(e) => setEditRegForm(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={editRegForm.dob}
                    onChange={(e) => setEditRegForm(prev => ({ ...prev, dob: e.target.value }))}
                    className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Emergency Contact</label>
                  <input
                    type="text"
                    value={editRegForm.emergencyContact}
                    onChange={(e) => setEditRegForm(prev => ({ ...prev, emergencyContact: e.target.value }))}
                    className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Address</label>
                <input
                  type="text"
                  value={editRegForm.address}
                  onChange={(e) => setEditRegForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Admin Remarks</label>
                <input
                  type="text"
                  placeholder="Optional notes or restoration reason..."
                  value={editRegForm.adminRemarks}
                  onChange={(e) => setEditRegForm(prev => ({ ...prev, adminRemarks: e.target.value }))}
                  className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {editRegForm.status === 'Rejected' && (
                <div>
                  <label className="block text-[11px] font-bold text-red-400 uppercase tracking-wider mb-1">Rejection Reason</label>
                  <input
                    type="text"
                    placeholder="Reason for rejecting..."
                    value={editRegForm.rejectionReason}
                    onChange={(e) => setEditRegForm(prev => ({ ...prev, rejectionReason: e.target.value }))}
                    className="w-full bg-[#0F0F12] border border-red-900/60 rounded-xl px-3 py-2 text-xs text-red-200 focus:outline-none focus:border-red-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingRegistration(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingRegistration}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-purple-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingRegistration ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save Registration Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Direct Add / Member Restoration Form Modal */}
      {isDirectAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-[#141419] border border-zinc-800 rounded-3xl p-6 max-w-3xl w-full shadow-2xl space-y-6 my-8 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-white font-mono uppercase tracking-wide">
                      Direct Member Registration & Restoration
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold font-mono">
                      Admin Direct Entry
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Directly enroll walk-in members or restore past offline records with instant ID card generation.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDirectAddModalOpen(false)}
                className="text-zinc-500 hover:text-white p-1 text-xl font-bold cursor-pointer rounded-lg hover:bg-zinc-800 transition"
              >
                &times;
              </button>
            </div>

            {directAddError && (
              <div className="p-3.5 bg-red-950/80 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{directAddError}</span>
              </div>
            )}

            <form onSubmit={handleDirectAddMemberSubmit} className="space-y-6">
              {/* Roll Number Mode Selection */}
              <div className="p-4 bg-[#0A0A0D] border border-zinc-800/80 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Roll Number Generation / Assignment Mode
                  </label>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    Pattern: ABG-YY-XXXX
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDirectAddMode('auto')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition cursor-pointer ${
                      directAddMode === 'auto'
                        ? 'bg-emerald-950/30 border-emerald-500 text-white'
                        : 'bg-[#0F0F12] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                      directAddMode === 'auto' ? 'border-emerald-400 bg-emerald-500' : 'border-zinc-600'
                    }`}>
                      {directAddMode === 'auto' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Auto-Generate from Phone</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        Assigns <code className="text-emerald-400 font-mono">ABG-{new Date().getFullYear().toString().slice(-2)}-{directAddForm.phone.replace(/\D/g, '').slice(-4) || 'XXXX'}</code> automatically.
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDirectAddMode('custom')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition cursor-pointer ${
                      directAddMode === 'custom'
                        ? 'bg-purple-950/30 border-purple-500 text-white'
                        : 'bg-[#0F0F12] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                      directAddMode === 'custom' ? 'border-purple-400 bg-purple-500' : 'border-zinc-600'
                    }`}>
                      {directAddMode === 'custom' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Custom / Restored Roll Number</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        Manually enter historical Roll No (e.g. <code className="text-purple-400 font-mono">ABG-25-0012</code> or <code className="text-purple-400 font-mono">ABG-26-0001</code>).
                      </div>
                    </div>
                  </button>
                </div>

                {directAddMode === 'custom' && (
                  <div className="pt-2 animate-in fade-in">
                    <label className="block text-[11px] font-bold text-purple-300 uppercase tracking-wider mb-1">
                      Custom Roll Number * (Restoration)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ABG-26-0001 or ABG-25-0012"
                      value={directAddForm.rollNumber}
                      onChange={(e) => setDirectAddForm(prev => ({ ...prev, rollNumber: e.target.value.toUpperCase() }))}
                      className="w-full bg-[#141419] border border-purple-500/50 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-400 font-mono font-bold"
                    />
                  </div>
                )}
              </div>

              {/* Section 1: Basic & Contact Info */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-800 pb-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  1. Athlete Personal & Contact Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 md:col-span-1">
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={directAddForm.fullName}
                      onChange={(e) => setDirectAddForm(prev => ({ ...prev, fullName: e.target.value }))}
                      className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Phone Number * (10 Digits)</label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="9876543210"
                      value={directAddForm.phone}
                      onChange={(e) => setDirectAddForm(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))}
                      className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="athlete@example.com"
                      value={directAddForm.email}
                      onChange={(e) => setDirectAddForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Gender</label>
                    <select
                      value={directAddForm.gender}
                      onChange={(e) => setDirectAddForm(prev => ({ ...prev, gender: e.target.value }))}
                      className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={directAddForm.dob}
                      onChange={(e) => setDirectAddForm(prev => ({ ...prev, dob: e.target.value }))}
                      className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Emergency Contact</label>
                    <input
                      type="tel"
                      placeholder="9876543210"
                      value={directAddForm.emergencyContact}
                      onChange={(e) => setDirectAddForm(prev => ({ ...prev, emergencyContact: e.target.value }))}
                      className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Membership & Validity */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-800 pb-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                  2. Membership Plan & Validity
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Selected Plan</label>
                    <select
                      value={directAddForm.planName}
                      onChange={(e) => {
                        const newPlan = e.target.value;
                        const exp = calculateAutoExpiry(directAddForm.joiningDate, newPlan);
                        setDirectAddForm(prev => ({
                          ...prev,
                          planName: newPlan,
                          membershipExpiry: exp,
                        }));
                      }}
                      className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                    >
                      <option value="Basic Plan">Basic Plan (1 Month)</option>
                      <option value="Standard Plan">Standard Plan (3 Months)</option>
                      <option value="Premium Plan">Premium Plan (6 Months)</option>
                      <option value="Annual VIP Plan">Annual VIP Plan (12 Months)</option>
                      <option value="Custom Plan">Custom Plan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Membership Status</label>
                    <select
                      value={directAddForm.status}
                      onChange={(e) => setDirectAddForm(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                    >
                      <option value="Active">Active (Approved)</option>
                      <option value="Pending">Pending Verification</option>
                      <option value="Expired">Expired</option>
                      <option value="Payment Due">Payment Due</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Joining Date</label>
                    <input
                      type="date"
                      value={directAddForm.joiningDate}
                      onChange={(e) => {
                        const jDate = e.target.value;
                        const exp = calculateAutoExpiry(jDate, directAddForm.planName);
                        setDirectAddForm(prev => ({
                          ...prev,
                          joiningDate: jDate,
                          membershipExpiry: exp,
                        }));
                      }}
                      className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Membership Expiry</label>
                    <input
                      type="date"
                      value={directAddForm.membershipExpiry}
                      onChange={(e) => setDirectAddForm(prev => ({ ...prev, membershipExpiry: e.target.value }))}
                      className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Initial Fee & Payment */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-800 pb-1.5">
                  <IndianRupee className="w-3.5 h-3.5 text-emerald-400" />
                  3. Initial Registration Fee & Payment
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Registration / Initial Fee (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={directAddForm.registrationFee}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setDirectAddForm(prev => ({
                          ...prev,
                          registrationFee: val,
                          initialAmountPaid: val,
                        }));
                      }}
                      className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Payment Status</label>
                    <select
                      value={directAddForm.paymentStatus}
                      onChange={(e) => setDirectAddForm(prev => ({ ...prev, paymentStatus: e.target.value }))}
                      className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                    >
                      <option value="Successful">Successful (Paid)</option>
                      <option value="Pending Verification">Pending Verification</option>
                      <option value="Exempted">Exempted / Zero Fee</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Payment Mode</label>
                    <select
                      value={directAddForm.paymentMode}
                      onChange={(e) => setDirectAddForm(prev => ({ ...prev, paymentMode: e.target.value }))}
                      className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Cash">Cash (Front Desk)</option>
                      <option value="UPI">UPI / QR Code</option>
                      <option value="Card">Credit / Debit Card</option>
                      <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 4: Address, Goal & Admin Notes */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-800 pb-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  4. Address, Fitness Goal & Restoration Notes
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Address / Location</label>
                    <input
                      type="text"
                      placeholder="e.g. 12, Main Market, Civil Lines"
                      value={directAddForm.address}
                      onChange={(e) => setDirectAddForm(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Fitness Goal</label>
                    <input
                      type="text"
                      placeholder="e.g. Muscle Building, Weight Loss"
                      value={directAddForm.fitnessGoal}
                      onChange={(e) => setDirectAddForm(prev => ({ ...prev, fitnessGoal: e.target.value }))}
                      className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Admin Remarks / Restoration Notes</label>
                    <input
                      type="text"
                      placeholder="e.g. Front desk direct walk-in enrollment / Restored from offline register"
                      value={directAddForm.remarks}
                      onChange={(e) => setDirectAddForm(prev => ({ ...prev, remarks: e.target.value }))}
                      className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Automation Checkboxes */}
              <div className="p-3.5 bg-[#0A0A0D] border border-zinc-800/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={directAddForm.autoGenerateIdCard}
                    onChange={(e) => setDirectAddForm(prev => ({ ...prev, autoGenerateIdCard: e.target.checked }))}
                    className="rounded border-zinc-700 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>Immediately preview & download Member Digital ID Card</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={directAddForm.recordFeePayment}
                    onChange={(e) => setDirectAddForm(prev => ({ ...prev, recordFeePayment: e.target.checked }))}
                    className="rounded border-zinc-700 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>Record initial payment in Fee Payments ledger</span>
                </label>
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsDirectAddModalOpen(false)}
                  disabled={isSubmittingDirectAdd}
                  className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingDirectAdd}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/40 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingDirectAdd ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Saving to Database & Google Sheets...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 text-white" />
                      <span>Register & Restore Member</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Fee Payment Modal */}
      {isAddFeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-[#141419] border border-zinc-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white font-mono uppercase tracking-wide">
                    ADD FEE PAYMENT
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Record fee payment directly. Receipt will be generated and emailed by server.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddFeeModalOpen(false)}
                className="text-zinc-500 hover:text-white transition p-1"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {submitFeeError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-xs text-red-400 font-sans">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitFeeError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitAddFeePayment} className="space-y-4">
              {/* Member Selection / Search Section */}
              <div className="p-4 bg-[#0F0F12] border border-zinc-800/80 rounded-2xl space-y-3">
                {/* 1. Direct Member Directory Dropdown */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      <span>Select Enrolled Member</span>
                    </label>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {members.length} members available
                    </span>
                  </div>
                  <select
                    value={addFeeForm.referenceOrRollNumber || ''}
                    onChange={(e) => {
                      const selectedVal = e.target.value;
                      if (!selectedVal) return;
                      const matched = members.find(m => (m.rollNumber === selectedVal || m.registrationRef === selectedVal));
                      if (matched) {
                        handleOpenAddFeeForMember(matched);
                      } else {
                        setAddFeeForm(prev => ({ ...prev, referenceOrRollNumber: selectedVal }));
                      }
                    }}
                    className="w-full bg-[#141419] border border-zinc-800 hover:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-sans transition-all cursor-pointer"
                  >
                    <option value="">-- Choose from member directory --</option>
                    {members.map((m) => (
                      <option key={m.id || m.rollNumber} value={m.rollNumber || m.registrationRef}>
                        {m.rollNumber ? `[${m.rollNumber}] ` : ''}{m.fullName} - {m.planName || 'Plan'} {Number(m.previousBalance || 0) > 0 ? `(Due: ₹${m.previousBalance})` : `(Bal: ₹0)`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-zinc-800" />
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">or search by ID / phone</span>
                  <div className="flex-1 h-px bg-zinc-800" />
                </div>

                {/* 2. Manual Search Input */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Roll Number, Reference ID, Name or Phone *
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={addFeeForm.referenceOrRollNumber || ''}
                        onChange={(e) => {
                          setAddFeeForm({ ...addFeeForm, referenceOrRollNumber: e.target.value });
                          if (searchMemberError) setSearchMemberError('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSearchMemberForFee();
                          }
                        }}
                        placeholder="Enter Roll Number or Reg Ref (e.g., ABG-101 or REG-...)"
                        className="w-full bg-[#141419] border border-zinc-800 rounded-xl pl-3.5 pr-8 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono transition-all"
                        required
                      />
                      {addFeeForm.referenceOrRollNumber && (
                        <button
                          type="button"
                          onClick={() => {
                            setAddFeeForm({
                              ...addFeeForm,
                              referenceOrRollNumber: '',
                              fullName: '',
                              phoneNumber: '',
                              emailAddress: '',
                              selectedPlan: '',
                            });
                            if (searchMemberError) setSearchMemberError('');
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer p-0.5"
                          title="Clear input"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleSearchMemberForFee}
                      disabled={isSearchingMember || !addFeeForm.referenceOrRollNumber.trim()}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-md shadow-emerald-600/20 active:scale-95"
                    >
                      {isSearchingMember ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                          <span>Searching...</span>
                        </>
                      ) : (
                        <>
                          <Search className="w-3.5 h-3.5 text-white" />
                          <span>Search Member</span>
                        </>
                      )}
                    </button>
                  </div>
                  {searchMemberError && (
                    <p className="text-[11px] text-amber-400 font-sans flex items-center gap-1 mt-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{searchMemberError}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Read-Only Member Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-[#0F0F12] border border-zinc-800/80 rounded-2xl">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                    3. Full Name (Read Only)
                  </label>
                  <input
                    type="text"
                    value={addFeeForm.fullName || ''}
                    readOnly
                    placeholder="Auto-populated"
                    className="w-full bg-[#141419]/50 border border-zinc-800/60 rounded-xl px-3 py-2 text-xs text-zinc-300 font-sans cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                    4. Phone Number (Read Only)
                  </label>
                  <input
                    type="text"
                    value={addFeeForm.phoneNumber || ''}
                    readOnly
                    placeholder="Auto-populated"
                    className="w-full bg-[#141419]/50 border border-zinc-800/60 rounded-xl px-3 py-2 text-xs text-zinc-300 font-mono cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                    5. Email Address (Read Only)
                  </label>
                  <input
                    type="text"
                    value={addFeeForm.emailAddress || ''}
                    readOnly
                    placeholder="Auto-populated"
                    className="w-full bg-[#141419]/50 border border-zinc-800/60 rounded-xl px-3 py-2 text-xs text-zinc-300 font-sans cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                    6. Selected Plan (Read Only)
                  </label>
                  <input
                    type="text"
                    value={addFeeForm.selectedPlan || ''}
                    readOnly
                    placeholder="Auto-populated"
                    className="w-full bg-[#141419]/50 border border-zinc-800/60 rounded-xl px-3 py-2 text-xs text-emerald-400 font-bold font-sans cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Payment Details */}
              {(() => {
                const feeAmount = Number(addFeeForm.feeAmount || 0);
                const previousBalance = Number(addFeeForm.previousBalance || 0);
                const discount = Number(addFeeForm.discount || 0);
                const totalPayable = Math.max(0, feeAmount + previousBalance - discount);

                const amountPaid = addFeeForm.paymentType === 'Full Payment'
                  ? totalPayable
                  : Number(addFeeForm.amountPaid || 0);

                const remainingBalance = Math.max(0, totalPayable - amountPaid);

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Fee Price Type */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                        Fee Price Type *
                      </label>
                      <select
                        value={addFeeForm.feePriceType || 'Regular Price'}
                        onChange={(e) => handleFeePriceTypeChange(e.target.value as 'Regular Price' | 'Offer Price' | 'Custom Price')}
                        className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-emerald-400 font-bold focus:outline-none focus:border-emerald-500 font-sans"
                      >
                        <option value="Regular Price">Regular Price</option>
                        <option value="Offer Price">Offer Price</option>
                        <option value="Custom Price">Custom Price</option>
                      </select>
                    </div>

                    {/* Fee Duration */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                        Fee Duration *
                      </label>
                      <select
                        value={addFeeForm.feeDuration || '1 Month'}
                        onChange={(e) => handleDurationChange(e.target.value)}
                        className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-sans"
                      >
                        <option value="1 Month">1 Month</option>
                        <option value="2 Months">2 Months</option>
                        <option value="3 Months">3 Months</option>
                        <option value="6 Months">6 Months</option>
                        <option value="12 Months">12 Months</option>
                        <option value="Custom">Custom</option>
                      </select>
                    </div>

                    {/* Fee Calculation Mode */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                        Fee Calculation Mode *
                      </label>
                      <select
                        value={addFeeForm.feeCalculationMode || 'Auto Calculate'}
                        onChange={(e) => handleCalculationModeChange(e.target.value as 'Auto Calculate' | 'Custom Amount')}
                        className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-sans"
                      >
                        <option value="Auto Calculate">Auto Calculate</option>
                        <option value="Custom Amount">Custom Amount</option>
                      </select>
                    </div>

                    {/* Current Fee Amount */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                        {addFeeForm.feePriceType === 'Offer Price' ? 'Offer Fee Amount (₹) *' : 'Current Fee Amount (₹) *'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={addFeeForm.feeAmount ?? ''}
                        readOnly={addFeeForm.feePriceType === 'Regular Price' && addFeeForm.feeCalculationMode === 'Auto Calculate' && addFeeForm.feeDuration !== 'Custom'}
                        onChange={(e) => setAddFeeForm(prev => {
                          const val = e.target.value;
                          const numericFee = Number(val || 0);
                          const numericPrevBal = Number(prev.previousBalance || 0);
                          const numericDiscount = Number(prev.discount || 0);
                          const totalPayable = Math.max(0, numericFee + numericPrevBal - numericDiscount);
                          return {
                            ...prev,
                            feeAmount: val,
                            finalFeeAmount: val,
                            amountPaid: prev.paymentType === 'Full Payment' ? String(totalPayable) : prev.amountPaid,
                          };
                        })}
                        placeholder="0"
                        className={`w-full border rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none ${
                          addFeeForm.feePriceType === 'Regular Price' && addFeeForm.feeCalculationMode === 'Auto Calculate' && addFeeForm.feeDuration !== 'Custom'
                            ? 'bg-[#141419]/50 border-zinc-800/60 text-emerald-400 font-bold cursor-not-allowed'
                            : 'bg-[#0F0F12] border-zinc-800 text-white focus:border-emerald-500'
                        }`}
                        required
                      />
                      {addFeeForm.feePriceType === 'Offer Price' && (
                        <p className="text-[10px] text-emerald-400 mt-1 font-sans font-semibold">
                          Customer-specific offer price applied.
                        </p>
                      )}
                    </div>

                    {/* Offer / Price Note */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                        Offer / Price Note
                      </label>
                      <input
                        type="text"
                        value={addFeeForm.offerNote || ''}
                        onChange={(e) => setAddFeeForm(prev => ({ ...prev, offerNote: e.target.value }))}
                        placeholder="e.g., Special Festive Offer or Student Discount"
                        className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-sans"
                      />
                    </div>

                    {/* Offer Dates */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                        Offer Valid From
                      </label>
                      <input
                        type="date"
                        value={addFeeForm.offerValidFrom || ''}
                        onChange={(e) => setAddFeeForm(prev => ({ ...prev, offerValidFrom: e.target.value }))}
                        className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                        Offer Valid Until
                      </label>
                      <input
                        type="date"
                        value={addFeeForm.offerValidUntil || ''}
                        onChange={(e) => setAddFeeForm(prev => ({ ...prev, offerValidUntil: e.target.value }))}
                        className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    {/* Save Price Checkbox */}
                    <div className="sm:col-span-2">
                      <label className="flex items-start gap-3 p-3.5 bg-[#0F0F12] border border-zinc-800/80 rounded-xl cursor-pointer hover:border-zinc-700 transition-colors">
                        <input
                          type="checkbox"
                          checked={Boolean(addFeeForm.savePriceForFuture)}
                          onChange={(e) => setAddFeeForm(prev => ({ ...prev, savePriceForFuture: e.target.checked }))}
                          className="mt-0.5 w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-zinc-900 border-zinc-700 cursor-pointer"
                        />
                        <div className="text-xs">
                          <span className="font-bold text-white block">Save this price for future payments</span>
                          <span className="text-[10px] text-zinc-400 font-sans block mt-0.5">
                            {addFeeForm.savePriceForFuture
                              ? "✓ Will save Final Fee Amount, Fee Price Type, and Offer Note in the member's profile for future payments."
                              : "Applies price only to current transaction. Will NOT change member's future saved fee amount or original membership plan."}
                          </span>
                        </div>
                      </label>
                    </div>

                    {/* Fee Month */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                        Fee Month *
                      </label>
                      <input
                        type="text"
                        value={addFeeForm.feeMonth || ''}
                        onChange={(e) => setAddFeeForm(prev => ({ ...prev, feeMonth: e.target.value }))}
                        placeholder="e.g., August 2026 or August 2026 - October 2026"
                        className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-sans"
                        required
                      />
                    </div>

                    {/* Previous Balance (read-only) */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                        Previous Balance (₹)
                      </label>
                      <input
                        type="number"
                        value={addFeeForm.previousBalance ?? 0}
                        readOnly
                        className="w-full bg-[#141419]/50 border border-zinc-800/60 rounded-xl px-3.5 py-2.5 text-xs text-amber-400 font-mono cursor-not-allowed"
                      />
                    </div>

                    {/* Discount */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                        Discount (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={addFeeForm.discount ?? '0'}
                        onChange={(e) =>
                          setAddFeeForm(prev => ({
                            ...prev,
                            discount: e.target.value
                          }))
                        }
                        placeholder="0"
                        className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    {/* Total Payable (read-only) */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-400 mb-1">
                        Total Payable (₹)
                      </label>
                      <input
                        type="number"
                        value={isNaN(totalPayable) ? 0 : totalPayable}
                        readOnly
                        className="w-full bg-[#141419]/50 border border-emerald-500/40 rounded-xl px-3.5 py-2.5 text-xs text-emerald-400 font-bold font-mono cursor-not-allowed"
                      />
                    </div>

                    {/* Payment Type */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                        Payment Type *
                      </label>
                      <select
                        value={addFeeForm.paymentType || 'Full Payment'}
                        onChange={(e) => {
                          const pType = e.target.value as 'Full Payment' | 'Partial Payment';
                          setAddFeeForm(prev => ({
                            ...prev,
                            paymentType: pType,
                            amountPaid: pType === 'Full Payment' ? String(totalPayable) : prev.amountPaid,
                          }));
                        }}
                        className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-sans"
                      >
                        <option value="Full Payment">Full Payment</option>
                        <option value="Partial Payment">Partial Payment</option>
                      </select>
                    </div>

                    {/* Amount Paid */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-400 mb-1">
                        Amount Paid (₹) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={totalPayable}
                        value={addFeeForm.paymentType === 'Full Payment' ? totalPayable : (addFeeForm.amountPaid ?? '')}
                        onChange={(e) => setAddFeeForm(prev => ({ ...prev, amountPaid: e.target.value }))}
                        disabled={addFeeForm.paymentType === 'Full Payment'}
                        placeholder="0"
                        className="w-full bg-[#0F0F12] border border-emerald-500/50 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono disabled:opacity-80"
                        required
                      />
                    </div>

                    {/* Remaining Balance (read-only) */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                        Remaining Balance (₹)
                      </label>
                      <input
                        type="number"
                        value={isNaN(remainingBalance) ? 0 : remainingBalance}
                        readOnly
                        className="w-full bg-[#141419]/50 border border-zinc-800/60 rounded-xl px-3.5 py-2.5 text-xs text-amber-400 font-bold font-mono cursor-not-allowed"
                      />
                    </div>

                    {/* Formatted Summary Display */}
                    <div className="p-3.5 bg-[#0A0A0D] border border-zinc-800/80 rounded-xl text-xs font-mono space-y-1.5 sm:col-span-2 text-zinc-300">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Current Fee Amount:</span>
                        <span className="font-bold text-white">₹{feeAmount.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Previous Balance:</span>
                        <span className="font-bold text-white">₹{previousBalance.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Discount:</span>
                        <span className="font-bold text-emerald-400">₹{discount.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Total Payable:</span>
                        <span className="font-bold text-emerald-400">₹{totalPayable.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Amount Paid:</span>
                        <span className="font-bold text-emerald-400">₹{amountPaid.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between border-t border-zinc-800 pt-1">
                        <span className="text-zinc-500">Remaining Balance:</span>
                        <span className="font-bold text-amber-400">₹{remainingBalance.toLocaleString("en-IN")}</span>
                      </div>
                    </div>

                    {/* Payment Method */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                        Payment Method *
                      </label>
                      <select
                        value={addFeeForm.paymentMethod || 'Cash'}
                        onChange={(e) => setAddFeeForm(prev => ({ ...prev, paymentMethod: e.target.value as 'Cash' | 'UPI' }))}
                        className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-sans"
                      >
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                      </select>
                    </div>

                    {addFeeForm.paymentMethod === 'UPI' && (
                      <div className="sm:col-span-2 animate-in fade-in space-y-3">
                        <div className="p-3 bg-[#18181B] border border-zinc-800 rounded-xl flex items-center justify-between text-xs font-mono">
                          <span className="text-zinc-400">Target UPI ID:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-400">{AB_FITNESS_UPI_ID}</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(AB_FITNESS_UPI_ID);
                              }}
                              className="text-blue-400 hover:text-white p-1"
                              title="Copy UPI ID"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                            UPI Transaction ID *
                          </label>
                          <input
                            type="text"
                            value={addFeeForm.upiTransactionId || ''}
                            onChange={(e) => setAddFeeForm(prev => ({ ...prev, upiTransactionId: e.target.value }))}
                            placeholder="Enter 12-digit UPI Ref ID"
                            className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
                            required={addFeeForm.paymentMethod === 'UPI'}
                          />
                        </div>
                      </div>
                    )}

                    {/* Payment Date */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                        Payment Date *
                      </label>
                      <input
                        type="date"
                        value={addFeeForm.paymentDate || ''}
                        onChange={(e) => setAddFeeForm(prev => ({ ...prev, paymentDate: e.target.value }))}
                        className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                        required
                      />
                    </div>

                    {/* Admin Remarks */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                        Admin Remarks
                      </label>
                      <input
                        type="text"
                        value={addFeeForm.adminRemarks || ''}
                        onChange={(e) => setAddFeeForm(prev => ({ ...prev, adminRemarks: e.target.value }))}
                        placeholder="Optional notes..."
                        className="w-full bg-[#0F0F12] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-sans"
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddFeeModalOpen(false)}
                  disabled={isSubmittingFee}
                  className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFee}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  {isSubmittingFee ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      <span>Submitting to Server...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-black" />
                      <span>16. Submit and Generate Receipt</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member Update Success Toast */}
      {memberSuccessToast && (
        <div className="fixed bottom-6 right-6 z-[100] max-w-md w-full bg-[#141419] border-2 border-purple-500 rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom-5 text-white font-sans space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-purple-400 uppercase tracking-wide">
                  Member Details Updated
                </h4>
                <p className="text-xs text-zinc-300 mt-0.5">
                  {memberSuccessToast.message}
                </p>
              </div>
            </div>
            <button
              onClick={() => setMemberSuccessToast(null)}
              className="text-zinc-500 hover:text-white transition p-1"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          {(memberSuccessToast.memberName || memberSuccessToast.rollNumber) && (
            <div className="bg-[#0F0F12] border border-zinc-800/80 rounded-2xl p-3 space-y-1 font-mono text-xs">
              {memberSuccessToast.memberName && (
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Member:</span>
                  <span className="text-white font-bold">{memberSuccessToast.memberName}</span>
                </div>
              )}
              {memberSuccessToast.rollNumber && (
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Roll Number:</span>
                  <span className="text-purple-400 font-bold">{memberSuccessToast.rollNumber}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Success Toast / Receipt Notification */}
      {feeSuccessToast && (
        <div className="fixed bottom-6 right-6 z-[100] max-w-md w-full bg-[#141419] border-2 border-emerald-500 rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom-5 text-white font-sans space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-emerald-400 uppercase tracking-wide">
                  Fee Payment Successful!
                </h4>
                <p className="text-xs text-zinc-300 mt-0.5">
                  {feeSuccessToast.message}
                </p>
              </div>
            </div>
            <button
              onClick={() => setFeeSuccessToast(null)}
              className="text-zinc-500 hover:text-white transition p-1"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-[#0F0F12] border border-zinc-800/80 rounded-2xl p-3 space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Receipt Number:</span>
              <span className="text-emerald-400 font-bold">{feeSuccessToast.receiptNumber}</span>
            </div>
            {feeSuccessToast.receiptUrl && (
              <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between gap-2">
                <span className="text-zinc-500 text-[11px] font-sans truncate max-w-[180px]">
                  {feeSuccessToast.receiptUrl}
                </span>
                <a
                  href={feeSuccessToast.receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[10px] uppercase tracking-wider rounded-lg transition flex items-center gap-1 shrink-0"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>View Receipt</span>
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUCCESS ACTION CELEBRATION / REJECT STAMP MODAL */}
      <AnimatePresence>
        {successAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setSuccessAction(null)}
          >
            <motion.div
              initial={
                successAction.type === 'approve'
                  ? { scale: 0.5, opacity: 0, y: 50 }
                  : { scale: 1.3, opacity: 0, rotate: -8, x: 0 }
              }
              animate={
                successAction.type === 'approve'
                  ? { scale: 1, opacity: 1, y: 0 }
                  : {
                      scale: [1.3, 0.95, 1],
                      opacity: 1,
                      rotate: [-8, 4, 0],
                      x: [0, -12, 12, -6, 6, 0],
                    }
              }
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={
                successAction.type === 'approve'
                  ? { type: "spring", damping: 18, stiffness: 300 }
                  : { type: "tween", duration: 0.5, ease: "easeOut" }
              }
              onClick={(e) => e.stopPropagation()}
              className={`relative max-w-sm w-full rounded-3xl p-8 text-center shadow-2xl border ${
                successAction.type === 'approve'
                  ? 'bg-[#0F1412] border-emerald-500/40 shadow-[0_0_60px_rgba(16,185,129,0.25)]'
                  : 'bg-[#140F0F] border-red-500/40 shadow-[0_0_60px_rgba(239,68,68,0.25)]'
              }`}
            >
              {/* Decorative background glow */}
              <div
                className={`absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
                  successAction.type === 'approve' ? 'bg-emerald-500/20' : 'bg-red-500/20'
                }`}
              />

              {/* Icon Animation */}
              <div className="relative mb-6 flex justify-center">
                {successAction.type === 'approve' ? (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", damping: 12, stiffness: 250 }}
                    className="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.4)] relative"
                  >
                    <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                    {/* Pulsing ring */}
                    <motion.div
                      animate={{ scale: [1, 1.35], opacity: [0.6, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                      className="absolute inset-0 rounded-full border-2 border-emerald-400"
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ scale: 0, rotate: 45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", damping: 12, stiffness: 250 }}
                    className="w-24 h-24 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.4)] relative"
                  >
                    <XCircle className="w-12 h-12 text-red-500" />
                    <motion.div
                      animate={{ scale: [1, 1.35], opacity: [0.6, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                      className="absolute inset-0 rounded-full border-2 border-red-500"
                    />
                  </motion.div>
                )}
              </div>

              {/* Title & Subtext */}
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`text-2xl font-black uppercase tracking-wider font-mono ${
                  successAction.type === 'approve' ? 'text-emerald-400' : 'text-red-500'
                }`}
              >
                {successAction.message || (successAction.type === 'approve' ? 'Approved!' : 'Rejected!')}
              </motion.h3>

              {successAction.subtext && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-xs text-zinc-300 mt-2 font-sans px-2 leading-relaxed"
                >
                  {successAction.subtext}
                </motion.p>
              )}

              {successAction.rollNumber && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="mt-4 p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 font-mono"
                >
                  <div className="text-[10px] text-emerald-400/80 uppercase tracking-widest font-bold">Assigned Roll Number</div>
                  <div className="text-xl font-black text-white tracking-wider mt-0.5">{successAction.rollNumber}</div>
                </motion.div>
              )}

              {/* Close Button */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSuccessAction(null)}
                className={`mt-6 w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition shadow-lg cursor-pointer flex items-center justify-center gap-2 ${
                  successAction.type === 'approve'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
                    : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20'
                }`}
              >
                <span>Awesome, Continue</span>
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
