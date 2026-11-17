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
        className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-full bg-amber-400/20 border border-amber-400/40 px-3.5 text-xs font-semibold text-amber-200 hover:bg-amber-400/30 transition-colors whitespace-nowrap shrink-0"
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
          className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 text-xs font-semibold text-slate-100 hover:bg-white/15 transition-colors whitespace-nowrap shrink-0"
        >
          <Smartphone className="h-3.5 w-3.5 text-sky-300 shrink-0" />
          <span>{language === 'ar' ? 'تثبيت iOS' : 'iOS'}</span>
        </button>

        {showGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="glass-panel-elevated w-full max-w-sm rounded-[28px] p-6 shadow-2xl">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-white">
                  {language === 'ar' ? 'تثبيت ELARB FitPro Ultra' : 'Install on iPhone / iPad'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowGuide(false)}
                  aria-label="Close"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-slate-300 hover:text-white hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                {language === 'ar'
                  ? '1. اضغط على زر المشاركة في متصفح Safari. 2. اختر "إضافة إلى الشاشة الرئيسية" لتشغيل التطبيق بوضع ملء الشاشة.'
                  : '1. Tap the Share button in Safari toolbar. 2. Scroll down and select Add to Home Screen for standalone native mode.'}
              </p>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="mt-5 w-full min-h-[44px] rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 text-slate-950 font-bold text-sm hover:opacity-95 transition-all"
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
