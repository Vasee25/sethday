import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Share2,
  Printer,
  RotateCcw,
  Home,
  FileCheck,
  Building2,
  Utensils,
  Shirt,
  Calendar,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { RegistrationRecord } from '../types.ts';
import { KNALogo } from './KNALogo.tsx';
import { generateStudentPDF } from '../lib/pdf.ts';

interface SuccessViewProps {
  studentCode: string;
  responseId: string;
  record: RegistrationRecord;
  onRegisterAnother: () => void;
  onHome: () => void;
}

export const SuccessView: React.FC<SuccessViewProps> = ({
  studentCode,
  responseId,
  record,
  onRegisterAnother,
  onHome,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  useEffect(() => {
    // Gentle celebration confetti
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#0d9488', '#0f766e', '#14b8a6', '#f59e0b', '#3b82f6'],
      });
    } catch (e) {
      // Ignore if canvas-confetti fails in iframe
    }
  }, []);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    const identifier = studentCode || responseId || 'KNA-REG';
    try {
      const downloadUrl = `/api/registration/${encodeURIComponent(identifier)}/pdf?download=true`;
      const response = await fetch(downloadUrl);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${identifier}_STETH_DAY_Registration.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        return;
      }
      throw new Error(`Server status ${response.status}`);
    } catch (err) {
      console.warn('Server-side PDF download failed, initiating instant browser-side generation fallback:', err);
      try {
        const { doc, filename } = await generateStudentPDF(record, null);
        doc.save(filename);
      } catch (clientErr) {
        console.error('Client PDF generation failed as well:', clientErr);
        window.open(`/api/registration/${encodeURIComponent(identifier)}/pdf`, '_blank');
      }
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    const shareText = `Kerala NEET Academy - STETH DAY 2026\nOfficial Registration Pass for ${record.studentName}\nStudent Code: ${studentCode}\nResponse ID: ${responseId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `STETH DAY Registration - ${studentCode}`,
          text: shareText,
          url: window.location.href,
        });
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2500);
      } catch (e) {
        // User cancelled share
      }
    } else {
      // Fallback: Copy to clipboard
      handleCopyCode();
    }
  };

  const handlePrint = () => {
    const identifier = studentCode || responseId || 'KNA-REG';
    window.open(`/api/registration/${encodeURIComponent(identifier)}/pdf`, '_blank');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(studentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalFood = (record.foodVegCount || 0) + (record.foodNonVegCount || 0);

  return (
    <div className="w-full max-w-md mx-auto sm:max-w-xl lg:max-w-2xl px-4 py-5 space-y-6">
      {/* Celebration Header */}
      <div className="text-center space-y-2 pt-2">
        <div className="w-16 h-16 rounded-full bg-teal-50 border-2 border-teal-500 text-teal-600 flex items-center justify-center mx-auto shadow-md shadow-teal-500/10 animate-in zoom-in-50 duration-300">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-3 py-0.5 rounded-full border border-teal-200">
            ✓ Registration Successful
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
            Welcome to STETH DAY
          </h2>
          <p className="text-sm text-slate-600 max-w-sm mx-auto">
            "Your STETH DAY registration has been successfully recorded."
          </p>
        </div>
      </div>

      {/* Official Student Code Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 rounded-3xl p-6 text-white shadow-xl border border-teal-800/40 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between border-b border-slate-700/80 pb-4">
          <div className="flex items-center space-x-3">
            <KNALogo variant="emblem" size="sm" />
            <div>
              <span className="text-[11px] font-extrabold tracking-widest uppercase text-teal-400">
                KNA Official Pass
              </span>
              <p className="text-xs text-slate-400 font-medium">Kerala NEET Academy</p>
            </div>
          </div>
          <button
            onClick={handleCopyCode}
            className="flex items-center space-x-1 text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-700 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Code'}</span>
          </button>
        </div>

        {/* Student Code Display */}
        <div className="py-6 text-center space-y-1">
          <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
            Official Assigned Student Code
          </span>
          <div className="text-4xl sm:text-5xl font-extrabold tracking-wider text-teal-400 font-display">
            {studentCode}
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Response ID: {responseId}
          </p>
        </div>

        {/* Mini Attendee Summary */}
        <div className="bg-slate-800/60 rounded-2xl p-3.5 border border-slate-700/60 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Candidate</span>
            <span className="font-bold text-slate-100 truncate block">{record.studentName}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Coat Size</span>
            <span className="font-bold text-teal-300">Size {record.coatSize}</span>
          </div>
          {record.ntaScore !== undefined && record.ntaScore !== null ? (
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">NTA Score</span>
              <span className="font-bold text-emerald-400">{record.ntaScore} / 720</span>
            </div>
          ) : null}
          {record.medicalCollegeName ? (
            <div className="col-span-2 sm:col-span-3 pt-1 border-t border-slate-700/40">
              <span className="text-slate-400 block text-[10px] uppercase">Medical College</span>
              <span className="font-semibold text-slate-200 truncate block">{record.medicalCollegeName}</span>
            </div>
          ) : (
            <div className="col-span-2 sm:col-span-3 pt-1 border-t border-slate-700/40">
              <span className="text-slate-400 block text-[10px] uppercase">Registered Event</span>
              <span className="font-semibold text-teal-300 truncate block">STETH DAY Ceremony</span>
            </div>
          )}
        </div>
      </div>

      {/* Large Mobile PDF & Action Controls */}
      <div className="space-y-2.5">
        {/* Primary Download Button */}
        <button
          type="button"
          onClick={handleDownloadPDF}
          disabled={downloading}
          className="w-full min-h-[52px] py-3.5 px-6 rounded-2xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-extrabold text-base shadow-lg shadow-teal-700/20 transition flex items-center justify-center space-x-2.5 disabled:opacity-60"
        >
          {downloading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Preparing A4 Official Pass...</span>
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              <span>Download Official PDF Pass</span>
            </>
          )}
        </button>

        {/* Secondary Mobile Actions: Share & Print */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleShare}
            className="py-3 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 shadow-xs transition flex items-center justify-center space-x-1.5"
          >
            <Share2 className="w-4 h-4 text-teal-600" />
            <span>{shareSuccess ? 'Shared!' : 'Share Pass'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="py-3 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 shadow-xs transition flex items-center justify-center space-x-1.5"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print Pass</span>
          </button>
        </div>
      </div>

      {/* Detailed Pass Breakdown Sheet Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
          <FileCheck className="w-4 h-4 text-teal-600" />
          <span>Registration Receipt Details</span>
        </h4>

        <div className="divide-y divide-slate-100 text-xs">
          <div className="py-2 flex justify-between">
            <span className="text-slate-500">Student Name</span>
            <span className="font-semibold text-slate-900">{record.studentName}</span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-slate-500">Father's Name</span>
            <span className="font-semibold text-slate-900">{record.fatherName}</span>
          </div>
          {record.ntaScore !== undefined && record.ntaScore !== null ? (
            <div className="py-2 flex justify-between">
              <span className="text-slate-500">NTA NEET Score</span>
              <span className="font-bold text-teal-700">{record.ntaScore} / 720</span>
            </div>
          ) : null}
          <div className="py-2 flex justify-between">
            <span className="text-slate-500">Contact Number</span>
            <span className="font-mono font-semibold text-slate-900">+91 {record.contactNumber}</span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-slate-500">Meal Tokens</span>
            <span className="font-semibold text-slate-900">
              {record.foodVegCount} Veg + {record.foodNonVegCount} Non-Veg ({totalFood} Total)
            </span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-slate-500">Doctor Apron Size</span>
            <span className="font-bold text-teal-700">Size {record.coatSize}</span>
          </div>
        </div>

        <div className="p-3 bg-teal-50/70 border border-teal-200/80 rounded-xl text-xs text-teal-900 space-y-1">
          <p className="font-bold">Important Next Steps:</p>
          <p className="text-[11px] text-teal-800">
            Please keep your Student Code <strong>{studentCode}</strong> safely. Present the downloaded PDF on your mobile at the entry desk on STETH DAY.
          </p>
        </div>
      </div>

      {/* Footer Navigation: Register Another & Home */}
      <div className="pt-2 flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={onRegisterAnother}
          className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition flex items-center justify-center space-x-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Register Another Student</span>
        </button>

        <button
          type="button"
          onClick={onHome}
          className="flex-1 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition flex items-center justify-center space-x-1.5"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Return to Home</span>
        </button>
      </div>
    </div>
  );
};
