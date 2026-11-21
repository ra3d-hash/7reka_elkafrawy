import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Timer,
  Video,
} from 'lucide-react';
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

  const [viewMode, setViewMode] = useState<'programs' | 'library' | 'planner'>('programs');
  const [discipline, setDiscipline] = useState<'All' | Discipline>('All');
  const [muscleFilter, setMuscleFilter] = useState('All');
  const [equipmentFilter, setEquipmentFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseItem>(BUILTIN_EXERCISES[0]);
  const [videoModalExercise, setVideoModalExercise] = useState<FormDemoPayload | null>(null);

  const activeProgram = useMemo(
    () => READY_TRAINING_PROGRAMS.find((p) => p.id === profile.activeProgramId) ?? READY_TRAINING_PROGRAMS[0],
    [profile.activeProgramId]
  );
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(1);
  const [weightOverrides, setWeightOverrides] = useState<Record<string, number>>({});
  const [loggedTodayToast, setLoggedTodayToast] = useState<string | null>(null);
  const [batchLogging, setBatchLogging] = useState(false);

  const [sets, setSets] = useState(4);
  const [reps, setReps] = useState(8);
  const [weightKg, setWeightKg] = useState(80);
  const [notes, setNotes] = useState('');
  const [logSavedToast, setLogSavedToast] = useState(false);

  const [timerPreset, setTimerPreset] = useState(90);
  const [secondsLeft, setSecondsLeft] = useState(90);
  const [timerRunning, setTimerRunning] = useState(false);

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
    <div className="space-y-4">
      {/* Native Segmented Mode Control */}
      <div className="grid grid-cols-3 rounded-2xl bg-[#111318] border border-white/[0.08] p-1">
        {(
          [
            { id: 'programs' as const, labelAr: 'الأنظمة الجاهزة', labelEn: 'Splits (10)' },
            { id: 'library' as const, labelAr: `المكتبة (${allExercises.length.toLocaleString('en-US')})`, labelEn: '22k+ Library' },
            { id: 'planner' as const, labelAr: 'مخطط AI', labelEn: 'AI Split' },
          ] as const
        ).map((tab) => {
          const active = viewMode === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setViewMode(tab.id)}
              className={`min-h-[40px] px-2 rounded-xl text-xs font-bold transition-colors truncate ${
                active ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              {isAr ? tab.labelAr : tab.labelEn}
            </button>
          );
        })}
      </div>

      {/* Compact Sticky-style Rest Timer + Discipline Filter */}
      <div className="app-card rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Scrollable Discipline Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {DISCIPLINES.map((d) => {
            const active = discipline === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDiscipline(d)}
                className={`min-h-[34px] px-3.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-white text-slate-950'
                    : 'bg-[#181b22] text-slate-300 hover:text-white'
                }`}
              >
                {d === 'All' ? t.workouts.allDisciplines : d}
              </button>
            );
          })}
        </div>

        {/* Inline Rest Timer HUD */}
        <div className="flex items-center justify-between gap-2 rounded-xl bg-[#0c0e14] border border-white/[0.08] px-3 py-1.5 shrink-0">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-sky-400 shrink-0" />
            <span dir="ltr" className="text-sm font-extrabold font-mono-tabular text-white">
              {mm}:{ss}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {[60, 90, 120].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => {
                  setTimerPreset(sec);
                  setSecondsLeft(sec);
                  setTimerRunning(false);
                }}
                className={`h-7 px-2 rounded-lg text-[11px] font-mono-tabular font-bold ${
                  timerPreset === sec ? 'bg-sky-400 text-slate-950' : 'bg-white/[0.06] text-slate-300'
                }`}
              >
                {sec}s
              </button>
            ))}
            <button
              type="button"
              onClick={() => setTimerRunning((r) => !r)}
              className="h-7 w-7 flex items-center justify-center rounded-lg bg-amber-400 text-slate-950"
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
              className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/[0.06] text-slate-300"
              aria-label={t.workouts.reset}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'programs' && (
        <div className="space-y-4">
          {/* Ready Training Systems (Horizontal Snap Cards on Mobile, Grid on Desktop) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-0.5">
              <h2 className="text-sm font-bold text-white">
                {isAr ? `الأنظمة الجاهزة (${filteredPrograms.length})` : `Ready Splits (${filteredPrograms.length})`}
              </h2>
              <span className="text-[11px] text-slate-400">
                {isAr ? 'اختر نظام للتفعيل' : 'Tap to load'}
              </span>
            </div>

            <div className="flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-3 overflow-x-auto md:overflow-visible snap-x no-scrollbar pb-1">
              {filteredPrograms.map((prog) => {
                const isSelected = prog.id === activeProgram.id;
                return (
                  <button
                    key={prog.id}
                    type="button"
                    onClick={() => {
                      setActiveProgram(prog.id);
                      setSelectedDayIndex(1);
                    }}
                    className={`min-w-[260px] md:min-w-0 snap-start text-start rounded-2xl p-4 transition-colors flex flex-col justify-between gap-2.5 ${
                      isSelected
                        ? 'app-card-elevated border-amber-400/60'
                        : 'app-card hover:bg-[#161922]'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="font-semibold text-sky-400">
                          {prog.discipline} · {prog.daysPerWeek}d
                        </span>
                        {isSelected ? (
                          <span className="inline-flex items-center gap-1 text-amber-300 font-bold">
                            <Check className="h-3 w-3" />
                            <span>{isAr ? 'مفعل' : 'Active'}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono-tabular">{prog.sessionMinutes}m</span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-white leading-snug">
                        {isAr ? prog.titleAr : prog.titleEn}
                      </h3>
                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        {isAr ? prog.taglineAr : prog.taglineEn}
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-400 pt-2 border-t border-white/[0.06]">
                      {isAr ? prog.equipmentAr : prog.equipmentEn}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Working Schedule Panel */}
          <section className="app-card rounded-2xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                  <CalendarCheck className="h-3.5 w-3.5" />
                  <span>{isAr ? 'جدولك الأسبوعي الحالي' : 'Active Weekly Split'}</span>
                </p>
                <h2 className="text-base sm:text-lg font-extrabold text-white truncate mt-0.5">
                  {isAr ? activeProgram.titleAr : activeProgram.titleEn}
                </h2>
              </div>

              {!currentDay.isRest && (
                <button
                  type="button"
                  disabled={batchLogging}
                  onClick={handleLogWholeDay}
                  className="min-h-[42px] px-4 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-extrabold hover:bg-amber-300 shrink-0 disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>
                    {batchLogging
                      ? isAr
                        ? 'جاري التسجيل...'
                        : 'Logging...'
                      : isAr
                      ? 'إنهاء وتسجيل اليوم كامل'
                      : 'Complete Whole Day'}
                  </span>
                </button>
              )}
            </div>

            {/* Day 1..7 Horizontal Chips */}
            <div className="px-4 py-3 border-b border-white/[0.07] flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-[#0c0e14]">
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
                    className={`min-h-[36px] px-3.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 transition-colors ${
                      active
                        ? 'bg-amber-400 text-slate-950'
                        : day.isRest
                        ? 'bg-white/[0.03] text-slate-400'
                        : 'bg-[#161922] text-slate-200'
                    }`}
                  >
                    {allDayDone && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
                    <span>{isAr ? `يوم ${day.dayIndex}` : `Day ${day.dayIndex}`}</span>
                    {day.isRest && <span className="opacity-70">· {isAr ? 'راحة' : 'Rest'}</span>}
                  </button>
                );
              })}
            </div>

            {loggedTodayToast && (
              <div className="mx-4 mt-3 rounded-xl border border-amber-400/35 bg-amber-400/10 px-3.5 py-2 text-xs font-semibold text-amber-200 text-center">
                ✓ {isAr ? `تم تسجيل "${loggedTodayToast}"` : `Logged "${loggedTodayToast}"`}
              </div>
            )}

            <div className="p-4 sm:px-5 sm:py-3 border-b border-white/[0.07] flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  {isAr ? currentDay.dayNameAr : currentDay.dayNameEn}
                </h3>
                <p className="text-xs text-sky-400">{isAr ? currentDay.focusAr : currentDay.focusEn}</p>
              </div>
              <span className="text-xs font-mono-tabular text-slate-400">
                {currentDay.isRest
                  ? isAr
                    ? 'استشفاء'
                    : 'Rest'
                  : `${currentDay.exercises.length} ${isAr ? 'تمارين' : 'lifts'}`}
              </span>
            </div>

            {currentDay.isRest ? (
              <div className="p-8 text-center space-y-1.5">
                <p className="text-sm font-bold text-amber-300">
                  {isAr ? 'يوم راحة واستشفاء عضلي' : 'Active Recovery Day'}
                </p>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  {isAr
                    ? 'العضلات تنمو أثناء الراحة والنوم. التزم بالبروتين وشرب 3.5 لتر مياه.'
                    : 'Muscles recover while resting. Hit protein targets and stay hydrated.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.07]">
                {currentDay.exercises.map((ex, idx) => {
                  const displayName = isAr ? ex.nameAr : ex.name;
                  const alreadyDone = todayLoggedNames.has(displayName);
                  const weightVal = weightOverrides[ex.id] ?? ex.suggestedWeightKg;

                  return (
                    <div
                      key={ex.id}
                      className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${
                        alreadyDone ? 'bg-amber-400/[0.06]' : ''
                      }`}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono-tabular text-xs font-extrabold text-amber-400">
                            0{idx + 1}
                          </span>
                          <h4 className="text-sm font-bold text-white truncate">{displayName}</h4>
                          <span className="text-[11px] text-slate-400 shrink-0">· {ex.muscleGroup}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {isAr ? ex.cueAr : ex.cueEn}
                        </p>
                        <p dir="ltr" className="text-xs font-mono-tabular text-sky-400 text-start">
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
                          className="h-9 px-3 inline-flex items-center gap-1.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-xs font-semibold text-amber-300 hover:bg-white/10"
                        >
                          <Video className="h-3.5 w-3.5" />
                          <span>{isAr ? 'فيديو' : 'Video'}</span>
                        </button>

                        <label className="h-9 inline-flex items-center gap-1 rounded-xl border border-white/[0.1] bg-[#0c0e14] px-2.5 text-xs">
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
                            className="w-12 bg-transparent text-white font-mono-tabular font-bold focus:outline-none text-center"
                          />
                          <span className="text-slate-400 text-[11px]">kg</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => startRestCountdown(ex.restSec)}
                          className="h-9 px-2.5 inline-flex items-center gap-1 rounded-xl bg-sky-500/15 border border-sky-400/25 text-xs font-semibold text-sky-300"
                        >
                          <Timer className="h-3.5 w-3.5" />
                          <span>{ex.restSec}s</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleLogProgramExercise(ex)}
                          className={`h-9 px-3.5 inline-flex items-center gap-1 rounded-xl text-xs font-bold ${
                            alreadyDone
                              ? 'bg-amber-400/20 border border-amber-400/40 text-amber-200'
                              : 'bg-amber-400 text-slate-950'
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>{alreadyDone ? (isAr ? 'تم' : 'Done') : isAr ? 'سجّل' : 'Log'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {viewMode === 'library' && (
        <div className="space-y-4">
          {/* Search + Dropdowns */}
          <div className="app-card rounded-2xl p-3.5 space-y-2.5">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
              <div className="md:col-span-6 relative">
                <Search className="h-4 w-4 text-slate-400 absolute top-1/2 -translate-y-1/2 left-3" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.workouts.searchPlaceholder}
                  className="min-h-[42px] w-full rounded-xl border border-white/[0.1] bg-[#0c0e14] pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <select
                value={muscleFilter}
                onChange={(e) => setMuscleFilter(e.target.value)}
                aria-label="Muscle Group Filter"
                className="md:col-span-3 min-h-[42px] rounded-xl border border-white/[0.1] bg-[#0c0e14] px-3 text-xs text-white"
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
                className="md:col-span-3 min-h-[42px] rounded-xl border border-white/[0.1] bg-[#0c0e14] px-3 text-xs text-white"
              >
                {equipmentOptions.map((eq) => (
                  <option key={eq} value={eq}>
                    {eq === 'All' ? (isAr ? 'كل المعدات' : 'All Equipment') : eq}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5 font-mono-tabular">
              <span className="text-amber-300 font-semibold">
                {filteredExercises.length.toLocaleString('en-US')} {isAr ? 'تمرين متاح' : 'exercises'}
              </span>
              <span dir="ltr">
                {safePage} / {totalPages}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Exercise List */}
            <div className="lg:col-span-6 app-card rounded-2xl overflow-hidden">
              <div className="divide-y divide-white/[0.07] max-h-[540px] overflow-y-auto">
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
                      className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        active ? 'bg-amber-400/10' : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-bold truncate ${active ? 'text-amber-300' : 'text-white'}`}>
                          {isAr ? ex.nameAr : ex.name}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {ex.discipline} · {ex.muscleGroup} · {ex.equipment}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedExercise(ex);
                          setVideoModalExercise(ex);
                        }}
                        className="h-8 px-2.5 inline-flex items-center gap-1 rounded-lg bg-white/[0.06] text-[11px] font-bold text-amber-300 shrink-0"
                      >
                        <Video className="h-3.5 w-3.5" />
                        <span>{isAr ? 'فيديو' : 'Video'}</span>
                      </button>
                    </div>
                  );
                })}
                {paginatedExercises.length === 0 && (
                  <p className="p-8 text-center text-xs text-slate-400">
                    {isAr ? 'مفيش تمرين مطابق للبحث.' : 'No matching exercises found.'}
                  </p>
                )}
              </div>

              {totalPages > 1 && (
                <div className="border-t border-white/[0.08] bg-[#0c0e14] p-2.5 flex items-center justify-between">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-9 px-3 rounded-xl bg-white/[0.06] text-xs font-bold text-white disabled:opacity-40 inline-flex items-center gap-1"
                  >
                    <ChevronLeft className={`h-4 w-4 ${isAr ? 'rotate-180' : ''}`} />
                    <span>{isAr ? 'السابق' : 'Prev'}</span>
                  </button>

                  <span dir="ltr" className="text-xs font-mono-tabular text-amber-300 font-bold">
                    {safePage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="h-9 px-3 rounded-xl bg-white/[0.06] text-xs font-bold text-white disabled:opacity-40 inline-flex items-center gap-1"
                  >
                    <span>{isAr ? 'التالي' : 'Next'}</span>
                    <ChevronRight className={`h-4 w-4 ${isAr ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              )}
            </div>

            {/* Selected Exercise Form Player & Quick Set Logger */}
            <div className="lg:col-span-6 app-card-elevated rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-amber-300">
                    {selectedExercise.discipline} · {selectedExercise.muscleGroup}
                  </p>
                  <h2 className="text-base sm:text-lg font-extrabold text-white truncate">
                    {isAr ? selectedExercise.nameAr : selectedExercise.name}
                  </h2>
                </div>
                <Dumbbell className="h-5 w-5 text-amber-400 shrink-0" />
              </div>

              <ExerciseFormPlayer
                exercise={selectedExercise}
                language={language}
                compact
                onExpandModal={() => setVideoModalExercise(selectedExercise)}
              />

              <form onSubmit={handleLogSet} className="pt-3 border-t border-white/[0.08] space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <label className="space-y-1 block">
                    <span className="text-[11px] text-slate-400">{t.workouts.sets}</span>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={sets}
                      onChange={(e) => setSets(Number(e.target.value))}
                      className="min-h-[40px] w-full rounded-xl border border-white/[0.1] bg-[#0c0e14] px-2.5 text-sm font-mono-tabular text-white text-center"
                    />
                  </label>
                  <label className="space-y-1 block">
                    <span className="text-[11px] text-slate-400">{t.workouts.reps}</span>
                    <input
                      type="number"
                      min={1}
                      max={300}
                      value={reps}
                      onChange={(e) => setReps(Number(e.target.value))}
                      className="min-h-[40px] w-full rounded-xl border border-white/[0.1] bg-[#0c0e14] px-2.5 text-sm font-mono-tabular text-white text-center"
                    />
                  </label>
                  <label className="space-y-1 block">
                    <span className="text-[11px] text-slate-400">{t.workouts.weightKg}</span>
                    <input
                      type="number"
                      min={0}
                      max={1000}
                      step="0.5"
                      value={weightKg}
                      onChange={(e) => setWeightKg(Number(e.target.value))}
                      className="min-h-[40px] w-full rounded-xl border border-white/[0.1] bg-[#0c0e14] px-2.5 text-sm font-mono-tabular text-white text-center"
                    />
                  </label>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={200}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t.workouts.notes}
                    className="min-h-[42px] flex-1 rounded-xl border border-white/[0.1] bg-[#0c0e14] px-3 text-xs text-white placeholder:text-slate-500"
                  />
                  <button
                    type="submit"
                    className="min-h-[42px] px-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 text-slate-950 font-extrabold text-xs shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{t.workouts.saveLog}</span>
                  </button>
                </div>

                {logSavedToast && (
                  <p className="text-xs text-amber-300 font-semibold text-center">
                    ✓ {isAr ? 'تم حفظ التمرين في سجلك' : 'Working set saved'}
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'planner' && (
        <section className="app-card rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-amber-400" />
                <span>{t.workouts.aiPlanTitle}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr
                  ? 'صمم جدول أسبوعي مخصص لأيامك ومعداتك.'
                  : 'Generate a weekly split tailored to your days and gear.'}
              </p>
            </div>
            <button
              type="button"
              disabled={aiLoading}
              onClick={handleGeneratePlan}
              className="min-h-[42px] px-5 rounded-xl bg-amber-400 text-slate-950 text-xs font-extrabold disabled:opacity-60 shrink-0"
            >
              {aiLoading ? t.workouts.generating : t.workouts.generatePlan}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <label className="space-y-1 block">
              <span className="text-[11px] text-slate-400">{t.workouts.daysPerWeek}</span>
              <select
                value={aiDays}
                onChange={(e) => setAiDays(Number(e.target.value))}
                className="min-h-[42px] w-full rounded-xl border border-white/[0.1] bg-[#0c0e14] px-3 text-sm text-white"
              >
                {[3, 4, 5, 6].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 block">
              <span className="text-[11px] text-slate-400">{t.workouts.level}</span>
              <select
                value={aiLevel}
                onChange={(e) => setAiLevel(e.target.value)}
                className="min-h-[42px] w-full rounded-xl border border-white/[0.1] bg-[#0c0e14] px-3 text-sm text-white"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </label>
            <label className="space-y-1 block">
              <span className="text-[11px] text-slate-400">{t.workouts.equipment}</span>
              <select
                value={aiEquipment}
                onChange={(e) => setAiEquipment(e.target.value)}
                className="min-h-[42px] w-full rounded-xl border border-white/[0.1] bg-[#0c0e14] px-3 text-sm text-white"
              >
                <option value="Full Gym">Full Gym</option>
                <option value="Dumbbells Only">Dumbbells Only</option>
                <option value="Bodyweight & Rings">Bodyweight & Rings</option>
              </select>
            </label>
          </div>

          {aiError && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
              {aiError}
            </div>
          )}

          {aiPlan && (
            <div className="space-y-3 pt-3 border-t border-white/[0.08]">
              <div>
                <h3 className="text-sm font-bold text-amber-300">{aiPlan.planTitle}</h3>
                <p className="text-xs text-slate-300 mt-1">{aiPlan.weeklySummary}</p>
                <p className="text-xs text-sky-400 mt-1">{aiPlan.safetyTip}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {aiPlan.days?.map((day) => (
                  <div key={day.dayLabel} className="rounded-xl border border-white/[0.08] bg-[#0c0e14] p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-white">
                      <span>{day.dayLabel}</span>
                      <span className="text-sky-400">{day.focus}</span>
                    </div>
                    <div className="divide-y divide-white/[0.06]">
                      {day.exercises?.map((item, idx) => (
                        <div key={idx} className="py-1.5 flex items-center justify-between text-xs gap-2">
                          <span className="text-slate-200 truncate">{item.name}</span>
                          <span dir="ltr" className="font-mono-tabular text-slate-400 shrink-0">
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
      )}

      <ExerciseVideoModal
        exercise={videoModalExercise}
        language={language}
        onClose={() => setVideoModalExercise(null)}
      />
    </div>
  );
};
