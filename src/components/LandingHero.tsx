import React from 'react';
import {
  Stethoscope,
  CheckCircle2,
  XCircle,
  ChevronRight,
} from 'lucide-react';

interface LandingHeroProps {
  onSelectWilling: () => void;
  onSelectNonWilling: () => void;
  onSelectComprehensive?: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onSelectWilling,
  onSelectNonWilling,
}) => {
  return (
    <div className="w-full bg-white pb-12">
      {/* ===================== HEADER BANNER (MAINTAINING EXACT DIMENSIONS AND PROPORTIONS) ===================== */}
      <div className="w-full max-w-[97%] xl:max-w-[1480px] mx-auto mt-3 sm:mt-5 px-2 sm:px-4">
        <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm border border-slate-200/80 bg-[#07192F] select-none">
          {/* Header Image: Strictly the uploaded file 03-1.jpeg */}
          <img
            id="hero-banner-image"
            src="/03-1.jpeg"
            alt="KNA 9th BATCH DOCTORS STETH DAY"
            className="w-full h-auto block object-cover sm:object-contain aspect-[1600/520]"
            referrerPolicy="no-referrer"
            loading="eager"
          />
        </div>
      </div>

      {/* ===================== PARTICIPATION RESPONSE SECTION ===================== */}
      <div className="w-full max-w-4xl mx-auto px-3.5 sm:px-4 mt-5 sm:mt-8 space-y-3.5 sm:space-y-4">
        {/* Label: SELECT YOUR PARTICIPATION RESPONSE */}
        <p className="text-xs sm:text-sm font-extrabold tracking-wider text-slate-500 uppercase px-1 text-left">
          SELECT YOUR PARTICIPATION RESPONSE
        </p>

        {/* 1. WILLING PARTICIPATION CARD (PRIMARY ACTION) */}
        <div
          className="relative bg-white rounded-2xl sm:rounded-3xl border-2 border-[#14b8a6] shadow-sm hover:shadow-md transition duration-200 text-left"
          role="region"
          aria-label="Willing Participation Form"
        >
          {/* Pill Badge sitting on top-right border */}
          <div className="absolute -top-3 right-4 sm:right-10 bg-[#00897B] text-white text-[10px] sm:text-xs font-black uppercase px-3.5 sm:px-4 py-0.5 sm:py-1 rounded-full shadow-sm tracking-wider">
            PARTICIPATION FORM
          </div>

          {/* Card Upper Body */}
          <div className="p-4 sm:p-7 flex items-start space-x-3.5 sm:space-x-5">
            {/* Stethoscope Icon in Rounded Square Mint Box */}
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-[#E6F4F1] border border-[#B2DFDB] flex items-center justify-center text-[#00897B] flex-shrink-0">
              <Stethoscope className="w-6 h-6 sm:w-8 sm:h-8 stroke-[2.2]" />
            </div>

            {/* Title and Descriptions */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center space-x-2.5 sm:space-x-3">
                <h2 className="text-lg sm:text-2xl font-black text-slate-900 font-display">
                  Willing
                </h2>
                <span className="inline-flex items-center text-xs font-bold text-[#00897B] bg-[#E6F4F1] border border-[#B2DFDB] px-2 sm:px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Yes
                </span>
              </div>

              <p className="text-xs sm:text-base font-medium text-slate-700 mt-1 sm:mt-1.5">
                "I want to participate in STETH DAY."
              </p>

              <p className="text-[11px] sm:text-sm text-slate-400 mt-0.5 sm:mt-1">
                Upload photo, select coat size & meal tokens
              </p>
            </div>
          </div>

          {/* Card Lower Footer Row */}
          <div className="px-4 pb-4 sm:px-7 sm:pb-6 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onSelectWilling}
              className="text-xs sm:text-sm font-bold text-[#00897B] hover:text-[#00796B] hover:underline transition cursor-pointer text-left"
            >
              Register Student Details
            </button>

            <button
              type="button"
              onClick={onSelectWilling}
              className="inline-flex items-center space-x-1.5 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-[#00897B] hover:bg-[#00796B] text-white text-xs sm:text-sm font-bold shadow-sm transition active:scale-95 cursor-pointer"
            >
              <span>Continue</span>
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* 2. NON-WILLING EXEMPTION CARD (SECONDARY ACTION) */}
        <div
          onClick={onSelectNonWilling}
          className="group relative bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-sm transition-all duration-200 cursor-pointer active:scale-[0.99] text-left"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onSelectNonWilling()}
        >
          <div className="flex items-start space-x-3.5 sm:space-x-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 flex-shrink-0 group-hover:bg-slate-200 transition duration-200">
              <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-800 font-display">
                  Non-Willing Exemption
                </h3>
                <span className="inline-flex items-center justify-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-slate-100 group-hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold transition space-x-1 flex-shrink-0">
                  <span>Confirm</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5 sm:mt-1">
                "I cannot attend the ceremony."
              </p>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 leading-relaxed">
                Instant attendance status confirmation without uploading details
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
