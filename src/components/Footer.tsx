import React from 'react';
import {
  Dumbbell,
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldAlert,
  Instagram,
  Facebook,
  Youtube,
  Twitter,
  Heart,
} from 'lucide-react';
import { getStoredSettings } from '../lib/storage';

interface FooterProps {
  onNavigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const settings = getStoredSettings();

  const handleLink = (path: string) => {
    onNavigate(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#050505] border-t border-white/10 text-zinc-300 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-white/10">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-5">
            <div className="flex items-center gap-3">
              <img
                src="/assets/ab-gym-logo.png"
                alt="AB Gym Official Logo"
                referrerPolicy="no-referrer"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallbackEl = document.getElementById('footer-logo-fallback');
                  if (fallbackEl) fallbackEl.style.display = 'flex';
                }}
                className="h-16 w-auto object-contain filter drop-shadow-[0_0_12px_rgba(37,99,235,0.25)]"
              />
              <div
                id="footer-logo-fallback"
                style={{ display: 'none' }}
                className="items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full border border-white/20 bg-black flex items-center justify-center">
                  <span className="font-black text-xs text-[#2563EB] font-mono">AB</span>
                </div>
                <span className="text-2xl font-black tracking-tighter italic text-white font-display">
                  AB GYM<span className="text-[#2563EB]">©</span>
                </span>
              </div>
            </div>

            <p className="text-sm text-white/60 leading-relaxed max-w-md">
              {settings.tagline} AB Gym offers world-class cardio, heavy powerlifting, CrossFit arenas, certified personal training, and group fitness sessions.
            </p>

            <div className="space-y-2 text-xs text-white/50 pt-2">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
                <span>{settings.address}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#2563EB] shrink-0" />
                <span>
                  {settings.phone} {settings.altPhone ? ` / ${settings.altPhone}` : ''}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#2563EB] shrink-0" />
                <span>{settings.email}</span>
              </div>
            </div>

            {/* Social Icons */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href="#instagram"
                onClick={(e) => e.preventDefault()}
                className="w-9 h-9 rounded-full border border-white/20 bg-black flex items-center justify-center text-white/70 hover:text-white hover:border-[#2563EB] hover:bg-[#2563EB] transition-all"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="#facebook"
                onClick={(e) => e.preventDefault()}
                className="w-9 h-9 rounded-full border border-white/20 bg-black flex items-center justify-center text-white/70 hover:text-white hover:border-[#2563EB] hover:bg-[#2563EB] transition-all"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="#youtube"
                onClick={(e) => e.preventDefault()}
                className="w-9 h-9 rounded-full border border-white/20 bg-black flex items-center justify-center text-white/70 hover:text-white hover:border-[#2563EB] hover:bg-[#2563EB] transition-all"
                aria-label="YouTube"
              >
                <Youtube className="w-4 h-4" />
              </a>
              <a
                href="#twitter"
                onClick={(e) => e.preventDefault()}
                className="w-9 h-9 rounded-full border border-white/20 bg-black flex items-center justify-center text-white/70 hover:text-white hover:border-[#2563EB] hover:bg-[#2563EB] transition-all"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Navigation */}
          <div>
            <h4 className="text-[10px] uppercase tracking-[0.3em] text-[#2563EB] font-bold mb-4 italic">
              Quick Links
            </h4>
            <ul className="space-y-2 text-xs text-white/60">
              <li>
                <button
                  onClick={() => handleLink('/about')}
                  className="hover:text-[#2563EB] transition-colors uppercase tracking-wider"
                >
                  About AB Gym
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLink('/services')}
                  className="hover:text-[#2563EB] transition-colors uppercase tracking-wider"
                >
                  Gym Services
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLink('/plans')}
                  className="hover:text-[#2563EB] transition-colors uppercase tracking-wider"
                >
                  Membership Plans
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLink('/register')}
                  className="hover:text-[#2563EB] transition-colors uppercase tracking-wider"
                >
                  Online Registration
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLink('/pay-fee')}
                  className="hover:text-[#2563EB] transition-colors uppercase tracking-wider"
                >
                  Pay Membership Fee
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLink('/trainers')}
                  className="hover:text-[#2563EB] transition-colors uppercase tracking-wider"
                >
                  Certified Trainers
                </button>
              </li>
            </ul>
          </div>

          {/* Member Services & Support */}
          <div>
            <h4 className="text-[10px] uppercase tracking-[0.3em] text-[#2563EB] font-bold mb-4 italic">
              Support & Legal
            </h4>
            <ul className="space-y-2 text-xs text-white/60">
              <li>
                <button
                  onClick={() => handleLink('/gallery')}
                  className="hover:text-[#2563EB] transition-colors uppercase tracking-wider"
                >
                  Gym Gallery
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLink('/contact')}
                  className="hover:text-[#2563EB] transition-colors uppercase tracking-wider"
                >
                  Contact Us
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLink('/terms')}
                  className="hover:text-[#2563EB] transition-colors uppercase tracking-wider"
                >
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLink('/privacy')}
                  className="hover:text-[#2563EB] transition-colors uppercase tracking-wider"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleLink('/admin/login')}
                  className="hover:text-[#2563EB] transition-colors flex items-center gap-1 text-[#2563EB] font-bold uppercase tracking-wider"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Admin Login
                </button>
              </li>
            </ul>
          </div>

          {/* Operating Hours */}
          <div>
            <h4 className="text-[10px] uppercase tracking-[0.3em] text-[#2563EB] font-bold mb-4 italic">
              Gym Timings
            </h4>
            <div className="bg-[#0A0A0A] border border-white/10 p-4 rounded-2xl space-y-3">
              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-white uppercase tracking-wider">Monday - Saturday</p>
                  <p className="text-xs text-white/50">{settings.operatingHours.monSat}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 pt-2 border-t border-white/10">
                <Clock className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-white uppercase tracking-wider">Sunday Special</p>
                  <p className="text-xs text-white/50">{settings.operatingHours.sun}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Credits */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-[9px] uppercase tracking-[0.3em] text-white/40 gap-4">
          <div>
            © {new Date().getFullYear()} <span className="text-white font-bold">AB GYM©</span>. ALL RIGHTS RESERVED.
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#2563EB]"></div>
            <span>HIGH PERFORMANCE / EST. 2026</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
