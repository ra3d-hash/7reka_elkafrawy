import React, { useMemo, useState } from 'react';
import { ClipboardList, Plus, Search, Shield, Users } from 'lucide-react';
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
      <div className="app-card rounded-2xl p-8 text-center space-y-4 max-w-md mx-auto">
        <Shield className="h-9 w-9 text-amber-400 mx-auto" />
        <h1 className="text-lg font-bold text-white">{t.admin.title}</h1>
        <p className="text-xs text-slate-400 leading-relaxed">{t.admin.restricted}</p>
        {!user && (
          <button
            type="button"
            onClick={loginWithGoogle}
            className="min-h-[42px] px-5 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs"
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
    <div className="space-y-4">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="app-card rounded-2xl p-4">
          <p className="text-[11px] text-slate-400">{t.admin.totalUsers}</p>
          <p className="text-2xl font-extrabold text-white font-mono-tabular mt-1">{allUsers.length}</p>
        </div>
        <div className="app-card rounded-2xl p-4">
          <p className="text-[11px] text-slate-400">{t.admin.activeUsers}</p>
          <p className="text-2xl font-extrabold text-amber-300 font-mono-tabular mt-1">{activeCount}</p>
        </div>
        <div className="app-card rounded-2xl p-4">
          <p className="text-[11px] text-slate-400">{t.admin.suspendedUsers}</p>
          <p className="text-2xl font-extrabold text-rose-400 font-mono-tabular mt-1">{suspendedCount}</p>
        </div>
        <div className="app-card rounded-2xl p-4">
          <p className="text-[11px] text-slate-400">{t.admin.auditEvents}</p>
          <p className="text-2xl font-extrabold text-sky-300 font-mono-tabular mt-1">{auditLogs.length}</p>
        </div>
      </div>

      {/* Segmented Admin Tabs */}
      <div className="grid grid-cols-3 rounded-2xl bg-[#111318] border border-white/[0.08] p-1">
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
              className={`min-h-[40px] px-2 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors ${
                active ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{tabItem.label}</span>
            </button>
          );
        })}
      </div>

      {subTab === 'users' && (
        <section className="app-card rounded-2xl p-4 space-y-3.5">
          <div className="relative max-w-sm">
            <Search className="h-4 w-4 text-slate-400 absolute top-1/2 -translate-y-1/2 left-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.admin.searchUsers}
              className="min-h-[42px] w-full rounded-xl border border-white/[0.1] bg-[#0c0e14] pl-9 pr-3 text-xs text-white"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] text-[11px] text-slate-400">
                  <th className="py-2.5 px-3 text-start font-semibold">Athlete</th>
                  <th className="py-2.5 px-3 text-start font-semibold">Targets</th>
                  <th className="py-2.5 px-3 text-start font-semibold">{t.admin.role}</th>
                  <th className="py-2.5 px-3 text-start font-semibold">{t.admin.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {filteredUsers.map((u) => (
                  <tr key={u.uid}>
                    <td className="py-2.5 px-3">
                      <p className="font-bold text-white">{u.displayName}</p>
                      <p className="text-[10px] font-mono-tabular text-slate-500">{u.uid.slice(0, 14)}</p>
                    </td>
                    <td dir="ltr" className="py-2.5 px-3 font-mono-tabular text-slate-300">
                      {u.targetCalories} kcal · {u.goal}
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        value={u.role}
                        aria-label={`Role for ${u.displayName}`}
                        onChange={(e) => adminUpdateUser(u.uid, e.target.value as UserRole, u.status)}
                        className="min-h-[34px] rounded-lg border border-white/[0.1] bg-[#0c0e14] px-2 text-xs text-white"
                      >
                        <option value="member">member</option>
                        <option value="coach">coach</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        value={u.status}
                        aria-label={`Status for ${u.displayName}`}
                        onChange={(e) => adminUpdateUser(u.uid, u.role, e.target.value as UserStatus)}
                        className={`min-h-[34px] rounded-lg border px-2 text-xs font-bold ${
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
                    <td colSpan={4} className="py-6 text-center text-xs text-slate-400">
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
        <form onSubmit={handlePublish} className="app-card rounded-2xl p-4 sm:p-5 space-y-3.5 max-w-2xl">
          <h2 className="text-sm font-bold text-white">{t.admin.publishExercise}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="text"
              required
              minLength={2}
              maxLength={100}
              value={exName}
              onChange={(e) => setExName(e.target.value)}
              placeholder="Exercise Name (EN)"
              className="min-h-[42px] rounded-xl border border-white/[0.1] bg-[#0c0e14] px-3 text-xs text-white"
            />
            <input
              type="text"
              required
              minLength={2}
              maxLength={100}
              value={exNameAr}
              onChange={(e) => setExNameAr(e.target.value)}
              placeholder="اسم التمرين (AR)"
              className="min-h-[42px] rounded-xl border border-white/[0.1] bg-[#0c0e14] px-3 text-xs text-white"
            />
            <select
              value={exDiscipline}
              onChange={(e) => setExDiscipline(e.target.value as Discipline)}
              className="min-h-[42px] rounded-xl border border-white/[0.1] bg-[#0c0e14] px-3 text-xs text-white"
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
              placeholder="Muscle Group"
              className="min-h-[42px] rounded-xl border border-white/[0.1] bg-[#0c0e14] px-3 text-xs text-white"
            />
            <input
              type="text"
              required
              value={exEquipment}
              onChange={(e) => setExEquipment(e.target.value)}
              placeholder="Equipment"
              className="sm:col-span-2 min-h-[42px] rounded-xl border border-white/[0.1] bg-[#0c0e14] px-3 text-xs text-white"
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
            className="w-full rounded-xl border border-white/[0.1] bg-[#0c0e14] p-3 text-xs text-white"
          />
          <button
            type="submit"
            className="min-h-[42px] px-5 rounded-xl bg-amber-400 text-slate-950 text-xs font-extrabold"
          >
            {t.admin.publishExercise}
          </button>
          {publishedToast && (
            <p className="text-xs text-amber-300 font-semibold">Exercise published to global catalog.</p>
          )}
        </form>
      )}

      {subTab === 'audit' && (
        <section className="app-list-group divide-y divide-white/[0.07]">
          {auditLogs.map((log) => (
            <div key={log.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div>
                <p className="font-bold text-white">{log.action}</p>
                <p className="text-slate-400">{log.details}</p>
              </div>
              <span dir="ltr" className="font-mono-tabular text-[11px] text-slate-500">
                {log.actorUid.slice(0, 10)} → {log.targetId.slice(0, 10)}
              </span>
            </div>
          ))}
          {auditLogs.length === 0 && (
            <p className="p-6 text-center text-xs text-slate-400">No audit events yet.</p>
          )}
        </section>
      )}
    </div>
  );
};
