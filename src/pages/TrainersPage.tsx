import React, { useState } from 'react';
import { getStoredTrainers } from '../lib/storage';
import { Trainer } from '../types';
import { Trophy, Star, Phone, Calendar, Clock, CheckCircle2, Award, X } from 'lucide-react';

interface TrainersPageProps {
  onNavigate: (path: string) => void;
}

export const TrainersPage: React.FC<TrainersPageProps> = ({ onNavigate }) => {
  const trainers = getStoredTrainers();
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const handleBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingSuccess(true);
    setTimeout(() => {
      setBookingSuccess(false);
      setSelectedTrainer(null);
    }, 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16 text-[#f5f5f4] bg-[#050505]">
      {/* Header */}
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <span className="text-[10px] font-bold text-[#2563EB] uppercase tracking-[0.35em] italic flex items-center justify-center gap-2">
          <Trophy className="w-3.5 h-3.5" />
          ELITE FITNESS MENTORS
        </span>
        <h1 className="text-4xl sm:text-6xl font-black text-white font-display uppercase tracking-tighter">
          CERTIFIED <span className="text-[#2563EB]">TRAINERS</span>
        </h1>
        <p className="text-xs text-white/50 leading-relaxed uppercase tracking-wider">
          Train under state champions, CrossFit coaches, and sports nutritionists dedicated to pushing your performance limits.
        </p>
      </div>

      {/* Trainers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {trainers.map((tr) => (
          <div
            key={tr.id}
            className="bg-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between hover:border-[#2563EB] transition-all group"
          >
            <div>
              <div className="relative h-72 overflow-hidden">
                <img
                  src={tr.imageUrl}
                  alt={tr.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-black/80 border border-white/20 text-white text-[10px] font-bold flex items-center gap-1">
                  <Star className="w-3 h-3 text-[#2563EB] fill-[#2563EB]" />
                  <span>{tr.rating}</span>
                </div>
                <span className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-[#2563EB] text-white text-[9px] font-black uppercase tracking-widest">
                  {tr.experience} EXP
                </span>
              </div>

              <div className="p-5 space-y-3">
                <div>
                  <h3 className="text-lg font-black text-white">{tr.name}</h3>
                  <p className="text-xs font-semibold text-blue-400">{tr.role}</p>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed">{tr.bio}</p>

                <div className="space-y-1 pt-2 border-t border-zinc-800 text-[11px] text-zinc-300">
                  <p className="font-bold text-zinc-400 uppercase tracking-wider text-[10px]">Certifications:</p>
                  {tr.certifications.map((cert, cIdx) => (
                    <div key={cIdx} className="flex items-center gap-1.5">
                      <Award className="w-3 h-3 text-blue-500 shrink-0" />
                      <span>{cert}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 pt-0">
              <button
                onClick={() => setSelectedTrainer(tr)}
                className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-blue-600 text-zinc-200 hover:text-white font-bold text-xs transition-colors"
              >
                Book 1-on-1 Consultation
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Booking Modal */}
      {selectedTrainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-[#0F0F12] border border-zinc-800 rounded-3xl p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                <span className="font-bold text-white text-base">Book Coach Consultation</span>
              </div>
              <button
                onClick={() => setSelectedTrainer(null)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {bookingSuccess ? (
              <div className="text-center py-8 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <p className="text-lg font-black text-white font-mono">CONSULTATION BOOKED!</p>
                <p className="text-xs text-zinc-400">
                  Coach {selectedTrainer.name} will reach out to confirm your session timing.
                </p>
              </div>
            ) : (
              <form onSubmit={handleBooking} className="space-y-4">
                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center gap-3">
                  <img
                    src={selectedTrainer.imageUrl}
                    alt={selectedTrainer.name}
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                  <div>
                    <p className="text-sm font-bold text-white">{selectedTrainer.name}</p>
                    <p className="text-xs text-blue-400">{selectedTrainer.role}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Your Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    className="w-full bg-zinc-950 border border-zinc-800 text-white px-3.5 py-2.5 rounded-xl text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    inputMode="numeric"
                    placeholder="e.g. 9876543210"
                    className="w-full bg-zinc-950 border border-zinc-800 text-white px-3.5 py-2.5 rounded-xl text-sm outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Preferred Time Slot</label>
                  <select className="w-full bg-zinc-950 border border-zinc-800 text-white px-3.5 py-2.5 rounded-xl text-sm outline-none focus:border-blue-500">
                    {selectedTrainer.availableSlots.map((slot, idx) => (
                      <option key={idx} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-600/30 transition-all"
                >
                  Confirm Appointment
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
