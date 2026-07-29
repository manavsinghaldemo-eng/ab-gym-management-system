import React from 'react';
import { getStoredSettings } from '../lib/storage';
import { MapPin, Phone, Mail, Clock, MessageSquare } from 'lucide-react';

export const ContactPage: React.FC = () => {
  const settings = getStoredSettings();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12 text-zinc-100">
      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <span className="text-xs font-bold text-blue-500 uppercase tracking-widest flex items-center justify-center gap-1.5">
          <MessageSquare className="w-4 h-4" />
          Get In Touch
        </span>
        <h1 className="text-4xl sm:text-5xl font-black text-white font-mono uppercase tracking-tight">
          CONTACT <span className="text-blue-500">AB GYM</span>
        </h1>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Have questions regarding membership plans, trainer availability, or fee payment support? Our team is available 6 days a week to assist you.
        </p>
      </div>

      {/* Contact Info & Map Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-zinc-900/90 border border-zinc-800 p-8 rounded-3xl space-y-6 shadow-xl">
          <h3 className="text-xl font-black text-white font-mono uppercase border-b border-zinc-800 pb-3">
            GYM CONTACT DETAILS
          </h3>

          <div className="space-y-5 text-sm">
            <div className="flex items-start gap-3.5">
              <MapPin className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white">Location Address</p>
                <p className="text-xs text-zinc-400 leading-relaxed mt-0.5">{settings.address}</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <Phone className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white">Phone Support</p>
                <p className="text-xs text-zinc-400 mt-0.5">{settings.phone}{settings.altPhone ? ` / ${settings.altPhone}` : ''}</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <Mail className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white">Email Address</p>
                <p className="text-xs text-zinc-400 mt-0.5">{settings.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <Clock className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white">Working Hours</p>
                <p className="text-xs text-zinc-400 mt-0.5">Mon - Sat: {settings.operatingHours.monSat}</p>
                <p className="text-xs text-zinc-400">Sunday: {settings.operatingHours.sun}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Map Visual Mockup */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-8 flex flex-col justify-between shadow-xl space-y-6">
          <h3 className="text-xl font-black text-white font-mono uppercase border-b border-zinc-800 pb-3">
            OUR LOCATION
          </h3>
          <div className="h-64 bg-zinc-950 rounded-2xl flex flex-col items-center justify-center border border-zinc-800/80 p-6 text-center space-y-3">
            <MapPin className="w-12 h-12 text-blue-500 animate-bounce" />
            <p className="text-base font-black text-white font-mono tracking-tight">{settings.gymName}</p>
            <p className="text-xs text-zinc-400 max-w-xs">{settings.address}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

