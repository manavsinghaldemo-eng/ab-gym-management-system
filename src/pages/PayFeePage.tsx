import React, { useState, useEffect, useCallback } from 'react';
import {
  getStoredSettings,
  getStoredPlans,
  getStoredPayments,
  getStoredMembers,
  getStoredRegistrations,
  getMemberForFee,
  evaluateFeePaymentBlockingStorage,
  MemberFeeDetailsData,
  normalizeId,
} from '../lib/storage';
import { AB_FITNESS_UPI_ID } from '../data/initialData';
import { api, apiService, getScriptUrl, GOOGLE_APPS_SCRIPT_URL } from '../lib/api';
import { PaymentMethod, FeePaymentRecord } from '../types';
import { ReceiptModal } from '../components/ReceiptModal';
import { downloadFeeReceiptPDF } from '../lib/pdf';
import {
  CreditCard,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Phone,
  MapPin,
  QrCode,
  Copy,
  Check,
  ShieldCheck,
  Lock,
  Upload,
  Image as ImageIcon,
  Loader2,
  Calendar,
  IndianRupee,
  Receipt,
  Download,
  UserX,
  Smartphone,
  Info,
  Sparkles,
  RefreshCw,
  History,
  Filter,
  Eye,
  XCircle,
  FileText,
} from 'lucide-react';
import { RevealOnScroll } from '../components/RevealOnScroll';
import { resolveFeeMemberName } from './AdminPage';

interface PayFeePageProps {
  initialRegistrationRef?: string;
  initialRoll?: string;
  onNavigate: (path: string, params?: Record<string, string>) => void;
}

