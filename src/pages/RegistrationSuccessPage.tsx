import React from 'react';
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  Home,
  CreditCard,
  Search,
  ShieldCheck,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export interface RegistrationSuccessData {
  registrationReferenceNumber: string;
  fullName: string;
  selectedPlan: string;
  status?: string;
}

interface RegistrationSuccessPageProps {
  data?: RegistrationSuccessData | null;
  onNavigate: (path: string, params?: Record<string, string>) => void;
}

export const RegistrationSuccessPage: React.FC<RegistrationSuccessPageProps> = ({
  data,
  onNavigate,
}) => {
  const regRef = data?.registrationReferenceNumber || 'ABG-REG-PENDING';
  const name = data?.fullName || 'Athlete';
  const plan = data?.selectedPlan || 'Selected Membership Plan';
  const status = data?.status || 'Pending Verification';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-[#f5f5f4]">
      <div className="bg-[#0F0F12] border border-zinc-800 rounded-3xl p-8 sm:p-12 shadow-2xl space-y-8 text-center relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-1/2 translate-x-1/2 w-64 h-32 bg-amber-500/10 blur-3xl rounded-full" />

        {/* Header Icon & Brand Logo */}
        <div className="relative z-10 space-y-4">
          <div className="flex justify-center">
            <img
              src="/assets/ab-gym-logo.png"
              alt="AB Gym Official Logo"
              referrerPolicy="no-referrer"
              loading="eager"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallbackEl = document.getElementById('reg-success-logo-fallback');
                if (fallbackEl) fallbackEl.style.display = 'flex';
              }}
              className="h-20 w-auto object-contain filter drop-shadow-[0_0_16px_rgba(37,99,235,0.4)]"
            />
            <div
              id="reg-success-logo-fallback"
              style={{ display: 'none' }}
              className="w-20 h-20 mx-auto rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-400 items-center justify-center shadow-xl"
            >
              <CheckCircle2 className="w-10 h-10" />
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase tracking-widest font-mono">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            REGISTRATION SUBMITTED
          </span>

          <h1 className="text-3xl sm:text-4xl font-black text-white font-display uppercase tracking-tight">
            APPLICATION RECEIVED
          </h1>
        </div>

        {/* Message Box */}
        <div className="bg-amber-950/30 border border-amber-500/30 p-5 rounded-2xl text-left space-y-2">
          <p className="text-sm text-amber-200 font-medium leading-relaxed">
            “Your registration has been submitted and is pending admin verification. Your Roll Number will be generated only after admin approval.”
          </p>
        </div>

        {/* Details Card */}
        <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 space-y-4 text-left font-mono">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/80 pb-3 gap-1">
            <span className="text-xs text-zinc-400 font-sans font-semibold">Registration Reference Number:</span>
            <span className="text-base font-bold text-red-500 select-all">{regRef}</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/80 pb-3 gap-1">
            <span className="text-xs text-zinc-400 font-sans font-semibold">Member Name:</span>
            <span className="text-sm font-bold text-white font-sans">{name}</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/80 pb-3 gap-1">
            <span className="text-xs text-zinc-400 font-sans font-semibold">Selected Plan:</span>
            <span className="text-sm font-bold text-white font-sans">{plan}</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-xs text-zinc-400 font-sans font-semibold">Registration Status:</span>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase font-sans">
              {status}
            </span>
          </div>
        </div>

        {/* Important Notice */}
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-left text-xs text-zinc-400 leading-relaxed">
          <strong className="text-white">Note:</strong> Please save your Registration Reference Number (<span className="text-red-400 font-mono font-bold">{regRef}</span>). You will need it together with the first 4 digits of your registered mobile number to make your fee payment and check registration verification status.
        </div>

        {/* Navigation Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => onNavigate('/pay-fee', { registrationRef: regRef })}
            className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>Pay Membership Fee Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => onNavigate('/pay-fee', { registrationRef: regRef })}
            className="w-full sm:w-auto px-5 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-zinc-700/60"
          >
            <Search className="w-4 h-4 text-blue-400" />
            <span>Check Registration Status</span>
          </button>

          <button
            onClick={() => onNavigate('/')}
            className="w-full sm:w-auto px-4 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-semibold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-zinc-800"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </button>
        </div>
      </div>
    </div>
  );
};
