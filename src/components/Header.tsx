import React from 'react';
import { User } from 'lucide-react';
import { KNALogo } from './KNALogo.tsx';

interface HeaderProps {
  onAdminClick?: () => void;
  onHomeClick?: () => void;
  isAdminView?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onAdminClick,
  onHomeClick,
  isAdminView,
}) => {
  if (isAdminView) {
    return null;
  }

  return (
    <header className="relative z-20 bg-white border-b border-slate-200/80 text-slate-900 shadow-xs">
      <div className="w-full max-w-[98%] xl:max-w-[1550px] mx-auto px-3.5 sm:px-6 py-2 sm:py-3">
        {/* DESKTOP & TABLET VIEW (sm and above): 3-column balanced row */}
        <div className="hidden sm:flex items-center justify-between">
          {/* Brand Logo on the Left */}
          <div className="flex items-center flex-shrink-0 sm:w-48 md:w-56 lg:w-64">
            <button
              type="button"
              onClick={onHomeClick}
              className="flex items-center text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-lg cursor-pointer transition transform active:scale-95 hover:opacity-90"
              title="Kerala NEET Academy - Go to Home"
              aria-label="Go to Kerala NEET Academy Home Page"
            >
              <KNALogo variant="header" size="md" onClick={onHomeClick} />
            </button>
          </div>

          {/* Center Title in Serif Display Typography */}
          <div className="flex-1 px-2 sm:px-4 text-center flex items-center justify-center">
            <h1
              id="header-title"
              className="text-center mx-auto text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold text-slate-950 font-serif tracking-normal uppercase select-none whitespace-nowrap"
            >
              STETH DAY REGISTRATION FORM
            </h1>
          </div>

          {/* Right Action Button: Admin Console Login Icon */}
          <div className="flex items-center justify-end flex-shrink-0 sm:w-48 md:w-56 lg:w-64">
            {onAdminClick && (
              <button
                onClick={onAdminClick}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-[#0F2338] hover:bg-[#163654] border border-slate-700/80 flex items-center justify-center text-teal-400 shadow-sm transition active:scale-95 cursor-pointer"
                title="Admin Console Login"
                aria-label="Admin Console Login"
              >
                <User className="w-5 h-5 text-teal-400" />
              </button>
            )}
          </div>
        </div>

        {/* MOBILE VIEW (< sm): Clean, spacious 2-tier layout */}
        <div className="flex sm:hidden flex-col gap-1.5">
          {/* Top Row: Logo on left, admin login on right */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                type="button"
                onClick={onHomeClick}
                className="flex items-center text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-lg cursor-pointer transition transform active:scale-95 hover:opacity-90"
                title="Kerala NEET Academy - Go to Home"
                aria-label="Go to Kerala NEET Academy Home Page"
              >
                <KNALogo variant="header" size="sm" onClick={onHomeClick} />
              </button>
            </div>

            {onAdminClick && (
              <button
                onClick={onAdminClick}
                className="w-9 h-9 rounded-lg bg-[#0F2338] hover:bg-[#163654] border border-slate-700/80 flex items-center justify-center text-teal-400 shadow-xs transition active:scale-95 cursor-pointer"
                title="Admin Console Login"
                aria-label="Admin Console Login"
              >
                <User className="w-4 h-4 text-teal-400" />
              </button>
            )}
          </div>

          {/* Bottom Row: Title centered */}
          <div className="text-center border-t border-slate-100/90 pt-1.5 pb-0.5 px-1">
            <h1
              id="header-title-mobile"
              className="text-center mx-auto font-extrabold text-slate-950 font-serif tracking-tight uppercase select-none leading-tight max-w-full break-words"
              style={{ fontSize: 'clamp(16px, 5.2vw, 24px)' }}
            >
              STETH DAY REGISTRATION FORM
            </h1>
          </div>
        </div>
      </div>
    </header>
  );
};

