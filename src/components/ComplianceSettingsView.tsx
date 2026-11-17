import React, { useState } from 'react';
import {
  AlertTriangle,
  Download,
  ExternalLink,
  FileText,
  Lock,
  ShieldCheck,
  Smartphone,
  Trash2,
} from 'lucide-react';
import { getCopy } from '../lib/i18n';
import { useFitness } from './FirebaseProvider';
import { PWAInstallButton } from './PWAInstallButton';
import type { Language } from '../types/fitness';

export const ComplianceSettingsView: React.FC<{ language: Language }> = ({ language }) => {
  const t = getCopy(language);
  const {
    user,
    profile,
    busyAction,
    acknowledgeDisclaimer,
    exportUserDataJson,
    clearLocalCache,
    deleteCloudAccountData,
  } = useFitness();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);

  const handleClearCache = () => {
    clearLocalCache();
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2500);
  };

  const handleConfirmDelete = async () => {
    await deleteCloudAccountData();
    setShowDeleteConfirm(false);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-white">{t.compliance.title}</h1>
        <p className="text-sm text-slate-400">{t.compliance.subtitle}</p>
      </div>

      {/* Medical & Fitness Disclaimer Card */}
      <section className="glass-panel-elevated rounded-2xl p-6 space-y-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-base font-bold text-amber-300 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>{t.disclaimer.title}</span>
          </h2>
          <button
            type="button"
            onClick={acknowledgeDisclaimer}
            className="min-h-[40px] rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/20"
          >
            {profile.disclaimerAccepted ? t.disclaimer.acknowledged : t.disclaimer.acknowledge}
          </button>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{t.disclaimer.short}</p>
      </section>

      {/* Privacy Policy & Terms of Service */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="glass-panel rounded-2xl p-6 space-y-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-300 shrink-0" />
            <span>{t.compliance.privacyTitle}</span>
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">{t.compliance.privacyBody}</p>
          <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-400 space-y-1">
            <p>
              <strong className="text-slate-200">Camera Permission:</strong> On-demand meal capture only. Zero background recording.
            </p>
            <p>
              <strong className="text-slate-200">Encryption:</strong> TLS 1.3 in transit · Firebase Firestore tenant isolation.
            </p>
          </div>
        </section>

        <section className="glass-panel rounded-2xl p-6 space-y-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="h-4 w-4 text-sky-300 shrink-0" />
            <span>{t.compliance.termsTitle}</span>
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">{t.compliance.termsBody}</p>
          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-4 text-xs">
            <a
              href="https://wa.me/uncle_elbhiry"
              target="_blank"
              rel="noopener noreferrer"
              dir="ltr"
              className="inline-flex items-center gap-1 text-amber-300 hover:underline"
            >
              <span>WA: @uncle_elbhiry</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <a
              href="https://t.me/elarp_vip"
              target="_blank"
              rel="noopener noreferrer"
              dir="ltr"
              className="inline-flex items-center gap-1 text-sky-300 hover:underline"
            >
              <span>@elarp_vip</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </section>
      </div>

      {/* Data Safety & Account Deletion Controls */}
      <section className="glass-panel rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-300 shrink-0" />
            <span>{t.compliance.dataActionsTitle}</span>
          </h2>
          <span className="text-xs font-mono-tabular text-slate-400">
            {user ? `UID: ${user.uid.slice(0, 12)}...` : 'Sign-In Required'}
          </span>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={exportUserDataJson}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-2 text-xs font-semibold text-white hover:bg-white/15 transition-colors"
          >
            <Download className="h-4 w-4 text-sky-300 shrink-0" />
            <span>{t.compliance.exportData}</span>
          </button>

          <button
            type="button"
            onClick={handleClearCache}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-2 text-xs font-semibold text-white hover:bg-white/15 transition-colors"
          >
            <Trash2 className="h-4 w-4 text-amber-300 shrink-0" />
            <span>{cacheCleared ? (language === 'ar' ? 'تم المسح' : 'Local Cache Cleared') : t.compliance.clearLocal}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/15 px-5 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/25 transition-colors"
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            <span>{t.compliance.deleteAccount}</span>
          </button>
        </div>
      </section>

      {/* Android APK & TWA Readiness */}
      <section className="glass-panel rounded-[28px] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-sky-300 shrink-0" />
            <span>{t.compliance.apkTitle}</span>
          </h2>
          <PWAInstallButton language={language} />
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{t.compliance.apkBody}</p>
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4 font-mono-tabular text-xs text-slate-300 space-y-1.5 overflow-x-auto">
          <p className="text-amber-300">Android Package ID: com.elarb.fitpro.ultra</p>
          <p>1. npm run build</p>
          <p>2. npx cap add android && npx cap sync android (Capacitor APK/AAB)</p>
          <p>3. Or Bubblewrap TWA: bubblewrap init --manifest https://your-domain/manifest.webmanifest && bubblewrap build</p>
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="glass-panel-elevated w-full max-w-md rounded-[28px] p-6 space-y-4 border border-rose-500/40">
            <h3 className="text-lg font-bold text-rose-300">{t.compliance.deleteConfirmTitle}</h3>
            <p className="text-sm text-slate-300 leading-relaxed">{t.compliance.deleteConfirmBody}</p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 min-h-[44px] rounded-full border border-white/15 text-slate-200 text-sm font-semibold hover:bg-white/10"
              >
                {t.compliance.cancel}
              </button>
              <button
                type="button"
                disabled={busyAction === 'delete-account'}
                onClick={handleConfirmDelete}
                className="flex-1 min-h-[44px] rounded-full bg-rose-500 text-white text-sm font-semibold hover:bg-rose-400 disabled:opacity-60"
              >
                {t.compliance.confirmDeleteBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
