import React, { useState } from 'react';
import {
  BarChart3,
  Camera,
  Dumbbell,
  LayoutDashboard,
  LogIn,
  LogOut,
  Shield,
  ShieldCheck,
  Trophy,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { AdminConsoleView } from './components/AdminConsoleView';
import { ComplianceSettingsView } from './components/ComplianceSettingsView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FirebaseProvider, useFitness } from './components/FirebaseProvider';
import { GymLeagueView } from './components/GymLeagueView';
import { MandatoryAuthAndOnboarding } from './components/MandatoryAuthAndOnboarding';
import { NutritionScannerView } from './components/NutritionScannerView';
import { OfflineIndicator } from './components/OfflineIndicator';
import { OverviewHub } from './components/OverviewHub';
import { ProgressAnalyticsView } from './components/ProgressAnalyticsView';
import { PWAInstallButton } from './components/PWAInstallButton';
import { WorkoutsView } from './components/WorkoutsView';
import { getCopy } from './lib/i18n';
import { MEDIA_ASSETS } from './lib/mediaAssets';
import type { AppTab, Language } from './types/fitness';

const TAB_BACKDROPS: Record<AppTab, string> = {
  overview: MEDIA_ASSETS.bgObsidianClub,
  workouts: MEDIA_ASSETS.bgPerformanceAthlete,
  nutrition: MEDIA_ASSETS.bgNutritionCulinary,
  progress: MEDIA_ASSETS.bgRecoveryLounge,
  league: MEDIA_ASSETS.bgPerformanceAthlete,
  compliance: MEDIA_ASSETS.bgRecoveryLounge,
  admin: MEDIA_ASSETS.bgObsidianClub,
};

const FitProShell: React.FC = () => {
  const [language, setLanguage] = useState<Language>('ar');
  const [activeTab, setActiveTab] = useState<AppTab>('overview');
  const {
    user,
    emailUnverified,
    authReady,
    profileLoaded,
    needsOnboarding,
    isAdmin,
    profile,
    busyAction,
    errorBanner,
    clearError,
    loginWithGoogle,
    logout,
  } = useFitness();

  const t = getCopy(language);
  const isRtl = language === 'ar';

  if (!authReady || (user && user.emailVerified && !profileLoaded)) {
    return (
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className="min-h-screen bg-[#07060b] text-slate-100 flex items-center justify-center p-6"
      >
        <div className="glass-capsule rounded-full px-7 py-4 flex items-center gap-3 text-sm font-semibold text-white">
          <span className="h-3 w-3 rounded-full bg-amber-400 animate-pulse" />
          <span>{isRtl ? 'جاري تجهيز حسابك في ELARB FitPro Ultra...' : 'Loading your ELARB FitPro Ultra profile...'}</span>
        </div>
      </div>
    );
  }

  if (!user || emailUnverified || needsOnboarding) {
    return <MandatoryAuthAndOnboarding language={language} onChangeLanguage={setLanguage} />;
  }

  const navItems: Array<{ id: AppTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'overview', label: t.nav.overview, icon: LayoutDashboard },
    { id: 'workouts', label: t.nav.workouts, icon: Dumbbell },
    { id: 'nutrition', label: t.nav.nutrition, icon: Camera },
    { id: 'progress', label: t.nav.progress, icon: BarChart3 },
    { id: 'league', label: t.nav.league, icon: Trophy },
    { id: 'compliance', label: t.nav.compliance, icon: ShieldCheck },
    ...(isAdmin ? [{ id: 'admin' as AppTab, label: t.nav.admin, icon: Shield }] : []),
  ];

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="relative min-h-screen bg-[#07060b] text-slate-100 flex flex-col overflow-x-clip">
      {/* Full-Bleed Architectural Luxury Photography Backdrop */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <img
          key={TAB_BACKDROPS[activeTab]}
          src={TAB_BACKDROPS[activeTab]}
          alt=""
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover opacity-45 transition-opacity duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#07060b]/78 via-[#07060b]/60 to-[#07060b]/94" />
        <div
          className="absolute -top-40 left-1/4 h-[520px] w-[520px] rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.45) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 right-1/6 h-[460px] w-[460px] rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.42) 0%, transparent 70%)' }}
        />
      </div>

      {/* Floating Oval Top Glass Bar */}
      <header className="sticky top-0 z-30 pt-2.5 sm:pt-3.5 px-3 sm:px-6 pointer-events-none">
        <div className="pointer-events-auto mx-auto max-w-7xl rounded-full glass-capsule px-3.5 sm:px-5 h-14 lg:h-16 flex items-center justify-between gap-3 lg:gap-6">
          {/* Zone 1: Brand + Active Athlete Name */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className="text-sm sm:text-base font-extrabold tracking-tight text-white font-display whitespace-nowrap shrink-0 hover:text-amber-300 transition-colors px-1.5"
            >
              {t.brand}
            </button>
            {user && (
              <span className="hidden xl:inline text-xs text-slate-300 truncate max-w-[140px]">
                · {profile.displayName}
              </span>
            )}
          </div>

          {/* Zone 2: Animated Oval Page Switcher (Desktop) */}
          <nav
            aria-label="Primary Navigation"
            className="hidden lg:flex items-center gap-1 rounded-full bg-white/[0.04] border border-white/10 p-1"
          >
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`relative min-h-[38px] px-4 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    active ? 'text-slate-950' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="topNavOval"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 shadow-lg shadow-amber-500/25"
                    />
                  )}
                  <span className="relative z-10">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Animated Oval Language Switch + Auth + PWA Install */}
          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton language={language} compact />

            {/* Segmented Oval EN | AR Switch */}
            <div className="flex items-center rounded-full bg-white/[0.05] border border-white/15 p-0.5 shrink-0">
              {(['ar', 'en'] as const).map((code) => {
                const active = language === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLanguage(code)}
                    className={`relative min-h-[34px] px-2.5 rounded-full text-[11px] font-bold transition-colors whitespace-nowrap ${
                      active ? 'text-slate-950' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="langOval"
                        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                        className="absolute inset-0 rounded-full bg-white"
                      />
                    )}
                    <span className="relative z-10">{code === 'ar' ? 'عربي' : 'EN'}</span>
                  </button>
                );
              })}
            </div>

            {user ? (
              <button
                type="button"
                disabled={busyAction === 'auth'}
                onClick={logout}
                className="min-h-[38px] inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 text-xs font-semibold text-white hover:bg-white/15 active:scale-[0.97] transition-all whitespace-nowrap shrink-0"
              >
                <LogOut className="h-3.5 w-3.5 text-rose-300 shrink-0" />
                <span>{t.auth.signOut}</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={busyAction === 'auth'}
                onClick={loginWithGoogle}
                className="min-h-[38px] inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 px-4 text-xs font-bold text-slate-950 hover:opacity-95 active:scale-[0.97] transition-all whitespace-nowrap shrink-0 shadow-md shadow-amber-500/20"
              >
                <LogIn className="h-3.5 w-3.5 shrink-0" />
                <span>{t.auth.signIn}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 pb-28 lg:pb-12 space-y-5">
        {profile.status === 'suspended' && (
          <div className="glass-panel rounded-full border-rose-500/40 px-5 py-3 text-xs text-rose-200">
            {t.auth.suspendedBanner}
          </div>
        )}

        {errorBanner && (
          <div className="glass-panel rounded-full border-rose-500/40 px-5 py-3 flex items-center justify-between gap-3 text-xs text-rose-200">
            <span>{errorBanner}</span>
            <button type="button" onClick={clearError} className="underline shrink-0">
              Dismiss
            </button>
          </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${activeTab}-${language}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            {activeTab === 'overview' && <OverviewHub language={language} onNavigate={setActiveTab} />}
            {activeTab === 'workouts' && <WorkoutsView language={language} />}
            {activeTab === 'nutrition' && <NutritionScannerView language={language} />}
            {activeTab === 'progress' && <ProgressAnalyticsView language={language} />}
            {activeTab === 'league' && <GymLeagueView language={language} />}
            {activeTab === 'compliance' && <ComplianceSettingsView language={language} />}
            {activeTab === 'admin' && <AdminConsoleView language={language} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating Oval Footer Bar (Desktop) */}
      <footer className="relative z-10 hidden lg:block px-6 pb-4">
        <div className="mx-auto max-w-7xl rounded-full glass-capsule px-6 h-14 flex items-center justify-between gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-3">
            <span className="font-bold text-white font-display">ELARB FitPro Ultra</span>
            <span aria-hidden="true">·</span>
            <span>{language === 'ar' ? 'معاك في الجيم والتغذية · جاهز لجوجل بلاي' : 'Google Play Policy Compliant Architecture'}</span>
          </div>
          <div dir="ltr" className="flex items-center gap-4">
            <a
              href="https://wa.me/uncle_elbhiry"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-300 hover:underline font-medium"
            >
              WhatsApp: @uncle_elbhiry
            </a>
            <span aria-hidden="true">·</span>
            <a
              href="https://t.me/elarp_vip"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-300 hover:underline font-medium"
            >
              @elarp_vip
            </a>
          </div>
        </div>
      </footer>

      {/* Floating Oval Glass Bottom Dock (Mobile & Tablet) */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-3 left-0 right-0 z-40 px-3 pb-safe pointer-events-none"
      >
        <div
          className={`pointer-events-auto mx-auto max-w-md rounded-full glass-capsule p-1.5 grid items-center ${
            isAdmin ? 'grid-cols-7' : 'grid-cols-6'
          }`}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`relative min-h-[46px] flex flex-col items-center justify-center gap-0.5 rounded-full px-1 transition-colors ${
                  active ? 'text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="bottomNavOval"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 shadow-lg shadow-amber-500/25"
                  />
                )}
                <Icon className="relative z-10 h-4 w-4 shrink-0" />
                <span className="relative z-10 text-[10px] font-bold truncate max-w-full">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <OfflineIndicator language={language} />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <FirebaseProvider>
        <FitProShell />
      </FirebaseProvider>
    </ErrorBoundary>
  );
}
