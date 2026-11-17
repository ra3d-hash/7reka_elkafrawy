import React, { useMemo, useState } from 'react';
import { ClipboardList, Plus, Search, Shield, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { getCopy } from '../lib/i18n';
import { useFitness } from './FirebaseProvider';
import type { Discipline, Language, UserRole, UserStatus } from '../types/fitness';

export const AdminConsoleView: React.FC<{ language: Language }> = ({ language }) => {
  const t = getCopy(language);
  const {
    user,
    isAdmin,
    allUsers,
    auditLogs,
    loginWithGoogle,
    adminUpdateUser,
    adminPublishExercise,
  } = useFitness();

  const [subTab, setSubTab] = useState<'users' | 'exercises' | 'audit'>('users');
  const [search, setSearch] = useState('');

  // Official Exercise Publisher
  const [exName, setExName] = useState('');
  const [exNameAr, setExNameAr] = useState('');
  const [exDiscipline, setExDiscipline] = useState<Discipline>('Bodybuilding');
  const [exMuscle, setExMuscle] = useState('Chest');
  const [exEquipment, setExEquipment] = useState('Barbell');
  const [exInstructions, setExInstructions] = useState('');
  const [publishedToast, setPublishedToast] = useState(false);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allUsers.filter(
      (u) => !q || u.displayName.toLowerCase().includes(q) || u.uid.toLowerCase().includes(q)
    );
  }, [allUsers, search]);

  if (!user || !isAdmin) {
    return (
      <div className="glass-panel rounded-[28px] p-8 text-center space-y-4 max-w-xl mx-auto">
        <Shield className="h-10 w-10 text-amber-300 mx-auto" />
        <h1 className="text-xl font-bold text-white">{t.admin.title}</h1>
        <p className="text-sm text-slate-300 leading-relaxed">{t.admin.restricted}</p>
        {!user && (
          <button
            type="button"
            onClick={loginWithGoogle}
            className="min-h-[44px] px-6 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 text-slate-950 font-bold text-sm hover:opacity-95 transition-all"
          >
            {t.auth.signIn}
          </button>
        )}
      </div>
    );
  }

  const activeCount = allUsers.filter((u) => u.status === 'active').length;
  const suspendedCount = allUsers.filter((u) => u.status === 'suspended').length;

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exName.trim() || !exInstructions.trim()) return;
    await adminPublishExercise({
      name: exName,
      nameAr: exNameAr || exName,
      discipline: exDiscipline,
      muscleGroup: exMuscle,
      equipment: exEquipment,
      instructions: exInstructions,
    });
    setExName('');
    setExNameAr('');
    setExInstructions('');
    setPublishedToast(true);
    setTimeout(() => setPublishedToast(false), 2500);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-white">{t.admin.title}</h1>
        <p className="text-sm text-slate-300">{t.admin.subtitle}</p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel rounded-[24px] p-5">
          <p className="text-xs text-slate-400">{t.admin.totalUsers}</p>
          <p className="text-2xl font-bold text-white font-mono-tabular mt-1">{allUsers.length}</p>
        </div>
        <div className="glass-panel rounded-[24px] p-5">
          <p className="text-xs text-slate-400">{t.admin.activeUsers}</p>
          <p className="text-2xl font-bold text-amber-300 font-mono-tabular mt-1">{activeCount}</p>
        </div>
        <div className="glass-panel rounded-[24px] p-5">
          <p className="text-xs text-slate-400">{t.admin.suspendedUsers}</p>
          <p className="text-2xl font-bold text-rose-400 font-mono-tabular mt-1">{suspendedCount}</p>
        </div>
        <div className="glass-panel rounded-[24px] p-5">
          <p className="text-xs text-slate-400">{t.admin.auditEvents}</p>
          <p className="text-2xl font-bold text-sky-300 font-mono-tabular mt-1">{auditLogs.length}</p>
        </div>
      </div>

      {/* Animated Oval Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1 rounded-full bg-white/[0.04] p-1 border border-white/10 w-fit">
        {[
          { id: 'users' as const, label: t.admin.usersTab, icon: Users },
          { id: 'exercises' as const, label: t.admin.exercisesTab, icon: Plus },
          { id: 'audit' as const, label: t.admin.auditTab, icon: ClipboardList },
        ].map((tabItem) => {
          const Icon = tabItem.icon;
          const active = subTab === tabItem.id;
          return (
            <button
              key={tabItem.id}
              type="button"
              onClick={() => setSubTab(tabItem.id)}
              className={`relative min-h-[40px] px-4 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors ${
                active ? 'text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="adminTabOval"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400"
                />
              )}
              <Icon className="relative z-10 h-4 w-4" />
              <span className="relative z-10">{tabItem.label}</span>
            </button>
          );
        })}
      </div>

      {subTab === 'users' && (
        <section className="glass-panel rounded-2xl p-5 space-y-4">
          <div className="relative max-w-sm">
            <Search className="h-4 w-4 text-slate-400 absolute top-1/2 -translate-y-1/2 left-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.admin.searchUsers}
              className="min-h-[44px] w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-9 pr-3 text-sm text-white"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400">
                  <th className="py-3 px-3 text-start font-medium">Athlete</th>
                  <th className="py-3 px-3 text-start font-medium">Targets</th>
                  <th className="py-3 px-3 text-start font-medium">{t.admin.role}</th>
                  <th className="py-3 px-3 text-start font-medium">{t.admin.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredUsers.map((u) => (
                  <tr key={u.uid} className="hover:bg-slate-900/40">
                    <td className="py-3 px-3">
                      <p className="font-semibold text-white">{u.displayName}</p>
                      <p className="text-xs font-mono-tabular text-slate-500">{u.uid}</p>
                    </td>
                    <td className="py-3 px-3 font-mono-tabular text-xs text-slate-300">
                      {u.targetCalories} kcal · {u.goal}
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={u.role}
                        aria-label={`Role for ${u.displayName}`}
                        onChange={(e) => adminUpdateUser(u.uid, e.target.value as UserRole, u.status)}
                        className="min-h-[38px] rounded-lg border border-slate-700 bg-slate-950 px-2.5 text-xs text-white"
                      >
                        <option value="member">member</option>
                        <option value="coach">coach</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={u.status}
                        aria-label={`Status for ${u.displayName}`}
                        onChange={(e) => adminUpdateUser(u.uid, u.role, e.target.value as UserStatus)}
                        className={`min-h-[38px] rounded-lg border px-2.5 text-xs font-medium ${
                          u.status === 'active'
                            ? 'border-amber-400/40 bg-amber-400/10 text-amber-200'
                            : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                        }`}
                      >
                        <option value="active">active</option>
                        <option value="suspended">suspended</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-slate-400">
                      No matching users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {subTab === 'exercises' && (
        <form onSubmit={handlePublish} className="glass-panel rounded-2xl p-6 space-y-4 max-w-2xl">
          <h2 className="text-base font-bold text-white">{t.admin.publishExercise}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              required
              minLength={2}
              maxLength={100}
              value={exName}
              onChange={(e) => setExName(e.target.value)}
              placeholder="Exercise Name (EN)"
              className="min-h-[44px] rounded-xl border border-slate-800 bg-slate-950/80 px-3 text-sm text-white"
            />
            <input
              type="text"
              required
              minLength={2}
              maxLength={100}
              value={exNameAr}
              onChange={(e) => setExNameAr(e.target.value)}
              placeholder="اسم التمرين (AR)"
              className="min-h-[44px] rounded-xl border border-slate-800 bg-slate-950/80 px-3 text-sm text-white"
            />
            <select
              value={exDiscipline}
              onChange={(e) => setExDiscipline(e.target.value as Discipline)}
              className="min-h-[44px] rounded-xl border border-slate-800 bg-slate-950/80 px-3 text-sm text-white"
            >
              <option value="Bodybuilding">Bodybuilding</option>
              <option value="Calisthenics">Calisthenics</option>
              <option value="CrossFit">CrossFit</option>
              <option value="HIIT">HIIT</option>
            </select>
            <input
              type="text"
              required
              value={exMuscle}
              onChange={(e) => setExMuscle(e.target.value)}
              placeholder="Muscle Group (e.g., Chest, Back)"
              className="min-h-[44px] rounded-xl border border-slate-800 bg-slate-950/80 px-3 text-sm text-white"
            />
            <input
              type="text"
              required
              value={exEquipment}
              onChange={(e) => setExEquipment(e.target.value)}
              placeholder="Equipment (e.g., Barbell, Rings)"
              className="sm:col-span-2 min-h-[44px] rounded-xl border border-slate-800 bg-slate-950/80 px-3 text-sm text-white"
            />
          </div>
          <textarea
            required
            minLength={5}
            maxLength={400}
            rows={3}
            value={exInstructions}
            onChange={(e) => setExInstructions(e.target.value)}
            placeholder="Form and execution cues..."
            className="w-full rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-sm text-white"
          />
          <button
            type="submit"
            className="min-h-[44px] px-6 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 text-slate-950 text-sm font-bold hover:opacity-95 transition-all"
          >
            {t.admin.publishExercise}
          </button>
          {publishedToast && (
            <p className="text-xs text-amber-300 font-medium">Exercise published globally to ELARB catalog.</p>
          )}
        </form>
      )}

      {subTab === 'audit' && (
        <section className="glass-panel rounded-2xl divide-y divide-slate-800/80">
          {auditLogs.map((log) => (
            <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div>
                <p className="font-semibold text-white">{log.action}</p>
                <p className="text-slate-400">{log.details}</p>
              </div>
              <span className="font-mono-tabular text-slate-500">
                Actor: {log.actorUid.slice(0, 10)} · Target: {log.targetId.slice(0, 10)}
              </span>
            </div>
          ))}
          {auditLogs.length === 0 && (
            <p className="p-6 text-center text-xs text-slate-400">No compliance audit events recorded yet.</p>
          )}
        </section>
      )}
    </div>
  );
};
