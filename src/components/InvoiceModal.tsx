import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Member, FeePaymentRecord } from '../types';
import { getStoredSettings } from '../lib/storage';
import { downloadMemberInvoicePDF, formatINR, parseAmount } from '../lib/pdf';
import { Download, X, FileText, CheckCircle2, ShieldCheck, Calendar, IndianRupee, Loader2 } from 'lucide-react';
import abGymLogo from '../assets/logo';

interface InvoiceModalProps {
  member: Member;
  payment?: FeePaymentRecord;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ member, payment, onClose }) => {
  const settings = getStoredSettings();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);

  const gymName = (settings.gymName || 'AB GYM').toUpperCase();
  const gymTagline = settings.tagline || 'Stronger Body, Stronger You';
  const gymPhone = settings.phone || '+91 85878 82431';
  const gymEmail = settings.email || 'support@abgym.com';
  const gymAddress = settings.address || 'Civil Lines, Near Stadium, New Delhi';

  const rollNumber = member.rollNumber || member.rollNo || 'ABG-26-0000';
  const memberName = (member.fullName || member.name || 'Valued Member').trim();
  const planName = member.planName || member.selectedPlan || 'Standard Fitness Plan';

  const todayStr = new Date().toISOString().split('T')[0];
  const invoiceNo = `INV-ABG-${new Date().getFullYear()}-${rollNumber.replace(/[^a-zA-Z0-9]/g, '')}`;
  const invoiceDate = payment?.paymentDate || member.lastPaymentDate || todayStr;
  const validFrom = member.joiningDate || member.joinDate || invoiceDate;
  const validUntil = member.membershipExpiry || member.expiryDate || 'Active';

  // Financial calculations
  const regFee = member.registrationFeePaid || (payment?.registrationRef ? 100 : 0);
  const planFee = parseAmount(payment?.currentFeeAmount || member.finalFeeAmount || member.regularPlanAmount || 999);
  const discount = parseAmount(payment?.discountAmount || member.discountAmount || 0);
  const prevBal = parseAmount(payment?.previousBalance || member.previousBalance || 0);
  const subtotal = planFee + regFee;
  const totalPayable = Math.max(0, subtotal - discount + prevBal);
  const amountPaid = parseAmount(payment?.amountPaid || member.lastPaymentAmount || totalPayable);
  const balanceDue = Math.max(0, totalPayable - amountPaid);
  const paymentMethod = payment?.paymentMethod || member.paymentMethod || 'UPI / Online';
  const upiTxnId = payment?.upiTransactionId || payment?.upiRef || member.upiTransactionId || 'VERIFIED-GATEWAY';

  const handleDownloadInvoice = async () => {
    try {
      setIsGenerating(true);
      await downloadMemberInvoicePDF(member, settings, payment);
      setIsDownloaded(true);
      setTimeout(() => setIsDownloaded(false), 3000);
    } catch (err) {
      console.error('Failed to download invoice PDF:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-[#0F0F14] border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-6 my-8 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white text-sm sm:text-base font-mono">
                Official Membership Invoice
              </span>
              <p className="text-[11px] text-zinc-400 font-sans">
                Tax Invoice & Membership Fee Breakdown
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invoice Preview Card */}
        <div className="bg-[#14141A] border border-zinc-800 rounded-2xl p-5 space-y-5">
          {/* Top Brand & Invoice Metadata */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-zinc-800/80">
            <div className="flex items-center gap-3">
              <img
                src={abGymLogo}
                alt="Gym Logo"
                referrerPolicy="no-referrer"
                className="h-9 w-auto object-contain"
              />
              <div>
                <h3 className="font-mono font-black text-white text-base tracking-wide">
                  {gymName}
                </h3>
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                  {gymTagline}
                </p>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  {gymAddress} • {gymPhone}
                </p>
              </div>
            </div>

            <div className="text-right sm:self-center font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-blue-950/70 border border-blue-500/30 text-blue-400 text-xs font-bold block">
                {invoiceNo}
              </span>
              <span className="text-[10px] text-zinc-400 mt-1 block">
                Date: {invoiceDate}
              </span>
            </div>
          </div>

          {/* Member & Subscription Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-[#0D0D12] border border-zinc-800/80 rounded-xl text-xs">
            <div className="space-y-1">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                Billed To (Member)
              </span>
              <p className="font-bold text-white text-sm">{memberName}</p>
              <p className="text-blue-400 font-mono font-bold">Roll No: {rollNumber}</p>
              <p className="text-zinc-400">{member.phone}</p>
            </div>

            <div className="space-y-1 sm:text-right">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                Subscription Plan
              </span>
              <p className="font-bold text-emerald-400 text-sm">{planName}</p>
              <p className="text-zinc-400">Valid: {validFrom} → <strong className="text-white font-mono">{validUntil}</strong></p>
              <p className="text-zinc-400">Payment: {paymentMethod}</p>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Fee Breakdown
            </div>
            <div className="border border-zinc-800 rounded-xl overflow-hidden font-mono text-xs">
              <div className="grid grid-cols-12 bg-[#181822] p-2.5 text-zinc-400 font-bold border-b border-zinc-800 text-[10px] uppercase">
                <div className="col-span-7">Description</div>
                <div className="col-span-2 text-right">Qty</div>
                <div className="col-span-3 text-right">Amount</div>
              </div>

              <div className="grid grid-cols-12 p-2.5 border-b border-zinc-800/50 text-zinc-300">
                <div className="col-span-7 font-sans font-medium text-white">{planName} Subscription</div>
                <div className="col-span-2 text-right text-zinc-400">1</div>
                <div className="col-span-3 text-right font-bold text-white">{formatINR(planFee)}</div>
              </div>

              {regFee > 0 && (
                <div className="grid grid-cols-12 p-2.5 border-b border-zinc-800/50 text-zinc-300">
                  <div className="col-span-7 font-sans font-medium text-white">One-time Registration & RFID Pass</div>
                  <div className="col-span-2 text-right text-zinc-400">1</div>
                  <div className="col-span-3 text-right font-bold text-white">{formatINR(regFee)}</div>
                </div>
              )}

              {prevBal > 0 && (
                <div className="grid grid-cols-12 p-2.5 border-b border-zinc-800/50 text-amber-400">
                  <div className="col-span-7 font-sans">Previous Outstanding Balance</div>
                  <div className="col-span-2 text-right">-</div>
                  <div className="col-span-3 text-right font-bold">{formatINR(prevBal)}</div>
                </div>
              )}

              {discount > 0 && (
                <div className="grid grid-cols-12 p-2.5 border-b border-zinc-800/50 text-emerald-400">
                  <div className="col-span-7 font-sans">Discount / Special Concession</div>
                  <div className="col-span-2 text-right">-</div>
                  <div className="col-span-3 text-right font-bold">-{formatINR(discount)}</div>
                </div>
              )}

              {/* Total Row */}
              <div className="grid grid-cols-12 p-3 bg-[#0E0E14] text-white font-bold text-xs border-t border-zinc-700">
                <div className="col-span-7">Total Payable Amount</div>
                <div className="col-span-5 text-right text-emerald-400 text-sm">{formatINR(totalPayable)}</div>
              </div>

              <div className="grid grid-cols-12 p-2.5 bg-[#0E0E14] border-t border-zinc-800 text-xs">
                <div className="col-span-7 text-zinc-400">Amount Paid ({paymentMethod})</div>
                <div className="col-span-5 text-right font-bold text-emerald-400">{formatINR(amountPaid)}</div>
              </div>

              {balanceDue > 0 ? (
                <div className="grid grid-cols-12 p-2.5 bg-red-950/30 border-t border-red-500/30 text-xs text-red-400 font-bold">
                  <div className="col-span-7">Remaining Balance Due</div>
                  <div className="col-span-5 text-right">{formatINR(balanceDue)}</div>
                </div>
              ) : (
                <div className="grid grid-cols-12 p-2 bg-emerald-950/20 border-t border-emerald-500/20 text-[11px] text-emerald-400 font-bold">
                  <div className="col-span-7 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Payment Status: Fully Settled (₹0 Balance)</span>
                  </div>
                  <div className="col-span-5 text-right font-mono">TXN: {upiTxnId}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDownloadInvoice}
            disabled={isGenerating}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-900/30 transition-all cursor-pointer disabled:opacity-60"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Generating Invoice PDF...</span>
              </>
            ) : isDownloaded ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Invoice PDF Downloaded!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-white" />
                <span>Download Official Invoice PDF</span>
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};
