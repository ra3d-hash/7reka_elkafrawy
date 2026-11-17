import React, { useState } from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Dumbbell,
  ExternalLink,
  LogIn,
  LogOut,
  Ruler,
  Scale,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useFitness } from './FirebaseProvider';
import type { ActivityLevel, FitnessGoal, Language } from '../types/fitness';

interface MandatoryAuthAndOnboardingProps {
  language: Language;
  onChangeLanguage: (lang: Language) => void;
}

export const MandatoryAuthAndOnboarding: React.FC<MandatoryAuthAndOnboardingProps> = ({
  language,
  onChangeLanguage,
}) => {
  const { user, needsOnboarding, busyAction, errorBanner, clearError, loginWithGoogle, logout, completeMandatoryOnboarding } =
    useFitness();

  const isAr = language === 'ar';

  // Mandatory onboarding form state (empty strings for height & weight so user must enter them explicitly)
  const [heightCmInput, setHeightCmInput] = useState('');
  const [weightKgInput, setWeightKgInput] = useState('');
  const [ageInput, setAgeInput] = useState('25');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [goal, setGoal] = useState<FitnessGoal>('maintain');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [formError, setFormError] = useState<string | null>(null);

  const parsedHeight = Number(heightCmInput);
  const parsedWeight = Number(weightKgInput);
  const parsedAge = Number(ageInput) || 25;

  const validMetrics =
    Number.isFinite(parsedHeight) &&
    parsedHeight >= 120 &&
    parsedHeight <= 240 &&
    Number.isFinite(parsedWeight) &&
    parsedWeight >= 35 &&
    parsedWeight <= 300;

  const previewWeight = validMetrics ? parsedWeight : 75;
  const previewHeight = validMetrics ? parsedHeight : 175;
  const bmr = Math.round(
    10 * previewWeight + 6.25 * previewHeight - 5 * parsedAge + (gender === 'male' ? 5 : -161)
  );
  const mult: Record<ActivityLevel, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    athlete: 1.9,
  };
  const tdee = Math.round(bmr * mult[activityLevel]);
  const targetCalories =
    goal === 'cut' ? Math.max(1200, tdee - 450) : goal === 'bulk' ? tdee + 300 : tdee;
  const targetProtein = Math.round(previewWeight * 2.0);
  const targetFats = Math.round((targetCalories * 0.25) / 9);
  const targetCarbs = Math.max(40, Math.round((targetCalories - targetProtein * 4 - targetFats * 9) / 4));

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!Number.isFinite(parsedHeight) || parsedHeight < 120 || parsedHeight > 240) {
      setFormError(
        isAr
          ? 'من فضلك اكتب طولك الحقيقي بالسنتيمتر (من 120 إلى 240 سم).'
          : 'Please enter a valid height between 120 and 240 cm.'
      );
      return;
    }
    if (!Number.isFinite(parsedWeight) || parsedWeight < 35 || parsedWeight > 300) {
      setFormError(
        isAr
          ? 'من فضلك اكتب وزنك الحقيقي بالكيلوجرام (من 35 إلى 300 كجم).'
          : 'Please enter a valid weight between 35 and 300 kg.'
      );
      return;
    }

    await completeMandatoryOnboarding({
      heightCm: parsedHeight,
      weightKg: parsedWeight,
      age: Math.min(95, Math.max(14, parsedAge)),
      gender,
      goal,
      activityLevel,
      targetCalories,
      targetProtein,
      targetCarbs,
      targetFats,
    });
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="relative min-h-screen bg-[#07060b] text-slate-100 flex flex-col justify-between p-4 sm:p-6 overflow-x-clip"
    >
      {/* Full-Bleed Architectural Gym Backdrop */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <img
          src="/src/assets/images/bg_obsidian_club_1794753821831.jpg"
          alt=""
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#07060b]/80 via-[#07060b]/65 to-[#07060b]/95" />
        <div
          className="absolute -top-32 left-1/4 h-[480px] w-[480px] rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.48) 0%, transparent 70%)' }}
        />
      </div>

      {/* Top Floating Oval Language & Brand Bar */}
      <header className="relative z-20 mx-auto w-full max-w-4xl">
        <div className="glass-capsule rounded-full px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 text-slate-950 font-black text-xs">
              E
            </span>
            <span className="text-sm sm:text-base font-extrabold text-white font-display">
              ELARB FitPro Ultra
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-full bg-white/[0.05] border border-white/15 p-0.5">
              {(['ar', 'en'] as const).map((code) => {
                const active = language === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => onChangeLanguage(code)}
                    className={`relative min-h-[34px] px-3 rounded-full text-[11px] font-bold transition-colors ${
                      active ? 'text-slate-950' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="gateLangOval"
                        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                        className="absolute inset-0 rounded-full bg-white"
                      />
                    )}
                    <span className="relative z-10">{code === 'ar' ? 'عربي' : 'EN'}</span>
                  </button>
                );
              })}
            </div>

            {user && (
              <button
                type="button"
                onClick={logout}
                disabled={busyAction === 'auth'}
                className="min-h-[36px] inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 text-xs font-semibold text-slate-200 hover:bg-white/15"
              >
                <LogOut className="h-3.5 w-3.5 text-rose-300" />
                <span>{isAr ? 'خروج' : 'Sign Out'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Center Stage: Mandatory Sign-In OR Mandatory Biometrics Onboarding */}
      <main className="relative z-20 mx-auto w-full max-w-4xl my-6 flex-1 flex items-center justify-center">
        {!user ? (
          /* STAGE 1: MANDATORY GOOGLE LOGIN GATE */
          <section className="w-full glass-panel-elevated rounded-[32px] overflow-hidden grid grid-cols-1 lg:grid-cols-12">
            <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between gap-6">
              <div className="space-y-4">
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/35 bg-amber-400/15 px-4 py-1.5 text-xs font-semibold text-amber-200">
                  <Dumbbell className="h-3.5 w-3.5 text-amber-300" />
                  <span>{isAr ? 'دخول إلزامي للأعضاء · ELARB Club' : 'Member Access Required · ELARB Club'}</span>
                </span>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-[1.18]">
                  {isAr
                    ? 'سجّل دخولك عشان نجهزلك جدول تمرينك ونظام أكلك.'
                    : 'Sign in to unlock your training splits and meal plans.'}
                </h1>
                <p className="text-sm text-slate-200/90 leading-relaxed">
                  {isAr
                    ? 'عشان تحفظ طولك ووزنك وأنظمتك الغذائية وجداول التمرين على حسابك السحابي وتتابع تطورك في أي وقت، تسجيل الدخول مطلوب قبل فتح التطبيق.'
                    : 'Sign in with Google to save your height, weight, ready-made training schedules, meal plans, and personal records securely to your cloud profile.'}
                </p>
              </div>

              {errorBanner && (
                <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 flex items-center justify-between gap-3 text-xs text-rose-200">
                  <span>{errorBanner}</span>
                  <button type="button" onClick={clearError} className="underline shrink-0">
                    {isAr ? 'إغلاق' : 'Dismiss'}
                  </button>
                </div>
              )}

              <div className="space-y-4">
                <button
                  type="button"
                  disabled={busyAction === 'auth'}
                  onClick={loginWithGoogle}
                  className="w-full min-h-[52px] inline-flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 px-6 text-sm sm:text-base font-extrabold text-slate-950 hover:opacity-95 active:scale-[0.98] transition-all shadow-lg shadow-amber-500/25 disabled:opacity-60"
                >
                  <LogIn className="h-5 w-5 shrink-0" />
                  <span>
                    {busyAction === 'auth'
                      ? isAr
                        ? 'جاري فتح تسجيل الدخول...'
                        : 'Connecting Google Account...'
                      : isAr
                      ? 'تسجيل الدخول بحساب Google للمتابعة'
                      : 'Sign In with Google to Continue'}
                  </span>
                </button>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 flex items-start gap-2.5 text-xs text-slate-300">
                  <ShieldCheck className="h-4 w-4 text-sky-300 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    {isAr
                      ? 'تنبيه صحي: جميع الجداول والأنظمة الغذائية للتنظيم الرياضي ولا تغني عن استشارة الطبيب. بياناتك محمية وتقدر تصدرها أو تمسحها في أي وقت.'
                      : 'Health Notice: All workouts and meal estimates support fitness tracking and do not replace medical advice. You can export or erase your data anytime.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 relative min-h-[240px] bg-slate-950/60 overflow-hidden">
              <img
                src="/src/assets/images/hero_gym_studio_1794750798669.jpg"
                alt="ELARB FitPro Ultra training club"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
              <div
                className={`absolute inset-0 bg-gradient-to-t from-[#07060b] via-[#07060b]/35 to-transparent ${
                  isAr ? 'lg:bg-gradient-to-l' : 'lg:bg-gradient-to-r'
                } lg:from-[#0e0c18] lg:via-[#0e0c18]/30 lg:to-transparent`}
              />
              <div className="absolute bottom-4 right-4 left-4 glass-capsule rounded-full px-5 py-2.5 flex items-center justify-between text-xs">
                <span className="font-bold text-white font-display">ELARB FitPro Ultra</span>
                <span dir="ltr" className="text-amber-300 font-semibold">@uncle_elbhiry</span>
              </div>
            </div>
          </section>
        ) : (
          /* STAGE 2: MANDATORY HEIGHT & WEIGHT ONBOARDING */
          <form
            onSubmit={handleOnboardingSubmit}
            className="w-full max-w-2xl glass-panel-elevated rounded-[32px] p-6 sm:p-9 space-y-6"
          >
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/15 px-4 py-1 text-xs font-semibold text-amber-200">
                <Sparkles className="h-3.5 w-3.5" />
                <span>
                  {isAr
                    ? `أهلاً يا ${user.displayName || 'بطل'} · خطوة إجبارية قبل الدخول`
                    : `Welcome ${user.displayName || 'Athlete'} · Required Setup`}
                </span>
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                {isAr
                  ? 'اكتب طولك ووزنك وهدفك عشان نفعل لك جدولك فوراً'
                  : 'Enter Your Height, Weight & Goal to Unlock Your Plan'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {isAr
                  ? 'البيانات دي إلزامية لحساب سعراتك الحقيقية واختيار أنسب نظام غذائي وجدول تدريبي لجسمك.'
                  : 'Your height and weight are required to calculate your real daily calorie/macro targets and match your training & diet plans.'}
              </p>
            </div>

            {/* Required Height & Weight Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="space-y-1.5 block">
                <span className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <Ruler className="h-3.5 w-3.5" />
                  <span>{isAr ? 'الطول (سم) * إجباري' : 'Height (cm) * Required'}</span>
                </span>
                <input
                  type="number"
                  required
                  min={120}
                  max={240}
                  step="1"
                  value={heightCmInput}
                  onChange={(e) => setHeightCmInput(e.target.value)}
                  placeholder={isAr ? 'مثال: 178' : 'e.g. 178'}
                  className="min-h-[50px] w-full rounded-full border border-amber-400/40 bg-black/70 px-5 text-base font-mono-tabular text-white placeholder:text-slate-500 focus:border-amber-300 focus:outline-none"
                />
              </label>

              <label className="space-y-1.5 block">
                <span className="flex items-center gap-1.5 text-xs font-bold text-sky-300">
                  <Scale className="h-3.5 w-3.5" />
                  <span>{isAr ? 'الوزن (كجم) * إجباري' : 'Weight (kg) * Required'}</span>
                </span>
                <input
                  type="number"
                  required
                  min={35}
                  max={300}
                  step="0.5"
                  value={weightKgInput}
                  onChange={(e) => setWeightKgInput(e.target.value)}
                  placeholder={isAr ? 'مثال: 78' : 'e.g. 78'}
                  className="min-h-[50px] w-full rounded-full border border-sky-400/40 bg-black/70 px-5 text-base font-mono-tabular text-white placeholder:text-slate-500 focus:border-sky-300 focus:outline-none"
                />
              </label>
            </div>

            {/* Age, Gender, Activity, Goal */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="space-y-1 block">
                <span className="text-xs text-slate-300">{isAr ? 'السن' : 'Age'}</span>
                <input
                  type="number"
                  required
                  min={14}
                  max={95}
                  value={ageInput}
                  onChange={(e) => setAgeInput(e.target.value)}
                  className="min-h-[44px] w-full rounded-full border border-white/15 bg-black/70 px-4 text-sm font-mono-tabular text-white focus:border-amber-400 focus:outline-none"
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-xs text-slate-300">{isAr ? 'النوع' : 'Sex'}</span>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as 'male' | 'female')}
                  className="min-h-[44px] w-full rounded-full border border-white/15 bg-black/70 px-4 text-sm text-white focus:border-amber-400 focus:outline-none"
                >
                  <option value="male">{isAr ? 'رجل' : 'Male'}</option>
                  <option value="female">{isAr ? 'أنثى' : 'Female'}</option>
                </select>
              </label>

              <label className="space-y-1 block col-span-2">
                <span className="text-xs text-slate-300">{isAr ? 'مستوى نشاطك' : 'Activity Level'}</span>
                <select
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
                  className="min-h-[44px] w-full rounded-full border border-white/15 bg-black/70 px-4 text-sm text-white focus:border-amber-400 focus:outline-none"
                >
                  <option value="sedentary">{isAr ? 'قليل الحركة / مكتبي' : 'Sedentary (1.2x)'}</option>
                  <option value="light">{isAr ? 'خفيف (1-2 يوم)' : 'Light (1.375x)'}</option>
                  <option value="moderate">{isAr ? 'متوسط (3-5 أيام جيم)' : 'Moderate (1.55x)'}</option>
                  <option value="active">{isAr ? 'نشيط جداً (5-6 أيام)' : 'Very Active (1.725x)'}</option>
                  <option value="athlete">{isAr ? 'رياضي محترف' : 'Athlete (1.9x)'}</option>
                </select>
              </label>
            </div>

            {/* Goal Selector Capsules */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-300 block">
                {isAr ? 'هدفك الأساسي إيه دلوقتي؟' : 'What is your primary goal?'}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(
                  [
                    {
                      id: 'cut' as FitnessGoal,
                      titleAr: 'تنشيف وحرق دهون',
                      titleEn: 'Fat Loss Cut',
                      subAr: 'عجز سعرات ذكي + بروتين عالي',
                      subEn: 'Clean deficit + high protein',
                    },
                    {
                      id: 'maintain' as FitnessGoal,
                      titleAr: 'ثبات وتنسيق جسم',
                      titleEn: 'Body Recomp',
                      subAr: 'عضل أنشف ووزن متوازن',
                      subEn: 'Balanced recomposition',
                    },
                    {
                      id: 'bulk' as FitnessGoal,
                      titleAr: 'تضخيم وبناء عضل',
                      titleEn: 'Lean Bulk',
                      subAr: 'فائض سعرات نضيف للضخامة',
                      subEn: 'Clean muscle surplus',
                    },
                  ] as const
                ).map((item) => {
                  const active = goal === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setGoal(item.id)}
                      className={`rounded-3xl border p-3.5 text-start transition-all ${
                        active
                          ? 'border-amber-400 bg-amber-500/15 text-white'
                          : 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                      }`}
                    >
                      <p className="text-xs font-bold">{isAr ? item.titleAr : item.titleEn}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{isAr ? item.subAr : item.subEn}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Calorie Preview Strip */}
            <div className="rounded-3xl border border-white/10 bg-black/70 p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Activity className="h-5 w-5 text-amber-400 shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">
                    {isAr ? 'السعرات والماكروز المحسوبة لك يومياً' : 'Calculated Daily Target'}
                  </p>
                  <p dir="ltr" className="text-lg font-extrabold font-mono-tabular text-white text-start">
                    {targetCalories} kcal
                  </p>
                </div>
              </div>
              <div dir="ltr" className="flex items-center gap-4 text-xs font-mono-tabular">
                <span className="text-amber-300 font-bold">P {targetProtein}g</span>
                <span className="text-sky-300 font-bold">C {targetCarbs}g</span>
                <span className="text-indigo-300 font-bold">F {targetFats}g</span>
              </div>
            </div>

            {(formError || errorBanner) && (
              <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
                {formError || errorBanner}
              </div>
            )}

            <button
              type="submit"
              disabled={busyAction === 'onboarding'}
              className="w-full min-h-[52px] inline-flex items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 px-6 text-sm sm:text-base font-extrabold text-slate-950 hover:opacity-95 active:scale-[0.98] transition-all shadow-lg shadow-amber-500/25 disabled:opacity-60"
            >
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>
                {busyAction === 'onboarding'
                  ? isAr
                    ? 'بنحفظ بياناتك وبنجهز جدولك...'
                    : 'Saving Profile & Building Schedule...'
                  : isAr
                  ? 'حفظ بياناتي وفتح الجداول والأنظمة'
                  : 'Save Metrics & Enter ELARB FitPro'}
              </span>
              <ArrowRight className={`h-4 w-4 shrink-0 ${isAr ? 'rotate-180' : ''}`} />
            </button>
          </form>
        )}
      </main>

      {/* Bottom Floating Oval Support Bar */}
      <footer className="relative z-20 mx-auto w-full max-w-4xl">
        <div className="glass-capsule rounded-full px-5 h-12 flex items-center justify-between gap-3 text-xs text-slate-300">
          <span className="font-bold text-white font-display">ELARB FitPro Ultra</span>
          <div className="flex items-center gap-3">
            <a
              href="https://wa.me/uncle_elbhiry"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-amber-300 hover:underline"
            >
              <span dir="ltr">WA: @uncle_elbhiry</span>
              <ExternalLink className="h-3 w-3" />
            </a>
            <span aria-hidden="true">·</span>
            <a
              href="https://t.me/elarp_vip"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sky-300 hover:underline"
            >
              <span dir="ltr">@elarp_vip</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
