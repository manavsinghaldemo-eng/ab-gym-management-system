import React from 'react';
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  Home,
  Receipt,
  ShieldCheck,
} from 'lucide-react';
import abGymLogo from '../assets/logo';

export interface FeePaymentSuccessData {
  feeReferenceNumber: string;
  registrationReferenceNumber: string;
  rollNumber?: string;
  memberName: string;
  amountSubmitted: number | string;
  paymentStatus: string;
  currentFee?: number | string;
  previousBalance?: number | string;
  discount?: number | string;
  totalPayable?: number | string;
  amountPaid?: number | string;
  remainingBalance?: number | string;
}

interface FeePaymentSuccessPageProps {
  data?: FeePaymentSuccessData | null;
  onNavigate: (path: string, params?: Record<string, string>) => void;
}

export const FeePaymentSuccessPage: React.FC<FeePaymentSuccessPageProps> = ({
  data,
  onNavigate,
}) => {
  const feeRef = data?.feeReferenceNumber || 'ABG-FEE-SUBMITTED';
  const regRef = data?.registrationReferenceNumber || 'N/A';
  const rollNum = data?.rollNumber || '';
  const memberName = data?.memberName || 'Member';
  const amountSubmitted = data?.amountPaid ?? data?.amountSubmitted ?? 0;
  const paymentStatus = data?.paymentStatus || 'Pending Verification';
  const remainingBal = Number(data?.remainingBalance || 0);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-[#f5f5f4]">
      <div className="bg-[#0F0F12] border border-zinc-800 rounded-3xl p-8 sm:p-12 shadow-2xl space-y-8 text-center relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-1/2 translate-x-1/2 w-64 h-32 bg-emerald-500/10 blur-3xl rounded-full" />

        {/* Header Icon & Brand Logo */}
        <div className="relative z-10 space-y-4">
          <div className="flex justify-center">
            <img
              src={abGymLogo}
              alt="AB Gym Official Logo"
              referrerPolicy="no-referrer"
              loading="eager"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallbackEl = document.getElementById('fee-success-logo-fallback');
                if (fallbackEl) fallbackEl.style.display = 'flex';
              }}
              className="h-20 w-auto object-contain filter drop-shadow-[0_0_16px_rgba(37,99,235,0.4)]"
            />
            <div
              id="fee-success-logo-fallback"
              style={{ display: 'none' }}
              className="w-20 h-20 mx-auto rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 items-center justify-center shadow-xl"
            >
              <CheckCircle2 className="w-10 h-10" />
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase tracking-widest font-mono">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            FEE SUBMISSION SUCCESSFUL
          </span>

          <h1 className="text-3xl sm:text-4xl font-black text-white font-display uppercase tracking-tight">
            PAYMENT RECORDED
          </h1>
        </div>

        {/* Message Box */}
        <div className="bg-emerald-950/30 border border-emerald-500/30 p-5 rounded-2xl text-left space-y-2">
          <p className="text-sm text-emerald-200 font-medium leading-relaxed">
            “Your membership fee payment of <strong className="text-white">₹{amountSubmitted}</strong> has been saved and is pending admin payment verification.”
          </p>
        </div>

        {/* Conditional Carry-Forward Notice */}
        {remainingBal > 0 && (
          <div className="bg-amber-950/40 border border-amber-500/40 p-4 rounded-2xl text-left flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <p className="text-sm font-bold text-amber-300 font-mono">
              ₹{remainingBal} will be added to your next fee payment.
            </p>
          </div>
        )}

        {/* Details Card */}
        <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 space-y-4 text-left font-mono">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/80 pb-3 gap-1">
            <span className="text-xs text-zinc-400 font-sans font-semibold">Fee Reference Number:</span>
            <span className="text-base font-bold text-blue-400 select-all">{feeRef}</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/80 pb-3 gap-1">
            <span className="text-xs text-zinc-400 font-sans font-semibold">Registration Reference Number:</span>
            <span className="text-sm font-bold text-zinc-200 select-all">{regRef || 'N/A'}</span>
          </div>

          {rollNum && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/80 pb-3 gap-1">
              <span className="text-xs text-zinc-400 font-sans font-semibold">Roll Number:</span>
              <span className="text-sm font-bold text-red-400">{rollNum}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/80 pb-3 gap-1">
            <span className="text-xs text-zinc-400 font-sans font-semibold">Member Name:</span>
            <span className="text-sm font-bold text-white font-sans">{memberName}</span>
          </div>

          {data?.currentFee !== undefined && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/80 pb-3 gap-1">
              <span className="text-xs text-zinc-400 font-sans font-semibold">Current Fee:</span>
              <span className="text-sm font-bold text-zinc-200">₹{data.currentFee}</span>
            </div>
          )}

          {data?.previousBalance !== undefined && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/80 pb-3 gap-1">
              <span className="text-xs text-zinc-400 font-sans font-semibold">Previous Balance:</span>
              <span className="text-sm font-bold text-amber-400">₹{data.previousBalance}</span>
            </div>
          )}

          {data?.discount !== undefined && Number(data.discount) > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/80 pb-3 gap-1">
              <span className="text-xs text-zinc-400 font-sans font-semibold">Discount:</span>
              <span className="text-sm font-bold text-emerald-400">-₹{data.discount}</span>
            </div>
          )}

          {data?.totalPayable !== undefined && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/80 pb-3 gap-1">
              <span className="text-xs text-zinc-400 font-sans font-semibold">Total Payable:</span>
              <span className="text-sm font-bold text-white">₹{data.totalPayable}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/80 pb-3 gap-1">
            <span className="text-xs text-zinc-400 font-sans font-semibold">Amount Paid:</span>
            <span className="text-sm font-bold text-emerald-400">₹{amountSubmitted}</span>
          </div>

          {data?.remainingBalance !== undefined && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/80 pb-3 gap-1">
              <span className="text-xs text-zinc-400 font-sans font-semibold">Remaining Balance:</span>
              <span className={`text-sm font-bold ${remainingBal > 0 ? 'text-amber-400' : 'text-zinc-400'}`}>₹{data.remainingBalance}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-xs text-zinc-400 font-sans font-semibold">Payment Status:</span>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase font-sans">
              {paymentStatus}
            </span>
          </div>
        </div>

        {/* Important Notice */}
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-left text-xs text-zinc-400 leading-relaxed flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-white">Note:</strong> Your Fee Reference Number is <span className="text-blue-400 font-mono font-bold">{feeRef}</span>. The gym administration will verify your payment transaction and update your membership record.
          </div>
        </div>

        {/* Navigation Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => onNavigate('/pay-fee')}
            className="w-full sm:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Receipt className="w-4 h-4" />
            <span>Pay Another Fee</span>
          </button>

          <button
            onClick={() => onNavigate('/')}
            className="w-full sm:w-auto px-5 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-zinc-700/60"
          >
            <Home className="w-4 h-4" />
            <span>Go to Home</span>
          </button>
        </div>
      </div>
    </div>
  );
};
