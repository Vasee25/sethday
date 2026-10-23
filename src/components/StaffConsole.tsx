import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  QrCode,
  Search,
  RefreshCw,
  LogOut,
  Utensils,
  Check,
  RotateCcw,
  AlertTriangle,
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
  X,
  Shirt,
} from 'lucide-react';
import QRCode from 'qrcode';
import { DashboardStats, RegistrationRecord } from '../types.ts';
import { subscribeToFirestoreRegistrations, saveRegistrationToFirestore } from '../lib/firebase.ts';
import { KNALogo } from './KNALogo.tsx';
import { CheckInStation, EVENT_VENUE_ADDRESS, EVENT_GATE_INFO } from './CheckInStation.tsx';
import { FoodConsole } from './FoodConsole.tsx';

interface StaffConsoleProps {
  onBackToPortal: () => void;
  onLogout?: () => void;
  staffUser?: any;
}

export const StaffConsole: React.FC<StaffConsoleProps> = ({
  onBackToPortal,
  onLogout,
  staffUser = { name: 'KNA Event Staff', email: 'staff@keralaneetacademy.org', role: 'staff' },
}) => {
  // Page Switcher: Gate Attendance Desk vs Food & Catering Desk
  const [staffActivePage, setStaffActivePage] = useState<'attendance' | 'food'>('attendance');

  // Real-time Dashboard Data
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Attendees list
  const [attendees, setAttendees] = useState<RegistrationRecord[]>([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [attendeeViewMode, setAttendeeViewMode] = useState<'dual' | 'in' | 'out'>('dual');
  const [checkingInCode, setCheckingInCode] = useState<string | null>(null);

  // Coordinator Desk Quick Scanner Bar
  const [quickScanInput, setQuickScanInput] = useState('');
  const [quickScanFeedback, setQuickScanFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // =========================================================================
  // STAFF CHECK-IN FEATURE POP-UP STATE
  // When scanning or checking in a student, triggers pop-up with photo, name,
  // code & size in larger font, Medical College, and other details + 'Done' button
  // =========================================================================
  const [checkInModalStudent, setCheckInModalStudent] = useState<RegistrationRecord | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Full student application details popup state (opened via three-dot menu)
  const [selectedAttendeeDetails, setSelectedAttendeeDetails] = useState<RegistrationRecord | null>(null);

  // "Already In" Popup
  const [alreadyInPopup, setAlreadyInPopup] = useState<{
    studentName: string;
    studentCode?: string;
    checkInTime?: string;
  } | null>(null);

  // Gate Reception Feature & Standee State
  const [gateQrCodeDataUrl, setGateQrCodeDataUrl] = useState<string>('');
  const [checkInUrl, setCheckInUrl] = useState<string>('');
  const [copiedQrLink, setCopiedQrLink] = useState(false);
  const [showCheckInPreview, setShowCheckInPreview] = useState(false);

  // Generate Scannable QR Code for the Gate Check-In Standee
  useEffect(() => {
    const origin = window.location.origin || 'https://knastethday.online';
    const targetUrl = `${origin}/?mode=checkin`;
    setCheckInUrl(targetUrl);

    QRCode.toDataURL(targetUrl, {
      width: 360,
      margin: 2,
      color: {
        dark: '#032D2B', // Deep KNA teal
        light: '#FFFFFF',
      },
    })
      .then((dataUri) => setGateQrCodeDataUrl(dataUri))
      .catch((err) => console.error('Failed to generate gate check-in QR:', err));
  }, []);

  const handleCopyQrLink = () => {
    if (!checkInUrl) return;
    navigator.clipboard.writeText(checkInUrl);
    setCopiedQrLink(true);
    setTimeout(() => setCopiedQrLink(false), 3000);
  };

  const handleDownloadQrStandee = () => {
    if (!gateQrCodeDataUrl) return;
    const a = document.createElement('a');
    a.href = gateQrCodeDataUrl;
    a.download = 'STETH-DAY-2026-Gate-CheckIn-QR.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Fetch initial dashboard stats & attendees from backend
  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadAllAttendees = async () => {
    setAttendeesLoading(true);
    try {
      const res = await fetch('/api/event/analytics');
      if (res.ok) {
        const data = await res.json();
        if (data.attendees && Array.isArray(data.attendees)) {
          setAttendees(data.attendees);
        }
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to load attendees:', err);
    } finally {
      setAttendeesLoading(false);
    }
  };

  // Mount listeners: fetch backend data and subscribe to real-time Firestore sync
  useEffect(() => {
    loadStats();
    loadAllAttendees();

    // Live real-time subscription for instant multi-device sync
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

  // Handle Scanning a student's code or entering student's name: triggers the staff check-in pop-up!
  const handleScanCodeSubmit = async (e?: React.FormEvent, customQuery?: string) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const query = (customQuery !== undefined ? customQuery : quickScanInput).trim();
    if (!query) return;

    // Clean query: if someone scans a QR code with JSON like {"code":"KNA007"} or URL
    let cleanCode = query;
    if (cleanCode.startsWith('{') && cleanCode.endsWith('}')) {
      try {
        const parsed = JSON.parse(cleanCode);
        cleanCode = parsed.code || parsed.studentCode || parsed.id || cleanCode;
      } catch {}
    } else if (cleanCode.includes('code=')) {
      const match = cleanCode.match(/code=([^&]+)/);
      if (match && match[1]) cleanCode = decodeURIComponent(match[1]);
    }

    const cleanQ = cleanCode.toLowerCase().replace(/\D/g, '');
    const lowerQ = cleanCode.toLowerCase();

    // Search attendee in current list by studentCode, responseId, name, or phone
    let found = attendees.find((a) => {
      const c = (a.studentCode || '').toLowerCase();
      const r = (a.responseId || '').toLowerCase();
      const n = (a.studentName || '').toLowerCase();
      const p = (a.contactNumber || '').replace(/\D/g, '');

      return (
        c === lowerQ ||
        r === lowerQ ||
        n === lowerQ ||
        c.includes(lowerQ) ||
        r.includes(lowerQ) ||
        n.includes(lowerQ) ||
        (cleanQ.length >= 4 && p.includes(cleanQ))
      );
    });

    // If not found in memory, try server API lookup
    if (!found) {
      try {
        const res = await fetch(`/api/registration/${encodeURIComponent(cleanCode)}`);
        if (res.ok) {
          const rec = await res.json();
          if (rec && (rec.studentCode || rec.responseId)) {
            found = rec;
            setAttendees((prev) => {
              const existingIdx = prev.findIndex(
                (a) => a.studentCode === rec.studentCode || a.responseId === rec.responseId
              );
              if (existingIdx >= 0) {
                const next = [...prev];
                next[existingIdx] = { ...next[existingIdx], ...rec };
                return next;
              }
              return [rec, ...prev];
            });
          }
        }
      } catch (err) {
        console.warn('Network lookup error:', err);
      }
    }

    if (found) {
      if (found.checkInStatus === 'IN') {
        setQuickScanFeedback({
          type: 'success',
          message: `Student ${found.studentName} (${found.studentCode || found.responseId}) is already in the "In" list.`,
        });
        setTimeout(() => setQuickScanFeedback(null), 4000);
      } else {
        // Manual check-in moves student directly to the "In" list without a pop-up
        await handleToggleCheckIn(found.studentCode || found.responseId || String(found.id), 'IN');
      }
      setQuickScanInput('');
    } else {
      setQuickScanFeedback({
        type: 'error',
        message: `No attendee found matching "${query}". Please verify Student Code or Name.`,
      });
      setTimeout(() => setQuickScanFeedback(null), 4000);
    }
  };

  // Clicking 'Done' on the check-in pop-up closes the pop-up and updates the status to 'IN'
  const handleDoneCheckIn = async () => {
    if (!checkInModalStudent) return;

    const studentToUpdate = checkInModalStudent;
    // If student is already checked in, clicking 'Done' simply closes the pop-up
    if (studentToUpdate.checkInStatus === 'IN') {
      setCheckInModalStudent(null);
      setQuickScanFeedback({
        type: 'success',
        message: `Student ${studentToUpdate.studentName} (${studentToUpdate.studentCode || studentToUpdate.responseId}) is confirmed IN venue.`,
      });
      setTimeout(() => setQuickScanFeedback(null), 4000);
      return;
    }

    const identifier = studentToUpdate.studentCode || studentToUpdate.responseId || String(studentToUpdate.id);

    setIsUpdatingStatus(true);
    try {
      const res = await fetch('/api/event/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, status: 'IN' }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to check in attendee');
      }

      // Optimistically update local attendee list
      setAttendees((prev) =>
        prev.map((a) => {
          if (
            a.id === studentToUpdate.id ||
            a.studentCode === studentToUpdate.studentCode ||
            a.responseId === studentToUpdate.responseId
          ) {
            return {
              ...a,
              checkInStatus: 'IN',
              checkInTime: new Date().toISOString(),
            };
          }
          return a;
        })
      );

      // Sync to Firestore
      saveRegistrationToFirestore({
        ...studentToUpdate,
        checkInStatus: 'IN',
        checkInTime: new Date().toISOString(),
      } as any);

      // Update stats
      if (data.stats) {
        setStats(data.stats);
      } else {
        loadStats();
      }

      setQuickScanFeedback({
        type: 'success',
        message: `✅ Verified & Checked IN: ${studentToUpdate.studentName} (${studentToUpdate.studentCode || studentToUpdate.responseId})`,
      });
      setTimeout(() => setQuickScanFeedback(null), 4000);
    } catch (err: any) {
      console.error('Check-in error on Done:', err);
      setQuickScanFeedback({
        type: 'error',
        message: err.message || 'Failed to update check-in status.',
      });
    } finally {
      setIsUpdatingStatus(false);
      setCheckInModalStudent(null);
    }
  };

  // Direct toggle check-in (used for Undo to revert from 'IN' to 'PENDING')
  const handleToggleCheckIn = async (identifier: string, targetStatus: 'IN' | 'PENDING') => {
    setCheckingInCode(identifier);
    try {
      const res = await fetch('/api/event/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, status: targetStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Check-in update failed');
      }

      if (data.alreadyIn) {
        setQuickScanFeedback({
          type: 'success',
          message: `Student ${data.studentName || identifier} (${data.studentCode || ''}) is already in the "In" list.`,
        });
        setTimeout(() => setQuickScanFeedback(null), 4000);
        return;
      }

      // Update state
      setAttendees((prev) =>
        prev.map((a) => {
          if (a.studentCode === identifier || a.responseId === identifier || String(a.id) === identifier) {
            return {
              ...a,
              checkInStatus: targetStatus,
              checkInTime: targetStatus === 'IN' ? new Date().toISOString() : null,
            };
          }
          return a;
        })
      );

      // Sync to Firestore if marking IN
      const matched = attendees.find(
        (a) => a.studentCode === identifier || a.responseId === identifier || String(a.id) === identifier
      );
      if (matched) {
        saveRegistrationToFirestore({
          ...matched,
          checkInStatus: targetStatus,
          checkInTime: targetStatus === 'IN' ? new Date().toISOString() : null,
        } as any);
      }

      if (data.stats) {
        setStats(data.stats);
      } else {
        loadStats();
      }

      if (targetStatus === 'IN') {
        const studentName = data.studentName || matched?.studentName || identifier;
        const studentCode = data.studentCode || matched?.studentCode || identifier;
        setQuickScanFeedback({
          type: 'success',
          message: `✅ Checked IN: ${studentName} (${studentCode}) moved directly to "In" list.`,
        });
        setTimeout(() => setQuickScanFeedback(null), 4000);
      } else {
        setQuickScanFeedback({
          type: 'success',
          message: `Reverted to Pending: ${matched?.studentName || identifier}`,
        });
        setTimeout(() => setQuickScanFeedback(null), 3000);
      }
    } catch (err: any) {
      console.error('Check-in error:', err);
      setQuickScanFeedback({
        type: 'error',
        message: err.message || 'Failed to update check-in status.',
      });
    } finally {
      setCheckingInCode(null);
    }
  };

  // Filtered Attendees for Display
  const filteredAttendees = useMemo(() => {
    if (!attendeeSearch.trim()) return attendees;
    const q = attendeeSearch.toLowerCase();
    return attendees.filter((a) => {
      return (
        (a.studentCode && a.studentCode.toLowerCase().includes(q)) ||
        (a.studentName && a.studentName.toLowerCase().includes(q)) ||
        (a.medicalCollegeName && a.medicalCollegeName.toLowerCase().includes(q)) ||
        (a.campusLocation && a.campusLocation.toLowerCase().includes(q)) ||
        (a.contactNumber && a.contactNumber.includes(q))
      );
    });
  }, [attendees, attendeeSearch]);

  const checkedInList = useMemo(
    () => filteredAttendees.filter((a) => a.checkInStatus === 'IN'),
    [filteredAttendees]
  );

  const pendingList = useMemo(
    () => filteredAttendees.filter((a) => a.checkInStatus !== 'IN'),
    [filteredAttendees]
  );

  const totalCheckedIn = useMemo(
    () => attendees.filter((a) => a.checkInStatus === 'IN').length,
    [attendees]
  );

  const totalPending = useMemo(
    () => attendees.filter((a) => a.checkInStatus !== 'IN').length,
    [attendees]
  );

  const totalWillingAttendees = attendees.length || stats?.totalWilling || 0;
  const attendanceRate =
    totalWillingAttendees > 0 ? Math.round((totalCheckedIn / totalWillingAttendees) * 100) : 0;

  return (
    <div className="w-full max-w-[98%] xl:max-w-[1550px] mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6">
      {/* Top Bar: Staff Command Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <KNALogo variant="emblem" size="md" />
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
                STETH DAY 2026 — Staff Console
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-100 text-teal-800 border border-teal-300">
                Staff Portal • Overview Analytics
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Logged in as <span className="font-semibold text-teal-700">{staffUser?.name || 'KNA Event Staff'}</span> ({staffUser?.email})
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onBackToPortal}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
          >
            Public View
          </button>
          {onLogout && (
            <button
              onClick={onLogout}
              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg transition flex items-center space-x-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>

      {/* Both Pages Switcher: Gate Attendance Desk & Food Catering Desk */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-slate-100 rounded-2xl border border-slate-200">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setStaffActivePage('attendance')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition flex items-center space-x-2 cursor-pointer ${
              staffActivePage === 'attendance'
                ? 'bg-teal-700 text-white shadow-md'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-300" />
            <span>Gate Attendance & Check-In Desk</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                staffActivePage === 'attendance'
                  ? 'bg-teal-800 text-teal-100'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {totalCheckedIn} / {totalWillingAttendees} In
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStaffActivePage('food')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition flex items-center space-x-2 cursor-pointer ${
              staffActivePage === 'food'
                ? 'bg-emerald-700 text-white shadow-md'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
            }`}
          >
            <Utensils className="w-4 h-4 text-emerald-300" />
            <span>Food & Catering Management Desk</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                staffActivePage === 'food'
                  ? 'bg-emerald-800 text-emerald-100'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {stats?.totalFoodCount || 0} Meals
            </span>
          </button>
        </div>

        <span className="text-[11px] font-semibold text-slate-500 hidden md:inline pr-2">
          Staff Console • Toggle between Gate Check-In and Food Catering pages
        </span>
      </div>

      {staffActivePage === 'food' ? (
        <FoodConsole
          onBackToPortal={onBackToPortal}
          onLogout={onLogout}
          currentUser={staffUser}
          onSwitchToAttendance={() => setStaffActivePage('attendance')}
        />
      ) : (
        <>
      {/* ========================================================================= */}
      {/* OVERVIEW ANALYTICS (EXACT DUPLICATE OF ADMIN CONSOLE OVERVIEW ANALYTICS) */}
      {/* ========================================================================= */}
      <div className="space-y-6">
        {/* SECTION 1: OVERVIEW ANALYTICS AT THE TOP */}
        <div className="space-y-4">
          {/* Real-time Header & Live Sync Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-[#0B253A] to-teal-950 p-4 sm:p-5 rounded-2xl text-white shadow-md">
            <div>
              <div className="flex items-center space-x-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                  Live Real-Time Sync Active
                </span>
                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-slate-300">
                  Firestore Grounded
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-white mt-1 font-display">
                Overview Analytics
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Live registration and gate attendance metrics for STETH DAY 2026
              </p>
            </div>

            <div className="flex items-center space-x-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setStaffActivePage('food')}
                className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer"
                title="Switch to Food & Catering Console page"
              >
                <Utensils className="w-3.5 h-3.5 text-emerald-400" />
                <span>Food Desk →</span>
              </button>
              <a
                href="#staff-gate-qr-footer"
                className="px-3 py-1.5 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
                title="Jump to Gate QR Standee & Student Check-In Interface at bottom of page"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Gate QR at Footer ↓</span>
              </a>
              <button
                onClick={() => {
                  loadStats();
                  loadAllAttendees();
                }}
                disabled={attendeesLoading || statsLoading}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50 cursor-pointer"
                title="Refresh attendance and stats"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${attendeesLoading || statsLoading ? 'animate-spin' : ''}`} />
                <span>Sync Now</span>
              </button>
            </div>
          </div>

          {/* Primary Analytics KPI Cards: Total Registrations & Total Attendees */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Total Registrations */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Total Registrations
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2">
                  {stats?.totalRegistrations || 0}
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>All recorded entries</span>
                <span className="font-semibold text-slate-700">{stats?.totalWilling || 0} Willing</span>
              </div>
            </div>

            {/* 2. Total Attendees (Checked-In / In) */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-emerald-500 bg-gradient-to-br from-emerald-50/70 to-white shadow-xs flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-bl-3xl pointer-events-none"></div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center space-x-1">
                    <span>Total Attendees</span>
                  </span>
                  <span className="inline-flex items-center space-x-1 text-[10px] font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded-full shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                    <span>In Venue</span>
                  </span>
                </div>
                <div className="flex items-baseline space-x-2 mt-2">
                  <div className="text-3xl sm:text-4xl font-extrabold text-emerald-700">
                    {totalCheckedIn}
                  </div>
                  <span className="text-xs font-semibold text-emerald-800">
                    / {totalWillingAttendees} delegates
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-emerald-200/60">
                <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900 mb-1">
                  <span>Attendance Rate</span>
                  <span>{attendanceRate}%</span>
                </div>
                <div className="w-full bg-emerald-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, attendanceRate))}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* 3. Pending Attendees (Not Yet Arrived / Out) */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/50 to-white shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                    Pending Arrival
                  </span>
                  <span className="inline-flex items-center space-x-1 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full">
                    <Clock className="w-2.5 h-2.5" />
                    <span>Out / Pending</span>
                  </span>
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold text-amber-900 mt-2">
                  {totalPending}
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-amber-100 flex items-center justify-between text-[11px] text-amber-800">
                <span>Awaiting gate check-in</span>
                <span className="font-semibold">{totalWillingAttendees - totalCheckedIn} remaining</span>
              </div>
            </div>

            {/* 4. Total Meals Ordered */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Total Meals
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
                    <Utensils className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2">
                  {stats?.totalFoodCount || 0}
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                <span className="text-emerald-700 font-semibold">{stats?.foodVegCount || 0} Veg</span>
                <span>•</span>
                <span className="text-orange-700 font-semibold">{stats?.foodNonVegCount || 0} Non-Veg</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* STAFF FAST CHECK-IN & SCANNER BAR                                        */}
        {/* Scanning student code or entering student name triggers the Check-In Pop-up*/}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-r from-teal-950 via-[#0a3338] to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-md border border-teal-500/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-300 bg-teal-800/60 px-2.5 py-0.5 rounded-full border border-teal-400/40">
                  Staff Fast Check-In Desk
                </span>
              </div>
              <h4 className="text-base sm:text-lg font-black font-display text-white mt-1 flex items-center space-x-2">
                <QrCode className="w-5 h-5 text-teal-400" />
                <span>Scan Student Code or Enter Name</span>
              </h4>
              <p className="text-xs text-teal-100/80 mt-0.5">
                Scan barcode/QR or type student code (e.g. <strong className="text-white">KNA007</strong>) or student name (e.g. <strong className="text-white">Vaseehar</strong>) to move attendee directly to the "In" list.
              </p>
            </div>

            <div className="w-full md:w-auto md:min-w-[420px]">
              <form onSubmit={(e) => handleScanCodeSubmit(e)} className="flex items-stretch gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-300 pointer-events-none" />
                  <input
                    type="text"
                    value={quickScanInput}
                    onChange={(e) => setQuickScanInput(e.target.value)}
                    placeholder="Scan code (e.g. KNA007) or enter student name..."
                    className="w-full h-11 pl-10 pr-8 bg-white/10 hover:bg-white/15 focus:bg-white text-white focus:text-slate-950 placeholder:text-teal-200/60 border border-teal-400/40 focus:border-teal-400 rounded-xl text-xs sm:text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-teal-400 shadow-inner"
                  />
                  {quickScanInput && (
                    <button
                      type="button"
                      onClick={() => setQuickScanInput('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-200 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  className="h-11 px-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-center space-x-1.5 shrink-0 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Check In</span>
                </button>
              </form>

              {quickScanFeedback && (
                <div
                  className={`mt-2 p-2.5 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-in fade-in duration-150 ${
                    quickScanFeedback.type === 'success'
                      ? 'bg-emerald-950/90 text-emerald-200 border border-emerald-400/60'
                      : 'bg-red-950/90 text-red-200 border border-red-400/60'
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
        </div>

        {/* SECTION 2: TWO-PART ATTENDEE LIST */}
        <div className="space-y-4">
          {/* Directory Bar with Search & View Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h4 className="text-base font-bold text-slate-900 font-display flex items-center space-x-2">
                <Users className="w-5 h-5 text-teal-600" />
                <span>Real-Time Attendee Directory</span>
              </h4>
              <p className="text-xs text-slate-500">
                Live check-in gate status for all registered STETH DAY delegates
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search within attendance list */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (attendeeSearch.trim()) {
                    handleScanCodeSubmit(undefined, attendeeSearch);
                  }
                }}
                className="relative min-w-[200px] flex-1 sm:flex-initial"
              >
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={attendeeSearch}
                  onChange={(e) => setAttendeeSearch(e.target.value)}
                  placeholder="Filter or Enter to check in..."
                  className="w-full h-8 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                />
              </form>

              {/* View Mode Toggle */}
              <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs font-semibold">
                <button
                  onClick={() => setAttendeeViewMode('dual')}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    attendeeViewMode === 'dual'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Dual View
                </button>
                <button
                  onClick={() => setAttendeeViewMode('in')}
                  className={`px-2.5 py-1 rounded-md transition flex items-center space-x-1 cursor-pointer ${
                    attendeeViewMode === 'in'
                      ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>In</span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded-full">
                    {checkedInList.length}
                  </span>
                </button>
                <button
                  onClick={() => setAttendeeViewMode('out')}
                  className={`px-2.5 py-1 rounded-md transition flex items-center space-x-1 cursor-pointer ${
                    attendeeViewMode === 'out'
                      ? 'bg-white text-amber-800 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Pending</span>
                  <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded-full">
                    {pendingList.length}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Two-Part Grid Container */}
          <div
            className={`grid gap-4 ${
              attendeeViewMode === 'dual' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
            }`}
          >
            {/* ================= PART 1: CHECKED-IN ATTENDEES ('IN') ================= */}
            {(attendeeViewMode === 'dual' || attendeeViewMode === 'in') && (
              <div className="bg-white rounded-2xl border-2 border-emerald-500/80 shadow-xs overflow-hidden flex flex-col">
                {/* Part 1 Header */}
                <div className="bg-emerald-50/90 border-b border-emerald-200/80 p-3.5 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white font-extrabold text-[10px] uppercase tracking-wider border border-emerald-500 shadow-2xs">
                      To In
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-emerald-950 flex items-center space-x-1.5">
                        <span>Checked-In Attendees</span>
                        <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                          {checkedInList.length} In
                        </span>
                      </h5>
                      <p className="text-[11px] text-emerald-800">
                        Present in venue • Badge issued
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                    Status: IN
                  </span>
                </div>

                {/* Part 1 List */}
                <div className="divide-y divide-slate-100 overflow-y-auto max-h-[460px] p-1 flex-1">
                  {attendeesLoading ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      Loading checked-in attendees...
                    </div>
                  ) : checkedInList.length === 0 ? (
                    <div className="p-8 text-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                        <Clock className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-semibold text-slate-600">
                        No attendees checked in yet
                      </p>
                      <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                        Use the coordinator scan input below or click "Check In" on pending delegates when they arrive at the reception desk.
                      </p>
                    </div>
                  ) : (
                    checkedInList.map((st) => {
                      const isChecking = checkingInCode === (st.studentCode || st.responseId);
                      const photoSrc = st.photoUrl || (st as any).photo_url;
                      return (
                        <div
                          key={st.id}
                          className="p-3 hover:bg-emerald-50/40 transition flex items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            {/* Photo or Avatar */}
                            {photoSrc ? (
                              <img
                                src={photoSrc}
                                alt={st.studentName}
                                className="w-9 h-11 object-cover rounded-lg border border-emerald-200 shrink-0 cursor-pointer shadow-2xs hover:opacity-90 transition"
                                onClick={() => setSelectedAttendeeDetails(st)}
                                title="Click to view full application details"
                              />
                            ) : (
                              <div
                                className="w-9 h-11 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center font-bold text-xs shrink-0 cursor-pointer"
                                onClick={() => setSelectedAttendeeDetails(st)}
                                title="Click to view full application details"
                              >
                                {st.studentName ? st.studentName.charAt(0).toUpperCase() : 'S'}
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono text-xs font-extrabold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                                  {st.studentCode || st.responseId}
                                </span>
                                <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300 uppercase tracking-wider inline-flex items-center shadow-2xs">
                                  To In
                                </span>
                              </div>

                              <h6 className="font-bold text-slate-900 text-xs sm:text-sm mt-0.5 truncate">
                                {st.studentName}
                              </h6>

                              <p className="text-[11px] text-slate-600 truncate mt-0.5 flex items-center space-x-1">
                                <Building className="w-3 h-3 text-teal-600 shrink-0" />
                                <span>{st.medicalCollegeName || 'Medical College Not Assigned'}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5 shrink-0">
                            {st.checkInTime && (
                              <span className="hidden sm:inline-block text-[10px] font-mono text-slate-400">
                                {new Date(st.checkInTime).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            )}

                            {/* Undo Check-In Button */}
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleCheckIn(st.studentCode || st.responseId || String(st.id), 'PENDING')
                              }
                              disabled={isChecking}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-500 hover:text-red-700 text-[11px] font-semibold transition active:scale-95 flex items-center space-x-1 cursor-pointer"
                              title="Revert status to Pending / Out"
                            >
                              {isChecking ? (
                                <RefreshCw className="w-3 h-3 animate-spin text-slate-500" />
                              ) : (
                                <RotateCcw className="w-3 h-3" />
                              )}
                              <span className="hidden sm:inline">Undo</span>
                            </button>

                            {/* Three-Dot Menu Button: Opens the pop-up message that previously appeared during initial check-in */}
                            <button
                              type="button"
                              onClick={() => setCheckInModalStudent(st)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50 text-slate-600 hover:text-teal-700 transition active:scale-95 flex items-center justify-center cursor-pointer shadow-2xs"
                              title="View student check-in details pop-up"
                              aria-label="View student check-in details pop-up"
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

            {/* ================= PART 2: ATTENDEES NOT YET ARRIVED ('OUT' / 'PENDING') ================= */}
            {(attendeeViewMode === 'dual' || attendeeViewMode === 'out') && (
              <div className="bg-white rounded-2xl border-2 border-amber-300 shadow-xs overflow-hidden flex flex-col">
                {/* Part 2 Header */}
                <div className="bg-amber-50/90 border-b border-amber-200 p-3.5 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-amber-950 flex items-center space-x-1.5">
                        <span>Attendees Not Yet Arrived</span>
                        <span className="bg-amber-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                          {pendingList.length} Pending
                        </span>
                      </h5>
                      <p className="text-[11px] text-amber-800">
                        Registered delegates awaiting gate reception
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                    Status: OUT / PENDING
                  </span>
                </div>

                {/* Part 2 List */}
                <div className="divide-y divide-slate-100 overflow-y-auto max-h-[460px] p-1 flex-1">
                  {attendeesLoading ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      Loading pending attendees...
                    </div>
                  ) : pendingList.length === 0 ? (
                    <div className="p-8 text-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-emerald-800">
                        100% Attendance Achieved!
                      </p>
                      <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
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
                          className="p-3 hover:bg-amber-50/40 transition flex items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            {/* Photo or Avatar */}
                            {photoSrc ? (
                              <img
                                src={photoSrc}
                                alt={st.studentName}
                                className="w-9 h-11 object-cover rounded-lg border border-slate-200 shrink-0 cursor-pointer shadow-2xs hover:opacity-90 transition"
                                onClick={() => setSelectedAttendeeDetails(st)}
                                title="Click to view full application details"
                              />
                            ) : (
                              <div
                                className="w-9 h-11 rounded-lg bg-amber-100 text-amber-900 border border-amber-200 flex items-center justify-center font-bold text-xs shrink-0 cursor-pointer"
                                onClick={() => setSelectedAttendeeDetails(st)}
                                title="Click to view full application details"
                              >
                                {st.studentName ? st.studentName.charAt(0).toUpperCase() : 'S'}
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                  {st.studentCode || st.responseId}
                                </span>
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  Out / Pending
                                </span>
                              </div>

                              <h6 className="font-bold text-slate-900 text-xs sm:text-sm mt-0.5 truncate">
                                {st.studentName}
                              </h6>

                              {st.medicalCollegeName && (
                                <p className="text-[11px] text-slate-600 truncate mt-0.5 flex items-center space-x-1">
                                  <Building className="w-3 h-3 text-teal-600 shrink-0" />
                                  <span>{st.medicalCollegeName}</span>
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center shrink-0">
                            {/* In Staff Console: manual check-in moves student directly to the "In" list without a pop-up */}
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleCheckIn(st.studentCode || st.responseId || String(st.id), 'IN')
                              }
                              disabled={isChecking}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-xs transition flex items-center space-x-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
                              title="Check in this attendee directly to the In list"
                            >
                              {isChecking ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              )}
                              <span>Check In</span>
                            </button>
                          </div>
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
        </div>

        {/* SECTION 3: EXPANDABLE STATS & BREAKDOWNS (EXACT REPLICA FROM ADMIN CONSOLE) */}
        <div className="space-y-4 pt-2">
          {/* Coat Size Breakdown */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Shirt className="w-4 h-4 text-teal-600" />
                <span>Apron / Coat Size Inventory Breakdown</span>
              </h3>
              <span className="text-xs text-slate-400">Total willing passes</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 pt-1">
              {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map((sz) => {
                const countVal = stats?.coatSizes?.[sz] || 0;
                return (
                  <div key={sz} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <span className="text-xs font-bold text-slate-500 block">{sz}</span>
                    <span className="text-xl font-extrabold text-slate-900 block mt-0.5">{countVal}</span>
                    <span className="text-[10px] text-slate-400">Coats</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* States & Medical Colleges Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Top Colleges */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Building className="w-4 h-4 text-teal-600" />
                <span>Top Registered Medical Colleges</span>
              </h3>
              <div className="divide-y divide-slate-100 text-xs">
                {stats?.collegeStats && stats.collegeStats.length > 0 ? (
                  stats.collegeStats.map((c, i) => (
                    <div key={i} className="py-2 flex items-center justify-between">
                      <span className="text-slate-700 font-medium truncate max-w-[240px]">
                        {c.college}
                      </span>
                      <span className="font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                        {c.count} students
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 py-3">No student college data yet.</p>
                )}
              </div>
            </div>

            {/* State Distribution */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-teal-600" />
                <span>State Distribution</span>
              </h3>
              <div className="divide-y divide-slate-100 text-xs">
                {stats?.stateStats && stats.stateStats.length > 0 ? (
                  stats.stateStats.map((s, i) => (
                    <div key={i} className="py-2 flex items-center justify-between">
                      <span className="text-slate-700 font-medium">{s.state}</span>
                      <span className="font-bold text-slate-900">{s.count} delegates</span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 py-3">No state data yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RECEPTION GATE QR STANDEE & MOBILE CHECK-IN (GATE RECEPTION FEATURE) */}
        {/* ========================================================================= */}
        <footer id="staff-gate-qr-footer" className="mt-8 pt-6 border-t border-slate-200">
          <div className="bg-gradient-to-br from-slate-900 via-[#0B2338] to-teal-950 rounded-3xl p-5 sm:p-7 text-white border border-teal-500/30 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-full bg-radial from-teal-500/10 to-transparent pointer-events-none"></div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
              {/* Scannable QR Code Card */}
              <div className="flex flex-col items-center text-center shrink-0">
                <div className="relative p-3.5 bg-white rounded-2xl shadow-lg border-2 border-teal-500/40">
                  {/* Viewfinder corner brackets */}
                  <div className="absolute top-1.5 left-1.5 w-3.5 h-3.5 border-t-2 border-l-2 border-teal-600 rounded-tl pointer-events-none"></div>
                  <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 border-t-2 border-r-2 border-teal-600 rounded-tr pointer-events-none"></div>
                  <div className="absolute bottom-1.5 left-1.5 w-3.5 h-3.5 border-b-2 border-l-2 border-teal-600 rounded-bl pointer-events-none"></div>
                  <div className="absolute bottom-1.5 right-1.5 w-3.5 h-3.5 border-b-2 border-r-2 border-teal-600 rounded-br pointer-events-none"></div>

                  {gateQrCodeDataUrl ? (
                    <img
                      src={gateQrCodeDataUrl}
                      alt="Student Gate Check-In QR Code"
                      className="w-40 h-40 sm:w-44 sm:h-44 object-contain rounded-lg select-none"
                    />
                  ) : (
                    <div className="w-40 h-40 flex items-center justify-center bg-slate-50 text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin text-teal-600" />
                    </div>
                  )}

                  <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-teal-600 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs whitespace-nowrap">
                    Gate Check-In QR
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 mt-3 flex items-center space-x-1">
                  <Smartphone className="w-3.5 h-3.5 text-teal-400" />
                  <span>Students scan with any smartphone</span>
                </p>

                <div className="flex items-center space-x-2 mt-2">
                  <button
                    type="button"
                    onClick={handleCopyQrLink}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold text-slate-200 hover:text-white transition flex items-center space-x-1 cursor-pointer active:scale-95"
                    title="Copy Check-In Link"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedQrLink ? 'Copied Link!' : 'Copy Link'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadQrStandee}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold text-slate-200 hover:text-white transition flex items-center space-x-1 cursor-pointer active:scale-95"
                    title="Download QR Standee for Printing"
                  >
                    <Download className="w-3 h-3" />
                    <span>Print Standee</span>
                  </button>
                </div>
              </div>

              {/* QR Station Info & Reception Controls */}
              <div className="flex-1 space-y-3.5 w-full">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-teal-400/20 text-teal-300 border border-teal-400/30">
                      <QrCode className="w-3 h-3 mr-1" /> Gate Reception Feature
                    </span>
                    <span className="text-[11px] text-slate-400">Admin Console Footer</span>
                  </div>
                  <h4 className="text-lg sm:text-xl font-bold text-white font-display mt-1">
                    Reception Gate QR Standee & Mobile Check-In
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Place this scannable QR code at venue entrance gates. When students scan it,
                    they access a clean, focused check-in screen where they enter their student code or name
                    to automatically record their attendance into this console in real time.
                  </p>
                </div>

                {/* Venue Address Display */}
                <div className="bg-slate-950/60 border border-teal-500/30 rounded-xl p-3 space-y-1 text-xs">
                  <div className="flex items-center space-x-1 text-teal-400 font-bold uppercase tracking-wider text-[10px]">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span>Event Reception Venue</span>
                  </div>
                  <p className="text-white font-medium">
                    {EVENT_VENUE_ADDRESS}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {EVENT_GATE_INFO}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowCheckInPreview(true)}
                    className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Preview Student Check-In Interface</span>
                  </button>

                  <a
                    href={checkInUrl || '/?mode=checkin'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white border border-white/20 font-semibold text-xs rounded-xl transition flex items-center space-x-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in New Tab</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Quick Coordinator Check-In Bar: In Staff Console, scanning triggers the Check-In Pop-Up! */}
            <div className="mt-4 pt-3.5 border-t border-white/10">
              <form onSubmit={handleScanCodeSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1 relative flex items-center">
                  <QrCode className="absolute left-3 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={quickScanInput}
                    onChange={(e) => setQuickScanInput(e.target.value)}
                    placeholder="Coordinator Desk: Scan or enter Student Code (e.g. KNA001) or Name to mark IN..."
                    className="w-full h-9 pl-9 pr-3 bg-slate-950/80 border border-teal-500/30 rounded-xl text-xs text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:bg-slate-900"
                  />
                </div>
                <button
                  type="submit"
                  className="h-9 px-4 bg-teal-500 hover:bg-teal-600 active:scale-95 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-1 shrink-0 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Mark IN</span>
                </button>
              </form>

              {quickScanFeedback && (
                <div
                  className={`mt-2 p-2 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-in fade-in duration-150 ${
                    quickScanFeedback.type === 'success'
                      ? 'bg-emerald-950/80 text-emerald-200 border border-emerald-500/60'
                      : 'bg-red-950/80 text-red-200 border border-red-500/60'
                  }`}
                >
                  {quickScanFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  )}
                  <span>{quickScanFeedback.message}</span>
                </div>
              )}
            </div>
          </div>
        </footer>
      </div>

      {/* ========================================================================= */}
      {/* STAFF CHECK-IN POP-UP: Photo, Name, Code & Size in larger font, Medical  */}
      {/* College, and other details followed by a 'Done' button.                 */}
      {/* Clicking 'Done' closes the pop-up and updates the status to 'IN'.        */}
      {/* ========================================================================= */}
      {checkInModalStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isUpdatingStatus) {
              setCheckInModalStudent(null);
            }
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-xl bg-white rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-4 my-auto max-h-[94vh] overflow-y-auto">
            {/* Top Header Badge & Close 'X' */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <span className={`w-2.5 h-2.5 rounded-full ${checkInModalStudent.checkInStatus === 'IN' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                <span className="text-[11px] font-black uppercase tracking-wider text-teal-900 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                  Staff Check-In Verification
                </span>
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                  checkInModalStudent.checkInStatus === 'IN'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}>
                  {checkInModalStudent.checkInStatus === 'IN' ? 'Verified (IN)' : 'Awaiting Check-In'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCheckInModalStudent(null)}
                disabled={isUpdatingStatus}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition cursor-pointer"
                title="Cancel"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ========================================================================= */}
            {/* 1. STUDENT'S NAME & COAT SIZE IN A LARGER FONT (TOP PROMINENT SECTION)   */}
            {/* ========================================================================= */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-50/80 via-teal-50/40 to-slate-50 border-2 border-emerald-500 shadow-sm text-center">
              <span className="inline-block px-3 py-0.5 rounded-full bg-teal-100/90 text-teal-900 text-[10px] font-black uppercase tracking-wider mb-1.5">
                STETH DAY 2026 Delegate
              </span>

              {/* Student's Name */}
              <h3 className="text-2xl sm:text-4xl font-black text-slate-900 font-display tracking-tight leading-tight">
                {checkInModalStudent.studentName}
              </h3>

              {/* Coat Size Shown in a LARGER Font */}
              <div className="mt-3.5 inline-flex items-center justify-center p-3 px-6 sm:px-8 rounded-2xl bg-white border-2 border-emerald-500 shadow-md">
                <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mr-3.5 shadow-xs">
                  <Shirt className="w-7 h-7 stroke-[2.5]" />
                </div>
                <div className="text-left">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 block">
                    Apron / Coat Size
                  </span>
                  <span className="font-mono text-4xl sm:text-5xl font-black text-emerald-950 block leading-none mt-0.5">
                    {checkInModalStudent.coatSize || 'Standard'}
                  </span>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 2. ALL OTHER RELEVANT STUDENT DETAILS LISTED BELOW THIS INFORMATION      */}
            {/* ========================================================================= */}
            <div className="space-y-3 pt-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                <Users className="w-3.5 h-3.5 text-teal-600" />
                <span>Student Details & Credentials</span>
              </h4>

              {/* Student Photo & Identification Card */}
              <div className="flex items-center space-x-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                {/* Photo */}
                <div className="relative w-20 h-24 sm:w-24 sm:h-28 rounded-xl overflow-hidden border-2 border-teal-600 shadow-xs shrink-0 bg-white">
                  {checkInModalStudent.photoUrl || (checkInModalStudent as any).photo_url ? (
                    <img
                      src={checkInModalStudent.photoUrl || (checkInModalStudent as any).photo_url}
                      alt={checkInModalStudent.studentName}
                      className="w-full h-full object-cover select-none"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-teal-50 text-teal-800">
                      <User className="w-8 h-8 text-teal-600 mb-0.5" />
                      <span className="text-lg font-black">{checkInModalStudent.studentName?.charAt(0) || 'S'}</span>
                    </div>
                  )}
                  {checkInModalStudent.checkInStatus === 'IN' && (
                    <div className="absolute top-1 right-1 bg-emerald-600 text-white rounded-full p-0.5 shadow-2xs">
                      <CheckCircle2 className="w-3 h-3" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1.5 text-left">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-black uppercase text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-300">
                      Student Code
                    </span>
                    <span className="font-mono text-lg sm:text-xl font-black text-teal-950">
                      {checkInModalStudent.studentCode || checkInModalStudent.responseId}
                    </span>
                  </div>

                  {checkInModalStudent.fatherName && (
                    <p className="text-xs text-slate-600 flex items-center space-x-1">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Father: <strong className="text-slate-800 font-semibold">{checkInModalStudent.fatherName}</strong></span>
                    </p>
                  )}

                  <div className="flex items-center space-x-1 text-xs text-teal-800">
                    <Building className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span className="font-bold truncate">
                      {checkInModalStudent.medicalCollegeName || 'Medical College Not Assigned'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Food Preferences & Medical College Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Food Preferences */}
                <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-left">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-900 mb-1">
                    <Utensils className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Food Preferences</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2.5 text-xs text-slate-800 font-semibold">
                    <span className="inline-flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>Veg: <strong className="font-black text-emerald-700">{checkInModalStudent.foodVegCount || 0}</strong></span>
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="inline-flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                      <span>Non-Veg: <strong className="font-black text-orange-700">{checkInModalStudent.foodNonVegCount || 0}</strong></span>
                    </span>
                  </div>
                </div>

                {/* Medical College Location */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-left">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-teal-900 mb-0.5">
                    <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>College Location / State</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 truncate">
                    {[checkInModalStudent.medicalCollegeCity, checkInModalStudent.medicalCollegeState].filter(Boolean).join(', ') || 'Kerala, India'}
                  </p>
                </div>
              </div>

              {/* Contact, Campus & Registration Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-left">
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block flex items-center space-x-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>Mobile</span>
                  </span>
                  <span className="font-semibold text-slate-800 truncate block mt-0.5">
                    {checkInModalStudent.contactNumber || 'N/A'}
                  </span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block flex items-center space-x-1">
                    <GraduationCap className="w-3 h-3 text-slate-400" />
                    <span>Campus</span>
                  </span>
                  <span className="font-semibold text-slate-800 truncate block mt-0.5">
                    {checkInModalStudent.campusLocation || 'Kerala NEET Academy'}
                  </span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Status</span>
                  <span className={`font-black block mt-0.5 ${checkInModalStudent.checkInStatus === 'IN' ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {checkInModalStudent.checkInStatus === 'IN' ? 'CHECKED IN (IN)' : 'PENDING CHECK-IN'}
                  </span>
                </div>
              </div>
            </div>

            {/* DONE BUTTON */}
            <div className="pt-2 border-t border-slate-100 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCheckInModalStudent(null)}
                disabled={isUpdatingStatus}
                className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDoneCheckIn}
                disabled={isUpdatingStatus}
                className="flex-1 py-3.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white font-black text-base rounded-xl shadow-lg transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {isUpdatingStatus ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Updating Status...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Done</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= FULL STUDENT APPLICATION DETAILS MODAL ================= */}
      {selectedAttendeeDetails && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedAttendeeDetails(null);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-xs bg-teal-100 text-teal-800 px-2 py-0.5 rounded border border-teal-300">
                  {selectedAttendeeDetails.studentCode || selectedAttendeeDetails.responseId}
                </span>
                <span className="text-xs font-bold text-slate-600">Attendee Record</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAttendeeDetails(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center space-x-4 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              {selectedAttendeeDetails.photoUrl || (selectedAttendeeDetails as any).photo_url ? (
                <img
                  src={selectedAttendeeDetails.photoUrl || (selectedAttendeeDetails as any).photo_url}
                  alt={selectedAttendeeDetails.studentName}
                  className="w-16 h-20 object-cover rounded-xl border border-slate-300"
                />
              ) : (
                <div className="w-16 h-20 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xl">
                  {selectedAttendeeDetails.studentName?.charAt(0) || 'S'}
                </div>
              )}
              <div>
                <h4 className="text-lg font-bold text-slate-900">
                  {selectedAttendeeDetails.studentName}
                </h4>
                <p className="text-xs text-slate-500">
                  Father: {selectedAttendeeDetails.fatherName || 'N/A'}
                </p>
                <div className="flex items-center space-x-1 text-xs text-teal-700 mt-1">
                  <Building className="w-3.5 h-3.5" />
                  <span className="font-semibold">
                    {selectedAttendeeDetails.medicalCollegeName || 'College not assigned'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Mobile</span>
                <span className="font-semibold text-slate-800">{selectedAttendeeDetails.contactNumber || 'N/A'}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Campus</span>
                <span className="font-semibold text-slate-800">{selectedAttendeeDetails.campusLocation || 'N/A'}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Coat Size</span>
                <span className="font-bold text-slate-800">{selectedAttendeeDetails.coatSize || 'Standard'}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Food Veg / Non-Veg</span>
                <span className="font-semibold text-slate-800">{selectedAttendeeDetails.foodVegCount || 0} Veg / {selectedAttendeeDetails.foodNonVegCount || 0} Non-Veg</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Status</span>
                <span
                  className={`font-bold ${
                    selectedAttendeeDetails.checkInStatus === 'IN' ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {selectedAttendeeDetails.checkInStatus === 'IN' ? 'CHECKED IN (IN)' : 'PENDING (OUT)'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedAttendeeDetails(null)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ================= ALREADY IN POPUP ================= */}
      {alreadyInPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAlreadyInPopup(null);
          }}
        >
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-amber-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-900">Already Checked In</h4>
              <p className="text-xs text-slate-500 mt-1">
                <strong className="text-slate-800">{alreadyInPopup.studentName}</strong> (
                {alreadyInPopup.studentCode}) is already marked IN venue.
              </p>
              {alreadyInPopup.checkInTime && (
                <p className="text-[11px] font-mono text-slate-400 mt-1">
                  Checked in at: {new Date(alreadyInPopup.checkInTime).toLocaleTimeString()}
                </p>
              )}
            </div>
            <button
              onClick={() => setAlreadyInPopup(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Acknowledge & Close
            </button>
          </div>
        </div>
      )}

      {/* ================= STUDENT CHECK-IN INTERFACE PREVIEW MODAL ================= */}
      {showCheckInPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
          <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl bg-white border border-slate-200 animate-in zoom-in-95">
            <CheckInStation
              isEmbeddedModal={true}
              onCloseModal={() => setShowCheckInPreview(false)}
              onBackToHome={() => setShowCheckInPreview(false)}
            />
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
