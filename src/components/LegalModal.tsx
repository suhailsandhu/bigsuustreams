import React, { useState } from 'react';
import { X, ShieldCheck, Scale, FileText, AlertTriangle } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'dmca' | 'disclaimer' | 'terms' | 'privacy';
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'dmca'
}) => {
  const [activeTab, setActiveTab] = useState<'dmca' | 'disclaimer' | 'terms' | 'privacy'>(initialTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-800">
              <Scale className="w-4 h-4 text-gray-700" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-gray-900 leading-tight">
                Legal Compliance & Disclaimers
              </h3>
              <p className="text-[11px] text-gray-400">
                DMCA Safe Harbor, Nominative Fair Use & Terms
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition flex items-center justify-center cursor-pointer active:scale-95"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-4 gap-1 p-2 bg-gray-50 border-b border-gray-100 text-center text-xs font-bold">
          <button
            onClick={() => setActiveTab('dmca')}
            className={`py-2 px-1 rounded-lg transition-all cursor-pointer ${
              activeTab === 'dmca' ? 'bg-white text-gray-900 shadow-2xs font-extrabold' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            DMCA Policy
          </button>
          <button
            onClick={() => setActiveTab('disclaimer')}
            className={`py-2 px-1 rounded-lg transition-all cursor-pointer ${
              activeTab === 'disclaimer' ? 'bg-white text-gray-900 shadow-2xs font-extrabold' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Disclaimer
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`py-2 px-1 rounded-lg transition-all cursor-pointer ${
              activeTab === 'terms' ? 'bg-white text-gray-900 shadow-2xs font-extrabold' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Terms of Use
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`py-2 px-1 rounded-lg transition-all cursor-pointer ${
              activeTab === 'privacy' ? 'bg-white text-gray-900 shadow-2xs font-extrabold' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Privacy
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-xs sm:text-sm text-gray-600 leading-relaxed space-y-4">
          
          {/* DMCA POLICY */}
          {activeTab === 'dmca' && (
            <div className="space-y-3.5">
              <div className="flex items-center space-x-2 text-gray-900 font-extrabold text-sm sm:text-base">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h4>DMCA Copyright Notice & Takedown Procedure (17 U.S.C. § 512)</h4>
              </div>
              <p>
                <strong>BigSuuStreams</strong> is an informational aggregator and real-time basketball index. BigSuuStreams does not host, upload, encode, store, transmit, or broadcast any video files, streaming servers, or media content on its own infrastructure.
              </p>
              <p>
                Highlight videos are embedded directly from official third-party providers (specifically the verified <strong>@NBA YouTube Channel</strong> via YouTube's public embedded player API pursuant to the YouTube Terms of Service). All live streams referenced on this platform are hyperlinks to publicly available third-party web destinations operated by independent third parties over which BigSuuStreams exercises no direct editorial, legal, or technical control.
              </p>
              <div className="bg-gray-50 border border-gray-200/80 rounded-xl p-3.5 space-y-2">
                <h5 className="font-bold text-gray-900 text-xs">Notice and Takedown Procedure (17 U.S.C. § 512(c)(3)):</h5>
                <p className="text-xs text-gray-500">
                  If you are a copyright owner or an authorized agent and believe that content accessible through our search index infringes upon your copyright, you may submit a written notification including:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-xs text-gray-500 pl-1">
                  <li>Physical or electronic signature of the authorized copyright owner.</li>
                  <li>Identification of the copyrighted work claimed to have been infringed.</li>
                  <li>Identification of the specific URL / index link on BigSuuStreams requested to be removed.</li>
                  <li>Adequate contact information (email address and phone number).</li>
                  <li>A statement of good faith belief that the disputed use is not authorized by law.</li>
                  <li>A statement under penalty of perjury that the notification is accurate and authorized.</li>
                </ol>
                <p className="text-xs font-semibold text-gray-800 pt-1">
                  Designated DMCA Agent Email: <a href="mailto:dmca@bigsuustreams.com" className="text-blue-600 underline">dmca@bigsuustreams.com</a>
                </p>
                <p className="text-[11px] text-gray-400">
                  Compliant takedown notices are processed and links expunged within 24 to 48 business hours.
                </p>
              </div>
            </div>
          )}

          {/* TRADEMARK & LEAGUE DISCLAIMER */}
          {activeTab === 'disclaimer' && (
            <div className="space-y-3.5">
              <div className="flex items-center space-x-2 text-gray-900 font-extrabold text-sm sm:text-base">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h4>Trademark & Non-Affiliation Disclaimer</h4>
              </div>
              <p>
                <strong>Non-Affiliation Notice:</strong> BigSuuStreams is an independent, non-commercial fan portal and news index. BigSuuStreams is <strong>NOT</strong> affiliated with, associated with, sponsored by, authorized by, licensed by, or in any way officially connected with the <strong>National Basketball Association (NBA)</strong>, the <strong>National Basketball Players Association (NBPA)</strong>, or any of their respective 30 member franchises, subsidiaries, or television broadcast partners (including ESPN, TNT, and ABC).
              </p>
              <p>
                The official National Basketball Association website is located at <a href="https://www.nba.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">www.nba.com</a>.
              </p>
              <p>
                <strong>Nominative Fair Use:</strong> All NBA team names, logos, brand identifiers, player names, and likenesses displayed on this website are registered trademarks and property of their respective legal owners. Their display on this site is strictly for nominative identification, schedule reference, and informational reporting purposes under established principles of nominative fair use (15 U.S.C. § 1125).
              </p>
            </div>
          )}

          {/* TERMS OF USE */}
          {activeTab === 'terms' && (
            <div className="space-y-3.5">
              <div className="flex items-center space-x-2 text-gray-900 font-extrabold text-sm sm:text-base">
                <FileText className="w-5 h-5 text-blue-600" />
                <h4>Terms of Service & User Agreement</h4>
              </div>
              <p>
                <strong>1. Acceptance of Terms:</strong> By entering and using BigSuuStreams, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree, you must exit immediately.
              </p>
              <p>
                <strong>2. Non-Commercial Personal Use:</strong> This service is provided solely for personal, non-commercial, educational, and sports schedule reference purposes. Commercial exploitation, unauthorized automated scraping, mirroring, or distribution of this service is strictly prohibited.
              </p>
              <p>
                <strong>3. Warranty Disclaimer ("AS IS"):</strong> The website and all indexed content are provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind, either express or implied, including but not limited to the implied warranties of merchantability, fitness for a particular purpose, or uninterrupted uptime.
              </p>
              <p>
                <strong>4. Limitation of Liability:</strong> Under no circumstances shall BigSuuStreams, its creators, operators, or hosting providers be held liable for any direct, indirect, incidental, punitive, or consequential damages resulting from the use of, or inability to use, any third-party link, stream, or service indexed on this platform.
              </p>
            </div>
          )}

          {/* PRIVACY POLICY */}
          {activeTab === 'privacy' && (
            <div className="space-y-3.5">
              <div className="flex items-center space-x-2 text-gray-900 font-extrabold text-sm sm:text-base">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h4>Privacy Policy</h4>
              </div>
              <p>
                <strong>Privacy-First Commitment:</strong> BigSuuStreams values user confidentiality. We do not sell, rent, monetize, or disclose visitor data to advertisers, brokers, or data analytics firms.
              </p>
              <p>
                <strong>Zero Personal Data Stored:</strong> We do not require account registration, and we never collect personal identifiers such as names, physical addresses, phone numbers, or credit card details.
              </p>
              <p>
                <strong>Ephemeral Server Telemetry:</strong> Real-time visitor counts and general device classifications (e.g., iPhone vs. Desktop) are stored exclusively in temporary server RAM to gauge live traffic and are purged automatically on server restart.
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
          <span>BigSuuStreams Legal Shield v1.0</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-black text-white font-bold hover:bg-neutral-800 transition active:scale-95 cursor-pointer text-xs"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
