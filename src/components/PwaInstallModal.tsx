import React from 'react';
import { X, Smartphone, Share, PlusSquare, Download } from 'lucide-react';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstallSuccess: () => void;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstallSuccess
}) => {
  if (!isOpen) return null;

  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        onInstallSuccess();
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-[#12151e] border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-slate-900 border border-slate-800"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Smartphone className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">Install BSS Streams</h3>
            <p className="text-xs text-slate-400">Add to your Home Screen for full-screen sports streaming</p>
          </div>
        </div>

        {/* iOS Safari Instructions */}
        {isIos ? (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs text-slate-300">
            <p className="font-bold text-white text-sm">How to install on iPhone & iPad:</p>
            <div className="space-y-2">
              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-600/30 text-orange-400 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                <span>Tap the <strong>Share</strong> button <Share className="w-3.5 h-3.5 inline mx-1 text-sky-400" /> at the bottom of Safari.</span>
              </div>
              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-600/30 text-orange-400 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                <span>Scroll down and select <strong>Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-slate-200" />.</span>
              </div>
              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-600/30 text-orange-400 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                <span>Tap <strong>Add</strong> in the top-right corner.</span>
              </div>
            </div>
          </div>
        ) : (
          /* Chrome / Android / Desktop Instructions */
          <div className="space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              Install Courtside Stream as a Progressive Web App (PWA) to enjoy a native, standalone fullscreen sports experience with instant loading and zero ads.
            </p>

            {deferredPrompt ? (
              <button
                onClick={handleInstallClick}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-extrabold text-sm py-3 px-4 rounded-xl shadow-xl shadow-orange-500/20 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Install Application Now</span>
              </button>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-400">
                <span>To install, open your browser menu (<strong>⋮</strong> in Chrome or <strong>⚙</strong>) and choose <strong>"Install Courtside Stream"</strong> or <strong>"Add to Home screen"</strong>.</span>
              </div>
            )}
          </div>
        )}

        <div className="pt-2 text-center">
          <button
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
};
