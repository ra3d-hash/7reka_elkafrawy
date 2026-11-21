import React, { useState } from 'react';
import {
  AlertTriangle,
  Download,
  ExternalLink,
  FileText,
  Lock,
  MessageCircle,
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
  const isAr = language === 'ar';
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
    <div className="space-y-4">
      {/* Grouped Settings: Medical Notice & Account */}
      <section className="app-list-group divide-y divide-white/[0.07]">
        <div className="p-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className="h-9 w-9 rounded-xl bg-amber-400/15 text-amber-300 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4.5 w-4.5" />
            </span>
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-white">{t.disclaimer.title}</h2>
              <p className="text-xs text-slate-400 leading-relaxed">{t.disclaimer.short}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={acknowledgeDisclaimer}
            className={`min-h-[36px] px-3 rounded-xl text-xs font-bold shrink-0 ${
              profile.disclaimerAccepted
                ? 'bg-amber-400/15 text-amber-300 border border-amber-400/35'
                : 'bg-amber-400 text-slate-950'
            }`}
          >
            {profile.disclaimerAccepted ? t.disclaimer.acknowledged : t.disclaimer.acknowledge}
          </button>
        </div>

        {/* Direct Coach & Developer Support */}
        <a
          href="https://wa.me/uncle_elbhiry"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="h-9 w-9 rounded-xl bg-emerald-400/15 text-emerald-300 flex items-center justify-center shrink-0">
              <MessageCircle className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-sm font-bold text-white">WhatsApp Coach Desk</p>
              <p dir="ltr" className="text-xs text-amber-300 font-mono-tabular text-start">@uncle_elbhiry</p>
            </div>
          </div>
          <ExternalLink className="h-4 w-4 text-slate-400 shrink-0" />
        </a>

        <a
          href="https://t.me/elarp_vip"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="h-9 w-9 rounded-xl bg-sky-400/15 text-sky-300 flex items-center justify-center shrink-0">
              <MessageCircle className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-sm font-bold text-white">Telegram Channel</p>
              <p dir="ltr" className="text-xs text-sky-300 font-mono-tabular text-start">@elarp_vip</p>
            </div>
          </div>
          <ExternalLink className="h-4 w-4 text-slate-400 shrink-0" />
        </a>
      </section>

      {/* Privacy & Terms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="app-card rounded-2xl p-4 sm:p-5 space-y-2.5">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-400 shrink-0" />
            <span>{t.compliance.privacyTitle}</span>
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">{t.compliance.privacyBody}</p>
        </section>

        <section className="app-card rounded-2xl p-4 sm:p-5 space-y-2.5">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <FileText className="h-4 w-4 text-sky-400 shrink-0" />
            <span>{t.compliance.termsTitle}</span>
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">{t.compliance.termsBody}</p>
        </section>
      </div>

      {/* Data Controls Grouped List */}
      <section className="app-list-group divide-y divide-white/[0.07]">
        <div className="px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-amber-400" />
            <span>{t.compliance.dataActionsTitle}</span>
          </h2>
          <span dir="ltr" className="text-[11px] font-mono-tabular text-slate-400">
            {user ? user.uid.slice(0, 12) : 'Guest'}
          </span>
        </div>

        <button
          type="button"
          onClick={exportUserDataJson}
          className="w-full px-4 py-3.5 flex items-center justify-between text-start hover:bg-white/[0.03]"
        >
          <span className="text-xs font-bold text-white flex items-center gap-2.5">
            <Download className="h-4 w-4 text-sky-400" />
            <span>{t.compliance.exportData}</span>
          </span>
          <span className="text-[11px] text-slate-400 font-mono-tabular">.json</span>
        </button>

        <button
          type="button"
          onClick={handleClearCache}
          className="w-full px-4 py-3.5 flex items-center justify-between text-start hover:bg-white/[0.03]"
        >
          <span className="text-xs font-bold text-white flex items-center gap-2.5">
            <Trash2 className="h-4 w-4 text-amber-400" />
            <span>{cacheCleared ? (isAr ? 'تم مسح الكاش' : 'Cleared') : t.compliance.clearLocal}</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full px-4 py-3.5 flex items-center justify-between text-start hover:bg-rose-500/10"
        >
          <span className="text-xs font-bold text-rose-300 flex items-center gap-2.5">
            <Trash2 className="h-4 w-4" />
            <span>{t.compliance.deleteAccount}</span>
          </span>
        </button>
      </section>

      {/* Android & PWA Build Info */}
      <section className="app-card rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-sky-400 shrink-0" />
            <span>{t.compliance.apkTitle}</span>
          </h2>
          <div className="w-36">
            <PWAInstallButton language={language} />
          </div>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">{t.compliance.apkBody}</p>
        <div dir="ltr" className="rounded-xl bg-[#0c0e14] border border-white/[0.06] p-3 font-mono-tabular text-[11px] text-slate-400">
          Package: <span className="text-amber-300 font-bold">com.elarb.fitpro.ultra</span>
        </div>
      </section>

      {/* Delete Confirmation Bottom Sheet */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4">
          <div className="app-sheet w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 space-y-4">
            <div className="mx-auto w-10 h-1 rounded-full bg-white/20 sm:hidden" />
            <h3 className="text-base font-bold text-rose-300">{t.compliance.deleteConfirmTitle}</h3>
            <p className="text-xs text-slate-300 leading-relaxed">{t.compliance.deleteConfirmBody}</p>
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 min-h-[44px] rounded-xl bg-white/[0.08] text-slate-200 text-xs font-bold"
              >
                {t.compliance.cancel}
              </button>
              <button
                type="button"
                disabled={busyAction === 'delete-account'}
                onClick={handleConfirmDelete}
                className="flex-1 min-h-[44px] rounded-xl bg-rose-500 text-white text-xs font-extrabold disabled:opacity-60"
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
