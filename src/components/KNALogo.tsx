import React from 'react';

interface KNALogoProps {
  variant?: 'emblem' | 'full' | 'tiles' | 'compact' | 'uploaded' | 'header';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
  onClick?: () => void;
}

export const KNALogo: React.FC<KNALogoProps> = ({
  variant = 'compact',
  size = 'md',
  className = '',
  showText = true,
  onClick,
}) => {
  const [useImgFallback, setUseImgFallback] = React.useState(false);

  // Height sizing
  const sizeMap = {
    sm: { emblem: 'h-8 w-8', full: 'h-8', tiles: 'h-6', img: 'h-8' },
    md: { emblem: 'h-11 w-11', full: 'h-11', tiles: 'h-8', img: 'h-11' },
    lg: { emblem: 'h-16 w-16', full: 'h-16', tiles: 'h-11', img: 'h-16' },
    xl: { emblem: 'h-24 w-24', full: 'h-24', tiles: 'h-16', img: 'h-24' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  if (variant === 'uploaded') {
    if (!useImgFallback) {
      return (
        <img
          src="/kna_logo_.png"
          alt="Kerala NEET Academy Official Logo"
          className={`${currentSize.img} w-auto object-contain select-none drop-shadow-sm ${className}`}
          onError={() => setUseImgFallback(true)}
          referrerPolicy="no-referrer"
        />
      );
    }
  }

  // The Crest Emblem: Heraldic Shield, 5 Golden Stars, Laurel Leaves, Cross with K/KNA/A, and Banner
  const EmblemSVG = (
    <svg
      viewBox="0 0 200 230"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${currentSize.emblem} drop-shadow-md flex-shrink-0 select-none`}
      aria-label="Kerala NEET Academy Official Emblem"
    >
      <defs>
        {/* Metallic Gold Gradient */}
        <linearGradient id="knaGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF4B8" />
          <stop offset="25%" stopColor="#F5C842" />
          <stop offset="50%" stopColor="#FFEAA7" />
          <stop offset="75%" stopColor="#D49B1F" />
          <stop offset="100%" stopColor="#8A5E0B" />
        </linearGradient>

        <linearGradient id="knaGoldDark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D49B1F" />
          <stop offset="100%" stopColor="#5E3E04" />
        </linearGradient>

        {/* Shield Right Half - Deep Navy Royal Blue Gradient */}
        <radialGradient id="knaNavy" cx="60%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#1C4B82" />
          <stop offset="55%" stopColor="#0B2A56" />
          <stop offset="100%" stopColor="#04142B" />
        </radialGradient>

        {/* Shield Left Half - Deep Cyan / Teal Metallic Blue Gradient */}
        <radialGradient id="knaCyanShield" cx="40%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#0D7692" />
          <stop offset="55%" stopColor="#074E66" />
          <stop offset="100%" stopColor="#032636" />
        </radialGradient>

        {/* Medical Cross Red-Orange Gradient (Top/Right) */}
        <linearGradient id="knaOrangeRed" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="45%" stopColor="#EA580C" />
          <stop offset="100%" stopColor="#B91C1C" />
        </linearGradient>

        {/* Medical Cross Teal-Cyan Gradient (Left/Bottom) */}
        <linearGradient id="knaTealCyan" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="45%" stopColor="#0891B2" />
          <stop offset="100%" stopColor="#0E7490" />
        </linearGradient>

        {/* Drop Shadow Filter */}
        <filter id="goldGlow" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000" floodOpacity="0.5" />
        </filter>

        {/* Clip Path for Shield Interior */}
        <clipPath id="innerShieldClip">
          <path d="M 100 14 C 141 14 176 25 176 56 C 176 130 136 172 100 196 C 64 172 24 130 24 56 C 24 25 59 14 100 14 Z" />
        </clipPath>
      </defs>

      {/* 1. Outer Golden Heraldic Shield with Beveled Relief */}
      <path
        d="M 100 7 C 145 7 185 19 185 55 C 185 136 141 181 100 207 C 59 181 15 136 15 55 C 15 19 55 7 100 7 Z"
        fill="url(#knaGold)"
        filter="url(#goldGlow)"
      />

      {/* 2. Inner Shield Field - Two-Tone Vertical Split (Cyan on Left, Navy on Right) */}
      <g clipPath="url(#innerShieldClip)">
        {/* Left half: Metallic Cyan */}
        <rect x="0" y="0" width="100" height="210" fill="url(#knaCyanShield)" />
        {/* Right half: Royal Navy */}
        <rect x="100" y="0" width="100" height="210" fill="url(#knaNavy)" />
        {/* Vertical center soft seam */}
        <line x1="100" y1="14" x2="100" y2="196" stroke="#000" strokeWidth="0.8" strokeOpacity="0.3" />
      </g>

      {/* Inner Thin Gold Trim */}
      <path
        d="M 100 20 C 137 20 168 30 168 58 C 168 124 132 163 100 186 C 68 163 32 124 32 58 C 32 30 63 20 100 20 Z"
        fill="none"
        stroke="url(#knaGold)"
        strokeWidth="2.5"
        strokeOpacity="0.9"
      />

      {/* 3. Six Golden Stars Arched at the Top (Matching Golden logo1.png) */}
      <g fill="url(#knaGold)" stroke="#8A5E0B" strokeWidth="0.5">
        {/* Star 1 (Far Left) */}
        <polygon points="40,51 43,58 50,58 44,62 46,69 40,65 34,69 36,62 30,58 37,58" transform="rotate(-18 40 60)" />
        {/* Star 2 (Mid Left) */}
        <polygon points="62,39 65,46 72,46 66,50 68,57 62,53 56,57 58,50 52,46 59,46" transform="rotate(-11 62 48)" />
        {/* Star 3 (Center-Left) */}
        <polygon points="84,31 87,38 94,38 88,42 90,49 84,45 78,49 80,42 74,38 81,38" transform="rotate(-4 84 40)" />
        {/* Star 4 (Center-Right) */}
        <polygon points="116,31 119,38 126,38 120,42 122,49 116,45 110,49 112,42 106,38 113,38" transform="rotate(4 116 40)" />
        {/* Star 5 (Mid Right) */}
        <polygon points="138,39 141,46 148,46 142,50 144,57 138,53 132,57 134,50 128,46 135,46" transform="rotate(11 138 48)" />
        {/* Star 6 (Far Right) */}
        <polygon points="160,51 163,58 170,58 164,62 166,69 160,65 154,69 156,62 150,58 157,58" transform="rotate(18 160 60)" />
      </g>

      {/* 4. Golden Laurel Wreaths (Flanking Leaves) */}
      <g fill="url(#knaGold)" stroke="#8A5E0B" strokeWidth="0.4">
        {/* Left Laurel Leaves */}
        <path d="M 36 68 C 42 70 44 76 38 80 C 33 76 33 70 36 68 Z" />
        <path d="M 40 82 C 47 84 48 91 42 94 C 37 91 37 84 40 82 Z" />
        <path d="M 42 98 C 50 100 50 108 44 111 C 39 107 39 100 42 98 Z" />
        <path d="M 45 116 C 53 118 52 126 46 128 C 41 124 41 117 45 116 Z" />
        <path d="M 52 134 C 59 137 57 144 51 146 C 47 141 48 135 52 134 Z" />
        <path d="M 62 151 C 69 154 66 161 60 162 C 57 157 58 152 62 151 Z" />
        <path d="M 76 166 C 83 168 79 175 73 175 C 70 170 72 166 76 166 Z" />

        {/* Right Laurel Leaves */}
        <path d="M 164 68 C 158 70 156 76 162 80 C 167 76 167 70 164 68 Z" />
        <path d="M 160 82 C 153 84 152 91 158 94 C 163 91 163 84 160 82 Z" />
        <path d="M 158 98 C 150 100 150 108 156 111 C 161 107 161 100 158 98 Z" />
        <path d="M 155 116 C 147 118 148 126 154 128 C 159 124 159 117 155 116 Z" />
        <path d="M 148 134 C 141 137 143 144 149 146 C 153 141 152 135 148 134 Z" />
        <path d="M 138 151 C 131 154 134 161 140 162 C 143 157 142 152 138 151 Z" />
        <path d="M 124 166 C 117 168 121 175 127 175 C 130 170 128 166 124 166 Z" />
      </g>

      {/* 5. Center Medical Cross */}
      <g filter="url(#goldGlow)">
        {/* Cross Gold Beveled Border */}
        <path
          d="M 82 58 L 118 58 L 118 84 L 144 84 L 144 120 L 118 120 L 118 148 L 82 148 L 82 120 L 56 120 L 56 84 L 82 84 Z"
          fill="url(#knaGold)"
        />

        {/* Top Arm & Right Arm (Warm Orange-Red gradient) */}
        <path
          d="M 85 61 L 115 61 L 115 102 L 141 102 L 141 117 L 115 117 L 100 102 L 100 61 Z"
          fill="url(#knaOrangeRed)"
        />

        {/* Left Arm & Bottom Arm (Cyan-Teal gradient) */}
        <path
          d="M 59 87 L 100 87 L 100 102 L 115 117 L 115 145 L 85 145 L 85 117 L 59 117 Z"
          fill="url(#knaTealCyan)"
        />

        {/* Diagonal division accent */}
        <line x1="60" y1="117" x2="140" y2="87" stroke="#FFF" strokeWidth="1" strokeOpacity="0.4" />

        {/* Letters inside the cross: K (top), K (left), N (center), A (right), A (bottom) */}
        {/* Top 'K' */}
        <text
          x="100"
          y="78"
          textAnchor="middle"
          fontSize="17"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          fill="url(#knaGold)"
          stroke="#523906"
          strokeWidth="0.6"
        >
          K
        </text>

        {/* Left 'K' */}
        <text
          x="72"
          y="108"
          textAnchor="middle"
          fontSize="16"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          fill="url(#knaGold)"
          stroke="#523906"
          strokeWidth="0.6"
        >
          K
        </text>

        {/* Center 'N' */}
        <text
          x="100"
          y="108"
          textAnchor="middle"
          fontSize="17"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          fill="url(#knaGold)"
          stroke="#523906"
          strokeWidth="0.7"
        >
          N
        </text>

        {/* Right 'A' */}
        <text
          x="128"
          y="108"
          textAnchor="middle"
          fontSize="16"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          fill="url(#knaGold)"
          stroke="#523906"
          strokeWidth="0.6"
        >
          A
        </text>

        {/* Bottom 'A' */}
        <text
          x="100"
          y="138"
          textAnchor="middle"
          fontSize="17"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          fill="url(#knaGold)"
          stroke="#523906"
          strokeWidth="0.6"
        >
          A
        </text>

        {/* Gold Diamond Sparkle on Cross Top Left */}
        <polygon
          points="83,62 85,57 87,62 92,64 87,66 85,71 83,66 78,64"
          fill="#FFF9D2"
          opacity="0.9"
        />
      </g>

      {/* 6. Lower Curved Ribbon / Banner with "KERALA NEET ACADEMY" */}
      <g filter="url(#goldGlow)">
        {/* Banner Left Red Fold Wingtip */}
        <polygon points="12,176 18,170 24,196 16,198 10,186" fill="#B91C1C" stroke="#7F1D1D" strokeWidth="0.5" />
        {/* Banner Right Red Fold Wingtip */}
        <polygon points="188,176 182,170 176,196 184,198 190,186" fill="#B91C1C" stroke="#7F1D1D" strokeWidth="0.5" />

        {/* Ribbon Outer Gold Contour */}
        <path
          d="M 12 168 C 50 152 150 152 188 168 L 180 200 C 145 186 55 186 20 200 Z"
          fill="url(#knaGold)"
        />
        {/* Ribbon Inner Navy Field */}
        <path
          d="M 15 171 C 52 156 148 156 185 171 L 178 197 C 144 184 56 184 22 197 Z"
          fill="url(#knaNavy)"
        />

        {/* Curved Text Path */}
        <path
          id="bannerTextPath"
          d="M 24 191 C 60 178 140 178 176 191"
          fill="none"
        />
        <text
          fontSize="11.5"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          fill="url(#knaGold)"
          letterSpacing="1.2"
        >
          <textPath href="#bannerTextPath" startOffset="50%" textAnchor="middle">
            KERALA NEET ACADEMY
          </textPath>
        </text>
      </g>

      {/* TM Symbol */}
      <text
        x="185"
        y="30"
        fontSize="9"
        fontWeight="bold"
        fill="url(#knaGold)"
        fontFamily="sans-serif"
      >
        TM
      </text>
    </svg>
  );

  // The 3 Signature Green Rounded Square Tiles with Yellow "K" "N" "A"
  const TilesSVG = (
    <div className="flex items-center space-x-1 sm:space-x-1.5 flex-shrink-0 select-none">
      {/* Tile 1: K */}
      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-[#084024] border border-[#0d5932] shadow-sm flex items-center justify-center text-[#FFE500] font-black text-xs sm:text-base tracking-tighter">
        K
      </div>
      {/* Tile 2: N */}
      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-[#084024] border border-[#0d5932] shadow-sm flex items-center justify-center text-[#FFE500] font-black text-xs sm:text-base tracking-tighter">
        N
      </div>
      {/* Tile 3: A */}
      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-[#084024] border border-[#0d5932] shadow-sm flex items-center justify-center text-[#FFE500] font-black text-xs sm:text-base tracking-tighter">
        A
      </div>
    </div>
  );

  // Tile-style spelling of KERALA
  const KeralaTiles = (
    <div className="flex items-center space-x-0.5">
      {['K', 'E', 'R', 'A', 'L', 'A'].map((letter, idx) => (
        <span
          key={idx}
          className="inline-flex items-center justify-center w-3.5 h-3.5 sm:w-4 sm:h-4 bg-[#084024] text-[#FFE500] font-extrabold text-[9px] sm:text-[10px] rounded"
        >
          {letter}
        </span>
      ))}
    </div>
  );

  if (variant === 'emblem') {
    if (!useImgFallback) {
      return (
        <div className={`inline-flex items-center justify-center ${className}`}>
          <img
            id="kna-emblem-logo-img"
            src="/KNA.png"
            alt="Kerala NEET Academy Official Emblem"
            className={`${currentSize.emblem} w-auto object-contain select-none drop-shadow-md`}
            onError={() => setUseImgFallback(true)}
            referrerPolicy="no-referrer"
          />
        </div>
      );
    }
    return <div className={`inline-flex items-center ${className}`}>{EmblemSVG}</div>;
  }

  if (variant === 'tiles') {
    return <div className={`inline-flex items-center ${className}`}>{TilesSVG}</div>;
  }

  // Exact Match to Screenshot Header Logo (Shield + Big Green KNA Tiles + Kerala NEET Academy)
  if (variant === 'header') {
    if (!useImgFallback) {
      return (
        <div
          onClick={onClick}
          role={onClick ? 'button' : undefined}
          tabIndex={onClick ? 0 : undefined}
          onKeyDown={
            onClick
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                  }
                }
              : undefined
          }
          className={`flex items-center select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
        >
          <img
            id="kna-header-logo-image"
            src="/kna_logo_.png"
            alt="Kerala NEET Academy Official Logo"
            className="h-10 sm:h-12 md:h-14 w-auto object-contain select-none cursor-pointer transition-all duration-150 ease-in-out hover:opacity-90 hover:scale-[1.02] active:scale-95 active:opacity-80"
            onError={() => setUseImgFallback(true)}
            referrerPolicy="no-referrer"
          />
        </div>
      );
    }

    return (
      <div
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
        className={`flex items-center space-x-2 sm:space-x-3 select-none ${onClick ? 'cursor-pointer hover:opacity-90 active:scale-95 transition-all duration-150' : ''} ${className}`}
      >
        {/* Emblem Shield */}
        <div className="flex-shrink-0">
          <svg
            viewBox="0 0 200 230"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 sm:h-14 sm:w-14 drop-shadow-sm flex-shrink-0"
            aria-label="Kerala NEET Academy Emblem"
          >
            {/* Same high-definition crest definitions */}
            <defs>
              <linearGradient id="hdrGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFF2A6" />
                <stop offset="30%" stopColor="#E5B232" />
                <stop offset="60%" stopColor="#FFF6BD" />
                <stop offset="85%" stopColor="#C9941C" />
                <stop offset="100%" stopColor="#8C630D" />
              </linearGradient>
              <radialGradient id="hdrNavy" cx="50%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#1E4578" />
                <stop offset="50%" stopColor="#0E2A54" />
                <stop offset="100%" stopColor="#061833" />
              </radialGradient>
              <linearGradient id="hdrOrangeRed" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FB923C" />
                <stop offset="50%" stopColor="#EA580C" />
                <stop offset="100%" stopColor="#B91C1C" />
              </linearGradient>
              <linearGradient id="hdrTealCyan" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22D3EE" />
                <stop offset="50%" stopColor="#0891B2" />
                <stop offset="100%" stopColor="#0E7490" />
              </linearGradient>
            </defs>

            {/* Outer Gold Shield */}
            <path
              d="M 100 8 C 145 8 184 20 184 55 C 184 135 140 180 100 206 C 60 180 16 135 16 55 C 16 20 55 8 100 8 Z"
              fill="url(#hdrGold)"
            />
            {/* Inner Navy Shield */}
            <path
              d="M 100 14 C 141 14 176 25 176 56 C 176 130 136 172 100 196 C 64 172 24 130 24 56 C 24 25 59 14 100 14 Z"
              fill="url(#hdrNavy)"
            />
            <path
              d="M 100 20 C 137 20 168 30 168 58 C 168 124 132 163 100 186 C 68 163 32 124 32 58 C 32 30 63 20 100 20 Z"
              fill="none"
              stroke="url(#hdrGold)"
              strokeWidth="2.5"
              strokeOpacity="0.85"
            />
            {/* 5 Stars */}
            <g fill="url(#hdrGold)">
              <polygon points="46,45 49,52 56,52 50,56 52,63 46,59 40,63 42,56 36,52 43,52" />
              <polygon points="72,36 75,43 82,43 76,47 78,54 72,50 66,54 68,47 62,43 69,43" />
              <polygon points="100,28 103,36 112,36 105,41 108,49 100,44 92,49 95,41 88,36 97,36" />
              <polygon points="128,36 131,43 138,43 132,47 134,54 128,50 122,54 124,47 118,43 125,43" />
              <polygon points="154,45 157,52 164,52 158,56 160,63 154,59 148,63 150,56 144,52 151,52" />
            </g>
            {/* Laurel leaves */}
            <g fill="url(#hdrGold)">
              <path d="M 36 68 C 42 70 44 76 38 80 C 33 76 33 70 36 68 Z" />
              <path d="M 40 82 C 47 84 48 91 42 94 C 37 91 37 84 40 82 Z" />
              <path d="M 42 98 C 50 100 50 108 44 111 C 39 107 39 100 42 98 Z" />
              <path d="M 164 68 C 158 70 156 76 162 80 C 167 76 167 70 164 68 Z" />
              <path d="M 160 82 C 153 84 152 91 158 94 C 163 91 163 84 160 82 Z" />
              <path d="M 158 98 C 150 100 150 108 156 111 C 161 107 161 100 158 98 Z" />
            </g>
            {/* Medical Cross */}
            <path
              d="M 82 58 L 118 58 L 118 84 L 144 84 L 144 120 L 118 120 L 118 148 L 82 148 L 82 120 L 56 120 L 56 84 L 82 84 Z"
              fill="url(#hdrGold)"
            />
            <path
              d="M 85 61 L 115 61 L 115 102 L 141 102 L 141 117 L 115 117 L 100 102 L 100 61 Z"
              fill="url(#hdrOrangeRed)"
            />
            <path
              d="M 59 87 L 100 87 L 100 102 L 115 117 L 115 145 L 85 145 L 85 117 L 59 117 Z"
              fill="url(#hdrTealCyan)"
            />
            <text x="100" y="78" textAnchor="middle" fontSize="17" fontWeight="900" fontFamily="sans-serif" fill="url(#hdrGold)">K</text>
            <text x="100" y="108" textAnchor="middle" fontSize="17" fontWeight="900" fontFamily="sans-serif" letterSpacing="1" fill="url(#hdrGold)">KNA</text>
            <text x="100" y="138" textAnchor="middle" fontSize="17" fontWeight="900" fontFamily="sans-serif" fill="url(#hdrGold)">A</text>
            {/* Lower Ribbon Banner */}
            <path
              d="M 12 168 C 50 152 150 152 188 168 L 180 200 C 145 186 55 186 20 200 Z"
              fill="url(#hdrGold)"
            />
            <path
              d="M 15 171 C 52 156 148 156 185 171 L 178 197 C 144 184 56 184 22 197 Z"
              fill="url(#hdrNavy)"
            />
            <path id="hdrBannerPath" d="M 24 191 C 60 178 140 178 176 191" fill="none" />
            <text fontSize="11" fontWeight="900" fontFamily="sans-serif" fill="url(#hdrGold)" letterSpacing="1">
              <textPath href="#hdrBannerPath" startOffset="50%" textAnchor="middle">
                KERALA NEET ACADEMY
              </textPath>
            </text>
            <text x="185" y="30" fontSize="9" fontWeight="bold" fill="url(#hdrGold)" fontFamily="sans-serif">TM</text>
          </svg>
        </div>

        {/* Tiles & Brand Title (Identical to Screenshot) */}
        <div className="flex flex-col justify-center">
          {/* Top: 3 Big Forest Green Tiles K N A */}
          <div className="flex items-center space-x-1 sm:space-x-1.5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#084024] border border-[#0d5932] shadow-xs flex items-center justify-center text-[#FFE500] font-black text-sm sm:text-xl tracking-tighter">
              K
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#084024] border border-[#0d5932] shadow-xs flex items-center justify-center text-[#FFE500] font-black text-sm sm:text-xl tracking-tighter">
              N
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#084024] border border-[#0d5932] shadow-xs flex items-center justify-center text-[#FFE500] font-black text-sm sm:text-xl tracking-tighter">
              A
            </div>
          </div>

          {/* Bottom: [K][E][R][A][L][A] + ™ NEET ACADEMY */}
          <div className="flex items-center space-x-1 mt-1">
            <div className="flex items-center space-x-0.5">
              {['K', 'E', 'R', 'A', 'L', 'A'].map((char, i) => (
                <span
                  key={i}
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 bg-[#084024] text-[#FFE500] font-black text-[9px] sm:text-[10px] rounded flex items-center justify-center"
                >
                  {char}
                </span>
              ))}
            </div>
            <span className="text-[10px] sm:text-[11px] font-black tracking-wider text-[#084024] uppercase pl-0.5 whitespace-nowrap">
              ™ NEET ACADEMY
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        {EmblemSVG}
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            {TilesSVG}
            <div className="flex flex-col pl-1">
              {KeralaTiles}
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300">
                NEET ACADEMY
              </span>
            </div>
          </div>
          {showText && (
            <p className="text-[11px] font-semibold text-teal-400 mt-0.5">
              Official Medical Entrance Academy
            </p>
          )}
        </div>
      </div>
    );
  }

  // Default: Compact Header Variant (Crest Emblem + Brand Title with Green Tiles)
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Emblem with slight scale */}
      <div className="relative flex items-center justify-center flex-shrink-0">
        {EmblemSVG}
      </div>

      {showText && (
        <div className="min-w-0">
          <div className="flex items-center space-x-1.5 flex-wrap">
            {TilesSVG}
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-300 bg-amber-950/70 px-1.5 py-0.5 rounded border border-amber-600/40">
              Official
            </span>
          </div>
          <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white leading-tight mt-0.5 truncate">
            Kerala NEET Academy
          </h1>
        </div>
      )}
    </div>
  );
};
