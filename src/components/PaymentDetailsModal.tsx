import React, { useState } from 'react';
import { FeePaymentRecord, Member, GymSettings } from '../types';
import {
  X,
  CreditCard,
  User,
  Calendar,
  IndianRupee,
  Download,
  Printer,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Phone,
  Mail,
  Loader2,
  Copy,
  Check,
  Eye,
  Clock,
  FileText,
  Sparkles,
  ArrowRight,
  Receipt
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { parseAmount, resolveFeePaymentFinancials } from '../lib/paymentUtils';
import { downloadFeeReceiptPDF } from '../lib/pdf';
import { getStoredSettings } from '../lib/storage';

interface PaymentDetailsModalProps {
  record: FeePaymentRecord | null;
  onClose: () => void;
  allMembers?: Member[];
  onViewMember?: (member: Member) => void;
  onViewReceiptModal?: (record: FeePaymentRecord) => void;
  onApproveFee?: (record: FeePaymentRecord) => void;
  onRejectFee?: (record: FeePaymentRecord) => void;
  onOpenAddFee?: (member?: Member) => void;
  onResendReceipt?: (record: FeePaymentRecord) => void;
  isResendingReceipt?: boolean;
}

export const PaymentDetailsModal: React.FC<PaymentDetailsModalProps> = ({
  record,
  onClose,
  allMembers = [],
  onViewMember,
  onViewReceiptModal,
  onApproveFee,
  onRejectFee,
  onOpenAddFee,
  onResendReceipt,
  isResendingReceipt = false,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isZoomingScreenshot, setIsZoomingScreenshot] = useState(false);
  const settings: GymSettings = getStoredSettings();

  if (!record) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const feeRef = record.feeReferenceNumber || record.id || 'N/A';
  const regRef = (record.registrationReferenceNumber || record.registrationRef || '').trim().toUpperCase();
  const rollNo = (record.rollNumber || '').trim().toUpperCase();
  const memberName = (record.memberName || record.fullName || 'Member').trim();
  const phone = (record.phoneNumber || record.memberPhone || record.phone || '').trim();
  const email = (record.emailAddress || record.memberEmail || record.email || '').trim();

  // Find linked member record
  const linkedMember = allMembers.find((m) => {
    const mRoll = (m.rollNumber || m.rollNo || '').trim().toUpperCase();
    const mReg = (m.registrationRef || '').trim().toUpperCase();
    const mPhone = (m.phone || m.phoneNumber || '').trim();

    if (rollNo && mRoll === rollNo) return true;
    if (regRef && mReg === regRef) return true;
    if (phone && mPhone && mPhone === phone) return true;
    return false;
  });

  // Authoritative financial resolution
  const financials = resolveFeePaymentFinancials(record);
  const amtPaid = financials.amountPaid;
  const currentFeeAmt = financials.currentFeeAmount;
  const regularPlanAmt = parseAmount(record.regularPlanAmount || financials.planPrice || currentFeeAmt);
  const prevBal = financials.previousBalance;
  const discountAmt = parseAmount(record.discountAmount || 0);
  const totalPayable = financials.totalPayableAmount;
  const remBal = financials.remainingBalance;
  const paymentType = financials.paymentType;
  const statusStr = financials.status;
  const isApproved = financials.isApproved;
  const isPending = statusStr.toLowerCase().includes('pending') || statusStr.toLowerCase() === 'submitted';
  const isRejected = statusStr.toLowerCase() === 'rejected' || statusStr.toLowerCase() === 'failed';

  const screenshot = record.paymentScreenshot || record.paymentScreenshotUrl || record.upiScreenshotUrl;
  const upiTxnId = record.upiTransactionId || record.upiTxnId || record.transactionId;

  const handleDownloadPDF = () => {
    downloadFeeReceiptPDF(record, settings);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="relative w-full max-w-4xl bg-[#0F0F13] border border-zinc-800/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* TOP HEADER */}
          <div className="p-5 sm:p-6 bg-gradient-to-r from-[#14141A] via-[#111116] to-[#14141A] border-b border-zinc-800/80 shrink-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Left Title & Ref */}
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black shrink-0">
                  <CreditCard className="w-6 h-6" />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-black text-white font-mono tracking-tight uppercase">
                      Fee Payment Record
                    </h2>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono uppercase tracking-wider ${
                        isApproved
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : isPending
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {statusStr}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                        paymentType === 'Partial Payment' || remBal > 0
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {paymentType}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => handleCopy(feeRef, 'feeRef')}
                      className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-900/60 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Click to copy Fee Reference"
                    >
                      <span>REF: {feeRef}</span>
                      {copiedField === 'feeRef' ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3 text-emerald-400/70" />}
                    </button>

                    <span className="text-zinc-500">•</span>
                    <span className="text-zinc-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-zinc-500" />
                      {record.paymentDate || record.timestamp || 'Recent'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {isPending && onApproveFee && (
                  <button
                    type="button"
                    onClick={() => onApproveFee(record)}
                    className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verify Fee</span>
                  </button>
                )}

                {isPending && onRejectFee && (
                  <button
                    type="button"
                    onClick={() => onRejectFee(record)}
                    className="px-3 py-2 bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-500/30 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5 text-red-400" />
                    <span>Reject</span>
                  </button>
                )}

                {isApproved && onResendReceipt && (
                  <button
                    type="button"
                    onClick={() => onResendReceipt(record)}
                    disabled={isResendingReceipt}
                    className="px-3 py-2 bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border border-blue-500/30 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Resend verified receipt to member's email"
                  >
                    {isResendingReceipt ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-3.5 h-3.5 text-blue-400" />
                        <span>Resend Receipt</span>
                      </>
                    )}
                  </button>
                )}

                {onViewReceiptModal && (
                  <button
                    type="button"
                    onClick={() => onViewReceiptModal(record)}
                    className="px-3 py-2 bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border border-blue-500/30 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-blue-400" />
                    <span>Receipt Canvas</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-red-600/20 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-zinc-700/60 ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* SCROLLABLE BODY */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs text-zinc-300">
            {/* LINKED MEMBER QUICK CARD */}
            <div className="bg-gradient-to-r from-blue-950/20 via-[#141419] to-[#141419] border border-blue-500/20 rounded-2xl p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold font-mono text-base shrink-0">
                  {memberName.slice(0, 2).toUpperCase() || 'AB'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white font-mono">{memberName}</span>
                    {rollNo && (
                      <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-500/30 text-[10px] font-mono font-bold">
                        {rollNo}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-400 font-mono flex flex-wrap items-center gap-3 mt-0.5">
                    {phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-zinc-500" />
                        {phone}
                      </span>
                    )}
                    {email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-zinc-500" />
                        {email}
                      </span>
                    )}
                    {regRef && <span>Reg Ref: {regRef}</span>}
                  </div>
                </div>
              </div>

              {linkedMember && onViewMember && (
                <button
                  type="button"
                  onClick={() => onViewMember(linkedMember)}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20 cursor-pointer self-start sm:self-auto shrink-0"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>View Member Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* FINANCIAL BREAKDOWN & PLAN GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Financial Calculation Breakdown */}
              <div className="bg-[#141419] border border-zinc-800/90 rounded-2xl p-5 space-y-3.5 shadow-sm font-mono">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                  <h3 className="font-bold text-white uppercase tracking-wider text-xs flex items-center gap-2 font-sans">
                    <IndianRupee className="w-4 h-4 text-emerald-400" />
                    Payment & Balance Breakdown
                  </h3>
                  <span className="text-[10px] text-emerald-400 font-bold">INR (₹)</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center text-zinc-300">
                    <span>Current Fee / Plan Rate:</span>
                    <span className="font-bold text-white">₹{currentFeeAmt.toLocaleString('en-IN')}</span>
                  </div>

                  {prevBal > 0 && (
                    <div className="flex justify-between items-center text-amber-400">
                      <span>Previous Unpaid Balance (+):</span>
                      <span className="font-bold">+ ₹{prevBal.toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  {discountAmt > 0 && (
                    <div className="flex justify-between items-center text-emerald-400">
                      <span>Special Discount (-):</span>
                      <span className="font-bold">- ₹{discountAmt.toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center font-bold text-white border-t border-zinc-800 pt-2 text-sm">
                    <span className="font-sans">Total Payable Amount:</span>
                    <span className="text-emerald-400">₹{totalPayable.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex justify-between items-center font-bold text-white bg-zinc-900/90 p-2.5 rounded-xl border border-zinc-800">
                    <span className="font-sans text-xs">Amount Received / Paid:</span>
                    <span className="text-blue-400 text-sm font-black">₹{amtPaid.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-zinc-400">Remaining Balance:</span>
                    <span className={`font-bold ${remBal > 0 ? 'text-amber-400 text-sm' : 'text-zinc-300'}`}>
                      ₹{remBal.toLocaleString('en-IN')} {remBal === 0 ? '(All Clear)' : '(Due)'}
                    </span>
                  </div>

                  {remBal > 0 && (
                    <div className="p-2.5 bg-amber-950/40 border border-amber-500/30 rounded-xl text-[11px] text-amber-200 font-sans font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Partial payment recorded. ₹{remBal} remains payable on this account.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Plan & Subscription Details */}
              <div className="bg-[#141419] border border-zinc-800/90 rounded-2xl p-5 space-y-3.5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                    <h3 className="font-bold text-white uppercase tracking-wider text-xs flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-400" />
                      Subscription Plan Context
                    </h3>
                    <span className="text-[10px] text-purple-400 font-mono font-bold">Plan Extension</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5 mt-3 text-xs">
                    <div className="col-span-2 p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl">
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-0.5">
                        Selected Plan Name
                      </span>
                      <span className="text-sm font-bold text-white font-mono uppercase">
                        {record.planName || record.selectedPlan || 'Gym Membership'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-0.5">
                        Fee Duration
                      </span>
                      <span className="font-mono text-zinc-200 font-bold">
                        {record.feeDuration || '1 Month'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-0.5">
                        Extended Expiry Date
                      </span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {record.newExpiryDate || 'Active Subscription'}
                      </span>
                    </div>

                    {record.feePriceType && (
                      <div>
                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-0.5">
                          Price Category
                        </span>
                        <span className="text-purple-300 font-medium">{record.feePriceType}</span>
                      </div>
                    )}

                    {record.offerNote && (
                      <div className="col-span-2 p-2 bg-purple-950/30 border border-purple-500/20 rounded-lg text-purple-200 text-[11px]">
                        <span className="font-bold uppercase text-[9px] text-purple-400 block">Offer Note:</span>
                        {record.offerNote}
                      </div>
                    )}
                  </div>
                </div>

                {/* Receipt Number Tag */}
                <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-500">Official Receipt #:</span>
                  <span className="text-zinc-300 font-bold">{record.receiptNumber || `REC-${feeRef.slice(-6)}`}</span>
                </div>
              </div>
            </div>

            {/* TRANSACTION & VERIFICATION AUDIT TRAIL */}
            <div className="bg-[#141419] border border-zinc-800/90 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                <h3 className="font-bold text-white uppercase tracking-wider text-xs flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Transaction & Verification Audit Details
                </h3>
                <span className="text-[10px] text-zinc-500 font-mono">Verified Logs</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block font-sans">Payment Method</span>
                  <span className="text-white font-bold uppercase text-sm mt-0.5 block">
                    {record.paymentMethod || 'UPI / Cash'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block font-sans">UPI / Bank Reference</span>
                  <span className="text-blue-400 font-bold text-xs mt-0.5 block break-all">
                    {upiTxnId || 'N/A (Cash / Counter)'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block font-sans">Transaction Timestamp</span>
                  <span className="text-zinc-300 text-xs mt-0.5 block">
                    {record.paymentDate || record.timestamp || 'Recorded'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-500 uppercase block font-sans">Verified By</span>
                  <span className="text-emerald-400 font-bold text-xs mt-0.5 block">
                    {record.verifiedBy || 'Admin Official'} {record.verifiedDate ? `(${record.verifiedDate})` : ''}
                  </span>
                </div>

                {record.remarks && (
                  <div className="col-span-1 sm:col-span-2 md:col-span-4 p-3 bg-zinc-900 border border-zinc-800 rounded-xl font-sans">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">
                      Transaction Remarks & Notes
                    </span>
                    <span className="text-zinc-300 italic">{record.remarks || record.adminRemarks}</span>
                  </div>
                )}

                {record.rejectionReason && (
                  <div className="col-span-1 sm:col-span-2 md:col-span-4 p-3 bg-red-950/40 border border-red-500/30 rounded-xl font-sans">
                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block mb-0.5">
                      Rejection Reason
                    </span>
                    <span className="text-red-200">{record.rejectionReason}</span>
                  </div>
                )}
              </div>

              {/* Payment Screenshot Proof */}
              {screenshot && (
                <div className="pt-3 border-t border-zinc-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-blue-400" />
                      Uploaded Payment Proof Screenshot
                    </span>
                    <a
                      href={screenshot}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                    >
                      <span>Open in New Tab</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="relative group max-w-sm rounded-xl overflow-hidden border border-zinc-800 bg-black/60">
                    <img
                      src={screenshot}
                      alt="Payment Receipt Screenshot"
                      className="max-h-48 w-auto object-contain mx-auto cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setIsZoomingScreenshot(true)}
                    />
                    <div
                      onClick={() => setIsZoomingScreenshot(true)}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold gap-1 transition-opacity cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Click to Zoom</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* FOOTER */}
          <div className="p-4 px-6 bg-[#141419] border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500 shrink-0 font-mono">
            <div>Official AB GYM Payment Record • Ref: {feeRef}</div>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Close Details
            </button>
          </div>
        </motion.div>
      </div>

      {/* FULL SCREENSHOT ZOOM MODAL */}
      {isZoomingScreenshot && screenshot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md"
          onClick={() => setIsZoomingScreenshot(false)}
        >
          <div className="relative max-w-3xl max-h-[90vh] p-2 bg-[#0F0F12] border border-zinc-800 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setIsZoomingScreenshot(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/80 text-white hover:bg-zinc-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={screenshot}
              alt="Zoomed Payment Screenshot"
              className="max-h-[85vh] w-auto object-contain rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
