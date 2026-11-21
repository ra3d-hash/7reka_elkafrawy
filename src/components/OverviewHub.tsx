import React from 'react';
import {
  Activity,
  Camera,
  CheckCircle2,
  Dumbbell,
  ExternalLink,
  Flame,
  Ruler,
  Scale,
  ShieldAlert,
  Trash2,
  Trophy,
  Utensils,
} from 'lucide-react';
import { useFitness } from './FirebaseProvider';
import { getCopy } from '../lib/i18n';
import { MEDIA_ASSETS } from '../lib/mediaAssets';
import { READY_TRAINING_PROGRAMS } from '../data/programs';
import { READY_DIET_PLANS } from '../data/diets';
import type { AppTab, Language } from '../types/fitness';

interface OverviewHubProps {
  language: Language;
  onNavigate: (tab: AppTab) => void;
}

export const OverviewHub: React.FC<OverviewHubProps> = ({ language, onNavigate }) => {
  const t = getCopy(language);
  const {
    profile,
    workouts,
    meals,
    prs,
    acknowledgeDisclaimer,
    removeWorkoutLog,
    removeMealLog,
  } = useFitness();

  const today = new Date().toISOString().slice(0, 10);
  const todayMeals = meals.filter((m) => m.loggedDate === today);
  const caloriesToday = todayMeals.reduce((acc, m) => acc + m.calories, 0);
  const proteinToday = todayMeals.reduce((acc, m) => acc + m.proteinG, 0);
  const carbsToday = todayMeals.reduce((acc, m) => acc + m.carbsG, 0);
  const fatsToday = todayMeals.reduce((acc, m) => acc + m.fatsG, 0);

  const activeProgram =
    READY_TRAINING_PROGRAMS.find((p) => p.id === profile.activeProgramId) || READY_TRAINING_PROGRAMS[0];
  const activeDiet =
    READY_DIET_PLANS.find((d) => d.id === profile.activeDietId) || READY_DIET_PLANS[0];
  const heightM = profile.heightCm ? profile.heightCm / 100 : 0;
  const bmi =
    heightM > 0 && profile.weightKg
      ? (profile.weightKg / (heightM * heightM)).toFixed(1)
      : '—';

  const calPct = Math.min(100, Math.round((caloriesToday / Math.max(1, profile.targetCalories)) * 100));
  const ringRadius = 46;
  const ringCirc = 2 * Math.PI * ringRadius;
  const ringOffset = ringCirc - (calPct / 100) * ringCirc;

  return (
    <div className="space-y-6">
      {/* Editorial Asymmetric Hero + Live Calorie Dial */}
      <section className="relative overflow-hidden rounded-[32px] glass-panel-elevated">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between gap-7 relative z-10">
            <div className="space-y-4">
              <p className="text-xs font-semibold text-amber-300">
                {t.overview.heroKicker}
              </p>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.15] [text-wrap:balance]">
                {t.overview.heroTitle}
              </h1>
              <p className="text-sm sm:text-base text-slate-200/90 max-w-xl leading-relaxed">
                {t.overview.heroSub}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('workouts')}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 px-6 py-2.5 text-sm font-extrabold text-slate-950 hover:opacity-95 active:scale-[0.98] transition-all whitespace-nowrap shrink-0 shadow-lg shadow-amber-500/25"
              >
                <Dumbbell className="h-4 w-4 shrink-0" />
                <span>{t.overview.startWorkout}</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('nutrition')}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-md px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/15 active:scale-[0.98] transition-all whitespace-nowrap shrink-0"
              >
                <Camera className="h-4 w-4 text-sky-300 shrink-0" />
                <span>{t.overview.scanMeal}</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 relative min-h-[250px] lg:min-h-[340px] bg-black/60 overflow-hidden">
            <img
              src={MEDIA_ASSETS.heroGymStudio}
              alt="ELARB FitPro Ultra training facility"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
            <div
              className={`absolute inset-0 bg-gradient-to-t from-[#07060b] via-[#07060b]/35 to-transparent ${
                language === 'ar'
                  ? 'lg:bg-gradient-to-l lg:from-[#0e0c18] lg:via-[#0e0c18]/30 lg:to-transparent'
                  : 'lg:bg-gradient-to-r lg:from-[#0e0c18] lg:via-[#0e0c18]/30 lg:to-transparent'
              }`}
            />
            <div className="absolute bottom-4 right-4 left-4 glass-capsule rounded-full px-5 py-3 flex items-center justify-between text-xs text-slate-100">
              <span className="font-bold text-white font-display">ELARB FitPro Ultra</span>
              <span dir="ltr" className="font-mono-tabular text-amber-300">{caloriesToday} / {profile.targetCalories} kcal</span>
            </div>
          </div>
        </div>
      </section>

      {/* Active Biometrics & Assigned Training / Diet Plans */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel rounded-[26px] p-5 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-slate-400">
              {language === 'ar' ? 'قياسات جسمك المحفوظة' : 'Your Body Profile'}
            </p>
            <div className="flex items-center gap-4 font-mono-tabular">
              <span className="inline-flex items-center gap-1.5 text-base font-extrabold text-white">
                <Ruler className="h-4 w-4 text-amber-400 shrink-0" />
                {profile.heightCm || '—'} cm
              </span>
              <span className="inline-flex items-center gap-1.5 text-base font-extrabold text-white">
                <Scale className="h-4 w-4 text-sky-400 shrink-0" />
                {profile.weightKg || '—'} kg
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono-tabular">
              BMI {bmi} · {profile.goal === 'cut' ? (language === 'ar' ? 'تنشيف' : 'Cut') : profile.goal === 'bulk' ? (language === 'ar' ? 'تضخيم' : 'Bulk') : (language === 'ar' ? 'ثبات وتنسيق' : 'Recomp')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('workouts')}
          className="glass-panel rounded-[26px] p-5 text-start hover:border-amber-400/45 transition-all flex items-center justify-between gap-3 group"
        >
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-semibold text-amber-300">
              {language === 'ar' ? 'جدولك التدريبي النشط' : 'Active Training Schedule'}
            </p>
            <p className="text-sm font-bold text-white truncate">
              {language === 'ar' ? activeProgram.titleAr : activeProgram.titleEn}
            </p>
            <p className="text-[11px] text-slate-400">
              {activeProgram.daysPerWeek} {language === 'ar' ? 'أيام / أسبوع · افتح الجدول' : 'days/wk · Open Schedule'}
            </p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-300 group-hover:bg-amber-500/25">
            <Dumbbell className="h-5 w-5" />
          </span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('nutrition')}
          className="glass-panel rounded-[26px] p-5 text-start hover:border-sky-400/45 transition-all flex items-center justify-between gap-3 group"
        >
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-semibold text-sky-300">
              {language === 'ar' ? 'نظامك الغذائي النشط' : 'Active Nutrition Plan'}
            </p>
            <p className="text-sm font-bold text-white truncate">
              {language === 'ar' ? activeDiet.titleAr : activeDiet.titleEn}
            </p>
            <p className="text-[11px] text-slate-400 font-mono-tabular">
              {activeDiet.totalCalories} kcal · P {activeDiet.totalProteinG}g
            </p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-300 group-hover:bg-sky-500/25">
            <Utensils className="h-5 w-5" />
          </span>
        </button>
      </section>

      {/* Medical & Fitness Disclaimer Strip */}
      <section className="glass-panel rounded-[28px] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/30">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-amber-200">{t.disclaimer.title}</h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{t.disclaimer.short}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={acknowledgeDisclaimer}
          className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-5 py-2 text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
            profile.disclaimerAccepted
              ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
              : 'bg-amber-400 text-slate-950 hover:bg-amber-300'
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{profile.disclaimerAccepted ? t.disclaimer.acknowledged : t.disclaimer.acknowledge}</span>
        </button>
      </section>

      {/* Asymmetric Biometric & Fuel Strip (1 wide fuel HUD + 2 compact counters) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6 glass-panel rounded-[28px] p-6 flex items-center justify-between gap-5">
          <div className="space-y-3 min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
              <Flame className="h-4 w-4 shrink-0" />
              <span>{t.overview.caloriesToday}</span>
            </div>
            <p dir="ltr" className="text-3xl sm:text-4xl font-extrabold text-white font-mono-tabular text-start">
              {caloriesToday} <span className="text-sm font-normal text-slate-400">/ {profile.targetCalories} kcal</span>
            </p>
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/10 font-mono-tabular">
              <div>
                <p className="text-base font-bold text-amber-300">{proteinToday}g</p>
                <p className="text-[11px] text-slate-400">{t.overview.proteinToday} · {profile.targetProtein}g</p>
              </div>
              <div>
                <p className="text-base font-bold text-sky-300">{carbsToday}g</p>
                <p className="text-[11px] text-slate-400">{t.overview.carbsToday} · {profile.targetCarbs}g</p>
              </div>
              <div>
                <p className="text-base font-bold text-indigo-300">{fatsToday}g</p>
                <p className="text-[11px] text-slate-400">{t.overview.fatsToday} · {profile.targetFats}g</p>
              </div>
            </div>
          </div>
          <svg className="h-28 w-28 -rotate-90 shrink-0" viewBox="0 0 110 110" aria-hidden="true">
            <circle cx="55" cy="55" r={ringRadius} stroke="rgba(255,255,255,0.1)" strokeWidth="9" fill="none" />
            <circle
              cx="55"
              cy="55"
              r={ringRadius}
              stroke="#fbbf24"
              strokeWidth="9"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={ringCirc}
              strokeDashoffset={ringOffset}
            />
          </svg>
        </div>

        <div className="lg:col-span-3 glass-panel rounded-[28px] p-6 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">{t.overview.workoutsLogged}</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/15 text-amber-300">
              <Activity className="h-4 w-4" />
            </span>
          </div>
          <p className="text-4xl font-extrabold text-white font-mono-tabular">{workouts.length}</p>
          <p className="text-xs text-slate-400 truncate">
            {workouts[0] ? `${workouts[0].exerciseName} · ${workouts[0].loggedDate}` : 'ELARB Logbook'}
          </p>
        </div>

        <div className="lg:col-span-3 glass-panel rounded-[28px] p-6 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">{t.overview.prsRecorded}</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500/15 text-sky-300">
              <Trophy className="h-4 w-4" />
            </span>
          </div>
          <p className="text-4xl font-extrabold text-white font-mono-tabular">{prs.length}</p>
          <p className="text-xs text-slate-400 truncate">
            {prs[0] ? `${prs[0].exerciseName} · ${prs[0].estimated1RmKg} kg` : 'ELARB PR Vault'}
          </p>
        </div>
      </section>

      {/* Activity Feed + Coach & Developer Direct Desk */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 glass-panel rounded-[28px] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">{t.overview.recentActivity}</h2>
            <span className="text-xs text-slate-400 font-mono-tabular">{today}</span>
          </div>

          {workouts.length === 0 && meals.length === 0 ? (
            <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-6 text-center space-y-4">
              <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">{t.overview.noActivity}</p>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('workouts')}
                  className="min-h-[44px] rounded-full bg-amber-500/20 border border-amber-400/40 px-5 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/30 transition-colors"
                >
                  {t.overview.startWorkout}
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('nutrition')}
                  className="min-h-[44px] rounded-full bg-sky-500/20 border border-sky-400/40 px-5 py-2 text-xs font-semibold text-sky-200 hover:bg-sky-500/30 transition-colors"
                >
                  {t.overview.scanMeal}
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {workouts.slice(0, 4).map((w) => (
                <div key={w.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{w.exerciseName}</p>
                    <p className="text-xs text-slate-400 font-mono-tabular">
                      {w.discipline} · {w.sets}×{w.reps} @ {w.weightKg}kg · {w.loggedDate}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeWorkoutLog(w.id)}
                    aria-label="Remove workout log"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-slate-400 hover:text-rose-300 hover:bg-rose-500/15 shrink-0 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {meals.slice(0, 4).map((m) => (
                <div key={m.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{m.name}</p>
                    <p className="text-xs text-slate-400 font-mono-tabular">
                      {m.mealType} · {m.calories} kcal · P {m.proteinG}g / C {m.carbsG}g / F {m.fatsG}g
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMealLog(m.id)}
                    aria-label="Remove meal log"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-slate-400 hover:text-rose-300 hover:bg-rose-500/15 shrink-0 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-4 glass-panel rounded-[28px] p-6 flex flex-col justify-between gap-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-sky-300">{t.devSupport}</p>
            <h3 className="text-lg font-bold text-white">ELARB Direct Channels</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {language === 'ar'
                ? 'لو محتاج متابعة شخصية، تعديل جدول، أو دعم فني في التطبيق — كلمنا مباشرة على واتساب أو تليجرام:'
                : 'Questions on your split, custom coaching, or Android APK builds? Message our core team directly on WhatsApp or Telegram:'}
            </p>
          </div>
          <div className="space-y-2.5">
            <a
              href="https://wa.me/uncle_elbhiry"
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[46px] items-center justify-between rounded-full border border-white/15 bg-white/[0.06] px-5 py-2.5 text-sm font-semibold text-amber-300 hover:bg-amber-500/15 transition-colors"
            >
              <span dir="ltr">WhatsApp @uncle_elbhiry</span>
              <ExternalLink className="h-4 w-4 shrink-0" />
            </a>
            <a
              href="https://t.me/elarp_vip"
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[46px] items-center justify-between rounded-full border border-white/15 bg-white/[0.06] px-5 py-2.5 text-sm font-semibold text-sky-300 hover:bg-sky-500/15 transition-colors"
            >
              <span dir="ltr">Telegram @elarp_vip</span>
              <ExternalLink className="h-4 w-4 shrink-0" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};
