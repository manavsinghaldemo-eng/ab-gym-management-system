import { FeePaymentRecord, DashboardStats } from '../types';

/**
 * Safely parse any amount representation into a clean number.
 * Handles: 1000, "1000", "₹1,000", "1,000", "₹ 1,500.50", "Rs. 2000", "2499 INR", etc.
 */
export function parseAmount(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : val;
  }
  const str = String(val).trim();
  if (!str || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined' || str.toLowerCase() === 'nan') {
    return 0;
  }

  // If already a clean numeric string
  const directNum = Number(str);
  if (!isNaN(directNum)) {
    return directNum;
  }

  // Remove currency signs, commas, and currency labels
  const cleaned = str
    .replace(/[₹$,]/g, '')
    .replace(/\b(rs\.?|inr|usd|inr\.)\b/gi, '')
    .trim();

  // If now parseable as a number
  const cleanedNum = Number(cleaned);
  if (!isNaN(cleanedNum)) {
    return cleanedNum;
  }

  // Extract first numeric group (e.g. from "Standard Plan - ₹2499 (3 Months)" -> 2499)
  const match = cleaned.match(/[-+]?[0-9]+(?:\.[0-9]+)?/);
  if (match) {
    const num = parseFloat(match[0]);
    return isNaN(num) ? 0 : num;
  }

  return 0;
}

/**
 * Extract standard or specified price from a membership plan name string.
 * Examples:
 * - "Standard Plan - ₹2499 (3 Months)" -> 2499
 * - "Basic Plan - ₹999 (1 Month)" -> 999
 * - "Premium Plan - ₹4499 (6 Months)" -> 4499
 * - "Standard Plan" -> 2499
 */
export function extractPlanPrice(planName: any): number {
  if (!planName) return 0;
  const str = String(planName).trim();
  if (!str) return 0;

  // 1. Look for explicit currency amounts in the plan title
  const matchWithCurrency = str.match(/(?:₹|Rs\.?|INR|\$)\s*([0-9,]+)/i);
  if (matchWithCurrency && matchWithCurrency[1]) {
    const p = parseAmount(matchWithCurrency[1]);
    if (p > 0) return p;
  }

  // 2. Look for standalone 3-6 digit numbers in the string
  const matchDigits = str.match(/\b([0-9]{3,6})\b/);
  if (matchDigits && matchDigits[1]) {
    const p = parseAmount(matchDigits[1]);
    if (p > 0) return p;
  }

  // 3. Fallback to standard AB Gym plan catalog catalog
  const lower = str.toLowerCase();
  if (lower.includes('annual') || lower.includes('12 month') || lower.includes('1 year') || lower.includes('vip')) return 7999;
  if (lower.includes('premium') || lower.includes('6 month') || lower.includes('half')) return 4499;
  if (lower.includes('standard') || lower.includes('3 month') || lower.includes('quarterly')) return 2499;
  if (lower.includes('basic') || lower.includes('1 month') || lower.includes('gold') || lower.includes('monthly')) return 999;

  return 0;
}

/**
 * Resolves the first positive parsed amount from a list of candidate fields.
 * If none is > 0, returns the first non-null/non-undefined parsed number (e.g. 0).
 */
export function resolveFirstValidAmount(...candidates: any[]): number {
  for (const c of candidates) {
    if (c !== null && c !== undefined && c !== '') {
      const parsed = parseAmount(c);
      if (parsed > 0) {
        return parsed;
      }
    }
  }
  for (const c of candidates) {
    if (c !== null && c !== undefined && c !== '') {
      return parseAmount(c);
    }
  }
  return 0;
}

export interface FeeFinancials {
  planName: string;
  planPrice: number;
  amountPaid: number;
  currentFeeAmount: number;
  previousBalance: number;
  totalPayableAmount: number;
  remainingBalance: number;
  paymentType: 'Full Payment' | 'Partial Payment';
  status: string;
  isApproved: boolean;
}

