import React from 'react';
import { Member } from '../types';
import { getStoredSettings } from '../lib/storage';
import { downloadMemberCardPDF } from '../lib/pdf';
import { Dumbbell, Download, X, QrCode, Calendar, Phone, ShieldCheck } from 'lucide-react';
import abGymLogo from '../assets/ab-gym-logo.png';

interface MemberCardModalProps {
  member: Member;
  onClose: () => void;
}

export const MemberCardModal: React.FC<MemberCardModalProps> = ({ member, onClose }) => {
  const settings = getStoredSettings();

  const handleDownloadCard = () => {
    downloadMemberCardPDF(member, settings);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0F0F12] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <span className="font-bold text-white text-base">Digital Gym Membership Pass</span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Digital ID Card Canvas */}
        <div className="relative w-full aspect-[1.586/1] bg-gradient-to-br from-zinc-950 via-[#121218] to-zinc-900 border-2 border-blue-600/60 rounded-2xl p-5 shadow-2xl flex flex-col justify-between overflow-hidden group">
          {/* Accent Graphic */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-900/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Bar */}
          <div className="flex justify-between items-center z-10">
            <div className="flex items-center gap-2">
              <img
                src={abGymLogo}
                alt="AB Gym Official Logo"
                referrerPolicy="no-referrer"
                loading="eager"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallbackEl = document.getElementById('card-logo-fallback');
                  if (fallbackEl) fallbackEl.style.display = 'flex';
                }}
                className="h-9 w-auto object-contain filter drop-shadow-[0_0_8px_rgba(37,99,235,0.4)]"
              />
              <div
                id="card-logo-fallback"
                style={{ display: 'none' }}
                className="items-center gap-2"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-blue-500 flex items-center justify-center shadow-md">
                  <span className="font-mono font-black text-white text-xs">AB</span>
                </div>
                <div>
                  <h3 className="font-mono font-black text-white text-sm tracking-wider">
                    {settings.gymName}
                  </h3>
                  <p className="text-[9px] text-zinc-400 uppercase tracking-widest font-bold">
                    Official Member ID
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-950/80 border border-blue-500/40 text-blue-400 font-mono text-xs font-bold px-2.5 py-1 rounded-lg shadow-inner">
              {member.rollNumber}
            </div>
          </div>

          {/* Center Details */}
          <div className="grid grid-cols-3 gap-3 items-center z-10 my-2">
            <div className="col-span-2 space-y-1">
              <p className="text-lg font-black text-white leading-tight">{member.fullName}</p>
              <p className="text-xs text-blue-400 font-semibold">{member.planName}</p>
              <p className="text-[11px] text-zinc-400 flex items-center gap-1 pt-1">
                <Phone className="w-3 h-3 text-blue-500" />
                {member.phone}
              </p>
            </div>

            {/* QR Code Generator */}
            <div className="flex flex-col items-center justify-center bg-white p-1.5 rounded-xl border border-zinc-300 shadow-sm shrink-0">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                  JSON.stringify({
                    rollNumber: member.rollNumber,
                    fullName: member.fullName,
                    planName: member.planName,
                    status: member.status,
                    expiry: member.membershipExpiry,
                  })
                )}`}
                alt={`Attendance QR Code for ${member.fullName}`}
                className="w-14 h-14 object-contain rounded"
              />
              <span className="text-[8px] text-zinc-900 font-mono font-bold tracking-tight mt-0.5">SCAN ATTENDANCE</span>
            </div>
          </div>

          {/* Bottom Expiry & Status Bar */}
          <div className="flex items-center justify-between z-10 pt-2 border-t border-zinc-800/80 text-xs">
            <div className="flex items-center gap-1.5 text-zinc-300">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              <span>Valid Till: <strong className="text-white">{member.membershipExpiry}</strong></span>
            </div>

            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                member.status === 'Active'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-600/40'
                  : 'bg-blue-950 text-blue-400 border border-blue-600/40'
              }`}
            >
              {member.status}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleDownloadCard}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF Membership Card</span>
          </button>
        </div>
      </div>
    </div>
  );
};
