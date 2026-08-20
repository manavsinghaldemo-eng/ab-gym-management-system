import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { FeePaymentRecord, Member, GymSettings, RegistrationRequest } from '../types';
import { AB_GYM_LOGO_BASE64 } from './logoBase64';
import { resolveFeePaymentFinancials, parseAmount } from './paymentUtils';

// Helper to format currency
export function formatINR(val: number | string | undefined): string {
  const num = typeof val === 'number' ? val : Number(val || 0);
  return '₹' + (isNaN(num) ? 0 : num).toLocaleString('en-IN');
}

export { parseAmount };

/**
 * 1. ADVANCED PAYMENT RECEIPT PDF
 * High-contrast, luxury branded official payment receipt with QR verification,
 * itemized financials, digital signature/stamp, and gym terms.
 */
export async function downloadFeeReceiptPDF(record: FeePaymentRecord, settings: GymSettings) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const fin = resolveFeePaymentFinancials(record);

  const primaryDark = [15, 23, 42]; // #0F172A (Deep Slate)
  const brandEmerald = [16, 185, 129]; // #10B981
  const brandBlue = [37, 99, 235]; // #2563EB
  const textMuted = [100, 116, 139]; // #64748B
  const textDark = [30, 41, 59]; // #1E293B
  const bgLight = [248, 250, 252]; // #F8FAFC
  const borderColor = [226, 232, 240]; // #E2E8F0

  const gymName = (settings.gymName || 'MS FITNESS').toUpperCase();
  const gymTagline = settings.tagline || 'Stronger Body, Stronger You';
  const gymPhone = settings.phone || '+91 85878 82431';
  const gymEmail = settings.email || 'support@msfitness.com';
  const gymAddress = settings.address || 'MS Fitness Complex, New Delhi - 110075';
  const feeRef = record.feeReferenceNumber || record.id || 'N/A';
  const rollNumber = record.rollNumber || 'Unassigned (Pending Verification)';
  const regRef = record.registrationReferenceNumber || record.registrationRef || 'N/A';
  const memberName = (record.memberName || record.fullName || 'Valued Member').trim();
  const memberPhone = record.phoneNumber || record.memberPhone || record.phone || 'N/A';
  const memberEmail = record.emailAddress || record.memberEmail || record.email || 'N/A';
  const payDate = record.paymentDate || record.timestamp || new Date().toISOString().split('T')[0];

  // 1. Top Header Banner
  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.rect(0, 0, 210, 46, 'F');

  // Accent Line
  doc.setFillColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  doc.rect(0, 44.5, 210, 1.5, 'F');

  // Official Logo
  try {
    doc.addImage(AB_GYM_LOGO_BASE64, 'JPEG', 14, 7, 30, 30);
  } catch (err) {
    console.warn('Could not render logo in Receipt PDF:', err);
    doc.setFillColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
    doc.roundedRect(14, 7, 30, 30, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('MS', 29, 26, { align: 'center' });
  }

  // Header Gym Info
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(gymName, 48, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  doc.text(gymTagline, 48, 24);

  doc.setTextColor(203, 213, 225); // Slate 300
  doc.setFontSize(8);
  doc.text(`Phone: ${gymPhone}  |  Email: ${gymEmail}`, 48, 30);
  doc.text(gymAddress, 48, 36);

  // Right Receipt Header Box
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('PAYMENT RECEIPT', 196, 18, { align: 'right' });

  doc.setFillColor(30, 41, 59);
  doc.roundedRect(124, 23, 72, 16, 2, 2, 'F');

  doc.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`RECEIPT REF: ${feeRef}`, 192, 29, { align: 'right' });

  doc.setTextColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`DATE: ${payDate}`, 192, 35, { align: 'right' });

  // 2. Member & Membership Information Cards (2 Columns)
  let y = 52;
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(14, y, 88, 44, 3, 3, 'FD');
  doc.roundedRect(108, y, 88, 44, 3, 3, 'FD');

  // Left Card: Member Details
  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.roundedRect(14, y, 88, 8, 3, 3, 'F');
  doc.rect(14, y + 4, 88, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('MEMBER DETAILS', 18, y + 5.5);

  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Full Name:', 18, y + 14);
  doc.text('Roll / Member ID:', 18, y + 20);
  doc.text('Registration Ref:', 18, y + 26);
  doc.text('Contact Phone:', 18, y + 32);
  doc.text('Email Address:', 18, y + 38);

  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(memberName, 46, y + 14);
  doc.setTextColor(brandBlue[0], brandBlue[1], brandBlue[2]);
  doc.text(rollNumber, 46, y + 20);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'normal');
  doc.text(regRef, 46, y + 26);
  doc.text(memberPhone, 46, y + 32);
  doc.text(memberEmail, 46, y + 38);

  // Right Card: Subscription Status
  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.roundedRect(108, y, 88, 8, 3, 3, 'F');
  doc.rect(108, y + 4, 88, 4, 'F');
  doc.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('SUBSCRIPTION & VALIDITY', 112, y + 5.5);

  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Membership Plan:', 112, y + 14);
  doc.text('Validity Expiry:', 112, y + 20);
  doc.text('Payment Method:', 112, y + 26);
  doc.text('Payment Mode / Type:', 112, y + 32);
  doc.text('Verification Status:', 112, y + 38);

  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(fin.planName || record.planName || 'Standard Plan', 146, y + 14);
  doc.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  doc.text(record.newExpiryDate || 'Active Subscription', 146, y + 20);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'normal');
  doc.text(record.paymentMethod || 'UPI Payment', 146, y + 26);
  doc.text(fin.paymentType || 'Full Payment', 146, y + 32);

  const isApproved = fin.isApproved;
  doc.setTextColor(isApproved ? 16 : 217, isApproved ? 185 : 119, isApproved ? 129 : 6);
  doc.setFont('helvetica', 'bold');
  doc.text(fin.status || 'VERIFIED', 146, y + 38);

  // 3. Itemized Financial Breakdown Table
  y = 102;
  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.rect(14, y, 182, 8.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('ITEM DESCRIPTION', 18, y + 5.5);
  doc.text('PAYMENT DETAILS', 95, y + 5.5);
  doc.text('AMOUNT (INR)', 190, y + 5.5, { align: 'right' });

  y += 8.5;
  // Row 1: Plan Fee Item
  doc.setFillColor(255, 255, 255);
  doc.rect(14, y, 182, 12, 'F');
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.line(14, y + 12, 196, y + 12);

  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(`Gym Membership Fee — ${fin.planName || record.planName || 'Plan'}`, 18, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Period Renewal • Ref: ${feeRef}`, 18, y + 9.5);

  const txnId = record.upiTransactionId || record.upiTxnId || record.transactionId;
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`${record.paymentMethod || 'UPI'}${txnId ? ' (Txn: ' + txnId + ')' : ''}`, 95, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(formatINR(fin.currentFeeAmount), 190, y + 7, { align: 'right' });

  // 4. Financial Calculations Box & QR Code
  y += 16;
  const summaryBoxY = y;

  // Financial Summary Rows (Right Side)
  const rightColX = 120;
  const rightValX = 190;
  let subY = y;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Plan Fee Amount:', rightColX, subY);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(formatINR(fin.currentFeeAmount), rightValX, subY, { align: 'right' });

  if (parseAmount(record.discountAmount || 0) > 0) {
    subY += 5;
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text('Special Concession / Discount:', rightColX, subY);
    doc.setTextColor(16, 185, 129);
    doc.text('- ' + formatINR(record.discountAmount), rightValX, subY, { align: 'right' });
  }

  if (fin.previousBalance > 0) {
    subY += 5;
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text('Outstanding Previous Balance:', rightColX, subY);
    doc.setTextColor(217, 119, 6);
    doc.text('+ ' + formatINR(fin.previousBalance), rightValX, subY, { align: 'right' });
  }

  subY += 5.5;
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.line(rightColX, subY - 1, 196, subY - 1);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('Total Payable Amount:', rightColX, subY + 3);
  doc.text(formatINR(fin.totalPayableAmount), rightValX, subY + 3, { align: 'right' });

  subY += 8;
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.roundedRect(rightColX - 2, subY - 3.5, 78, 9, 2, 2, 'F');
  doc.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text('AMOUNT RECEIVED:', rightColX + 2, subY + 2.5);
  doc.text(formatINR(fin.amountPaid), rightValX - 2, subY + 2.5, { align: 'right' });

  subY += 9;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Net Balance Due:', rightColX, subY);
  const remBal = fin.remainingBalance;
  if (remBal > 0) {
    doc.setTextColor(220, 38, 38);
    doc.setFont('helvetica', 'bold');
    doc.text(formatINR(remBal), rightValX, subY, { align: 'right' });
  } else {
    doc.setTextColor(16, 185, 129);
    doc.setFont('helvetica', 'bold');
    doc.text('₹0 (Paid in Full)', rightValX, subY, { align: 'right' });
  }

  // Left Side: Dynamic QR Code Verification Box
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.roundedRect(14, summaryBoxY - 2, 98, 48, 3, 3, 'FD');

  const qrPayload = JSON.stringify({
    gym: gymName,
    receiptRef: feeRef,
    roll: rollNumber,
    name: memberName,
    plan: fin.planName,
    paid: fin.amountPaid,
    balance: fin.remainingBalance,
    date: payDate,
    status: fin.status,
  });

  try {
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      margin: 1,
      width: 150,
      color: { dark: '#0F172A', light: '#FFFFFF' },
    });
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(18, summaryBoxY + 2, 34, 34, 2, 2, 'F');
    doc.addImage(qrDataUrl, 'PNG', 19, summaryBoxY + 3, 32, 32);
  } catch (qrErr) {
    console.warn('QR Code generation error:', qrErr);
  }

  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('AUTHENTIC RECEIPT VERIFICATION', 56, summaryBoxY + 8);

  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Scan this QR code to verify payment validity,', 56, summaryBoxY + 14);
  doc.text('active subscription term, and access rights', 56, summaryBoxY + 18);
  doc.text('at MS Fitness biometric turnstiles.', 56, summaryBoxY + 22);

  doc.setFillColor(16, 185, 129);
  doc.roundedRect(56, summaryBoxY + 28, 50, 6, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('OFFICIAL VERIFIED RECEIPT', 81, summaryBoxY + 32, { align: 'center' });

  // 5. Terms & Notes Container
  y = 170;
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.roundedRect(14, y, 182, 34, 3, 3, 'FD');

  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('TERMS OF MEMBERSHIP & GYM GUIDELINES:', 18, y + 6);

  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  const termsList = [
    '1. Fees once paid are non-refundable, non-transferable, and non-extendable under any circumstances.',
    '2. Members must present their official Member ID / QR Pass at the reception before every workout session.',
    '3. Clean athletic footwear, gym towels, and appropriate sportswear are strictly mandatory on the workout floor.',
    '4. MS Fitness reserves the right to suspend admission in the event of misconduct, property damage, or unpaid dues.',
    '5. In case of medical conditions or physical injuries, members must consult their physician prior to intensive training.',
  ];
  termsList.forEach((term, idx) => {
    doc.text(term, 18, y + 11 + idx * 4.2);
  });

  // 6. Authorized Signature & Stamp Footer Area
  y = 212;
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.4);
  doc.line(14, y, 196, y);

  // Left Bank & Support Details
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('PAYMENT SUPPORT & HELPLINE', 14, y + 6);

  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.text(`UPI VPA: ${settings.upiId || 'msfitness@upi'} (${settings.upiName || 'MS Fitness'})`, 14, y + 12);
  doc.text(`Front Desk Helpline: ${gymPhone} | Support: ${gymEmail}`, 14, y + 17);
  doc.text(`Operating Hours: Mon-Sat 05:00 AM - 10:00 PM | Sun 06:00 AM - 12:00 PM`, 14, y + 22);

  // Right Stamp / Authorized Signatory Box
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.roundedRect(130, y + 3, 66, 26, 2, 2, 'F');
  doc.setDrawColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(134, y + 5, 58, 14, 1.5, 1.5, 'D');

  doc.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(`${gymName} MANAGEMENT`, 163, y + 10, { align: 'center' });
  doc.setFontSize(6);
  doc.text('DIGITALLY SIGNED & VERIFIED', 163, y + 15, { align: 'center' });

  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('AUTHORIZED SIGNATORY', 163, y + 24, { align: 'center' });

  // 7. Bottom Footnote
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.text(
    `This is a computer-generated official payment receipt generated by MS Fitness Portal. Document ID: ${feeRef}`,
    105,
    285,
    { align: 'center' }
  );

  doc.save(`MS_Fitness_Receipt_${feeRef}.pdf`);
}

/**
 * 2. ADVANCED REGISTRATION / PAYMENT PDF
 * Redesigned as a comprehensive, branded registration and admission acknowledgement document
 * containing member profile, plan duration, KYC, financial breakdown, and verification stamp.
 */
export async function downloadRegistrationReceiptPDF(reg: RegistrationRequest, settings: GymSettings) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryDark = [15, 23, 42]; // #0F172A
  const brandEmerald = [16, 185, 129]; // #10B981
  const brandBlue = [37, 99, 235]; // #2563EB
  const textMuted = [100, 116, 139]; // #64748B
  const textDark = [30, 41, 59]; // #1E293B
  const bgLight = [248, 250, 252]; // #F8FAFC
  const borderColor = [226, 232, 240]; // #E2E8F0

  const gymName = (settings.gymName || 'MS FITNESS').toUpperCase();
  const gymTagline = settings.tagline || 'Stronger Body, Stronger You';
  const gymPhone = settings.phone || '+91 85878 82431';
  const gymEmail = settings.email || 'support@msfitness.com';
  const gymAddress = settings.address || 'MS Fitness Complex, New Delhi - 110075';

  const regRef = reg.registrationRef || reg.registrationReferenceNumber || reg.referenceNumber || 'N/A';
  const rollNumber = reg.rollNumber || 'Unassigned (Pending Admin Approval)';
  const memberName = (reg.fullName || 'Member').trim();
  const memberPhone = reg.phone || reg.phoneNumber || 'N/A';
  const memberEmail = reg.email || reg.emailAddress || 'N/A';
  const dob = reg.dob || reg.dateOfBirth || 'N/A';
  const gender = reg.gender || 'Male';
  const address = reg.address || 'Residential address on record';
  const emergencyContact = reg.emergencyContact || reg.emergencyContactNumber || 'Available on file';
  const fitnessGoal = reg.fitnessGoal || 'General Strength & Conditioning';
  const selectedPlan = reg.selectedPlan || reg.planName || 'Standard Membership';
  const regFee = parseAmount(reg.registrationFee || settings.registrationFeeDefault || 100);
  const paymentMethod = reg.paymentMethod || 'UPI';
  const upiTxnId = reg.upiTxnId || reg.upiTransactionId || reg.transactionId || 'N/A';
  const regStatus = reg.status || reg.registrationStatus || 'Pending Verification';
  const regDate = reg.timestamp || reg.createdAt || new Date().toISOString().split('T')[0];

  // Header Banner
  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.rect(0, 0, 210, 46, 'F');

  // Accent Line
  doc.setFillColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  doc.rect(0, 44.5, 210, 1.5, 'F');

  // Official Logo
  try {
    doc.addImage(AB_GYM_LOGO_BASE64, 'JPEG', 14, 7, 30, 30);
  } catch (err) {
    console.warn('Could not render logo in Registration PDF:', err);
  }

  // Header Gym Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(gymName, 48, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  doc.text(gymTagline, 48, 24);

  doc.setTextColor(203, 213, 225);
  doc.setFontSize(8);
  doc.text(`Phone: ${gymPhone}  |  Email: ${gymEmail}`, 48, 30);
  doc.text(gymAddress, 48, 36);

  // Document Badge on Right
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('REGISTRATION ACKNOWLEDGEMENT', 196, 18, { align: 'right' });

  doc.setFillColor(30, 41, 59);
  doc.roundedRect(114, 23, 82, 16, 2, 2, 'F');

  doc.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`REG REF: ${regRef}`, 192, 29, { align: 'right' });

  doc.setTextColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`APPLICATION DATE: ${regDate}`, 192, 35, { align: 'right' });

  // 1. Athlete Personal & Profile Section
  let y = 52;
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(14, y, 182, 54, 3, 3, 'FD');

  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.roundedRect(14, y, 182, 8, 3, 3, 'F');
  doc.rect(14, y + 4, 182, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('1. ATHLETE PROFILE & PERSONAL INFORMATION', 18, y + 5.5);

  const col1X = 18;
  const val1X = 52;
  const col2X = 108;
  const val2X = 144;

  const row1Y = y + 14;
  const row2Y = y + 21;
  const row3Y = y + 28;
  const row4Y = y + 35;
  const row5Y = y + 42;
  const row6Y = y + 48;

  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');

  doc.text('Full Name:', col1X, row1Y);
  doc.text('Assigned Roll No:', col1X, row2Y);
  doc.text('Contact Mobile:', col1X, row3Y);
  doc.text('Date of Birth:', col1X, row4Y);
  doc.text('Fitness Goal:', col1X, row5Y);

  doc.text('Application Status:', col2X, row1Y);
  doc.text('Registration Ref:', col2X, row2Y);
  doc.text('Email Address:', col2X, row3Y);
  doc.text('Gender:', col2X, row4Y);
  doc.text('Emergency Contact:', col2X, row5Y);

  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(memberName, val1X, row1Y);
  doc.setTextColor(brandBlue[0], brandBlue[1], brandBlue[2]);
  doc.text(rollNumber, val1X, row2Y);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'normal');
  doc.text(memberPhone, val1X, row3Y);
  doc.text(dob, val1X, row4Y);
  doc.text(fitnessGoal, val1X, row5Y);

  const isApproved = regStatus.toLowerCase().includes('approved');
  doc.setTextColor(isApproved ? 16 : 217, isApproved ? 185 : 119, isApproved ? 129 : 6);
  doc.setFont('helvetica', 'bold');
  doc.text(regStatus, val2X, row1Y);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'normal');
  doc.text(regRef, val2X, row2Y);
  doc.text(memberEmail, val2X, row3Y);
  doc.text(gender, val2X, row4Y);
  doc.text(emergencyContact, val2X, row5Y);

  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('Address:', col1X, row6Y);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'normal');
  doc.text(address, val1X, row6Y);

  // 2. Selected Membership Plan & Financial Breakdown
  y = 112;
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.roundedRect(14, y, 182, 42, 3, 3, 'FD');

  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.roundedRect(14, y, 182, 8, 3, 3, 'F');
  doc.rect(14, y + 4, 182, 4, 'F');
  doc.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('2. ENROLLMENT PLAN & REGISTRATION FEE SUMMARY', 18, y + 5.5);

  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');

  doc.text('Selected Plan:', col1X, y + 15);
  doc.text('Joining Date:', col1X, y + 22);
  doc.text('Payment Method:', col1X, y + 29);
  doc.text('Transaction ID:', col1X, y + 36);

  doc.text('Registration Fee:', col2X, y + 15);
  doc.text('Admission Badge:', col2X, y + 22);
  doc.text('Payment Verification:', col2X, y + 29);
  doc.text('Total Reg Fee Paid:', col2X, y + 36);

  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(selectedPlan, val1X, y + 15);
  doc.setFont('helvetica', 'normal');
  doc.text(reg.joiningDate || regDate, val1X, y + 22);
  doc.text(paymentMethod, val1X, y + 29);
  doc.text(upiTxnId, val1X, y + 36);

  doc.text(formatINR(regFee), val2X, y + 15);
  doc.text('Included (RFID / Digital QR Pass)', val2X, y + 22);
  doc.setTextColor(isApproved ? 16 : 217, isApproved ? 185 : 119, isApproved ? 129 : 6);
  doc.setFont('helvetica', 'bold');
  doc.text(isApproved ? 'CONFIRMED / VERIFIED' : 'UNDER VERIFICATION', val2X, y + 29);
  doc.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  doc.text(formatINR(regFee), val2X, y + 36);

  // 3. Dynamic QR Verification & Terms Container
  y = 160;
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.roundedRect(14, y, 182, 50, 3, 3, 'FD');

  const qrPayload = JSON.stringify({
    gym: gymName,
    regRef: regRef,
    roll: rollNumber,
    name: memberName,
    plan: selectedPlan,
    fee: regFee,
    date: regDate,
    status: regStatus,
  });

  try {
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      margin: 1,
      width: 150,
      color: { dark: '#0F172A', light: '#FFFFFF' },
    });
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(18, y + 5, 36, 36, 2, 2, 'F');
    doc.addImage(qrDataUrl, 'PNG', 19, y + 6, 34, 34);
  } catch (qrErr) {
    console.warn('QR Code generation error:', qrErr);
  }

  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('MS FITNESS ADMISSION TERMS & GYM RULES:', 60, y + 9);

  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  const rules = [
    '• This document acknowledges receipt of your membership application and registration fee.',
    '• Member Roll Number will be finalized upon admin document & fee verification.',
    '• Registration fee is non-refundable and covers member file setup and identity credentials.',
    '• Please present this slip along with a valid Government ID at reception for physical onboarding.',
    '• For queries or assistance, contact front desk support at ' + gymPhone + '.',
  ];
  rules.forEach((r, idx) => {
    doc.text(r, 60, y + 15 + idx * 5.2);
  });

  // 4. Authorized Signatory & Official Stamp
  y = 216;
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.line(14, y, 196, y);

  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('MS FITNESS ADMISSION HELPLINE', 14, y + 6);

  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.text(`Helpline: ${gymPhone} | Email: ${gymEmail}`, 14, y + 12);
  doc.text(`Complex: ${gymAddress}`, 14, y + 17);

  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.roundedRect(130, y + 2, 66, 26, 2, 2, 'F');
  doc.setDrawColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(134, y + 4, 58, 14, 1.5, 1.5, 'D');

  doc.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(`${gymName} ADMISSIONS`, 163, y + 9, { align: 'center' });
  doc.setFontSize(6);
  doc.text('OFFICIALLY REGISTERED & STAMPED', 163, y + 14, { align: 'center' });

  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('AUTHORIZED REGISTRAR', 163, y + 23, { align: 'center' });

  doc.save(`MS_Fitness_Registration_${regRef}.pdf`);
}

/**
 * 3. ADVANCED GYM MEMBER ID CARD PDF (CR80 WALLET SIZE)
 * Professional standard landscape wallet card (85.6mm x 54mm) with Front Side (Identity)
 * and Back Side (Attendance QR, Emergency Info, Rules & Regulations).
 */
export async function downloadMemberCardPDF(member: Member, settings: GymSettings) {
  // CR80 standard card dimensions in mm (ISO/IEC 7810 ID-1)
  const cardWidth = 85.6;
  const cardHeight = 54.0;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [cardWidth, cardHeight],
  });

  const primaryDark = [10, 13, 20]; // #0A0D14
  const cardSurface = [18, 22, 32]; // #121620
  const emeraldColor = [16, 185, 129]; // #10B981
  const blueColor = [59, 130, 246]; // #3B82F6
  const textMuted = [148, 163, 184]; // #94A3B8
  const borderColor = [38, 46, 64]; // #262E40

  const gymName = (settings.gymName || 'AB GYM').toUpperCase();
  const gymTagline = (settings.tagline || 'Stronger Body, Stronger You').toUpperCase();
  const gymPhone = settings.phone || '+91 85878 82431';
  const gymEmail = settings.email || 'support@abgym.com';
  const gymAddress = settings.address || 'Civil Lines, Near Stadium, New Delhi';

  const rollNumber = (member.rollNumber || member.rollNo || member.id || 'ABG-26-0000').toUpperCase();
  const memberName = (member.fullName || member.name || 'Valued Member').trim();
  const planName = member.planName || member.selectedPlan || 'Standard Fitness Plan';
  const validFrom = member.joiningDate || member.joinDate || '2026-01-01';
  const validUntil = member.membershipExpiry || member.expiryDate || 'Active';

  // ----------------------------------------------------
  // PAGE 1: FRONT SIDE (MEMBER IDENTITY & PASS)
  // ----------------------------------------------------

  // Card Background
  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.rect(0, 0, cardWidth, cardHeight, 'F');

  // Outer Border Inset
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(1.5, 1.5, cardWidth - 3, cardHeight - 3, 2, 2, 'D');

  // Top Neon Emerald Header Stripe
  doc.setFillColor(emeraldColor[0], emeraldColor[1], emeraldColor[2]);
  doc.roundedRect(1.5, 1.5, cardWidth - 3, 1.8, 1, 1, 'F');

  // Branded Header Logo / Icon
  try {
    doc.addImage(AB_GYM_LOGO_BASE64, 'JPEG', 3.5, 4.5, 7.5, 7.5);
  } catch {
    doc.setFillColor(emeraldColor[0], emeraldColor[1], emeraldColor[2]);
    doc.roundedRect(3.5, 4.5, 7.5, 7.5, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.text('AB', 7.2, 9.5, { align: 'center' });
  }

  // Header Title & Tagline
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(gymName, 13, 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(3.8);
  doc.setTextColor(emeraldColor[0], emeraldColor[1], emeraldColor[2]);
  doc.text(gymTagline, 13, 11);

  // Top Right Badge: MEMBERSHIP CARD
  doc.setFillColor(cardSurface[0], cardSurface[1], cardSurface[2]);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(cardWidth - 31.5, 4.5, 28, 4.5, 1.5, 1.5, 'FD');
  doc.setTextColor(226, 232, 240);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.2);
  doc.text('MEMBERSHIP CARD', cardWidth - 17.5, 7.6, { align: 'center' });

  // Divider Line
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.3);
  doc.line(3.5, 13.5, cardWidth - 3.5, 13.5);

  // Left Column: Member Photo Frame / Monogram
  doc.setFillColor(cardSurface[0], cardSurface[1], cardSurface[2]);
  doc.setDrawColor(emeraldColor[0], emeraldColor[1], emeraldColor[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(3.5, 15.5, 16, 20, 1.5, 1.5, 'FD');

  const initials = memberName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'AB';

  doc.setTextColor(emeraldColor[0], emeraldColor[1], emeraldColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(initials, 11.5, 25.5, { align: 'center' });
  doc.setFontSize(3.2);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('MEMBER PHOTO', 11.5, 31, { align: 'center' });

  // Status Badge directly under photo
  doc.setFillColor(emeraldColor[0], emeraldColor[1], emeraldColor[2]);
  doc.roundedRect(3.5, 37, 16, 4.2, 1, 1, 'F');
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.2);
  doc.text('* ACTIVE', 11.5, 40, { align: 'center' });

  // Center Column: Member Details
  const centerLeftX = 22;

  // Member Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  const truncatedName = memberName.length > 20 ? memberName.substring(0, 19) + '...' : memberName;
  doc.text(truncatedName.toUpperCase(), centerLeftX, 18.5);

  // Roll Number & Member ID Pill
  doc.setFillColor(15, 30, 60);
  doc.setDrawColor(blueColor[0], blueColor[1], blueColor[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(centerLeftX, 20.5, 39, 4.5, 1, 1, 'FD');
  doc.setTextColor(147, 197, 253);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.text(`ROLL NO / ID: ${rollNumber}`, centerLeftX + 2, 23.8);

  // Membership Plan
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(3.8);
  doc.text('PLAN:', centerLeftX, 28.5);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.4);
  const truncatedPlan = planName.length > 22 ? planName.substring(0, 21) + '...' : planName;
  doc.text(truncatedPlan, centerLeftX + 11, 28.5);

  // Valid From
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(3.8);
  doc.text('VALID FROM:', centerLeftX, 33);
  doc.setTextColor(226, 232, 240);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.2);
  doc.text(validFrom, centerLeftX + 21, 33);

  // Valid Until
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(3.8);
  doc.text('VALID UNTIL:', centerLeftX, 37.5);
  doc.setTextColor(emeraldColor[0], emeraldColor[1], emeraldColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.8);
  doc.text(validUntil, centerLeftX + 21, 37.5);

  // Right Column: Secure Verification QR Code (contains only identifier / verification URL)
  const qrBoxX = cardWidth - 21.5;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(qrBoxX, 15.5, 18, 22.5, 1.5, 1.5, 'F');

  const secureQrPayload = JSON.stringify({
    gym: gymName,
    id: rollNumber,
    member: memberName,
    plan: planName,
    status: 'ACTIVE',
    validUntil: validUntil,
  });

  try {
    const qrDataUrl = await QRCode.toDataURL(secureQrPayload, {
      margin: 1,
      width: 140,
      color: { dark: '#0A0D14', light: '#FFFFFF' },
    });
    doc.addImage(qrDataUrl, 'PNG', qrBoxX + 1, 16.5, 16, 16);
  } catch (err) {
    console.warn('QR render error:', err);
  }

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(3.6);
  doc.text('SCAN VERIFY', qrBoxX + 9, 35.8, { align: 'center' });

  // Front Footer
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.3);
  doc.line(3.5, 45.5, cardWidth - 3.5, 45.5);

  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(3.6);
  doc.text(`${gymName} • Official Access Pass`, 4, 49.5);

  doc.setTextColor(emeraldColor[0], emeraldColor[1], emeraldColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(3.8);
  doc.text('Valid for Gym Entry', cardWidth - 4, 49.5, { align: 'right' });

  // ----------------------------------------------------
  // PAGE 2: BACK SIDE (RULES, CONTACT & PASS SECURITY)
  // ----------------------------------------------------
  doc.addPage([cardWidth, cardHeight], 'landscape');

  // Back Background
  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.rect(0, 0, cardWidth, cardHeight, 'F');

  // Outer Border Inset
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(1.5, 1.5, cardWidth - 3, cardHeight - 3, 2, 2, 'D');

  // Top Neon Blue Stripe
  doc.setFillColor(blueColor[0], blueColor[1], blueColor[2]);
  doc.roundedRect(1.5, 1.5, cardWidth - 3, 1.8, 1, 1, 'F');

  // Header Back
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text(`${gymName}`, 4, 6.5);

  doc.setTextColor(147, 197, 253);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.2);
  doc.text('MEMBERSHIP INFORMATION', cardWidth - 4, 6.5, { align: 'right' });

  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.3);
  doc.line(3.5, 8.5, cardWidth - 3.5, 8.5);

  // Left Column: Instructions & Rules
  doc.setFillColor(cardSurface[0], cardSurface[1], cardSurface[2]);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.roundedRect(4, 10.5, 52, 7.5, 1, 1, 'FD');

  doc.setTextColor(147, 197, 253);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(3.5);
  doc.text('VERIFICATION & ACCESS INSTRUCTIONS:', 5.5, 13.2);

  doc.setTextColor(226, 232, 240);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(3.2);
  doc.text('Present this card at turnstiles / reception for locker & gym access.', 5.5, 16.2);

  // Important Rules
  doc.setTextColor(emeraldColor[0], emeraldColor[1], emeraldColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(3.6);
  doc.text('IMPORTANT RULES:', 4, 21.5);

  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(3.2);
  doc.text('• Clean sports shoes & gym towel required on workout floor.', 4, 25);
  doc.text('• Re-rack weights after use and sanitize equipment.', 4, 28.5);
  doc.text('• Card is non-transferable and must be shown on request.', 4, 32);

  // Contact Info
  doc.setTextColor(203, 213, 225);
  doc.setFontSize(3.1);
  doc.text(`${gymAddress}`, 4, 37);
  doc.text(`Helpline: ${gymPhone}  |  ${gymEmail}`, 4, 40.5);

  // Right Column: QR Pass Box
  const backQrX = cardWidth - 25.5;
  doc.setFillColor(cardSurface[0], cardSurface[1], cardSurface[2]);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.roundedRect(backQrX, 10.5, 21.5, 30.5, 1.5, 1.5, 'FD');

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(backQrX + 1.5, 12, 18.5, 18.5, 1, 1, 'F');

  try {
    const qrDataUrl = await QRCode.toDataURL(secureQrPayload, {
      margin: 1,
      width: 140,
      color: { dark: '#0A0D14', light: '#FFFFFF' },
    });
    doc.addImage(qrDataUrl, 'PNG', backQrX + 2.2, 12.8, 17, 17);
  } catch (err) {
    console.warn('QR render error on back:', err);
  }

  doc.setFillColor(15, 30, 60);
  doc.roundedRect(backQrX + 1.5, 33, 18.5, 5, 1, 1, 'F');
  doc.setTextColor(147, 197, 253);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(3.5);
  doc.text('AUTHENTIC PASS', backQrX + 10.75, 36.6, { align: 'center' });

  // Back Footer Notice
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.3);
  doc.line(3.5, 45, cardWidth - 3.5, 45);

  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(3.1);
  doc.text(
    `This card is the property of ${gymName}. If found, please return to front desk reception.`,
    cardWidth / 2,
    48.5,
    { align: 'center' }
  );

  doc.setTextColor(emeraldColor[0], emeraldColor[1], emeraldColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(3.4);
  doc.text(`Helpline: ${gymPhone}`, cardWidth / 2, 51.5, { align: 'center' });

  const sanitizedRoll = rollNumber.replace(/[^a-zA-Z0-9_-]/g, '-');
  doc.save(`AB-GYM-MEMBER-ID-${sanitizedRoll}.pdf`);
}

/**
 * 4. ADVANCED INVOICE / OFFICIAL BILL PDF
 * Comprehensive tax bill & membership invoice format with itemized charges,
 * concession breakdowns, payment balances, and bank/UPI settlement details.
 */
export async function downloadMemberInvoicePDF(member: Member, settings: GymSettings, payment?: FeePaymentRecord) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryDark = [15, 23, 42]; // #0F172A
  const brandEmerald = [16, 185, 129]; // #10B981
  const brandBlue = [37, 99, 235]; // #2563EB
  const textMuted = [100, 116, 139]; // #64748B
  const textDark = [30, 41, 59]; // #1E293B
  const bgLight = [248, 250, 252]; // #F8FAFC
  const borderColor = [226, 232, 240]; // #E2E8F0

  const gymName = (settings.gymName || 'MS FITNESS').toUpperCase();
  const gymTagline = settings.tagline || 'Stronger Body, Stronger You';
  const gymPhone = settings.phone || '+91 85878 82431';
  const gymEmail = settings.email || 'support@msfitness.com';
  const gymAddress = settings.address || 'MS Fitness Complex, New Delhi - 110075';

  const rollNumber = member.rollNumber || member.rollNo || 'MS-26-0000';
  const memberName = (member.fullName || member.name || 'Valued Member').trim();
  const memberPhone = member.phone || member.phoneNumber || 'N/A';
  const memberEmail = member.email || member.emailAddress || 'N/A';
  const memberAddress = member.address || 'Registered with Gym';

  const todayStr = new Date().toISOString().split('T')[0];
  const invoiceNo = `INV-MS-${new Date().getFullYear()}-${rollNumber.replace(/[^a-zA-Z0-9]/g, '')}`;
  const invoiceDate = payment?.paymentDate || member.lastPaymentDate || todayStr;
  const dueDate = member.membershipExpiry || member.expiryDate || 'Immediate';

  // Financial calculations
  const regFee = member.registrationFeePaid || (payment?.registrationRef ? 100 : 0);
  const planFee = parseAmount(payment?.currentFeeAmount || member.finalFeeAmount || member.regularPlanAmount || 999);
  const discount = parseAmount(payment?.discountAmount || member.discountAmount || 0);
  const prevBal = parseAmount(payment?.previousBalance || member.previousBalance || 0);
  const subtotal = planFee + regFee;
  const totalPayable = subtotal - discount + prevBal;
  const amountPaid = parseAmount(payment?.amountPaid || member.lastPaymentAmount || totalPayable);
  const balanceDue = Math.max(0, totalPayable - amountPaid);

  // Header Banner
  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.rect(0, 0, 210, 46, 'F');

  // Blue accent line
  doc.setFillColor(brandBlue[0], brandBlue[1], brandBlue[2]);
  doc.rect(0, 44.5, 210, 1.5, 'F');

  // Official Logo
  try {
    doc.addImage(AB_GYM_LOGO_BASE64, 'JPEG', 14, 7, 30, 30);
  } catch (err) {
    console.warn('Could not render logo in Invoice PDF:', err);
  }

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(gymName, 48, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  doc.text(gymTagline, 48, 24);

  doc.setTextColor(203, 213, 225);
  doc.setFontSize(8);
  doc.text(`Phone: ${gymPhone}  |  Email: ${gymEmail}`, 48, 30);
  doc.text(gymAddress, 48, 36);

  // Right Header Invoice Info
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('MEMBERSHIP INVOICE', 196, 18, { align: 'right' });

  doc.setFillColor(30, 41, 59);
  doc.roundedRect(114, 23, 82, 16, 2, 2, 'F');

  doc.setTextColor(96, 165, 250);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`INVOICE #: ${invoiceNo}`, 192, 29, { align: 'right' });

  doc.setTextColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`INVOICE DATE: ${invoiceDate}  |  DUE: ${dueDate}`, 192, 35, { align: 'right' });

  // 1. Billed From & Billed To Containers (2 Columns)
  let y = 52;
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(14, y, 88, 38, 3, 3, 'FD');
  doc.roundedRect(108, y, 88, 38, 3, 3, 'FD');

  // Left: Billed From
  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.roundedRect(14, y, 88, 7, 3, 3, 'F');
  doc.rect(14, y + 3, 88, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('BILLED FROM (GYM OPERATOR)', 18, y + 5);

  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(gymName, 18, y + 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(gymAddress, 18, y + 18);
  doc.text(`Phone: ${gymPhone} | Email: ${gymEmail}`, 18, y + 23);
  doc.text(`UPI VPA: ${settings.upiId || 'msfitness@upi'}`, 18, y + 28);
  doc.text(`GST / MSME Reg: Registered Fitness Entity`, 18, y + 33);

  // Right: Billed To
  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.roundedRect(108, y, 88, 7, 3, 3, 'F');
  doc.rect(108, y + 3, 88, 4, 'F');
  doc.setTextColor(brandBlue[0], brandBlue[1], brandBlue[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('BILLED TO (MEMBER / ATHLETE)', 112, y + 5);

  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(memberName, 112, y + 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Member ID / Roll: ${rollNumber}`, 112, y + 18);
  doc.text(`Mobile: ${memberPhone} | Email: ${memberEmail}`, 112, y + 23);
  doc.text(`Address: ${memberAddress}`, 112, y + 28);
  doc.text(`Membership Status: ${(member.status || 'Active').toUpperCase()}`, 112, y + 33);

  // 2. Line Items Table
  y = 96;
  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.rect(14, y, 182, 8.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('#', 18, y + 5.5);
  doc.text('ITEM DESCRIPTION', 26, y + 5.5);
  doc.text('PLAN / DURATION', 110, y + 5.5);
  doc.text('AMOUNT (INR)', 190, y + 5.5, { align: 'right' });

  // Table Line Items
  y += 8.5;
  let itemIndex = 1;

  // Item 1: Registration Fee
  if (regFee > 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(14, y, 182, 10, 'F');
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.line(14, y + 10, 196, y + 10);

    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`${itemIndex}`, 18, y + 6);
    doc.text('Initial Gym Admission & Member ID Issuance', 26, y + 6);
    doc.text('One-Time Enrollment', 110, y + 6);
    doc.setFont('helvetica', 'bold');
    doc.text(formatINR(regFee), 190, y + 6, { align: 'right' });
    y += 10;
    itemIndex++;
  }

  // Item 2: Membership Plan Fee
  doc.setFillColor(255, 255, 255);
  doc.rect(14, y, 182, 12, 'F');
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.line(14, y + 12, 196, y + 12);

  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`${itemIndex}`, 18, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.text(`Fitness Membership Plan — ${member.planName || member.selectedPlan || 'Standard'}`, 26, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Valid Till: ${dueDate} • Access to Gym Floor, Cardio & Strength`, 26, y + 9.5);

  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFontSize(8);
  doc.text(member.planName || 'Monthly Subscription', 110, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.text(formatINR(planFee), 190, y + 6, { align: 'right' });
  y += 12;

  // 3. Invoice Summary Calculations & Settlement Details
  y += 6;
  const summaryBoxY = y;

  // Right Side Financial Calculations
  const rightColX = 120;
  const rightValX = 190;
  let subY = y;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Gross Subtotal:', rightColX, subY);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(formatINR(subtotal), rightValX, subY, { align: 'right' });

  if (discount > 0) {
    subY += 5;
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text('Concession / Plan Discount:', rightColX, subY);
    doc.setTextColor(16, 185, 129);
    doc.text('- ' + formatINR(discount), rightValX, subY, { align: 'right' });
  }

  if (prevBal > 0) {
    subY += 5;
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text('Previous Unpaid Balance:', rightColX, subY);
    doc.setTextColor(217, 119, 6);
    doc.text('+ ' + formatINR(prevBal), rightValX, subY, { align: 'right' });
  }

  subY += 5.5;
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.line(rightColX, subY - 1, 196, subY - 1);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('Total Invoice Amount:', rightColX, subY + 3);
  doc.text(formatINR(totalPayable), rightValX, subY + 3, { align: 'right' });

  subY += 8;
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.roundedRect(rightColX - 2, subY - 3.5, 78, 9, 2, 2, 'F');
  doc.setTextColor(brandEmerald[0], brandEmerald[1], brandEmerald[2]);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('AMOUNT PAID / SETTLED:', rightColX + 2, subY + 2.5);
  doc.text(formatINR(amountPaid), rightValX - 2, subY + 2.5, { align: 'right' });

  subY += 9;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Net Balance Remaining:', rightColX, subY);
  if (balanceDue > 0) {
    doc.setTextColor(220, 38, 38);
    doc.setFont('helvetica', 'bold');
    doc.text(formatINR(balanceDue), rightValX, subY, { align: 'right' });
  } else {
    doc.setTextColor(16, 185, 129);
    doc.setFont('helvetica', 'bold');
    doc.text('₹0 (Full Cleared)', rightValX, subY, { align: 'right' });
  }

  // Left Side: UPI Payment & Bank Details Box
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.roundedRect(14, summaryBoxY - 2, 98, 48, 3, 3, 'FD');

  const qrPayload = JSON.stringify({
    gym: gymName,
    invoiceNo: invoiceNo,
    roll: rollNumber,
    name: memberName,
    amount: totalPayable,
    balance: balanceDue,
    dueDate: dueDate,
  });

  try {
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      margin: 1,
      width: 150,
      color: { dark: '#0F172A', light: '#FFFFFF' },
    });
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(18, summaryBoxY + 2, 34, 34, 2, 2, 'F');
    doc.addImage(qrDataUrl, 'PNG', 19, summaryBoxY + 3, 32, 32);
  } catch (qrErr) {
    console.warn('QR Code generation error in invoice:', qrErr);
  }

  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('ONLINE PAYMENT (UPI)', 56, summaryBoxY + 7);

  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`UPI ID: ${settings.upiId || 'msfitness@upi'}`, 56, summaryBoxY + 13);
  doc.text(`Beneficiary: ${settings.upiName || 'MS Fitness'}`, 56, summaryBoxY + 18);
  doc.text(`GPay / PhonePe / Paytm / BHIM`, 56, summaryBoxY + 23);

  doc.setFillColor(37, 99, 235);
  doc.roundedRect(56, summaryBoxY + 28, 50, 6, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('OFFICIAL TAX INVOICE', 81, summaryBoxY + 32, { align: 'center' });

  // 4. Terms & Policy Container
  y = 190;
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.roundedRect(14, y, 182, 30, 3, 3, 'FD');

  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.text('INVOICE TERMS & CONDITIONS:', 18, y + 5.5);

  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  const invoiceTerms = [
    '1. All subscription fees must be cleared on or before the due date to ensure seamless turnstile admission.',
    '2. Payments are non-refundable once the membership cycle begins.',
    '3. For partial fee payments, remaining balance must be settled within 7 days of invoice generation.',
    '4. In case of any billing discrepancies, please reach out to front desk support within 48 hours.',
  ];
  invoiceTerms.forEach((term, idx) => {
    doc.text(term, 18, y + 10.5 + idx * 4.4);
  });

  // 5. Authorized Signatory & Official Seal
  y = 226;
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.line(14, y, 196, y);

  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('MS FITNESS ACCOUNTS & BILLING', 14, y + 6);

  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.text(`Front Desk Helpline: ${gymPhone} | Support: ${gymEmail}`, 14, y + 12);
  doc.text(`Complex: ${gymAddress}`, 14, y + 17);

  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.roundedRect(130, y + 2, 66, 26, 2, 2, 'F');
  doc.setDrawColor(brandBlue[0], brandBlue[1], brandBlue[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(134, y + 4, 58, 14, 1.5, 1.5, 'D');

  doc.setTextColor(brandBlue[0], brandBlue[1], brandBlue[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(`${gymName} FINANCE DESK`, 163, y + 9, { align: 'center' });
  doc.setFontSize(6);
  doc.text('OFFICIALLY CERTIFIED BILL', 163, y + 14, { align: 'center' });

  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('AUTHORIZED ACCOUNTS OFFICER', 163, y + 23, { align: 'center' });

  doc.save(`MS_Fitness_Invoice_${invoiceNo}.pdf`);
}
