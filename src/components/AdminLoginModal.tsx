import React, { useState, useEffect } from 'react';
import { X, Lock, Mail, AlertTriangle, Loader2, ShieldCheck, LogOut, LayoutDashboard } from 'lucide-react';
import { KNALogo } from './KNALogo.tsx';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: string, user: any) => void;
  onGoToDashboard?: () => void;
  onLogout?: () => void;
  isAuthenticated?: boolean;
  currentUser?: any;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onGoToDashboard,
  onLogout,
  isAuthenticated = false,
  currentUser = null,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset error when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid administrative credentials');
      }

      sessionStorage.setItem('kna_admin_token', data.token);
      sessionStorage.setItem('kna_admin_user', JSON.stringify(data.admin));
      onSuccess(data.token, data.admin);
      setEmail('');
      setPassword('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-modal-title"
    >
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/90 animate-in zoom-in-95 duration-150 space-y-5">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition cursor-pointer"
          title="Close Popup"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {isAuthenticated && currentUser ? (
          /* Already Authenticated State in Popup */
          <div className="text-center space-y-5 pt-2">
            <div className="flex items-center justify-center mx-auto">
              <KNALogo variant="emblem" size="lg" className="drop-shadow-md" />
            </div>

            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200 text-xs font-bold mb-2">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span>
                  {currentUser?.role === 'staff'
                    ? 'Active Staff Member Session'
                    : currentUser?.role === 'food'
                    ? 'Active Food Counter Session'
                    : 'Active Administrator Session'}
                </span>
              </div>
              <h2 id="admin-modal-title" className="text-xl font-extrabold text-slate-900 font-display">
                {currentUser?.name || 'Authorized User'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentUser?.email} • <span className="font-semibold capitalize text-teal-700">{currentUser?.role === 'staff' ? 'Staff Member' : currentUser?.role === 'food' ? 'Food Manager' : currentUser?.role || 'Admin'}</span>
              </p>
            </div>

            <div className="pt-2 space-y-2.5">
              {onGoToDashboard && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onGoToDashboard();
                  }}
                  className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>
                    {currentUser?.role === 'staff'
                      ? 'Open Staff Console'
                      : currentUser?.role === 'food'
                      ? 'Open Food Console'
                      : 'Open Admin Dashboard'}
                  </span>
                </button>
              )}

              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="w-full py-2.5 px-4 bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-700 border border-slate-200 hover:border-red-200 rounded-xl font-semibold text-xs transition flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Unauthenticated Login Form Popup */
          <>
            <div className="text-center space-y-2 pt-1">
              <div className="flex items-center justify-center mx-auto mb-1">
                <KNALogo variant="emblem" size="lg" className="drop-shadow-md" />
              </div>
              <h2 id="admin-modal-title" className="text-2xl font-extrabold text-slate-900 font-display">
                Console Login
              </h2>
              <p className="text-xs text-slate-500">
                Official access portal for academy coordinators & event staff
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
              <div className="space-y-1">
                <label
                  htmlFor="popup-admin-email"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  Official Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="popup-admin-email"
                    type="email"
                    name="admin_email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email"
                    autoComplete="off"
                    required
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="popup-admin-password"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="popup-admin-password"
                    type="password"
                    name="admin_password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    autoComplete="new-password"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white placeholder:text-slate-400"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm shadow-md transition disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <span>Sign In to Console</span>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
