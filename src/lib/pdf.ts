import { jsPDF } from 'jspdf';
import { FeePaymentRecord, Member, GymSettings } from '../types';
import { AB_GYM_LOGO_BASE64 } from './logoBase64';

export function downloadFeeReceiptPDF(record: FeePaymentRecord, settings: GymSettings) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

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
  doc.text(settings.gymName, 48, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(settings.tagline, 48, 25);
  doc.text(`Phone: ${settings.phone} | Email: ${settings.email}`, 48, 31);
  doc.text(settings.address, 48, 37);

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
  doc.text(record.planName, 145, 74);

  doc.setFont('helvetica', 'bold');
  doc.text('New Expiry Date:', 110, 82);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 128, 0);
  doc.text(record.newExpiryDate, 145, 82);

  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Status:', 110, 90);
  doc.setFont('helvetica', 'normal');
  doc.text(record.status, 145, 90);

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
  doc.text(`Membership Fee Renewal (${record.planName || record.selectedPlan || 'Plan'})`, 20, y + 8);
  doc.text((record.paymentMethod || 'UPI') + (record.upiTxnId ? ` (${record.upiTxnId})` : ''), 100, y + 8);
  doc.setFont('helvetica', 'bold');
  const amtPaid = Number(record.amountPaid ?? record.currentFeeAmount ?? 0);
  doc.text(`₹${amtPaid.toLocaleString('en-IN')}`, 190, y + 8, { align: 'right' });

  // Summary Rows
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.text('Previous Balance:', 130, y);
  doc.text(`₹${Number(record.previousBalance || 0).toLocaleString('en-IN')}`, 190, y, { align: 'right' });

  y += 6;
  doc.setFont('helvetica', 'normal');
  const totalPayable = Number(record.totalPayableAmount ?? ((record.previousBalance || 0) + (record.currentFeeAmount || 0)));
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
  const remBal = Number(record.remainingBalance || 0);
  doc.text('Remaining Balance:', 130, y);
  if (remBal > 0) {
    doc.setTextColor(220, 100, 0);
  }
  doc.text(`₹${remBal.toLocaleString('en-IN')}`, 190, y, { align: 'right' });

  y += 6;
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.setFont('helvetica', 'normal');
  doc.text('Payment Type:', 130, y);
  const payType = record.paymentType || (remBal > 0 ? 'Partial Payment' : 'Full Payment');
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

export function downloadMemberCardPDF(member: Member, settings: GymSettings) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [85.6, 53.98], // Standard CR80 ID Card dimensions
  });

  const blueColor = [37, 99, 235];
  const darkBg = [15, 15, 20];

  // Background
  doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
  doc.rect(0, 0, 85.6, 53.98, 'F');

  // Blue accent top bar
  doc.setFillColor(blueColor[0], blueColor[1], blueColor[2]);
  doc.rect(0, 0, 85.6, 9, 'F');

  // Add Logo to Card
  try {
    doc.addImage(AB_GYM_LOGO_BASE64, 'JPEG', 3, 1, 7, 7);
  } catch (err) {
    console.warn('Could not render card logo:', err);
  }

  // Header Text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(settings.gymName, 12, 6);

  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text('OFFICIAL MEMBER ID PASS', 80, 5.5, { align: 'right' });

  // Roll Number Badge
  doc.setFillColor(230, 230, 230);
  doc.roundedRect(5, 12, 75.6, 7, 1.5, 1.5, 'F');
  doc.setTextColor(blueColor[0], blueColor[1], blueColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`ROLL NO: ${member.rollNumber}`, 42.8, 16.5, { align: 'center' });

  // Member Details
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(member.fullName, 5, 24);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 180, 185);
  doc.text(`Plan: ${member.planName}`, 5, 29);
  doc.text(`Phone: ${member.phone}`, 5, 33);
  doc.text(`Joined: ${member.joiningDate}`, 5, 37);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`Expiry: ${member.membershipExpiry}`, 5, 42);

  // Status Badge
  const isExpired = member.status === 'Expired';
  doc.setFillColor(isExpired ? 220 : 34, isExpired ? 38 : 197, isExpired ? 38 : 94);
  doc.roundedRect(5, 46, 25, 5, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(5.5);
  doc.text(member.status.toUpperCase(), 17.5, 49.5, { align: 'center' });

  // Emergency contact right side
  doc.setTextColor(150, 150, 155);
  doc.setFontSize(5.5);
  doc.text(`Emergency: ${member.emergencyContact || 'N/A'}`, 80, 49.5, { align: 'right' });

  doc.save(`ABGYM_Card_${member.rollNumber}.pdf`);
}
