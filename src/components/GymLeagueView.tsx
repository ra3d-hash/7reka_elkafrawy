/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  Award,
  Check,
  Copy,
  Crown,
  MessageSquare,
  Send,
  Trash2,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-react';
import { useFitness } from './FirebaseProvider';
import type { Language } from '../types/fitness';

function formatMessageTime(ts: unknown): string {
  if (!ts || typeof ts !== 'object') return '';
  const maybe = ts as { toDate?: () => Date; seconds?: number };
  const date =
    typeof maybe.toDate === 'function'
      ? maybe.toDate()
      : typeof maybe.seconds === 'number'
      ? new Date(maybe.seconds * 1000)
      : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export const GymLeagueView: React.FC<{ language: Language }> = ({ language }) => {
  const isAr = language === 'ar';
  const {
    user,
    profile,
    workouts,
    prs,
    soloLeague,
    friends,
    directMessages,
    addFriendContact,
    removeFriendContact,
    sendDirectMessage,
  } = useFitness();

  const [subView, setSubView] = useState<'solo-league' | 'direct-chat'>('solo-league');
  const [friendUidInput, setFriendUidInput] = useState('');
  const [friendNameInput, setFriendNameInput] = useState('');
  const [friendFormError, setFriendFormError] = useState<string | null>(null);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);

  const [activeFriendUid, setActiveFriendUid] = useState<string | null>(null);
  const [friendMsgInput, setFriendMsgInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);

  const myUid = user?.uid || 'guest_user';
  const myName = profile.displayName || (isAr ? 'رياضي ELARB' : 'ELARB Athlete');

  const myIndividualScore = useMemo(() => {
    return 350 + workouts.length * 100 + prs.length * 250;
  }, [workouts.length, prs.length]);

  // Real persisted solo leaderboard (zero fake/mock athletes)
  const soloLeaderboard = useMemo(() => {
    const map = new Map<
      string,
      { uid: string; displayName: string; score: number; workoutsCount: number; prsCount: number }
    >();
    for (const row of soloLeague) {
      map.set(row.uid, {
        uid: row.uid,
        displayName: row.displayName,
        score: row.score,
        workoutsCount: row.workoutsCount,
        prsCount: row.prsCount,
      });
    }
    map.set(myUid, {
      uid: myUid,
      displayName: myName,
      score: myIndividualScore,
      workoutsCount: workouts.length,
      prsCount: prs.length,
    });
    return Array.from(map.values()).sort((a, b) => b.score - a.score);
  }, [soloLeague, myUid, myName, myIndividualScore, workouts.length, prs.length]);

  const otherRealAthletes = useMemo(
    () => soloLeaderboard.filter((a) => a.uid !== myUid),
    [soloLeaderboard, myUid]
  );

  const activeFriend = useMemo(
    () => friends.find((f) => f.uid === activeFriendUid) || null,
    [friends, activeFriendUid]
  );

  const currentDirectMessages = useMemo(
    () =>
      activeFriendUid
        ? directMessages.filter(
            (m) =>
              (m.senderUid === myUid && m.receiverUid === activeFriendUid) ||
              (m.senderUid === activeFriendUid && m.receiverUid === myUid)
          )
        : [],
    [directMessages, myUid, activeFriendUid]
  );

  const handleCopyMyUid = async () => {
    try {
      await navigator.clipboard.writeText(myUid);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    } catch {
      // clipboard blocked
    }
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    setFriendFormError(null);
    const cleanUid = friendUidInput.trim().replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanName = friendNameInput.trim();
    if (!cleanUid || cleanUid.length < 3) {
      setFriendFormError(
        isAr
          ? 'اكتب معرّف الصديق الصحيح (Athlete ID) أو اختاره من أعضاء الدوري الحقيقيين.'
          : 'Enter a valid Athlete ID (at least 3 alphanumeric characters) or pick an athlete from the league.'
      );
      return;
    }
    if (cleanUid === myUid) {
      setFriendFormError(
        isAr ? 'لا يمكنك إضافة حسابك الشخصي كصديق.' : 'You cannot add your own Athlete ID.'
      );
      return;
    }
    if (!cleanName) {
      setFriendFormError(isAr ? 'اكتب اسم الصديق.' : 'Enter friend display name.');
      return;
    }

    await addFriendContact(cleanUid, cleanName);
    setActiveFriendUid(cleanUid);
    setFriendNameInput('');
    setFriendUidInput('');
    setShowAddFriendModal(false);
  };

  const handleSendDirectMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendMsgInput.trim() || !activeFriend || sendingMsg) return;
    setSendingMsg(true);
    try {
      await sendDirectMessage(activeFriend.uid, activeFriend.displayName, friendMsgInput);
      setFriendMsgInput('');
    } finally {
      setSendingMsg(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-3xl glass-panel border border-amber-400/30 p-6 sm:p-8">
        <div className="absolute inset-0 bg-gradient-to-r from-[#07060b]/95 via-[#07060b]/80 to-[#07060b]/60" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/15 px-4 py-1.5 text-xs font-semibold text-amber-200">
              <Trophy className="h-4 w-4 text-amber-300" />
              <span>{isAr ? 'دوري الأبطال الفردي وشات الأصدقاء · ELARB Solo League' : 'ELARB Solo League & Direct Chat'}</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
              {isAr ? 'دوري النقاط الفردي والدردشة الخاصة مع أصدقائك' : 'Solo Athlete Point League & Direct Friend Chat'}
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              {isAr
                ? 'دوري حقيقي 100% للمستخدمين الفعليين بدون أي أسماء وهمية. سجّل تمارينك وأرقامك القياسية لتتصدر الترتيب وتضيف أصدقاءك بالمعرّف للدردشة الخاصة.'
                : '100% real verified athlete standings with zero mock entries. Log workouts and PRs to climb, and add real friends by Athlete ID for 1-on-1 DM chat.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
            <div className="text-end glass-capsule rounded-full px-6 py-3">
              <p className="text-[11px] text-slate-400">{isAr ? 'نقاطك الشخصية في الدوري' : 'Your Solo Score'}</p>
              <p className="text-2xl font-black font-mono-tabular text-amber-300">{myIndividualScore.toLocaleString()} pts</p>
            </div>
            <button
              type="button"
              onClick={handleCopyMyUid}
              className="min-h-[38px] inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 text-[11px] font-mono-tabular text-slate-200 hover:bg-white/10 transition-colors"
            >
              {copiedUid ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-amber-300" />}
              <span>{copiedUid ? (isAr ? 'تم نسخ المعرّف' : 'ID Copied') : `ID: ${myUid.slice(0, 12)}...`}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-full bg-white/[0.04] p-1.5 border border-white/10 w-fit">
        {[
          { id: 'solo-league' as const, label: isAr ? '🏆 دوري الأبطال الفردي' : 'Solo League Leaderboard', icon: Trophy },
          { id: 'direct-chat' as const, label: isAr ? '💬 شات الأصدقاء الخاص' : 'Direct Friend Chat', icon: MessageSquare },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = subView === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubView(tab.id)}
              className={`relative min-h-[40px] px-5 py-2 rounded-full text-xs font-bold inline-flex items-center gap-2 transition-colors ${
                active ? 'text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              {active && (
                <span className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 shadow-md shadow-amber-500/20" />
              )}
              <Icon className="relative z-10 h-4 w-4 shrink-0" />
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* VIEW 1: SOLO LEADERBOARD (REAL VERIFIED USERS ONLY) */}
      {subView === 'solo-league' && (
        <section className="glass-panel-elevated rounded-[28px] p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="space-y-1">
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-400 shrink-0" />
                <span>{isAr ? 'ترتيب دوري الأبطال الفردي (مستخدمون حقيقيون فقط)' : 'Solo Championship Standings (Real Athletes)'}</span>
              </h2>
              <p className="text-xs text-slate-400">
                {isAr
                  ? 'كل تمرين تسجله (+100 نقطة) وكل رقم قياسي PR (+250 نقطة) يتزامن تلقائياً مع السحابة.'
                  : 'Every logged workout (+100 pts) and Personal Record (+250 pts) syncs live to your cloud ranking.'}
              </p>
            </div>
            <span className="px-3.5 py-1.5 rounded-full bg-amber-400/15 border border-amber-400/35 text-xs font-bold text-amber-300 font-mono-tabular">
              {soloLeaderboard.length} {isAr ? 'متسابق حقيقي' : 'Real Athletes'}
            </span>
          </div>

          <div className="space-y-3">
            {soloLeaderboard.map((athlete, idx) => {
              const isMe = athlete.uid === myUid;
              const rank = idx + 1;
              return (
                <div
                  key={athlete.uid}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                    isMe
                      ? 'bg-amber-400/20 border-amber-400/50 shadow-xl'
                      : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.07]'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`h-10 w-10 rounded-2xl flex items-center justify-center text-xs font-extrabold font-mono-tabular shrink-0 shadow-md ${
                        rank === 1
                          ? 'bg-amber-400 text-slate-950 shadow-amber-400/30'
                          : rank === 2
                          ? 'bg-slate-300 text-slate-950'
                          : rank === 3
                          ? 'bg-amber-700 text-white'
                          : 'bg-white/10 text-slate-300'
                      }`}
                    >
                      {rank === 1 ? <Crown className="h-4 w-4" /> : `#${rank}`}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-extrabold text-white truncate">{athlete.displayName}</p>
                        {isMe && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-[10px] font-extrabold text-amber-300">
                            {isAr ? 'أنت' : 'You'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-mono-tabular">
                        {athlete.workoutsCount} {isAr ? 'تمرين مسجل' : 'workouts'} · {athlete.prsCount} {isAr ? 'أرقام PR' : 'PRs'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {!isMe && !friends.some((f) => f.uid === athlete.uid) && (
                      <button
                        type="button"
                        onClick={() => {
                          addFriendContact(athlete.uid, athlete.displayName);
                          setActiveFriendUid(athlete.uid);
                          setSubView('direct-chat');
                        }}
                        className="min-h-[34px] px-3 rounded-full border border-sky-400/35 bg-sky-500/15 text-[11px] font-bold text-sky-200 hover:bg-sky-500/25 inline-flex items-center gap-1"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>{isAr ? 'شات' : 'Chat'}</span>
                      </button>
                    )}
                    <div className="text-end">
                      <p className="text-lg font-black font-mono-tabular text-amber-300">
                        {athlete.score.toLocaleString()} <span className="text-[11px] text-slate-400 font-semibold">pts</span>
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* VIEW 2: DIRECT FRIEND CHAT */}
      {subView === 'direct-chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Friends Sidebar */}
          <div className="lg:col-span-4 space-y-4">
            <div className="glass-panel rounded-[28px] p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-amber-300 shrink-0" />
                  <span>{isAr ? 'أصدقائي الحقيقيون' : 'My Real Friends'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setFriendFormError(null);
                    setShowAddFriendModal(true);
                  }}
                  className="min-h-[36px] px-3.5 rounded-full bg-amber-400 text-slate-950 text-xs font-bold hover:bg-amber-300 transition-colors inline-flex items-center gap-1 shadow-md"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>{isAr ? 'إضافة صديق' : 'Add Friend'}</span>
                </button>
              </div>

              {friends.length > 0 ? (
                <div className="space-y-2">
                  {friends.map((f) => {
                    const active = activeFriendUid === f.uid;
                    return (
                      <div
                        key={f.uid}
                        className={`min-h-[46px] w-full pl-3 pr-2 rounded-2xl flex items-center justify-between text-xs font-semibold transition-all ${
                          active ? 'bg-amber-400/20 border border-amber-400/50 text-white' : 'bg-white/[0.04] border border-white/10 text-slate-300 hover:bg-white/[0.08]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveFriendUid(f.uid)}
                          className="flex-1 min-h-[44px] flex items-center gap-2.5 text-start min-w-0"
                        >
                          <span className="h-8 w-8 rounded-full bg-amber-400/20 text-amber-300 font-bold flex items-center justify-center shrink-0">
                            {f.displayName.slice(0, 1)}
                          </span>
                          <span className="truncate">{f.displayName}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            removeFriendContact(f.uid);
                            if (activeFriendUid === f.uid) setActiveFriendUid(null);
                          }}
                          aria-label={isAr ? `حذف ${f.displayName}` : `Remove ${f.displayName}`}
                          className="h-8 w-8 flex items-center justify-center rounded-full text-slate-400 hover:text-rose-300 hover:bg-rose-500/15 shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 text-center space-y-2.5 rounded-2xl border border-dashed border-white/15 bg-white/[0.02]">
                  <Users className="h-8 w-8 text-slate-500 mx-auto" />
                  <p className="text-xs font-bold text-white">
                    {isAr ? 'قائمة أصدقائك فارغة تماماً' : 'Your friend list is empty'}
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-[240px] mx-auto">
                    {isAr ? 'لا توجد أسماء وهمية. أضف صديقك بالمعرّف أو اختره من الدوري الفردي.' : 'Zero fake friends. Click Add Friend or add a real athlete from the Solo League.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddFriendModal(true)}
                    className="min-h-[36px] px-4 rounded-full bg-amber-400 text-slate-950 text-xs font-bold hover:bg-amber-300"
                  >
                    {isAr ? '+ إضافة صديق الآن' : '+ Add Friend Now'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Chat Feed */}
          <div className="lg:col-span-8 space-y-4">
            <section className="glass-panel-elevated rounded-[28px] p-6 space-y-4 flex flex-col h-[520px]">
              {activeFriend ? (
                <>
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-amber-400 to-sky-400 flex items-center justify-center text-slate-950 font-bold">
                        {activeFriend.displayName.slice(0, 1)}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{activeFriend.displayName}</h3>
                        <p className="text-[11px] text-emerald-300 font-mono-tabular">
                          {isAr ? 'شات سحابي مباشر · مشفّر بالحساب' : 'Cloud Direct DM'} · {activeFriend.uid.slice(0, 10)}...
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
                    {currentDirectMessages.map((dm) => {
                      const isMe = dm.senderUid === myUid;
                      const timeLabel = formatMessageTime(dm.createdAt);
                      return (
                        <div key={dm.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <span className="text-[10px] text-slate-400 px-1 mb-0.5">
                            {dm.senderName}{timeLabel ? ` · ${timeLabel}` : ''}
                          </span>
                          <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${isMe ? 'bg-gradient-to-r from-amber-300 to-orange-400 text-slate-950 font-medium' : 'bg-white/10 text-white'}`}>
                            {dm.message}
                          </div>
                        </div>
                      );
                    })}
                    {currentDirectMessages.length === 0 && (
                      <p className="text-center text-xs text-slate-400 py-20">
                        {isAr ? `ابدأ أول رسالة مع ${activeFriend.displayName}!` : `Send the first message to ${activeFriend.displayName}!`}
                      </p>
                    )}
                  </div>

                  <form onSubmit={handleSendDirectMessage} className="pt-2 flex items-center gap-2">
                    <input
                      type="text"
                      required
                      maxLength={600}
                      value={friendMsgInput}
                      onChange={(e) => setFriendMsgInput(e.target.value)}
                      placeholder={isAr ? `اكتب رسالة إلى ${activeFriend.displayName}...` : `Message ${activeFriend.displayName}...`}
                      className="flex-1 min-h-[44px] rounded-full border border-white/15 bg-slate-950/80 px-4 text-xs text-white"
                    />
                    <button
                      type="submit"
                      disabled={sendingMsg}
                      aria-label={isAr ? 'إرسال الرسالة' : 'Send message'}
                      className="min-h-[44px] px-6 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 text-slate-950 text-xs font-bold hover:opacity-95 disabled:opacity-60"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 text-slate-400">
                  <MessageSquare className="h-10 w-10 text-slate-600" />
                  <p className="text-sm font-bold text-white">
                    {isAr ? 'اختر صديقاً من القائمة أو أضف صديقاً جديداً' : 'Select a friend or add a new friend to start chatting'}
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* Add Friend Modal */}
      {showAddFriendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <form
            onSubmit={handleAddFriend}
            className="glass-panel-elevated w-full max-w-md rounded-[30px] p-6 sm:p-8 space-y-5 border border-amber-400/40"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-amber-400 shrink-0" />
                <span>{isAr ? 'إضافة صديق حقيقي للشات' : 'Add Real Friend'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddFriendModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {otherRealAthletes.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] text-amber-300 font-semibold">
                  {isAr ? 'اختر سريعاً من أبطال الدوري المسجلين:' : 'Quick-pick from registered league athletes:'}
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                  {otherRealAthletes.map((a) => (
                    <button
                      key={a.uid}
                      type="button"
                      onClick={() => {
                        setFriendUidInput(a.uid);
                        setFriendNameInput(a.displayName);
                      }}
                      className="w-full text-start px-3 py-2 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-xs flex items-center justify-between"
                    >
                      <span className="font-semibold text-white truncate">{a.displayName}</span>
                      <span className="font-mono-tabular text-[10px] text-slate-400">{a.score} pts</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <label className="space-y-1 block text-xs">
                <span className="text-slate-300">{isAr ? 'معرّف الصديق (Athlete ID)' : 'Friend Athlete ID'}</span>
                <input
                  type="text"
                  required
                  maxLength={128}
                  value={friendUidInput}
                  onChange={(e) => setFriendUidInput(e.target.value)}
                  placeholder={isAr ? 'انسخ معرّف صديقك هنا' : 'Paste your friend UID here'}
                  className="min-h-[44px] w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 text-xs font-mono-tabular text-white"
                />
              </label>

              <label className="space-y-1 block text-xs">
                <span className="text-slate-300">{isAr ? 'اسم الصديق' : 'Friend Display Name'}</span>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={friendNameInput}
                  onChange={(e) => setFriendNameInput(e.target.value)}
                  placeholder={isAr ? 'مثال: كابتن أحمد' : 'e.g., Coach Ahmed'}
                  className="min-h-[44px] w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 text-sm text-white"
                />
              </label>
            </div>

            {friendFormError && (
              <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2">
                {friendFormError}
              </p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddFriendModal(false)}
                className="flex-1 min-h-[44px] rounded-full border border-white/15 text-slate-200 text-xs font-semibold hover:bg-white/10"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="flex-1 min-h-[44px] rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 text-slate-950 text-xs font-extrabold hover:opacity-95 shadow-md"
              >
                {isAr ? 'إضافة للشات' : 'Add to DM'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
