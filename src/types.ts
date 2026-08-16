export type MemberStatus = 'Active' | 'Expired' | 'Payment Due' | 'Suspended';
export type PaymentStatus = 'Pending Verification' | 'Successful' | 'Rejected';
export type PaymentMethod = 'Cash' | 'UPI';

export interface Member {
  id: string;
  timestamp?: string;
  registrationRef?: string;
  rollNumber: string; // e.g. ABG-26-0688
  rollNo?: string;
  fullName: string;
  name?: string;
  gender: 'Male' | 'Female' | 'Other' | string;
  dob: string;
  dateOfBirth?: string;
  phone: string;
  phoneNumber?: string;
  email: string;
  emailAddress?: string;
  address: string;
  emergencyContact: string;
  emergencyContactNumber?: string;
  planId?: string;
  planName?: string;
  selectedPlan?: string;
  membershipPlan?: string;
  fitnessGoal: string;
  joiningDate: string;
  joinDate?: string;
  membershipExpiry?: string;
  expiryDate?: string;
  planStartDate?: string;
  planExpiryDate?: string;
  status: MemberStatus | string;
  membershipStatus?: MemberStatus | string;
  memberStatus?: MemberStatus | string;
  previousBalance?: number;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  lastPaymentStatus?: string;
  registrationFeePaid?: number;
  discountAmount?: number;
  regularPlanAmount?: number;
  finalFeeAmount?: number;
  feePriceType?: string;
  offerNote?: string;
  offerValidFrom?: string;
  offerValidUntil?: string;
  assignedTrainerId?: string;
  medicalCondition?: string;
  remarks?: string;
  avatarUrl?: string;
  termsAccepted?: boolean;
  termsAcceptedAt?: string;
  createdBy?: string;
  updatedAt?: string;
}

export interface RegistrationRequest {
  id?: string;
  registrationRef?: string; // e.g. ABG-REG-260724-1284
  registrationReferenceNumber?: string;
  referenceNumber?: string;
  rowNumber?: number;
  timestamp?: string;
  rollNumber?: string; // Assigned by admin upon approval (e.g. ABG-26-2432)
  fullName: string;
  gender: 'Male' | 'Female' | 'Other' | string;
  dob?: string;
  dateOfBirth?: string;
  phone?: string;
  phoneNumber?: string;
  email?: string;
  emailAddress?: string;
  address?: string;
  emergencyContact?: string;
  emergencyContactNumber?: string;
  planId?: string;
  planName?: string;
  selectedPlan?: string;
  fitnessGoal?: string;
  joiningDate?: string;
  paymentMethod?: PaymentMethod | string;
  registrationFee: number;
  upiTxnId?: string;
  upiTransactionId?: string;
  upiScreenshotUrl?: string;
  paymentScreenshot?: string;
  paymentScreenshotUrl?: string;
  medicalCondition?: string;
  remarks?: string;
  adminRemarks?: string;
  rejectionReason?: string;
  status?: 'Pending Verification' | 'Approved' | 'Rejected' | string;
  registrationStatus?: string;
  paymentStatus?: string;
  feeReferenceNumber?: string;
  termsAccepted?: boolean | string;
  termsAcceptedDate?: string;
  entrySource?: string;
  submissionSource?: string;
  createdBy?: string;
  approvedBy?: string;
  approvedDate?: string;
  reviewedBy?: string;
  reviewRemarks?: string;
  amountPaid?: number;
  finalFeeAmount?: number;
  transactionId?: string;
  paymentDate?: string;
  createdDate?: string;
  receiptNumber?: string;
  createdAt?: string;
  termsAcceptedAt?: string;
  acceptedAt?: string;
  updatedAt?: string;
}

