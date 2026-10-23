import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  QrCode,
  Search,
  RefreshCw,
  ShieldCheck,
  ArrowLeft,
  Utensils,
  Shirt,
  Check,
  RotateCcw,
  AlertTriangle,
  Eye,
  Activity,
  UserCheck,
  UserX,
  X,
  Building,
  Sparkles,
  ExternalLink,
  Download,
  Copy,
  Smartphone,
  MapPin,
  Maximize2,
  ShieldAlert,
  MoreVertical,
  GraduationCap,
  Building2,
  Phone,
  Mail,
  Calendar,
  User,
} from 'lucide-react';
import QRCode from 'qrcode';
import { DashboardStats, RegistrationRecord } from '../types.ts';
import { subscribeToFirestoreRegistrations, saveRegistrationToFirestore } from '../lib/firebase.ts';
import { KNALogo } from './KNALogo.tsx';
import { CheckInStation, EVENT_VENUE_ADDRESS, EVENT_GATE_INFO } from './CheckInStation.tsx';

interface EventDashboardProps {
  onBackToHome: () => void;
  onOpenAdminLogin?: () => void;
  onNavigateToCheckIn?: () => void;
  isAdmin?: boolean;
}

export const EventDashboard: React.FC<EventDashboardProps> = ({
  onBackToHome,
  onOpenAdminLogin,
  onNavigateToCheckIn,
  isAdmin = false,
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [attendees, setAttendees] = useState<RegistrationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'dual' | 'in' | 'out'>('dual');
  const [checkingInCode, setCheckingInCode] = useState<string | null>(null);
  const [quickScanInput, setQuickScanInput] = useState('');
  const [quickScanFeedback, setQuickScanFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // "Already In" Duplicate Entry Prevention Popup Modal
  const [alreadyInPopup, setAlreadyInPopup] = useState<{
    studentName: string;
    studentCode?: string;
    checkInTime?: string;
  } | null>(null);

  // Full student application details popup state (opened via three-dot menu)
  const [selectedAttendeeDetails, setSelectedAttendeeDetails] = useState<RegistrationRecord | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<{
    url: string;
    name: string;
    code?: string;
  } | null>(null);

  // Dedicated QR Code & Check-in Station States
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [checkInUrl, setCheckInUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);

  // Generate Scannable QR Code pointing to live Check-In Gateway
  useEffect(() => {
    const origin = window.location.origin || 'https://knastethday.online';
    const targetUrl = `${origin}/?mode=checkin`;
    setCheckInUrl(targetUrl);

    QRCode.toDataURL(targetUrl, {
      width: 360,
      margin: 2,
      color: {
        dark: '#032D2B', // Dark teal
        light: '#FFFFFF',
      },
    })
      .then((dataUri) => setQrCodeDataUrl(dataUri))
      .catch((err) => console.error('Failed to generate check-in QR code:', err));
  }, []);

  const handleCopyLink = () => {
    if (!checkInUrl) return;
    navigator.clipboard.writeText(checkInUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleDownloadQR = () => {
    if (!qrCodeDataUrl) return;
    const a = document.createElement('a');
    a.href = qrCodeDataUrl;
    a.download = 'STETH-DAY-2026-Check-In-QR.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Load Real-time Analytics & Attendee Stream
  const fetchAnalytics = async (isManualSync = false) => {
    if (isManualSync) setSyncing(true);
    try {
      const res = await fetch('/api/event/analytics');
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.stats) setStats(data.stats);
        if (Array.isArray(data.attendees)) {
          setAttendees(data.attendees);
        }
      }
    } catch (err) {
      console.error('Failed to load event analytics:', err);
    } finally {
      setLoading(false);
      if (isManualSync) setSyncing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // Poll backup every 12 seconds in case Firestore is silent
    const interval = setInterval(() => {
      fetchAnalytics();
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  // Real-Time Firestore Live Listener
  useEffect(() => {
    const unsubscribe = subscribeToFirestoreRegistrations((firestoreRegistrations) => {
      if (!firestoreRegistrations || firestoreRegistrations.length === 0) return;

      const statusMap = new Map<string, { status: string; time: string | null }>();
      firestoreRegistrations.forEach((r) => {
        const key = (r.studentCode || r.responseId || '').toUpperCase();
        if (key) {
          statusMap.set(key, {
            status: r.checkInStatus || 'PENDING',
            time: r.checkInTime || null,
          });
        }
      });

      if (statusMap.size === 0) return;

      setAttendees((prevAttendees) => {
        let changed = false;
        const updated = prevAttendees.map((a) => {
          const key = (a.studentCode || a.responseId || '').toUpperCase();
          const liveInfo = statusMap.get(key);
          if (liveInfo && liveInfo.status !== a.checkInStatus) {
            changed = true;
            return {
              ...a,
              checkInStatus: liveInfo.status as any,
              checkInTime: liveInfo.time,
            };
          }
          return a;
        });

        return changed ? updated : prevAttendees;
      });
    });

    return () => unsubscribe();
  }, []);

  // Handle Toggle Check-In ('IN' <-> 'OUT' / 'PENDING')
  const handleToggleCheckIn = async (identifier: string, targetStatus?: 'IN' | 'OUT' | 'PENDING') => {
    if (!identifier) return;
    setCheckingInCode(identifier);

    const student = attendees.find(
      (a) =>
        (a.studentCode && a.studentCode.toUpperCase() === identifier.toUpperCase()) ||
        (a.responseId && a.responseId.toUpperCase() === identifier.toUpperCase()) ||
        String(a.id) === identifier
    );

    const nextStatus = targetStatus || (student?.checkInStatus === 'IN' ? 'PENDING' : 'IN');

    // Optimistic UI Update
    setAttendees((prev) =>
      prev.map((a) => {
        const match =
          (a.studentCode && a.studentCode.toUpperCase() === identifier.toUpperCase()) ||
          (a.responseId && a.responseId.toUpperCase() === identifier.toUpperCase()) ||
          String(a.id) === identifier;
        if (match) {
          return {
            ...a,
            checkInStatus: nextStatus,
            checkInTime: nextStatus === 'IN' ? new Date().toISOString() : null,
          };
        }
        return a;
      })
    );

    try {
      const res = await fetch('/api/event/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, status: nextStatus }),
      });

      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();

        // Entry validation: detect duplicate check-in
        if (data.alreadyIn || data.error === 'Already In') {
          const timeStr = data.checkInTime || data.record?.checkInTime
            ? new Date(data.checkInTime || data.record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : undefined;

          setAlreadyInPopup({
            studentName: data.studentName || data.record?.studentName || identifier,
            studentCode: data.studentCode || data.record?.studentCode || '',
            checkInTime: timeStr,
          });
          return;
        }

        if (data.record) {
          saveRegistrationToFirestore({
            ...data.record,
            checkInStatus: data.record.checkInStatus,
            checkInTime: data.record.checkInTime,
          });
        }
        if (data.stats) {
          setStats(data.stats);
        }
      } else {
        fetchAnalytics();
      }
    } catch (err) {
      console.error('Check-in error:', err);
      fetchAnalytics();
    } finally {
      setCheckingInCode(null);
    }
  };

  // Quick Scan or Type to Check-In Submit
  const handleQuickScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = quickScanInput.trim();
    if (!query) return;

    const match = attendees.find(
      (a) =>
        (a.studentCode && a.studentCode.toUpperCase() === query.toUpperCase()) ||
        (a.responseId && a.responseId.toUpperCase() === query.toUpperCase()) ||
        a.studentName.toLowerCase().includes(query.toLowerCase())
    );

    if (!match) {
      setQuickScanFeedback({
        type: 'error',
        message: `No registered delegate found matching "${query}".`,
      });
      setTimeout(() => setQuickScanFeedback(null), 4000);
      return;
    }

    // Entry validation: If attendee has already checked in, trigger "Already In" popup modal to prevent duplicate entry
    if (match.checkInStatus === 'IN') {
      const timeStr = match.checkInTime
        ? new Date(match.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : undefined;

      setAlreadyInPopup({
        studentName: match.studentName,
        studentCode: match.studentCode || match.responseId,
        checkInTime: timeStr,
      });
      setQuickScanInput('');
      return;
    }

    await handleToggleCheckIn(match.studentCode || match.responseId || String(match.id), 'IN');
    setQuickScanFeedback({
      type: 'success',
      message: `Checked IN: ${match.studentName} (${match.studentCode || match.responseId})`,
    });
    setQuickScanInput('');
    setTimeout(() => setQuickScanFeedback(null), 4000);
  };

  // Filtered lists for the Two-Part Attendee Directory
  const { checkedInList, pendingList, totalCheckedIn, totalPending, totalWilling, attendanceRate } =
    useMemo(() => {
      const q = searchQuery.toLowerCase().trim();
      const filtered = attendees.filter((a) => {
        if (!q) return true;
        return (
          (a.studentCode && a.studentCode.toLowerCase().includes(q)) ||
          a.studentName.toLowerCase().includes(q) ||
          (a.medicalCollegeName && a.medicalCollegeName.toLowerCase().includes(q)) ||
          (a.campusLocation && a.campusLocation.toLowerCase().includes(q)) ||
          (a.contactNumber && a.contactNumber.includes(q))
        );
      });

      const checkedIn = filtered.filter((a) => a.checkInStatus === 'IN');
      const pending = filtered.filter((a) => a.checkInStatus !== 'IN');

      const allChecked = attendees.filter((a) => a.checkInStatus === 'IN').length;
      const allPending = attendees.filter((a) => a.checkInStatus !== 'IN').length;
      const willingCount = attendees.length || stats?.totalWilling || 0;
      const rate = willingCount > 0 ? Math.round((allChecked / willingCount) * 100) : 0;

      return {
        checkedInList: checkedIn,
        pendingList: pending,
        totalCheckedIn: allChecked,
        totalPending: allPending,
        totalWilling: willingCount,
        attendanceRate: rate,
      };
    }, [attendees, searchQuery, stats]);

  return (
    <div className="w-full min-h-screen bg-slate-50/70 pb-20">
      {/* Top Navigation & Status Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBackToHome}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition active:scale-95"
              title="Return to Registration Portal"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center space-x-2">
              <KNALogo variant="emblem" size="sm" />
              <div>
                <h1 className="text-sm sm:text-base font-extrabold text-slate-900 font-display tracking-tight flex items-center space-x-2">
                  <span>STETH DAY 2026</span>
                  <span className="hidden sm:inline-block text-slate-300">•</span>
                  <span className="hidden sm:inline-block text-teal-700 font-semibold text-xs">
                    Live Event Dashboard
                  </span>
                </h1>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  Real-time analytics and gate reception attendance
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Live Firestore Beacon */}
            <div className="hidden md:flex items-center space-x-2 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-[11px] font-semibold text-emerald-800">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Live Firestore Connected</span>
            </div>

            <a
              href="#dashboard-gate-qr-footer"
              className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-semibold flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
              title="Jump to Gate QR Code & Check-In Station at footer"
            >
              <QrCode className="w-3.5 h-3.5 text-teal-600" />
              <span className="hidden sm:inline">Gate QR at Footer ↓</span>
            </a>

            <button
              onClick={() => fetchAnalytics(true)}
              disabled={syncing || loading}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition active:scale-95 disabled:opacity-50"
              title="Sync analytics now"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-teal-600' : ''}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>

            {onOpenAdminLogin && (
              <button
                onClick={onOpenAdminLogin}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center space-x-1.5 active:scale-95 shadow-2xs"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                <span>{isAdmin ? 'Admin Console' : 'Admin Login'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* ========================================================================= */}
        {/* PRIMARY SECTION 1: OVERVIEW ANALYTICS AT THE TOP */}
        {/* ========================================================================= */}
        <section aria-labelledby="overview-analytics-title" className="space-y-4">
          {/* Section 1 Header Banner */}
          <div className="bg-gradient-to-r from-slate-950 via-[#0B253A] to-teal-950 p-5 sm:p-6 rounded-3xl text-white shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-teal-500/10 to-transparent pointer-events-none"></div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-teal-400/20 text-teal-300 border border-teal-400/30">
                    <Activity className="w-3 h-3 mr-1" /> Real-Time Analytics Stream
                  </span>
                </div>
                <h2
                  id="overview-analytics-title"
                  className="text-2xl sm:text-3xl font-black text-white mt-1.5 font-display tracking-tight"
                >
                  Overview Analytics
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
                  Live real-time monitoring of STETH DAY 2026 total delegate registrations and
                  on-site gate reception attendance.
                </p>
              </div>

              {/* Attendance Quick Gauge */}
              <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3 sm:p-4 min-w-[200px]">
                <div className="flex items-center justify-between text-xs font-bold text-teal-200">
                  <span>Attendance Rate</span>
                  <span className="text-base text-white font-extrabold">{attendanceRate}%</span>
                </div>
                <div className="w-full bg-slate-800/80 rounded-full h-2.5 mt-2 overflow-hidden border border-white/10">
                  <div
                    className="bg-gradient-to-r from-teal-400 to-emerald-400 h-2.5 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${Math.min(100, Math.max(0, attendanceRate))}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-300 mt-1.5">
                  <span>{totalCheckedIn} In Venue</span>
                  <span>{totalPending} Awaiting Arrival</span>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Analytics KPI Cards: Showing Total Registrations & Total Attendees */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. TOTAL REGISTRATIONS */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-slate-100 rounded-bl-full opacity-50 group-hover:scale-105 transition-transform pointer-events-none"></div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    Total Registrations
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-slate-900 mt-3 font-display">
                  {stats?.totalRegistrations ?? attendees.length}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold text-teal-700">
                  {stats?.totalWilling ?? totalWilling} Willing Delegates
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-500">
                  {stats?.totalNonWilling ?? 0} Non-Willing
                </span>
              </div>
            </div>

            {/* 2. TOTAL ATTENDEES (CHECKED-IN / 'IN' STATUS) */}
            <div className="bg-white p-5 rounded-2xl border-2 border-emerald-500 shadow-xs hover:shadow-md transition flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-emerald-50/60 to-white">
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-bl-3xl pointer-events-none"></div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">
                    Total Attendees
                  </span>
                  <span className="inline-flex items-center space-x-1 text-[11px] font-extrabold bg-emerald-600 text-white px-2.5 py-0.5 rounded-full shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                    <span>In Venue</span>
                  </span>
                </div>
                <div className="flex items-baseline space-x-2 mt-3">
                  <div className="text-3xl sm:text-4xl font-black text-emerald-700 font-display">
                    {totalCheckedIn}
                  </div>
                  <span className="text-xs font-bold text-emerald-800">
                    / {totalWilling} delegates
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-emerald-200/80">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-900 mb-1">
                  <span>Gate Check-In Verified</span>
                  <span>{attendanceRate}% present</span>
                </div>
                <div className="w-full bg-emerald-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, attendanceRate))}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* 3. PENDING ATTENDEES (AWAITING ARRIVAL / 'OUT' / 'PENDING' STATUS) */}
            <div className="bg-white p-5 rounded-2xl border border-amber-300 shadow-xs hover:shadow-md transition flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-amber-50/50 to-white">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-amber-800 uppercase tracking-wider">
                    Pending Arrival
                  </span>
                  <span className="inline-flex items-center space-x-1 text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full">
                    <Clock className="w-3 h-3" />
                    <span>Out / Pending</span>
                  </span>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-amber-900 mt-3 font-display">
                  {totalPending}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-amber-200/60 flex items-center justify-between text-xs text-amber-800">
                <span>Expected at reception</span>
                <span className="font-extrabold">{totalPending} Remaining</span>
              </div>
            </div>

            {/* 4. TOTAL MEALS & REFRESHMENTS */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    Total Meals Reserved
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                    <Utensils className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-slate-900 mt-3 font-display">
                  {stats?.totalFoodCount ||
                    attendees.reduce(
                      (acc, cur) => acc + (cur.foodVegCount || 0) + (cur.foodNonVegCount || 0),
                      0
                    )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-700">
                <span className="text-emerald-700 font-bold">
                  {stats?.foodVegCount ||
                    attendees.reduce((acc, cur) => acc + (cur.foodVegCount || 0), 0)}{' '}
                  Veg
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-orange-700 font-bold">
                  {stats?.foodNonVegCount ||
                    attendees.reduce((acc, cur) => acc + (cur.foodNonVegCount || 0), 0)}{' '}
                  Non-Veg
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* PRIMARY SECTION 2: TWO-PART ATTENDEE LIST */}
        {/* ========================================================================= */}
        <section aria-labelledby="attendee-list-title" className="space-y-4">
          {/* Header Bar with Search & View Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h3
                id="attendee-list-title"
                className="text-lg font-bold text-slate-900 font-display flex items-center space-x-2"
              >
                <Users className="w-5 h-5 text-teal-600" />
                <span>Two-Part Attendee Directory</span>
              </h3>
              <p className="text-xs text-slate-500">
                Displays checked-in attendees followed by attendees awaiting arrival
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search Filter Input */}
              <div className="relative min-w-[220px] flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search code, name, college..."
                  className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                />
              </div>

              {/* View Mode Toggle: Dual / In / Pending */}
              <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setViewMode('dual')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    viewMode === 'dual'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Dual Split View
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('in')}
                  className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${
                    viewMode === 'in'
                      ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>In</span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                    {checkedInList.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('out')}
                  className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${
                    viewMode === 'out'
                      ? 'bg-white text-amber-800 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Pending</span>
                  <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                    {pendingList.length}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Two-Part Layout: Checked-In Attendees ('In') + Attendees Not Yet Arrived ('Out' / 'Pending') */}
          <div
            className={`grid gap-5 ${
              viewMode === 'dual' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
            }`}
          >
            {/* ========================================================================= */}
            {/* PART 1: CHECKED-IN ATTENDEES ('IN' STATUS) */}
            {/* ========================================================================= */}
            {(viewMode === 'dual' || viewMode === 'in') && (
              <div className="bg-white rounded-3xl border-2 border-emerald-500 shadow-xs overflow-hidden flex flex-col">
                {/* Part 1 Header Banner */}
                <div className="bg-emerald-50/90 border-b border-emerald-200/90 p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white font-extrabold text-xs shadow-2xs border border-emerald-500">
                      To In
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-emerald-950 flex items-center space-x-2">
                        <span>Checked-In Attendees</span>
                        <span className="bg-emerald-600 text-white text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
                          {checkedInList.length} In
                        </span>
                      </h4>
                      <p className="text-[11px] text-emerald-800 font-medium">
                        Present on-site • Stethoscope pass issued
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping"></span>
                    <span>Status: IN</span>
                  </span>
                </div>

                {/* Part 1 List Content */}
                <div className="divide-y divide-slate-100 overflow-y-auto max-h-[500px] p-2 flex-1">
                  {loading ? (
                    <div className="p-10 text-center text-slate-400 text-xs">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-600" />
                      Loading checked-in attendees...
                    </div>
                  ) : checkedInList.length === 0 ? (
                    <div className="p-10 text-center space-y-2.5">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border border-emerald-200">
                        <Clock className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-700">No attendees marked IN yet</p>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto">
                        When attendees arrive, click "Check In" from the Pending list or scan their
                        Student Code above.
                      </p>
                    </div>
                  ) : (
                    checkedInList.map((st) => {
                      const isChecking = checkingInCode === (st.studentCode || st.responseId);
                      const photoSrc = st.photoUrl || (st as any).photo_url;
                      return (
                        <div
                          key={st.id}
                          className="p-3.5 hover:bg-emerald-50/40 rounded-2xl transition flex items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center space-x-3.5 min-w-0">
                            {/* Student Photo */}
                            {photoSrc ? (
                              <img
                                src={photoSrc}
                                alt={st.studentName}
                                className="w-10 h-12 object-cover rounded-xl border border-emerald-200 shrink-0 cursor-pointer shadow-2xs hover:scale-105 transition-transform"
                                onClick={() =>
                                  setPreviewPhoto({
                                    url: photoSrc,
                                    name: st.studentName,
                                    code: st.studentCode || st.responseId,
                                  })
                                }
                              />
                            ) : (
                              <div className="w-10 h-12 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-200 flex items-center justify-center font-bold text-sm shrink-0">
                                {st.studentName ? st.studentName.charAt(0).toUpperCase() : 'S'}
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                {/* Student Code */}
                                <span className="font-mono text-xs font-black text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                                  {st.studentCode || st.responseId}
                                </span>
                                {/* 'To In' Status Box */}
                                <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-300 uppercase tracking-wider inline-flex items-center shadow-2xs">
                                  To In
                                </span>
                              </div>

                              {/* Student Name */}
                              <h5 className="font-bold text-slate-900 text-sm mt-1 truncate">
                                {st.studentName}
                              </h5>

                              {/* Assigned Medical College Name */}
                              <p className="text-xs text-slate-600 truncate mt-0.5 flex items-center space-x-1">
                                <Building className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                                <span>{st.medicalCollegeName || 'Medical College Not Assigned'}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5 shrink-0">
                            {st.checkInTime && (
                              <span className="hidden sm:inline-block text-[11px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                {new Date(st.checkInTime).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                handleToggleCheckIn(
                                  st.studentCode || st.responseId || String(st.id),
                                  'PENDING'
                                )
                              }
                              disabled={isChecking}
                              className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-500 hover:text-red-700 text-xs font-semibold transition active:scale-95 flex items-center space-x-1 cursor-pointer"
                              title="Revert status to Out / Pending"
                            >
                              {isChecking ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-500" />
                              ) : (
                                <RotateCcw className="w-3.5 h-3.5" />
                              )}
                              <span className="hidden sm:inline">Undo</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedAttendeeDetails(st)}
                              className="p-1.5 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50 text-slate-600 hover:text-teal-700 transition active:scale-95 flex items-center justify-center cursor-pointer shadow-2xs"
                              title="View student application details"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* PART 2: ATTENDEES WHO HAVE NOT YET ARRIVED ('OUT' / 'PENDING' STATUS) */}
            {/* ========================================================================= */}
            {(viewMode === 'dual' || viewMode === 'out') && (
              <div className="bg-white rounded-3xl border-2 border-amber-300 shadow-xs overflow-hidden flex flex-col">
                {/* Part 2 Header Banner */}
                <div className="bg-amber-50/90 border-b border-amber-200/90 p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold shadow-2xs">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-amber-950 flex items-center space-x-2">
                        <span>Attendees Not Yet Arrived</span>
                        <span className="bg-amber-600 text-white text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
                          {pendingList.length} Pending
                        </span>
                      </h4>
                      <p className="text-[11px] text-amber-800 font-medium">
                        Registered delegates awaiting gate reception
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300">
                    Status: OUT / PENDING
                  </span>
                </div>

                {/* Part 2 List Content */}
                <div className="divide-y divide-slate-100 overflow-y-auto max-h-[500px] p-2 flex-1">
                  {loading ? (
                    <div className="p-10 text-center text-slate-400 text-xs">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-600" />
                      Loading pending delegates...
                    </div>
                  ) : pendingList.length === 0 ? (
                    <div className="p-10 text-center space-y-2.5">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center border border-emerald-200">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-emerald-900">
                        100% Gate Check-In Complete!
                      </p>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto">
                        All registered willing delegates have checked into STETH DAY 2026.
                      </p>
                    </div>
                  ) : (
                    pendingList.map((st) => {
                      const isChecking = checkingInCode === (st.studentCode || st.responseId);
                      const photoSrc = st.photoUrl || (st as any).photo_url;
                      return (
                        <div
                          key={st.id}
                          className="p-3.5 hover:bg-amber-50/40 rounded-2xl transition flex items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center space-x-3.5 min-w-0">
                            {/* Student Photo */}
                            {photoSrc ? (
                              <img
                                src={photoSrc}
                                alt={st.studentName}
                                className="w-10 h-12 object-cover rounded-xl border border-slate-200 shrink-0 cursor-pointer shadow-2xs hover:scale-105 transition-transform"
                                onClick={() =>
                                  setPreviewPhoto({
                                    url: photoSrc,
                                    name: st.studentName,
                                    code: st.studentCode || st.responseId,
                                  })
                                }
                              />
                            ) : (
                              <div className="w-10 h-12 rounded-xl bg-amber-100 text-amber-900 border border-amber-200 flex items-center justify-center font-bold text-sm shrink-0">
                                {st.studentName ? st.studentName.charAt(0).toUpperCase() : 'S'}
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                {/* Student Code */}
                                <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                  {st.studentCode || st.responseId}
                                </span>
                                {/* 'Out' / 'Pending' Status Badge */}
                                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                                  Out / Pending
                                </span>
                              </div>

                              {/* Student Name */}
                              <h5 className="font-bold text-slate-900 text-sm mt-1 truncate">
                                {st.studentName}
                              </h5>

                              {st.medicalCollegeName ? (
                                <p className="text-xs text-slate-600 truncate mt-0.5 flex items-center space-x-1">
                                  <Building className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                                  <span>{st.medicalCollegeName}</span>
                                </p>
                              ) : (
                                <p className="text-xs text-slate-500 truncate mt-0.5">
                                  {st.contactNumber} • {st.campusLocation || 'Kerala NEET Academy'}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Check-In Action Button */}
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleCheckIn(
                                st.studentCode || st.responseId || String(st.id),
                                'IN'
                              )
                            }
                            disabled={isChecking}
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-xs transition flex items-center space-x-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
                            title="Check in this attendee now"
                          >
                            {isChecking ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            )}
                            <span>Check In</span>
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Bottom of Pending List: Clearly display pending count */}
                <div className="bg-amber-50/90 border-t border-amber-200 px-4 py-3 flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Awaiting Reception</span>
                  </span>
                  <span className="px-3.5 py-1 bg-amber-500 text-slate-950 font-black text-xs rounded-full shadow-xs border border-amber-600">
                    {pendingList.length} Pending
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* LOGISTICS & INVENTORY SUMMARY: COAT SIZES & TOP COLLEGES */}
        {/* ========================================================================= */}
        <section className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Shirt className="w-4 h-4 text-teal-600" />
              <span>Event Logistics: Apron & Coat Size Breakdown</span>
            </h3>
            <span className="text-xs text-slate-400">Total willing delegate passes</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-7 gap-2.5 pt-1">
            {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map((sz) => {
              const countVal =
                stats?.coatSizes?.[sz] ||
                attendees.filter((a) => a.coatSize === sz).length;
              return (
                <div
                  key={sz}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center"
                >
                  <span className="text-xs font-bold text-slate-500 block">{sz}</span>
                  <span className="text-2xl font-black text-slate-900 block mt-0.5">
                    {countVal}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Aprons</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* DEDICATED QR CODE SECTION: SCANNABLE CODE & CHECK-IN INTERFACE ACCESS */}
        {/* Positioned at the very bottom or footer of the page */}
        {/* ========================================================================= */}
        <footer
          id="dashboard-gate-qr-footer"
          aria-labelledby="qr-section-title"
          className="pt-4 border-t border-slate-200"
        >
          <div className="bg-gradient-to-br from-slate-900 via-[#0B2338] to-teal-950 rounded-3xl p-5 sm:p-7 text-white border border-teal-500/30 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-full bg-radial from-teal-500/10 to-transparent pointer-events-none"></div>

            <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
              {/* Left Column: Scannable QR Code Card with Viewfinder Styling */}
              <div className="flex flex-col items-center text-center shrink-0 w-full sm:w-auto">
                <div className="relative p-4 bg-white rounded-3xl shadow-xl border-4 border-teal-500/40 group">
                  {/* Viewfinder corner brackets */}
                  <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-teal-600 rounded-tl pointer-events-none"></div>
                  <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-teal-600 rounded-tr pointer-events-none"></div>
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-teal-600 rounded-bl pointer-events-none"></div>
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-teal-600 rounded-br pointer-events-none"></div>

                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="STETH DAY 2026 Check-In QR Code"
                      className="w-44 h-44 sm:w-52 sm:h-52 object-contain rounded-xl select-none"
                    />
                  ) : (
                    <div className="w-44 h-44 sm:w-52 sm:h-52 flex flex-col items-center justify-center bg-slate-50 text-slate-400">
                      <RefreshCw className="w-8 h-8 animate-spin text-teal-600 mb-2" />
                      <span className="text-xs">Generating QR...</span>
                    </div>
                  )}

                  <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-teal-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-md whitespace-nowrap">
                    Scan To Check In
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 mt-4 flex items-center space-x-1">
                  <Smartphone className="w-3.5 h-3.5 text-teal-400" />
                  <span>Scan with any smartphone camera</span>
                </p>

                {/* QR Quick Actions: Copy Link & Download QR */}
                <div className="flex items-center space-x-2 mt-2.5">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-200 hover:text-white transition flex items-center space-x-1 active:scale-95 cursor-pointer"
                    title="Copy Check-In Link"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadQR}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-200 hover:text-white transition flex items-center space-x-1 active:scale-95 cursor-pointer"
                    title="Download QR Image for Printing"
                  >
                    <Download className="w-3 h-3" />
                    <span>Save QR</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Event Address, Live Counts & Launch Check-In Interface */}
              <div className="flex-1 space-y-4 w-full">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-teal-400/20 text-teal-300 border border-teal-400/40">
                      <QrCode className="w-3 h-3 mr-1" /> Dedicated QR Check-In Feature
                    </span>
                    <span className="text-[11px] text-slate-400">Dashboard Footer</span>
                  </div>

                  <h3
                    id="qr-section-title"
                    className="text-xl sm:text-2xl font-black text-white font-display mt-1"
                  >
                    STETH DAY 2026 QR Check-In Station
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                    When attendees scan this QR code, they access the dedicated check-in interface
                    where they can enter their <strong>Student Code</strong> or <strong>Name</strong> to
                    automatically update their status to <strong>'In'</strong> on the attendee list in real time.
                  </p>
                </div>

                {/* Event Address Displayed (Required by Prompt) */}
                <div className="bg-slate-950/60 border border-teal-500/30 rounded-2xl p-3 sm:p-4 space-y-1">
                  <div className="flex items-center space-x-1.5 text-teal-400 text-xs font-bold uppercase tracking-wider">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>Official Event Venue & Reception Address</span>
                  </div>
                  <p className="text-xs sm:text-sm text-white font-medium">
                    {EVENT_VENUE_ADDRESS}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {EVENT_GATE_INFO} • Helpline: +91 98470 12345
                  </p>
                </div>

                {/* Overall Counts Updated Accordingly (Real-Time Badge Strip) */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-2.5 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-300 block">
                      Total Willing
                    </span>
                    <span className="text-lg sm:text-xl font-black text-white font-display">
                      {totalWilling}
                    </span>
                  </div>

                  <div className="bg-emerald-500/20 border border-emerald-400/40 rounded-xl p-2.5 text-center">
                    <span className="text-[10px] uppercase font-extrabold text-emerald-300 block flex items-center justify-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      <span>Marked 'In'</span>
                    </span>
                    <span className="text-lg sm:text-xl font-black text-emerald-300 font-display">
                      {totalCheckedIn}
                    </span>
                  </div>

                  <div className="bg-amber-500/20 border border-amber-400/40 rounded-xl p-2.5 text-center">
                    <span className="text-[10px] uppercase font-bold text-amber-200 block">
                      Out / Pending
                    </span>
                    <span className="text-lg sm:text-xl font-black text-amber-300 font-display">
                      {totalPending}
                    </span>
                  </div>
                </div>

                {/* Primary Access Button: Launch Check-In Interface */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigateToCheckIn) {
                        onNavigateToCheckIn();
                      } else {
                        setIsCheckInModalOpen(true);
                      }
                    }}
                    className="flex-1 h-11 px-5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg transition flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Maximize2 className="w-4 h-4" />
                    <span>Open Interactive Check-In Interface</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.open(checkInUrl || '/?mode=checkin', '_blank')}
                    className="h-11 px-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 active:scale-95 cursor-pointer"
                    title="Open Mobile Self Check-In in new tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="hidden sm:inline">Open URL</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Check-In / Scan Input Bar inside Section */}
            <div className="mt-5 pt-4 border-t border-white/10">
              <form
                onSubmit={handleQuickScanSubmit}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
              >
                <div className="flex-1 relative flex items-center">
                  <QrCode className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={quickScanInput}
                    onChange={(e) => setQuickScanInput(e.target.value)}
                    placeholder="Quick check-in: Enter Student Code (e.g., KNA001) or Name to mark IN..."
                    className="w-full h-11 pl-10 pr-4 bg-slate-950/80 border border-teal-500/30 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:bg-slate-900"
                  />
                </div>
                <button
                  type="submit"
                  className="h-11 px-5 bg-teal-500 hover:bg-teal-600 active:scale-95 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center space-x-1.5 shrink-0 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Mark IN</span>
                </button>
              </form>

              {quickScanFeedback && (
                <div
                  className={`mt-3 p-3 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-in fade-in duration-150 ${
                    quickScanFeedback.type === 'success'
                      ? 'bg-emerald-950/80 text-emerald-200 border border-emerald-500/60'
                      : 'bg-red-950/80 text-red-200 border border-red-500/60'
                  }`}
                >
                  {quickScanFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span>{quickScanFeedback.message}</span>
                </div>
              )}
            </div>
          </div>
        </footer>
      </main>

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-3 shadow-2xl border border-slate-200 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-bold text-slate-900 text-sm">{previewPhoto.name}</h5>
                {previewPhoto.code && (
                  <p className="text-xs font-mono font-bold text-teal-700">{previewPhoto.code}</p>
                )}
              </div>
              <button
                onClick={() => setPreviewPhoto(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
              <img
                src={previewPhoto.url}
                alt={previewPhoto.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      )}
      {/* Interactive Check-In Station Modal */}
      {isCheckInModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in p-2 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl border border-slate-700 bg-slate-900 animate-in zoom-in-95">
            <CheckInStation
              isEmbeddedModal={true}
              onCloseModal={() => {
                setIsCheckInModalOpen(false);
                fetchAnalytics(true);
              }}
              onBackToHome={() => {
                setIsCheckInModalOpen(false);
                onBackToHome();
              }}
            />
          </div>
        </div>
      )}
      {/* "Already In" Duplicate Entry Prevention Popup Modal */}
      {alreadyInPopup && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dashboard-already-in-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setAlreadyInPopup(null)}
        >
          <div
            className="w-full max-w-sm sm:max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border-2 border-amber-400 text-center space-y-4 animate-in zoom-in-95 duration-150 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button in top-right */}
            <button
              type="button"
              onClick={() => setAlreadyInPopup(null)}
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
                id="dashboard-already-in-title"
                className="text-2xl sm:text-3xl font-black text-slate-900 font-display tracking-tight text-amber-950"
              >
                Already In
              </h3>
              <p className="text-xs sm:text-sm text-slate-600">
                Attendee has already checked into STETH DAY 2026. Duplicate entry prevented.
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
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Recorded Check-In</span>
                  <span className="font-semibold text-slate-700">{alreadyInPopup.checkInTime}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1.5 border-t border-amber-200/80">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Gate Status</span>
                <span className="inline-flex items-center space-x-1 text-emerald-800 bg-emerald-100 font-black px-2.5 py-0.5 rounded-full text-[11px] border border-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  <span>Marked 'IN'</span>
                </span>
              </div>
            </div>

            <button
              type="button"
              autoFocus
              onClick={() => setAlreadyInPopup(null)}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-slate-950 font-black text-sm rounded-xl shadow-md transition cursor-pointer"
            >
              OK, Understood
            </button>
          </div>
        </div>
      )}

      {/* Student Application Details Popup Modal */}
      {selectedAttendeeDetails && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dashboard-student-application-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto"
          onClick={() => setSelectedAttendeeDetails(null)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-950 via-[#0B253A] to-teal-950 text-white p-5 sm:p-6 flex items-center justify-between relative shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-teal-400/20 text-teal-300 px-2 py-0.5 rounded-full border border-teal-400/30">
                      Application Profile
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-300">
                      {selectedAttendeeDetails.studentCode || selectedAttendeeDetails.responseId}
                    </span>
                  </div>
                  <h3 id="dashboard-student-application-title" className="text-lg sm:text-xl font-black text-white font-display mt-0.5">
                    {selectedAttendeeDetails.studentName}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAttendeeDetails(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-800 text-xs flex-1">
              {/* Profile Card with Photo & Gate Status */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                {/* Profile Photo */}
                <div className="shrink-0 relative">
                  {(selectedAttendeeDetails.photoUrl || (selectedAttendeeDetails as any).photo_url) ? (
                    <img
                      src={selectedAttendeeDetails.photoUrl || (selectedAttendeeDetails as any).photo_url}
                      alt={selectedAttendeeDetails.studentName}
                      className="w-24 h-32 sm:w-28 sm:h-36 object-cover rounded-2xl border-2 border-teal-500/30 shadow-md cursor-pointer hover:scale-[1.02] transition"
                      onClick={() =>
                        setPreviewPhoto({
                          url: selectedAttendeeDetails.photoUrl || (selectedAttendeeDetails as any).photo_url,
                          name: selectedAttendeeDetails.studentName,
                          code: selectedAttendeeDetails.studentCode || selectedAttendeeDetails.responseId,
                        })
                      }
                      title="Click to view enlarged photo"
                    />
                  ) : (
                    <div className="w-24 h-32 sm:w-28 sm:h-36 rounded-2xl bg-teal-100 text-teal-900 border-2 border-teal-300 flex flex-col items-center justify-center font-bold text-2xl shadow-inner">
                      <span>{selectedAttendeeDetails.studentName ? selectedAttendeeDetails.studentName.charAt(0).toUpperCase() : 'S'}</span>
                      <span className="text-[10px] text-teal-700 font-medium mt-1">No Photo</span>
                    </div>
                  )}
                  {(selectedAttendeeDetails.photoUrl || (selectedAttendeeDetails as any).photo_url) && (
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewPhoto({
                          url: selectedAttendeeDetails.photoUrl || (selectedAttendeeDetails as any).photo_url,
                          name: selectedAttendeeDetails.studentName,
                          code: selectedAttendeeDetails.studentCode || selectedAttendeeDetails.responseId,
                        })
                      }
                      className="absolute bottom-1 right-1 p-1 bg-black/60 hover:bg-black/80 text-white rounded-lg text-[9px] font-semibold flex items-center space-x-0.5 cursor-pointer backdrop-blur-xs"
                      title="Enlarge photo"
                    >
                      <Eye className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Core Identity Info */}
                <div className="flex-1 text-center sm:text-left space-y-2">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="font-mono text-xs font-black text-teal-800 bg-teal-100 px-2.5 py-0.5 rounded-lg border border-teal-300">
                      {selectedAttendeeDetails.studentCode || selectedAttendeeDetails.responseId}
                    </span>
                    {selectedAttendeeDetails.checkInStatus === 'IN' ? (
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                        <span>Marked 'IN'</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        <Clock className="w-3 h-3 text-amber-700" />
                        <span>Out / Pending Arrival</span>
                      </span>
                    )}
                  </div>

                  <h4 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
                    {selectedAttendeeDetails.studentName}
                  </h4>

                  <p className="text-slate-500 text-xs">
                    Father's / Guardian's Name: <span className="font-bold text-slate-800">{selectedAttendeeDetails.fatherName || 'Not specified'}</span>
                  </p>

                  {selectedAttendeeDetails.checkInTime && (
                    <p className="text-[11px] text-emerald-800 font-medium">
                      Gate Arrival Recorded: <span className="font-mono font-bold">{new Date(selectedAttendeeDetails.checkInTime).toLocaleString()}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Application Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* 1. Allotted Medical College */}
                <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200/80 space-y-1">
                  <div className="flex items-center space-x-1.5 text-teal-800 font-extrabold text-[10px] uppercase tracking-wider">
                    <Building className="w-3.5 h-3.5 text-teal-600" />
                    <span>Allotted Medical College</span>
                  </div>
                  <p className="text-sm font-extrabold text-slate-900">
                    {selectedAttendeeDetails.medicalCollegeName || 'Medical College Not Assigned'}
                  </p>
                  <p className="text-[11px] text-slate-600 flex items-center space-x-1">
                    <MapPin className="w-3 h-3 text-teal-600 shrink-0" />
                    <span>
                      {[
                        selectedAttendeeDetails.medicalCollegeCity,
                        selectedAttendeeDetails.medicalCollegeDistrict,
                        selectedAttendeeDetails.medicalCollegeState,
                      ].filter(Boolean).join(', ') || 'Kerala / All India'}
                    </span>
                  </p>
                </div>

                {/* 2. Academy Campus & College Branch */}
                <div className="p-3.5 rounded-2xl bg-sky-50/60 border border-sky-200/80 space-y-1">
                  <div className="flex items-center space-x-1.5 text-sky-800 font-extrabold text-[10px] uppercase tracking-wider">
                    <Building2 className="w-3.5 h-3.5 text-sky-600" />
                    <span>Kerala NEET Academy Campus / Branch</span>
                  </div>
                  <p className="text-sm font-extrabold text-slate-900">
                    {selectedAttendeeDetails.campusLocation || 'Kerala NEET Academy Hub'}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Enrolled Coaching Center & Regional Branch
                  </p>
                </div>

                {/* 3. Course / Program */}
                <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 space-y-1">
                  <div className="flex items-center space-x-1.5 text-indigo-800 font-extrabold text-[10px] uppercase tracking-wider">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Enrolled Course / Program</span>
                  </div>
                  <p className="text-sm font-extrabold text-slate-900">
                    {selectedAttendeeDetails.courseProgram || 'NEET Medical Entrance Program'}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Academic Curriculum & Batch Track
                  </p>
                </div>

                {/* 4. Contact & Personal Details */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-slate-700 font-extrabold text-[10px] uppercase tracking-wider">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>Contact Information</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Phone:</span>
                    <a
                      href={`tel:${selectedAttendeeDetails.contactNumber}`}
                      className="font-mono font-bold text-teal-700 hover:underline"
                    >
                      {selectedAttendeeDetails.contactNumber}
                    </a>
                  </div>
                  {selectedAttendeeDetails.ntaScore !== undefined && selectedAttendeeDetails.ntaScore !== null ? (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">NTA Score:</span>
                      <span className="font-semibold text-teal-700">{selectedAttendeeDetails.ntaScore} / 720</span>
                    </div>
                  ) : selectedAttendeeDetails.age ? (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Age:</span>
                      <span className="font-semibold text-slate-800">{selectedAttendeeDetails.age} years</span>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Logistics & Registration Meta */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-2 bg-white rounded-xl border border-slate-200/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Coat Size</span>
                  <span className="text-base font-black text-slate-900 flex items-center justify-center space-x-1 mt-0.5">
                    <Shirt className="w-3.5 h-3.5 text-teal-600" />
                    <span>{selectedAttendeeDetails.coatSize || 'M'}</span>
                  </span>
                </div>

                <div className="p-2 bg-white rounded-xl border border-slate-200/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Meals Reserved</span>
                  <span className="text-xs font-black text-slate-900 block mt-0.5">
                    <span className="text-emerald-700">{selectedAttendeeDetails.foodVegCount || 0}V</span>
                    {' • '}
                    <span className="text-orange-700">{selectedAttendeeDetails.foodNonVegCount || 0}NV</span>
                  </span>
                </div>

                <div className="p-2 bg-white rounded-xl border border-slate-200/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
                  <span className="text-xs font-black text-teal-700 block mt-0.5">
                    {selectedAttendeeDetails.willingness || 'WILLING'}
                  </span>
                </div>

                <div className="p-2 bg-white rounded-xl border border-slate-200/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Response ID</span>
                  <span className="font-mono text-[10px] font-bold text-slate-700 block truncate mt-0.5" title={selectedAttendeeDetails.responseId}>
                    {selectedAttendeeDetails.responseId}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer with Actions */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="text-[11px] text-slate-500">
                Registered on: {new Date(selectedAttendeeDetails.createdAt).toLocaleDateString()}
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                {selectedAttendeeDetails.checkInStatus === 'IN' ? (
                  <button
                    type="button"
                    onClick={async () => {
                      const id = selectedAttendeeDetails.studentCode || selectedAttendeeDetails.responseId || String(selectedAttendeeDetails.id);
                      await handleToggleCheckIn(id, 'PENDING');
                      setSelectedAttendeeDetails((prev) => prev ? { ...prev, checkInStatus: 'PENDING', checkInTime: null } : null);
                    }}
                    className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition flex items-center justify-center space-x-1.5 cursor-pointer active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Undo Gate Check-In</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      const id = selectedAttendeeDetails.studentCode || selectedAttendeeDetails.responseId || String(selectedAttendeeDetails.id);
                      await handleToggleCheckIn(id, 'IN');
                      setSelectedAttendeeDetails((prev) => prev ? { ...prev, checkInStatus: 'IN', checkInTime: new Date().toISOString() } : null);
                    }}
                    className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center space-x-1.5 cursor-pointer active:scale-95"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark Checked IN</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedAttendeeDetails(null)}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
