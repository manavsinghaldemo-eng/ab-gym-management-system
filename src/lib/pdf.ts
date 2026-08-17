import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { FeePaymentRecord, Member, GymSettings } from '../types';
import { AB_GYM_LOGO_BASE64 } from './logoBase64';
import { resolveFeePaymentFinancials } from './paymentUtils';

export function downloadFeeReceiptPDF(record: FeePaymentRecord, settings: GymSettings) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const fin = resolveFeePaymentFinancials(record);

  const blueColor = [37, 99, 235]; // #2563EB
  const darkColor = [20, 20, 25]; // #141419
  const grayColor = [100, 100, 105];

  // Header Banner
  doc.setFillColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.rect(0, 0, 210, 48, 'F');

  // Blue accent line
  doc.setFillColor(blueColor[0], blueColor[1], blueColor[2]);
  doc.rect(0, 46, 210, 2, 'F');

  // Add Official Logo Image
  try {
    doc.addImage(AB_GYM_LOGO_BASE64, 'JPEG', 12, 6, 32, 32);
  } catch (err) {
    console.warn('Could not render logo in PDF:', err);
  }

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(settings.gymName || 'AB GYM', 48, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(settings.tagline || 'Stronger Body, Stronger You', 48, 25);
  doc.text(`Phone: ${settings.phone || '+91 98765 43210'} | Email: ${settings.email || 'abgym@gmail.com'}`, 48, 31);
  doc.text(settings.address || 'Civil Lines, Near Stadium, Moradabad', 48, 37);

  // Receipt Label Right Aligned
  doc.setTextColor(blueColor[0], blueColor[1], blueColor[2]);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('FEE PAYMENT RECEIPT', 195, 22, { align: 'right' });

  doc.setTextColor(200, 200, 200);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Ref #: ${record.feeReferenceNumber}`, 195, 30, { align: 'right' });
  doc.text(`Date: ${record.paymentDate}`, 195, 36, { align: 'right' });

  // Member & Payment Details Container Box
  doc.setFillColor(248, 249, 250);
  doc.setDrawColor(220, 220, 225);
  doc.roundedRect(15, 55, 180, 50, 3, 3, 'FD');

  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('MEMBER DETAILS', 20, 65);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Reg Ref:', 20, 74);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(blueColor[0], blueColor[1], blueColor[2]);
  doc.text(record.registrationRef || 'N/A', 50, 74);

  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('Roll Number:', 20, 82);
  doc.setFont('helvetica', 'normal');
  doc.text(record.rollNumber || 'Unassigned (Pending Approval)', 50, 82);

  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('Member Name:', 20, 82);
  doc.setFont('helvetica', 'normal');
  doc.text(record.memberName, 50, 82);

  doc.setFont('helvetica', 'bold');
  doc.text('Phone Number:', 20, 90);
  doc.setFont('helvetica', 'normal');
  doc.text(record.memberPhone, 50, 90);

  doc.setFont('helvetica', 'bold');
  doc.text('Email:', 20, 98);
  doc.setFont('helvetica', 'normal');
  doc.text(record.memberEmail || 'N/A', 50, 98);

  // Right Side - Membership Plan Info
  doc.setFont('helvetica', 'bold');
  doc.text('Selected Plan:', 110, 74);
  doc.setFont('helvetica', 'normal');
  doc.text(fin.planName || record.planName || 'Plan', 145, 74);

  doc.setFont('helvetica', 'bold');
  doc.text('New Expiry Date:', 110, 82);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 128, 0);
  doc.text(record.newExpiryDate, 145, 82);

  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Status:', 110, 90);
  doc.setFont('helvetica', 'normal');
  doc.text(fin.status || record.status, 145, 90);

  // Financial Breakdown Table
  let y = 115;
  doc.setFillColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.rect(15, y, 180, 10, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('DESCRIPTION', 20, y + 7);
  doc.text('PAYMENT METHOD', 100, y + 7);
  doc.text('AMOUNT (₹)', 190, y + 7, { align: 'right' });

  y += 10;
  doc.setFillColor(255, 255, 255);
  doc.rect(15, y, 180, 12, 'F');
  doc.setDrawColor(220, 220, 225);
  doc.line(15, y + 12, 195, y + 12);

  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.setFont('helvetica', 'normal');
  doc.text(`Membership Fee Renewal (${fin.planName || record.planName || record.selectedPlan || 'Plan'})`, 20, y + 8);
  doc.text((record.paymentMethod || 'UPI') + (record.upiTxnId ? ` (${record.upiTxnId})` : ''), 100, y + 8);
  doc.setFont('helvetica', 'bold');
  const amtPaid = fin.amountPaid;
  doc.text(`₹${amtPaid.toLocaleString('en-IN')}`, 190, y + 8, { align: 'right' });

  // Summary Rows
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.text('Previous Balance:', 130, y);
  doc.text(`₹${fin.previousBalance.toLocaleString('en-IN')}`, 190, y, { align: 'right' });

  y += 6;
  doc.setFont('helvetica', 'normal');
  const totalPayable = fin.totalPayableAmount;
  doc.text('Total Payable Amount:', 130, y);
  doc.text(`₹${totalPayable.toLocaleString('en-IN')}`, 190, y, { align: 'right' });

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Amount Paid:', 130, y);
  doc.setTextColor(blueColor[0], blueColor[1], blueColor[2]);
  doc.text(`₹${amtPaid.toLocaleString('en-IN')}`, 190, y, { align: 'right' });

  y += 6;
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const remBal = fin.remainingBalance;
  doc.text('Remaining Balance:', 130, y);
  if (remBal > 0) {
    doc.setTextColor(220, 100, 0);
  }
  doc.text(`₹${remBal.toLocaleString('en-IN')}`, 190, y, { align: 'right' });

  y += 6;
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.setFont('helvetica', 'normal');
  doc.text('Payment Type:', 130, y);
  const payType = fin.paymentType;
  doc.text(payType, 190, y, { align: 'right' });

  // Notes / Remarks Box
  if (record.remarks) {
    y += 15;
    doc.setFillColor(245, 245, 248);
    doc.rect(15, y, 180, 18, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('Remarks / Note:', 20, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text(record.remarks, 20, y + 12);
  }

  // Stamp / Verification Footer
  y = 230;
  doc.setDrawColor(200, 200, 200);
  doc.line(15, y, 195, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text('AUTHORIZED SIGNATURE & STAMP', 195, y + 15, { align: 'right' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text('This is a computer-generated fee receipt from AB Gym portal. No signature required.', 15, y + 25);
  doc.text('Thank you for training with AB Gym! Keep pushing your limits.', 15, y + 30);

  doc.save(`ABGYM_Receipt_${record.feeReferenceNumber}.pdf`);
}

/**
 * Generates and downloads a redesigned, ultra-premium AB GYM Official Member ID Card PDF.
 * Designed to look like a luxury high-tech fitness club identity pass with balanced layout,
 * dark + emerald/blue fitness aesthetic, QR verification, dynamic status badges, and watermark.
 */
export async function downloadMemberCardPDF(member: Member, settings: GymSettings) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4', // Standard A4 layout with optimized proportions
  });

  const primaryDark = [15, 15, 20]; // #0F0F14
  const cardBg = [24, 24, 32]; // #181820
  const emeraldColor = [16, 185, 129]; // #10B981
  const blueColor = [59, 130, 246]; // #3B82F6
  const textMuted = [156, 163, 175]; // #9CA3AF
  const textDark = [229, 231, 235]; // #E5E7EB

  // 1. Page Background (Deep Slate)
  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.rect(0, 0, 210, 297, 'F');

  // Subtle Background Security Lines / Watermark Pattern
  doc.setDrawColor(30, 30, 42);
  doc.setLineWidth(0.3);
  for (let i = 20; i < 280; i += 20) {
    doc.line(10, i, 200, i);
  }

  // Large Subtle Background Watermark
  doc.setTextColor(25, 25, 36);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(54);
  doc.text('AB GYM FITNESS', 105, 160, { align: 'center', angle: 45 });

  // Main Card Container (Outer Luxury Frame)
  doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
  doc.setDrawColor(45, 45, 60);
  doc.setLineWidth(0.8);
  doc.roundedRect(12, 14, 186, 268, 6, 6, 'FD');

  // Top Neon Accent Border Line
  doc.setFillColor(emeraldColor[0], emeraldColor[1], emeraldColor[2]);
  doc.rect(12, 14, 186, 3.5, 'F');

  // 2. BRANDED HEADER SECTION
  let y = 28;

  // Add Official Gym Logo
  try {
    doc.addImage(AB_GYM_LOGO_BASE64, 'JPEG', 20, y - 5, 24, 24);
  } catch (err) {
    console.warn('Could not render logo in ID Card PDF:', err);
    doc.setFillColor(37, 99, 235);
    doc.roundedRect(20, y - 5, 24, 24, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('AB', 32, y + 8, { align: 'center' });
  }

  // Header Title & Slogan
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(settings.gymName || 'AB GYM', 48, y + 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(emeraldColor[0], emeraldColor[1], emeraldColor[2]);
  doc.text(settings.tagline || 'Stronger Body, Stronger You', 48, y + 10);

  // Document Badge on Right
  doc.setFillColor(35, 35, 48);
  doc.setDrawColor(60, 60, 80);
  doc.roundedRect(132, y - 4, 56, 18, 3, 3, 'FD');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('OFFICIAL MEMBER ID', 160, y + 3, { align: 'center' });
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('FITNESS IDENTITY PASS', 160, y + 9, { align: 'center' });

  // Horizontal Accent Divider
  y = 52;
  doc.setDrawColor(50, 50, 68);
  doc.setLineWidth(0.5);
  doc.line(20, y, 190, y);

  // 3. MEMBER PROFILE & ROLL NUMBER HERO CARD
  y = 60;
  doc.setFillColor(18, 18, 26);
  doc.setDrawColor(55, 55, 75);
  doc.setLineWidth(0.6);
  doc.roundedRect(20, y, 170, 48, 4, 4, 'FD');

  // Member Avatar Frame / Photo Box
  doc.setFillColor(28, 28, 40);
  doc.setDrawColor(emeraldColor[0], emeraldColor[1], emeraldColor[2]);
  doc.setLineWidth(1);
  doc.roundedRect(26, y + 7, 34, 34, 4, 4, 'FD');

  // Avatar Initials Icon inside Photo Box
  const nameInitials = (member.fullName || 'Member')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');

  doc.setTextColor(emeraldColor[0], emeraldColor[1], emeraldColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(nameInitials || 'AB', 43, y + 26, { align: 'center' });
  doc.setFontSize(6);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('MEMBER PHOTO', 43, y + 34, { align: 'center' });

  // Member Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text((member.fullName || 'Member Name').toUpperCase(), 66, y + 15);

  // Prominent Roll Number Display
  doc.setFillColor(30, 41, 59); // Slate Blue
  doc.setDrawColor(blueColor[0], blueColor[1], blueColor[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(66, y + 19, 72, 10, 2, 2, 'FD');

  doc.setTextColor(96, 165, 250); // Light blue
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`ROLL NO: ${member.rollNumber || 'ABG-26-0000'}`, 102, y + 25.5, { align: 'center' });

  // Status Badge
  const statusStr = (member.status || 'Active').toUpperCase();
  const isActive = statusStr.includes('ACTIVE');
  const isExpired = statusStr.includes('EXPIRED');
  const isDue = statusStr.includes('DUE');

  let badgeBg = [16, 185, 129]; // Emerald
  if (isExpired) badgeBg = [239, 68, 68]; // Red
  else if (isDue) badgeBg = [245, 158, 11]; // Amber

  doc.setFillColor(badgeBg[0], badgeBg[1], badgeBg[2]);
  doc.roundedRect(66, y + 32, 44, 7, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(`* ${statusStr}`, 88, y + 36.8, { align: 'center' });

  // Registration reference indicator
  if (member.registrationRef) {
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Ref: ${member.registrationRef}`, 142, y + 37);
  }

  // 4. MEMBERSHIP DETAILS SECTION
  y = 116;
  doc.setFillColor(18, 18, 26);
  doc.setDrawColor(55, 55, 75);
  doc.roundedRect(20, y, 170, 38, 4, 4, 'FD');

  // Section Header
  doc.setFillColor(30, 30, 42);
  doc.roundedRect(20, y, 170, 8, 4, 4, 'F');
  doc.rect(20, y + 4, 170, 4, 'F'); // flatten bottom corners
  doc.setTextColor(emeraldColor[0], emeraldColor[1], emeraldColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('MEMBERSHIP DETAILS', 26, y + 5.5);

  // 4-Column Grid for Membership Details
  const detailsY = y + 15;

  // Plan Name
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('MEMBERSHIP PLAN', 26, detailsY);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(member.planName || 'Standard Fitness Plan', 26, detailsY + 7);

  // Joining Date
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('JOINED ON', 76, detailsY);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(member.joiningDate || 'N/A', 76, detailsY + 7);

  // Valid Until (Highlighted in Neon Emerald/Amber)
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('VALID UNTIL', 120, detailsY);
  doc.setTextColor(emeraldColor[0], emeraldColor[1], emeraldColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(member.membershipExpiry || 'Active', 120, detailsY + 7);

  // Status Summary
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('MEMBERSHIP STATUS', 160, detailsY);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(member.status || 'Active', 160, detailsY + 7);

  // 5. PERSONAL & CONTACT INFORMATION
  y = 162;
  doc.setFillColor(18, 18, 26);
  doc.setDrawColor(55, 55, 75);
  doc.roundedRect(20, y, 170, 44, 4, 4, 'FD');

  // Section Header
  doc.setFillColor(30, 30, 42);
  doc.roundedRect(20, y, 170, 8, 4, 4, 'F');
  doc.rect(20, y + 4, 170, 4, 'F');
  doc.setTextColor(blueColor[0], blueColor[1], blueColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('PERSONAL INFORMATION & CONTACT', 26, y + 5.5);

  const row1Y = y + 16;
  const row2Y = y + 28;

  // Phone Number
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('PHONE NUMBER', 26, row1Y);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(member.phone || 'N/A', 26, row1Y + 5.5);

  // Email Address
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('EMAIL ADDRESS', 80, row1Y);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(member.email || 'Registered with Gym', 80, row1Y + 5.5);

  // Gender
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('GENDER', 145, row1Y);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(member.gender || 'Not Specified', 145, row1Y + 5.5);

  // Date of Birth
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('DATE OF BIRTH', 26, row2Y);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(member.dob || 'On Record', 26, row2Y + 5.5);

  // Emergency Contact
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('EMERGENCY CONTACT', 80, row2Y);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(member.emergencyContact || 'Available on Request', 80, row2Y + 5.5);

  // Fitness Goal / Medical (if any)
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('FITNESS GOAL', 145, row2Y);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(member.fitnessGoal || 'General Fitness', 145, row2Y + 5.5);

  // 6. QR CODE & VERIFICATION SECURITY SECTION
  y = 214;
  doc.setFillColor(18, 18, 26);
  doc.setDrawColor(55, 55, 75);
  doc.roundedRect(20, y, 170, 42, 4, 4, 'FD');

  // Left Verification Notice
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('AB GYM OFFICIAL VERIFICATION', 26, y + 10);

  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Scan the QR code at gym reception or turnstiles to verify active membership', 26, y + 16);
  doc.text('status, log daily workout attendance, and access fitness locker amenities.', 26, y + 21);

  // Security Pill Badge
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(26, y + 26, 75, 8, 2, 2, 'F');
  doc.setTextColor(96, 165, 250);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('* VERIFIED AUTHENTIC MEMBER PASS', 63.5, y + 31.5, { align: 'center' });

  // Generate QR Code Data URL dynamically
  const qrDataPayload = JSON.stringify({
    gym: settings.gymName || 'AB GYM',
    roll: member.rollNumber,
    name: member.fullName,
    plan: member.planName,
    status: member.status,
    expiry: member.membershipExpiry,
    ref: member.registrationRef || '',
  });

  try {
    const qrDataUrl = await QRCode.toDataURL(qrDataPayload, {
      margin: 1,
      width: 200,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    // White backing box for QR Code
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(148, y + 4, 34, 34, 3, 3, 'F');
    doc.addImage(qrDataUrl, 'PNG', 150, y + 6, 30, 30);
  } catch (qrErr) {
    console.warn('QR Code generation failed, using styled fallback:', qrErr);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(148, y + 4, 34, 34, 3, 3, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('SCAN QR', 165, y + 22, { align: 'center' });
  }

  // 7. FOOTER SECTION
  y = 264;
  doc.setDrawColor(50, 50, 68);
  doc.setLineWidth(0.4);
  doc.line(20, y, 190, y);

  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(
    `This card confirms official membership at ${settings.gymName || 'AB GYM'} and is non-transferable. Valid only during the active term.`,
    105,
    y + 6,
    { align: 'center' }
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(emeraldColor[0], emeraldColor[1], emeraldColor[2]);
  doc.text(
    `${settings.address || 'Civil Lines, Moradabad'} | Helpline: ${settings.phone || '+91 98765 43210'}`,
    105,
    y + 11,
    { align: 'center' }
  );

  // Clean filename format
  const sanitizedRoll = (member.rollNumber || 'ABG-MEMBER').replace(/[^a-zA-Z0-9_-]/g, '-');
  doc.save(`AB-GYM-Member-ID-${sanitizedRoll}.pdf`);
}
