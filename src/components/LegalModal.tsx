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
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-200">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-800 shadow-2xs">
              <Scale className="w-5 h-5 text-gray-800" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-gray-900 leading-tight">
                Legal Compliance & Statutory Disclaimers
              </h3>
              <p className="text-[11px] text-gray-400 font-medium">
                DMCA Safe Harbor (17 U.S.C. § 512), Nominative Fair Use, Privacy & Terms
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

        {/* Tab Navigation: 4 Comprehensive Sections */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-2 bg-gray-50 border-b border-gray-100 text-center text-xs font-bold">
          <button
            onClick={() => setActiveTab('dmca')}
            className={`py-2 px-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'dmca' ? 'bg-white text-gray-900 shadow-2xs font-black' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            DMCA Safe Harbor
          </button>
          <button
            onClick={() => setActiveTab('disclaimer')}
            className={`py-2 px-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'disclaimer' ? 'bg-white text-gray-900 shadow-2xs font-black' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Trademark Disclaimer
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`py-2 px-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'terms' ? 'bg-white text-gray-900 shadow-2xs font-black' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Terms of Service
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`py-2 px-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'privacy' ? 'bg-white text-gray-900 shadow-2xs font-black' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Privacy Policy
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-xs sm:text-sm text-gray-600 leading-relaxed space-y-4">
          
          {/* SECTION 1: DMCA SAFE HARBOR POLICY */}
          {activeTab === 'dmca' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-gray-900 font-black text-sm sm:text-base">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h4>Digital Millennium Copyright Act (DMCA) Safe Harbor Notification (17 U.S.C. § 512)</h4>
              </div>
              <p>
                <strong>1. Nature of the Service:</strong> BSS operates exclusively as an automated electronic information locator, search aggregation platform, and real-time athletic schedule indexing directory under the safe harbor provisions of Title 17, United States Code, Section 512. BSS does not author, broadcast, encode, host, re-transmit, stream, store, or maintain any video files, audiovisual recordings, media servers, or digital broadcasts on its own servers, networks, or infrastructure.
              </p>
              <p>
                <strong>2. Third-Party Embedded Media & Search Indexing:</strong> All game recap videos and highlight clips presented on this service are embedded directly from publicly accessible third-party application programming interfaces (APIs)—specifically the verified <strong>@NBA YouTube Channel</strong> hosted and distributed by Google LLC / YouTube pursuant to the YouTube Terms of Service and API Services Terms of Use. All live transmission links provided on this service consist entirely of transient, unhosted hypertext references to third-party public web addresses operated independently across the global internet. BSS maintains zero control over third-party servers, content streams, or their underlying digital rights.
              </p>
              <div className="bg-gray-50 border border-gray-200/90 rounded-2xl p-4 space-y-3">
                <h5 className="font-extrabold text-gray-900 text-xs uppercase tracking-wider">
                  Mandatory Notice & Takedown Requirements (17 U.S.C. § 512(c)(3)):
                </h5>
                <p className="text-xs text-gray-500">
                  Copyright owners or designated agents desiring the expedited expungement of any specific indexed hyperlink must submit a legally sufficient notification containing all statutory elements prescribed by federal law:
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-gray-600 pl-1">
                  <li>A physical or electronic signature of a person authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.</li>
                  <li>Identification of the copyrighted work claimed to have been infringed, or a representative list of such works.</li>
                  <li>Identification of the specific URL, material, or hyperlink on this website that is requested to be disabled.</li>
                  <li>Sufficient contact information, including physical legal address, telephone number, and active electronic mail address.</li>
                  <li>A formal statement that the complaining party possesses a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.</li>
                  <li>A formal statement that the information in the notification is accurate, and under penalty of perjury, that the complaining party is authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.</li>
                </ol>
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs font-bold text-gray-900">
                    Designated DMCA Compliance Agent: <a href="mailto:dmca@bigsuustreams.com" className="text-blue-600 underline">dmca@bigsuustreams.com</a>
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Submissions satisfying the statutory requirements of 17 U.S.C. § 512(c)(3) are expedited and disabled within 24 to 48 business hours.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: TRADEMARK & NON-AFFILIATION DISCLAIMER */}
          {activeTab === 'disclaimer' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-gray-900 font-black text-sm sm:text-base">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h4>Express Trademark & Non-Affiliation Disclaimer (15 U.S.C. § 1125)</h4>
              </div>
              <p>
                <strong>1. Comprehensive Disclaimer of Affiliation:</strong> BSS is an entirely independent, private, non-commercial sports enthusiast schedule aggregation service. BSS is <strong>NOT</strong> affiliated with, associated with, sponsored by, endorsed by, authorized by, licensed by, or in any way officially connected with the <strong>National Basketball Association (NBA)</strong>, the <strong>National Football League (NFL)</strong>, the <strong>National Basketball Players Association (NBPA)</strong>, the <strong>NFL Players Association (NFLPA)</strong>, or any of their respective 30 NBA or 32 NFL member franchises, subsidiaries, holding entities, or regional and national broadcast television networks (including ESPN Inc., The Walt Disney Company, Warner Bros. Discovery / TNT Sports, NBCUniversal, CBS Sports, and Amazon Prime Video).
              </p>
              <p>
                Official information, licensed broadcasts, and subscription packages are available directly from the rights holders at <a href="https://www.nba.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">www.nba.com</a> and <a href="https://www.nfl.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">www.nfl.com</a>.
              </p>
              <p>
                <strong>2. Nominative Fair Use Statement:</strong> All league identifiers, franchise wordmarks, team logos, stylized insignia, uniforms, athlete names, and individual statistical figures displayed throughout this portal are registered trademarks, trade dress, and intellectual property of their respective legal owners. The descriptive display of such marks on this website is conducted strictly pursuant to the established federal doctrine of <em>nominative fair use</em> under Section 43(c) of the Lanham Act (15 U.S.C. § 1125(c)(3)(A)) and related common law principles, solely for identification, sports journalistic reporting, and real-time public score reference.
              </p>
            </div>
          )}

          {/* SECTION 3: TERMS OF SERVICE & HOLD-HARMLESS */}
          {activeTab === 'terms' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-gray-900 font-black text-sm sm:text-base">
                <FileText className="w-5 h-5 text-blue-600" />
                <h4>Comprehensive Terms of Service & Hold-Harmless User Agreement</h4>
              </div>
              <p>
                <strong>1. Binding Agreement & Conditions of Entry:</strong> By entering the access passcode, accessing, browsing, or utilizing BSS, you irrevocably acknowledge that you have read, comprehended, and unconditionally agree to be bound by these Terms of Service. If you do not assent in full, your authorization to access this site is immediately revoked, and you must depart forthwith.
              </p>
              <p>
                <strong>2. Strictly Non-Commercial Personal Recreation:</strong> This service is extended exclusively for individual, non-commercial, educational, and sports news reference. Commercial distribution, programmatic crawling, automated scraping, mirroring, framing, reverse engineering, penetration probing, or denial-of-service activities directed at this infrastructure are expressly prohibited and constitute actionable civil and computer-crime violations.
              </p>
              <p>
                <strong>3. Absolute Disclaimer of Warranties ("AS IS" & "AS AVAILABLE"):</strong> To the fullest extent permissible by applicable law, this service, its indexing capabilities, and all third-party media players are provided on an strict "AS IS" and "AS AVAILABLE" basis, without representations or warranties of any kind, whether express, statutory, or implied. BSS disclaims all warranties of merchantability, fitness for a particular purpose, non-infringement, stream continuity, uptime, low latency, or audiovisual clarity.
              </p>
              <p>
                <strong>4. Total Limitation of Liability & Hold-Harmless Covenant:</strong> In no event shall the developers, operators, domain administrators, or infrastructure hosts of BSS be liable for any direct, indirect, incidental, special, punitive, exemplary, or consequential damages (including, but not limited to, loss of profits, internet data overages, service interruptions, or third-party web content) arising out of or in connection with your access to, reliance upon, or utilization of any third-party hyperlink, stream, or embedded player indexed on this website. You expressly agree to indemnify, defend, and hold harmless BSS and its operators from any third-party claims arising from your conduct.
              </p>
              <p>
                <strong>5. Severability & Construction:</strong> If any provision of these Terms is deemed unlawful, void, or for any reason unenforceable by a court of competent jurisdiction, that provision shall be deemed severable from these Terms and shall not affect the validity and enforceability of any remaining provisions.
              </p>
            </div>
          )}

          {/* SECTION 4: PRIVACY POLICY & USER DATA INTEGRITY */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-gray-900 font-black text-sm sm:text-base">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h4>Privacy Policy & Strict User Non-Tracking Commitment</h4>
              </div>
              <p>
                <strong>1. Core Privacy Principle:</strong> BSS operates under a strict principle of user anonymity, data minimization, and privacy-first architecture. We do not sell, rent, monetize, trade, or distribute your personal identifiable information (PII), browsing behavior, or viewing selections to advertising exchanges, marketing brokers, or third parties under any circumstances.
              </p>
              <p>
                <strong>2. Strict No-Logs Operation:</strong> BSS does not track or store persistent logs of individual user IP addresses, viewing histories, stream durations, or device identifiers. All stream routing and access verifications are executed ephemerally in volatile memory (RAM) and are permanently expunged upon session termination.
              </p>
              <p>
                <strong>3. Client-Side Session Storage Only:</strong> This website utilizes localized browser storage (sessionStorage / localStorage) strictly to maintain temporary access authentication tokens and functional display preferences (such as audio volume and sport toggle state). BSS does not deploy cross-site tracking cookies, persistent advertising identifiers, or browser fingerprinting scripts.
              </p>
              <p>
                <strong>4. Third-Party Embedded Media & External Services:</strong> Official game highlights and box scores displayed on BSS are referenced from public third-party services (such as the verified YouTube Embedded Player and public ESPN sport data feeds). Interactions with embedded players are subject to YouTube's Terms of Service and Google's Privacy Policy. BSS maintains zero control over third-party cookie practices or external platforms.
              </p>
              <p>
                <strong>5. End-to-End Transport Security:</strong> All web traffic and API communications are encrypted via modern Transport Layer Security (TLS / HTTPS) protocols, safeguarding your browsing session against eavesdropping, unauthorized interception, and packet inspection.
              </p>
              <p>
                <strong>6. Inquiries & Data Rights:</strong> If you have questions regarding this Privacy Policy or wish to verify our non-retention standards, contact our privacy compliance desk at <strong>dmca@bigsuustreams.com</strong>.
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 sm:p-5 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
          <span className="font-semibold text-[11px] text-gray-400">BSS Legal Shield • 17 U.S.C. § 512</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-black text-white font-bold hover:bg-neutral-800 transition active:scale-95 cursor-pointer text-xs"
          >
            Acknowledge & Close
          </button>
        </div>

      </div>
    </div>
  );
};