/**
 * Complete, authoritative financial resolver for any fee payment record.
 * Guarantees that:
 * 1. Amount Paid maps the true transaction amount from all possible sheet columns.
 * 2. Remaining Due = Required Amount - Total Successfully Paid.
 * 3. If Required is ₹2499 and ₹2490 is paid, Remaining Due is ₹9.
 * 4. If ₹2499 is paid, Remaining Due is ₹0.
 * 5. Amount Paid never erroneously collapses to ₹0 if a valid fee amount exists.
 */
export function resolveFeePaymentFinancials(record: any): FeeFinancials {
  if (!record) {
    return {
      planName: 'Basic Plan',
      planPrice: 999,
      amountPaid: 0,
      currentFeeAmount: 0,
      previousBalance: 0,
      totalPayableAmount: 0,
      remainingBalance: 0,
      paymentType: 'Full Payment',
      status: 'Pending Verification',
      isApproved: false,
    };
  }

  const planName = String(
    record['Selected Plan'] ??
    record['selectedPlan'] ??
    record['Plan'] ??
    record['plan'] ??
    record['Plan Name'] ??
    record['planName'] ??
    record['membershipPlan'] ??
    'Basic Plan'
  );

  const planPrice = extractPlanPrice(planName);

  const rawStatus = String(
    record['Payment Status'] ??
    record['paymentStatus'] ??
    record['status'] ??
    record['adminVerificationStatus'] ??
    'Pending Verification'
  ).trim();

  const isApproved = isPaymentApproved(rawStatus);

  // 1. Resolve Amount Paid from all possible column names / keys
  let amountPaid = resolveFirstValidAmount(
    record['Amount Paid'],
    record['amountPaid'],
    record['Paid Amount'],
    record['paidAmount'],
    record['Payment Amount'],
    record['paymentAmount'],
    record['Total Paid'],
    record['totalPaid'],
    record['Current Fee Amount'],
    record['currentFeeAmount'],
    record['Fee Amount'],
    record['feeAmount'],
    record['Final Fee Amount'],
    record['finalFeeAmount'],
    record['Amount'],
    record['amount'],
    record['finalPayableAmount'],
    record['Final Payable Amount'],
    record['Total Payable Amount'],
    record['totalPayableAmount']
  );

  // 2. Resolve Current Fee Amount
  let currentFeeAmount = resolveFirstValidAmount(
    record['Current Fee Amount'],
    record['currentFeeAmount'],
    record['Fee Amount'],
    record['feeAmount'],
    record['Final Fee Amount'],
    record['finalFeeAmount'],
    record['regularPlanAmount'],
    record['Regular Plan Amount'],
    amountPaid > 0 ? amountPaid : 0,
    planPrice
  );

  // If amountPaid is still 0 and plan contains a price (e.g. ₹2499) and status is Successful/Approved
  if (amountPaid === 0 && planPrice > 0 && isApproved) {
    // Only if none of the candidates was explicitly specified as 0
    const hasExplicitZero = [
      record['Amount Paid'],
      record['amountPaid'],
      record['Paid Amount'],
      record['Current Fee Amount'],
      record['currentFeeAmount']
    ].some(v => v === 0 || v === '0');

    if (!hasExplicitZero) {
      amountPaid = planPrice;
      if (currentFeeAmount === 0) currentFeeAmount = planPrice;
    }
  }

  // 3. Resolve Previous Balance
  const previousBalance = resolveFirstValidAmount(
    record['Previous Balance'],
    record['previousBalance'],
    record['Prev Balance'],
    record['prevBalance'],
    record['outstandingBalance'],
    record['Outstanding Balance'],
    0
  );

  // 4. Resolve Total Payable Amount (Required Amount)
  let totalPayableAmount = resolveFirstValidAmount(
    record['Total Payable Amount'],
    record['totalPayableAmount'],
    record['Payable Amount'],
    record['payableAmount'],
    record['Final Payable Amount'],
    record['finalPayableAmount']
  );

  if (totalPayableAmount === 0) {
    const baseFee = currentFeeAmount > 0 ? currentFeeAmount : (planPrice > 0 ? planPrice : amountPaid);
    totalPayableAmount = Math.max(0, baseFee + previousBalance);
  }

  // If totalPayableAmount is still less than amountPaid, payable is at least amountPaid
  if (totalPayableAmount < amountPaid) {
    totalPayableAmount = amountPaid;
  }

  // 5. Resolve Remaining Due / Remaining Balance
  // Formula: Remaining Due = Required Amount - Total Successfully Paid
  let remainingBalance = 0;
  const explicitRemBal = resolveFirstValidAmount(
    record['Remaining Balance'],
    record['remainingBalance'],
    record['Remaining Due'],
    record['remainingDue'],
    record['Due Amount'],
    record['dueAmount']
  );

  if (explicitRemBal > 0) {
    remainingBalance = explicitRemBal;
  } else if (totalPayableAmount > amountPaid) {
    remainingBalance = Math.max(0, totalPayableAmount - amountPaid);
  } else {
    remainingBalance = 0;
  }

  const paymentType: 'Full Payment' | 'Partial Payment' =
    record['Payment Type'] ??
    record['paymentType'] ??
    (remainingBalance > 0 ? 'Partial Payment' : 'Full Payment');

  return {
    planName,
    planPrice,
    amountPaid,
    currentFeeAmount,
    previousBalance,
    totalPayableAmount,
    remainingBalance,
    paymentType,
    status: rawStatus,
    isApproved,
  };
}

