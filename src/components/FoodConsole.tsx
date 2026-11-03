import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Utensils,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  QrCode,
  RotateCcw,
  Building,
  User,
  LogOut,
  Maximize2,
  X,
  Camera,
  CameraOff,
  Check,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Copy,
  Download,
  Smartphone,
  Sparkles,
  MoreVertical,
  Phone,
  Mail,
  Calendar,
  Layers,
  Award,
} from 'lucide-react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import confetti from 'canvas-confetti';
import { KNALogo } from './KNALogo.tsx';
import { RegistrationRecord, FoodManagementStats } from '../types.ts';
import { subscribeToFirestoreRegistrations } from '../lib/firebase.ts';

interface FoodConsoleProps {
  onBackToPortal: () => void;
  onLogout?: () => void;
  currentUser?: any;
  onSwitchToAttendance?: () => void;
}

export const FoodConsole: React.FC<FoodConsoleProps> = ({
  onBackToPortal,
  onLogout,
  currentUser = { name: 'KNA Catering Team', email: 'food@keralaneetacademy.org', role: 'food' },
  onSwitchToAttendance,
}) => {
  // Main Data States
  const [stats, setStats] = useState<FoodManagementStats | null>(null);
  const [attendees, setAttendees] = useState<RegistrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search Filters for lists
  const [collectedSearch, setCollectedSearch] = useState('');
  const [pendingSearch, setPendingSearch] = useState('');
  const [dietFilter, setDietFilter] = useState<'ALL' | 'VEG' | 'NON_VEG'>('ALL');

  // "Food Orders" Textbox & Prioritization State
  const [foodOrdersInput, setFoodOrdersInput] = useState('');
  const [priorityOrderIds, setPriorityOrderIds] = useState<string[]>([]);

  // Three-dots Detailed Pop-up Modal State
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<RegistrationRecord | null>(null);

  // Camera QR Scanner State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanIntervalRef = useRef<any>(null);

  // Standee QR Code State
  const [foodCounterQrDataUrl, setFoodCounterQrDataUrl] = useState<string>('');
  const [foodCounterUrl, setFoodCounterUrl] = useState<string>('');
  const [copiedFoodQrLink, setCopiedFoodQrLink] = useState(false);
  const [showStandeeModal, setShowStandeeModal] = useState(false);

  // Verification & Handover Card State
  const [verifiedStudent, setVerifiedStudent] = useState<RegistrationRecord | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [vegCountInput, setVegCountInput] = useState<number>(0);
  const [nonVegCountInput, setNonVegCountInput] = useState<number>(0);
  const [isCollecting, setIsCollecting] = useState(false);
  const [scanValidation, setScanValidation] = useState<{
    status: 'VALID' | 'INVALID';
    reason?: string;
    remainingLimit: number;
    totalLimit: number;
  } | null>(null);

  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);

  const [revertingId, setRevertingId] = useState<string | null>(null);
  const bottomScannerRef = useRef<HTMLDivElement | null>(null);

  // Load food data from server
  const loadFoodData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/food/data');
      if (!res.ok) throw new Error('Failed to load food counter data');
      const data = await res.json();
      if (data.stats) setStats(data.stats);
      if (data.attendees) setAttendees(data.attendees);
      setError(null);
    } catch (err: any) {
      console.error('Error loading food data:', err);
      setError(err.message || 'Failed to connect to catering database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFoodData();

    // Generate Food Counter Standee QR Code
    const origin = window.location.origin || 'http://knastethday.online';
    const targetUrl = `${origin}/?mode=food`;
    setFoodCounterUrl(targetUrl);

    QRCode.toDataURL(targetUrl, {
      width: 440,
      margin: 2,
      color: {
        dark: '#064e3b', // Deep Catering Emerald
        light: '#FFFFFF',
      },
    })
      .then((dataUri) => setFoodCounterQrDataUrl(dataUri))
      .catch((err) => console.error('Failed to generate food counter QR:', err));

    // Subscribe to Firestore for real-time live attendance updates
    const unsubscribe = subscribeToFirestoreRegistrations((records) => {
      if (records && records.length > 0) {
        setAttendees((prev) => {
          const map = new Map<string, RegistrationRecord>();
          prev.forEach((p) => {
            const key = p.studentCode || p.responseId || String(p.id);
            if (key) map.set(key, p);
          });
          records.forEach((r) => {
            const key = r.studentCode || r.responseId || String(r.id);
            if (key) {
              const existing = map.get(key);
              map.set(key, { ...existing, ...r });
            }
          });
          return Array.from(map.values());
        });
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // TOP LIST: Students who have collected food (Green-colored)
  const collectedFoodList = useMemo(() => {
    const q = collectedSearch.trim().toLowerCase();
    return attendees
      .filter((a) => a.foodCollected === true)
      .filter((a) => {
        const matchSearch =
          !q ||
          (a.studentCode && a.studentCode.toLowerCase().includes(q)) ||
          (a.studentName && a.studentName.toLowerCase().includes(q)) ||
          (a.medicalCollegeName && a.medicalCollegeName.toLowerCase().includes(q)) ||
          (a.contactNumber && a.contactNumber.includes(q));

        const matchDiet =
          dietFilter === 'ALL' ||
          (dietFilter === 'VEG' && (a.foodCollectedVegCount ?? a.foodVegCount ?? 0) > 0) ||
          (dietFilter === 'NON_VEG' && (a.foodCollectedNonVegCount ?? a.foodNonVegCount ?? 0) > 0);

        return matchSearch && matchDiet;
      });
  }, [attendees, collectedSearch, dietFilter]);

  // BOTTOM LIST: Students with pending collections (Orange-colored)
  // Strictly checked in from admin console (checkInStatus === 'IN') who haven't collected!
  // Prioritized orders submitted via "Food Orders" immediately appear at the very top!
  const pendingFoodList = useMemo(() => {
    const q = pendingSearch.trim().toLowerCase();
    const baseList = attendees
      .filter((a) => a.checkInStatus === 'IN' && !a.foodCollected)
      .filter((a) => {
        const matchSearch =
          !q ||
          (a.studentCode && a.studentCode.toLowerCase().includes(q)) ||
          (a.studentName && a.studentName.toLowerCase().includes(q)) ||
          (a.medicalCollegeName && a.medicalCollegeName.toLowerCase().includes(q)) ||
          (a.contactNumber && a.contactNumber.includes(q));

        const matchDiet =
          dietFilter === 'ALL' ||
          (dietFilter === 'VEG' && (a.foodVegCount || 0) > 0) ||
          (dietFilter === 'NON_VEG' && (a.foodNonVegCount || 0) > 0);

        return matchSearch && matchDiet;
      });

    // Sort so prioritized order IDs appear at the top
    return baseList.sort((a, b) => {
      const codeA = (a.studentCode || a.responseId || '').toLowerCase();
      const codeB = (b.studentCode || b.responseId || '').toLowerCase();
      const nameA = (a.studentName || '').toLowerCase();
      const nameB = (b.studentName || '').toLowerCase();

      const indexA = priorityOrderIds.findIndex(
        (id) => id.toLowerCase() === codeA || id.toLowerCase() === nameA
      );
      const indexB = priorityOrderIds.findIndex(
        (id) => id.toLowerCase() === codeB || id.toLowerCase() === nameB
      );

      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return 0;
    });
  }, [attendees, pendingSearch, dietFilter, priorityOrderIds]);

  // Real-time calculated statistics
  const derivedStats = useMemo(() => {
    let totalVeg = 0;
    let totalNonVeg = 0;
    let inVeg = 0;
    let inNonVeg = 0;
    let collVeg = 0;
    let collNonVeg = 0;
    let inStudents = 0;
    let collStudents = 0;

    attendees.forEach((a) => {
      const v = a.foodVegCount || 0;
      const nv = a.foodNonVegCount || 0;
      totalVeg += v;
      totalNonVeg += nv;

      if (a.checkInStatus === 'IN') {
        inStudents++;
        inVeg += v;
        inNonVeg += nv;
      }

      if (a.foodCollected === true) {
        collStudents++;
        collVeg += a.foodCollectedVegCount ?? v;
        collNonVeg += a.foodCollectedNonVegCount ?? nv;
      }
    });

    const pendingVeg = Math.max(0, inVeg - collVeg);
    const pendingNonVeg = Math.max(0, inNonVeg - collNonVeg);

    return {
      totalOrderedFood: totalVeg + totalNonVeg,
      totalOrderedVeg: totalVeg,
      totalOrderedNonVeg: totalNonVeg,
      checkedInOrderedVeg: inVeg,
      checkedInOrderedNonVeg: inNonVeg,
      checkedInTotalFood: inVeg + inNonVeg,
      collectedVegCount: collVeg,
      collectedNonVegCount: collNonVeg,
      totalCollectedFood: collVeg + collNonVeg,
      pendingVegCount: pendingVeg,
      pendingNonVegCount: pendingNonVeg,
      totalPendingFood: pendingVeg + pendingNonVeg,
      totalCheckedInStudents: inStudents,
      totalCollectedStudents: collStudents,
      totalPendingStudents: Math.max(0, inStudents - collStudents),
    };
  }, [attendees]);

  const activeStats = stats || derivedStats;

  // Handle "Food Orders" Textbox Submission
  // "Upon submission, the student's order should immediately move to the top of the pending list."
  const handleFoodOrderSubmit = async (query: string) => {
    const q = query.trim();
    if (!q) return;

    setVerifyLoading(true);
    setActionFeedback(null);
    setScanValidation(null);

    try {
      const res = await fetch('/api/food/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `No student order found matching "${q}".`);
      }

      const rec: RegistrationRecord = data.record;
      setVerifiedStudent(rec);

      const totalLimit = (rec.foodVegCount || 0) + (rec.foodNonVegCount || 0);
      const collectedTotal = (rec.foodCollectedVegCount || 0) + (rec.foodCollectedNonVegCount || 0);
      const remainingLimit = Math.max(0, totalLimit - (rec.foodCollected ? totalLimit : collectedTotal));

      // QR Scan & Order Limit Validation:
      // "Add validation to enforce QR scan limits based on the number of food items ordered, displaying 'Invalid' for any scans beyond the limit or if all ordered food has been collected."
      if (totalLimit === 0) {
        setScanValidation({
          status: 'INVALID',
          reason: 'Invalid: 0 food items were ordered on this registration pass.',
          remainingLimit: 0,
          totalLimit: 0,
        });
      } else if (rec.foodCollected === true || remainingLimit <= 0) {
        setScanValidation({
          status: 'INVALID',
          reason: `Invalid: Food limit exceeded. All ${totalLimit} ordered items have already been collected.`,
          remainingLimit: 0,
          totalLimit,
        });
      } else {
        setScanValidation({
          status: 'VALID',
          remainingLimit,
          totalLimit,
        });
      }

      // Pre-fill collection inputs
      setVegCountInput(rec.foodVegCount || 0);
      setNonVegCountInput(rec.foodNonVegCount || 0);

      // Move student's order to the top of the pending list immediately!
      const studentIdentifier = rec.studentCode || rec.studentName || rec.responseId;
      setPriorityOrderIds((prev) => [
        studentIdentifier,
        ...prev.filter((id) => id.toLowerCase() !== studentIdentifier.toLowerCase()),
      ]);

      if (rec.checkInStatus !== 'IN') {
        setActionFeedback({
          type: 'error',
          message: `Gate Check-In Required: ${rec.studentName} (${rec.studentCode || rec.responseId}) has not checked in at the reception gate yet. Attendance check-in from Admin Console is required before meal issuance.`,
        });
      } else if (rec.foodCollected === true || remainingLimit <= 0) {
        setActionFeedback({
          type: 'error',
          message: `Invalid: Scan limit reached for ${rec.studentName}. All ${totalLimit} ordered items have already been collected.`,
        });
      } else {
        setActionFeedback({
          type: 'success',
          message: `Order for ${rec.studentName} (${rec.studentCode || rec.responseId}) prioritized and moved to the top of the Pending List!`,
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Lookup failed.',
      });
      setVerifiedStudent(null);
      setScanValidation(null);
    } finally {
      setVerifyLoading(false);
    }
  };

  // Submit Food Collection
  const handleRegisterFoodCollection = async () => {
    if (!verifiedStudent) return;

    // Enforce limit validation
    const totalLimit = (verifiedStudent.foodVegCount || 0) + (verifiedStudent.foodNonVegCount || 0);
    if (verifiedStudent.foodCollected || totalLimit === 0) {
      setActionFeedback({
        type: 'error',
        message: 'Invalid: Cannot issue meals. Scan limit exceeded or all ordered food collected.',
      });
      return;
    }

    setIsCollecting(true);
    setActionFeedback(null);

    const identifier = verifiedStudent.studentCode || verifiedStudent.responseId || String(verifiedStudent.id);

    try {
      const res = await fetch('/api/food/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier,
          vegCount: vegCountInput,
          nonVegCount: nonVegCountInput,
          staffEmail: currentUser?.email || 'food@keralaneetacademy.org',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register food collection');
      }

      // Confetti celebration
      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#059669', '#10B981', '#14B8A6', '#0D9488'],
        });
      } catch {}

      // Update attendee list - moves student automatically into top collected list!
      setAttendees((prev) =>
        prev.map((a) => {
          if (
            a.id === verifiedStudent.id ||
            a.studentCode === verifiedStudent.studentCode ||
            a.responseId === verifiedStudent.responseId
          ) {
            return {
              ...a,
              foodCollected: true,
              foodCollectedVegCount: vegCountInput,
              foodCollectedNonVegCount: nonVegCountInput,
              foodCollectedAt: new Date().toISOString(),
              foodCollectedStaff: currentUser?.email || 'food@keralaneetacademy.org',
            };
          }
          return a;
        })
      );

      if (data.stats) {
        setStats(data.stats);
      }

      setActionFeedback({
        type: 'success',
        message: `✅ Meals Successfully Issued! ${verifiedStudent.studentName} received ${vegCountInput} Veg + ${nonVegCountInput} Non-Veg. Automatically added to the top green Collected list.`,
      });

      // Clear input and reset verified card
      setTimeout(() => {
        setVerifiedStudent(null);
        setFoodOrdersInput('');
        setScanValidation(null);
      }, 2500);
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Failed to update food collection.',
      });
    } finally {
      setIsCollecting(false);
    }
  };

  // Revert Food Collection (Undo)
  const handleRevertCollection = async (attendee: RegistrationRecord) => {
    const identifier = attendee.studentCode || attendee.responseId || String(attendee.id);
    setRevertingId(identifier);

    try {
      const res = await fetch('/api/food/revert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to revert food collection');
      }

      setAttendees((prev) =>
        prev.map((a) => {
          if (
            a.id === attendee.id ||
            a.studentCode === attendee.studentCode ||
            a.responseId === attendee.responseId
          ) {
            return {
              ...a,
              foodCollected: false,
              foodCollectedVegCount: 0,
              foodCollectedNonVegCount: 0,
              foodCollectedAt: null,
              foodCollectedStaff: null,
            };
          }
          return a;
        })
      );

      if (data.stats) {
        setStats(data.stats);
      }

      setActionFeedback({
        type: 'success',
        message: `Reverted meal collection for ${attendee.studentName}. Student moved back to Pending queue below.`,
      });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Failed to revert collection.',
      });
      setTimeout(() => setActionFeedback(null), 4000);
    } finally {
      setRevertingId(null);
    }
  };

  // Quick Direct Handover for Checked-In Delegate in Pending List
  const handleQuickHandover = (attendee: RegistrationRecord) => {
    setVerifiedStudent(attendee);
    setVegCountInput(attendee.foodVegCount || 0);
    setNonVegCountInput(attendee.foodNonVegCount || 0);
    setFoodOrdersInput(attendee.studentCode || attendee.studentName);
    setActionFeedback(null);

    const totalLimit = (attendee.foodVegCount || 0) + (attendee.foodNonVegCount || 0);
    if (attendee.foodCollected || totalLimit === 0) {
      setScanValidation({
        status: 'INVALID',
        reason: 'Invalid: Food limit exceeded or all ordered food collected.',
        remainingLimit: 0,
        totalLimit,
      });
    } else {
      setScanValidation({
        status: 'VALID',
        remainingLimit: totalLimit,
        totalLimit,
      });
    }

    if (bottomScannerRef.current) {
      bottomScannerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Standee QR Handlers
  const handleCopyFoodQrLink = () => {
    if (!foodCounterUrl) return;
    navigator.clipboard.writeText(foodCounterUrl);
    setCopiedFoodQrLink(true);
    setTimeout(() => setCopiedFoodQrLink(false), 3000);
  };

  const handleDownloadFoodQrStandee = () => {
    if (!foodCounterQrDataUrl) return;
    const a = document.createElement('a');
    a.href = foodCounterQrDataUrl;
    a.download = 'STETH-DAY-2026-Food-Counter-Standee-QR.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Camera QR Scanner Controls
  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();

        scanIntervalRef.current = setInterval(() => {
          scanVideoFrame();
        }, 250);
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Camera access unavailable. You can enter the student code or name directly in the Food Orders text box.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const scanVideoFrame = () => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code && code.data) {
      let rawData = code.data.trim();
      if (rawData.startsWith('{') && rawData.endsWith('}')) {
        try {
          const parsed = JSON.parse(rawData);
          rawData = parsed.code || parsed.studentCode || parsed.id || rawData;
        } catch {}
      } else if (rawData.includes('code=')) {
        const match = rawData.match(/code=([^&]+)/);
        if (match && match[1]) rawData = decodeURIComponent(match[1]);
      }

      stopCamera();
      setFoodOrdersInput(rawData);
      handleFoodOrderSubmit(rawData);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Completion percentage of checked in delegates served
  const progressPercent =
    activeStats.checkedInTotalFood > 0
      ? Math.min(100, Math.round((activeStats.totalCollectedFood / activeStats.checkedInTotalFood) * 100))
      : 0;

  return (
    <div className="w-full max-w-[98%] xl:max-w-[1550px] mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6 overflow-hidden">
      {/* ========================================================================= */}
      {/* TOP HEADER WITH LOGO DISPLAYED AT THE TOP                                  */}
      {/* ========================================================================= */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-3.5 min-w-0">
          {/* Logo prominently at top */}
          <div className="shrink-0 p-1 bg-white rounded-2xl shadow-xs border border-slate-200">
            <KNALogo variant="emblem" size="lg" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-display tracking-tight truncate">
                STETH DAY 2026 — Food & Catering Console
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs whitespace-nowrap">
                Live Distribution Counter
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              Kerala NEET Academy • Authenticated Staff: <span className="font-bold text-emerald-700">{currentUser?.name || 'Food Desk'}</span> ({currentUser?.email || 'food@keralaneetacademy.org'})
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={loadFoodData}
            disabled={loading}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 cursor-pointer active:scale-95"
            title="Refresh attendance and meal counts"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {onSwitchToAttendance && (
            <button
              type="button"
              onClick={onSwitchToAttendance}
              className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 cursor-pointer active:scale-95"
              title="Switch to Gate Attendance & Check-In Desk"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>Gate Check-In Page</span>
            </button>
          )}

          <button
            type="button"
            onClick={onBackToPortal}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Public View
          </button>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl transition flex items-center space-x-1 cursor-pointer active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </header>

      {/* Global Feedback Banner */}
      {actionFeedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 animate-in fade-in duration-150 shadow-xs ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-950 border-2 border-emerald-300'
              : actionFeedback.type === 'warning'
              ? 'bg-amber-50 text-amber-950 border-2 border-amber-300'
              : 'bg-red-50 text-red-950 border-2 border-red-300'
          }`}
        >
          <div className="flex items-center space-x-2 min-w-0">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : actionFeedback.type === 'warning' ? (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span className="break-words">{actionFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STATS OVERVIEW CARDS                                                      */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Food Ordered */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Total Food Ordered</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              <Utensils className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
              {activeStats.totalOrderedFood}
            </span>
            <span className="text-xs font-bold text-slate-400">Total Tokens</span>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-emerald-700 font-extrabold flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{activeStats.totalOrderedVeg} Veg</span>
            </span>
            <span className="text-orange-700 font-extrabold flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              <span>{activeStats.totalOrderedNonVeg} Non-Veg</span>
            </span>
          </div>
        </div>

        {/* Checked-In Venue Meals */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-teal-500/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-teal-700">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Checked-In Venue Meals</span>
            <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-teal-950 font-display">
              {activeStats.checkedInTotalFood}
            </span>
            <span className="text-xs font-bold text-teal-700 truncate">
              ({activeStats.totalCheckedInStudents} Attendees In)
            </span>
          </div>
          <div className="pt-2 border-t border-teal-100 flex items-center justify-between text-xs">
            <span className="text-emerald-700 font-extrabold">
              {activeStats.checkedInOrderedVeg} Veg In
            </span>
            <span className="text-orange-700 font-extrabold">
              {activeStats.checkedInOrderedNonVeg} Non-Veg In
            </span>
          </div>
        </div>

        {/* Food Collected (Served) - Green Accented */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-emerald-500 shadow-xs space-y-2 bg-emerald-50/20">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Food Collected (Served)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-950 font-display">
              {activeStats.totalCollectedFood}
            </span>
            <span className="text-xs font-bold text-emerald-700 truncate">
              ({activeStats.totalCollectedStudents} Served)
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="pt-1 flex items-center justify-between text-xs">
            <span className="text-emerald-800 font-extrabold">
              {activeStats.collectedVegCount} Veg Issued
            </span>
            <span className="text-orange-800 font-extrabold">
              {activeStats.collectedNonVegCount} Non-Veg Issued
            </span>
          </div>
        </div>

        {/* Meals Pending (In Venue) - Orange Accented */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-amber-400 shadow-xs space-y-2 bg-amber-50/20">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Pending Meals (In Venue)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-950 font-display">
              {activeStats.totalPendingFood}
            </span>
            <span className="text-xs font-bold text-amber-800 truncate">
              ({activeStats.totalPendingStudents} Waiting)
            </span>
          </div>
          <div className="pt-2 border-t border-amber-100 flex items-center justify-between text-xs">
            <span className="text-emerald-800 font-extrabold">
              {activeStats.pendingVegCount} Veg Rem.
            </span>
            <span className="text-orange-800 font-extrabold">
              {activeStats.pendingNonVegCount} Non-Veg Rem.
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: TOP GREEN-COLORED LIST — STUDENTS WHO HAVE COLLECTED FOOD      */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-3xl border-2 border-emerald-500 shadow-sm overflow-hidden flex flex-col">
        {/* Green List Header */}
        <div className="bg-emerald-600 p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white text-emerald-950 px-2.5 py-0.5 rounded-full font-display">
                  Collected Food
                </span>
                <span className="text-xs text-emerald-100 font-bold hidden sm:inline">
                  • Meals Delivered & Verified
                </span>
              </div>
              <h3 className="text-base sm:text-xl font-black font-display text-white mt-0.5 truncate">
                Students Who Have Collected Food ({collectedFoodList.length})
              </h3>
            </div>
          </div>

          {/* Search box inside Collected List */}
          <div className="relative min-w-[220px] max-w-sm w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-200 pointer-events-none" />
            <input
              type="text"
              value={collectedSearch}
              onChange={(e) => setCollectedSearch(e.target.value)}
              placeholder="Search collected orders..."
              className="w-full h-9 pl-9 pr-3 bg-white/15 focus:bg-white text-white focus:text-slate-900 placeholder:text-emerald-100/70 border border-white/25 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-white transition"
            />
          </div>
        </div>

        {/* Green List Items */}
        <div className="divide-y divide-emerald-100 overflow-y-auto max-h-[380px] p-2 bg-emerald-50/15">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Loading collected orders...
            </div>
          ) : collectedFoodList.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                <Utensils className="w-6 h-6" />
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-700">
                No Food Collections Registered Yet
              </p>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                Orders collected using the scanner or fast handover will appear in this green list at the top.
              </p>
            </div>
          ) : (
            collectedFoodList.map((st) => {
              const photoSrc = st.photoUrl || (st as any).photo_url;
              const issuedVeg = st.foodCollectedVegCount ?? st.foodVegCount ?? 0;
              const issuedNonVeg = st.foodCollectedNonVegCount ?? st.foodNonVegCount ?? 0;
              const totalIssued = issuedVeg + issuedNonVeg;
              const isReverting = revertingId === (st.studentCode || st.responseId || String(st.id));

              return (
                <div
                  key={st.id}
                  className="p-3 sm:p-3.5 hover:bg-emerald-50/60 rounded-2xl transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-emerald-200/80 mb-1.5 shadow-2xs"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    {/* Photo or Avatar */}
                    {photoSrc ? (
                      <img
                        src={photoSrc}
                        alt={st.studentName}
                        className="w-11 h-13 object-cover rounded-xl border border-emerald-300 shrink-0 shadow-2xs"
                      />
                    ) : (
                      <div className="w-11 h-13 rounded-xl bg-emerald-100 text-emerald-950 border border-emerald-300 flex items-center justify-center font-bold text-sm shrink-0">
                        {st.studentName ? st.studentName.charAt(0).toUpperCase() : 'S'}
                      </div>
                    )}

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-xs font-black text-emerald-950 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                          {st.studentCode || st.responseId}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          Meals Issued
                        </span>
                        {st.campusLocation && (
                          <span className="text-[10px] font-semibold text-slate-500 truncate max-w-[150px]">
                            {st.campusLocation}
                          </span>
                        )}
                      </div>

                      <h4 className="font-black text-slate-900 text-sm truncate">
                        {st.studentName}
                      </h4>

                      {st.medicalCollegeName && (
                        <p className="text-[11px] text-slate-600 truncate flex items-center space-x-1 max-w-md">
                          <Building className="w-3 h-3 text-teal-600 shrink-0" />
                          <span className="truncate">{st.medicalCollegeName}</span>
                        </p>
                      )}

                      {/* Items Collected Pills */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs">
                        <span className="text-[10px] font-extrabold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                          {issuedVeg} Veg
                        </span>
                        <span className="text-[10px] font-extrabold text-orange-950 bg-orange-100 px-2 py-0.5 rounded border border-orange-300">
                          {issuedNonVeg} Non-Veg
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">
                          ({totalIssued} Total Meals)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right side: Timestamp, Three-dots Detail Button, and Undo Revert Button */}
                  <div className="flex items-center justify-between sm:justify-end space-x-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-emerald-100">
                    {st.foodCollectedAt && (
                      <span className="text-[11px] font-mono text-slate-500">
                        {new Date(st.foodCollectedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}

                    {/* Three-dots menu to open detail modal */}
                    <button
                      type="button"
                      onClick={() => setSelectedOrderDetails(st)}
                      className="p-1.5 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-600 hover:text-emerald-800 transition cursor-pointer active:scale-95"
                      title="View Student Photo & Detailed Order Breakdown"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRevertCollection(st)}
                      disabled={isReverting}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-600 hover:text-red-700 text-xs font-semibold transition active:scale-95 flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                      title="Undo collection (moves student back to pending list)"
                    >
                      {isReverting ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-500" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5" />
                      )}
                      <span>Undo</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Green List Footer */}
        <div className="bg-emerald-50 px-4 py-2.5 border-t border-emerald-200 flex items-center justify-between text-xs font-bold text-emerald-950">
          <span>Total Food Served</span>
          <span className="bg-emerald-600 text-white px-2.5 py-0.5 rounded-full shadow-2xs">
            {collectedFoodList.length} Students Completed
          </span>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 3: BOTTOM ORANGE-COLORED LIST — PENDING FOOD COLLECTIONS          */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-3xl border-2 border-amber-500 shadow-sm overflow-hidden flex flex-col">
        {/* Orange List Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white text-amber-950 px-2.5 py-0.5 rounded-full font-display">
                  Pending Food Queue
                </span>
                <span className="text-xs text-amber-100 font-bold hidden sm:inline">
                  • Checked In & Awaiting Meals
                </span>
              </div>
              <h3 className="text-base sm:text-xl font-black font-display text-white mt-0.5 truncate">
                Pending Food Collections ({pendingFoodList.length})
              </h3>
            </div>
          </div>

          {/* Search box inside Pending List */}
          <div className="relative min-w-[220px] max-w-sm w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-200 pointer-events-none" />
            <input
              type="text"
              value={pendingSearch}
              onChange={(e) => setPendingSearch(e.target.value)}
              placeholder="Search pending orders..."
              className="w-full h-9 pl-9 pr-3 bg-white/15 focus:bg-white text-white focus:text-slate-900 placeholder:text-amber-100/70 border border-white/25 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-white transition"
            />
          </div>
        </div>

        {/* Orange List Items */}
        <div className="divide-y divide-amber-100 overflow-y-auto max-h-[380px] p-2 bg-amber-50/15">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Loading pending students...
            </div>
          ) : pendingFoodList.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-700">
                No Checked-In Students Waiting for Food
              </p>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                All delegates currently checked in from reception have received their meals, or arriving delegates have not checked in at reception gate yet.
              </p>
            </div>
          ) : (
            pendingFoodList.map((st, idx) => {
              const photoSrc = st.photoUrl || (st as any).photo_url;
              const totalMeals = (st.foodVegCount || 0) + (st.foodNonVegCount || 0);

              const isPrioritized = priorityOrderIds.some(
                (p) =>
                  p.toLowerCase() === (st.studentCode || '').toLowerCase() ||
                  p.toLowerCase() === (st.studentName || '').toLowerCase() ||
                  p.toLowerCase() === (st.responseId || '').toLowerCase()
              );

              return (
                <div
                  key={st.id}
                  className={`p-3 sm:p-3.5 rounded-2xl transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white mb-1.5 shadow-2xs ${
                    isPrioritized && idx === 0
                      ? 'border-2 border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/30'
                      : 'border border-amber-200 hover:bg-amber-50/60'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    {/* Photo or Avatar */}
                    {photoSrc ? (
                      <img
                        src={photoSrc}
                        alt={st.studentName}
                        className="w-11 h-13 object-cover rounded-xl border border-amber-300 shrink-0 shadow-2xs"
                      />
                    ) : (
                      <div className="w-11 h-13 rounded-xl bg-amber-100 text-amber-950 border border-amber-300 flex items-center justify-center font-bold text-sm shrink-0">
                        {st.studentName ? st.studentName.charAt(0).toUpperCase() : 'S'}
                      </div>
                    )}

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-xs font-black text-amber-950 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                          {st.studentCode || st.responseId}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300">
                          Gate IN
                        </span>
                        {isPrioritized && (
                          <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.2 rounded-full border border-emerald-300 animate-pulse flex items-center space-x-1">
                            <Sparkles className="w-3 h-3 text-emerald-600" />
                            <span>Prioritized at Top</span>
                          </span>
                        )}
                        {st.campusLocation && (
                          <span className="text-[10px] font-semibold text-slate-500 truncate max-w-[150px]">
                            {st.campusLocation}
                          </span>
                        )}
                      </div>

                      <h4 className="font-black text-slate-900 text-sm truncate">
                        {st.studentName}
                      </h4>

                      {st.medicalCollegeName && (
                        <p className="text-[11px] text-slate-600 truncate flex items-center space-x-1 max-w-md">
                          <Building className="w-3 h-3 text-teal-600 shrink-0" />
                          <span className="truncate">{st.medicalCollegeName}</span>
                        </p>
                      )}

                      {/* Ordered Food Pills */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs">
                        <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {st.foodVegCount || 0} Veg
                        </span>
                        <span className="text-[10px] font-extrabold text-orange-800 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                          {st.foodNonVegCount || 0} Non-Veg
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">
                          ({totalMeals} Meals Total)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action: Three dots Menu & Quick Hand Over */}
                  <div className="flex items-center justify-end space-x-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-amber-100">
                    {/* Three-dots menu */}
                    <button
                      type="button"
                      onClick={() => setSelectedOrderDetails(st)}
                      className="p-2 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50 text-slate-600 hover:text-amber-900 transition cursor-pointer active:scale-95"
                      title="View Student Photo & Detailed Order Breakdown"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickHandover(st)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white text-xs font-bold shadow-xs transition flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <Utensils className="w-3.5 h-3.5" />
                      <span>Hand Over Food</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Orange List Footer */}
        <div className="bg-amber-50 px-4 py-2.5 border-t border-amber-200 flex items-center justify-between text-xs font-bold text-amber-950">
          <span>Awaiting Handover</span>
          <span className="bg-amber-600 text-white px-2.5 py-0.5 rounded-full shadow-2xs">
            {pendingFoodList.length} Students Pending
          </span>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 4: AT THE BOTTOM — DEDICATED QR SCANNER PAGE WITH "Food" HEADER   */}
      {/* ========================================================================= */}
      <section
        ref={bottomScannerRef}
        className="bg-white rounded-3xl border-2 border-slate-900 shadow-xl p-5 sm:p-8 space-y-6 text-left"
      >
        {/* "Food" Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                Dedicated Food Scanner Console
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-950 font-serif tracking-tight mt-1">
              Food
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Enter or scan student pass. Submitted orders immediately move to the top of the pending list.
            </p>
          </div>

          {/* Standee QR Card on Right */}
          <div className="flex items-center space-x-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl shrink-0">
            <div className="relative p-1.5 bg-white rounded-xl shadow-xs border border-emerald-500 shrink-0">
              {foodCounterQrDataUrl ? (
                <img
                  src={foodCounterQrDataUrl}
                  alt="Unique Food QR Code"
                  className="w-14 h-14 sm:w-16 sm:h-16 object-contain"
                />
              ) : (
                <div className="w-14 h-14 flex items-center justify-center text-slate-300">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                </div>
              )}
            </div>
            <div className="text-left space-y-1">
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                Unique Food QR Code
              </span>
              <p className="text-[11px] font-bold text-slate-800">
                Catering Desk Standee
              </p>
              <div className="flex items-center space-x-2 text-[10px]">
                <button
                  type="button"
                  onClick={() => setShowStandeeModal(true)}
                  className="text-emerald-700 hover:underline font-bold cursor-pointer"
                >
                  View Large
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={handleDownloadFoodQrStandee}
                  className="text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                >
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Text Box Labeled "Food Orders" */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleFoodOrderSubmit(foodOrdersInput);
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <label
              htmlFor="food-orders-input"
              className="block text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900"
            >
              Food Orders
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* The "Food Orders" Text Box */}
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <input
                  id="food-orders-input"
                  type="text"
                  value={foodOrdersInput}
                  onChange={(e) => setFoodOrdersInput(e.target.value)}
                  placeholder="Enter student code or name (e.g. KNA001)..."
                  className="w-full h-13 pl-12 pr-4 bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-900 placeholder:text-slate-400 border-2 border-slate-300 focus:border-emerald-600 rounded-2xl text-sm sm:text-base font-semibold shadow-inner focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition leading-normal"
                  autoComplete="off"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={verifyLoading || !foodOrdersInput.trim()}
                className="h-13 px-6 sm:px-8 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-sm rounded-2xl shadow-md transition flex items-center justify-center space-x-2 shrink-0 cursor-pointer disabled:opacity-40"
              >
                {verifyLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Submit Order</span>
                  </>
                )}
              </button>

              {/* Toggle Camera QR Scanner */}
              <button
                type="button"
                onClick={isCameraActive ? stopCamera : startCamera}
                className={`h-13 px-4 sm:px-5 rounded-2xl font-bold text-xs sm:text-sm border transition flex items-center justify-center space-x-2 shrink-0 cursor-pointer active:scale-95 ${
                  isCameraActive
                    ? 'bg-red-50 text-red-700 hover:bg-red-100 border-red-300'
                    : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-300'
                }`}
              >
                {isCameraActive ? (
                  <>
                    <CameraOff className="w-4 h-4 text-red-600" />
                    <span>Close Camera</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 text-emerald-600" />
                    <span>Scan Pass QR</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 pl-1">
            Type Student Code (e.g. <strong className="text-slate-700 font-mono">KNA001</strong>) or name in <strong>Food Orders</strong>, then press Enter. The order moves immediately to the top of the pending list!
          </p>
        </form>

        {/* Live Camera QR Scanner Viewfinder (if toggled) */}
        {isCameraActive && (
          <div className="space-y-2 p-4 bg-slate-900 rounded-3xl text-white">
            <div className="flex items-center justify-between text-xs pb-1">
              <span className="font-bold flex items-center space-x-1.5 text-emerald-400">
                <Camera className="w-4 h-4" />
                <span>Live QR Scanner Active</span>
              </span>
              <button
                type="button"
                onClick={stopCamera}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative w-full aspect-video max-h-72 bg-black rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-inner flex items-center justify-center">
              <video ref={videoRef} className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />

              {/* Aiming Reticle */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-44 h-44 border-2 border-emerald-400/90 rounded-2xl relative shadow-lg">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1"></div>
                </div>
              </div>
              <div className="absolute bottom-2 text-center text-[10px] text-white/80 bg-black/60 px-3 py-0.5 rounded-full">
                Position delegate QR pass inside frame
              </div>
            </div>

            {cameraError && (
              <p className="text-xs text-amber-300 text-center">{cameraError}</p>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VALIDATION & LIMIT CHECK DISPLAY (SHOWS "INVALID" ON LIMIT EXCEEDED)      */}
        {/* ========================================================================= */}
        {verifiedStudent && (
          <div className="space-y-4 pt-4 border-t-2 border-slate-200 animate-in fade-in duration-200">
            {/* SCAN VALIDATION STATUS BANNER: DISPLAY "Invalid" CLEARLY */}
            {scanValidation?.status === 'INVALID' ? (
              <div className="p-4 sm:p-5 rounded-2xl bg-red-50 border-3 border-red-500 text-red-950 space-y-2 shadow-sm">
                <div className="flex items-center space-x-2">
                  <ShieldAlert className="w-6 h-6 text-red-600 shrink-0" />
                  <span className="text-base sm:text-lg font-black uppercase tracking-wider text-red-700 font-display">
                    Invalid
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-bold text-red-900 leading-relaxed">
                  {scanValidation.reason || 'Invalid: Scan limit exceeded for this order.'}
                </p>
                <div className="pt-1 flex items-center space-x-2 text-xs text-red-800">
                  <span className="px-2 py-0.5 bg-red-200 text-red-950 font-black rounded">
                    Total Ordered: {scanValidation.totalLimit}
                  </span>
                  <span className="px-2 py-0.5 bg-red-200 text-red-950 font-black rounded">
                    Remaining Quota: {scanValidation.remainingLimit}
                  </span>
                </div>
              </div>
            ) : verifiedStudent.checkInStatus !== 'IN' ? (
              <div className="p-4 rounded-2xl bg-red-50 border-2 border-red-400 text-red-950 space-y-1">
                <div className="flex items-center space-x-2 font-black text-sm">
                  <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
                  <span>⛔ Gate Check-In Required</span>
                </div>
                <p className="text-xs text-red-800 leading-relaxed">
                  <strong>{verifiedStudent.studentName}</strong> has not checked in at reception yet. Attendance check-in from Admin Console is required before food can be collected.
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-400 text-emerald-950 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="text-xs sm:text-sm font-bold">
                    ✅ Valid Order • Eligible to Collect {scanValidation?.remainingLimit ?? ((verifiedStudent.foodVegCount || 0) + (verifiedStudent.foodNonVegCount || 0))} Meals
                  </span>
                </div>
                <span className="px-2.5 py-0.5 bg-emerald-200 text-emerald-950 text-xs font-black rounded-full">
                  Status: Valid
                </span>
              </div>
            )}

            {/* Student Identity Card */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3.5 min-w-0">
                <div className="relative w-14 h-16 rounded-xl overflow-hidden border-2 border-emerald-500 shadow-xs shrink-0 bg-white">
                  {verifiedStudent.photoUrl || (verifiedStudent as any).photo_url ? (
                    <img
                      src={verifiedStudent.photoUrl || (verifiedStudent as any).photo_url}
                      alt={verifiedStudent.studentName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-emerald-50 text-emerald-800 font-bold text-base">
                      {verifiedStudent.studentName?.charAt(0) || 'S'}
                    </div>
                  )}
                </div>

                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-black text-emerald-950 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                      {verifiedStudent.studentCode || verifiedStudent.responseId}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                      {verifiedStudent.campusLocation || 'Kerala NEET Academy'}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
                    {verifiedStudent.studentName}
                  </h3>

                  {verifiedStudent.medicalCollegeName && (
                    <p className="text-xs text-slate-600 truncate flex items-center space-x-1 max-w-md">
                      <Building className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span className="truncate">{verifiedStudent.medicalCollegeName}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Action: Open Detailed Modal */}
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedOrderDetails(verifiedStudent)}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:border-emerald-500 rounded-xl text-xs font-bold text-slate-700 hover:text-emerald-700 transition flex items-center space-x-1 cursor-pointer"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                  <span>Full Order Details</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setVerifiedStudent(null);
                    setScanValidation(null);
                  }}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Ordered Food Limit Breakdown */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/50 to-slate-50 border-2 border-emerald-500 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center space-x-1.5">
                  <Utensils className="w-4 h-4 text-emerald-700" />
                  <span>Detailed Food Order Count</span>
                </span>
                <span className="px-2.5 py-0.5 bg-emerald-200 text-emerald-950 font-black text-xs rounded-full border border-emerald-300">
                  Total Ordered: {(verifiedStudent.foodVegCount || 0) + (verifiedStudent.foodNonVegCount || 0)} Meals
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-emerald-200 text-center">
                  <span className="text-[10px] font-bold uppercase text-emerald-800 block">
                    Ordered Veg Limit
                  </span>
                  <span className="text-2xl font-black text-emerald-950 block mt-0.5">
                    {verifiedStudent.foodVegCount || 0}
                  </span>
                  <span className="text-[10px] text-slate-400">Vegetarian Thali</span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-orange-200 text-center">
                  <span className="text-[10px] font-bold uppercase text-orange-800 block">
                    Ordered Non-Veg Limit
                  </span>
                  <span className="text-2xl font-black text-orange-950 block mt-0.5">
                    {verifiedStudent.foodNonVegCount || 0}
                  </span>
                  <span className="text-[10px] text-slate-400">Non-Veg Meal</span>
                </div>
              </div>
            </div>

            {/* Handover Controls (Only active if scanValidation is VALID) */}
            {scanValidation?.status !== 'INVALID' && verifiedStudent.checkInStatus === 'IN' && (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Select Quantities to Hand Over Now
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Veg Counter */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Veg Meals</span>
                      <span className="text-[10px] text-slate-400">
                        Limit: {verifiedStudent.foodVegCount || 0}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setVegCountInput((v) => Math.max(0, v - 1))}
                        disabled={vegCountInput <= 0 || isCollecting}
                        className="w-9 h-9 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold flex items-center justify-center hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                      >
                        −
                      </button>
                      <span className="w-6 text-center font-extrabold text-base text-slate-900">
                        {vegCountInput}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setVegCountInput((v) => Math.min(verifiedStudent.foodVegCount || 0, v + 1))
                        }
                        disabled={vegCountInput >= (verifiedStudent.foodVegCount || 0) || isCollecting}
                        className="w-9 h-9 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center hover:bg-emerald-700 disabled:opacity-40 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Non-Veg Counter */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Non-Veg Meals</span>
                      <span className="text-[10px] text-slate-400">
                        Limit: {verifiedStudent.foodNonVegCount || 0}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setNonVegCountInput((nv) => Math.max(0, nv - 1))}
                        disabled={nonVegCountInput <= 0 || isCollecting}
                        className="w-9 h-9 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold flex items-center justify-center hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                      >
                        −
                      </button>
                      <span className="w-6 text-center font-extrabold text-base text-slate-900">
                        {nonVegCountInput}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setNonVegCountInput((nv) => Math.min(verifiedStudent.foodNonVegCount || 0, nv + 1))
                        }
                        disabled={nonVegCountInput >= (verifiedStudent.foodNonVegCount || 0) || isCollecting}
                        className="w-9 h-9 rounded-lg bg-orange-600 text-white font-bold flex items-center justify-center hover:bg-orange-700 disabled:opacity-40 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Hand Over Button */}
                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setVerifiedStudent(null);
                      setScanValidation(null);
                    }}
                    disabled={isCollecting}
                    className="py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleRegisterFoodCollection}
                    disabled={
                      isCollecting ||
                      (vegCountInput === 0 && nonVegCountInput === 0)
                    }
                    className="flex-1 py-4 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white font-black text-sm rounded-2xl shadow-lg transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    {isCollecting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Registering Food Handover...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5 stroke-[3]" />
                        <span>
                          Register & Hand Over Food ({vegCountInput + nonVegCountInput} Meals)
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* THREE-DOTS DETAIL POP-UP MODAL (STUDENT PHOTO, NAME, FOOD COUNTS, DETAILS) */}
      {/* ========================================================================= */}
      {selectedOrderDetails && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedOrderDetails(null);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 text-left space-y-5 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedOrderDetails(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition cursor-pointer"
              title="Close Details"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header with Logo Emblem */}
            <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
              <KNALogo variant="emblem" size="sm" />
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 font-display">
                  Student Order Details & Food Breakdown
                </h3>
                <p className="text-xs text-slate-500">
                  Kerala NEET Academy • STETH DAY 2026 Registration Pass
                </p>
              </div>
            </div>

            {/* Student Photo and Core Identity */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center space-x-4">
              <div className="relative w-16 h-20 rounded-xl overflow-hidden border-2 border-emerald-500 shadow-sm shrink-0 bg-white">
                {selectedOrderDetails.photoUrl || (selectedOrderDetails as any).photo_url ? (
                  <img
                    src={selectedOrderDetails.photoUrl || (selectedOrderDetails as any).photo_url}
                    alt={selectedOrderDetails.studentName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-emerald-100 text-emerald-900 font-black text-xl">
                    {selectedOrderDetails.studentName?.charAt(0) || 'S'}
                  </div>
                )}
              </div>

              <div className="min-w-0 space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-black text-emerald-950 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                    {selectedOrderDetails.studentCode || selectedOrderDetails.responseId}
                  </span>
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      selectedOrderDetails.foodCollected
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                  >
                    {selectedOrderDetails.foodCollected ? 'Food Collected' : 'Pending Food'}
                  </span>
                </div>

                <h4 className="text-base sm:text-lg font-black text-slate-950 truncate">
                  {selectedOrderDetails.studentName}
                </h4>

                {selectedOrderDetails.fatherName && (
                  <p className="text-xs text-slate-500">
                    Father: <span className="font-medium text-slate-700">{selectedOrderDetails.fatherName}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Detailed Food Order Count Box */}
            <div className="p-4 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-slate-50 rounded-2xl border-2 border-emerald-500 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center space-x-1.5">
                  <Utensils className="w-4 h-4 text-emerald-700" />
                  <span>Detailed Food Order Count</span>
                </span>
                <span className="text-xs font-black bg-emerald-200 text-emerald-950 px-2.5 py-0.5 rounded-full">
                  Total: {(selectedOrderDetails.foodVegCount || 0) + (selectedOrderDetails.foodNonVegCount || 0)} Meals
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Veg Details */}
                <div className="p-3 bg-white rounded-xl border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                    Vegetarian Meals
                  </span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-2xl font-black text-emerald-950">
                      {selectedOrderDetails.foodVegCount || 0}
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">
                      {selectedOrderDetails.foodCollected ? 'Issued' : 'Pending'}
                    </span>
                  </div>
                </div>

                {/* Non-Veg Details */}
                <div className="p-3 bg-white rounded-xl border border-orange-200">
                  <span className="text-[10px] font-bold text-orange-800 uppercase block">
                    Non-Veg Meals
                  </span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-2xl font-black text-orange-950">
                      {selectedOrderDetails.foodNonVegCount || 0}
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">
                      {selectedOrderDetails.foodCollected ? 'Issued' : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status & Quota Summary */}
              <div className="pt-2 border-t border-emerald-200 flex items-center justify-between text-xs">
                <span className="text-slate-600">
                  Issued: <strong>{selectedOrderDetails.foodCollected ? (selectedOrderDetails.foodCollectedVegCount ?? selectedOrderDetails.foodVegCount ?? 0) + (selectedOrderDetails.foodCollectedNonVegCount ?? selectedOrderDetails.foodNonVegCount ?? 0) : 0}</strong>
                </span>
                <span className="text-slate-600">
                  Remaining Limit: <strong>{selectedOrderDetails.foodCollected ? 0 : (selectedOrderDetails.foodVegCount || 0) + (selectedOrderDetails.foodNonVegCount || 0)}</strong>
                </span>
              </div>
            </div>

            {/* Additional Relevant Details */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Additional Pass Details
              </span>

              {selectedOrderDetails.medicalCollegeName && (
                <div className="flex items-center space-x-2 text-slate-700">
                  <Building className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span className="font-semibold">{selectedOrderDetails.medicalCollegeName}</span>
                  {selectedOrderDetails.medicalCollegeCity && (
                    <span className="text-slate-400">({selectedOrderDetails.medicalCollegeCity})</span>
                  )}
                </div>
              )}

              {selectedOrderDetails.contactNumber && (
                <div className="flex items-center space-x-2 text-slate-700">
                  <Phone className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span className="font-mono">{selectedOrderDetails.contactNumber}</span>
                </div>
              )}

              {selectedOrderDetails.email && (
                <div className="flex items-center space-x-2 text-slate-700">
                  <Mail className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>{selectedOrderDetails.email}</span>
                </div>
              )}

              <div className="flex items-center space-x-4 pt-1 text-[11px] text-slate-500">
                {selectedOrderDetails.coatSize && (
                  <span>Coat Size: <strong className="text-slate-700">{selectedOrderDetails.coatSize}</strong></span>
                )}
                {selectedOrderDetails.campusLocation && (
                  <span>Campus: <strong className="text-slate-700">{selectedOrderDetails.campusLocation}</strong></span>
                )}
                <span>Gate Check-In: <strong className="text-emerald-700">{selectedOrderDetails.checkInStatus || 'PENDING'}</strong></span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedOrderDetails(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Close
              </button>

              {!selectedOrderDetails.foodCollected && selectedOrderDetails.checkInStatus === 'IN' && (
                <button
                  type="button"
                  onClick={() => {
                    handleQuickHandover(selectedOrderDetails);
                    setSelectedOrderDetails(null);
                  }}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <Utensils className="w-3.5 h-3.5" />
                  <span>Hand Over Food</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FULL-SCREEN UNIQUE FOOD QR STANDEE MODAL                                  */}
      {/* ========================================================================= */}
      {showStandeeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowStandeeModal(false);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border-4 border-emerald-500 text-center space-y-5 animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setShowStandeeModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Standee Branding Header */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-center mx-auto">
                <KNALogo variant="emblem" size="md" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest text-emerald-800 bg-emerald-100 px-3 py-0.5 rounded-full border border-emerald-300">
                Official Catering Standee
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
                STETH DAY 2026
              </h3>
              <p className="text-xs sm:text-sm font-bold text-emerald-800">
                Unique Food Collection Counter QR
              </p>
            </div>

            {/* Scannable Large QR Code Image */}
            <div className="relative p-5 bg-white rounded-3xl shadow-xl border-4 border-emerald-600 inline-block mx-auto">
              <div className="absolute top-2 left-2 w-5 h-5 border-t-4 border-l-4 border-emerald-600 rounded-tl"></div>
              <div className="absolute top-2 right-2 w-5 h-5 border-t-4 border-r-4 border-emerald-600 rounded-tr"></div>
              <div className="absolute bottom-2 left-2 w-5 h-5 border-b-4 border-l-4 border-emerald-600 rounded-bl"></div>
              <div className="absolute bottom-2 right-2 w-5 h-5 border-b-4 border-r-4 border-emerald-600 rounded-br"></div>

              {foodCounterQrDataUrl ? (
                <img
                  src={foodCounterQrDataUrl}
                  alt="STETH DAY 2026 Food Counter Standee QR"
                  className="w-64 h-64 sm:w-72 sm:h-72 object-contain select-none"
                />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
                </div>
              )}

              <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-xs font-black uppercase tracking-wider px-4 py-1 rounded-full shadow-lg whitespace-nowrap">
                Scan for Food Handover
              </span>
            </div>

            <div className="space-y-1 text-slate-600 text-xs">
              <p className="font-semibold text-slate-800">
                Scan with any smartphone camera to open this dedicated food scanner console
              </p>
              <p className="text-[11px] text-slate-400 font-mono break-all">
                {foodCounterUrl}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleDownloadFoodQrStandee}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Print-Ready PNG</span>
              </button>
              <button
                type="button"
                onClick={handleCopyFoodQrLink}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Copy className="w-4 h-4 text-emerald-600" />
                <span>{copiedFoodQrLink ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
