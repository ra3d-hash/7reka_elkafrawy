import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import type { Language } from '../types/fitness';

export const OfflineIndicator: React.FC<{ language: Language }> = ({ language }) => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-5 left-4 z-50 flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-950/90 px-3.5 py-2 text-xs font-medium text-amber-200 backdrop-blur-md shadow-lg">
      <WifiOff className="h-4 w-4 text-amber-400 shrink-0" />
      <span>
        {language === 'ar'
          ? 'وضع عدم الاتصال — يتم استخدام البيانات المخزنة مؤقتاً'
          : 'Offline Mode — Cached local workspace active'}
      </span>
    </div>
  );
};