/**
 * Robust date parser converting diverse date formats to standard 'YYYY-MM-DD'.
 * Handles:
 * - 17 Aug 2026, 17-Aug-2026, 17 August 2026
 * - Aug 17, 2026, August 17 2026
 * - 17/08/2026, 17-08-2026, 17.08.2026
 * - 2026-08-17, 2026/08/17
 * - 2026-08-17T14:30:00.000Z (ISO)
 * - Date objects & timestamp numbers
 */
export function parseDateToYMD(input: any): string | null {
  if (!input) return null;
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return null;
    const year = input.getFullYear();
    const month = String(input.getMonth() + 1).padStart(2, '0');
    const day = String(input.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const str = String(input).trim();
  if (!str || str.toLowerCase() === 'none' || str.toLowerCase() === 'unassigned' || str.toLowerCase() === 'null') {
    return null;
  }

  // 1. Direct ISO YYYY-MM-DD check (e.g. 2026-08-17 or 2026-08-17T...)
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 2. DD/MM/YYYY or DD-MM-YYYY (e.g. 17/08/2026, 17-08-2026, 17.08.2026)
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  // 3. Month name matching (e.g. "17 Aug 2026", "17-Aug-2026", "Aug 17, 2026", "17 August 2026")
  const monthMap: Record<string, string> = {
    jan: '01', january: '01',
    feb: '02', february: '02',
    mar: '03', march: '03',
    apr: '04', april: '04',
    may: '05',
    jun: '06', june: '06',
    jul: '07', july: '07',
    aug: '08', august: '08',
    sep: '09', sept: '09', september: '09',
    oct: '10', october: '10',
    nov: '11', november: '11',
    dec: '12', december: '12'
  };

  const dayMonthYear = str.match(/^(\d{1,2})[\s\-_/]+([a-zA-Z]+)[\s\-_/,]+(\d{4})/);
  if (dayMonthYear) {
    const d = dayMonthYear[1].padStart(2, '0');
    const mName = dayMonthYear[2].toLowerCase();
    const y = dayMonthYear[3];
    const m = monthMap[mName] || monthMap[mName.slice(0, 3)];
    if (m) return `${y}-${m}-${d}`;
  }

  const monthDayYear = str.match(/^([a-zA-Z]+)[\s\-_/]+(\d{1,2})[\s\-_/,]+(\d{4})/);
  if (monthDayYear) {
    const mName = monthDayYear[1].toLowerCase();
    const d = monthDayYear[2].padStart(2, '0');
    const y = monthDayYear[3];
    const m = monthMap[mName] || monthMap[mName.slice(0, 3)];
    if (m) return `${y}-${m}-${d}`;
  }

  // 4. Try JS standard Date parsing
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return null;
}

/**
 * Check if given date matches Today in user's local timezone or UTC.
 */
export function isDateToday(dateInput: any): boolean {
  if (!dateInput) return false;
  const parsedYMD = parseDateToYMD(dateInput);
  if (!parsedYMD) return false;

  const now = new Date();
  const todayLocalYMD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (parsedYMD === todayLocalYMD) return true;

  const todayUtcYMD = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
  if (parsedYMD === todayUtcYMD) return true;

  return false;
}

/**
 * Check if given date matches Current Month in user's local timezone or UTC.
 */
export function isDateThisMonth(dateInput: any): boolean {
  if (!dateInput) return false;
  const parsedYMD = parseDateToYMD(dateInput);
  if (!parsedYMD) return false;

  const now = new Date();
  const localYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const parsedYM = parsedYMD.slice(0, 7);
  if (parsedYM === localYM) return true;

  const utcYM = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  if (parsedYM === utcYM) return true;

  return false;
}

/**
 * Check if payment status represents an approved / verified / successful payment.
 */
export function isPaymentApproved(status?: unknown): boolean {
  if (!status) return false;
  const s = String(status).trim().toLowerCase();
  return (
    s === 'approved' ||
    s === 'successful' ||
    s === 'active' ||
    s === 'verified' ||
    s === 'paid' ||
    s === 'completed' ||
    s === 'success' ||
    s === 'verified & approved'
  );
}

/**
 * Check if payment status represents a pending payment awaiting verification.
 */
export function isPaymentPending(status?: unknown): boolean {
  if (!status) return false;
  const s = String(status).trim().toLowerCase();
  return s.includes('pending') || s === 'submitted' || s === 'under review';
}

/**
 * Check if payment status represents a rejected or failed payment.
 */
export function isPaymentRejected(status?: unknown): boolean {
  if (!status) return false;
  const s = String(status).trim().toLowerCase();
  return s === 'rejected' || s === 'failed' || s === 'cancelled' || s === 'declined' || s === 'inactive';
}

/**
 * Comprehensive fee collection & stats calculation with required debug logging.
 */
export function calculatePaymentStats(
  feePayments: FeePaymentRecord[] = [],
  extraStats?: Partial<DashboardStats>
): DashboardStats {
  const now = new Date();
  const todayYMD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  let todayCollection = 0;
  let monthlyCollection = 0;
  let totalCollections = 0;
  let successfulFeePayments = 0;
  let pendingFeePayments = 0;
  let rejectedFeePayments = 0;
  let totalPreviousBalance = 0;

  const paymentDates: Array<{ raw: any; parsed: string | null; isToday: boolean; isMonth: boolean }> = [];
  const paymentStatuses: Array<{ rawStatus: string; isApproved: boolean }> = [];
  const paymentAmounts: number[] = [];
  const todayMatchingPayments: Array<{ ref: string; member: string; amount: number; rawDate: any; status: string }> = [];

  feePayments.forEach((f) => {
    const rawStatus = f.paymentStatus || f.status || f.adminVerificationStatus || '';
    const isApproved = isPaymentApproved(rawStatus);
    const isPending = isPaymentPending(rawStatus);
    const isRejected = isPaymentRejected(rawStatus);

    const rawAmt = f.amountPaid ?? f.currentFeeAmount ?? f.totalPayableAmount ?? f.amount ?? 0;
    const amount = parseAmount(rawAmt);
    paymentAmounts.push(amount);

    const prevBal = parseAmount(f.previousBalance ?? 0);
    totalPreviousBalance += prevBal;

    const rawDate = f.paymentDate || f.timestamp || f.createdDate || f.createdAt || '';
    const parsedYMD = parseDateToYMD(rawDate);
    const isToday = isDateToday(rawDate);
    const isThisMonth = isDateThisMonth(rawDate);

    paymentDates.push({ raw: rawDate, parsed: parsedYMD, isToday, isMonth: isThisMonth });
    paymentStatuses.push({ rawStatus: String(rawStatus), isApproved });

    if (isPending) {
      pendingFeePayments++;
    }

    if (isRejected) {
      rejectedFeePayments++;
    }

    if (isApproved) {
      successfulFeePayments++;
      totalCollections += amount;

      if (isThisMonth) {
        monthlyCollection += amount;
      }

      if (isToday) {
        todayCollection += amount;
        todayMatchingPayments.push({
          ref: f.feeReferenceNumber || f.id || '',
          member: f.memberName || f.fullName || 'Member',
          amount,
          rawDate,
          status: String(rawStatus),
        });
      }
    }
  });

  // REQUIRED DEBUG LOGGING
  console.log('=== [DEBUG] DASHBOARD PAYMENT FLOW TRACE ===');
  console.log("Total payment records:", feePayments.length);
  console.log("Today's date:", todayYMD);
  console.log("Payment dates:", paymentDates);
  console.log("Payment statuses:", paymentStatuses);
  console.log("Payment amounts:", paymentAmounts);
  console.log("Today's matching payments:", todayMatchingPayments);
  console.log("Today's calculated collection:", todayCollection);
  console.log("Monthly calculated collection:", monthlyCollection);
  console.log("Total calculated collection:", totalCollections);
  console.log('============================================');

  return {
    ...extraStats,
    todayCollection,
    monthlyCollection,
    totalCollections,
    successfulFeePayments,
    pendingFeePayments,
    rejectedFeePayments,
    totalPreviousBalance,
  };
}

/**
 * Universal timestamp parser for local, ISO, and Google Apps Script date formats.
 * Safely parses "DD/MM/YYYY HH:mm:ss", "YYYY-MM-DD", ISO strings, and Date instances into numeric milliseconds.
 */
export function parseTimestampMs(dateVal: any): number {
  if (!dateVal) return 0;
  if (typeof dateVal === 'number') return isNaN(dateVal) ? 0 : dateVal;
  if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? 0 : dateVal.getTime();
  
  const str = String(dateVal).trim();
  if (!str || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') return 0;
  
  // Try standard ISO / direct parsing
  const parsed = Date.parse(str);
  if (!isNaN(parsed)) return parsed;
  
  // Handle DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY with optional time
  const ddmmyyyyMatch = str.match(/^(\d{1,2})[/\-. ](\d{1,2})[/\-. ](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (ddmmyyyyMatch) {
    const day = parseInt(ddmmyyyyMatch[1], 10);
    const month = parseInt(ddmmyyyyMatch[2], 10) - 1;
    const year = parseInt(ddmmyyyyMatch[3], 10);
    const hours = ddmmyyyyMatch[4] ? parseInt(ddmmyyyyMatch[4], 10) : 0;
    const minutes = ddmmyyyyMatch[5] ? parseInt(ddmmyyyyMatch[5], 10) : 0;
    const seconds = ddmmyyyyMatch[6] ? parseInt(ddmmyyyyMatch[6], 10) : 0;
    const d = new Date(year, month, day, hours, minutes, seconds);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }
  
  // Handle YYYY/MM/DD or YYYY-MM-DD
  const yyyymmddMatch = str.match(/^(\d{4})[/\-. ](\d{1,2})[/\-. ](\d{1,2})/);
  if (yyyymmddMatch) {
    const year = parseInt(yyyymmddMatch[1], 10);
    const month = parseInt(yyyymmddMatch[2], 10) - 1;
    const day = parseInt(yyyymmddMatch[3], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }
  
  return 0;
}
