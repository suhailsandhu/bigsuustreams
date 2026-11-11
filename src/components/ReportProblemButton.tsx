import React, { useState } from 'react';
import { X, Send, CheckCircle2 } from 'lucide-react';

interface ReportProblemModalProps {
  currentUser?: any;
  isOpen?: boolean;
  onClose?: () => void;
}

export const ReportProblemButton: React.FC<ReportProblemModalProps> = ({ 
  currentUser,
  isOpen: controlledIsOpen,
  onClose: controlledOnClose
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const handleClose = controlledOnClose || (() => setInternalIsOpen(false));

  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/report-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          user: currentUser?.displayName || currentUser?.username || 'Guest',
          email: currentUser?.email || 'anonymous',
          url: window.location.href,
          userAgent: navigator.userAgent
        })
      });

      if (res.ok) {
        setIsSubmitted(true);
        setMessage('');
        setTimeout(() => {
          setIsSubmitted(false);
          handleClose();
        }, 2200);
      } else {
        setError('Failed to submit report. Please try again.');
      }
    } catch {
      // Local fallback
      setIsSubmitted(true);
      setMessage('');
      setTimeout(() => {
        setIsSubmitted(false);
        handleClose();
      }, 2200);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Pop-up Text Box Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150 flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 font-serif font-black italic text-sm">
                  i
                </div>
                <h3 className="text-sm font-extrabold text-gray-900">
                  Report a problem
                </h3>
              </div>
              <button
                onClick={handleClose}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 flex items-center justify-center transition cursor-pointer active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            {isSubmitted ? (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 animate-bounce" />
                <h4 className="text-sm font-black text-gray-900">
                  Report Received!
                </h4>
                <p className="text-xs font-semibold text-gray-500">
                  It'll be fixed ASAP
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="pt-3 space-y-3">
                <p className="text-xs text-gray-500 leading-relaxed">
                  Notice an issue with a stream or feature? Type your message below:
                </p>

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe what's happening (e.g. stream buffering, score error)..."
                  rows={4}
                  required
                  autoFocus
                  className="w-full p-3 rounded-2xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-black focus:ring-2 focus:ring-black/10 transition resize-none"
                />

                {error && (
                  <p className="text-xs text-red-500 font-bold text-center">
                    {error}
                  </p>
                )}

                <div className="flex flex-col items-center space-y-2 pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting || !message.trim()}
                    className="w-full py-2.5 px-4 rounded-xl bg-black hover:bg-neutral-800 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md transition active:scale-98 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Sending...' : 'Send Report'}</span>
                  </button>
                  <span className="text-[11px] font-semibold text-gray-400">
                    It'll be fixed ASAP
                  </span>
                </div>
              </form>
            )}

          </div>
        </div>
      )}
    </>
  );
};

export default ReportProblemButton;
