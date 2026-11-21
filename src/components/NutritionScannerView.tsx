import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Calculator,
  Camera,
  Check,
  CheckCircle2,
  Droplets,
  ShieldCheck,
  Sparkles,
  Upload,
  Utensils,
} from 'lucide-react';
import { motion } from 'motion/react';
import { READY_DIET_PLANS } from '../data/diets';
import { getCopy } from '../lib/i18n';
import { MEDIA_ASSETS } from '../lib/mediaAssets';
import { useFitness } from './FirebaseProvider';
import type { ActivityLevel, FitnessGoal, FoodAnalysisResult, Language, MealType } from '../types/fitness';

export const NutritionScannerView: React.FC<{ language: Language }> = ({ language }) => {
  const t = getCopy(language);
  const isAr = language === 'ar';
  const { profile, meals, addMealLog, updateTargets, setActiveDiet } = useFitness();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const [subView, setSubView] = useState<'plans' | 'scanner'>('plans');
  const [goalFilter, setGoalFilter] = useState<'all' | FitnessGoal>('all');
  const [planToast, setPlanToast] = useState<string | null>(null);
  const [loggingAll, setLoggingAll] = useState(false);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [mealDescription, setMealDescription] = useState('');
  const [mealType, setMealType] = useState<MealType>('Lunch');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [result, setResult] = useState<FoodAnalysisResult | null>(null);
  const [mealSaved, setMealSaved] = useState(false);

  // BMR / TDEE Planner synced with saved mandatory onboarding metrics
  const [age, setAge] = useState(profile.age || 27);
  const [gender, setGender] = useState<'male' | 'female'>(profile.gender || 'male');
  const [heightCm, setHeightCm] = useState(profile.heightCm || 178);
  const [weightKg, setWeightKg] = useState(profile.weightKg || 78);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(profile.activityLevel);
  const [goal, setGoal] = useState<FitnessGoal>(profile.goal);
  const [targetsSaved, setTargetsSaved] = useState(false);

  useEffect(() => {
    if (profile.heightCm && profile.heightCm >= 100) setHeightCm(profile.heightCm);
    if (profile.weightKg && profile.weightKg >= 30) setWeightKg(profile.weightKg);
    if (profile.age) setAge(profile.age);
    if (profile.gender) setGender(profile.gender);
    setActivityLevel(profile.activityLevel);
    setGoal(profile.goal);
  }, [profile]);

  const activeDiet = useMemo(
    () => READY_DIET_PLANS.find((d) => d.id === profile.activeDietId) ?? READY_DIET_PLANS[0],
    [profile.activeDietId]
  );

  const filteredDiets = useMemo(() => {
    if (goalFilter === 'all') return READY_DIET_PLANS;
    return READY_DIET_PLANS.filter((d) => d.goalTag === goalFilter);
  }, [goalFilter]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayLoggedMealNames = useMemo(
    () => new Set(meals.filter((m) => m.loggedDate === todayStr).map((m) => m.name)),
    [meals, todayStr]
  );

  const handleLogReadyMeal = async (meal: (typeof activeDiet.meals)[number]) => {
    const mealName = isAr ? meal.nameAr : meal.nameEn;
    await addMealLog({
      name: mealName,
      mealType: meal.mealType,
      calories: meal.calories,
      proteinG: meal.proteinG,
      carbsG: meal.carbsG,
      fatsG: meal.fatsG,
      source: 'manual',
    });
    setPlanToast(
      isAr ? `تمت إضافة "${mealName}" لسعراتك النهارده.` : `Added "${mealName}" to today's log.`
    );
    setTimeout(() => setPlanToast(null), 2500);
  };

  const handleLogAllDietMeals = async () => {
    setLoggingAll(true);
    try {
      for (const meal of activeDiet.meals) {
        const mealName = isAr ? meal.nameAr : meal.nameEn;
        if (todayLoggedMealNames.has(mealName)) continue;
        await addMealLog({
          name: mealName,
          mealType: meal.mealType,
          calories: meal.calories,
          proteinG: meal.proteinG,
          carbsG: meal.carbsG,
          fatsG: meal.fatsG,
          source: 'manual',
        });
      }
      setPlanToast(
        isAr
          ? `تم تسجيل كل وجبات نظام "${activeDiet.titleAr}" في يومك.`
          : `Logged all meals from "${activeDiet.titleEn}" for today.`
      );
      setTimeout(() => setPlanToast(null), 3000);
    } finally {
      setLoggingAll(false);
    }
  };

  const handleApplyDietTargets = async () => {
    await updateTargets({
      goal: activeDiet.goalTag,
      activityLevel: profile.activityLevel,
      targetCalories: activeDiet.totalCalories,
      targetProtein: activeDiet.totalProteinG,
      targetCarbs: activeDiet.totalCarbsG,
      targetFats: activeDiet.totalFatsG,
    });
    setPlanToast(
      isAr
        ? `تم اعتماد ${activeDiet.totalCalories} سعرة كهدفك اليومي.`
        : `Daily target updated to ${activeDiet.totalCalories} kcal.`
    );
    setTimeout(() => setPlanToast(null), 2800);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
    if (!allowed.has(file.type.toLowerCase())) {
      setAnalysisError(
        isAr
          ? 'صيغة الصورة غير مدعومة. استخدم JPEG أو PNG أو WebP.'
          : 'Unsupported image format. Please choose JPEG, PNG, WebP, or HEIC.'
      );
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setAnalysisError(
        isAr
          ? 'حجم الصورة كبير جداً (الحد الأقصى 6 ميجابايت).'
          : 'Image file is too large (max 6 MB).'
      );
      return;
    }
    setMimeType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      setPreviewUrl(dataUrl);
      setImageBase64(dataUrl);
      setResult(null);
      setAnalysisError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleLoadSampleMeal = async () => {
    const samplePath = MEDIA_ASSETS.mealMacroBowl;
    setPreviewUrl(samplePath);
    setMealDescription(
      isAr
        ? 'سلمون مشوي مع كينوا وأفوكادو وإيدامامي'
        : 'Grilled wild salmon macro bowl with tri-color quinoa, avocado, and edamame'
    );
    try {
      const res = await fetch(samplePath);
      const blob = await res.blob();
      setMimeType(blob.type || 'image/jpeg');
      const reader = new FileReader();
      reader.onload = () => {
        setImageBase64(String(reader.result || ''));
      };
      reader.readAsDataURL(blob);
    } catch {
      setImageBase64(null);
    }
  };

  const handleAnalyze = async () => {
    if (!imageBase64 && !mealDescription.trim()) {
      setAnalysisError(
        isAr
          ? 'يرجى رفع صورة الوجبة أو كتابة وصفها أولاً.'
          : 'Upload a meal photo or enter a meal description first.'
      );
      return;
    }

    setAnalyzing(true);
    setAnalysisError(null);
    setMealSaved(false);
    try {
      const res = await fetch('/api/food/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mimeType,
          mealDescription,
          language,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to analyze meal.');
      setResult(data as FoodAnalysisResult);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Unable to analyze meal.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveMeal = async () => {
    if (!result) return;
    await addMealLog({
      name: result.mealName,
      mealType,
      calories: result.calories,
      proteinG: result.proteinG,
      carbsG: result.carbsG,
      fatsG: result.fatsG,
      source: 'ai-scanner',
    });
    setMealSaved(true);
  };

  // Mifflin-St Jeor calculation (NaN-safe clamped inputs)
  const safeWeightKg = Number.isFinite(weightKg) && weightKg > 0 ? Math.min(300, Math.max(35, weightKg)) : 75;
  const safeHeightCm = Number.isFinite(heightCm) && heightCm > 0 ? Math.min(240, Math.max(120, heightCm)) : 175;
  const safeAge = Number.isFinite(age) && age > 0 ? Math.min(95, Math.max(14, age)) : 25;
  const bmr = Math.round(
    10 * safeWeightKg + 6.25 * safeHeightCm - 5 * safeAge + (gender === 'male' ? 5 : -161)
  );
  const multipliers: Record<ActivityLevel, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    athlete: 1.9,
  };
  const tdee = Math.round(bmr * multipliers[activityLevel]);
  const targetCalories =
    goal === 'cut' ? Math.max(1200, tdee - 450) : goal === 'bulk' ? tdee + 300 : tdee;
  const targetProtein = Math.round(safeWeightKg * 2.0);
  const targetFats = Math.round((targetCalories * 0.25) / 9);
  const targetCarbs = Math.max(
    40,
    Math.round((targetCalories - targetProtein * 4 - targetFats * 9) / 4)
  );

  const handleApplyTargets = async () => {
    await updateTargets({
      goal,
      activityLevel,
      targetCalories,
      targetProtein,
      targetCarbs,
      targetFats,
    });
    setTargetsSaved(true);
    setTimeout(() => setTargetsSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Banner Header + Mode Toggle */}
      <section className="relative overflow-hidden rounded-[28px] glass-panel border border-white/10">
        <img
          src={MEDIA_ASSETS.bgNutritionCulinary}
          alt="ELARB Sports Nutrition Culinary Studio"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07060b]/95 via-[#07060b]/75 to-[#07060b]/55" />
        <div className="relative z-10 p-6 sm:p-7 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-amber-300">ELARB Nutrition HUD</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">{t.nutrition.title}</h1>
            <p className="text-sm text-slate-200/90 max-w-2xl">{t.nutrition.subtitle}</p>
          </div>

          <div className="inline-flex items-center rounded-full bg-white/[0.08] border border-white/15 p-1 self-start lg:self-auto backdrop-blur-md">
            {(
              [
                { id: 'plans' as const, labelAr: 'الأنظمة الغذائية الجاهزة', labelEn: 'Ready Diet Plans' },
                { id: 'scanner' as const, labelAr: 'فحص الطبق والحاسبة', labelEn: 'AI Scanner & TDEE' },
              ] as const
            ).map((tab) => {
              const active = subView === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSubView(tab.id)}
                  className={`relative min-h-[38px] px-4 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
                    active ? 'text-slate-950' : 'text-slate-200 hover:text-white'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nutritionSubViewOval"
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
      </section>

      {subView === 'plans' ? (
        <div className="space-y-6">
          {/* Goal Filter Capsules */}
          <div className="glass-panel rounded-[26px] p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1 rounded-full bg-white/[0.04] p-1 border border-white/10">
              {(
                [
                  { id: 'all', labelAr: 'كل الأنظمة (7)', labelEn: 'All Plans (7)' },
                  { id: 'cut', labelAr: 'تنشيف وحرق دهون', labelEn: 'Fat Loss Cut' },
                  { id: 'maintain', labelAr: 'ثبات ومصري اقتصادي', labelEn: 'Balanced & Budget' },
                  { id: 'bulk', labelAr: 'تضخيم وبناء عضل', labelEn: 'Lean Bulk' },
                ] as const
              ).map((f) => {
                const active = goalFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setGoalFilter(f.id)}
                    className={`min-h-[36px] px-4 rounded-full text-xs font-semibold transition-colors ${
                      active
                        ? 'bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 text-slate-950 font-bold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {isAr ? f.labelAr : f.labelEn}
                  </button>
                );
              })}
            </div>

            <span dir="ltr" className="text-xs font-mono-tabular text-slate-300">
              {profile.heightCm ? `${profile.heightCm}cm · ${profile.weightKg}kg` : ''} · {profile.targetCalories} kcal
            </span>
          </div>

          {/* Ready-Made Diet Systems Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDiets.map((diet) => {
              const isSelected = diet.id === activeDiet.id;
              const matchesGoal = diet.goalTag === profile.goal;
              return (
                <button
                  key={diet.id}
                  type="button"
                  onClick={() => setActiveDiet(diet.id)}
                  className={`text-start rounded-[26px] p-5 transition-all flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'glass-panel-elevated ring-1 ring-amber-400/55'
                      : 'glass-panel hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-semibold">
                      <span className="text-sky-300">{isAr ? diet.styleTagAr : diet.styleTagEn}</span>
                      {isSelected ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 text-slate-950 px-2.5 py-0.5 text-[10px] font-extrabold">
                          <Check className="h-3 w-3" />
                          <span>{isAr ? 'مفعل حالياً' : 'Active'}</span>
                        </span>
                      ) : matchesGoal ? (
                        <span className="rounded-full bg-amber-500/15 border border-amber-400/35 text-amber-200 px-2.5 py-0.5 text-[10px]">
                          {isAr ? 'مقترح لهدفك' : 'Recommended'}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="text-base font-bold text-white">{isAr ? diet.titleAr : diet.titleEn}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {isAr ? diet.taglineAr : diet.taglineEn}
                    </p>
                  </div>
                  <div dir="ltr" className="pt-2.5 border-t border-white/10 flex items-center justify-between text-xs font-mono-tabular">
                    <span className="text-amber-300 font-bold">{diet.totalCalories} kcal</span>
                    <span className="text-slate-300">
                      P {diet.totalProteinG}g · C {diet.totalCarbsG}g · F {diet.totalFatsG}g
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Diet Daily Meal Schedule */}
          <section className="glass-panel-elevated rounded-[30px] p-5 sm:p-7 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                  <Utensils className="h-4 w-4" />
                  <span>{isAr ? 'جدول الوجبات اليومي الشغال' : 'Active Daily Meal Plan'}</span>
                  <span className="inline-flex items-center gap-1 text-sky-300">
                    · <Droplets className="h-3.5 w-3.5" /> {activeDiet.hydrationLiters}L
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                  {isAr ? activeDiet.titleAr : activeDiet.titleEn}
                </h2>
                <p dir="ltr" className="text-xs font-mono-tabular text-slate-300 text-start">
                  {activeDiet.totalCalories} kcal · P {activeDiet.totalProteinG}g · C {activeDiet.totalCarbsG}g · F {activeDiet.totalFatsG}g
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleApplyDietTargets}
                  className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/15 px-5 text-xs font-bold text-amber-200 hover:bg-amber-500/25 transition-colors whitespace-nowrap"
                >
                  <Check className="h-4 w-4" />
                  <span>{isAr ? 'اعتماد السعرات كأهدافي' : 'Apply Plan Targets'}</span>
                </button>

                <button
                  type="button"
                  disabled={loggingAll}
                  onClick={handleLogAllDietMeals}
                  className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 px-5 text-xs font-extrabold text-slate-950 hover:opacity-95 transition-all whitespace-nowrap disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    {loggingAll
                      ? isAr
                        ? 'جاري التسجيل...'
                        : 'Logging...'
                      : isAr
                      ? 'تسجيل كل وجبات اليوم'
                      : 'Log Full Day Menu'}
                  </span>
                </button>
              </div>
            </div>

            {planToast && (
              <div className="rounded-full border border-amber-400/40 bg-amber-500/15 px-4 py-2 text-xs font-semibold text-amber-200 text-center">
                ✓ {planToast}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeDiet.meals.map((meal) => {
                const mealName = isAr ? meal.nameAr : meal.nameEn;
                const logged = todayLoggedMealNames.has(mealName);
                return (
                  <div
                    key={meal.id}
                    className={`rounded-[24px] border p-5 flex flex-col justify-between gap-4 transition-colors ${
                      logged
                        ? 'border-amber-400/45 bg-amber-500/10'
                        : 'border-white/10 bg-black/50'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full bg-white/10 px-3 py-0.5 text-[11px] font-bold text-sky-300">
                          {meal.mealType}
                        </span>
                        <span dir="ltr" className="text-sm font-extrabold font-mono-tabular text-amber-300">
                          {meal.calories} kcal
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-white leading-snug">{mealName}</h3>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {isAr ? meal.portionsAr : meal.portionsEn}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                      <span dir="ltr" className="text-xs font-mono-tabular text-slate-300">
                        P {meal.proteinG}g · C {meal.carbsG}g · F {meal.fatsG}g
                      </span>
                      <button
                        type="button"
                        onClick={() => handleLogReadyMeal(meal)}
                        className={`min-h-[38px] inline-flex items-center gap-1.5 rounded-full px-4 text-xs font-bold transition-all shrink-0 ${
                          logged
                            ? 'bg-amber-500/25 border border-amber-400/40 text-amber-200'
                            : 'bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 text-slate-950 hover:opacity-95'
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>
                          {logged
                            ? isAr
                              ? 'سجلتها النهارده'
                              : 'Logged Today'
                            : isAr
                            ? 'سجّل الوجبة'
                            : 'Add to Today'}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      ) : (
        /* AI PLATE PHOTO SCANNER + TDEE CALCULATOR */
        <div className="space-y-6">
          {/* Safe Camera Permission Rationale */}
          <div className="glass-panel rounded-[24px] p-4 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-sky-300">{t.nutrition.cameraRationaleTitle}</p>
              <p className="text-xs text-slate-300 leading-relaxed">{t.nutrition.cameraRationale}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* AI Food Scanner Panel */}
            <section className="lg:col-span-7 glass-panel-elevated rounded-[28px] p-6 space-y-5">
              <div className="flex flex-wrap items-center gap-2.5">
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="min-h-[44px] inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 px-5 py-2 text-xs font-bold text-slate-950 hover:opacity-95 transition-all whitespace-nowrap shrink-0"
                >
                  <Camera className="h-4 w-4 shrink-0" />
                  <span>{t.nutrition.takePhoto}</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[44px] inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-2 text-xs font-semibold text-white hover:bg-white/15 transition-colors whitespace-nowrap shrink-0"
                >
                  <Upload className="h-4 w-4 shrink-0" />
                  <span>{t.nutrition.uploadPhoto}</span>
                </button>
                <button
                  type="button"
                  onClick={handleLoadSampleMeal}
                  className="min-h-[44px] inline-flex items-center gap-2 rounded-full border border-sky-400/40 bg-sky-500/15 px-5 py-2 text-xs font-semibold text-sky-200 hover:bg-sky-500/25 transition-colors whitespace-nowrap shrink-0"
                >
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span>{t.nutrition.useSample}</span>
                </button>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-black/50 overflow-hidden min-h-[220px] flex items-center justify-center">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Meal nutrition scan preview"
                    referrerPolicy="no-referrer"
                    className="max-h-72 w-full object-cover"
                  />
                ) : (
                  <div className="p-8 text-center space-y-2">
                    <Camera className="h-8 w-8 text-slate-500 mx-auto" />
                    <p className="text-xs text-slate-300">
                      {isAr
                        ? 'صوّر طبقك أو اختار وجبة نموذجية عشان نحسب السعرات'
                        : 'Capture your plate, upload an image, or try the sample bowl.'}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={mealDescription}
                  onChange={(e) => setMealDescription(e.target.value)}
                  placeholder={t.nutrition.describeMeal}
                  className="min-h-[44px] flex-1 rounded-full border border-white/15 bg-black/60 px-5 text-sm text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={analyzing}
                  onClick={handleAnalyze}
                  className="min-h-[44px] px-6 rounded-full bg-sky-400 text-slate-950 text-sm font-bold hover:bg-sky-300 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
                >
                  {analyzing ? t.nutrition.analyzing : t.nutrition.analyzeBtn}
                </button>
              </div>

              {analysisError && (
                <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
                  {analysisError}
                </div>
              )}

              {result && (
                <div className="rounded-[24px] border border-amber-500/35 bg-black/60 p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-bold text-white">{result.mealName}</h3>
                      <p className="text-xs text-slate-400">
                        {result.servingSize} · ELARB Nutrition HUD
                      </p>
                    </div>
                    <span dir="ltr" className="text-2xl font-bold font-mono-tabular text-amber-300">
                      {Math.round(result.calories)} kcal
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-3 font-mono-tabular text-center rounded-2xl bg-black/60 p-3 border border-white/10">
                    <div>
                      <p className="text-base font-bold text-amber-300">{Math.round(result.proteinG)}g</p>
                      <p className="text-[11px] text-slate-400">{t.overview.proteinToday}</p>
                    </div>
                    <div>
                      <p className="text-base font-bold text-sky-300">{Math.round(result.carbsG)}g</p>
                      <p className="text-[11px] text-slate-400">{t.overview.carbsToday}</p>
                    </div>
                    <div>
                      <p className="text-base font-bold text-indigo-300">{Math.round(result.fatsG)}g</p>
                      <p className="text-[11px] text-slate-400">{t.overview.fatsToday}</p>
                    </div>
                    <div>
                      <p className="text-base font-bold text-slate-200">{Math.round(result.fiberG ?? 0)}g</p>
                      <p className="text-[11px] text-slate-400">{isAr ? 'ألياف' : 'Fiber'}</p>
                    </div>
                  </div>

                  {result.items?.length > 0 && (
                    <div className="divide-y divide-white/10 text-xs">
                      {result.items.map((item, idx) => (
                        <div key={idx} className="py-2 flex items-center justify-between gap-3">
                          <span className="text-slate-200">{item.name}</span>
                          <span dir="ltr" className="font-mono-tabular text-slate-400">
                            {Math.round(item.calories)} kcal · P {Math.round(item.proteinG)}g
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-slate-400">{result.confidenceNote}</p>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <select
                      value={mealType}
                      onChange={(e) => setMealType(e.target.value as MealType)}
                      className="min-h-[44px] rounded-full border border-white/15 bg-black/70 px-4 text-sm text-white"
                    >
                      <option value="Breakfast">Breakfast</option>
                      <option value="Lunch">Lunch</option>
                      <option value="Dinner">Dinner</option>
                      <option value="Snack">Snack</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleSaveMeal}
                      className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 text-slate-950 text-sm font-bold hover:opacity-95 transition-all"
                    >
                      <Check className="h-4 w-4 shrink-0" />
                      <span>{mealSaved ? (isAr ? 'تم الحفظ في سجل اليوم' : 'Saved to Daily Log') : t.nutrition.saveMeal}</span>
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* BMR & TDEE Planner */}
            <section className="lg:col-span-5 glass-panel rounded-[28px] p-6 space-y-5">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-amber-400 shrink-0" />
                <h2 className="text-lg font-bold text-white">{t.nutrition.tdeeTitle}</h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 block">
                  <span className="text-xs text-slate-400">{t.nutrition.age}</span>
                  <input
                    type="number"
                    min={14}
                    max={95}
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="min-h-[44px] w-full rounded-full border border-white/15 bg-black/60 px-4 text-sm font-mono-tabular text-white"
                  />
                </label>
                <label className="space-y-1 block">
                  <span className="text-xs text-slate-400">{t.nutrition.gender}</span>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'male' | 'female')}
                    className="min-h-[44px] w-full rounded-full border border-white/15 bg-black/60 px-4 text-sm text-white"
                  >
                    <option value="male">{t.nutrition.male}</option>
                    <option value="female">{t.nutrition.female}</option>
                  </select>
                </label>
                <label className="space-y-1 block">
                  <span className="text-xs text-slate-400">{t.nutrition.heightCm}</span>
                  <input
                    type="number"
                    min={120}
                    max={240}
                    value={heightCm}
                    onChange={(e) => setHeightCm(Number(e.target.value))}
                    className="min-h-[44px] w-full rounded-full border border-white/15 bg-black/60 px-4 text-sm font-mono-tabular text-white"
                  />
                </label>
                <label className="space-y-1 block">
                  <span className="text-xs text-slate-400">{t.nutrition.weightKg}</span>
                  <input
                    type="number"
                    min={35}
                    max={300}
                    value={weightKg}
                    onChange={(e) => setWeightKg(Number(e.target.value))}
                    className="min-h-[44px] w-full rounded-full border border-white/15 bg-black/60 px-4 text-sm font-mono-tabular text-white"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="space-y-1 block">
                  <span className="text-xs text-slate-400">{t.nutrition.activity}</span>
                  <select
                    value={activityLevel}
                    onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
                    className="min-h-[44px] w-full rounded-full border border-white/15 bg-black/60 px-4 text-sm text-white"
                  >
                    <option value="sedentary">Sedentary (1.2x)</option>
                    <option value="light">Light (1.375x)</option>
                    <option value="moderate">Moderate (1.55x)</option>
                    <option value="active">Very Active (1.725x)</option>
                    <option value="athlete">Athlete (1.9x)</option>
                  </select>
                </label>
                <label className="space-y-1 block">
                  <span className="text-xs text-slate-400">{t.nutrition.goal}</span>
                  <select
                    value={goal}
                    onChange={(e) => setGoal(e.target.value as FitnessGoal)}
                    className="min-h-[44px] w-full rounded-full border border-white/15 bg-black/60 px-4 text-sm text-white"
                  >
                    <option value="cut">Fat Loss (-450 kcal)</option>
                    <option value="maintain">Maintenance</option>
                    <option value="bulk">Lean Bulk (+300 kcal)</option>
                  </select>
                </label>
              </div>

              <div className="rounded-[22px] border border-white/10 bg-black/55 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{t.nutrition.bmrLabel} / {t.nutrition.tdeeLabel}</span>
                  <span dir="ltr" className="font-mono-tabular text-slate-200">{bmr} / {tdee} kcal</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-300">Target</span>
                  <span dir="ltr" className="text-2xl font-bold font-mono-tabular text-amber-300">{targetCalories} kcal</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 font-mono-tabular text-xs">
                  <div>
                    <p className="text-amber-300 font-bold">{targetProtein}g</p>
                    <p className="text-slate-400">{t.overview.proteinToday}</p>
                  </div>
                  <div>
                    <p className="text-sky-300 font-bold">{targetCarbs}g</p>
                    <p className="text-slate-400">{t.overview.carbsToday}</p>
                  </div>
                  <div>
                    <p className="text-indigo-300 font-bold">{targetFats}g</p>
                    <p className="text-slate-400">{t.overview.fatsToday}</p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleApplyTargets}
                className="w-full min-h-[44px] rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 text-sm font-semibold hover:bg-amber-500/30 transition-colors"
              >
                {targetsSaved ? (isAr ? 'تم حفظ الأهداف' : 'Targets Saved') : t.nutrition.applyTargets}
              </button>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};
