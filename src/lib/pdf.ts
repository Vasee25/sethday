import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import type { RegistrationRecord, EventSettingsRecord } from '../types.ts';

let cachedLogoBase64: string | null = null;

async function getLogoBase64(): Promise<string | null> {
  if (cachedLogoBase64) return cachedLogoBase64;
  try {
    if (typeof window === 'undefined') {
      const fs = await import('fs');
      const path = await import('path');
      const candidates = [
        path.join(process.cwd(), 'public', 'kna_logo_.png'),
        path.join(process.cwd(), 'kna_logo_.png'),
        path.join(process.cwd(), 'public', 'kna_logo_..png'),
        path.join(process.cwd(), 'public', 'Kna_logo_..png'),
        path.join(process.cwd(), 'public', 'KNA.png'),
        path.join(process.cwd(), 'public', '03-1.jpeg'),
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          const buf = fs.readFileSync(p);
          const ext = p.endsWith('.png') ? 'png' : 'jpeg';
          cachedLogoBase64 = `data:image/${ext};base64,${buf.toString('base64')}`;
          return cachedLogoBase64;
        }
      }
    } else {
      let res = await fetch('/kna_logo_.png');
      if (!res.ok) {
        res = await fetch('/kna_logo_..png');
      }
      if (!res.ok) {
        res = await fetch('/Kna_logo_..png');
      }
      if (!res.ok) {
        res = await fetch('/KNA.png');
      }
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          cachedLogoBase64 = reader.result as string;
          resolve(cachedLogoBase64);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    }
  } catch (e) {
    console.error('Failed to load logo for PDF:', e);
  }
  return null;
}