export interface FeePaymentRecord {
  id: string;
  rowNumber?: number;
  timestamp?: string;
  feeReferenceNumber: string;
  registrationReferenceNumber?: string;
  registrationRef?: string;
  rollNumber?: string;
  memberName?: string;
  fullName?: string;
  phone?: string;
  email?: string;
  phoneNumber?: string;
  emailAddress?: string;
  memberPhone?: string;
  memberEmail?: string;
  selectedPlan?: string;
  planName?: string;
  discountAmount?: number;
  regularPlanAmount?: number;
  finalFeeAmount?: number;
  feePriceType?: string;
  offerNote?: string;
  offerValidFrom?: string;
  offerValidUntil?: string;
  feeDuration?: string;
  feeCalculationMode?: string;
  finalPayableAmount?: number;
  previousBalance?: number;
  currentFeeAmount?: number;
  totalPayableAmount?: number;
  amountPaid?: number;
  paymentDate: string;
  paymentMethod: PaymentMethod | string;
  upiTransactionId?: string;
  upiTxnId?: string;
  paymentScreenshot?: string;
  paymentScreenshotUrl?: string;
  upiScreenshotUrl?: string;
  paymentStatus?: string;
  status?: PaymentStatus | string;
  adminVerificationStatus?: string;
  registrationStatus?: string;
  receiptNumber?: string;
  pdfReceiptLink?: string;
  entrySource?: string;
  submissionSource?: string;
  notes?: string;
  remarks?: string;
  adminRemarks?: string;
  verifiedBy?: string;
  verifiedDate?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  remainingBalance?: number;
  paymentType?: 'Full Payment' | 'Partial Payment' | string;
  newExpiryDate?: string;
  feeAmount?: number;
  source?: 'REGISTRATION_PAYMENT' | 'FEE_PAYMENT' | string;
  plan?: string;
  feeMonth?: string;
  amount?: string;
  transactionId?: string;
  createdDate?: string;
  createdAt?: string;
  feePeriod?: string;
}

export interface MembershipPlan {
  id: string;
  name: string; // Basic, Standard, Premium, Annual
  price: number; // 999, 2499, 4499, 7999
  durationMonths: number; // 1, 3, 6, 12
  popular?: boolean;
  features: string[];
  description: string;
  badge?: string;
}

export interface Trainer {
  id: string;
  name: string;
  role: string;
  specialty: string;
  experience: string;
  certifications: string[];
  bio: string;
  imageUrl: string;
  phone: string;
  availableSlots: string[];
  rating: number;
}

export interface GalleryItem {
  id: string;
  title: string;
  category: 'Equipment' | 'Cardio' | 'CrossFit' | 'Transformations' | 'Classes';
  imageUrl: string;
  description?: string;
}

export interface GymSettings {
  gymName: string;
  tagline: string;
  phone: string;
  altPhone: string;
  email: string;
  address: string;
  googleMapsUrl?: string;
  upiId: string;
  upiName: string;
  qrCodeUrl?: string;
  registrationFeeDefault: number;
  operatingHours: {
    monSat: string;
    sun: string;
  };
  announcement?: string;
  adminPasscode: string;
}

export interface ActivityLogRecord {
  id?: string;
  timestamp: string; // Timestamp
  adminName: string; // Admin Name
  action: string; // Action
  recordType: string; // Record Type
  referenceNumber: string; // Reference Number
  oldStatus?: string; // Old Status
  newStatus?: string; // New Status
  remarks?: string; // Remarks
}

export interface AttendanceRecord {
  id: string;
  timestamp: string;
  rollNumber: string;
  memberName: string;
  planName: string;
  status: string;
  date: string;
  time: string;
  scanSource?: string;
}

export interface DashboardStats {
  totalRegistrations?: number;
  pendingRegistrations?: number;
  approvedRegistrations?: number;
  rejectedRegistrations?: number;
  totalMembers?: number;
  activeMembers?: number;
  expiredMembers?: number;
  pendingFeePayments?: number;
  successfulFeePayments?: number;
  rejectedFeePayments?: number;
  todayCollection?: number;
  monthlyCollection?: number;
  totalPreviousBalance?: number;
  totalCollections?: number;
}

