import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import type { Language } from '../types/fitness';

interface PWAInstallButtonProps {
  language: Language;
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ language, compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-400/15 border border-amber-400/35 text-xs font-bold text-amber-300 hover:bg-amber-400/25 transition-colors whitespace-nowrap shrink-0 ${
          compact ? 'h-8 px-2.5' : 'w-full min-h-[40px] px-3.5'
        }`}
      >
        <Download className="h-3.5 w-3.5 shrink-0" />
        <span>{compact ? (language === 'ar' ? 'تثبيت' : 'Install') : (language === 'ar' ? 'تثبيت التطبيق' : 'Install App')}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.06] text-xs font-semibold text-slate-200 hover:bg-white/10 transition-colors whitespace-nowrap shrink-0 ${
            compact ? 'h-8 px-2.5' : 'w-full min-h-[40px] px-3'
          }`}
        >
          <Smartphone className="h-3.5 w-3.5 text-sky-400 shrink-0" />
          <span>{language === 'ar' ? 'تثبيت' : 'iOS'}</span>
        </button>

        {showGuide && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4">
            <div className="app-sheet w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-6 space-y-4">
              <div className="mx-auto w-10 h-1 rounded-full bg-white/20 sm:hidden" />
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-base font-bold text-white">
                  {language === 'ar' ? 'تثبيت ELARB FitPro Ultra' : 'Install on iPhone / iPad'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowGuide(false)}
                  aria-label="Close"
                  className="h-9 w-9 flex items-center justify-center rounded-xl text-slate-300 hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm leading-relaxed text-slate-300">
                {language === 'ar'
                  ? '1. اضغط على زر المشاركة في متصفح Safari. 2. اختر "إضافة إلى الشاشة الرئيسية" لتشغيل التطبيق بوضع التطبيق الكامل.'
                  : '1. Tap Share in Safari. 2. Choose Add to Home Screen for full-screen native app mode.'}
              </p>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="w-full min-h-[46px] rounded-xl bg-amber-400 text-slate-950 font-bold text-sm"
              >
                {language === 'ar' ? 'فهمت' : 'Got It'}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
