import React from 'react';
import { FeePaymentRecord } from '../types';
import { getStoredSettings } from '../lib/storage';
import { downloadFeeReceiptPDF } from '../lib/pdf';
import { CheckCircle2, Download, Printer, X, Dumbbell, ShieldCheck } from 'lucide-react';
import abGymLogo from '../assets/ab-gym-logo.png';

interface ReceiptModalProps {
  record: FeePaymentRecord;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ record, onClose }) => {
  const settings = getStoredSettings();

  const handleDownloadPDF = () => {
    downloadFeeReceiptPDF(record, settings);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-[#050505] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 px-8 bg-[#0A0A0A] border-b border-white/10">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#2563EB]" />
            <span className="font-black text-white font-display text-sm uppercase tracking-wider">OFFICIAL PAYMENT RECEIPT</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Canvas */}
        <div className="p-8 overflow-y-auto space-y-6 text-[#f5f5f4]" id="printable-receipt-content">
          {/* Gym Brand Header */}
          <div className="bg-[#0A0A0A] p-6 rounded-2xl border border-white/10 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <img
                  src={abGymLogo}
                  alt="AB Gym Official Logo"
                  referrerPolicy="no-referrer"
                  loading="eager"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallbackEl = document.getElementById('receipt-logo-fallback');
                    if (fallbackEl) fallbackEl.style.display = 'flex';
                  }}
                  className="h-16 w-auto object-contain filter drop-shadow-[0_0_12px_rgba(37,99,235,0.3)]"
                />
                <div
                  id="receipt-logo-fallback"
                  style={{ display: 'none' }}
                  className="items-center gap-3"
                >
                  <div className="w-12 h-12 rounded-full border border-white/20 bg-black flex items-center justify-center">
                    <span className="font-black text-xs text-[#2563EB] font-mono">AB</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white font-display tracking-tight uppercase">
                      AB GYM<span className="text-[#2563EB]">©</span>
                    </h2>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.25em]">{settings.tagline}</p>
                  </div>
                </div>
              </div>

              <div className="text-center sm:text-right">
                <span className="inline-block px-3 py-1 rounded-full bg-[#2563EB] text-white text-[9px] font-black uppercase tracking-[0.2em] mb-1">
                  OFFICIAL RECEIPT
                </span>
                <p className="text-xs font-mono text-white/60">REF: {record.feeReferenceNumber}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">{record.paymentDate}</p>
              </div>
            </div>
          </div>

          {/* Member & Plan Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Member Details */}
            <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 space-y-2 text-sm">
              <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider border-b border-zinc-800 pb-1.5">
                Member Information
              </h3>
              <div className="flex justify-between">
                <span className="text-zinc-400">Reg Reference:</span>
                <span className="font-mono font-bold text-red-400">{record.registrationRef || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Roll Number:</span>
                <span className="font-mono font-bold text-zinc-300">
                  {record.rollNumber || 'Unassigned (Pending Approval)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Full Name:</span>
                <span className="font-semibold text-white">{record.memberName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Phone:</span>
                <span className="text-zinc-300">{record.memberPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Email:</span>
                <span className="text-zinc-300 text-xs">{record.memberEmail || 'N/A'}</span>
              </div>
            </div>

            {/* Plan Details */}
            <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 space-y-2 text-sm">
              <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider border-b border-zinc-800 pb-1.5">
                Subscription Status
              </h3>
              <div className="flex justify-between">
                <span className="text-zinc-400">Plan Name:</span>
                <span className="font-semibold text-white">{record.planName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">New Membership Expiry:</span>
                <span className="font-bold text-emerald-400">{record.newExpiryDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Payment Status:</span>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded ${
                    record.status === 'Successful'
                      ? 'text-emerald-400 bg-emerald-950/60'
                      : 'text-amber-300 bg-amber-950/60'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {record.status}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Summary Box */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="bg-zinc-800/80 px-4 py-2.5 flex justify-between text-xs font-bold text-zinc-300 uppercase tracking-wider border-b border-zinc-700">
              <span>Payment Breakdown</span>
              <span>Amount</span>
            </div>
            <div className="p-4 space-y-2.5 font-mono text-xs">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Selected Plan:</span>
                <span className="text-white font-bold">{record.planName || record.selectedPlan || 'N/A'}</span>
              </div>
              {Number(record.regularPlanAmount || 0) > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Regular Plan Amount:</span>
                  <span className="text-zinc-300">₹{(Number(record.regularPlanAmount)).toLocaleString('en-IN')}</span>
                </div>
              )}
              {record.feePriceType && (
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Fee Price Type:</span>
                  <span className="text-emerald-400 font-bold">{record.feePriceType}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Actual Fee Amount:</span>
                <span className="text-zinc-200 font-bold">₹{(record.currentFeeAmount ?? 0).toLocaleString('en-IN')}</span>
              </div>
              {record.offerNote && (
                <div className="flex justify-between items-center bg-zinc-950 p-2 rounded border border-zinc-800">
                  <span className="text-zinc-400 text-[11px]">Offer Note:</span>
                  <span className="text-amber-300 font-semibold text-[11px]">{record.offerNote}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Previous Balance:</span>
                <span className="text-amber-400">₹{(record.previousBalance ?? 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center font-bold text-white border-t border-zinc-800 pt-2">
                <span>Total Payable Amount:</span>
                <span className="text-emerald-400">₹{(record.totalPayableAmount ?? ((record.previousBalance || 0) + (record.currentFeeAmount || 0))).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center font-bold text-white">
                <span>Amount Paid:</span>
                <span className="text-blue-400 text-sm">₹{(record.amountPaid ?? record.currentFeeAmount ?? 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Remaining Balance:</span>
                <span className={Number(record.remainingBalance || 0) > 0 ? 'text-amber-400 font-bold' : 'text-zinc-300'}>
                  ₹{(record.remainingBalance ?? 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Payment Type:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  record.paymentType === 'Partial Payment' || Number(record.remainingBalance || 0) > 0
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {record.paymentType || (Number(record.remainingBalance || 0) > 0 ? 'Partial Payment' : 'Full Payment')}
                </span>
              </div>

              {Number(record.remainingBalance || 0) > 0 && (
                <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-lg text-amber-200 text-xs font-sans font-semibold">
                  ⚠️ Partial payment received. ₹{record.remainingBalance} is still due.
                </div>
              )}

              {record.remarks && (
                <p className="text-xs text-zinc-400 italic bg-zinc-950 p-2 rounded border border-zinc-800 font-sans">
                  Note: {record.remarks}
                </p>
              )}
            </div>
          </div>

          <div className="text-center text-xs text-zinc-500 pt-2">
            Thank you for being part of AB Gym! Please keep this receipt for record verification.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 px-6 bg-zinc-900 border-t border-zinc-800 flex flex-col sm:flex-row gap-3 justify-end">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold border border-zinc-700 transition-colors"
          >
            <Printer className="w-4 h-4 text-zinc-400" />
            <span>Print Receipt</span>
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
};
