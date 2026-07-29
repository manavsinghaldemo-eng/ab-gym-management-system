import React from 'react';
import { ShieldCheck, Mail, Phone, MapPin, Globe } from 'lucide-react';
import { getStoredSettings } from '../lib/storage';

interface LegalPageProps {
  type: 'terms' | 'privacy';
}

export const LegalPage: React.FC<LegalPageProps> = ({ type }) => {
  const isTerms = type === 'terms';
  const settings = getStoredSettings();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-zinc-200 space-y-8">
      <div className="text-center space-y-3 border-b border-zinc-800 pb-8">
        <span className="text-xs font-bold text-blue-500 uppercase tracking-widest flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4" />
          AB Gym Governance
        </span>
        <h1 className="text-3xl sm:text-5xl font-black text-white font-mono uppercase tracking-tight">
          {isTerms ? 'TERMS & CONDITIONS' : 'PRIVACY POLICY'}
        </h1>
        <p className="text-xs text-zinc-400">Effective Date: July 2026 | AB Gym Official Policy</p>
      </div>

      {isTerms ? (
        <div className="bg-zinc-900/90 border border-zinc-800 p-6 sm:p-10 rounded-3xl space-y-8 text-xs text-zinc-300 leading-relaxed">
          <p className="text-sm font-medium text-white/90">
            Welcome to AB Gym. By registering as a member, using our website, or accessing our facilities, you agree to the following Terms & Conditions.
          </p>

          <section className="space-y-2 border-b border-zinc-800/60 pb-6">
            <h3 className="text-sm font-black text-white uppercase font-mono text-blue-400">1. Membership</h3>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-300">
              <li>Membership is personal and non-transferable.</li>
              <li>Members must provide accurate information during registration.</li>
              <li>The gym reserves the right to verify member information at any time.</li>
              <li>A valid Roll Number or Membership ID may be required to access gym services.</li>
            </ul>
          </section>

          <section className="space-y-2 border-b border-zinc-800/60 pb-6">
            <h3 className="text-sm font-black text-white uppercase font-mono text-blue-400">2. Membership Fees</h3>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-300">
              <li>All membership and registration fees are non-refundable.</li>
              <li>Membership becomes active only after payment has been verified by the gym.</li>
              <li>Renewal fees must be paid before the membership expiry date to avoid interruption of services.</li>
              <li>Late payments may result in suspension of membership.</li>
            </ul>
          </section>

          <section className="space-y-2 border-b border-zinc-800/60 pb-6">
            <h3 className="text-sm font-black text-white uppercase font-mono text-blue-400">3. Payment Verification</h3>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-300">
              <li>UPI payments must include a valid Transaction ID and payment screenshot.</li>
              <li>Cash payments are subject to verification by the gym staff.</li>
              <li>AB Gym reserves the right to reject any payment if verification fails.</li>
              <li>A fee receipt will be issued only after successful payment verification.</li>
            </ul>
          </section>

          <section className="space-y-2 border-b border-zinc-800/60 pb-6">
            <h3 className="text-sm font-black text-white uppercase font-mono text-blue-400">4. Member Responsibilities</h3>
            <p className="font-semibold text-white">Members agree to:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-300">
              <li>Follow all gym rules and instructions.</li>
              <li>Respect trainers, staff, and other members.</li>
              <li>Use equipment responsibly.</li>
              <li>Return equipment to its designated place after use.</li>
              <li>Maintain hygiene and wear appropriate workout attire.</li>
            </ul>
          </section>

          <section className="space-y-2 border-b border-zinc-800/60 pb-6">
            <h3 className="text-sm font-black text-white uppercase font-mono text-blue-400">5. Health Declaration</h3>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-300">
              <li>Members confirm they are medically fit to participate in physical activities.</li>
              <li>Any existing medical condition must be disclosed before joining.</li>
              <li>Consult a qualified doctor before starting any exercise program if required.</li>
            </ul>
          </section>

          <section className="space-y-2 border-b border-zinc-800/60 pb-6">
            <h3 className="text-sm font-black text-white uppercase font-mono text-blue-400">6. Liability</h3>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-300">
              <li>Members use all gym facilities at their own risk.</li>
              <li>AB Gym is not responsible for injuries resulting from improper use of equipment or failure to follow trainer instructions.</li>
              <li>AB Gym is not liable for loss, theft, or damage to personal belongings.</li>
            </ul>
          </section>

          <section className="space-y-2 border-b border-zinc-800/60 pb-6">
            <h3 className="text-sm font-black text-white uppercase font-mono text-blue-400">7. Code of Conduct</h3>
            <p className="font-semibold text-white">The following are strictly prohibited:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-300">
              <li>Abuse or harassment of staff or members.</li>
              <li>Damaging gym property.</li>
              <li>Smoking, alcohol, drugs, or illegal substances inside the premises.</li>
              <li>Sharing or transferring membership to another person.</li>
              <li>Any activity that disturbs other members.</li>
            </ul>
            <p className="text-amber-400 font-semibold pt-2">
              Violation of these rules may result in immediate suspension or termination of membership without refund.
            </p>
          </section>

          <section className="space-y-2 border-b border-zinc-800/60 pb-6">
            <h3 className="text-sm font-black text-white uppercase font-mono text-blue-400">8. Membership Suspension & Cancellation</h3>
            <p className="font-semibold text-white">AB Gym reserves the right to suspend or terminate membership if:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-300">
              <li>Membership fees remain unpaid.</li>
              <li>False information is provided.</li>
              <li>Gym rules are repeatedly violated.</li>
              <li>Fraudulent payment activity is detected.</li>
            </ul>
          </section>

          <section className="space-y-2 border-b border-zinc-800/60 pb-6">
            <h3 className="text-sm font-black text-white uppercase font-mono text-blue-400">9. Website & Online Services</h3>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-300">
              <li>Online forms must be completed with accurate information.</li>
              <li>Members are responsible for keeping their Roll Number confidential.</li>
              <li>Any misuse of the website or payment system may result in account suspension.</li>
            </ul>
          </section>

          <section className="space-y-2 border-b border-zinc-800/60 pb-6">
            <h3 className="text-sm font-black text-white uppercase font-mono text-blue-400">10. Privacy</h3>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-300">
              <li>Personal information is collected only for membership management and communication.</li>
              <li>Information will not be sold to third parties except where required by law.</li>
              <li>Payment details are handled securely and used only for verification purposes.</li>
            </ul>
          </section>

          <section className="space-y-2 border-b border-zinc-800/60 pb-6">
            <h3 className="text-sm font-black text-white uppercase font-mono text-blue-400">11. Changes to Membership Plans</h3>
            <p>
              AB Gym may revise membership plans, fees, operating hours, or services at any time. Existing members will be informed of significant changes whenever reasonably possible.
            </p>
          </section>

          <section className="space-y-2 border-b border-zinc-800/60 pb-6">
            <h3 className="text-sm font-black text-white uppercase font-mono text-blue-400">12. Operating Hours</h3>
            <p>
              Gym operating hours may change due to maintenance, public holidays, emergencies, or special events.
            </p>
          </section>

          <section className="space-y-2 border-b border-zinc-800/60 pb-6">
            <h3 className="text-sm font-black text-white uppercase font-mono text-blue-400">13. Governing Law</h3>
            <p>
              These Terms & Conditions shall be governed by the laws of India. Any disputes shall be subject to the jurisdiction of the courts in New Delhi, India.
            </p>
          </section>

          <section className="space-y-4 pt-2">
            <h3 className="text-sm font-black text-white uppercase font-mono text-blue-400">14. Contact Information</h3>
            <div className="bg-black p-5 rounded-2xl border border-zinc-800 space-y-3 font-mono">
              <p className="font-bold text-white text-sm">AB Gym</p>
              <div className="flex items-center gap-2.5 text-zinc-300">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
                <span>📍 Address: {settings.address || 'South Extension, Main Ring Road, New Delhi, 110049'}</span>
              </div>
              <div className="flex items-center gap-2.5 text-zinc-300">
                <Phone className="w-4 h-4 text-blue-400 shrink-0" />
                <span>📞 Phone: {settings.phone || '8587882431'}</span>
              </div>
              <div className="flex items-center gap-2.5 text-zinc-300">
                <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                <span>📧 Email: {settings.email || 'support@manav.sbs'}</span>
              </div>
              <div className="flex items-center gap-2.5 text-zinc-300">
                <Globe className="w-4 h-4 text-blue-400 shrink-0" />
                <span>🌐 Website: https://abgym.in</span>
              </div>
            </div>
          </section>

          <div className="bg-blue-950/40 border border-blue-600/40 p-4 rounded-xl text-center text-xs text-blue-300 font-semibold mt-6">
            By registering with AB Gym or using our website, you acknowledge that you have read, understood, and agreed to these Terms & Conditions.
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900/90 border border-zinc-800 p-8 rounded-3xl space-y-6 text-xs text-zinc-300 leading-relaxed">
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-white uppercase font-mono text-blue-400">1. Information Collection</h3>
            <p>
              AB Gym collects member details (Full Name, Phone Number, Email Address, Emergency Contact, Health Goals) strictly for membership administration, fee payment verification, and emergency safety.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-white uppercase font-mono text-blue-400">2. Data Security</h3>
            <p>
              We enforce strict data encryption standards for member database records. Personal contact information and transaction receipts are never sold or shared with third-party advertising networks.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-bold text-white uppercase font-mono text-blue-400">3. Fee Receipt Records</h3>
            <p>
              Digital fee payment records and transaction reference numbers are securely maintained in our portal to ensure accurate accounting and instant download capability for members at any time.
            </p>
          </section>
        </div>
      )}
    </div>
  );
};

