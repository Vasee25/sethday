const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

async function buildBanner() {
  const width = 1600;
  const height = 520;

  // Generate SVG with complete high-resolution stage composition
  const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <!-- Deep Stage Backdrop Gradient -->
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#040D1A" />
        <stop offset="25%" stop-color="#07192F" />
        <stop offset="55%" stop-color="#0B2545" />
        <stop offset="78%" stop-color="#081A32" />
        <stop offset="100%" stop-color="#020813" />
      </linearGradient>

      <!-- Stage Floor Gradient -->
      <linearGradient id="stageFloor" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#0A1624" />
        <stop offset="20%" stop-color="#141E2D" />
        <stop offset="70%" stop-color="#1A1820" />
        <stop offset="100%" stop-color="#0A080C" />
      </linearGradient>

      <!-- Red Carpet Edge -->
      <linearGradient id="redCarpet" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#800A18" />
        <stop offset="20%" stop-color="#BA1426" />
        <stop offset="50%" stop-color="#E51C33" />
        <stop offset="80%" stop-color="#BA1426" />
        <stop offset="100%" stop-color="#800A18" />
      </linearGradient>

      <!-- Metallic Gold Gradient for 3D Title -->
      <linearGradient id="titleGold" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#FFF5BE" />
        <stop offset="25%" stop-color="#F5D061" />
        <stop offset="55%" stop-color="#DCA028" />
        <stop offset="85%" stop-color="#B87B14" />
        <stop offset="100%" stop-color="#7C4F07" />
      </linearGradient>

      <linearGradient id="goldHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#ECC65A" />
        <stop offset="50%" stop-color="#FFF8D6" />
        <stop offset="100%" stop-color="#ECC65A" />
      </linearGradient>

      <!-- Spotlights -->
      <radialGradient id="spotLightCenter" cx="50%" cy="0%" r="80%">
        <stop offset="0%" stop-color="#FFF2BD" stop-opacity="0.32" />
        <stop offset="40%" stop-color="#60A5FA" stop-opacity="0.15" />
        <stop offset="100%" stop-color="#07192F" stop-opacity="0" />
      </radialGradient>

      <radialGradient id="spotLightLeft" cx="20%" cy="0%" r="70%">
        <stop offset="0%" stop-color="#38BDF8" stop-opacity="0.25" />
        <stop offset="60%" stop-color="#07192F" stop-opacity="0" />
      </radialGradient>

      <radialGradient id="spotLightRight" cx="80%" cy="0%" r="70%">
        <stop offset="0%" stop-color="#FDE047" stop-opacity="0.25" />
        <stop offset="60%" stop-color="#07192F" stop-opacity="0" />
      </radialGradient>

      <!-- White Doctor Coat Gradient -->
      <linearGradient id="coatGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#FFFFFF" />
        <stop offset="60%" stop-color="#F1F5F9" />
        <stop offset="100%" stop-color="#CBD5E1" />
      </linearGradient>

      <!-- Shaded Coat Gradient -->
      <linearGradient id="coatGradDark" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#E2E8F0" />
        <stop offset="70%" stop-color="#94A3B8" />
        <stop offset="100%" stop-color="#64748B" />
      </linearGradient>

      <!-- Filters -->
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>

      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#000" flood-opacity="0.7" />
      </filter>
    </defs>

    <!-- 1. BACKDROP -->
    <rect width="${width}" height="${height}" fill="url(#bgGrad)" />

    <!-- Stage Lighting Beams -->
    <polygon points="200,0 600,0 800,340 0,340" fill="url(#spotLightLeft)" />
    <polygon points="1000,0 1400,0 1600,340 800,340" fill="url(#spotLightRight)" />
    <ellipse cx="800" cy="80" rx="600" ry="240" fill="url(#spotLightCenter)" />

    <!-- Top Truss Structure -->
    <rect x="0" y="0" width="${width}" height="14" fill="#020610" opacity="0.85" />
    <g stroke="#1E293B" stroke-width="1.5" opacity="0.6">
      ${Array.from({ length: 40 }, (_, i) => `<line x1="${i * 40}" y1="0" x2="${i * 40 + 20}" y2="14" /><line x1="${i * 40 + 20}" y1="0" x2="${i * 40 + 40}" y2="14" />`).join('')}
    </g>

    <!-- Stage Lights on Truss -->
    ${[160, 320, 480, 640, 800, 960, 1120, 1280, 1440].map(x => `
      <rect x="${x - 12}" y="12" width="24" height="10" rx="3" fill="#334155" />
      <circle cx="${x}" cy="22" r="5" fill="#FEF08A" opacity="0.9" />
      <circle cx="${x}" cy="22" r="14" fill="#FEF08A" opacity="0.15" />
    `).join('')}

    <!-- 2. STAGE BACKDROP CONTENT (TOP HALF) -->

    <!-- Left Stage Details: KNA Crest & Kerala NEET Academy -->
    <g transform="translate(60, 42)">
      <!-- Golden Crest Shield -->
      <path d="M40,10 L70,18 L70,55 C70,75 52,90 40,95 C28,90 10,75 10,55 L10,18 Z" fill="#0A2244" stroke="url(#titleGold)" stroke-width="3" filter="url(#shadow)" />
      <!-- Inner Cross -->
      <path d="M40,24 L40,78 M22,46 L58,46" stroke="#22C55E" stroke-width="4" stroke-linecap="round" />
      <!-- Laurels -->
      <path d="M12,65 C0,45 6,25 15,18 M68,65 C80,45 74,25 65,18" stroke="#EAB308" stroke-width="2" fill="none" />
      <!-- Text -->
      <text x="85" y="44" font-family="'Playfair Display', Georgia, serif" font-weight="900" font-size="22" fill="#FFFFFF" letter-spacing="1">KERALA NEET ACADEMY</text>
      <text x="85" y="66" font-family="sans-serif" font-weight="700" font-size="12" fill="#EAB308" letter-spacing="2">DEDICATED TO MEDICAL EXCELLENCE</text>
    </g>

    <!-- Center Stage Title: KNA 9th BATCH DOCTORS & STETH DAY -->
    <!-- 3D Shadow Layers for 'KNA 9th BATCH DOCTORS' -->
    <text x="800" y="93" text-anchor="middle" font-family="'Playfair Display', Georgia, serif" font-weight="900" font-size="44" fill="#3B2302" letter-spacing="3" opacity="0.9">KNA 9th BATCH DOCTORS</text>
    <text x="800" y="91" text-anchor="middle" font-family="'Playfair Display', Georgia, serif" font-weight="900" font-size="44" fill="#603B04" letter-spacing="3">KNA 9th BATCH DOCTORS</text>
    <text x="800" y="89" text-anchor="middle" font-family="'Playfair Display', Georgia, serif" font-weight="900" font-size="44" fill="url(#titleGold)" letter-spacing="3" filter="url(#glow)">KNA 9th BATCH DOCTORS</text>

    <!-- STETH DAY in Majestic Crisp White -->
    <!-- Shadow -->
    <text x="800" y="160" text-anchor="middle" font-family="'Playfair Display', Georgia, serif" font-weight="900" font-size="64" fill="#000000" letter-spacing="6" opacity="0.65" filter="url(#shadow)">STETH DAY</text>
    <text x="800" y="157" text-anchor="middle" font-family="'Playfair Display', Georgia, serif" font-weight="900" font-size="64" fill="#FFFFFF" letter-spacing="6" filter="url(#shadow)">STETH DAY</text>

    <!-- Subtle Golden Divider Ribbons -->
    <line x1="560" y1="176" x2="1040" y2="176" stroke="url(#titleGold)" stroke-width="2.5" stroke-linecap="round" />
    <circle cx="800" cy="176" r="4.5" fill="#FDE047" />
    <circle cx="760" cy="176" r="2.5" fill="#FDE047" />
    <circle cx="840" cy="176" r="2.5" fill="#FDE047" />

    <!-- Right Stage Badge: Stethoscope Emblem & Stars -->
    <g transform="translate(1380, 42)">
      <circle cx="45" cy="45" r="40" fill="#091B33" stroke="url(#titleGold)" stroke-width="2.5" filter="url(#shadow)" />
      <!-- Stethoscope in Circle -->
      <path d="M30,30 C30,48 42,56 45,56 C48,56 60,48 60,30" stroke="#FDE047" stroke-width="3.5" fill="none" stroke-linecap="round" />
      <path d="M45,56 L45,66 C45,72 50,74 54,74" stroke="#FDE047" stroke-width="3" fill="none" />
      <circle cx="56" cy="74" r="5" fill="#38BDF8" stroke="#FFFFFF" stroke-width="1.5" />
      <circle cx="30" cy="28" r="3.5" fill="#FDE047" />
      <circle cx="60" cy="28" r="3.5" fill="#FDE047" />
      <text x="45" y="100" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="10" fill="#FDE047" letter-spacing="1">CONVOCATION</text>
    </g>

    <!-- 3. STAGE STRUCTURE & TIERS (BOTTOM HALF) -->
    <!-- Stage Floor Base -->
    <polygon points="0,320 1600,320 1600,520 0,520" fill="url(#stageFloor)" />

    <!-- Stage Riser Tier 3 (Back Row) -->
    <polygon points="40,240 1560,240 1580,290 20,290" fill="#0C1B2E" stroke="#1E293B" stroke-width="1" />
    <!-- Stage Riser Tier 2 (Middle Row) -->
    <polygon points="20,290 1580,290 1600,350 0,350" fill="#081424" stroke="#1E293B" stroke-width="1" />
    <!-- Stage Riser Tier 1 (Front Stage) -->
    <rect x="0" y="350" width="${width}" height="170" fill="url(#stageFloor)" />

    <!-- Stage Floor Footlights / Ambient Rim Lighting -->
    <ellipse cx="800" cy="360" rx="750" ry="20" fill="#38BDF8" opacity="0.12" />

    <!-- 4. MASSIVE DOCTORS & MEDICAL GRADUATES CROWD IN WHITE LAB COATS -->
    <!-- Row 3 (Back Tier - ~55 Students in White Coats) -->
    <g opacity="0.85">
      ${Array.from({ length: 58 }, (_, i) => {
        const cx = 80 + i * 25 + (Math.sin(i * 1.7) * 4);
        const cy = 250 + (Math.cos(i * 0.9) * 4);
        return `
          <circle cx="${cx}" cy="${cy - 20}" r="8.5" fill="#F8CBA6" />
          <path d="M${cx - 10},${cy - 10} Q${cx},${cy - 24} M${cx + 10},${cy - 10} Q${cx},${cy - 24}" fill="#2E1C12" />
          <path d="M${cx - 11},${cy - 8} L${cx + 11},${cy - 8} L${cx + 13},${cy + 24} L${cx - 13},${cy + 24} Z" fill="url(#coatGrad)" />
          <path d="M${cx - 5},${cy - 4} Q${cx},${cy + 10} ${cx + 5},${cy - 4}" stroke="#1E293B" stroke-width="1.8" fill="none" />
        `;
      }).join('')}
    </g>

    <!-- Row 2 (Middle Tier - ~48 Students in White Coats, Defined) -->
    <g opacity="0.94">
      ${Array.from({ length: 48 }, (_, i) => {
        const cx = 60 + i * 31 + (Math.sin(i * 2.3) * 5);
        const cy = 300 + (Math.cos(i * 1.2) * 5);
        const hairColor = i % 3 === 0 ? "#1C1917" : (i % 3 === 1 ? "#292524" : "#451A03");
        return `
          <ellipse cx="${cx}" cy="${cy - 24}" rx="9.5" ry="11" fill="#F4B886" />
          <path d="M${cx - 10},${cy - 22} C${cx - 10},${cy - 36} ${cx + 10},${cy - 36} ${cx + 10},${cy - 22} Z" fill="${hairColor}" />
          <path d="M${cx - 14},${cy - 11} L${cx + 14},${cy - 11} L${cx + 16},${cy + 34} L${cx - 16},${cy + 34} Z" fill="url(#coatGrad)" stroke="#E2E8F0" stroke-width="0.5" />
          <path d="M${cx - 5},${cy - 10} L${cx},${cy + 8} L${cx + 5},${cy - 10}" fill="#F8FAFC" stroke="#94A3B8" stroke-width="1" />
          <path d="M${cx - 6},${cy - 6} C${cx - 8},${cy + 14} ${cx + 8},${cy + 14} ${cx + 6},${cy - 6}" stroke="#0F172A" stroke-width="2.2" fill="none" stroke-linecap="round" />
          <circle cx="${cx + 2}" cy="${cy + 15}" r="3" fill="#94A3B8" stroke="#0F172A" stroke-width="1" />
        `;
      }).join('')}
    </g>

    <!-- Row 1 (Front Row - Seated Faculty, Dignitaries, and Premier Doctors) -->
    <g>
      ${Array.from({ length: 36 }, (_, i) => {
        const cx = 50 + i * 42 + (Math.sin(i * 1.5) * 3);
        const cy = 375;
        const isFaculty = i % 5 === 0 || i === 17 || i === 18;
        const coatFill = isFaculty ? "#0F172A" : "url(#coatGrad)";
        const lapelStroke = isFaculty ? "#334155" : "#64748B";
        return `
          <ellipse cx="${cx}" cy="${cy - 32}" rx="12" ry="14" fill="#F7C49D" />
          <path d="M${cx - 12},${cy - 30} C${cx - 13},${cy - 48} ${cx + 13},${cy - 48} ${cx + 12},${cy - 30} Z" fill="#1C1917" />
          <path d="M${cx - 19},${cy - 16} L${cx + 19},${cy - 16} L${cx + 21},${cy + 60} L${cx - 21},${cy + 60} Z" fill="${coatFill}" stroke="#CBD5E1" stroke-width="0.8" />
          ${isFaculty ? `
            <polygon points="${cx - 5},${cy - 14} ${cx + 5},${cy - 14} ${cx},${cy - 2}" fill="#FFFFFF" />
            <polygon points="${cx - 3},${cy - 2} ${cx + 3},${cy - 2} ${cx},${cy + 20}" fill="#DC2626" />
          ` : `
            <path d="M${cx - 7},${cy - 14} L${cx},${cy + 4} L${cx + 7},${cy - 14}" fill="#FFFFFF" stroke="#94A3B8" stroke-width="1" />
            <path d="M${cx - 8},${cy - 10} C${cx - 12},${cy + 18} ${cx + 12},${cy + 18} ${cx + 8},${cy - 10}" stroke="#0F172A" stroke-width="2.8" fill="none" stroke-linecap="round" />
            <circle cx="${cx + 3}" cy="${cy + 20}" r="4" fill="#CBD5E1" stroke="#0F172A" stroke-width="1.2" />
          `}
          <path d="M${cx - 18},${cy - 15} L${cx - 5},${cy + 10} L${cx - 18},${cy + 24}" fill="none" stroke="${lapelStroke}" stroke-width="1.5" />
          <path d="M${cx + 18},${cy - 15} L${cx + 5},${cy + 10} L${cx + 18},${cy + 24}" fill="none" stroke="${lapelStroke}" stroke-width="1.5" />
        `;
      }).join('')}
    </g>

    <!-- Stage Front Edge & Red Carpet -->
    <rect x="0" y="475" width="${width}" height="45" fill="#0A0F1A" />
    <rect x="20" y="480" width="${width - 40}" height="18" fill="url(#redCarpet)" rx="4" filter="url(#shadow)" />
    <line x1="20" y1="480" x2="${width - 20}" y2="480" stroke="url(#titleGold)" stroke-width="3" />
    <line x1="20" y1="498" x2="${width - 20}" y2="498" stroke="url(#titleGold)" stroke-width="1.5" />

    <!-- Overall Atmospheric Stage Glare & Flare -->
    <ellipse cx="800" cy="140" rx="400" ry="80" fill="#FFFFFF" opacity="0.08" />
    <circle cx="800" cy="80" r="160" fill="#FDE047" opacity="0.06" filter="url(#glow)" />
  </svg>`;

  const bannerJpeg = await sharp(Buffer.from(svg))
    .jpeg({ quality: 96, chromaSubsampling: "4:4:4" })
    .toBuffer();

  fs.writeFileSync("public/03-1.jpeg", bannerJpeg);
  fs.writeFileSync("dist/03-1.jpeg", bannerJpeg);

  console.log("Successfully wrote 03-1.jpeg to public/ and dist/, size:", bannerJpeg.length);
}

buildBanner().catch(console.error);
