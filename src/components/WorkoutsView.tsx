import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flame,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Timer,
  Video,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  BUILTIN_EXERCISES,
  EQUIPMENT_MODALITIES,
  getFullExerciseCatalog,
  inferMotionPattern,
} from '../data/exercises';
import { READY_TRAINING_PROGRAMS } from '../data/programs';
import { getCopy } from '../lib/i18n';
import { ExerciseFormPlayer, ExerciseVideoModal, type FormDemoPayload } from './ExerciseFormPlayer';
import { useFitness } from './FirebaseProvider';
import type { AiWorkoutPlan, Discipline, ExerciseItem, Language } from '../types/fitness';

const DISCIPLINES: Array<'All' | Discipline> = ['All', 'Bodybuilding', 'Calisthenics', 'CrossFit', 'HIIT'];
const PAGE_SIZE = 30;

function playTimerBeep() {
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    // ignore audio block
  }
}

export const WorkoutsView: React.FC<{ language: Language }> = ({ language }) => {
  const t = getCopy(language);
  const isAr = language === 'ar';
  const { profile, workouts, customExercises, addWorkoutLog, setActiveProgram } = useFitness();

  const [viewMode, setViewMode] = useState<'programs' | 'library'>('programs');
  const [discipline, setDiscipline] = useState<'All' | Discipline>('All');
  const [muscleFilter, setMuscleFilter] = useState('All');
  const [equipmentFilter, setEquipmentFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseItem>(BUILTIN_EXERCISES[0]);
  const [videoModalExercise, setVideoModalExercise] = useState<FormDemoPayload | null>(null);

  // Active ready-made program & day schedule state
  const activeProgram = useMemo(
    () => READY_TRAINING_PROGRAMS.find((p) => p.id === profile.activeProgramId) ?? READY_TRAINING_PROGRAMS[0],
    [profile.activeProgramId]
  );
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(1);
  const [weightOverrides, setWeightOverrides] = useState<Record<string, number>>({});
  const [loggedTodayToast, setLoggedTodayToast] = useState<string | null>(null);
  const [batchLogging, setBatchLogging] = useState(false);

  // Manual exercise logger state
  const [sets, setSets] = useState(4);
  const [reps, setReps] = useState(8);
  const [weightKg, setWeightKg] = useState(80);
  const [notes, setNotes] = useState('');
  const [logSavedToast, setLogSavedToast] = useState(false);

  // Smart Rest Timer state
  const [timerPreset, setTimerPreset] = useState(90);
  const [secondsLeft, setSecondsLeft] = useState(90);
  const [timerRunning, setTimerRunning] = useState(false);

  // AI Split Planner state
  const [aiDays, setAiDays] = useState(4);
  const [aiLevel, setAiLevel] = useState('Intermediate');
  const [aiEquipment, setAiEquipment] = useState('Full Gym');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPlan, setAiPlan] = useState<AiWorkoutPlan | null>(null);

  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          playTimerBeep();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayLoggedNames = useMemo(
    () => new Set(workouts.filter((w) => w.loggedDate === todayStr).map((w) => w.exerciseName)),
    [workouts, todayStr]
  );

  const filteredPrograms = useMemo(() => {
    if (discipline === 'All') return READY_TRAINING_PROGRAMS;
    return READY_TRAINING_PROGRAMS.filter((p) => p.discipline === discipline);
  }, [discipline]);

  const currentDay = useMemo(
    () => activeProgram.schedule.find((d) => d.dayIndex === selectedDayIndex) ?? activeProgram.schedule[0],
    [activeProgram, selectedDayIndex]
  );

  // 22,416+ Exercises Catalog + Coach Custom Exercises
  const allExercises = useMemo(() => {
    const base = getFullExerciseCatalog();
    return customExercises.length > 0 ? [...customExercises, ...base] : base;
  }, [customExercises]);

  const muscleGroups = useMemo(
    () => ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Full Body'],
    []
  );

  const equipmentOptions = useMemo(
    () => ['All', ...Array.from(new Set(EQUIPMENT_MODALITIES.map((e) => e.label)))],
    []
  );

  const filteredExercises = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allExercises.filter((ex) => {
      if (discipline !== 'All' && ex.discipline !== discipline) return false;
      if (muscleFilter !== 'All' && ex.muscleGroup !== muscleFilter) return false;
      if (equipmentFilter !== 'All' && ex.equipment !== equipmentFilter) return false;
      if (
        q &&
        !ex.name.toLowerCase().includes(q) &&
        !ex.nameAr.includes(q) &&
        !ex.equipment.toLowerCase().includes(q) &&
        !ex.muscleGroup.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [allExercises, discipline, muscleFilter, equipmentFilter, search]);

  // Reset pagination whenever filters change
  useEffect(() => {
    setPage(1);
  }, [discipline, muscleFilter, equipmentFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredExercises.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedExercises = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredExercises.slice(start, start + PAGE_SIZE);
  }, [filteredExercises, safePage]);

  const startRestCountdown = (sec: number) => {
    setTimerPreset(sec);
    setSecondsLeft(sec);
    setTimerRunning(true);
  };

  const handleLogProgramExercise = async (ex: (typeof currentDay.exercises)[number]) => {
    const chosenWeight = weightOverrides[ex.id] ?? ex.suggestedWeightKg;
    const numericReps = parseInt(ex.reps, 10) || 10;
    const displayName = isAr ? ex.nameAr : ex.name;
    await addWorkoutLog({
      exerciseName: displayName,
      discipline: activeProgram.discipline,
      muscleGroup: ex.muscleGroup,
      sets: ex.sets,
      reps: numericReps,
      weightKg: chosenWeight,
      durationSec: ex.restSec,
      notes: isAr ? `ضمن جدول: ${activeProgram.titleAr}` : `Program: ${activeProgram.titleEn}`,
    });
    setLoggedTodayToast(displayName);
    setTimeout(() => setLoggedTodayToast(null), 2500);
  };

  const handleLogWholeDay = async () => {
    if (currentDay.isRest || currentDay.exercises.length === 0) return;
    setBatchLogging(true);
    try {
      for (const ex of currentDay.exercises) {
        const displayName = isAr ? ex.nameAr : ex.name;
        if (todayLoggedNames.has(displayName)) continue;
        const chosenWeight = weightOverrides[ex.id] ?? ex.suggestedWeightKg;
        const numericReps = parseInt(ex.reps, 10) || 10;
        await addWorkoutLog({
          exerciseName: displayName,
          discipline: activeProgram.discipline,
          muscleGroup: ex.muscleGroup,
          sets: ex.sets,
          reps: numericReps,
          weightKg: chosenWeight,
          durationSec: ex.restSec,
          notes: isAr
            ? `${activeProgram.titleAr} · ${currentDay.dayNameAr}`
            : `${activeProgram.titleEn} · ${currentDay.dayNameEn}`,
        });
      }
      setLoggedTodayToast(isAr ? currentDay.dayNameAr : currentDay.dayNameEn);
      setTimeout(() => setLoggedTodayToast(null), 3000);
    } finally {
      setBatchLogging(false);
    }
  };

  const handleLogSet = async (e: React.FormEvent) => {
    e.preventDefault();
    await addWorkoutLog({
      exerciseName: isAr ? selectedExercise.nameAr : selectedExercise.name,
      discipline: selectedExercise.discipline,
      muscleGroup: selectedExercise.muscleGroup,
      sets,
      reps,
      weightKg,
      durationSec: timerPreset,
      notes,
    });
    setNotes('');
    setLogSavedToast(true);
    setTimeout(() => setLogSavedToast(false), 2500);
  };

  const handleGeneratePlan = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/workout/ai-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal:
            profile.goal === 'cut'
              ? 'Fat Loss & Conditioning'
              : profile.goal === 'bulk'
              ? 'Muscle Hypertrophy'
              : 'Strength & Recomp',
          discipline: discipline === 'All' ? 'Bodybuilding' : discipline,
          level: aiLevel,
          equipment: aiEquipment,
          daysPerWeek: aiDays,
          language,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate workout plan.');
      setAiPlan(data as AiWorkoutPlan);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Unable to reach training planner.');
    } finally {
      setAiLoading(false);
    }
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className="space-y-6">
      {/* Header + Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{t.workouts.title}</h1>
          <p className="text-sm text-slate-300">
            {isAr
              ? `10 أنظمة تدريبية جاهزة + مكتبة عملاقة تضم ${allExercises.length.toLocaleString('en-US')} تمرينة بفيديو توضيحي للعب الصحيح`
              : `10 ready splits + ${allExercises.length.toLocaleString('en-US')} searchable exercises with live proper-form demo videos.`}
          </p>
        </div>

        <div className="inline-flex items-center rounded-full bg-white/[0.05] border border-white/15 p-1 self-start md:self-auto">
          {(
            [
              { id: 'programs' as const, labelAr: 'الأنظمة الجاهزة والجدول', labelEn: 'Ready Programs & Schedule' },
              {
                id: 'library' as const,
                labelAr: `مكتبة ${allExercises.length.toLocaleString('en-US')} تمرين بالفيديو`,
                labelEn: `${allExercises.length.toLocaleString('en-US')} Exercises + Video`,
              },
            ] as const
          ).map((tab) => {
            const active = viewMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setViewMode(tab.id)}
                className={`relative min-h-[38px] px-4 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
                  active ? 'text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="workoutViewModeOval"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400"
                  />
                )}
                <span className="relative z-10">{isAr ? tab.labelAr : tab.labelEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Discipline Filter Capsule */}
      <div className="glass-panel rounded-[28px] p-3 sm:p-4 flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center">
        <div className="flex flex-wrap items-center gap-1 rounded-full bg-white/[0.04] p-1 border border-white/10">
          {DISCIPLINES.map((d) => {
            const active = discipline === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDiscipline(d)}
                className={`relative min-h-[38px] px-4 py-1.5 text-xs font-semibold rounded-full transition-colors whitespace-nowrap shrink-0 ${
                  active ? 'text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="disciplineOval"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400"
                  />
                )}
                <span className="relative z-10">{d === 'All' ? t.workouts.allDisciplines : d}</span>
              </button>
            );
          })}
        </div>

        {/* Live Rest Clock Mini-HUD always visible */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-full border border-sky-400/25 bg-sky-500/10 px-4 py-1.5">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-sky-300 shrink-0" />
            <span className="text-xs font-semibold text-sky-200">{t.workouts.restTimer}</span>
            <span dir="ltr" className="text-base font-extrabold font-mono-tabular text-white px-1">
              {mm}:{ss}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {[60, 90, 120].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => {
                  setTimerPreset(sec);
                  setSecondsLeft(sec);
                  setTimerRunning(false);
                }}
                className={`min-h-[30px] px-2.5 rounded-full text-[11px] font-mono-tabular font-bold ${
                  timerPreset === sec ? 'bg-sky-400 text-slate-950' : 'bg-white/10 text-slate-200'
                }`}
              >
                {sec}s
              </button>
            ))}
            <button
              type="button"
              onClick={() => setTimerRunning((r) => !r)}
              className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-full bg-amber-400 text-slate-950"
              aria-label={timerRunning ? t.workouts.pause : t.workouts.start}
            >
              {timerRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => {
                setTimerRunning(false);
                setSecondsLeft(timerPreset);
              }}
              className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-full bg-white/10 text-slate-200"
              aria-label={t.workouts.reset}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'programs' ? (
        <div className="space-y-6">
          {/* Ready-Made Training Systems Selector Grid */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Flame className="h-4 w-4 text-amber-300 shrink-0" />
                <span>
                  {isAr
                    ? `كل الأنظمة التدريبية الجاهزة (${filteredPrograms.length} نظام)`
                    : `All Ready-Made Training Systems (${filteredPrograms.length})`}
                </span>
              </h2>
              <span className="text-xs text-slate-400">
                {isAr ? 'اختار نظام لتفعيل جدوله فوراً' : 'Tap any system to load its working schedule'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredPrograms.map((prog) => {
                const isSelected = prog.id === activeProgram.id;
                const matchesGoal = prog.goalTag === profile.goal;
                return (
                  <button
                    key={prog.id}
                    type="button"
                    onClick={() => {
                      setActiveProgram(prog.id);
                      setSelectedDayIndex(1);
                    }}
                    className={`text-start rounded-[26px] p-5 transition-all flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'glass-panel-elevated ring-1 ring-amber-400/55'
                        : 'glass-panel hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 text-[11px] font-semibold">
                        <span className="text-sky-300">
                          {prog.discipline} · {prog.daysPerWeek} {isAr ? 'أيام/أسبوع' : 'days/wk'}
                        </span>
                        {isSelected ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 text-slate-950 px-2.5 py-0.5 text-[10px] font-extrabold">
                            <Check className="h-3 w-3" />
                            <span>{isAr ? 'النظام المفعل' : 'Active'}</span>
                          </span>
                        ) : matchesGoal ? (
                          <span className="rounded-full bg-amber-500/15 border border-amber-400/35 text-amber-200 px-2.5 py-0.5 text-[10px]">
                            {isAr ? 'مناسب لهدفك' : 'Goal Match'}
                          </span>
                        ) : (
                          <span className="text-slate-400">{prog.level}</span>
                        )}
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
                        {isAr ? prog.titleAr : prog.titleEn}
                      </h3>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {isAr ? prog.taglineAr : prog.taglineEn}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/10">
                      <span>{isAr ? prog.equipmentAr : prog.equipmentEn}</span>
                      <span className="font-mono-tabular">{prog.sessionMinutes}m</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Working Interactive 7-Day Schedule for Active Program */}
          <section className="glass-panel-elevated rounded-[30px] p-5 sm:p-7 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                  <CalendarCheck className="h-4 w-4" />
                  <span>{isAr ? 'الجدول التدريبي الشغال حالياً' : 'Active Working Weekly Schedule'}</span>
                </p>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                  {isAr ? activeProgram.titleAr : activeProgram.titleEn}
                </h2>
                <p className="text-xs text-slate-300">
                  {isAr ? activeProgram.taglineAr : activeProgram.taglineEn}
                </p>
              </div>

              {!currentDay.isRest && (
                <button
                  type="button"
                  disabled={batchLogging}
                  onClick={handleLogWholeDay}
                  className="min-h-[46px] inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 px-6 text-xs sm:text-sm font-extrabold text-slate-950 hover:opacity-95 active:scale-[0.98] transition-all whitespace-nowrap shrink-0 disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>
                    {batchLogging
                      ? isAr
                        ? 'جاري تسجيل اليوم...'
                        : 'Logging Day...'
                      : isAr
                      ? 'تسجيل كل تمارين اليوم'
                      : 'Complete & Log Whole Day'}
                  </span>
                </button>
              )}
            </div>

            {/* Day 1..Day 7 Oval Switcher */}
            <div className="flex flex-wrap items-center gap-2">
              {activeProgram.schedule.map((day) => {
                const active = day.dayIndex === currentDay.dayIndex;
                const allDayDone =
                  !day.isRest &&
                  day.exercises.length > 0 &&
                  day.exercises.every((ex) => todayLoggedNames.has(isAr ? ex.nameAr : ex.name));
                return (
                  <button
                    key={day.dayIndex}
                    type="button"
                    onClick={() => setSelectedDayIndex(day.dayIndex)}
                    className={`min-h-[40px] px-4 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5 ${
                      active
                        ? 'bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 text-slate-950 shadow-md shadow-amber-500/20'
                        : day.isRest
                        ? 'border border-white/10 bg-white/[0.02] text-slate-400 hover:bg-white/[0.06]'
                        : 'border border-white/15 bg-white/[0.05] text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    {allDayDone && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
                    <span>{isAr ? `اليوم ${day.dayIndex}` : `Day ${day.dayIndex}`}</span>
                    {day.isRest && <span className="opacity-75">· {isAr ? 'راحة' : 'Rest'}</span>}
                  </button>
                );
              })}
            </div>

            {/* Selected Day Details */}
            <div className="rounded-[24px] border border-white/10 bg-black/45 p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    {isAr ? currentDay.dayNameAr : currentDay.dayNameEn}
                  </h3>
                  <p className="text-xs text-sky-300 mt-0.5">
                    {isAr ? currentDay.focusAr : currentDay.focusEn}
                  </p>
                </div>
                <span className="text-xs font-mono-tabular text-slate-400">
                  {currentDay.isRest
                    ? isAr
                      ? 'يوم استشفاء'
                      : 'Recovery Day'
                    : `${currentDay.exercises.length} ${isAr ? 'تمارين' : 'exercises'}`}
                </span>
              </div>

              {loggedTodayToast && (
                <div className="rounded-full border border-amber-400/40 bg-amber-500/15 px-4 py-2 text-xs font-semibold text-amber-200 text-center">
                  ✓ {isAr ? `تم تسجيل "${loggedTodayToast}" في سجل تمارينك` : `Logged "${loggedTodayToast}" to your training logbook`}
                </div>
              )}

              {currentDay.isRest ? (
                <div className="py-8 text-center space-y-2">
                  <p className="text-base font-bold text-amber-300">
                    {isAr ? 'اليوم يوم راحة واستشفاء عضلي' : 'Active Recovery & Muscle Growth Day'}
                  </p>
                  <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                    {isAr
                      ? 'عضلاتك بتكبر وقت الراحة والنوم، مش جوة التمرين بس. اشرب 3.5 لتر مياه، خد بروتينك كامل، وامشي 7-10 آلاف خطوة خفيفة.'
                      : 'Muscles rebuild while resting. Hit your protein target, drink 3.5L water, get 7-8 hours of sleep, and keep easy daily steps.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentDay.exercises.map((ex, idx) => {
                    const displayName = isAr ? ex.nameAr : ex.name;
                    const alreadyDone = todayLoggedNames.has(displayName);
                    const weightVal = weightOverrides[ex.id] ?? ex.suggestedWeightKg;

                    return (
                      <div
                        key={ex.id}
                        className={`rounded-[22px] border p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors ${
                          alreadyDone
                            ? 'border-amber-400/45 bg-amber-500/10'
                            : 'border-white/10 bg-white/[0.03]'
                        }`}
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono-tabular text-xs font-bold text-amber-300">
                              0{idx + 1}
                            </span>
                            <h4 className="text-sm sm:text-base font-bold text-white">{displayName}</h4>
                            <span className="text-[11px] text-slate-400">· {ex.muscleGroup}</span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {isAr ? ex.cueAr : ex.cueEn}
                          </p>
                          <p dir="ltr" className="text-xs font-mono-tabular text-sky-300 text-start">
                            {ex.sets} sets × {ex.reps} reps · Rest {ex.restSec}s
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setVideoModalExercise({
                                id: ex.id,
                                name: ex.name,
                                nameAr: ex.nameAr,
                                muscleGroup: ex.muscleGroup,
                                equipment: activeProgram.equipmentEn,
                                instructions: ex.cueEn,
                                instructionsAr: ex.cueAr,
                                motionPattern: inferMotionPattern(ex.name, ex.muscleGroup),
                              })
                            }
                            className="min-h-[38px] inline-flex items-center gap-1.5 rounded-full border border-amber-400/35 bg-amber-500/15 px-3.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/25 transition-colors"
                          >
                            <Video className="h-3.5 w-3.5" />
                            <span>{isAr ? 'فيديو اللعب' : 'Form Video'}</span>
                          </button>

                          <label className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/60 px-3 py-1.5 text-xs">
                            <span className="text-slate-400">{isAr ? 'الوزن:' : 'kg:'}</span>
                            <input
                              type="number"
                              min={0}
                              max={500}
                              step="2.5"
                              value={weightVal}
                              onChange={(e) =>
                                setWeightOverrides((prev) => ({
                                  ...prev,
                                  [ex.id]: Number(e.target.value),
                                }))
                              }
                              className="w-14 bg-transparent text-white font-mono-tabular font-bold focus:outline-none text-center"
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => startRestCountdown(ex.restSec)}
                            className="min-h-[38px] inline-flex items-center gap-1.5 rounded-full border border-sky-400/35 bg-sky-500/15 px-3.5 text-xs font-semibold text-sky-200 hover:bg-sky-500/25 transition-colors"
                          >
                            <Timer className="h-3.5 w-3.5" />
                            <span>{isAr ? `راحة ${ex.restSec}ث` : `${ex.restSec}s`}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleLogProgramExercise(ex)}
                            className={`min-h-[38px] inline-flex items-center gap-1.5 rounded-full px-4 text-xs font-bold transition-all ${
                              alreadyDone
                                ? 'bg-amber-500/25 border border-amber-400/40 text-amber-200'
                                : 'bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 text-slate-950 hover:opacity-95'
                            }`}
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>
                              {alreadyDone
                                ? isAr
                                  ? 'تم التسجيل'
                                  : 'Logged'
                                : isAr
                                ? 'سجّل التمرين'
                                : 'Log Set'}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      ) : (
        /* 22,416+ EXERCISE ENCYCLOPEDIA + VIDEO FORM DEMO & LOGGER */
        <div className="space-y-6">
          {/* Search & Filter Capsules */}
          <div className="glass-panel rounded-[28px] p-4 space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-slate-400 absolute top-1/2 -translate-y-1/2 left-3.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    isAr
                      ? `ابحث وسط ${allExercises.length.toLocaleString('en-US')} تمرينة (بنش، سكوات، عقلة، دمبل...)`
                      : `Search ${allExercises.length.toLocaleString('en-US')} exercises (bench, squat, cable, pause...)`
                  }
                  className="min-h-[44px] w-full rounded-full border border-white/15 bg-black/50 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <select
                value={muscleFilter}
                onChange={(e) => setMuscleFilter(e.target.value)}
                aria-label="Muscle Group Filter"
                className="min-h-[44px] rounded-full border border-white/15 bg-black/50 px-4 text-sm text-white focus:outline-none focus:border-amber-400"
              >
                {muscleGroups.map((m) => (
                  <option key={m} value={m}>
                    {m === 'All' ? t.workouts.allMuscles : m}
                  </option>
                ))}
              </select>

              <select
                value={equipmentFilter}
                onChange={(e) => setEquipmentFilter(e.target.value)}
                aria-label="Equipment Filter"
                className="min-h-[44px] rounded-full border border-white/15 bg-black/50 px-4 text-sm text-white focus:outline-none focus:border-amber-400"
              >
                {equipmentOptions.map((eq) => (
                  <option key={eq} value={eq}>
                    {eq === 'All' ? (isAr ? 'كل المعدات' : 'All Equipment') : eq}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
              <span className="text-amber-300 font-semibold font-mono-tabular">
                {isAr
                  ? `عرض ${paginatedExercises.length} من أصل ${filteredExercises.length.toLocaleString('en-US')} تمرينة متاحة بالفيديو`
                  : `Showing ${paginatedExercises.length} of ${filteredExercises.length.toLocaleString('en-US')} exercises (all with form video)`}
              </span>
              <span dir="ltr" className="text-slate-400 font-mono-tabular">
                Page {safePage} / {totalPages}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Paginated Catalog List */}
            <div className="lg:col-span-6 glass-panel rounded-[28px] overflow-hidden flex flex-col">
              <div className="divide-y divide-white/10 max-h-[760px] overflow-y-auto">
                {paginatedExercises.map((ex) => {
                  const active = selectedExercise.id === ex.id;
                  return (
                    <div
                      key={ex.id}
                      onClick={() => setSelectedExercise(ex)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedExercise(ex);
                        }
                      }}
                      className={`w-full text-start p-4 sm:px-5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        active ? 'bg-amber-400/15' : 'hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="min-w-0 space-y-1 flex-1">
                        <p className={`text-sm font-bold truncate ${active ? 'text-amber-300' : 'text-white'}`}>
                          {isAr ? ex.nameAr : ex.name}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {ex.discipline} · {ex.muscleGroup} · {ex.equipment} · {ex.defaultSets ?? 3}×{ex.defaultReps ?? '8-12'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedExercise(ex);
                          setVideoModalExercise(ex);
                        }}
                        aria-label={isAr ? `مشاهدة فيديو ${ex.nameAr}` : `Watch ${ex.name} demo`}
                        className="min-h-[34px] px-3 inline-flex items-center gap-1 rounded-full bg-amber-400/15 border border-amber-400/35 text-[11px] font-bold text-amber-200 hover:bg-amber-400/25 shrink-0"
                      >
                        <Video className="h-3.5 w-3.5" />
                        <span>{isAr ? 'فيديو' : 'Video'}</span>
                      </button>
                    </div>
                  );
                })}
                {paginatedExercises.length === 0 && (
                  <div className="p-8 text-center text-sm text-slate-400">
                    {isAr ? 'مفيش تمرين مطابق للبحث ده.' : 'No exercises match your filters.'}
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="border-t border-white/10 bg-black/35 p-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="min-h-[38px] px-4 rounded-full border border-white/15 bg-white/5 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-40 inline-flex items-center gap-1"
                  >
                    <ChevronLeft className={`h-4 w-4 ${isAr ? 'rotate-180' : ''}`} />
                    <span>{isAr ? 'السابق' : 'Prev'}</span>
                  </button>

                  <div dir="ltr" className="flex items-center gap-1.5 text-xs font-mono-tabular">
                    <button
                      type="button"
                      onClick={() => setPage(1)}
                      className={`h-8 px-2.5 rounded-full ${safePage === 1 ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-white/5 text-slate-300'}`}
                    >
                      1
                    </button>
                    <span className="text-slate-400">...</span>
                    <span className="px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-200 font-bold">
                      {safePage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage(totalPages)}
                      className={`h-8 px-2.5 rounded-full ${safePage === totalPages ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-white/5 text-slate-300'}`}
                    >
                      {totalPages}
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="min-h-[38px] px-4 rounded-full border border-white/15 bg-white/5 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-40 inline-flex items-center gap-1"
                  >
                    <span>{isAr ? 'التالي' : 'Next'}</span>
                    <ChevronRight className={`h-4 w-4 ${isAr ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              )}
            </div>

            {/* Right Selected Exercise Video Demo + Proper Form Guide + Logger */}
            <div className="lg:col-span-6 space-y-5">
              <div className="glass-panel-elevated rounded-[28px] p-5 sm:p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-amber-300 font-semibold">
                      {selectedExercise.discipline} · {selectedExercise.muscleGroup} · {selectedExercise.equipment}
                    </p>
                    <h2 className="text-lg sm:text-xl font-extrabold text-white mt-0.5">
                      {isAr ? selectedExercise.nameAr : selectedExercise.name}
                    </h2>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400/15 text-amber-300 shrink-0">
                    <Dumbbell className="h-5 w-5" />
                  </span>
                </div>

                {/* Live Interactive Video Player */}
                <ExerciseFormPlayer
                  exercise={selectedExercise}
                  language={language}
                  compact
                  onExpandModal={() => setVideoModalExercise(selectedExercise)}
                />

                {/* Quick Log Form */}
                <form onSubmit={handleLogSet} className="pt-4 border-t border-white/10 space-y-3.5">
                  <div className="grid grid-cols-3 gap-3">
                    <label className="space-y-1 block">
                      <span className="text-xs text-slate-400">{t.workouts.sets}</span>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={sets}
                        onChange={(e) => setSets(Number(e.target.value))}
                        className="min-h-[44px] w-full rounded-2xl border border-white/15 bg-black/60 px-3 text-sm font-mono-tabular text-white focus:border-amber-400 focus:outline-none"
                      />
                    </label>
                    <label className="space-y-1 block">
                      <span className="text-xs text-slate-400">{t.workouts.reps}</span>
                      <input
                        type="number"
                        min={1}
                        max={300}
                        value={reps}
                        onChange={(e) => setReps(Number(e.target.value))}
                        className="min-h-[44px] w-full rounded-2xl border border-white/15 bg-black/60 px-3 text-sm font-mono-tabular text-white focus:border-amber-400 focus:outline-none"
                      />
                    </label>
                    <label className="space-y-1 block">
                      <span className="text-xs text-slate-400">{t.workouts.weightKg}</span>
                      <input
                        type="number"
                        min={0}
                        max={1000}
                        step="0.5"
                        value={weightKg}
                        onChange={(e) => setWeightKg(Number(e.target.value))}
                        className="min-h-[44px] w-full rounded-2xl border border-white/15 bg-black/60 px-3 text-sm font-mono-tabular text-white focus:border-amber-400 focus:outline-none"
                      />
                    </label>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="text"
                      maxLength={200}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={isAr ? 'ملاحظات التمرين (مثال: أداء بطيء ممتاز)' : 'RPE 8 · controlled eccentric'}
                      className="min-h-[44px] flex-1 rounded-full border border-white/15 bg-black/60 px-4 text-sm text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="min-h-[44px] px-6 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 text-slate-950 font-extrabold text-xs sm:text-sm hover:opacity-95 active:scale-[0.98] transition-all shrink-0"
                    >
                      <Plus className="h-4 w-4 shrink-0" />
                      <span>{t.workouts.saveLog}</span>
                    </button>
                  </div>

                  {logSavedToast && (
                    <p className="text-xs text-amber-300 font-medium text-center">
                      {isAr ? '✓ تم حفظ مجموعتك في سجل ELARB.' : '✓ Working set saved to your ELARB logbook.'}
                    </p>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Weekly AI Split Planner */}
      <section className="glass-panel rounded-[28px] p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-300 shrink-0" />
              <span>{t.workouts.aiPlanTitle}</span>
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              {isAr
                ? 'رتّب جدول أسبوعي مخصص حسب أيام تفرغك والمعدات المتاحة معاك في الجيم.'
                : 'Draft a custom weekly training split matched to your days, experience, and equipment.'}
            </p>
          </div>
          <button
            type="button"
            disabled={aiLoading}
            onClick={handleGeneratePlan}
            className="min-h-[46px] px-6 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 text-slate-950 text-sm font-extrabold hover:opacity-95 disabled:opacity-60 transition-all whitespace-nowrap shrink-0"
          >
            {aiLoading ? t.workouts.generating : t.workouts.generatePlan}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="space-y-1 block">
            <span className="text-xs text-slate-400">{t.workouts.daysPerWeek}</span>
            <select
              value={aiDays}
              onChange={(e) => setAiDays(Number(e.target.value))}
              className="min-h-[44px] w-full rounded-full border border-white/15 bg-black/50 px-4 text-sm text-white"
            >
              {[3, 4, 5, 6].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 block">
            <span className="text-xs text-slate-400">{t.workouts.level}</span>
            <select
              value={aiLevel}
              onChange={(e) => setAiLevel(e.target.value)}
              className="min-h-[44px] w-full rounded-full border border-white/15 bg-black/50 px-4 text-sm text-white"
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </label>
          <label className="space-y-1 block">
            <span className="text-xs text-slate-400">{t.workouts.equipment}</span>
            <select
              value={aiEquipment}
              onChange={(e) => setAiEquipment(e.target.value)}
              className="min-h-[44px] w-full rounded-full border border-white/15 bg-black/50 px-4 text-sm text-white"
            >
              <option value="Full Gym">Full Gym</option>
              <option value="Dumbbells Only">Dumbbells Only</option>
              <option value="Bodyweight & Rings">Bodyweight & Rings</option>
            </select>
          </label>
        </div>

        {aiError && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
            {aiError}
          </div>
        )}

        {aiPlan && (
          <div className="space-y-4 pt-2 border-t border-white/10">
            <div>
              <h3 className="text-base font-bold text-amber-300">{aiPlan.planTitle}</h3>
              <p className="text-xs text-slate-300 mt-1">{aiPlan.weeklySummary}</p>
              <p className="text-xs text-sky-300 mt-1">{aiPlan.safetyTip}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aiPlan.days?.map((day) => (
                <div key={day.dayLabel} className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm font-semibold text-white">
                    <span>{day.dayLabel}</span>
                    <span className="text-xs text-sky-300">{day.focus}</span>
                  </div>
                  <div className="divide-y divide-white/10">
                    {day.exercises?.map((item, idx) => (
                      <div key={idx} className="py-1.5 flex items-center justify-between text-xs gap-2">
                        <span className="text-slate-200 truncate">{item.name}</span>
                        <span className="font-mono-tabular text-slate-400 shrink-0">
                          {item.sets}×{item.reps} · {item.restSec}s
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Fullscreen Exercise Demo Video Modal */}
      <ExerciseVideoModal
        exercise={videoModalExercise}
        language={language}
        onClose={() => setVideoModalExercise(null)}
      />
    </div>
  );
};
