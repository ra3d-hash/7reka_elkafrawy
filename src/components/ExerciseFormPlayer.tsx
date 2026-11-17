/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Maximize2,
  Video,
  X,
} from 'lucide-react';
import type { Language, MotionPattern } from '../types/fitness';

export interface FormDemoPayload {
  id: string;
  name: string;
  nameAr: string;
  muscleGroup: string;
  equipment?: string;
  instructions: string;
  instructionsAr?: string;
  mistakes?: string;
  mistakesAr?: string;
  motionPattern?: MotionPattern;
}

interface ExerciseFormPlayerProps {
  exercise: FormDemoPayload;
  language: Language;
  compact?: boolean;
  onExpandModal?: () => void;
}

export const ExerciseFormPlayer: React.FC<ExerciseFormPlayerProps> = ({
  exercise,
  language,
  compact = false,
  onExpandModal,
}) => {
  const isAr = language === 'ar';

  const ytQuery = encodeURIComponent(`${exercise.name} proper form exercise tutorial`);
  const ytEmbedUrl = `https://www.youtube-nocookie.com/embed?listType=search&list=${ytQuery}&autoplay=0`;
  const ytSearchUrl = `https://www.youtube.com/results?search_query=${ytQuery}`;

  return (
    <div className="space-y-3.5">
      {/* Real YouTube / Web Exercise Video Tutorial Embed */}
      <div className="relative overflow-hidden rounded-[22px] border border-amber-400/35 bg-[#07060b] shadow-2xl aspect-[16/9]">
        <iframe
          src={ytEmbedUrl}
          title={exercise.name}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />

        {/* Top HUD Overlays */}
        <div className="absolute top-2.5 inset-x-3 flex items-center justify-between gap-2 pointer-events-none">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/75 backdrop-blur-md border border-amber-400/40 px-3.5 py-1 text-[11px] font-bold text-amber-300">
            <Video className="h-3.5 w-3.5 shrink-0" />
            <span>{isAr ? 'فيديو توضيحي حقيقي من الإنترنت' : 'Real Web Video Tutorial'}</span>
          </span>

          <span className="rounded-full bg-black/75 backdrop-blur-md border border-white/15 px-3.5 py-1 text-[11px] font-semibold text-sky-300">
            {exercise.muscleGroup}
          </span>
        </div>

        {onExpandModal && (
          <button
            type="button"
            onClick={onExpandModal}
            aria-label="Expand video modal"
            className="absolute bottom-3 right-3 h-9 w-9 flex items-center justify-center rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-white hover:bg-black transition-colors"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Proper Form Checklist + Common Mistakes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
        <div className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-3.5 space-y-1">
          <p className="font-bold text-amber-300 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>{isAr ? 'طريقة اللعب الصحيحة' : 'Proper Form Execution'}</span>
          </p>
          <p className="text-slate-200 leading-relaxed">
            {isAr && exercise.instructionsAr ? exercise.instructionsAr : exercise.instructions}
          </p>
        </div>

        <div className="rounded-2xl border border-rose-400/25 bg-rose-500/[0.06] p-3.5 space-y-1">
          <p className="font-bold text-rose-300 flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{isAr ? 'أخطاء تجنبها تماماً' : 'Mistakes to Avoid'}</span>
          </p>
          <p className="text-slate-200 leading-relaxed">
            {isAr
              ? exercise.mistakesAr || 'تجنب المرجحة بالظهر أو قفل المفاصل بعنف أو اختصار المدى الحركي.'
              : exercise.mistakes || 'Avoid swinging torso momentum, snapping joints at lockout, or half-repping.'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-[11px]">
        <span className="text-slate-400">
          {isAr ? 'يعرض المقاطع التعليمية الأفضل من يوتيوب لضمان دقة الأداء' : 'Displays top-rated form tutorials from YouTube.'}
        </span>
        <a
          href={ytSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-sky-300 hover:bg-white/10 shrink-0"
        >
          <span>{isAr ? 'بحث يوتيوب إضافي' : 'Search YouTube'}</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
};

export const ExerciseVideoModal: React.FC<{
  exercise: FormDemoPayload | null;
  language: Language;
  onClose: () => void;
}> = ({ exercise, language, onClose }) => {
  if (!exercise) return null;
  const isAr = language === 'ar';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="glass-panel-elevated w-full max-w-2xl rounded-[30px] p-5 sm:p-7 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-amber-300">
              ELARB FitPro Ultra · {exercise.muscleGroup}
            </p>
            <h2 className="text-lg sm:text-xl font-extrabold text-white mt-0.5">
              {isAr ? exercise.nameAr : exercise.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close form video"
            className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-full bg-white/10 text-slate-200 hover:bg-white/20 shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <ExerciseFormPlayer exercise={exercise} language={language} />
      </div>
    </div>
  );
};
