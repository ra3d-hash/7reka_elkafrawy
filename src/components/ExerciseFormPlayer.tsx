/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Maximize2,
  Play,
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

// Curated verified tutorial video IDs for foundational compound & isolation movements
const VERIFIED_FORM_VIDEOS: Record<string, string> = {
  bench: 'rT7DgCr-3pg',
  incline: 'SrqOu55lrYU',
  squat: 'ultWZbUMPL8',
  deadlift: 'op9kVnSso6Q',
  ohp: '2yjwXTZQDDI',
  row: 'kBWAon7ItDw',
  pullup: 'eGo4IYlbE5g',
  dip: '2z8JmcrW-As',
  curl: 'ykJmrZ5v0Oo',
  lateral: '3VcKaXpzqRo',
  rdl: 'JCXUYuzwNrM',
  lunge: 'QOVaHwm-Q6U',
  plank: 'ASdvN_XEl_c',
  pushup: 'IODxDxX7oi4',
};

function resolveCuratedVideoId(name: string): string | null {
  const lower = name.toLowerCase();
  if (lower.includes('incline') && lower.includes('press')) return VERIFIED_FORM_VIDEOS.incline;
  if (lower.includes('bench press')) return VERIFIED_FORM_VIDEOS.bench;
  if (lower.includes('squat')) return VERIFIED_FORM_VIDEOS.squat;
  if (lower.includes('romanian') || lower.includes('rdl')) return VERIFIED_FORM_VIDEOS.rdl;
  if (lower.includes('deadlift')) return VERIFIED_FORM_VIDEOS.deadlift;
  if (lower.includes('overhead') || lower.includes('military press') || lower.includes('shoulder press')) {
    return VERIFIED_FORM_VIDEOS.ohp;
  }
  if (lower.includes('row')) return VERIFIED_FORM_VIDEOS.row;
  if (lower.includes('pull-up') || lower.includes('chin-up')) return VERIFIED_FORM_VIDEOS.pullup;
  if (lower.includes('dip')) return VERIFIED_FORM_VIDEOS.dip;
  if (lower.includes('curl')) return VERIFIED_FORM_VIDEOS.curl;
  if (lower.includes('lateral raise')) return VERIFIED_FORM_VIDEOS.lateral;
  if (lower.includes('lunge') || lower.includes('split squat')) return VERIFIED_FORM_VIDEOS.lunge;
  if (lower.includes('plank')) return VERIFIED_FORM_VIDEOS.plank;
  if (lower.includes('push-up') || lower.includes('pushup')) return VERIFIED_FORM_VIDEOS.pushup;
  return null;
}

export const ExerciseFormPlayer: React.FC<ExerciseFormPlayerProps> = ({
  exercise,
  language,
  onExpandModal,
}) => {
  const isAr = language === 'ar';

  const ytQuery = encodeURIComponent(`${exercise.name} proper form exercise tutorial`);
  const ytSearchUrl = `https://www.youtube.com/results?search_query=${ytQuery}`;
  const videoId = resolveCuratedVideoId(exercise.name);
  const ytEmbedUrl = videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0` : null;

  return (
    <div className="space-y-3.5">
      {/* Real Verified Video Tutorial Embed OR Interactive Form Coach HUD */}
      <div className="relative overflow-hidden rounded-[22px] border border-amber-400/35 bg-[#07060b] shadow-2xl aspect-[16/9]">
        {ytEmbedUrl ? (
          <iframe
            src={ytEmbedUrl}
            title={exercise.name}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-slate-950 via-[#0e0c18] to-amber-950/30 space-y-3">
            <div className="h-14 w-14 rounded-full bg-amber-400/15 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <Activity className="h-7 w-7" />
            </div>
            <div className="space-y-1 max-w-md">
              <p className="text-sm font-extrabold text-white">
                {isAr ? exercise.nameAr : exercise.name}
              </p>
              <p className="text-xs text-slate-300">
                {exercise.equipment ? `${exercise.equipment} · ` : ''}{exercise.muscleGroup}
              </p>
            </div>
            <a
              href={ytSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[40px] inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 px-5 text-xs font-extrabold text-slate-950 hover:opacity-95 transition-all"
            >
              <Play className="h-3.5 w-3.5" />
              <span>{isAr ? 'تشغيل شرح التمرين على يوتيوب' : 'Watch Tutorial on YouTube'}</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}

        {/* Top HUD Overlays */}
        <div className="absolute top-2.5 inset-x-3 flex items-center justify-between gap-2 pointer-events-none">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/75 backdrop-blur-md border border-amber-400/40 px-3.5 py-1 text-[11px] font-bold text-amber-300">
            <Video className="h-3.5 w-3.5 shrink-0" />
            <span>
              {ytEmbedUrl
                ? isAr
                  ? 'فيديو شرح الأداء الصحيح'
                  : 'Verified Form Tutorial'
                : isAr
                ? 'بطاقة الأداء والميكانيكا'
                : 'Biomechanical Form Guide'}
            </span>
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
          {isAr ? 'متاح شرح الأداء خطوة بخطوة وروابط يوتيوب المعتمدة' : 'Includes step-by-step execution cues and direct YouTube tutorials.'}
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
