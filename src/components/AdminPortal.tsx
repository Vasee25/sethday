import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  Utensils,
  Shirt,
  Search,
  Download,
  FileSpreadsheet,
  Settings,
  Trash2,
  Edit,
  Eye,
  RefreshCw,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Building,
  Building2,
  MapPin,
  FileText,
  X,
  Plus,
  Upload,
  Image as ImageIcon,
  UserCheck,
  UserX,
  Clock,
  QrCode,
  Check,
  RotateCcw,
  Activity,
  ArrowUpRight,
  Copy,
  Smartphone,
  Maximize2,
  ExternalLink,
  ShieldAlert,
  MoreVertical,
  GraduationCap,
  Phone,
  Mail,
  Calendar,
  User,
} from 'lucide-react';
import QRCode from 'qrcode';
import { DashboardStats, RegistrationRecord, EventSettingsRecord } from '../types.ts';
import { AdminCollegesManager } from './AdminCollegesManager.tsx';
import { KERALA_NEET_CAMPUSES } from '../data/campuses.ts';
import { saveRegistrationToFirestore, subscribeToFirestoreRegistrations } from '../lib/firebase.ts';
import { KNALogo } from './KNALogo.tsx';
import { CheckInStation, EVENT_VENUE_ADDRESS, EVENT_GATE_INFO } from './CheckInStation.tsx';

