import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Member } from '../types';
import { getStoredSettings } from '../lib/storage';
import { downloadMemberCardPDF } from '../lib/pdf';
import { Download, X, Calendar, ShieldCheck, Loader2, CheckCircle2, QrCode, Layers, Info, Check } from 'lucide-react';
import abGymLogo from '../assets/logo';

interface MemberCardModalProps {
  member: Member;
  onClose: () => void;
  onDownload?: () => void;
}

export const MemberCardModal: React.FC<MemberCardModalProps> = ({ member, onClose, onDownload }) => {
  const settings = getStoredSettings();
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
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
  const validFrom = member.joiningDate || member.joinDate || '2026-01-01';
  const validUntil = member.membershipExpiry || member.expiryDate || 'Active';
  const statusStr = (member.status || 'Active').toUpperCase();
  const isActive = statusStr.includes('ACTIVE') || statusStr === 'ACTIVE';

  // Extract initials for photo avatar
  const initials = memberName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0].toUpperCase())
    .join('') || 'AB';

  const safeQrPayload = JSON.stringify({
    gym: gymName,
    id: rollNumber,
    name: memberName,
    plan: planName,
    status: 'ACTIVE',
    validUntil: validUntil
  });

  const handleDownloadCard = async () => {
    try {
      setIsGenerating(true);
      if (onDownload) {
        await onDownload();
      } else {
        await downloadMemberCardPDF(member, settings);
      }
      setIsDownloaded(true);
      setTimeout(() => setIsDownloaded(false), 3000);
    } catch (err) {
      console.error('Failed to download card PDF:', err);
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
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl bg-[#0F0F14] border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-5 my-8"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base font-mono">
                Official Member ID Card
              </h3>
              <p className="text-[11px] text-zinc-400 font-sans">
                Standard CR80 Wallet-Size Membership Pass
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

        {/* Side Switcher Tabs */}
        <div className="flex items-center justify-center gap-2 p-1 bg-[#14141A] border border-zinc-800 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveSide('front')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSide === 'front'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Front Side (Identity)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSide('back')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSide === 'back'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Back Side (Rules & Verification)</span>
          </button>
        </div>

        {/* Card Canvas Container */}
        <div className="relative w-full aspect-[1.586/1] rounded-2xl p-0.5 bg-gradient-to-br from-emerald-500/30 via-zinc-800 to-blue-500/20 shadow-2xl">
          <AnimatePresence mode="wait">
            {activeSide === 'front' ? (
              <motion.div
                key="front-side"
                initial={{ opacity: 0, rotateY: -15 }}
                animate={{ opacity: 1, rotateY: 0 }}
                exit={{ opacity: 0, rotateY: 15 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full bg-[#0A0D14] rounded-[14px] p-4 sm:p-5 flex flex-col justify-between overflow-hidden relative border border-zinc-700/60 text-white select-none"
              >
                {/* Top Accent Line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

                {/* Header: Logo, Brand & Card Badge */}
                <div className="flex items-center justify-between z-10">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={abGymLogo}
                      alt="AB Gym Logo"
                      referrerPolicy="no-referrer"
                      className="h-8 sm:h-9 w-auto object-contain drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                    />
                    <div>
                      <h4 className="font-mono font-black text-white text-xs sm:text-sm tracking-wider leading-tight">
                        {gymName}
                      </h4>
                      <p className="text-[8px] sm:text-[9px] text-emerald-400 font-bold uppercase tracking-wide">
                        {gymTagline}
                      </p>
                    </div>
                  </div>

                  <div className="px-2.5 py-1 rounded-full bg-zinc-800/80 border border-zinc-700 text-[9px] sm:text-[10px] font-bold text-zinc-300 font-mono tracking-wider">
                    MEMBERSHIP CARD
                  </div>
                </div>

                {/* Card Middle: Avatar, Details, QR */}
                <div className="grid grid-cols-12 gap-3 items-center z-10 my-auto">
                  {/* Photo Frame + Status Badge */}
                  <div className="col-span-3 flex flex-col items-center gap-1.5">
                    <div className="w-14 h-16 sm:w-16 sm:h-18 rounded-xl bg-gradient-to-b from-zinc-800 to-zinc-900 border-2 border-emerald-500/50 flex flex-col items-center justify-center p-1 shadow-inner relative overflow-hidden">
                      <span className="text-sm sm:text-base font-black text-emerald-400 font-mono">
                        {initials}
                      </span>
                      <span className="text-[7px] text-zinc-400 uppercase tracking-tight mt-0.5">
                        PHOTO
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-black text-[8px] font-black uppercase tracking-wider shadow-sm">
                      ● ACTIVE
                    </span>
                  </div>

                  {/* Member Details */}
                  <div className="col-span-6 space-y-1 pl-1">
                    <div>
                      <p className="text-xs sm:text-sm font-black text-white uppercase tracking-tight line-clamp-1">
                        {memberName}
                      </p>
                      <div className="inline-block px-2 py-0.5 bg-blue-950/70 border border-blue-500/30 text-blue-400 font-mono text-[9px] sm:text-[10px] font-bold rounded-md mt-0.5">
                        ID: {rollNumber}
                      </div>
                    </div>

                    <div className="space-y-0.5 pt-0.5">
                      <span className="text-[8px] text-zinc-400 uppercase tracking-wider block font-bold">
                        Plan: <strong className="text-white normal-case font-sans">{planName}</strong>
                      </span>
                      <div className="text-[8px] text-zinc-400 flex items-center gap-2">
                        <span>From: <strong className="text-zinc-300 font-mono">{validFrom}</strong></span>
                        <span>Till: <strong className="text-emerald-400 font-mono">{validUntil}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* QR Container */}
                  <div className="col-span-3 flex flex-col items-center justify-center bg-white p-1 rounded-xl shadow-md">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(safeQrPayload)}`}
                      alt={`Verification QR for ${rollNumber}`}
                      className="w-11 h-11 sm:w-13 sm:h-13 object-contain"
                    />
                    <span className="text-[6px] sm:text-[7px] text-zinc-900 font-bold font-mono tracking-tight mt-0.5">
                      SCAN VERIFY
                    </span>
                  </div>
                </div>

                {/* Footer Bar */}
                <div className="flex items-center justify-between z-10 pt-1.5 border-t border-zinc-800 text-[8px] sm:text-[9px] text-zinc-400 font-mono">
                  <span>{gymName} • Official Access Pass</span>
                  <span className="text-emerald-400 font-bold">Valid for Gym Entry</span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="back-side"
                initial={{ opacity: 0, rotateY: 15 }}
                animate={{ opacity: 1, rotateY: 0 }}
                exit={{ opacity: 0, rotateY: -15 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full bg-[#0A0D14] rounded-[14px] p-4 sm:p-5 flex flex-col justify-between overflow-hidden relative border border-zinc-700/60 text-white select-none"
              >
                {/* Top Accent Line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-400 to-blue-600" />

                {/* Header */}
                <div className="flex items-center justify-between z-10 border-b border-zinc-800 pb-1.5">
                  <h4 className="font-mono font-black text-white text-xs sm:text-sm tracking-wider">
                    {gymName}
                  </h4>
                  <span className="text-[9px] sm:text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-mono">
                    MEMBERSHIP INFORMATION
                  </span>
                </div>

                {/* Middle Content */}
                <div className="grid grid-cols-12 gap-3 items-center z-10 my-auto text-[8px] sm:text-[9px]">
                  {/* Left Column: Instructions & Rules */}
                  <div className="col-span-8 space-y-1.5">
                    <div className="p-1.5 bg-zinc-900/90 border border-zinc-800 rounded-lg text-zinc-300">
                      <span className="text-blue-400 font-bold block uppercase tracking-wider text-[7px] sm:text-[8px]">
                        Verification Instructions
                      </span>
                      Present this card at turnstiles / reception for facility & locker access.
                    </div>

                    <div className="space-y-0.5 text-zinc-400">
                      <p className="text-emerald-400 font-bold uppercase tracking-wide text-[7.5px]">Important Rules:</p>
                      <p>• Clean sports shoes & towel required.</p>
                      <p>• Re-rack weights and sanitize equipment.</p>
                      <p>• Card is non-transferable.</p>
                    </div>

                    <div className="text-[7.5px] text-zinc-400 pt-0.5">
                      <p>{gymAddress} • Helpline: {gymPhone}</p>
                    </div>
                  </div>

                  {/* Right Column: QR + Seal */}
                  <div className="col-span-4 flex flex-col items-center gap-1">
                    <div className="bg-white p-1 rounded-xl shadow-md">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(safeQrPayload)}`}
                        alt={`Verification QR for ${rollNumber}`}
                        className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
                      />
                    </div>
                    <div className="px-2 py-0.5 bg-zinc-800 rounded text-[7px] text-emerald-400 font-bold uppercase tracking-wider">
                      AUTHENTIC PASS
                    </div>
                  </div>
                </div>

                {/* Footer Notice */}
                <div className="text-center z-10 pt-1.5 border-t border-zinc-800 text-[7.5px] sm:text-[8px] text-zinc-400">
                  <span className="text-white font-bold">This card is the property of {gymName}.</span> If found, please return to Front Desk.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDownloadCard}
            disabled={isGenerating}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-900/30 transition-all cursor-pointer disabled:opacity-60"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Generating Wallet-Size PDF Card...</span>
              </>
            ) : isDownloaded ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Wallet Card PDF Downloaded!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-white" />
                <span>Download Member ID Card PDF</span>
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

