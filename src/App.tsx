/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { LandingHero } from './components/LandingHero.tsx';
import { NonWillingModal } from './components/NonWillingModal.tsx';
import { WillingRegistrationForm } from './components/WillingRegistrationForm.tsx';
import { ComprehensiveRegistrationForm } from './components/ComprehensiveRegistrationForm.tsx';
import { SuccessView } from './components/SuccessView.tsx';
import { AdminPortal } from './components/AdminPortal.tsx';
import { StaffConsole } from './components/StaffConsole.tsx';
import { FoodConsole } from './components/FoodConsole.tsx';
import { AdminLoginModal } from './components/AdminLoginModal.tsx';
import { CheckInStation } from './components/CheckInStation.tsx';
import { RegistrationRecord } from './types.ts';
import { testFirebaseConnection, saveRegistrationToFirestore } from './lib/firebase.ts';

type AppView = 'landing' | 'register-willing' | 'comprehensive-form' | 'success' | 'admin' | 'dashboard' | 'checkin' | 'staff' | 'food';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [isNonWillingModalOpen, setIsNonWillingModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // Admin session state
  const [adminAuthToken, setAdminAuthToken] = useState<string | null>(() =>
    sessionStorage.getItem('kna_admin_token')
  );
  const [adminUser, setAdminUser] = useState<any>(() => {
    const saved = sessionStorage.getItem('kna_admin_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  // Success registration state
  const [successData, setSuccessData] = useState<{
    studentCode: string;
    responseId: string;
    record: RegistrationRecord;
  } | null>(null);

  // Event settings from backend
  const [eventSettings, setEventSettings] = useState<{
    academyName?: string;
    eventName?: string;
    maxFoodCount?: number;
  }>({
    academyName: 'Kerala NEET Academy',
    eventName: 'STETH DAY',
    maxFoodCount: 5,
  });

  // Fetch settings and test Firebase on mount, plus parse QR link params
  useEffect(() => {
    testFirebaseConnection();

    // Check URL params for direct QR scan access or console modes
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const view = params.get('view');
    if (mode === 'checkin' || view === 'checkin' || window.location.hash === '#checkin') {
      setCurrentView('checkin');
    } else if (mode === 'staff' || view === 'staff' || window.location.hash === '#staff') {
      setCurrentView('staff');
    } else if (mode === 'food' || view === 'food' || mode === 'food-scan' || view === 'food-scan' || window.location.hash === '#food' || window.location.hash === '#food-scan') {
      setCurrentView('food');
    } else if (mode === 'dashboard' || view === 'dashboard') {
      setCurrentView('dashboard');
    } else if (mode === 'admin' || view === 'admin') {
      setCurrentView('admin');
    }

    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.academyName) {
          setEventSettings(data);
        }
      })
      .catch((err) => console.error('Failed to load settings', err));
  }, []);

  // Handle Willing registration submission success
  const handleRegistrationSuccess = (data: {
    studentCode: string;
    responseId: string;
    record: any;
  }) => {
    // Sync to Firestore
    if (data.record) {
      saveRegistrationToFirestore(data.record);
    }
    setSuccessData(data);
    setCurrentView('success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col selection:bg-teal-500 selection:text-white">
      {/* Top Header (Only on public landing/form views, hidden in Admin/Staff/Food Console and Check-In Station) */}
      {currentView !== 'admin' && currentView !== 'staff' && currentView !== 'food' && currentView !== 'dashboard' && currentView !== 'checkin' && (
        <Header
          onAdminClick={() => setIsAdminModalOpen(true)}
          onHomeClick={() => {
            setCurrentView('landing');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          isAdminView={false}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-start">
        {/* LANDING VIEW: Focused strictly on registration with NO visible attendance data */}
        {currentView === 'landing' && (
          <LandingHero
            onSelectComprehensive={() => {
              setCurrentView('comprehensive-form');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectWilling={() => {
              setCurrentView('register-willing');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectNonWilling={() => setIsNonWillingModalOpen(true)}
          />
        )}

        {/* DEDICATED REAL-TIME EVENT DASHBOARD (ADMIN ONLY) */}
        {currentView === 'dashboard' && (
          <AdminPortal
            onBackToPortal={() => setCurrentView('landing')}
            onLogout={() => {
              setAdminAuthToken(null);
              setAdminUser(null);
              setCurrentView('landing');
            }}
          />
        )}

        {/* DEDICATED CHECK-IN INTERFACE (ACCESSED VIA QR CODE SCAN OR DASHBOARD) */}
        {currentView === 'checkin' && (
          <CheckInStation
            onBackToDashboard={() => {
              setCurrentView('dashboard');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onBackToHome={() => {
              setCurrentView('landing');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {/* COMPREHENSIVE ACADEMY REGISTRATION FORM */}
        {currentView === 'comprehensive-form' && (
          <ComprehensiveRegistrationForm
            onBack={() => {
              setCurrentView('landing');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSuccess={handleRegistrationSuccess}
          />
        )}

        {/* WILLING MULTI-STEP REGISTRATION FORM */}
        {currentView === 'register-willing' && (
          <WillingRegistrationForm
            onBackToLanding={() => {
              setCurrentView('landing');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSubmitSuccess={handleRegistrationSuccess}
            maxFoodCount={eventSettings.maxFoodCount || 5}
          />
        )}

        {/* SUCCESS CONFIRMATION & PDF PASS VIEW */}
        {currentView === 'success' && successData && (
          <SuccessView
            studentCode={successData.studentCode}
            responseId={successData.responseId}
            record={successData.record}
            onRegisterAnother={() => {
              setSuccessData(null);
              setCurrentView('register-willing');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onHome={() => {
              setSuccessData(null);
              setCurrentView('landing');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {/* ADMIN MANAGEMENT PORTAL */}
        {currentView === 'admin' && (
          <AdminPortal
            onBackToPortal={() => setCurrentView('landing')}
            onLogout={() => {
              setAdminAuthToken(null);
              setAdminUser(null);
              sessionStorage.removeItem('kna_admin_token');
              sessionStorage.removeItem('kna_admin_user');
              setCurrentView('landing');
            }}
          />
        )}

        {/* DEDICATED STAFF CONSOLE (MIRRORS ANALYST VIEW WITHOUT SEQUENCE EVENTS, COLLEGES, REPORTS) */}
        {currentView === 'staff' && (
          <StaffConsole
            onBackToPortal={() => setCurrentView('landing')}
            onLogout={() => {
              setAdminAuthToken(null);
              setAdminUser(null);
              sessionStorage.removeItem('kna_admin_token');
              sessionStorage.removeItem('kna_admin_user');
              setCurrentView('landing');
            }}
            staffUser={adminUser}
          />
        )}

        {/* DEDICATED FOOD & CATERING MANAGEMENT CONSOLE */}
        {currentView === 'food' && (
          <FoodConsole
            onBackToPortal={() => setCurrentView('landing')}
            onLogout={() => {
              setAdminAuthToken(null);
              setAdminUser(null);
              sessionStorage.removeItem('kna_admin_token');
              sessionStorage.removeItem('kna_admin_user');
              setCurrentView('landing');
            }}
            currentUser={adminUser}
          />
        )}
      </main>

      {/* Admin / Staff Login & Session Popup Modal */}
      <AdminLoginModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        isAuthenticated={!!adminAuthToken}
        currentUser={adminUser}
        onSuccess={(token, user) => {
          setAdminAuthToken(token);
          setAdminUser(user);
          if (user?.role === 'staff') {
            setCurrentView('staff');
          } else if (user?.role === 'food') {
            setCurrentView('food');
          } else {
            setCurrentView('admin');
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onGoToDashboard={() => {
          if (adminUser?.role === 'staff') {
            setCurrentView('staff');
          } else if (adminUser?.role === 'food') {
            setCurrentView('food');
          } else {
            setCurrentView('admin');
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onLogout={() => {
          setAdminAuthToken(null);
          setAdminUser(null);
          sessionStorage.removeItem('kna_admin_token');
          sessionStorage.removeItem('kna_admin_user');
          if (currentView === 'admin' || currentView === 'staff' || currentView === 'food') {
            setCurrentView('landing');
          }
        }}
      />

      {/* Non-Willing Confirmation Modal */}
      <NonWillingModal
        isOpen={isNonWillingModalOpen}
        onClose={() => setIsNonWillingModalOpen(false)}
        onSuccess={() => {
          // Keep modal open to show response id
        }}
      />

      {/* Footer Branding (Hidden when in admin view or active form to save mobile viewport space) */}
      {currentView === 'landing' && (
        <footer className="mt-auto py-6 px-4 border-t border-slate-200/80 bg-white text-center text-xs text-slate-500">
          <p className="font-bold text-slate-700">
            {eventSettings.academyName || 'Kerala NEET Academy'} • {eventSettings.eventName || 'STETH DAY'}
          </p>
        </footer>
      )}
    </div>
  );
}