interface AdminPortalProps {
  onBackToPortal: () => void;
  onLogout?: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onBackToPortal, onLogout }) => {
  // Auth state
  const [authToken, setAuthToken] = useState<string | null>(() => sessionStorage.getItem('kna_admin_token'));
  const [adminUser, setAdminUser] = useState<any>(() => {
    const saved = sessionStorage.getItem('kna_admin_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Dedicated QR Code & Student Check-In Preview States
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [checkInUrl, setCheckInUrl] = useState<string>('');
  const [copiedQrLink, setCopiedQrLink] = useState(false);
  const [showCheckInPreview, setShowCheckInPreview] = useState(false);
  const [alreadyInPopup, setAlreadyInPopup] = useState<{
    studentName: string;
    studentCode?: string;
    checkInTime?: string;
  } | null>(null);

  // Full student application details popup state (opened via three-dot menu)
  const [selectedAttendeeDetails, setSelectedAttendeeDetails] = useState<RegistrationRecord | null>(null);

  // Generate Scannable QR Code pointing to student check-in gateway
  useEffect(() => {
    const origin = window.location.origin || 'https://knastethday.online';
    const targetUrl = `${origin}/?mode=checkin`;
    setCheckInUrl(targetUrl);

    QRCode.toDataURL(targetUrl, {
      width: 360,
      margin: 2,
      color: {
        dark: '#032D2B', // Deep teal
        light: '#FFFFFF',
      },
    })
      .then((dataUri) => setQrCodeDataUrl(dataUri))
      .catch((err) => console.error('Failed to generate admin check-in QR:', err));
  }, []);

  const handleCopyQrLink = () => {
    if (!checkInUrl) return;
    navigator.clipboard.writeText(checkInUrl);
    setCopiedQrLink(true);
    setTimeout(() => setCopiedQrLink(false), 3000);
  };

  const handleDownloadQrStandee = () => {
    if (!qrCodeDataUrl) return;
    const a = document.createElement('a');
    a.href = qrCodeDataUrl;
    a.download = 'STETH-DAY-2026-Gate-CheckIn-QR.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Portal tabs: 'stats' | 'students' | 'colleges' | 'settings'
  const [activeTab, setActiveTab] = useState<'stats' | 'students' | 'colleges' | 'settings'>('stats');

  // Dashboard Data
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Student management state
  const [students, setStudents] = useState<RegistrationRecord[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [willingFilter, setWillingFilter] = useState('ALL');
  const [coatFilter, setCoatFilter] = useState('ALL');
  const [campusFilter, setCampusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Edit / View modal
  const [selectedStudent, setSelectedStudent] = useState<RegistrationRecord | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<RegistrationRecord>>({});
  const [editSaving, setEditSaving] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<EventSettingsRecord | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Quick campus update state
  const [updatingCampusId, setUpdatingCampusId] = useState<number | null>(null);

  // Automatic PDF download state
  const [downloadingPdfCode, setDownloadingPdfCode] = useState<string | null>(null);

  // Photo preview modal state
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; name: string; code?: string } | null>(null);

  // Logo file upload state (KNA.png)
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoSuccess, setLogoSuccess] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoTimestamp, setLogoTimestamp] = useState<number>(Date.now());

  // Attendance & Check-In State for Overview Analytics
  const [attendees, setAttendees] = useState<RegistrationRecord[]>([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [checkingInCode, setCheckingInCode] = useState<string | null>(null);
  const [quickScanInput, setQuickScanInput] = useState('');
  const [quickScanFeedback, setQuickScanFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [attendeeViewMode, setAttendeeViewMode] = useState<'dual' | 'in' | 'out'>('dual');
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(true);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLogoError('Please select a valid image file (PNG, JPG, etc.)');
      return;
    }

    setLogoUploading(true);
    setLogoError(null);
    setLogoSuccess(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const res = await fetch('/api/admin/upload-logo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({ imageBase64: base64, filename: 'KNA.png' }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to upload logo');
        }
        setLogoTimestamp(Date.now());
        setLogoSuccess('Official logo file successfully saved as KNA.png on backend!');
      } catch (err: any) {
        setLogoError(err.message || 'Error uploading logo file');
      } finally {
        setLogoUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Excel & CSV Export handling
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  const handleExportExcel = async () => {
    try {
      setExportingExcel(true);
      const token = authToken || sessionStorage.getItem('kna_admin_token') || '';
      const url = `/api/admin/export/excel?token=${encodeURIComponent(token)}`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Export failed' }));
        throw new Error(errorData.error || `Server returned ${res.status}`);
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `KNA_STETH_DAY_Registrations_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      console.error('Failed to export Excel:', err);
      alert('Error exporting Excel: ' + (err.message || 'Unknown error'));
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      setExportingCsv(true);
      const token = authToken || sessionStorage.getItem('kna_admin_token') || '';
      const url = `/api/admin/export/csv?token=${encodeURIComponent(token)}`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Export failed' }));
        throw new Error(errorData.error || `Server returned ${res.status}`);
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `KNA_STETH_DAY_Registrations_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      console.error('Failed to export CSV:', err);
      alert('Error exporting CSV: ' + (err.message || 'Unknown error'));
    } finally {
      setExportingCsv(false);
    }
  };

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      setAuthToken(data.token);
      setAdminUser(data.admin);
      sessionStorage.setItem('kna_admin_token', data.token);
      sessionStorage.setItem('kna_admin_user', JSON.stringify(data.admin));
    } catch (err: any) {
      setLoginError(err.message || 'Invalid credentials');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setAdminUser(null);
    sessionStorage.removeItem('kna_admin_token');
    sessionStorage.removeItem('kna_admin_user');
    onLogout?.();
  };

  // Load Dashboard Stats
  const loadStats = async () => {
    if (!authToken) return;
    setStatsLoading(true);
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load stats', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Load Students List
  const loadStudents = async () => {
    if (!authToken) return;
    setStudentsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: '15',
        search: searchQuery,
        willingness: willingFilter,
        coatSize: coatFilter,
        ...(campusFilter !== 'ALL' ? { campusLocation: campusFilter } : {}),
      });
      const res = await fetch(`/api/admin/registrations?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setStudents(data.items);
        setTotalPages(data.totalPages);
        setTotalCount(data.total);
      }
    } catch (err) {
      console.error('Failed to load students', err);
    } finally {
      setStudentsLoading(false);
    }
  };

  // Load Settings
  const loadSettings = async () => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    }
  };

  // Load All Willing Attendees for Attendance & Check-In Tracking
  const loadAllAttendees = async () => {
    if (!authToken) return;
    setAttendeesLoading(true);
    try {
      const res = await fetch('/api/admin/registrations?pageSize=100&willingness=WILLING', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setAttendees(data.items || []);
      }
    } catch (err) {
      console.error('Failed to load attendees', err);
    } finally {
      setAttendeesLoading(false);
    }
  };

  // Handle Attendee Check-In Toggle ('IN' <-> 'PENDING' / 'OUT')
  const handleToggleCheckIn = async (identifier: string, targetStatus?: 'IN' | 'OUT' | 'PENDING') => {
    if (!authToken || !identifier) return;
    setCheckingInCode(identifier);
    try {
      const student = attendees.find(
        (a) =>
          (a.studentCode && a.studentCode.toUpperCase() === identifier.toUpperCase()) ||
          (a.responseId && a.responseId.toUpperCase() === identifier.toUpperCase()) ||
          String(a.id) === identifier
      );

      const nextStatus = targetStatus || (student?.checkInStatus === 'IN' ? 'PENDING' : 'IN');

      // Optimistic Local State Update
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

      const res = await fetch('/api/admin/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ identifier, status: nextStatus }),
      });

      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();

        // Check if attendee is already checked in (entry validation)
        if (data.alreadyIn) {
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

        // Sync Firestore
        if (data.record) {
          saveRegistrationToFirestore({
            ...data.record,
            checkInStatus: data.record.checkInStatus,
            checkInTime: data.record.checkInTime,
          });
        }
        loadStats();
      } else {
        loadAllAttendees();
      }
    } catch (err) {
      console.error('Check-in error:', err);
      loadAllAttendees();
    } finally {
      setCheckingInCode(null);
    }
  };

  // Quick Scan / Search Submit Handler
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
        message: `No willing attendee found matching "${query}".`,
      });
      setTimeout(() => setQuickScanFeedback(null), 4000);
      return;
    }

    // Entry validation: If already checked in, trigger "Already In" popup to prevent duplicate entry
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

  useEffect(() => {
    if (authToken) {
      loadStats();
      loadStudents();
      loadSettings();
      loadAllAttendees();
    }
  }, [authToken]);

  // Real-time Firestore Listener for Live Attendee Check-In Updates
  useEffect(() => {
    if (!authToken) return;

    const unsubscribe = subscribeToFirestoreRegistrations((firestoreRegistrations) => {
      if (!firestoreRegistrations || firestoreRegistrations.length === 0) return;

      setIsRealtimeConnected(true);
      setAttendees((prevAttendees) => {
        const statusMap = new Map<string, { status: string; time: string | null }>();
        firestoreRegistrations.forEach((r) => {
          const codeKey = (r.studentCode || r.responseId || '').toUpperCase();
          if (codeKey) {
            statusMap.set(codeKey, {
              status: r.checkInStatus || 'PENDING',
              time: r.checkInTime || null,
            });
          }
        });

        if (statusMap.size === 0) return prevAttendees;

        return prevAttendees.map((att) => {
          const key1 = (att.studentCode || '').toUpperCase();
          const key2 = (att.responseId || '').toUpperCase();
          const fsData = statusMap.get(key1) || statusMap.get(key2);
          if (fsData && fsData.status !== att.checkInStatus) {
            return {
              ...att,
              checkInStatus: fsData.status as any,
              checkInTime: fsData.time,
            };
          }
          return att;
        });
      });
    });

    return () => {
      unsubscribe();
    };
  }, [authToken]);

  useEffect(() => {
    if (authToken && activeTab === 'students') {
      loadStudents();
    }
  }, [page, willingFilter, coatFilter, campusFilter]);

  // Handle Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (authToken && activeTab === 'students') {
        setPage(1);
        loadStudents();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Quick assign or update Campus Branch directly from table
  const handleQuickCampusChange = async (studentId: number, newCampus: string) => {
    if (!authToken) return;
    setUpdatingCampusId(studentId);

    // Optimistic UI update
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, campusLocation: newCampus } : s))
    );

    try {
      const res = await fetch(`/api/admin/registrations/${studentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ campusLocation: newCampus }),
      });

      if (res.ok) {
        const updated = await res.json();
        if (updated) {
          saveRegistrationToFirestore(updated);
        }
        loadStats();
      } else {
        loadStudents();
      }
    } catch (err) {
      console.error('Failed to quick-update campus:', err);
      loadStudents();
    } finally {
      setUpdatingCampusId(null);
    }
  };

  // Automatic PDF download handler
  const handleDownloadStudentPdf = async (e: React.MouseEvent, student: RegistrationRecord) => {
    e.preventDefault();
    const identifier = student.studentCode || student.responseId;
    if (!identifier) return;

    setDownloadingPdfCode(identifier);
    try {
      const downloadUrl = `/api/registration/${encodeURIComponent(identifier)}/pdf?download=true`;
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${identifier}_STETH_DAY_Registration.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Automatic PDF download error:', err);
      window.open(`/api/registration/${encodeURIComponent(identifier)}/pdf?download=true`, '_blank');
    } finally {
      setDownloadingPdfCode(null);
    }
  };

  // Save Student Edit
  const handleSaveEdit = async () => {
    if (!selectedStudent || !authToken) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/admin/registrations/${selectedStudent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(editFormData),
      });
      if (res.ok) {
        const updated = await res.json();
        if (updated) {
          saveRegistrationToFirestore(updated);
        }
        setIsEditing(false);
        setSelectedStudent(null);
        loadStudents();
        loadStats();
      }
    } catch (err) {
      console.error('Failed to save student', err);
    } finally {
      setEditSaving(false);
    }
  };

  // Delete Student
  const handleDelete = async (id: number) => {
    if (!authToken) return;
    try {
      const res = await fetch(`/api/admin/registrations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        setDeleteId(null);
        loadStudents();
        loadStats();
      }
    } catch (err) {
      console.error('Failed to delete student', err);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken || !settings) return;
    setSettingsSaving(true);
    setSettingsSuccess(false);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
        setSettingsSuccess(true);
        setTimeout(() => setSettingsSuccess(false), 3000);
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error('Failed to update settings:', errData);
      }
    } catch (err) {
      console.error('Failed to save settings', err);
    } finally {
      setSettingsSaving(false);
    }
  };

  // If Not Authenticated, show Admin Login View
  if (!authToken) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-8 space-y-6">
        <button
          onClick={onBackToPortal}
          className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center space-x-1"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Registration Portal</span>
        </button>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center mx-auto mb-1">
              <KNALogo key={logoTimestamp} variant="emblem" size="xl" className="drop-shadow-lg" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 font-display">
              Admin Login
            </h2>
          </div>

          <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
            <div className="space-y-1">
              <label htmlFor="admin-login-email" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Official Email
              </label>
              <input
                id="admin-login-email"
                type="email"
                name="admin_email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="Enter official email"
                autoComplete="off"
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="admin-login-password" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Password
              </label>
              <input
                id="admin-login-password"
                type="password"
                name="admin_password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="new-password"
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white placeholder:text-slate-400"
              />
            </div>

            {loginError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm shadow-md transition disabled:opacity-50"
            >
              {loginLoading ? 'Authenticating...' : 'Sign In to Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Authenticated Admin Console
  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 space-y-6 pb-24">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight font-display">
              STETH DAY 2026 — Admin Command
            </h2>
            <p className="text-xs text-slate-500">
              Logged in as <span className="font-semibold text-teal-700">{adminUser?.name || 'Administrator'}</span> ({adminUser?.role})
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onBackToPortal}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
          >
            Public View
          </button>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg transition flex items-center space-x-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex border-b border-slate-200 space-x-2 overflow-x-auto text-xs font-bold">
        {[
          { id: 'stats', label: 'Overview Analytics', icon: Users },
          { id: 'students', label: `Student Records (${totalCount || 0})`, icon: FileText },
          { id: 'colleges', label: 'Medical Colleges', icon: Building2 },
          { id: 'settings', label: 'Sequence & Event Settings', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 px-3 flex items-center space-x-2 border-b-2 transition whitespace-nowrap ${
                isActive
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: DASHBOARD STATS & REAL-TIME ATTENDANCE */}
      {activeTab === 'stats' && (() => {
        // Computed Attendance Metrics from Real-Time Attendees
        const filteredAttendees = attendees.filter((a) => {
          if (!attendeeSearch.trim()) return true;
          const q = attendeeSearch.toLowerCase();
          return (
            (a.studentCode && a.studentCode.toLowerCase().includes(q)) ||
            a.studentName.toLowerCase().includes(q) ||
            (a.medicalCollegeName && a.medicalCollegeName.toLowerCase().includes(q)) ||
            (a.campusLocation && a.campusLocation.toLowerCase().includes(q)) ||
            (a.contactNumber && a.contactNumber.includes(q))
          );
        });

        const checkedInList = filteredAttendees.filter((a) => a.checkInStatus === 'IN');
        const pendingList = filteredAttendees.filter((a) => a.checkInStatus !== 'IN');

        const totalCheckedIn = attendees.filter((a) => a.checkInStatus === 'IN').length;
        const totalPending = attendees.filter((a) => a.checkInStatus !== 'IN').length;
        const totalWillingAttendees = attendees.length || stats?.totalWilling || 0;
        const attendanceRate = totalWillingAttendees > 0
          ? Math.round((totalCheckedIn / totalWillingAttendees) * 100)
          : 0;

        return (
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
                  <a
                    href="#admin-gate-qr-footer"
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
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
                    title="Refresh attendance and stats"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${(attendeesLoading || statsLoading) ? 'animate-spin' : ''}`} />
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
                  <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={attendeeSearch}
                      onChange={(e) => setAttendeeSearch(e.target.value)}
                      placeholder="Filter attendees..."
                      className="w-full h-8 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                    />
                  </div>

                  {/* View Mode Toggle */}
                  <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs font-semibold">
                    <button
                      onClick={() => setAttendeeViewMode('dual')}
                      className={`px-2.5 py-1 rounded-md transition ${
                        attendeeViewMode === 'dual'
                          ? 'bg-white text-slate-900 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Dual View
                    </button>
                    <button
                      onClick={() => setAttendeeViewMode('in')}
                      className={`px-2.5 py-1 rounded-md transition flex items-center space-x-1 ${
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
                      className={`px-2.5 py-1 rounded-md transition flex items-center space-x-1 ${
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
                  attendeeViewMode === 'dual'
                    ? 'grid-cols-1 lg:grid-cols-2'
                    : 'grid-cols-1'
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
                            Use the quick scan input above or click "Check In" in the pending list when delegates arrive at the reception desk.
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
                                    {new Date(st.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}

                                {/* Refresh / Undo Check-In Button */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleToggleCheckIn(st.studentCode || st.responseId || String(st.id), 'PENDING')
                                  }
                                  disabled={isChecking}
                                  className="px-2.5 py-1 rounded-lg border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-500 hover:text-red-700 text-[11px] font-semibold transition active:scale-95 flex items-center space-x-1 cursor-pointer"
                                  title="Mark attendee as Out / Pending"
                                >
                                  {isChecking ? (
                                    <RefreshCw className="w-3 h-3 animate-spin text-slate-500" />
                                  ) : (
                                    <RotateCcw className="w-3 h-3" />
                                  )}
                                  <span className="hidden sm:inline">Undo</span>
                                </button>

                                {/* Three-Dot Menu Button to Open Full Application Details */}
                                <button
                                  type="button"
                                  onClick={() => setSelectedAttendeeDetails(st)}
                                  className="p-1.5 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50 text-slate-600 hover:text-teal-700 transition active:scale-95 flex items-center justify-center cursor-pointer shadow-2xs"
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
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleToggleCheckIn(st.studentCode || st.responseId || String(st.id), 'IN')
                                  }
                                  disabled={isChecking}
                                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-xs transition flex items-center space-x-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
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

            {/* SECTION 3: EXPANDABLE STATS & BREAKDOWNS */}
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
          </div>
        );
      })()}

      {/* TAB 2: STUDENT MANAGEMENT */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          {/* Filter / Search Bar */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none z-10" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student code (KNA001), name, contact, college..."
                className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white leading-normal"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-500 font-semibold text-xs">Status:</span>
                <select
                  value={willingFilter}
                  onChange={(e) => setWillingFilter(e.target.value)}
                  className="h-8 px-2.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-xs text-slate-700 leading-normal focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="ALL">All Responses</option>
                  <option value="WILLING">Willing Only</option>
                  <option value="NON_WILLING">Non-Willing</option>
                </select>
              </div>

              <div className="flex items-center space-x-1.5">
                <span className="text-slate-500 font-semibold text-xs">Coat Size:</span>
                <select
                  value={coatFilter}
                  onChange={(e) => setCoatFilter(e.target.value)}
                  className="h-8 px-2.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-xs text-slate-700 leading-normal focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="ALL">All Sizes</option>
                  {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-1.5">
                <span className="text-slate-500 font-semibold text-xs">Campus:</span>
                <select
                  value={campusFilter}
                  onChange={(e) => setCampusFilter(e.target.value)}
                  className="h-8 px-2.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-xs text-slate-700 max-w-[210px] leading-normal focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="ALL">All Campuses ({KERALA_NEET_CAMPUSES.length})</option>
                  <optgroup label="Tirunelveli Hub">
                    {KERALA_NEET_CAMPUSES.filter((c) => c.city === 'Tirunelveli').map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Regional Branches & Online">
                    {KERALA_NEET_CAMPUSES.filter((c) => c.city !== 'Tirunelveli').map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.city.includes('Online') ? c.name : `${c.city} - ${c.name}`}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="ml-auto">
                <button
                  onClick={() => loadStudents()}
                  className="h-8 w-8 flex items-center justify-center hover:bg-slate-100 rounded-lg text-slate-500 transition"
                  title="Refresh records"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Student Records List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-3.5 py-3 whitespace-nowrap">Code / ID</th>
                    <th className="px-3.5 py-3 min-w-[150px]">Student</th>
                    <th className="px-3.5 py-3 whitespace-nowrap">Contact</th>
                    <th className="px-3.5 py-3 whitespace-nowrap">Campus Branch</th>
                    <th className="px-3.5 py-3 whitespace-nowrap">College</th>
                    <th className="px-2.5 py-3 text-center whitespace-nowrap">Coat</th>
                    <th className="px-2.5 py-3 text-center whitespace-nowrap">Meals</th>
                    <th className="px-3.5 py-3 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentsLoading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400">
                        Loading student records...
                      </td>
                    </tr>
                  ) : students.length > 0 ? (
                    students.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-3.5 py-2.5 font-mono font-bold whitespace-nowrap">
                          {st.studentCode ? (
                            <span className="text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                              {st.studentCode}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">
                              {st.responseId}
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 min-w-[150px]">
                          <div className="flex items-center space-x-2.5">
                            {(() => {
                              const photoSrc = st.photoUrl || (st as any).photo_url;
                              return photoSrc ? (
                                <img
                                  src={photoSrc}
                                  alt={st.studentName}
                                  className="w-8 h-10 object-cover rounded-md border border-slate-200 shadow-2xs flex-shrink-0 cursor-pointer hover:opacity-85 transition hover:ring-2 hover:ring-teal-500/50"
                                  title="Click to view full student photo"
                                  onClick={() =>
                                    setPreviewPhoto({
                                      url: photoSrc,
                                      name: st.studentName,
                                      code: st.studentCode || st.responseId,
                                    })
                                  }
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-8 h-10 rounded-md bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 font-bold text-xs flex-shrink-0">
                                  {st.studentName ? st.studentName.charAt(0).toUpperCase() : 'S'}
                                </div>
                              );
                            })()}
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate">{st.studentName}</p>
                              {st.fatherName && (
                                <p className="text-[11px] text-slate-400 truncate">S/o {st.fatherName}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-600 whitespace-nowrap">
                          <p className="font-mono">{st.contactNumber}</p>
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-700 max-w-[180px] truncate" id={`td-campus-${st.id}`}>
                          {st.campusLocation ? (
                            <span className="text-slate-800 font-medium">
                              {st.campusLocation}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-700 max-w-[170px] truncate">
                          {st.medicalCollegeName || '—'}
                        </td>
                        <td className="px-2.5 py-2.5 text-center">
                          {st.coatSize ? (
                            <span className="font-bold text-slate-800">{st.coatSize}</span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-2.5 py-2.5 text-center text-slate-700 whitespace-nowrap">
                          {st.foodVegCount || st.foodNonVegCount ? (
                            <span>{st.foodVegCount}V / {st.foodNonVegCount}NV</span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1.5">
                            {(st.studentCode || st.responseId) && (
                              <a
                                id={`download-pdf-btn-${st.id}`}
                                href={`/api/registration/${encodeURIComponent(st.studentCode || st.responseId)}/pdf?download=true`}
                                download={`${st.studentCode || st.responseId}_STETH_DAY_Registration.pdf`}
                                onClick={(e) => handleDownloadStudentPdf(e, st)}
                                className={`inline-flex items-center justify-center p-1.5 rounded-lg border transition-all shadow-2xs ${
                                  downloadingPdfCode === (st.studentCode || st.responseId)
                                    ? 'bg-teal-100 text-teal-700 border-teal-300 pointer-events-none'
                                    : 'bg-teal-50/80 hover:bg-teal-100 text-teal-700 hover:text-teal-900 border-teal-200/80 hover:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20 active:scale-95'
                                }`}
                                title={`Automatic PDF Download: ${st.studentCode || st.responseId}`}
                                aria-label={`Automatic download registration PDF for ${st.studentName}`}
                              >
                                {downloadingPdfCode === (st.studentCode || st.responseId) ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-600" />
                                ) : (
                                  <Download className="w-3.5 h-3.5" />
                                )}
                              </a>
                            )}
                            <button
                              onClick={() => {
                                setSelectedStudent(st);
                                setEditFormData(st);
                                setIsEditing(true);
                              }}
                              className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg"
                              title="Edit Student"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteId(st.id)}
                              className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">
                        No student registrations match the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Page {page} of {totalPages} ({totalCount} total)
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SETTINGS */}
      {activeTab === 'settings' && settings && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs max-w-2xl space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-lg font-bold text-slate-900 font-display">
              Event Sequence & PDF Settings
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure automatic sequential student code generation and branding.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Code Prefix
                </label>
                <input
                  type="text"
                  value={settings.codePrefix}
                  onChange={(e) => setSettings({ ...settings, codePrefix: e.target.value })}
                  placeholder="KNA"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Next Sequence Number
                </label>
                <input
                  type="number"
                  value={settings.nextCodeNumber}
                  onChange={(e) => setSettings({ ...settings, nextCodeNumber: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Code Digits Padding
                </label>
                <input
                  type="number"
                  min={2}
                  max={6}
                  value={settings.codeDigits}
                  onChange={(e) => setSettings({ ...settings, codeDigits: parseInt(e.target.value) || 3 })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono"
                />
              </div>
            </div>

            <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-800">
              Next Generated Student Code will be:{' '}
              <strong className="font-mono text-sm">
                {settings.codePrefix}
                {String(settings.nextCodeNumber).padStart(settings.codeDigits, '0')}
              </strong>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Academy Name
              </label>
              <input
                type="text"
                value={settings.academyName}
                onChange={(e) => setSettings({ ...settings, academyName: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Event Name
              </label>
              <input
                type="text"
                value={settings.eventName}
                onChange={(e) => setSettings({ ...settings, eventName: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Max Food Token Count Per Student
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={settings.maxFoodCount}
                onChange={(e) => setSettings({ ...settings, maxFoodCount: parseInt(e.target.value) || 5 })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                PDF Footer Note
              </label>
              <input
                type="text"
                value={settings.pdfFooter}
                onChange={(e) => setSettings({ ...settings, pdfFooter: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            {settingsSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl border border-emerald-200 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Event settings updated successfully!</span>
              </div>
            )}

            <button
              type="submit"
              disabled={settingsSaving}
              className="py-3 px-6 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs shadow-md transition disabled:opacity-50"
            >
              {settingsSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </form>

          {/* Official Logo Manager Card */}
          <div className="mt-8 pt-6 border-t border-slate-100 space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 font-display flex items-center space-x-2">
                <ImageIcon className="w-4 h-4 text-teal-600" />
                <span>Official Academy Logo (KNA.png)</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload or replace the high-resolution official logo image used across headers, registration passes, and login screens.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="w-20 h-20 bg-white border border-slate-200 rounded-xl p-2 flex items-center justify-center shadow-xs flex-shrink-0">
                <img
                  src={`/KNA.png?t=${logoTimestamp}`}
                  alt="Kerala NEET Academy Official Logo"
                  className="max-h-full max-w-full object-contain select-none"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/kna_logo_.png';
                  }}
                />
              </div>

              <div className="flex-1 text-center sm:text-left space-y-2">
                <div className="text-xs font-semibold text-slate-700">
                  Backend Filename: <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">public/KNA.png</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center space-x-2 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 shadow-xs cursor-pointer transition">
                    <Upload className="w-3.5 h-3.5 text-teal-600" />
                    <span>{logoUploading ? 'Uploading to backend...' : 'Upload New Logo (KNA.png)'}</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleLogoUpload}
                      disabled={logoUploading}
                      className="hidden"
                    />
                  </label>
                  {logoUploading && (
                    <span className="text-xs text-teal-600 font-medium animate-pulse">Saving file...</span>
                  )}
                </div>
              </div>
            </div>

            {logoSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl border border-emerald-200 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{logoSuccess}</span>
              </div>
            )}

            {logoError && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{logoError}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: MEDICAL COLLEGES DIRECTORY */}
      {activeTab === 'colleges' && authToken && (
        <AdminCollegesManager authToken={authToken} />
      )}

      {/* ========================================================================= */}
      {/* DEDICATED SCANNABLE QR CODE & STUDENT CHECK-IN INTERFACE FOOTER */}
      {/* Positioned at the very bottom / footer of the Admin Console page */}
      {/* ========================================================================= */}
      <footer id="admin-gate-qr-footer" className="mt-8 pt-6 border-t border-slate-200">
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

                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
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

          {/* Quick Coordinator Check-In Bar */}
          <div className="mt-4 pt-3.5 border-t border-white/10">
            <form onSubmit={handleQuickScanSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
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

      {/* Edit Student Modal */}
      {isEditing && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 font-display">
                Edit Student Details
              </h3>
              <button
                onClick={() => setIsEditing(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Student Name</label>
                <input
                  type="text"
                  value={editFormData.studentName || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, studentName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Father's Name</label>
                <input
                  type="text"
                  value={editFormData.fatherName || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, fatherName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Contact Number</label>
                <input
                  type="text"
                  value={editFormData.contactNumber || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, contactNumber: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Campus Branch</label>
                <select
                  value={editFormData.campusLocation || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, campusLocation: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                >
                  <option value="">No Campus Assigned</option>
                  <optgroup label="Tirunelveli Hub">
                    {KERALA_NEET_CAMPUSES.filter((c) => c.city === 'Tirunelveli').map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Regional Branches & Online">
                    {KERALA_NEET_CAMPUSES.filter((c) => c.city !== 'Tirunelveli').map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.city.includes('Online') ? c.name : `${c.city} - ${c.name}`}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Medical College</label>
                <input
                  type="text"
                  value={editFormData.medicalCollegeName || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, medicalCollegeName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Coat Size</label>
                  <select
                    value={editFormData.coatSize || 'M'}
                    onChange={(e) => setEditFormData({ ...editFormData, coatSize: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-xl"
                  >
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">NTA Score</label>
                  <input
                    type="number"
                    min={0}
                    max={720}
                    placeholder="e.g. 620"
                    value={editFormData.ntaScore !== undefined && editFormData.ntaScore !== null ? editFormData.ntaScore : ''}
                    onChange={(e) => setEditFormData({ ...editFormData, ntaScore: e.target.value === '' ? undefined : parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={editSaving}
                className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs shadow-xs"
              >
                {editSaving ? 'Saving Changes...' : 'Save Updates'}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs cursor-pointer animate-in fade-in"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="bg-white rounded-2xl p-4 max-w-sm w-full shadow-2xl border border-slate-200 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{previewPhoto.name}</h4>
                {previewPhoto.code && <p className="text-xs text-teal-600 font-mono font-bold">{previewPhoto.code}</p>}
              </div>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-3 flex justify-center bg-slate-50 p-2 rounded-xl border border-slate-200/80">
              <img
                src={previewPhoto.url}
                alt={previewPhoto.name}
                className="max-h-[350px] w-auto object-contain rounded-lg shadow-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900">Delete Registration?</h4>
            <p className="text-xs text-slate-600">
              Are you sure you want to permanently remove this registration record? This action cannot be undone.
            </p>
            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Student Check-In Interface Preview Modal */}
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
      {/* "Already In" Duplicate Entry Prevention Popup Modal in Admin Console */}
      {alreadyInPopup && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-already-in-title"
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
                id="admin-already-in-title"
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

      {/* Student Application Details Popup Modal (Opened via Three-Dot Menu) */}
      {selectedAttendeeDetails && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="student-application-title"
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
                  <h3 id="student-application-title" className="text-lg sm:text-xl font-black text-white font-display mt-0.5">
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
