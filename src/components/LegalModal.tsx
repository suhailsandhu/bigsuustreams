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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-gray-200">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-800">
              <Scale className="w-4 h-4 text-gray-800" />
            </div>
            <h3 className="text-sm sm:text-base font-black text-gray-900">
              Legal Compliance
            </h3>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition flex items-center justify-center cursor-pointer active:scale-95"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Minimal Tab Navigation */}
        <div className="grid grid-cols-4 gap-1 p-1.5 bg-gray-50 border-b border-gray-100 text-center text-xs font-bold">
          <button
            onClick={() => setActiveTab('dmca')}
            className={`py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'dmca' ? 'bg-white text-gray-900 shadow-2xs font-black' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            DMCA
          </button>
          <button
            onClick={() => setActiveTab('disclaimer')}
            className={`py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'disclaimer' ? 'bg-white text-gray-900 shadow-2xs font-black' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Disclaimer
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'terms' ? 'bg-white text-gray-900 shadow-2xs font-black' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Terms
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'privacy' ? 'bg-white text-gray-900 shadow-2xs font-black' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Privacy
          </button>
        </div>

        {/* Minimal Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 text-xs text-gray-600 leading-relaxed space-y-3">
          
          {/* DMCA */}
          {activeTab === 'dmca' && (
            <div className="space-y-2.5">
              <div className="flex items-center space-x-1.5 text-gray-900 font-extrabold text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>DMCA Safe Harbor (17 U.S.C. § 512)</span>
              </div>
              <p>
                BSS operates solely as an unhosted search and schedule indexing directory. We do not broadcast, store, host, or encode any media files or video streams. Official highlights are embedded via the verified YouTube API.
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-1.5 text-[11px]">
                <div className="font-bold text-gray-900">Takedown Notices:</div>
                <p>
                  To request removal of an indexed link, provide copyright details, specific URL, and your authorization statement to our designated agent:
                </p>
                <div className="font-bold text-blue-600">
                  <a href="mailto:dmca@bigsuustreams.com">dmca@bigsuustreams.com</a>
                </div>
              </div>
            </div>
          )}

          {/* Trademark Disclaimer */}
          {activeTab === 'disclaimer' && (
            <div className="space-y-2.5">
              <div className="flex items-center space-x-1.5 text-gray-900 font-extrabold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Trademark & Non-Affiliation Disclaimer</span>
              </div>
              <p>
                BSS is an independent non-commercial portal and is <strong>not</strong> affiliated with, endorsed by, or sponsored by the NBA, NFL, or their broadcast partners.
              </p>
              <p>
                All team names, marks, and logos belong to their respective owners and are displayed strictly under <em>nominative fair use</em> (15 U.S.C. § 1125) for identification and score reference only.
              </p>
            </div>
          )}

          {/* Terms of Service */}
          {activeTab === 'terms' && (
            <div className="space-y-2.5">
              <div className="flex items-center space-x-1.5 text-gray-900 font-extrabold text-xs">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Terms of Service</span>
              </div>
              <p>
                1. <strong>Personal Recreation:</strong> This service is provided strictly for individual, personal sports schedule tracking. Scraping or automated crawling is prohibited.
              </p>
              <p>
                2. <strong>"As Is" Basis:</strong> The platform is provided without warranties of any kind. Operators assume no liability for third-party media or external web content.
              </p>
            </div>
          )}

          {/* Privacy Policy */}
          {activeTab === 'privacy' && (
            <div className="space-y-2.5">
              <div className="flex items-center space-x-1.5 text-gray-900 font-extrabold text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Privacy Commitment</span>
              </div>
              <p>
                1. <strong>No Tracking & No Logs:</strong> BSS does not track or store personal browsing histories, nor sell user data to advertising networks.
              </p>
              <p>
                2. <strong>Local Storage Only:</strong> Session credentials and preferences (e.g., volume, quality) are saved solely on your local device.
              </p>
              <p>
                3. <strong>Encrypted Transport:</strong> All data is served over secure Transport Layer Security (HTTPS).
              </p>
            </div>
          )}

        </div>

        {/* Minimal Footer */}
        <div className="p-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-[11px] text-gray-500">
          <span>BSS Legal Compliance</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-full bg-black text-white font-bold hover:bg-neutral-800 transition active:scale-95 cursor-pointer text-[11px]"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
