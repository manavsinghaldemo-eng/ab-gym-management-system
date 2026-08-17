import React from 'react';
import { Dumbbell, ShieldCheck, Award, Users, Trophy, Flame, Target, HeartHandshake } from 'lucide-react';
import { RevealOnScroll } from '../components/RevealOnScroll';

interface AboutPageProps {
  onNavigate: (path: string) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16 text-zinc-200">
      {/* Header Banner */}
      <RevealOnScroll direction="up" delayMs={50}>
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="text-xs font-bold text-blue-500 uppercase tracking-widest flex items-center justify-center gap-1.5">
            <Dumbbell className="w-4 h-4" />
            The AB Gym Legacy
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-white font-mono uppercase tracking-tight">
            ABOUT <span className="text-blue-500">AB GYM</span>
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
            Established with an uncompromising passion for athletic excellence, AB Gym is a state-of-the-art 20,000 sq. ft. fitness sanctuary designed for beginners, powerlifters, and elite athletes.
          </p>
        </div>
      </RevealOnScroll>

      {/* Story & Vision */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <RevealOnScroll direction="left" delayMs={100}>
          <div className="relative rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl group">
            <img
              src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1000&auto=format&fit=crop"
              alt="AB Gym Interior"
              className="w-full h-[400px] object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 p-4 bg-zinc-950/80 backdrop-blur-md rounded-xl border border-zinc-800">
              <p className="text-xs font-bold text-blue-400">20,000 Sq. Ft. Luxury Floor</p>
              <p className="text-sm font-semibold text-white">Equipped with Imported Rogue & Hammer Strength Gear</p>
            </div>
          </div>
        </RevealOnScroll>

        <RevealOnScroll direction="right" delayMs={150}>
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white font-mono uppercase">OUR MISSION & CORE VALUES</h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                We believe physical transformation is the gateway to mental toughness and lifelong vitality. At AB Gym, we combine scientific workout programming with personal accountability to ensure every member achieves measurable results.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-zinc-900/80 p-4 rounded-xl border border-zinc-800 space-y-2">
                <Target className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-white text-sm">Goal-Driven Coaching</h3>
                <p className="text-xs text-zinc-400">Tailored workout and diet blueprints designed specifically for your body type.</p>
              </div>

              <div className="bg-zinc-900/80 p-4 rounded-xl border border-zinc-800 space-y-2">
                <ShieldCheck className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-white text-sm">Strict Hygiene & Safety</h3>
                <p className="text-xs text-zinc-400">Sanitized equipment, air purification, and certified CPR/AED first-aid staff.</p>
              </div>

              <div className="bg-zinc-900/80 p-4 rounded-xl border border-zinc-800 space-y-2">
                <Users className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-white text-sm">Supportive Tribe</h3>
                <p className="text-xs text-zinc-400">A motivating atmosphere where fellow members cheer your daily fitness milestones.</p>
              </div>

              <div className="bg-zinc-900/80 p-4 rounded-xl border border-zinc-800 space-y-2">
                <HeartHandshake className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-white text-sm">Holistic Wellness</h3>
                <p className="text-xs text-zinc-400">Includes steam baths, nutrition bar, and posture correction specialists.</p>
              </div>
            </div>
          </div>
        </RevealOnScroll>
      </div>

      {/* Facilities Highlight */}
      <RevealOnScroll direction="up" delayMs={100}>
        <div className="bg-zinc-900/60 border border-zinc-800 p-8 rounded-3xl space-y-6">
          <h2 className="text-2xl font-black text-white font-mono uppercase text-center">
            WORLD-CLASS <span className="text-blue-500">FACILITIES</span>
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800">
              <p className="text-lg font-black text-white">Heavy Powerlifting</p>
              <p className="text-xs text-zinc-400 mt-1">Calibrated plates & platform</p>
            </div>
            <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800">
              <p className="text-lg font-black text-white">CrossFit Arena</p>
              <p className="text-xs text-zinc-400 mt-1">Rigs, ropes, bumper plates</p>
            </div>
            <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800">
              <p className="text-lg font-black text-white">Cardio Zone</p>
              <p className="text-xs text-zinc-400 mt-1">Touchscreen treadmills</p>
            </div>
            <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800">
              <p className="text-lg font-black text-white">Steam & Sauna</p>
              <p className="text-xs text-zinc-400 mt-1">Post-workout recovery</p>
            </div>
          </div>
        </div>
      </RevealOnScroll>

      {/* CTA Box */}
      <RevealOnScroll direction="zoom-in" delayMs={120}>
        <div className="text-center bg-gradient-to-r from-blue-950 via-zinc-900 to-blue-950 p-8 rounded-3xl border border-blue-600/40 space-y-4">
          <h3 className="text-2xl font-black text-white font-mono uppercase">READY TO BEGIN YOUR JOURNEY?</h3>
          <p className="text-xs text-zinc-300 max-w-lg mx-auto">
            Register online to generate your official Roll Number and claim your free first-day workout pass.
          </p>
          <button
            onClick={() => onNavigate('/register')}
            className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            Register Now &rarr;
          </button>
        </div>
      </RevealOnScroll>
    </div>
  );
};