export async function generateStudentPDF(
  registration: RegistrationRecord,
  settings?: EventSettingsRecord | null
): Promise<{ doc: jsPDF; filename: string }> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const studentCode = registration.studentCode || 'KNA-REG';
  const filename = `${studentCode}_STETH_DAY_Registration.pdf`;

  // Colors
  const primaryNavy = [15, 42, 74]; // #0f2a4a
  const accentTeal = [13, 148, 136]; // #0d9488
  const lightBg = [248, 250, 252];
  const darkText = [30, 41, 59];
  const mutedText = [100, 116, 139];

  // Load Official KNA Logo
  const logoBase64 = await getLogoBase64();

  // 1. Top Decorative Bar
  doc.setFillColor(accentTeal[0], accentTeal[1], accentTeal[2]);
  doc.rect(0, 0, pageWidth, 5, 'F');

  // 2. Header Container
  doc.setFillColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.rect(0, 5, pageWidth, 36, 'F');

  // Header Left: Official Logo
  let textStartX = 14;
  const logoFormat = logoBase64 && (logoBase64.includes('image/jpeg') || logoBase64.includes('image/jpg')) ? 'JPEG' : 'PNG';
  if (logoBase64) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(12, 8, 46, 26, 2, 2, 'F');
      doc.addImage(logoBase64, logoFormat, 14, 13.5, 42, 15);
      textStartX = 62;
    } catch (e) {
      console.error('Failed to draw logo on header:', e);
      textStartX = 14;
    }
  }

  // Academy Name & Event Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(textStartX > 14 ? 14 : 16);
  doc.text(settings?.academyName || 'Kerala NEET Academy', textStartX, 16.5);

  doc.setFontSize(textStartX > 14 ? 9.5 : 11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(45, 212, 191); // Teal accent text
  doc.text(`${settings?.eventName || 'STETH DAY'} — STUDENT REGISTRATION PASS`, textStartX, 23.5);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('Your Journey Towards Medicine Starts Here • Official Admission Document', textStartX, 29.5);

  // Top-Right Student Code Badge
  const codeBadgeW = 46;
  const codeBadgeX = pageWidth - 12 - codeBadgeW;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(codeBadgeX, 9, codeBadgeW, 25, 2, 2, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.text('STUDENT CODE', codeBadgeX + codeBadgeW / 2, 16.5, { align: 'center' });

  doc.setFontSize(14);
  doc.setTextColor(13, 148, 136); // Teal
  doc.text(studentCode, codeBadgeX + codeBadgeW / 2, 26, { align: 'center' });

  // 3. Sub-header / Document ID & Timestamp strip
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.rect(0, 41, pageWidth, 12, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.line(0, 53, pageWidth, 53);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  
  const rawDate = registration.createdAt ? new Date(registration.createdAt) : new Date();
  const createdDate = isNaN(rawDate.getTime()) ? new Date() : rawDate;
  const dateStr = createdDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = createdDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const responseId = registration.responseId || 'KNA-PASS';
  const studentName = registration.studentName || 'Student Delegate';

  doc.text(`Doc ID: ${responseId}`, 14, 48.5);
  doc.text(`Issued: ${dateStr} at ${timeStr}`, pageWidth - 14, 48.5, { align: 'right' });

  // 4. Student Photo & Verification QR Code Area (Upper Section)
  const photoX = 14;
  const photoY = 60;
  const photoW = 38;
  const photoH = 46;

  // Photo Frame
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(photoX, photoY, photoW, photoH, 1.5, 1.5, 'FD');

  if (registration.photoUrl && registration.photoUrl.startsWith('data:image')) {
    try {
      const formatMatch = registration.photoUrl.match(/data:image\/([a-zA-Z]+);/);
      const imgFormat = formatMatch ? formatMatch[1].toUpperCase() : 'JPEG';
      doc.addImage(registration.photoUrl, imgFormat, photoX + 1, photoY + 1, photoW - 2, photoH - 2);
    } catch (e) {
      console.error('Failed to embed photo into PDF:', e);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('STUDENT PHOTO', photoX + photoW / 2, photoY + photoH / 2, { align: 'center' });
    }
  } else {
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('STUDENT PHOTO', photoX + photoW / 2, photoY + photoH / 2, { align: 'center' });
  }

  // Verification QR Code
  const qrX = pageWidth - 14 - 36;
  const qrY = 60;
  const qrSize = 36;

  try {
    const qrData = JSON.stringify({
      code: studentCode,
      name: studentName,
      college: registration.medicalCollegeName || '',
      id: responseId,
    });
    const qrDataUrl = await QRCode.toDataURL(qrData, { margin: 1, width: 180 });
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
    
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text('Scan for Instant Verification', qrX + qrSize / 2, qrY + qrSize + 4.5, { align: 'center' });
  } catch (e) {
    console.error('Failed to generate QR code for PDF:', e);
  }

  // Key Student Highlights between photo and QR (Without S/o or D/o and without Age)
  const infoX = photoX + photoW + 8;
  const infoW = qrX - infoX - 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(darkText[0], darkText[1], darkText[2]);
  doc.text(studentName, infoX, photoY + 9);

  if (registration.medicalCollegeName) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
    doc.text('Allocated Medical College:', infoX, photoY + 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    const splitCollege = doc.splitTextToSize(registration.medicalCollegeName, infoW);
    doc.text(splitCollege, infoX, photoY + 25);

    const ntaScoreVal = registration.ntaScore !== undefined && registration.ntaScore !== null
      ? registration.ntaScore
      : (registration as any).nta_score;
    const scoreBadge = ntaScoreVal !== undefined && ntaScoreVal !== null ? `  •  NTA Score: ${ntaScoreVal} / 720` : '';

    const collegeBottomY = photoY + 25 + (splitCollege.length * 4.5);
    doc.setFontSize(8.5);
    doc.setTextColor(accentTeal[0], accentTeal[1], accentTeal[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(`Coat Size: ${registration.coatSize || 'M'}${scoreBadge}`, infoX, Math.max(photoY + 38, collegeBottomY));
  } else {
    const ntaScoreVal = registration.ntaScore !== undefined && registration.ntaScore !== null
      ? registration.ntaScore
      : (registration as any).nta_score;
    const scoreBadge = ntaScoreVal !== undefined && ntaScoreVal !== null ? `  •  NTA Score: ${ntaScoreVal} / 720` : '';

    doc.setFontSize(8.5);
    doc.setTextColor(accentTeal[0], accentTeal[1], accentTeal[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(`Apron Coat Size: ${registration.coatSize || 'M'}${scoreBadge}`, infoX, photoY + 24);
  }

  // 5. Official Details Table (With NTA Score)
  const tableStartY = 112;
  const totalFood = Number(registration.foodVegCount || 0) + Number(registration.foodNonVegCount || 0);

  const courseProgramValue = registration.courseProgram || (registration as any).course_program || 'REPEATER';
  const campusLocationValue = registration.campusLocation || (registration as any).campus_location || 'Kerala NEET Academy Campus';

  const ntaScoreRowVal = registration.ntaScore !== undefined && registration.ntaScore !== null
    ? registration.ntaScore
    : (registration as any).nta_score;

  const tableRows: any[] = [
    ...(ntaScoreRowVal !== undefined && ntaScoreRowVal !== null
      ? [
          [
            { content: 'NTA NEET Score', styles: { fontStyle: 'bold' } },
            { content: `${ntaScoreRowVal} Marks (out of 720)`, styles: { fontStyle: 'bold' } },
          ],
        ]
      : []),
    [
      { content: 'Enrolled Course', styles: { fontStyle: 'bold' } },
      { content: courseProgramValue, styles: { fontStyle: 'bold' } },
    ],
    [
      { content: 'Kerala NEET Academy Campus', styles: { fontStyle: 'bold' } },
      { content: campusLocationValue, styles: { fontStyle: 'bold' } },
    ],
    [
      { content: 'Vegetarian Meal Count', styles: { fontStyle: 'bold' } },
      { content: `${registration.foodVegCount || 0} Pack(s)`, styles: { fontStyle: 'bold' } },
    ],
    [
      { content: 'Non-Vegetarian Meal Count', styles: { fontStyle: 'bold' } },
      { content: `${registration.foodNonVegCount || 0} Pack(s)`, styles: { fontStyle: 'bold' } },
    ],
    [
      { content: 'Total Food Meal Count', styles: { fontStyle: 'bold' } },
      { content: `${totalFood} Meal Pack(s)`, styles: { fontStyle: 'bold' } },
    ],
    [
      { content: 'Registration Date & Time', styles: { fontStyle: 'normal' } },
      { content: `${dateStr} at ${timeStr}`, styles: { fontStyle: 'normal' } },
    ],
  ];

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: 14, right: 14 },
    head: [['Official Field', 'Student Registered Information']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 42, 74],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
      cellPadding: 2.2,
    },
    columnStyles: {
      0: { cellWidth: 62, textColor: [51, 65, 85] },
      1: { cellWidth: 'auto', textColor: [30, 41, 59] },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const rawRow = tableRows[data.row.index];
        if (rawRow && rawRow[data.column.index]?.styles?.fontStyle) {
          data.cell.styles.fontStyle = rawRow[data.column.index].styles.fontStyle;
        }
      }
    },
  });

  // Official Kerala NEET Academy Center Logo Watermark
  if (logoBase64) {
    try {
      const wmWidth = 140;
      const wmHeight = 50;
      const wmX = (pageWidth - wmWidth) / 2;
      const wmY = 135;
      doc.saveGraphicsState();
      try {
        // @ts-ignore
        if (typeof (doc as any).GState === 'function' && typeof (doc as any).setGState === 'function') {
          // @ts-ignore
          doc.setGState(new (doc as any).GState({ opacity: 0.12 }));
        }
        doc.addImage(logoBase64, logoFormat, wmX, wmY, wmWidth, wmHeight);
      } finally {
        doc.restoreGraphicsState();
      }
    } catch (e) {
      console.error('Failed to draw watermark on PDF:', e);
    }
  }

  // 6. Guidelines & Terms Box (Authorized Signatory removed as requested)
  // @ts-ignore
  const finalTableY = doc.lastAutoTable?.finalY || 215;
  const guidelinesY = Math.min(finalTableY + 6, 222);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, guidelinesY, pageWidth - 28, 38, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.text('IMPORTANT STETH DAY EVENT GUIDELINES & PROTOCOL', 18, guidelinesY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const rules = [
    '1. Present this official printed pass or show the digital PDF on your smartphone at the registration desk.',
    '2. White apron/coat distribution and ceremonial stethoscope presentation will be conducted as per schedule.',
    '3. Your allocated food tokens will be handed over along with the official delegate badge at entry.',
    '4. Carry a valid government photo ID (Aadhaar / Voter ID / Passport) for identity verification.',
    '5. In case of any corrections or assistance, contact Kerala NEET Academy helpline: +91 98470 12345.',
  ];
  rules.forEach((rule, idx) => {
    doc.text(rule, 18, guidelinesY + 12 + (idx * 5));
  });

  // 7. Footer
  doc.setFillColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.rect(0, pageHeight - 11, pageWidth, 11, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(241, 245, 249);
  doc.text(
    settings?.pdfFooter || 'Kerala NEET Academy • stethday@keralaneetacademy.org • Call: +91 98470 12345',
    pageWidth / 2,
    pageHeight - 4.5,
    { align: 'center' }
  );

  return { doc, filename };
}

