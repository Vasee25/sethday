import React, { useState } from 'react';
import {
  CheckCircle2,
  MapPin,
  Search,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  Check,
  Building,
  X,
  ShieldAlert,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { RegistrationRecord } from '../types.ts';
import { saveRegistrationToFirestore } from '../lib/firebase.ts';
import { KNALogo } from './KNALogo.tsx';

interface CheckInStationProps {
  onBackToDashboard?: () => void;
  onBackToHome: () => void;
  prefillIdentifier?: string;
  isEmbeddedModal?: boolean;
  onCloseModal?: () => void;
}

export const EVENT_VENUE_ADDRESS =
  'STETH DAY 2026 Grand Convention Arena, Kerala NEET Academy Main Auditorium, Medical College Road, Kozhikode / Thrissur, Kerala - 673008';

export const EVENT_GATE_INFO =
  'Gate 1 — Main Delegate Reception Desk & Stethoscope Kit Counter';

export const CheckInStation: React.FC<CheckInStationProps> = ({
  onBackToHome,
  prefillIdentifier = '',
  isEmbeddedModal = false,
  onCloseModal,
}) => {
  const [inputVal, setInputVal] = useState(prefillIdentifier);
  const [submitting, setSubmitting] = useState(false);

  // Check-In Result state
  const [checkInResult, setCheckInResult] = useState<{
    success: boolean;
    alreadyIn?: boolean;
    record?: RegistrationRecord;
    message: string;
    studentName?: string;
    studentCode?: string;
    checkInTime?: string;
  } | null>(null);

  // "Already In" Duplicate Entry Prevention Popup Modal
  const [alreadyInPopup, setAlreadyInPopup] = useState<{
    studentName: string;
    studentCode?: string;
    checkInTime?: string;
  } | null>(null);

  // Play pleasant Web Audio chime on success
  const playSuccessChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch {
      // AudioContext policy
    }
  };

  // Play warning tone on duplicate check-in
  const playWarningTone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.setValueAtTime(260, now + 0.12);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      // AudioContext policy
    }
  };

  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputVal.trim();
    if (!clean) return;

    setSubmitting(true);
    setCheckInResult(null);

    try {
      const res = await fetch('/api/event/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: clean, status: 'IN' }),
      });

      const data = await res.json();

      // Check for "Already In" duplicate check-in validation
      if (data.alreadyIn || data.error === 'Already In') {
        playWarningTone();
        const timeStr = data.checkInTime || data.record?.checkInTime
          ? new Date(data.checkInTime || data.record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : undefined;

        setAlreadyInPopup({
          studentName: data.studentName || data.record?.studentName || clean,
          studentCode: data.studentCode || data.record?.studentCode || '',
          checkInTime: timeStr,
        });
        setSubmitting(false);
        return;
      }

      if (res.ok && data.success && data.record) {
        const updatedRecord: RegistrationRecord = data.record;

        // Sync to Firestore
        saveRegistrationToFirestore({
          ...updatedRecord,
          checkInStatus: 'IN',
          checkInTime: updatedRecord.checkInTime || new Date().toISOString(),
        });

        // Trigger celebratory confetti
        playSuccessChime();
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#00897B', '#10B981', '#064E3B', '#34D399'],
        });

        const timeStr = updatedRecord.checkInTime
          ? new Date(updatedRecord.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        setCheckInResult({
          success: true,
          alreadyIn: false,
          record: updatedRecord,
          studentName: updatedRecord.studentName,
          studentCode: updatedRecord.studentCode || updatedRecord.responseId,
          checkInTime: timeStr,
          message: 'Attendance recorded successfully!',
        });

        setInputVal('');
      } else {
        setCheckInResult({
          success: false,
          message: data.error || `No registered delegate found matching "${clean}". Please verify your Student Code or Name.`,
        });
      }
    } catch (err: any) {
      console.error('Check-in error:', err);
      setCheckInResult({
        success: false,
        message: 'Unable to connect to the check-in server. Please verify your connection and try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`w-full min-h-screen bg-slate-50 flex flex-col justify-between ${isEmbeddedModal ? 'min-h-0 bg-white' : ''}`}>
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onCloseModal || onBackToHome}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition active:scale-95 cursor-pointer"
              title="Return to Registration Portal"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center space-x-2.5">
              <KNALogo variant="emblem" size="sm" />
              <div>
                <h1 className="text-sm sm:text-base font-extrabold text-slate-900 font-display tracking-tight">
                  STETH DAY 2026
                </h1>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  Student Gate Attendance Check-In
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseModal || onBackToHome}
            className="text-xs font-bold text-teal-700 hover:text-teal-800 transition cursor-pointer"
          >
            Registration Portal →
          </button>
        </div>
      </header>

      {/* Main Student Check-In Interface */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-xl mx-auto w-full space-y-6">
        {/* Event Venue & Address Card */}
        <div className="w-full bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-1.5 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start space-x-1.5 text-teal-700 text-xs font-bold uppercase tracking-wider">
            <MapPin className="w-4 h-4 shrink-0 text-teal-600" />
            <span>Event Venue & Reception Gate</span>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-relaxed">
            {EVENT_VENUE_ADDRESS}
          </p>
          <p className="text-[11px] text-slate-500">
            {EVENT_GATE_INFO}
          </p>
        </div>

        {/* Student Check-In Box */}
        <div className="w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-6 text-center">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
              Record Attendance
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Enter your <strong>Student Code</strong> or <strong>Full Name</strong> below and click the button to record your attendance automatically.
            </p>
          </div>

          {/* Simple Form: Text box + Check-In button */}
          <form onSubmit={handleCheckInSubmit} className="space-y-4 text-left">
            <div className="space-y-1.5">
              <label
                htmlFor="student-code-input"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
              >
                Student Code or Name:
              </label>

              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <input
                  id="student-code-input"
                  type="text"
                  value={inputVal}
                  onChange={(e) => {
                    setInputVal(e.target.value);
                    if (checkInResult) setCheckInResult(null);
                  }}
                  placeholder="e.g. KNA001 or Arjun..."
                  autoFocus
                  required
                  className="w-full h-12 pl-11 pr-4 bg-slate-50 border border-slate-300 rounded-xl text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !inputVal.trim()}
              className="w-full h-12 bg-[#00897B] hover:bg-[#00796B] active:scale-[0.99] disabled:opacity-50 text-white font-bold text-sm sm:text-base rounded-xl shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Checking Entry...</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 stroke-[3]" />
                  <span>Check In (Record Attendance)</span>
                </>
              )}
            </button>
          </form>

          {/* Success / Error Feedback */}
          {checkInResult && (
            <div
              className={`rounded-2xl p-5 border text-left transition-all animate-in fade-in duration-150 ${
                checkInResult.success
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-red-50 border-red-300 text-red-950'
              }`}
            >
              {checkInResult.success ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                      <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                    </div>
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 block">
                        Attendance Verified
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 font-display">
                        Welcome, {checkInResult.studentName}!
                      </h3>
                    </div>
                  </div>

                  <div className="bg-white/80 rounded-xl p-3 border border-emerald-200 text-xs space-y-1">
                    <p className="text-slate-700">
                      <strong>Student Code:</strong>{' '}
                      <span className="font-mono font-bold text-teal-800">{checkInResult.studentCode}</span>
                    </p>
                    {checkInResult.checkInTime && (
                      <p className="text-slate-600">
                        <strong>Check-In Time:</strong> {checkInResult.checkInTime}
                      </p>
                    )}
                    <p className="text-emerald-800 font-semibold pt-1">
                      ✓ Your status is updated to 'In' on the reception list. Please proceed to the kit counter at Gate 1.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCheckInResult(null);
                      setInputVal('');
                    }}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs"
                  >
                    Check In Another Student
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-red-700">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-bold">{checkInResult.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCheckInResult(null)}
                    className="text-xs font-semibold text-red-800 hover:underline cursor-pointer"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ========================================================================= */}
      {/* "ALREADY IN" ENTRY VALIDATION POPUP MODAL (PREVENTS DUPLICATE ENTRIES) */}
      {/* ========================================================================= */}
      {alreadyInPopup && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="already-in-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => {
            setAlreadyInPopup(null);
            setInputVal('');
          }}
        >
          <div
            className="w-full max-w-sm sm:max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border-2 border-amber-400 text-center space-y-4 animate-in zoom-in-95 duration-150 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button in top-right */}
            <button
              type="button"
              onClick={() => {
                setAlreadyInPopup(null);
                setInputVal('');
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Warning Icon Badge */}
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
              <ShieldAlert className="w-8 h-8 stroke-[2.2]" />
            </div>

            <div className="space-y-1">
              <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                Entry Validation
              </span>
              <h3
                id="already-in-title"
                className="text-2xl sm:text-3xl font-black text-slate-900 font-display tracking-tight text-amber-950"
              >
                Already In
              </h3>
              <p className="text-xs sm:text-sm text-slate-600">
                This attendee has already been verified and checked in. Duplicate entry is prevented.
              </p>
            </div>

            {/* Attendee Info Card */}
            <div className="bg-amber-50/70 rounded-2xl p-4 border border-amber-200 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Attendee Name</span>
                <span className="font-extrabold text-slate-900 text-sm">{alreadyInPopup.studentName}</span>
              </div>

              {alreadyInPopup.studentCode && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Student Code</span>
                  <span className="font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    {alreadyInPopup.studentCode}
                  </span>
                </div>
              )}

              {alreadyInPopup.checkInTime && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Check-In Recorded</span>
                  <span className="font-semibold text-slate-700">{alreadyInPopup.checkInTime}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1.5 border-t border-amber-200/80">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Current Status</span>
                <span className="inline-flex items-center space-x-1 text-emerald-800 bg-emerald-100 font-black px-2.5 py-0.5 rounded-full text-[11px] border border-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  <span>Marked 'IN'</span>
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Attendance was already recorded. Please proceed directly to the kit distribution counter at Gate 1.
            </p>

            <button
              type="button"
              autoFocus
              onClick={() => {
                setAlreadyInPopup(null);
                setInputVal('');
              }}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-slate-950 font-black text-sm rounded-xl shadow-md transition cursor-pointer"
            >
              OK, Understood
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200/80 bg-white">
        STETH DAY 2026 • Kerala NEET Academy Official Attendance Gateway
      </footer>
    </div>
  );
};
