import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Member } from '../types';
import { getStoredSettings } from '../lib/storage';
import { downloadMemberCardPDF } from '../lib/pdf';
import { Download, X, Calendar, Phone, ShieldCheck, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import abGymLogo from '../assets/logo';

interface MemberCardModalProps {
  member: Member;
  onClose: () => void;
}

export const MemberCardModal: React.FC<MemberCardModalProps> = ({ member, onClose }) => {
  const settings = getStoredSettings();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);

  const handleDownloadCard = async () => {
    try {
      setIsGenerating(true);
      await downloadMemberCardPDF(member, settings);
      setIsDownloaded(true);
      setTimeout(() => setIsDownloaded(false), 3000);
    } catch (err) {
      console.error('Failed to download card PDF:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const statusStr = (member.status || 'Active').toUpperCase();
  const isActive = statusStr.includes('ACTIVE');
  const isExpired = statusStr.includes('EXPIRED');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-[#0F0F14] border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-6"
      >
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white text-sm sm:text-base font-mono">
                Official Gym Membership Pass
              </span>
              <p className="text-[10px] text-zinc-400 font-sans">
                Verified Identity Pass with embedded dynamic QR Code
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

        {/* Digital ID Card Preview */}
        <div className="relative w-full aspect-[1.6/1] bg-gradient-to-br from-[#121218] via-[#181824] to-[#0D0D12] border-2 border-emerald-500/40 rounded-2xl p-5 shadow-2xl flex flex-col justify-between overflow-hidden group">
          {/* Subtle Ambient Glows */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Bar */}
          <div className="flex justify-between items-center z-10">
            <div className="flex items-center gap-2.5">
              <img
                src={abGymLogo}
                alt="AB Gym Official Logo"
                referrerPolicy="no-referrer"
                loading="eager"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallbackEl = document.getElementById('card-modal-logo-fallback');
                  if (fallbackEl) fallbackEl.style.display = 'flex';
                }}
                className="h-8 w-auto object-contain filter drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]"
              />
              <div
                id="card-modal-logo-fallback"
                style={{ display: 'none' }}
                className="items-center gap-2"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center font-black text-black text-xs font-mono">
                  AB
                </div>
                <div>
                  <h3 className="font-mono font-black text-white text-xs tracking-wider">
                    {settings.gymName || 'AB GYM'}
                  </h3>
                  <p className="text-[8px] text-emerald-400 uppercase font-bold">
                    Official Member
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-blue-500/40 text-blue-400 font-mono text-xs font-bold px-3 py-1 rounded-xl shadow-inner">
              {member.rollNumber || 'ABG-26-0000'}
            </div>
          </div>

          {/* Center Details & QR */}
          <div className="grid grid-cols-3 gap-3 items-center z-10 my-1">
            <div className="col-span-2 space-y-1">
              <p className="text-base sm:text-lg font-black text-white uppercase tracking-tight line-clamp-1">
                {member.fullName}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-400 font-semibold font-mono">
                  {member.planName || 'Fitness Plan'}
                </span>
                <span className="text-[10px] text-zinc-500">•</span>
                <span
                  className={`px-2 py-0.2 rounded-full text-[9px] font-bold uppercase ${
                    isActive
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                      : isExpired
                      ? 'bg-red-950/80 text-red-400 border border-red-500/30'
                      : 'bg-amber-950/80 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  ● {statusStr}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 flex items-center gap-1.5 pt-0.5">
                <Phone className="w-3 h-3 text-emerald-500" />
                <span>{member.phone}</span>
              </p>
            </div>

            {/* QR Code generator placeholder display */}
            <div className="flex flex-col items-center justify-center bg-white p-1.5 rounded-xl border border-zinc-300 shadow-md shrink-0 justify-self-end">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                  JSON.stringify({
                    gym: settings.gymName || 'AB GYM',
                    roll: member.rollNumber,
                    name: member.fullName,
                    plan: member.planName,
                    status: member.status,
                    expiry: member.membershipExpiry,
                  })
                )}`}
                alt={`Attendance QR Code for ${member.fullName}`}
                className="w-12 h-12 sm:w-14 sm:h-14 object-contain rounded"
              />
              <span className="text-[7px] text-zinc-900 font-mono font-bold tracking-tight mt-0.5">
                SCAN VERIFY
              </span>
            </div>
          </div>

          {/* Bottom Expiry Bar */}
          <div className="flex items-center justify-between z-10 pt-2 border-t border-zinc-800/80 text-[11px]">
            <div className="flex items-center gap-1.5 text-zinc-300">
              <Calendar className="w-3.5 h-3.5 text-emerald-500" />
              <span>Valid Till: <strong className="text-white font-mono">{member.membershipExpiry}</strong></span>
            </div>

            <span className="text-[10px] text-zinc-400 font-mono">
              Joined: {member.joiningDate || 'Active'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
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
                <span>Generating Luxury PDF Card...</span>
              </>
            ) : isDownloaded ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>ID Card PDF Downloaded!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-white" />
                <span>Download Member ID PDF</span>
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};