export const PayFeePage: React.FC<PayFeePageProps> = ({
  initialRegistrationRef,
  initialRoll,
  onNavigate,
}) => {
  const settings = getStoredSettings();
  const plans = getStoredPlans();

  // Search Verification Inputs
  const [referenceOrRollNumber, setReferenceOrRollNumber] = useState(
    (initialRegistrationRef || initialRoll || '').trim().toUpperCase()
  );
  const [phoneFirst4, setPhoneFirst4] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState("");

  // Persistent Verified State Values
  const [verifiedRegistrationRef, setVerifiedRegistrationRef] = useState('');
  const [verifiedRollNumber, setVerifiedRollNumber] = useState('');
  const [verifiedPhoneFirst4, setVerifiedPhoneFirst4] = useState('');
  const [verifiedRecord, setVerifiedRecord] = useState<MemberFeeDetailsData | null>(null);
  const [verifiedCredentials, setVerifiedCredentials] = useState<{
    referenceOrRollNumber: string;
    phoneFirst4: string;
    dateOfBirth: string;
  }>({
    referenceOrRollNumber: '',
    phoneFirst4: '',
    dateOfBirth: '',
  });

  // Status States
  const [isVerifying, setIsVerifying] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [statusAlert, setStatusAlert] = useState<{
    code: string;
    type: 'pending' | 'rejected' | 'mismatch';
    message: string;
  } | null>(null);
  const [statusNotice, setStatusNotice] = useState<string>('');
  const [verifySuccessMsg, setVerifySuccessMsg] = useState('');

  // Form Fields
  const [selectedPlan, setSelectedPlan] = useState('');
  const [currentFeeAmount, setCurrentFeeAmount] = useState<number>(0);
  const [previousBalance, setPreviousBalance] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paymentType, setPaymentType] = useState<'Full Payment' | 'Partial Payment'>('Full Payment');
  const [amountPaidInput, setAmountPaidInput] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [upiTransactionId, setUpiTransactionId] = useState('');
  const [paymentScreenshot, setPaymentScreenshot] = useState('');
  const [screenshotFileName, setScreenshotFileName] = useState('');
  const [notes, setNotes] = useState('');

  // Offer Pricing States
  const [regularPlanAmount, setRegularPlanAmount] = useState<number>(0);
  const [finalFeeAmount, setFinalFeeAmount] = useState<number>(0);
  const [feePriceType, setFeePriceType] = useState<string>('Regular Price');
  const [offerNote, setOfferNote] = useState<string>('');
  const [offerValidUntil, setOfferValidUntil] = useState<string>('');
  const [isSpecialOfferActive, setIsSpecialOfferActive] = useState<boolean>(false);

  // Fee History & Receipt Modal State
  const [feeHistoryRecords, setFeeHistoryRecords] = useState<FeePaymentRecord[]>([]);
  const [historyError, setHistoryError] = useState<string>('');
  const [isLoadingFeeHistory, setIsLoadingFeeHistory] = useState<boolean>(false);
  const [historyLoaded, setHistoryLoaded] = useState<boolean>(false);
  const [canSubmitNewPayment, setCanSubmitNewPayment] = useState<boolean>(true);
  const [blockingReason, setBlockingReason] = useState<string>('NO_BLOCKING_PAYMENT');
  const [selectedReceiptRecord, setSelectedReceiptRecord] = useState<FeePaymentRecord | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [upiClicked, setUpiClicked] = useState(false);
  const [noUpiAppFound, setNoUpiAppFound] = useState(false);

  const setError = setSubmitError;

  // Helper to clear verified values
  const handleResetVerification = () => {
    setVerifiedRegistrationRef('');
    setVerifiedRollNumber('');
    setVerifiedPhoneFirst4('');
    setVerifiedRecord(null);
    setVerifiedCredentials({
      referenceOrRollNumber: '',
      phoneFirst4: '',
      dateOfBirth: '',
    });
    setFeeHistoryRecords([]);
    setHistoryError('');
    setIsLoadingFeeHistory(false);
    setHistoryLoaded(false);
    setCanSubmitNewPayment(true);
    setBlockingReason('NO_BLOCKING_PAYMENT');
    setSelectedReceiptRecord(null);
    setPreviousBalance(0);
    setDiscountAmount(0);
    setRegularPlanAmount(0);
    setFinalFeeAmount(0);
    setFeePriceType('Regular Price');
    setOfferNote('');
    setOfferValidUntil('');
    setIsSpecialOfferActive(false);
    setVerifySuccessMsg('');
    setStatusNotice('');
    setSearchError('');
    setStatusAlert(null);
    setSubmitError('');
    setUpiClicked(false);
    setNoUpiAppFound(false);
  };

  // Input change handlers (clears errors and status alerts when input changes)
  const handleRefInputChange = (value: string) => {
    const uppercaseVal = value.toUpperCase().replace(/\s+/g, '');
    setReferenceOrRollNumber(uppercaseVal);
    if (searchError) setSearchError('');
    if (statusAlert) setStatusAlert(null);
    if (verifiedRecord) handleResetVerification();
  };

  const handlePhoneFirst4Change = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 4);
    setPhoneFirst4(digitsOnly);
    if (searchError) setSearchError('');
    if (statusAlert) setStatusAlert(null);
    if (verifiedRecord) handleResetVerification();
  };

  const handleDobChange = (value: string) => {
    setDateOfBirth(value);
    if (searchError) setSearchError('');
    if (statusAlert) setStatusAlert(null);
    if (verifiedRecord) handleResetVerification();
  };

  // Cleanup inputs for search
  const cleanRef = referenceOrRollNumber.trim().toUpperCase();
  const cleanPhone = phoneFirst4.replace(/\D/g, '');

  const isVerifyDisabled =
    cleanRef.length === 0 ||
    !/^\d{4}$/.test(cleanPhone) ||
    !dateOfBirth ||
    isVerifying;

  const fetchFeeHistory = async (targetRoll: string, targetRegRef: string) => {
    setIsLoadingFeeHistory(true);
    setHistoryLoaded(false);
    setHistoryError('');

    const normRoll = normalizeId(targetRoll);
    const normRegRef = normalizeId(targetRegRef);

    // Safe Logging
    console.log("Verified roll:", normRoll);
    console.log("Verified registration ref:", normRegRef);

    try {
      const res: any = await api.getMemberFeeHistory({
        action: "getMemberFeeHistory",
        rollNumber: normRoll,
        registrationReferenceNumber: normRegRef,
        registrationRef: normRegRef,
        referenceOrRollNumber: normRoll || normRegRef,
        phoneFirst4: verifiedPhoneFirst4 || phoneFirst4 || cleanPhone,
        dateOfBirth: verifiedCredentials.dateOfBirth || dateOfBirth,
      });

      console.log("[Fee History Response] Backend response code:", res?.code || (res?.success ? 'FEE_HISTORY_FOUND' : 'ERROR'));

      if (res && res.success === false) {
        console.log("[Fee History Response] Backend returned success: false. Checking local storage records...");
        const localPayments = getStoredPayments();
        const matchedLocal = localPayments.filter((p) => {
          const pRoll = normalizeId(p.rollNumber);
          const pReg = normalizeId(p.registrationRef || p.registrationReferenceNumber);
          const pFeeRef = normalizeId(p.feeReferenceNumber);
          const pReceipt = normalizeId(p.receiptNumber);
          return (
            (pRoll !== '' && normRoll !== '' && pRoll === normRoll) ||
            (pReg !== '' && normRegRef !== '' && pReg === normRegRef) ||
            (pFeeRef !== '' && (pFeeRef === normRoll || pFeeRef === normRegRef)) ||
            (pReceipt !== '' && (pReceipt === normRoll || pReceipt === normRegRef))
          );
        });

        if (matchedLocal.length > 0) {
          const sortedLocal = matchedLocal.sort((a, b) => {
            const dateA = new Date(a.paymentDate || a.createdDate || a.createdAt || a.timestamp || 0).getTime();
            const dateB = new Date(b.paymentDate || b.createdDate || b.createdAt || b.timestamp || 0).getTime();
            return dateB - dateA;
          });
          setFeeHistoryRecords(sortedLocal);
          setHistoryError('');
          const evalRes = evaluateFeePaymentBlockingStorage(sortedLocal);
          setCanSubmitNewPayment(evalRes.canSubmitNewPayment);
          setBlockingReason(evalRes.blockingReason);
          setHistoryLoaded(true);
          return;
        }

        setHistoryError(res.message || "Fee history could not be checked. Please try again before making another payment.");
        setFeeHistoryRecords([]);
        setCanSubmitNewPayment(false);
        setBlockingReason('HISTORY_UNAVAILABLE');
        setHistoryLoaded(true);
        return;
      }

      // Read response.history
      const rawHistory = Array.isArray(res?.history) ? res.history : (Array.isArray(res?.records) ? res.records : (Array.isArray(res?.data) ? res.data : []));
      console.log("[Fee History Response] Number of history records returned:", rawHistory.length);

      const fetchedList: FeePaymentRecord[] = Array.isArray(rawHistory) ? rawHistory : [];

      // Merge local storage payments AND local storage registrations matching normRoll or normRegRef
      const localPayments = getStoredPayments();
      const localRegistrations = getStoredRegistrations();

      const matchedLocalPayments = localPayments.filter((p) => {
        const pAny = p as any;
        const pRoll = normalizeId(pAny.rollNumber);
        const pReg = normalizeId(pAny.registrationRef || pAny.registrationReferenceNumber || pAny.referenceNumber);
        const pFeeRef = normalizeId(pAny.feeReferenceNumber);
        const pReceipt = normalizeId(pAny.receiptNumber);
        return (
          (normRoll !== '' && (pRoll === normRoll || pReg === normRoll || pFeeRef === normRoll || pReceipt === normRoll)) ||
          (normRegRef !== '' && (pReg === normRegRef || pRoll === normRegRef || pFeeRef === normRegRef || pReceipt === normRegRef))
        );
      });

      const matchedLocalRegistrations: FeePaymentRecord[] = [];
      localRegistrations.forEach((r) => {
        const rAny = r as any;
        const rRoll = normalizeId(rAny.rollNumber);
        const rReg = normalizeId(rAny.registrationRef || rAny.registrationReferenceNumber || rAny.referenceNumber || rAny.regRef || rAny.id);
        const rFeeRef = normalizeId(rAny.feeReferenceNumber);
        const isMatch =
          (normRoll !== '' && (rRoll === normRoll || rReg === normRoll || rFeeRef === normRoll)) ||
          (normRegRef !== '' && (rReg === normRegRef || rRoll === normRegRef || rFeeRef === normRegRef));

        if (isMatch) {
          const feeAmt = Number(rAny.registrationFee || rAny.amountPaid || rAny.finalFeeAmount || rAny.amount || rAny.feeAmount || 100);
          const displayRegRef = rAny.registrationRef || rAny.registrationReferenceNumber || rAny.referenceNumber || normRegRef;
          const displayRoll = rAny.rollNumber || normRoll;
          matchedLocalRegistrations.push({
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
            paymentMethod: rAny.paymentMethod || 'UPI',
            transactionId: rAny.upiTransactionId || rAny.upiTxnId || rAny.transactionId || '',
            upiTransactionId: rAny.upiTransactionId || rAny.upiTxnId || rAny.transactionId || '',
            paymentDate: rAny.paymentDate || rAny.createdDate || rAny.timestamp || rAny.createdAt || new Date().toISOString().split('T')[0],
            paymentStatus: rAny.paymentStatus || rAny.status || rAny.registrationStatus || 'Approved',
            status: rAny.paymentStatus || rAny.status || rAny.registrationStatus || 'Approved',
            receiptNumber: rAny.receiptNumber || `ABG-REC-${normalizeId(displayRegRef)}`
          });
        }
      });

      const mergedMap = new Map<string, FeePaymentRecord>();
      fetchedList.forEach((item) => {
        const key = item.feeReferenceNumber || item.id || `${item.source || 'PAY'}_${item.paymentDate}_${item.amountPaid || item.amount}`;
        mergedMap.set(key, item);
      });
      matchedLocalPayments.forEach((item) => {
        const key = item.feeReferenceNumber || item.id || `${item.source || 'PAY'}_${item.paymentDate}_${item.amountPaid || item.amount}`;
        if (!mergedMap.has(key)) {
          mergedMap.set(key, item);
        }
      });
      matchedLocalRegistrations.forEach((item) => {
        const key = item.feeReferenceNumber || item.id || `${item.source || 'PAY'}_${item.paymentDate}_${item.amountPaid || item.amount}`;
        if (!mergedMap.has(key)) {
          mergedMap.set(key, item);
        }
      });

      const sortedHistory = Array.from(mergedMap.values()).sort((a, b) => {
        const dateA = new Date(a.paymentDate || a.createdDate || a.createdAt || a.timestamp || 0).getTime();
        const dateB = new Date(b.paymentDate || b.createdDate || b.createdAt || b.timestamp || 0).getTime();
        return dateB - dateA;
      });

      setFeeHistoryRecords(sortedHistory);
      setHistoryError('');

      const evalRes = evaluateFeePaymentBlockingStorage(sortedHistory);
      setCanSubmitNewPayment(evalRes.canSubmitNewPayment);
      setBlockingReason(evalRes.blockingReason);
      setHistoryLoaded(true);

    } catch (err: any) {
      console.error("Error executing getMemberFeeHistory:", err);
      setHistoryError("Fee history could not be checked. Please try again before making another payment.");
      setFeeHistoryRecords([]);
      setCanSubmitNewPayment(false);
      setBlockingReason('HISTORY_UNAVAILABLE');
      setHistoryLoaded(true);
    } finally {
      setIsLoadingFeeHistory(false);
      setHistoryLoaded(true);
    }
  };

  // Handle member/registration verification
  const handleVerifyAndFetchRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVerifyDisabled) return;

    setSearchError('');
    setStatusAlert(null);
    setVerifySuccessMsg('');
    setSubmitError('');
    setIsVerifying(true);

    console.log("=== AB GYM VERIFICATION ATTEMPT ===");
    console.log("Normalized Ref/Roll:", cleanRef);
    console.log("Mobile First 4 Digits:", cleanPhone);
    console.log("Date of Birth:", dateOfBirth);

    try {
      const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'getMemberForFee',
          referenceOrRollNumber: cleanRef,
          phoneLast4: cleanPhone,
          phoneFirst4: cleanPhone,
          mobileLast4: cleanPhone,
          dateOfBirth: dateOfBirth,
        }),
      });

      const rawText = await response.text();
      let result: any;
      try {
        result = JSON.parse(rawText);
      } catch {
        throw new Error('Invalid server response: ' + rawText);
      }

      console.log("AB GYM BACKEND VERIFICATION RESULT:", result);

      const code = result.code || (result.success ? 'MEMBER_VERIFIED' : 'DETAILS_MISMATCH');

      if (code === 'REGISTRATION_PENDING') {
        setIsVerifying(false);
        setVerifiedRecord(null);
        setStatusAlert({
          code: 'REGISTRATION_PENDING',
          type: 'pending',
          message: result.message || 'Your registration has been received and is currently awaiting admin approval. The fee-payment facility will become available after your registration is approved. Please visit AB Gym reception or contact our team if you need assistance.',
        });
        return;
      }

      if (code === 'REGISTRATION_REJECTED') {
        setIsVerifying(false);
        setVerifiedRecord(null);
        setStatusAlert({
          code: 'REGISTRATION_REJECTED',
          type: 'rejected',
          message: result.message || 'Your registration has been rejected. Please contact AB Gym before making a payment.',
        });
        return;
      }

      if (!result.success || code === 'DETAILS_MISMATCH' || (!result.data && !result.member && !result.record && !result.fullName && !result.rollNumber && !result.registrationReferenceNumber)) {
        setIsVerifying(false);
        setVerifiedRecord(null);
        setStatusAlert({
          code: 'DETAILS_MISMATCH',
          type: 'mismatch',
          message: result.message || 'Member details do not match. Please check the entered information.',
        });
        return;
      }

      const fetchedData = (result.data || result.member || result.record || result) as MemberFeeDetailsData;

      setIsVerifying(false);
      setVerifySuccessMsg('Your registration has been approved.');

      const previousBalanceVal = Number(
        result.member?.previousBalance ??
        result.member?.outstandingBalance ??
        result.previousBalance ??
        result.outstandingBalance ??
        fetchedData?.previousBalance ??
        fetchedData?.outstandingBalance ??
        0
      );
      setPreviousBalance(isNaN(previousBalanceVal) ? 0 : previousBalanceVal);

      const discountVal = Number(
        result.member?.discountAmount ??
        result.member?.discount ??
        result.discountAmount ??
        result.discount ??
        fetchedData?.discountAmount ??
        0
      );
      setDiscountAmount(isNaN(discountVal) ? 0 : discountVal);

      const regRef =
        fetchedData.registrationReferenceNumber ||
        fetchedData.registrationRef ||
        cleanRef;
      const rollNum =
        fetchedData.rollNumber &&
        fetchedData.rollNumber !== 'Unassigned' &&
        fetchedData.rollNumber !== 'Pending'
          ? fetchedData.rollNumber
          : (cleanRef.startsWith('ABG-2') || !cleanRef.includes('REG') ? cleanRef : '');

      const exactRollNumber = String(
        fetchedData.rollNumber ||
        (fetchedData as any)["Roll Number"] ||
        (fetchedData as any).roll ||
        result.rollNumber ||
        result.member?.rollNumber ||
        result.data?.rollNumber ||
        rollNum ||
        cleanRef
      ).trim();

      // 1. After member verification, log required details
      console.log("=== Verified Member Details ===");
      console.log("referenceOrRollNumber:", cleanRef);
      console.log("rollNumber:", exactRollNumber);
      console.log("phoneFirst4:", cleanPhone);
      console.log("dateOfBirth:", dateOfBirth);

      setVerifiedRegistrationRef(regRef);
      setVerifiedRollNumber(exactRollNumber);
      setVerifiedPhoneFirst4(cleanPhone);
      setVerifiedRecord(fetchedData);
      setVerifiedCredentials({
        referenceOrRollNumber: referenceOrRollNumber.trim(),
        phoneFirst4: phoneFirst4.trim(),
        dateOfBirth: dateOfBirth,
      });

      // Pre-populate plan and fee amount
      const planName = fetchedData.selectedPlan || (plans[0]?.name || 'Standard Plan (3 Months)');
      setSelectedPlan(planName);

      const matchedPlan = plans.find((p) => p.name === planName);
      const defaultPlanPrice = matchedPlan ? matchedPlan.price : (Number(fetchedData.registrationFee) || 2499);

      const dataAny = fetchedData as any;

      const parsedRegularPlanAmount = Number(
        dataAny.regularPlanAmount ??
        dataAny.planAmount ??
        dataAny["Regular Plan Amount"] ??
        dataAny["Plan Amount"] ??
        (result as any).regularPlanAmount ??
        (result as any).planAmount ??
        defaultPlanPrice ??
        0
      );

      const regularAmount = parsedRegularPlanAmount > 0 ? parsedRegularPlanAmount : defaultPlanPrice;
      setRegularPlanAmount(regularAmount);

      const parsedFinalFeeAmount = Number(
        dataAny.finalFeeAmount ??
        dataAny.offerAmount ??
        dataAny["Final Fee Amount"] ??
        dataAny["Offer Amount"] ??
        (result as any).finalFeeAmount ??
        (result as any).offerAmount ??
        0
      );

      const parsedFeePriceType =
        dataAny.feePriceType ||
        dataAny["Fee Price Type"] ||
        (result as any).feePriceType ||
        "Regular Price";

      const parsedOfferNote =
        dataAny.offerNote ||
        dataAny["Offer Note"] ||
        dataAny.priceNote ||
        dataAny["Price Note"] ||
        (result as any).offerNote ||
        "";

      const parsedOfferValidUntil =
        dataAny.offerValidUntil ||
        dataAny["Offer Valid Until"] ||
        (result as any).offerValidUntil ||
        "";

      let isOfferExpired = false;
      if (parsedOfferValidUntil) {
        const todayStr = new Date().toISOString().split('T')[0];
        if (todayStr > parsedOfferValidUntil) {
          isOfferExpired = true;
        }
      }

      const isOfferActive = !isOfferExpired && parsedFinalFeeAmount > 0 && parsedFeePriceType !== "Regular Price";

      setIsSpecialOfferActive(isOfferActive);
      setFeePriceType(isOfferActive ? parsedFeePriceType : "Regular Price");
      setFinalFeeAmount(parsedFinalFeeAmount);
      setOfferNote(parsedOfferNote);
      setOfferValidUntil(parsedOfferValidUntil);

      const resolvedFee = isOfferActive ? parsedFinalFeeAmount : regularAmount;
      setCurrentFeeAmount(resolvedFee);
      setPaymentType('Full Payment');
      setAmountPaidInput('');

      // Reset payment fields
      setPaymentMethod('UPI');
      setUpiTransactionId('');
      setPaymentScreenshot('');
      setScreenshotFileName('');
      setNotes('');
      setPaymentDate(new Date().toISOString().split('T')[0]);

      // Fetch fee history using verified roll number and registration reference number
      await fetchFeeHistory(exactRollNumber, regRef);
    } catch (err: any) {
      console.warn("GAS verification offline or error, trying local storage fallback:", err);
      try {
        const localRes = getMemberForFee({
          referenceOrRollNumber: cleanRef,
          phoneFirst4: cleanPhone,
          dateOfBirth: dateOfBirth,
        });
        if (localRes.code === 'REGISTRATION_PENDING') {
          setIsVerifying(false);
          setVerifiedRecord(null);
          setStatusAlert({
            code: 'REGISTRATION_PENDING',
            type: 'pending',
            message: localRes.message || 'Your registration has been received and is currently awaiting admin approval. The fee-payment facility will become available after your registration is approved. Please visit AB Gym reception or contact our team if you need assistance.',
          });
          return;
        }
        if (localRes.code === 'REGISTRATION_REJECTED') {
          setIsVerifying(false);
          setVerifiedRecord(null);
          setStatusAlert({
            code: 'REGISTRATION_REJECTED',
            type: 'rejected',
            message: localRes.message || 'Your registration has been rejected. Please contact AB Gym before making a payment.',
          });
          return;
        }
        if (!localRes.success || localRes.code === 'DETAILS_MISMATCH' || !localRes.data) {
          setIsVerifying(false);
          setVerifiedRecord(null);
          setStatusAlert({
            code: 'DETAILS_MISMATCH',
            type: 'mismatch',
            message: localRes.message || 'Member details do not match. Please check the entered information.',
          });
          return;
        }

        const fetchedData = localRes.data;
        setIsVerifying(false);
        setVerifySuccessMsg('Your registration has been approved.');
        setStatusAlert(null);
        setVerifiedRecord(fetchedData);
        setVerifiedRegistrationRef(fetchedData.registrationRef || cleanRef);
        setVerifiedRollNumber(fetchedData.rollNumber || cleanRef);
        setVerifiedPhoneFirst4(cleanPhone);
        setVerifiedCredentials({
          referenceOrRollNumber: referenceOrRollNumber.trim(),
          phoneFirst4: phoneFirst4.trim(),
          dateOfBirth: dateOfBirth,
        });

        const planName = fetchedData.selectedPlan || (plans[0]?.name || 'Standard Plan (3 Months)');
        setSelectedPlan(planName);
        const matchedPlan = plans.find((p) => p.name === planName);
        const resolvedFee = matchedPlan ? matchedPlan.price : (Number(fetchedData.registrationFee) || 2499);
        setCurrentFeeAmount(resolvedFee);
        setPaymentType('Full Payment');
        setAmountPaidInput('');
        setPaymentMethod('UPI');
        setPaymentDate(new Date().toISOString().split('T')[0]);

        await fetchFeeHistory(fetchedData.rollNumber || cleanRef, fetchedData.registrationRef || cleanRef);
      } catch (fallbackErr) {
        setIsVerifying(false);
        handleResetVerification();
        setSearchError(
          err instanceof Error ? err.message : String(err)
        );
      }
    }
  };

  // Handle plan change to update amount
  const handlePlanChange = (planName: string) => {
    setSelectedPlan(planName);
    const matchedPlan = plans.find((p) => p.name === planName);
    if (matchedPlan) {
      setCurrentFeeAmount(matchedPlan.price);
    }
  };

  // Screenshot File Reader
  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit. Please upload a smaller image.');
        return;
      }
      setScreenshotFileName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        setPaymentScreenshot(String(reader.result));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(AB_FITNESS_UPI_ID);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleUpiDeepLinkClick = () => {
    setUpiClicked(true);
    setNoUpiAppFound(false);

    const feeReferenceNumber = verifiedRegistrationRef || verifiedRollNumber || referenceOrRollNumber.trim();
    const payableAmount = amountPaidNum > 0 ? amountPaidNum : totalPayable;

    const upiDeepLink =
      `upi://pay?pa=${encodeURIComponent(AB_FITNESS_UPI_ID)}` +
      `&pn=${encodeURIComponent("AB Fitness")}` +
      `&am=${encodeURIComponent(Number(payableAmount).toFixed(2))}` +
      `&cu=INR` +
      `&tn=${encodeURIComponent(feeReferenceNumber || "AB Fitness Fee")}`;

    const startTime = Date.now();

    try {
      window.location.href = upiDeepLink;
    } catch (err) {
      setNoUpiAppFound(true);
    }

    setTimeout(() => {
      if (!document.hidden && Date.now() - startTime < 3000) {
        setNoUpiAppFound(true);
      }
    }, 1800);
  };

  // Form Calculations & Validation
  const feeAmount = Number(currentFeeAmount || 0);
  const discount = Number(discountAmount || 0);
  const totalPayable = Math.max(
    0,
    feeAmount + previousBalance - discount
  );

  // Effective Amount Paid & Remaining Balance
  const rawPaid = amountPaidInput === '' ? totalPayable : Number(amountPaidInput || 0);
  const amountPaidNum = paymentType === 'Full Payment' ? totalPayable : rawPaid;
  const remainingBalance = paymentType === 'Full Payment'
    ? 0
    : Math.max(0, totalPayable - amountPaidNum);

  // Submit Disable Condition
  const isSubmitDisabled =
    !verifiedRecord ||
    (!verifiedRegistrationRef && !verifiedRollNumber) ||
    phoneFirst4.length !== 4 ||
    isSubmitting ||
    !selectedPlan ||
    feeAmount <= 0 ||
    amountPaidNum <= 0 ||
    amountPaidNum > totalPayable ||
    !paymentDate ||
    (paymentMethod === 'UPI' &&
      (!upiTransactionId.trim() || !paymentScreenshot));

  // Submit Fee Handler
  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation checks
    if (!verifiedRegistrationRef && !verifiedRollNumber) {
      const errMsg = 'Please verify your Registration Reference Number or Roll Number again.';
      setSubmitError(errMsg);
      alert(errMsg);
      return;
    }

    if (!phoneFirst4 || phoneFirst4.length !== 4) {
      const errMsg = 'Enter 4 digits of the registered mobile number.';
      setSubmitError(errMsg);
      return;
    }

    if (amountPaidNum <= 0) {
      const errMsg = 'Amount Paid must be greater than 0.';
      setSubmitError(errMsg);
      alert(errMsg);
      return;
    }

    if (amountPaidNum > totalPayable) {
      const errMsg = 'Amount Paid cannot exceed Total Payable.';
      setSubmitError(errMsg);
      alert(errMsg);
      return;
    }

    if (isSubmitDisabled || isSubmitting || !verifiedRecord) return;

    setIsSubmitting(true);
    setSubmitError('');

    // Construct Payload ONLY from verified state
    const feeMonth = new Date(paymentDate).toLocaleString('default', { month: 'long', year: 'numeric' });
    const paymentScreenshotUrl = paymentScreenshot;
    const verifiedMember = {
      ...verifiedRecord,
      rollNumber: verifiedRollNumber || verifiedRecord?.rollNumber || '',
    };

    const payload = {
      action: "submitFeePayment",
      referenceOrRollNumber:
        verifiedCredentials.referenceOrRollNumber || verifiedRegistrationRef || referenceOrRollNumber.trim(),
      rollNumber:
        verifiedMember.rollNumber,
      memberName:
        verifiedRecord?.fullName || verifiedRecord?.memberName || verifiedRecord?.name || '',
      fullName:
        verifiedRecord?.fullName || verifiedRecord?.memberName || verifiedRecord?.name || '',
      phone:
        verifiedRecord?.phone || verifiedRecord?.phoneNumber || verifiedCredentials.phoneFirst4 || verifiedPhoneFirst4 || phoneFirst4.trim() || '',
      email:
        verifiedRecord?.email || verifiedRecord?.emailAddress || '',
      selectedPlan:
        selectedPlan || verifiedRecord?.membershipPlan || verifiedRecord?.selectedPlan || '',
      phoneFirst4:
        verifiedCredentials.phoneFirst4 || verifiedPhoneFirst4 || phoneFirst4.trim(),
      dateOfBirth:
        verifiedCredentials.dateOfBirth || dateOfBirth,
      feeMonth,
      feeAmount: Number(feeAmount),
      discount: Number(discount),
      totalPaid: Number(amountPaidNum),
      paymentType,
      paymentMethod,
      upiTransactionId:
        paymentMethod === "UPI"
          ? upiTransactionId.trim()
          : "",
      paymentDate,
      paymentScreenshot:
        paymentScreenshotUrl || "",
      entrySource:
        "AB Fitness Public Pay Fee"
    };

    console.log(
      "FINAL FEE PAYMENT PAYLOAD:",
      payload
    );

    if (!payload.dateOfBirth) {
      setError("Date of birth is required.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      const rawText = await response.text();
      let result: any;
      try {
        result = JSON.parse(rawText);
      } catch {
        throw new Error('Invalid server response: ' + rawText);
      }
      console.log("AB GYM BACKEND:", result);
      console.log('Fee backend response:', result);

      if (result && result.success === true) {
        const feeRefNum = String(result.data?.feeReferenceNumber || result.feeReferenceNumber || 'ABG-FEE-' + Date.now().toString().slice(-6));
        const memberEmail = payload.email || verifiedRecord?.email || '';
        const memberFullName = payload.fullName || verifiedRecord?.fullName || '';

        // Dispatch automatic fee payment confirmation email trigger
        if (memberEmail) {
          apiService.sendConfirmationEmail({
            type: 'fee_payment',
            email: memberEmail,
            fullName: memberFullName,
            feeRef: feeRefNum,
            amountPaid: amountPaidNum,
            paymentMethod: paymentMethod,
            rollNumber: String(result.data?.rollNumber || result.rollNumber || verifiedRollNumber || ''),
          }).catch(() => {});
        }

        onNavigate('/fee-payment-success', {
          feeReferenceNumber: String(result.data?.feeReferenceNumber || result.feeReferenceNumber || 'ABG-FEE-' + Date.now().toString().slice(-6)),
          registrationReferenceNumber: String(
            result.data?.registrationReferenceNumber || result.registrationReferenceNumber || verifiedRegistrationRef || verifiedCredentials.referenceOrRollNumber
          ),
          rollNumber: String(result.data?.rollNumber || result.rollNumber || verifiedRollNumber || ''),
          memberName: String(
            result.data?.memberName || result.memberName || verifiedRecord.fullName || ''
          ),
          amountSubmitted: String(
            result.data?.amountSubmitted ?? result.amountSubmitted ?? amountPaidNum
          ),
          paymentStatus: String(
            result.data?.paymentStatus || result.paymentStatus || 'Pending Verification'
          ),
          currentFee: String(feeAmount),
          previousBalance: String(previousBalance),
          discount: String(discount),
          totalPayable: String(totalPayable),
          amountPaid: String(amountPaidNum),
          remainingBalance: String(remainingBalance),
        });

        // After successful fee submission only:
        handleResetVerification();
        setDateOfBirth('');
        setPhoneFirst4('');
        setReferenceOrRollNumber('');
        setSelectedPlan('');
        setCurrentFeeAmount(0);
        setPreviousBalance(0);
        setDiscountAmount(0);
        setAmountPaidInput('');
        setUpiTransactionId('');
        setPaymentScreenshot('');
        setScreenshotFileName('');
        setNotes('');
      } else {
        setIsSubmitting(false);
        const backendMsg = result?.message || '';
        let errMsg = backendMsg;

        if (
          backendMsg.includes('Registration Reference Number or Roll Number is required') ||
          backendMsg.includes('identifier')
        ) {
          errMsg = 'Verification data was lost. Please verify the member again.';
        }

        setSubmitError(errMsg || 'Payment submission failed. Please try again.');
        alert(errMsg || 'Payment submission failed. Please try again.');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      const errMsg =
        err?.message || 'Network error submitting fee payment to Google Sheets.';
      setSubmitError(errMsg);
      alert(errMsg);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-[#f5f5f4] space-y-10">
      {/* Header */}
      <RevealOnScroll direction="up" delayMs={50}>
        <div className="text-center space-y-3 max-w-xl mx-auto">
          <span className="text-[10px] font-bold text-[#2563EB] uppercase tracking-[0.35em] italic flex items-center justify-center gap-2 font-mono">
            <CreditCard className="w-3.5 h-3.5" />
            ATHLETE FEE PORTAL
          </span>
          <h1 className="text-4xl sm:text-6xl font-black text-white font-display uppercase tracking-tighter">
            PAY <span className="text-[#2563EB]">MEMBERSHIP FEE</span>
          </h1>
          <p className="text-xs text-zinc-400 uppercase tracking-wider font-mono">
            Enter your AB Gym Registration Reference Number or Roll Number, registered mobile first 4 digits, and date of birth to verify and submit fee.
          </p>
        </div>
      </RevealOnScroll>

      {/* Member Verification Card */}
      <div className="bg-[#0A0A0A] border border-white/10 p-6 sm:p-8 rounded-3xl space-y-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-white uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
            <span>MEMBER IDENTITY VERIFICATION</span>
          </div>

          {verifiedRecord && (
            <button
              type="button"
              onClick={handleResetVerification}
              className="text-[10px] font-mono text-zinc-400 hover:text-red-400 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <UserX className="w-3.5 h-3.5" />
              <span>Change Member</span>
            </button>
          )}
        </div>

        <form onSubmit={handleVerifyAndFetchRecord} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Field 1: Registration Ref or Roll Number */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-zinc-300 uppercase tracking-[0.2em] font-mono">
                REGISTRATION REF / ROLL NUMBER <span className="text-[#2563EB]">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={referenceOrRollNumber}
                  onChange={(e) => handleRefInputChange(e.target.value)}
                  placeholder="e.g. ABG-REG-260724-0001 or ABG-26-2431"
                  className="w-full bg-black border border-white/20 focus:border-[#2563EB] text-white px-4 py-3.5 rounded-xl text-xs font-mono outline-none transition-colors"
                  required
                />
                <Search className="w-4 h-4 text-white/40 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* Field 2: Registered Mobile First 4 Digits */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-zinc-300 uppercase tracking-[0.2em] font-mono">
                REGISTERED MOBILE FIRST 4 DIGITS <span className="text-[#2563EB]">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={phoneFirst4}
                  onChange={(e) => handlePhoneFirst4Change(e.target.value)}
                  placeholder="Enter first 4 digits"
                  className="w-full bg-black border border-white/20 focus:border-[#2563EB] text-white px-4 py-3.5 rounded-xl text-xs font-mono outline-none transition-colors"
                  required
                />
                <Lock className="w-4 h-4 text-white/40 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* Field 3: Date of Birth */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-zinc-300 uppercase tracking-[0.2em] font-mono">
                DATE OF BIRTH <span className="text-[#2563EB]">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => handleDobChange(e.target.value)}
                  className="w-full bg-black border border-white/20 focus:border-[#2563EB] text-white px-4 py-3.5 rounded-xl text-xs font-mono outline-none transition-colors"
                  required
                />
                <Calendar className="w-4 h-4 text-white/40 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Submit Button for Verification */}
          <button
            type="submit"
            disabled={isVerifyDisabled}
            className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-[0.25em] transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isVerifyDisabled
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5'
                : 'bg-[#2563EB] hover:bg-white text-white hover:text-black shadow-lg shadow-[#2563EB]/20'
            }`}
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>VERIFYING & FETCHING RECORD...</span>
              </>
            ) : (
              <span>VERIFY & FETCH MEMBER RECORD</span>
            )}
          </button>
        </form>

        {/* Status Alerts (Pending / Rejected / Mismatch) */}
        {statusAlert && statusAlert.type === 'pending' && (
          <div className="bg-amber-950/40 border border-amber-500/50 p-6 sm:p-8 rounded-2xl space-y-4 text-amber-200 shadow-xl shadow-amber-950/20">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-xl shrink-0 mt-0.5">
                <Clock className="w-6 h-6 text-amber-400" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h4 className="text-sm font-bold font-mono uppercase tracking-wider text-amber-300">
                  REGISTRATION PENDING APPROVAL
                </h4>
                <p className="text-xs sm:text-sm font-sans leading-relaxed text-amber-100">
                  {statusAlert.message || "Your registration has been received and is currently awaiting admin approval. The fee-payment facility will become available after your registration is approved. Please visit AB Gym reception or contact our team if you need assistance."}
                </p>
              </div>
            </div>

            <div className="bg-black/50 border border-amber-500/30 p-3 rounded-xl flex items-center gap-2.5 text-xs text-amber-300 font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Please do not make any payment until your registration is approved.</span>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              {settings.phone && (
                <a
                  href={`tel:${settings.phone}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <Phone className="w-4 h-4" />
                  <span>Contact AB Gym</span>
                </a>
              )}
              <a
                href={settings.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${settings.gymName || 'AB Gym'}, ${settings.address || 'Sector 18, New Delhi'}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <MapPin className="w-4 h-4 text-amber-400" />
                <span>Get Directions / Visit Gym</span>
              </a>
            </div>
          </div>
        )}

        {statusAlert && statusAlert.type === 'rejected' && (
          <div className="bg-red-950/40 border border-red-500/50 p-4 rounded-xl flex items-start gap-3 text-red-200">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-red-300">REGISTRATION REJECTED</h4>
              <p className="text-xs font-sans mt-1 leading-relaxed">{statusAlert.message}</p>
            </div>
          </div>
        )}

        {statusAlert && statusAlert.type === 'mismatch' && (
          <div className="bg-red-950/40 border border-red-500/50 p-4 rounded-xl flex items-start gap-3 text-red-200">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-red-300">MEMBER DETAILS MISMATCH</h4>
              <p className="text-xs font-sans mt-1 leading-relaxed">{statusAlert.message}</p>
            </div>
          </div>
        )}

        {/* Generic Error Alert */}
        {searchError && (
          <div className="bg-red-950/40 border border-red-500/40 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300 font-medium leading-relaxed font-sans">{searchError}</p>
          </div>
        )}

        {/* Skeleton Screen during Verification */}
        {isVerifying && !verifiedRecord && (
          <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl p-6 sm:p-10 space-y-6 animate-pulse shadow-2xl">
            <div className="bg-black p-6 rounded-2xl border border-white/10 space-y-4">
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <div className="space-y-2">
                  <div className="h-6 w-48 bg-zinc-800 rounded-lg" />
                  <div className="h-4 w-32 bg-zinc-800/60 rounded-md" />
                </div>
                <div className="h-6 w-24 bg-zinc-800 rounded-full" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="h-16 bg-zinc-900 rounded-xl" />
                <div className="h-16 bg-zinc-900 rounded-xl" />
                <div className="h-16 bg-zinc-900 rounded-xl" />
                <div className="h-16 bg-zinc-900 rounded-xl" />
              </div>
            </div>
            <div className="flex items-center justify-center py-6 gap-3 text-blue-400 font-mono text-xs font-bold">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>FETCHING MEMBER RECORD & CALCULATING OUTSTANDING DUES...</span>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {verifySuccessMsg && verifiedRecord && (
          <div className="bg-emerald-950/40 border border-emerald-500/40 p-4 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-300 font-bold tracking-wide font-sans">{verifySuccessMsg}</p>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
              Verified: {verifiedRegistrationRef || verifiedRollNumber}
            </span>
          </div>
        )}
      </div>

      {/* Verified Member Details & Fee Submission Form */}
      {verifiedRecord && (
        <div className={`bg-[#0A0A0A] border border-white/10 rounded-3xl p-6 sm:p-10 space-y-8 shadow-2xl relative ${isSubmitting ? 'pointer-events-none opacity-90' : ''}`}>
          {/* Section A: Verified Member Profile Banner */}
          <div className="bg-black p-6 rounded-2xl border border-white/20 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-bold text-[#2563EB] uppercase tracking-[0.3em] italic block font-mono">
                  VERIFIED MEMBER SUMMARY
                </span>
                <h2 className="text-2xl font-black text-white font-mono tracking-wider mt-0.5">
                  {verifiedRecord.fullName}
                </h2>
              </div>
              <span
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] font-mono ${
                  verifiedRecord.registrationStatus === 'Approved'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-600/40'
                    : 'bg-amber-950 text-amber-400 border border-amber-600/40'
                }`}
              >
                STATUS: {verifiedRecord.registrationStatus || 'Verified'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
              <div>
                <span className="text-zinc-500 block text-[11px]">Registration Ref:</span>
                <span className="font-bold text-white">{verifiedRegistrationRef || 'N/A'}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[11px]">Assigned Roll Number:</span>
                <span className="font-bold text-red-400">
                  {verifiedRollNumber ? verifiedRollNumber : 'Unassigned (First Payment)'}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[11px]">Registered Mobile:</span>
                <span className="font-bold text-zinc-300">
                  {verifiedPhoneFirst4 || phoneFirst4 ? `${verifiedPhoneFirst4 || phoneFirst4}******` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[11px]">Current Selected Plan:</span>
                <span className="font-semibold text-blue-400">{verifiedRecord.selectedPlan || 'Standard Plan'}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[11px]">Previous Balance:</span>
                <span className="font-bold text-amber-400">₹{previousBalance}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[11px]">Last Payment Status:</span>
                <span className="font-bold text-zinc-300">{verifiedRecord.paymentStatus || 'None'}</span>
              </div>
            </div>
          </div>

          {/* Section B: Membership Status Banner */}
          <div className="bg-black p-6 rounded-2xl border border-white/20 space-y-3">
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
              <h3 className="text-sm font-black text-white font-mono uppercase tracking-wider">
                MEMBERSHIP STATUS
              </h3>
            </div>
            {(() => {
              const expDate = verifiedRecord.expiryDate || verifiedRecord.membershipExpiryDate || verifiedRecord.membershipValidUntil || '';
              const startDt = verifiedRecord.joiningDate || verifiedRecord.membershipStartDate || verifiedRecord.createdDate || verifiedRecord.dateOfJoining || '';
              const isApproved = verifiedRecord.registrationStatus === 'Approved';
              const isExpired = expDate ? new Date(expDate).getTime() < new Date().setHours(0,0,0,0) : false;

              if (isExpired) {
                return (
                  <div className="p-4 bg-amber-950/60 border border-amber-500/50 rounded-xl flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                    <div className="font-mono text-xs">
                      <p className="font-bold text-amber-300 uppercase">Membership Expired</p>
                      <p className="text-amber-200/80 text-[11px] mt-0.5">
                        Your membership valid period ended on <span className="font-bold">{expDate}</span>. Please submit a fee payment below to renew.
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                <div className="p-4 bg-emerald-950/60 border border-emerald-500/50 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 font-mono text-xs">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <p className="font-bold text-emerald-300 uppercase">
                        Membership Active ({verifiedRecord.registrationStatus || 'Approved'})
                      </p>
                      <p className="text-emerald-200/80 text-[11px] mt-0.5">
                        {expDate ? `Valid until ${expDate}` : 'Membership period active'} {startDt ? `• Joined: ${startDt}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Active
                  </span>
                </div>
              );
            })()}
          </div>



          {/* Section E: New Membership Fee Form or Blocking Banner */}
          {isLoadingFeeHistory || !historyLoaded ? (
            <div id="pay-fee-form-section" className="p-8 bg-zinc-950/80 border border-zinc-800/80 rounded-2xl space-y-4 shadow-xl text-center">
              <div className="flex items-center justify-center gap-3 text-blue-400 font-mono text-xs font-bold uppercase tracking-wider">
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                <span>Checking your previous fee payments...</span>
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                Please wait while we verify your past fee records and payment status.
              </p>
            </div>
          ) : !canSubmitNewPayment ? (
            <div id="pay-fee-form-section" className="space-y-4">
              {blockingReason === 'PAYMENT_ALREADY_SUCCESSFUL' && (
                <div className="p-6 bg-gradient-to-r from-emerald-950/90 via-zinc-900 to-emerald-950/90 border-2 border-emerald-500/60 rounded-2xl space-y-3 shadow-2xl">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-black text-white font-mono uppercase tracking-tight">
                        Membership Fee Already Paid
                      </h3>
                      <p className="text-sm text-emerald-200/90 font-medium leading-relaxed font-sans">
                        Your membership fee has already been received successfully. No additional payment is required for this period.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {blockingReason === 'PAYMENT_PENDING_VERIFICATION' && (
                <div className="p-6 bg-gradient-to-r from-amber-950/90 via-zinc-900 to-amber-950/90 border-2 border-amber-500/60 rounded-2xl space-y-3 shadow-2xl">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400">
                      <Clock className="w-7 h-7 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-black text-white font-mono uppercase tracking-tight">
                        Payment Already Submitted
                      </h3>
                      <p className="text-sm text-amber-200/90 font-medium leading-relaxed font-sans">
                        Your membership fee payment is awaiting admin verification. Please do not make another payment.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {(blockingReason === 'HISTORY_UNAVAILABLE' || historyError) && (
                <div className="p-6 bg-gradient-to-r from-red-950/90 via-zinc-900 to-red-950/90 border-2 border-red-500/60 rounded-2xl space-y-3 shadow-2xl">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0 text-red-400">
                      <AlertTriangle className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-black text-white font-mono uppercase tracking-tight">
                        Fee History Could Not Be Checked
                      </h3>
                      <p className="text-sm text-red-200/90 font-medium leading-relaxed font-sans">
                        Fee history could not be checked. Please try again before making another payment.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchFeeHistory(verifiedRollNumber, verifiedRegistrationRef)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs font-mono uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center gap-2 mt-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Retry Verification</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <form id="pay-fee-form-section" onSubmit={handlePaySubmit} className="space-y-6">
              {/* Visual Loading Indicator during Fee Submission */}
              {isSubmitting && (
                <div className="p-4 bg-gradient-to-r from-blue-950/90 via-zinc-900 to-blue-950/90 border border-blue-500/50 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 shadow-xl shadow-blue-500/20">
                  <div className="flex items-center gap-3.5">
                    <div className="relative flex items-center justify-center shrink-0">
                      <div className="w-10 h-10 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
                      <Loader2 className="w-5 h-5 text-blue-400 animate-spin absolute" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                        <span>Processing Fee Payment...</span>
                        <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                      </h4>
                      <p className="text-xs text-zinc-300 font-sans mt-0.5">
                        Submitting payment details & recording transaction. Please wait.
                      </p>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 px-3 py-1.5 rounded-lg">
                    <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                    <span className="text-[11px] font-mono text-blue-400 font-bold uppercase">API Request Active</span>
                  </div>
                </div>
              )}

              {/* Previous Payment Rejected Warning */}
              {blockingReason === 'PREVIOUS_PAYMENT_REJECTED' && (
                <div className="p-4 bg-red-950/60 border border-red-500/50 rounded-2xl flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                  <p className="text-xs text-red-200 font-bold font-sans">
                    Your previous payment was rejected. Please review the details and submit again.
                  </p>
                </div>
              )}

              <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider border-b border-zinc-800 pb-2 text-blue-400 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                <span>PAY NEW MEMBERSHIP FEE</span>
              </h3>

            {/* Special Offer Badge / Notice */}
            {isSpecialOfferActive && (
              <div className="bg-emerald-950/40 border border-emerald-500/40 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Special Offer Applied
                    </span>
                    <span className="text-xs font-bold text-emerald-300 font-mono">
                      {feePriceType}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 font-sans mt-1">
                    Your applicable membership fee has been set by AB Fitness.
                  </p>
                  {offerNote && (
                    <p className="text-xs text-amber-300/90 italic font-sans bg-black/40 p-2 rounded-lg border border-white/5">
                      Offer Note: {offerNote}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Selected Plan */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-300 font-mono uppercase">
                  Membership Plan <span className="text-blue-500">*</span>
                </label>
                <select
                  value={selectedPlan}
                  onChange={(e) => handlePlanChange(e.target.value)}
                  className="w-full bg-black border border-zinc-800 text-white px-3.5 py-3 rounded-xl text-xs font-semibold outline-none focus:border-blue-500 transition-colors"
                  required
                >
                  {plans.map((p) => (
                    <option key={p.id || p.name} value={p.name}>
                      {p.name} — ₹{p.price} ({p.durationMonths} Month{p.durationMonths > 1 ? 's' : ''})
                    </option>
                  ))}
                </select>
              </div>

              {/* Regular Plan Amount (Read-Only) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-300 font-mono uppercase">
                  Regular Plan Amount (₹) <span className="text-xs text-zinc-500 font-normal">(Read-Only)</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={regularPlanAmount || ''}
                    readOnly
                    disabled
                    className="w-full bg-zinc-900/80 border border-zinc-800 text-zinc-300 font-mono font-bold px-3.5 py-3 rounded-xl text-sm outline-none cursor-not-allowed"
                  />
                  <IndianRupee className="w-4 h-4 text-zinc-500 absolute right-3.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              {/* Fee Price Type (Read-Only) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-300 font-mono uppercase">
                  Fee Price Type <span className="text-xs text-zinc-500 font-normal">(Read-Only)</span>
                </label>
                <input
                  type="text"
                  value={feePriceType || 'Regular Price'}
                  readOnly
                  disabled
                  className="w-full bg-zinc-900/80 border border-zinc-800 text-emerald-400 font-mono font-bold px-3.5 py-3 rounded-xl text-sm outline-none cursor-not-allowed"
                />
              </div>

              {/* Current Fee Amount (Read-Only) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-300 font-mono uppercase">
                  Current Fee Amount (₹) <span className="text-xs text-zinc-500 font-normal">(Read-Only)</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={currentFeeAmount || ''}
                    readOnly
                    disabled
                    className="w-full bg-zinc-900/80 border border-zinc-800 text-emerald-400 font-mono font-bold px-3.5 py-3 rounded-xl text-sm outline-none cursor-not-allowed"
                  />
                  <IndianRupee className="w-4 h-4 text-emerald-500/60 absolute right-3.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              {/* Payment Date */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-300 font-mono uppercase">
                  Payment Date <span className="text-blue-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full bg-black border border-zinc-800 text-white px-3.5 py-3 rounded-xl text-xs font-mono outline-none focus:border-blue-500 transition-colors"
                    required
                  />
                  <Calendar className="w-4 h-4 text-zinc-500 absolute right-3.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-300 font-mono uppercase">
                  Payment Method <span className="text-blue-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['UPI', 'Cash'] as PaymentMethod[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`py-3 rounded-xl text-xs font-bold font-mono border transition-all cursor-pointer ${
                        paymentMethod === m
                          ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                          : 'bg-black text-zinc-400 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {m === 'UPI' ? 'Online / UPI' : 'Cash Payment'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Breakdown & Partial Payment Section */}
            <div className="bg-[#0A0A0C] border border-zinc-800 p-5 rounded-2xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
                <h4 className="text-xs font-bold text-zinc-300 font-mono uppercase tracking-wider flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-400" />
                  <span>PAYMENT CALCULATION & TYPE</span>
                </h4>

                {/* Payment Type Toggle */}
                <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800 font-mono text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentType('Full Payment');
                      setAmountPaidInput(String(totalPayable));
                    }}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      paymentType === 'Full Payment'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Full Payment
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentType('Partial Payment');
                      if (Number(amountPaidInput) >= totalPayable || !amountPaidInput) {
                        setAmountPaidInput('');
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      paymentType === 'Partial Payment'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Partial Payment
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-mono">
                {/* Previous Balance (Read-Only) */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase">
                    Previous Balance (₹) <span className="text-xs text-zinc-500 font-normal">(Read-Only)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={previousBalance}
                      readOnly
                      disabled
                      className="w-full bg-zinc-900/80 border border-zinc-800 text-amber-400 font-bold px-3.5 py-3 rounded-xl text-sm outline-none cursor-not-allowed"
                    />
                    <IndianRupee className="w-4 h-4 text-amber-500/60 absolute right-3.5 top-3.5 pointer-events-none" />
                  </div>
                  <span className="text-[10px] text-zinc-500 block">
                    Carry-forward balance
                  </span>
                </div>

                {/* Discount (Input) */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-zinc-300 uppercase">
                    Discount (₹) <span className="text-zinc-500 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      value={discountAmount || ''}
                      onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full bg-black border border-zinc-800 text-white font-mono font-bold px-3.5 py-3 rounded-xl text-sm outline-none focus:border-blue-500 transition-colors"
                    />
                    <IndianRupee className="w-4 h-4 text-zinc-500 absolute right-3.5 top-3.5 pointer-events-none" />
                  </div>
                  <span className="text-[10px] text-zinc-500 block">
                    Applicable fee discount
                  </span>
                </div>

                {/* Total Payable Amount (Read-Only) */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase">
                    Total Payable Amount (₹) <span className="text-xs text-zinc-500 font-normal">(Read-Only)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={totalPayable}
                      readOnly
                      disabled
                      className="w-full bg-zinc-900/80 border border-zinc-800 text-emerald-400 font-bold px-3.5 py-3 rounded-xl text-sm outline-none cursor-not-allowed"
                    />
                    <IndianRupee className="w-4 h-4 text-emerald-500/60 absolute right-3.5 top-3.5 pointer-events-none" />
                  </div>
                  <span className="text-[10px] text-zinc-500 block">
                    Fee (₹{feeAmount}) + Prev (₹{previousBalance}) - Disc (₹{discount})
                  </span>
                </div>

                {/* Amount Paid (Input) */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-zinc-300 uppercase">
                    Amount Paid (₹) <span className="text-blue-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={totalPayable}
                      value={paymentType === 'Full Payment' && amountPaidInput === '' ? totalPayable : amountPaidInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAmountPaidInput(val);
                        const num = Number(val) || 0;
                        if (val !== '' && num >= totalPayable) {
                          setPaymentType('Full Payment');
                        } else if (val !== '' && num < totalPayable) {
                          setPaymentType('Partial Payment');
                        }
                      }}
                      placeholder={`e.g. ${totalPayable}`}
                      className={`w-full bg-black border text-white font-mono font-bold px-3.5 py-3 rounded-xl text-sm outline-none transition-colors ${
                        amountPaidNum <= 0 || amountPaidNum > totalPayable
                          ? 'border-red-500/80 focus:border-red-500'
                          : 'border-zinc-800 focus:border-blue-500'
                      }`}
                      required
                    />
                    <IndianRupee className="w-4 h-4 text-zinc-500 absolute right-3.5 top-3.5 pointer-events-none" />
                  </div>
                  {amountPaidNum > totalPayable && (
                    <span className="text-[10px] text-red-400 block font-sans font-semibold">
                      Must not exceed ₹{totalPayable}
                    </span>
                  )}
                  {amountPaidNum <= 0 && (
                    <span className="text-[10px] text-red-400 block font-sans font-semibold">
                      Must be greater than 0
                    </span>
                  )}
                </div>

                {/* Remaining Balance (Read-Only) */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase">
                    Remaining Balance (₹) <span className="text-xs text-zinc-500 font-normal">(Read-Only)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={remainingBalance}
                      readOnly
                      disabled
                      className={`w-full bg-zinc-900/80 border font-bold px-3.5 py-3 rounded-xl text-sm outline-none cursor-not-allowed ${
                        remainingBalance > 0
                          ? 'border-amber-500/40 text-amber-400'
                          : 'border-zinc-800 text-zinc-400'
                      }`}
                    />
                    <IndianRupee className="w-4 h-4 text-zinc-500 absolute right-3.5 top-3.5 pointer-events-none" />
                  </div>
                  {remainingBalance > 0 ? (
                    <span className="text-[10px] text-amber-400 block font-sans font-semibold">
                      Partial payment. ₹{remainingBalance} balance due.
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-400 block font-sans font-semibold">
                      Full payment cleared.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* UPI Payment Fields Box */}
            {paymentMethod === 'UPI' && (
              <div className="bg-black p-5 sm:p-6 rounded-2xl border border-zinc-800 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  <div className="space-y-4">
                    {/* UPI Transaction ID */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-zinc-300 font-mono uppercase">
                        UPI Transaction Reference ID <span className="text-blue-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={upiTransactionId}
                        onChange={(e) => setUpiTransactionId(e.target.value)}
                        placeholder="e.g. 123456789012"
                        className="w-full bg-zinc-950 border border-zinc-800 text-white px-3.5 py-3 rounded-xl text-xs font-mono outline-none focus:border-blue-500"
                        required
                      />
                    </div>

                    {/* Payment Screenshot File Input */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-zinc-300 font-mono uppercase">
                        Payment Receipt Screenshot <span className="text-blue-500">*</span>
                      </label>
                      <div className="relative">
                        <label className="flex items-center justify-center gap-2 w-full bg-zinc-950 border border-dashed border-zinc-700 hover:border-blue-500 p-3.5 rounded-xl text-xs text-zinc-300 font-mono cursor-pointer transition-colors">
                          <Upload className="w-4 h-4 text-blue-400 shrink-0" />
                          <span className="truncate">
                            {screenshotFileName ? screenshotFileName : 'Click to Upload Screenshot Image'}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleScreenshotChange}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {paymentScreenshot && (
                        <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-mono font-semibold pt-1">
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>Screenshot uploaded & converted successfully!</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* UPI Deep Link & QR Code Payment Box */}
                  {(() => {
                    const feeReferenceNumber = verifiedRegistrationRef || verifiedRollNumber || referenceOrRollNumber.trim();
                    const payableAmount = amountPaidNum > 0 ? amountPaidNum : totalPayable;
                    const upiUri =
                      `upi://pay?pa=${encodeURIComponent(AB_FITNESS_UPI_ID)}` +
                      `&pn=${encodeURIComponent("AB Fitness")}` +
                      `&am=${encodeURIComponent(Number(payableAmount).toFixed(2))}` +
                      `&cu=INR` +
                      `&tn=${encodeURIComponent(feeReferenceNumber || "AB Fitness Fee")}`;
                    const generatedQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(upiUri)}`;
                    const displayQrUrl = settings.qrCodeUrl?.trim() ? settings.qrCodeUrl : generatedQrUrl;

                    return (
                      <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-800 text-center space-y-4 shadow-xl">
                        {/* Header */}
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center justify-center gap-2">
                            <Smartphone className="w-4 h-4 text-emerald-400" />
                            <span>Direct UPI App Payment</span>
                          </p>
                          <p className="text-[11px] text-zinc-400 font-mono">
                            Instant payment via installed UPI app on mobile
                          </p>
                        </div>

                        {/* Premium Button (Requirement 1, 2, 3, 4, 5, 11) */}
                        <button
                          type="button"
                          onClick={handleUpiDeepLinkClick}
                          className="w-full py-3.5 px-5 rounded-xl font-black text-sm uppercase tracking-wide bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white shadow-lg shadow-emerald-900/30 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2.5 border border-emerald-400/30 min-h-[48px]"
                        >
                          <span className="text-base">🚀</span>
                          <span>Pay with UPI App</span>
                        </button>

                        {/* Supported UPI App Icons (Requirement 10) */}
                        <div className="pt-1">
                          <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider mb-2">Supported Apps:</p>
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            {/* Google Pay */}
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800 text-[11px] font-bold text-zinc-200">
                              <svg className="w-3.5 h-3.5 text-blue-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12.24 10.285V13.4h6.887c-.28 1.83-2.073 5.37-6.887 5.37-4.143 0-7.522-3.435-7.522-7.67s3.379-7.67 7.522-7.67c2.357 0 3.935.998 4.838 1.858l2.42-2.33C17.935 1.55 15.342.5 12.24.5 5.823.5.6 5.65.6 12s5.223 11.5 11.64 11.5c6.702 0 11.15-4.71 11.15-11.35 0-.763-.082-1.344-.18-1.865H12.24z"/>
                              </svg>
                              <span>Google Pay</span>
                            </div>

                            {/* PhonePe */}
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900/90 border border-purple-900/50 text-[11px] font-bold text-purple-300">
                              <span className="w-3.5 h-3.5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[9px] font-extrabold shrink-0">पे</span>
                              <span>PhonePe</span>
                            </div>

                            {/* Paytm */}
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900/90 border border-sky-900/50 text-[11px] font-bold text-sky-300">
                              <span className="px-1 py-0.5 rounded bg-sky-600 text-white text-[8px] font-black leading-none shrink-0">PAYTM</span>
                              <span>Paytm</span>
                            </div>

                            {/* BHIM */}
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900/90 border border-amber-900/50 text-[11px] font-bold text-amber-300">
                              <span className="px-1 py-0.5 rounded bg-gradient-to-r from-orange-500 to-green-600 text-white text-[8px] font-black leading-none shrink-0">BHIM</span>
                              <span>BHIM</span>
                            </div>
                          </div>
                        </div>

                        {/* Return to page instructions after clicking button (Requirement 12) */}
                        {upiClicked && (
                          <div className="p-3 bg-blue-950/40 border border-blue-500/40 rounded-xl text-left flex items-start gap-2.5 animate-in fade-in duration-200">
                            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-200 font-mono leading-relaxed font-medium">
                              After completing payment, return to this page and submit your UPI Transaction ID and payment screenshot.
                            </p>
                          </div>
                        )}

                        {/* Error notice if no UPI app found (Requirement 6) */}
                        {noUpiAppFound && (
                          <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl text-left flex items-start gap-2.5 animate-in fade-in duration-200">
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-200 font-mono leading-relaxed font-semibold">
                              No UPI application found. Please scan the QR code.
                            </p>
                          </div>
                        )}

                        {/* Divider */}
                        <div className="relative my-3 flex items-center justify-center">
                          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800"></div></div>
                          <span className="relative bg-zinc-950 px-3 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">OR SCAN QR CODE BELOW</span>
                        </div>

                        {/* Alternative QR Code payment method (Requirement 7) */}
                        <div className="space-y-3">
                          <p className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                            Scan Gym QR Code for Payment {payableAmount > 0 ? `(₹${payableAmount})` : ''}:
                          </p>
                          <div className="w-44 h-44 mx-auto bg-white p-3 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden border-2 border-emerald-500/30">
                            <img
                              src={displayQrUrl}
                              alt="UPI Payment QR Code"
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-center gap-2 bg-zinc-900/80 px-3 py-2 rounded-xl border border-zinc-800 text-xs font-mono">
                            <span className="font-bold text-emerald-400">{AB_FITNESS_UPI_ID}</span>
                            <button
                                type="button"
                                onClick={handleCopyUPI}
                                className="text-blue-400 hover:text-white cursor-pointer p-1"
                                title="Copy UPI ID"
                              >
                                {copiedUpi ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Notes / Remarks Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-300 font-mono uppercase">
                Notes / Remarks <span className="text-zinc-500 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Paid membership renewal for next quarter"
                className="w-full bg-black border border-zinc-800 text-white px-3.5 py-3 rounded-xl text-xs outline-none focus:border-blue-500 font-sans"
              />
            </div>

            {/* Error Message Display */}
            {submitError && (
              <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-300 font-medium leading-relaxed font-sans">{submitError}</p>
              </div>
            )}

            {/* Submit Fee Button */}
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-[0.25em] transition-all flex items-center justify-center gap-2 cursor-pointer font-mono ${
                isSubmitDisabled
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-xl shadow-blue-600/30'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Fee...</span>
                </>
              ) : (
                <span>Submit Fee Payment &rarr;</span>
              )}
            </button>
          </form>
        )}
        </div>
      )}

      {/* Fee Payment Receipt Modal */}
      {selectedReceiptRecord && (
        <ReceiptModal
          record={selectedReceiptRecord}
          onClose={() => setSelectedReceiptRecord(null)}
        />
      )}
    </div>
  );
};
