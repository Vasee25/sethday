import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, ArrowLeft, Loader2, ShieldAlert } from 'lucide-react';

interface NonWillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (responseId: string) => void;
}

export const NonWillingModal: React.FC<NonWillingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedData, setConfirmedData] = useState<{
    responseId: string;
    createdAt: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/register/non-willing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        throw new Error('Failed to record response');
      }

      const data = await res.json();
      setConfirmedData({
        responseId: data.responseId,
        createdAt: data.createdAt,
      });
      onSuccess(data.responseId);
    } catch (err: any) {
      console.error(err);
      setError('Unable to record your response. Please check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-5">
        {!confirmedData ? (
          <>
            {/* Confirmation state */}
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-slate-900 font-display">
                Non-Participation Confirmation
              </h3>
              <p className="text-sm font-semibold text-slate-700">
                "Are you sure you do not wish to participate in STETH DAY?"
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                By confirming, an exemption token will be logged for your records. No personal registration or medical coat will be issued.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                className="w-full py-3.5 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition flex items-center justify-center space-x-2 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Recording Response...</span>
                  </>
                ) : (
                  <span>Confirm Non-Willing</span>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-xl font-semibold text-sm transition flex items-center justify-center space-x-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Go Back</span>
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Success state */}
            <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-slate-900 font-display">
                Response Recorded
              </h3>
              <p className="text-sm font-semibold text-teal-700">
                "Your response has been recorded successfully."
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs space-y-1 mt-3">
                <div className="flex justify-between text-slate-500">
                  <span>Response ID:</span>
                  <span className="font-mono font-bold text-slate-800">{confirmedData.responseId}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Status:</span>
                  <span className="font-bold text-amber-700">NON_WILLING</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Timestamp:</span>
                  <span className="text-slate-700">{new Date(confirmedData.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 pt-1">
                Thank you for notifying the academy. If your plans change, you can return to this portal before registrations close.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm shadow-md transition"
              >
                Return to Home
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
