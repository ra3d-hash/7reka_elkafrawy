import React, { useMemo, useState } from 'react';
import { BarChart3, Plus, Ruler, Trophy } from 'lucide-react';
import { getCopy } from '../lib/i18n';
import { useFitness } from './FirebaseProvider';
import type { Language } from '../types/fitness';

export const ProgressAnalyticsView: React.FC<{ language: Language }> = ({ language }) => {
  const t = getCopy(language);
  const { measurements, meals, prs, addBodyMeasurement, addPersonalRecord } = useFitness();

  const [weightKg, setWeightKg] = useState(78.5);
  const [bodyFatPct, setBodyFatPct] = useState(14.2);
  const [waistCm, setWaistCm] = useState(81);
  const [chestCm, setChestCm] = useState(104);
  const [armCm, setArmCm] = useState(38.5);

  const [prExercise, setPrExercise] = useState('Barbell Flat Bench Press');
  const [prWeight, setPrWeight] = useState(110);
  const [prReps, setPrReps] = useState(5);

  const dailyCalories = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of meals) {
      map.set(m.loggedDate, (map.get(m.loggedDate) || 0) + m.calories);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7);
  }, [meals]);

  const weightSeries = useMemo(() => measurements.slice(-8), [measurements]);

  const handleSaveMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    await addBodyMeasurement({ weightKg, bodyFatPct, waistCm, chestCm, armCm });
  };

  const handleSavePr = async (e: React.FormEvent) => {
    e.preventDefault();
    await addPersonalRecord({ exerciseName: prExercise, weightKg: prWeight, reps: prReps });
  };

  // Compute SVG polyline points for weight trend
  const weightChart = useMemo(() => {
    if (weightSeries.length === 0) return null;
    const minW = Math.min(...weightSeries.map((d) => d.weightKg)) - 2;
    const maxW = Math.max(...weightSeries.map((d) => d.weightKg)) + 2;
    const span = Math.max(1, maxW - minW);
    const width = 360;
    const height = 140;
    const pts = weightSeries.map((d, i) => {
      const x = weightSeries.length === 1 ? width / 2 : 20 + (i / (weightSeries.length - 1)) * (width - 40);
      const y = height - 20 - ((d.weightKg - minW) / span) * (height - 40);
      return { x, y, label: d.recordedDate.slice(5), value: d.weightKg };
    });
    return { width, height, pts, polyline: pts.map((p) => `${p.x},${p.y}`).join(' ') };
  }, [weightSeries]);

  const maxCal = Math.max(2500, ...dailyCalories.map(([, c]) => c));

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl glass-panel border border-white/10">
        <img
          src="/src/assets/images/bg_recovery_lounge_1794753825056.jpg"
          alt="ELARB Performance Analytics Lounge"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07060b]/95 via-[#07060b]/75 to-[#07060b]/55" />
        <div className="relative z-10 p-6 sm:p-7 space-y-1.5">
          <p className="text-xs font-semibold text-amber-300">ELARB Biometric & Strength Vault</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">{t.progress.title}</h1>
          <p className="text-sm text-slate-200/90 max-w-2xl">{t.progress.subtitle}</p>
        </div>
      </section>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Ruler className="h-4 w-4 text-amber-300 shrink-0" />
              <span>{t.progress.weightTrend}</span>
            </h2>
            <span className="text-xs font-mono-tabular text-slate-400">
              {weightSeries.length > 0 ? `${weightSeries[weightSeries.length - 1].weightKg} kg` : '—'}
            </span>
          </div>

          {weightChart ? (
            <svg viewBox={`0 0 ${weightChart.width} ${weightChart.height}`} className="w-full h-40 overflow-visible">
              <polyline
                fill="none"
                stroke="#fbbf24"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={weightChart.polyline}
              />
              {weightChart.pts.map((p, idx) => (
                <g key={idx}>
                  <circle cx={p.x} cy={p.y} r="4.5" fill="#07060b" stroke="#fbbf24" strokeWidth="2.5" />
                  <text x={p.x} y={p.y - 10} textAnchor="middle" fill="#cbd5e1" fontSize="10" className="font-mono-tabular">
                    {p.value}
                  </text>
                  <text x={p.x} y={weightChart.height - 2} textAnchor="middle" fill="#64748b" fontSize="9">
                    {p.label}
                  </text>
                </g>
              ))}
            </svg>
          ) : (
            <div className="h-40 flex items-center justify-center rounded-xl border border-slate-800/80 bg-slate-950/50 text-xs text-slate-400">
              {language === 'ar'
                ? 'سجل أول قياس وزن لعرض الرسم البياني.'
                : 'Log your first body measurement below to render the weight trend chart.'}
            </div>
          )}
        </section>

        <section className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-sky-300 shrink-0" />
              <span>{t.progress.calorieTrend}</span>
            </h2>
            <span className="text-xs font-mono-tabular text-slate-400">7-Day Window</span>
          </div>

          {dailyCalories.length > 0 ? (
            <div className="h-40 flex items-end justify-around gap-3 pt-4 px-2">
              {dailyCalories.map(([date, kcal]) => {
                const hPct = Math.max(10, Math.round((kcal / maxCal) * 100));
                return (
                  <div key={date} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-[10px] font-mono-tabular text-sky-300">{kcal}</span>
                    <div
                      className="w-full max-w-[36px] rounded-t-lg bg-gradient-to-t from-amber-400/80 to-sky-400/90"
                      style={{ height: `${hPct}%` }}
                    />
                    <span className="text-[10px] font-mono-tabular text-slate-500">{date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center rounded-xl border border-slate-800/80 bg-slate-950/50 text-xs text-slate-400">
              {language === 'ar'
                ? 'سجل وجباتك من ماسح الأكل لعرض منحنى السعرات.'
                : 'Log meals in Nutrition AI to chart your daily calorie intake.'}
            </div>
          )}
        </section>
      </div>

      {/* Forms & PR Vault */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form onSubmit={handleSaveMeasurement} className="lg:col-span-5 glass-panel rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white">{t.progress.logMeasurement}</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 block">
              <span className="text-xs text-slate-400">{t.nutrition.weightKg}</span>
              <input
                type="number"
                step="0.1"
                min={20}
                max={400}
                value={weightKg}
                onChange={(e) => setWeightKg(Number(e.target.value))}
                className="min-h-[44px] w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 text-sm font-mono-tabular text-white"
              />
            </label>
            <label className="space-y-1 block">
              <span className="text-xs text-slate-400">{t.progress.bodyFat}</span>
              <input
                type="number"
                step="0.1"
                min={2}
                max={75}
                value={bodyFatPct}
                onChange={(e) => setBodyFatPct(Number(e.target.value))}
                className="min-h-[44px] w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 text-sm font-mono-tabular text-white"
              />
            </label>
            <label className="space-y-1 block">
              <span className="text-xs text-slate-400">{t.progress.waist}</span>
              <input
                type="number"
                step="0.5"
                min={30}
                max={250}
                value={waistCm}
                onChange={(e) => setWaistCm(Number(e.target.value))}
                className="min-h-[44px] w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 text-sm font-mono-tabular text-white"
              />
            </label>
            <label className="space-y-1 block">
              <span className="text-xs text-slate-400">{t.progress.chest}</span>
              <input
                type="number"
                step="0.5"
                min={40}
                max={250}
                value={chestCm}
                onChange={(e) => setChestCm(Number(e.target.value))}
                className="min-h-[44px] w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 text-sm font-mono-tabular text-white"
              />
            </label>
            <label className="space-y-1 block col-span-2">
              <span className="text-xs text-slate-400">{t.progress.arm}</span>
              <input
                type="number"
                step="0.5"
                min={15}
                max={100}
                value={armCm}
                onChange={(e) => setArmCm(Number(e.target.value))}
                className="min-h-[44px] w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 text-sm font-mono-tabular text-white"
              />
            </label>
          </div>
          <button
            type="submit"
            className="w-full min-h-[46px] rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 text-slate-950 text-sm font-bold hover:opacity-95 transition-all"
          >
            {t.progress.saveMeasurement}
          </button>
        </form>

        <section className="lg:col-span-7 glass-panel-elevated rounded-[28px] p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-400 shrink-0" />
              <span>{t.progress.prVault}</span>
            </h2>
            <span className="text-xs font-mono-tabular text-slate-400">Epley 1RM Formula</span>
          </div>

          <form onSubmit={handleSavePr} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <input
              type="text"
              required
              value={prExercise}
              onChange={(e) => setPrExercise(e.target.value)}
              placeholder="Exercise Name"
              className="sm:col-span-6 min-h-[44px] rounded-full border border-white/15 bg-slate-950/80 px-4 text-sm text-white"
            />
            <input
              type="number"
              step="0.5"
              min={0}
              max={1000}
              value={prWeight}
              onChange={(e) => setPrWeight(Number(e.target.value))}
              aria-label="PR Weight kg"
              className="sm:col-span-2 min-h-[44px] rounded-full border border-white/15 bg-slate-950/80 px-3 text-sm font-mono-tabular text-white text-center"
            />
            <input
              type="number"
              min={1}
              max={200}
              value={prReps}
              onChange={(e) => setPrReps(Number(e.target.value))}
              aria-label="PR Reps"
              className="sm:col-span-2 min-h-[44px] rounded-full border border-white/15 bg-slate-950/80 px-3 text-sm font-mono-tabular text-white text-center"
            />
            <button
              type="submit"
              className="sm:col-span-2 min-h-[44px] inline-flex items-center justify-center gap-1 rounded-full bg-sky-400 text-slate-950 text-xs font-bold hover:bg-sky-300 transition-colors"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>{t.progress.savePr}</span>
            </button>
          </form>

          <div className="divide-y divide-slate-800/80">
            {prs.map((pr) => (
              <div key={pr.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">{pr.exerciseName}</p>
                  <p className="text-xs text-slate-400 font-mono-tabular">
                    {pr.weightKg} kg × {pr.reps} reps · {pr.achievedDate}
                  </p>
                </div>
                <div className="text-end">
                  <p className="text-base font-bold font-mono-tabular text-amber-300">{pr.estimated1RmKg} kg</p>
                  <p className="text-[11px] text-slate-400">{t.progress.est1rm}</p>
                </div>
              </div>
            ))}
            {prs.length === 0 && (
              <p className="py-6 text-center text-xs text-slate-400">
                {language === 'ar' ? 'لم تسجل أرقاماً قياسية بعد.' : 'No Personal Records stored yet.'}
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
