import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentReference,
} from 'firebase/firestore';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
  signInWithGoogle,
  signOutUser,
  testFirestoreConnection,
} from '../lib/firebase';
import type {
  ActivityLevel,
  AuditLogEntry,
  BodyMeasurement,
  DirectMessage,
  Discipline,
  ExerciseItem,
  FitnessGoal,
  FriendContact,
  MealLog,
  MealType,
  PersonalRecord,
  SoloLeagueEntry,
  UserProfile,
  UserRole,
  UserStatus,
  WorkoutLog,
} from '../types/fitness';

const STORAGE_KEYS = {
  workouts: 'elarb_fitpro_workouts_v1',
  meals: 'elarb_fitpro_meals_v1',
  measurements: 'elarb_fitpro_measurements_v1',
  prs: 'elarb_fitpro_prs_v1',
  disclaimer: 'elarb_fitpro_disclaimer_v1',
  targets: 'elarb_fitpro_targets_v1',
};

const DEFAULT_PROFILE: UserProfile = {
  uid: 'guest-preview',
  displayName: 'ELARB Athlete',
  role: 'member',
  status: 'active',
  goal: 'maintain',
  activityLevel: 'moderate',
  targetCalories: 2400,
  targetProtein: 175,
  targetCarbs: 250,
  targetFats: 75,
  disclaimerAccepted: false,
  heightCm: 0,
  weightKg: 0,
  age: 25,
  gender: 'male',
  onboardingCompleted: false,
  activeProgramId: 'ppl-6',
  activeDietId: 'egyptian-budget-gym',
};

function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 9);
  return `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function finiteOr(val: number, fallback: number): number {
  return Number.isFinite(val) ? val : fallback;
}

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage quota issues
  }
}

function timestampMillis(ts: unknown): number {
  if (!ts || typeof ts !== 'object') return 0;
  const maybe = ts as { toMillis?: () => number; seconds?: number };
  if (typeof maybe.toMillis === 'function') return maybe.toMillis();
  if (typeof maybe.seconds === 'number') return maybe.seconds * 1000;
  return 0;
}

interface FitnessContextValue {
  user: User | null;
  emailUnverified: boolean;
  authReady: boolean;
  profileLoaded: boolean;
  needsOnboarding: boolean;
  isAdmin: boolean;
  profile: UserProfile;
  workouts: WorkoutLog[];
  meals: MealLog[];
  measurements: BodyMeasurement[];
  prs: PersonalRecord[];
  customExercises: ExerciseItem[];
  soloLeague: SoloLeagueEntry[];
  friends: FriendContact[];
  directMessages: DirectMessage[];
  allUsers: UserProfile[];
  auditLogs: AuditLogEntry[];
  busyAction: string | null;
  errorBanner: string | null;
  clearError: () => void;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  acknowledgeDisclaimer: () => Promise<void>;
  completeMandatoryOnboarding: (params: {
    heightCm: number;
    weightKg: number;
    age: number;
    gender: 'male' | 'female';
    goal: FitnessGoal;
    activityLevel: ActivityLevel;
    targetCalories: number;
    targetProtein: number;
    targetCarbs: number;
    targetFats: number;
  }) => Promise<void>;
  setActiveProgram: (programId: string) => Promise<void>;
  setActiveDiet: (dietId: string) => Promise<void>;
  updateTargets: (params: {
    goal: FitnessGoal;
    activityLevel: ActivityLevel;
    targetCalories: number;
    targetProtein: number;
    targetCarbs: number;
    targetFats: number;
  }) => Promise<void>;
  addWorkoutLog: (entry: {
    exerciseName: string;
    discipline: Discipline;
    muscleGroup: string;
    sets: number;
    reps: number;
    weightKg: number;
    durationSec: number;
    notes: string;
  }) => Promise<void>;
  removeWorkoutLog: (id: string) => Promise<void>;
  addMealLog: (entry: {
    name: string;
    mealType: MealType;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatsG: number;
    source: 'ai-scanner' | 'manual';
  }) => Promise<void>;
  removeMealLog: (id: string) => Promise<void>;
  addBodyMeasurement: (entry: {
    weightKg: number;
    bodyFatPct: number;
    waistCm: number;
    chestCm: number;
    armCm: number;
  }) => Promise<void>;
  addPersonalRecord: (entry: {
    exerciseName: string;
    weightKg: number;
    reps: number;
  }) => Promise<void>;
  addFriendContact: (friendUid: string, displayName: string) => Promise<void>;
  removeFriendContact: (friendUid: string) => Promise<void>;
  sendDirectMessage: (receiverUid: string, receiverName: string, message: string) => Promise<void>;
  adminUpdateUser: (targetUid: string, role: UserRole, status: UserStatus) => Promise<void>;
  adminPublishExercise: (entry: {
    name: string;
    nameAr: string;
    discipline: Discipline;
    muscleGroup: string;
    equipment: string;
    instructions: string;
  }) => Promise<void>;
  clearLocalCache: () => void;
  exportUserDataJson: () => void;
  deleteCloudAccountData: () => Promise<void>;
}

const FitnessContext = createContext<FitnessContextValue | null>(null);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [isAdminDoc, setIsAdminDoc] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(() => {
    const savedTargets = readLocal<Partial<UserProfile>>(STORAGE_KEYS.targets, {});
    const savedDisclaimer = readLocal<boolean>(STORAGE_KEYS.disclaimer, false);
    return { ...DEFAULT_PROFILE, ...savedTargets, disclaimerAccepted: savedDisclaimer };
  });
  const [workouts, setWorkouts] = useState<WorkoutLog[]>(() => readLocal(STORAGE_KEYS.workouts, []));
  const [meals, setMeals] = useState<MealLog[]>(() => readLocal(STORAGE_KEYS.meals, []));
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>(() =>
    readLocal(STORAGE_KEYS.measurements, [])
  );
  const [prs, setPrs] = useState<PersonalRecord[]>(() => readLocal(STORAGE_KEYS.prs, []));
  const [customExercises, setCustomExercises] = useState<ExerciseItem[]>([]);
  const [soloLeague, setSoloLeague] = useState<SoloLeagueEntry[]>([]);
  const [friends, setFriends] = useState<FriendContact[]>([]);
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const isVerifiedUser = Boolean(user && user.emailVerified);
  const emailUnverified = Boolean(user && !user.emailVerified);
  const isPrimaryAdmin = Boolean(user?.email === 'elarbvip@gmail.com' && user?.emailVerified);
  const isAdmin = isPrimaryAdmin || isAdminDoc;
  const needsOnboarding = Boolean(
    isVerifiedUser &&
      profileLoaded &&
      (!profile.onboardingCompleted || !profile.heightCm || profile.heightCm < 100 || !profile.weightKg || profile.weightKg < 30)
  );

  useEffect(() => {
    testFirestoreConnection();
    const unsubExercises = onSnapshot(
      collection(db, 'exercises'),
      (snap) => {
        const list = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: String(data.id ?? d.id),
            name: String(data.name ?? ''),
            nameAr: String(data.nameAr ?? data.name ?? ''),
            discipline: (data.discipline as Discipline) ?? 'Bodybuilding',
            muscleGroup: String(data.muscleGroup ?? 'Full Body'),
            equipment: String(data.equipment ?? 'Barbell'),
            instructions: String(data.instructions ?? ''),
            isCustom: true,
          };
        });
        setCustomExercises(list);
      },
      () => {
        // non-blocking for offline preview
      }
    );

    const unsubAuth = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setIsAdminDoc(false);
      setProfileLoaded(false);
      if (nextUser && nextUser.emailVerified) {
        try {
          const userRef = doc(db, 'users', nextUser.uid);
          const snap = await getDoc(userRef);
          const defaultRole: UserRole = nextUser.email === 'elarbvip@gmail.com' ? 'admin' : 'member';
          if (!snap.exists()) {
            const safeName = (nextUser.displayName || nextUser.email?.split('@')[0] || 'ELARB Athlete').slice(0, 80);
            const initialDoc = {
              uid: nextUser.uid,
              displayName: safeName,
              role: defaultRole,
              status: 'active' as UserStatus,
              goal: 'maintain' as FitnessGoal,
              activityLevel: 'moderate' as ActivityLevel,
              targetCalories: 2400,
              targetProtein: 175,
              targetCarbs: 250,
              targetFats: 75,
              disclaimerAccepted: readLocal<boolean>(STORAGE_KEYS.disclaimer, false),
              heightCm: 0,
              weightKg: 0,
              age: 25,
              gender: 'male' as const,
              onboardingCompleted: false,
              activeProgramId: 'ppl-6',
              activeDietId: 'egyptian-budget-gym',
            };
            await setDoc(userRef, {
              ...initialDoc,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            setProfile(initialDoc);
            await setDoc(doc(db, 'users', nextUser.uid, 'private', 'pii'), {
              uid: nextUser.uid,
              email: (nextUser.email || 'athlete@elarb.app').slice(0, 160),
              consentVersion: 'v1.0-play-2026',
              updatedAt: serverTimestamp(),
            });
          } else {
            setProfile(snap.data() as UserProfile);
          }
          const adminSnap = await getDoc(doc(db, 'admins', nextUser.uid));
          setIsAdminDoc(adminSnap.exists());
        } catch (err) {
          console.error('Profile bootstrap warning:', err);
        } finally {
          setProfileLoaded(true);
        }
      } else {
        setFriends([]);
        setDirectMessages([]);
        setSoloLeague([]);
        setProfileLoaded(true);
      }
      setAuthReady(true);
    });

    return () => {
      unsubAuth();
      unsubExercises();
    };
  }, []);

  useEffect(() => {
    if (!authReady || !user || !user.emailVerified) return;

    const uid = user.uid;
    const unsubs: Array<() => void> = [];

    unsubs.push(
      onSnapshot(
        doc(db, 'users', uid),
        (snap) => {
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          }
          setProfileLoaded(true);
        },
        (err) => {
          setProfileLoaded(true);
          handleFirestoreError(err, OperationType.GET, `users/${uid}`);
        }
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'workouts'), where('uid', '==', uid)),
        (snap) => {
          const rows = snap.docs.map((d) => d.data() as WorkoutLog);
          rows.sort((a, b) => b.loggedDate.localeCompare(a.loggedDate));
          setWorkouts(rows);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'workouts')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'meals'), where('uid', '==', uid)),
        (snap) => {
          const rows = snap.docs.map((d) => d.data() as MealLog);
          rows.sort((a, b) => b.loggedDate.localeCompare(a.loggedDate));
          setMeals(rows);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'meals')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'measurements'), where('uid', '==', uid)),
        (snap) => {
          const rows = snap.docs.map((d) => d.data() as BodyMeasurement);
          rows.sort((a, b) => a.recordedDate.localeCompare(b.recordedDate));
          setMeasurements(rows);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'measurements')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'prs'), where('uid', '==', uid)),
        (snap) => {
          const rows = snap.docs.map((d) => d.data() as PersonalRecord);
          rows.sort((a, b) => b.estimated1RmKg - a.estimated1RmKg);
          setPrs(rows);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'prs')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'leagueEntries'),
        (snap) => {
          const rows = snap.docs.map((d) => d.data() as SoloLeagueEntry);
          rows.sort((a, b) => b.score - a.score);
          setSoloLeague(rows);
        },
        () => {
          // non-fatal if offline or bootstrapping
        }
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'users', uid, 'friends'),
        (snap) => {
          const rows = snap.docs.map((d) => d.data() as FriendContact);
          rows.sort((a, b) => a.displayName.localeCompare(b.displayName));
          setFriends(rows);
        },
        () => {
          // non-fatal if offline
        }
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'directMessages'), where('participants', 'array-contains', uid)),
        (snap) => {
          const rows = snap.docs.map((d) => d.data() as DirectMessage);
          rows.sort((a, b) => {
            const diff = timestampMillis(a.createdAt) - timestampMillis(b.createdAt);
            return diff !== 0 ? diff : a.id.localeCompare(b.id);
          });
          setDirectMessages(rows);
        },
        () => {
          // non-fatal if offline
        }
      )
    );

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [authReady, user]);

  // Auto-sync verified athlete points into public-safe Solo League standings
  useEffect(() => {
    if (!authReady || !isVerifiedUser || !user || !profileLoaded) return;
    if (!profile.onboardingCompleted || profile.uid !== user.uid) return;

    const workoutsCount = workouts.length;
    const prsCount = prs.length;
    const computedScore = 350 + workoutsCount * 100 + prsCount * 250;
    const displayName = (profile.displayName || user.displayName || 'ELARB Athlete').trim().slice(0, 80) || 'ELARB Athlete';

    const existing = soloLeague.find((entry) => entry.uid === user.uid);
    if (
      existing &&
      existing.score === computedScore &&
      existing.workoutsCount === workoutsCount &&
      existing.prsCount === prsCount &&
      existing.displayName === displayName
    ) {
      return;
    }

    setDoc(doc(db, 'leagueEntries', user.uid), {
      uid: user.uid,
      displayName,
      score: computedScore,
      workoutsCount,
      prsCount,
      updatedAt: serverTimestamp(),
    }).catch(() => {
      // non-blocking sync
    });
  }, [authReady, isVerifiedUser, user, profileLoaded, profile.onboardingCompleted, profile.uid, profile.displayName, workouts.length, prs.length, soloLeague]);

  useEffect(() => {
    if (!authReady || !user || !isPrimaryAdmin) {
      setAllUsers([]);
      setAuditLogs([]);
      return;
    }

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        setAllUsers(snap.docs.map((d) => d.data() as UserProfile));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'users')
    );

    const unsubLogs = onSnapshot(
      collection(db, 'auditLogs'),
      (snap) => {
        const logs = snap.docs.map((d) => d.data() as AuditLogEntry);
        logs.sort((a, b) => b.id.localeCompare(a.id));
        setAuditLogs(logs);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'auditLogs')
    );

    return () => {
      unsubUsers();
      unsubLogs();
    };
  }, [authReady, user, isPrimaryAdmin]);

  const loginWithGoogle = async () => {
    setBusyAction('auth');
    setErrorBanner(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setErrorBanner(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setBusyAction(null);
    }
  };

  const logout = async () => {
    setBusyAction('auth');
    try {
      await signOutUser();
      setProfile({ ...DEFAULT_PROFILE, disclaimerAccepted: readLocal(STORAGE_KEYS.disclaimer, false) });
      setWorkouts(readLocal(STORAGE_KEYS.workouts, []));
      setMeals(readLocal(STORAGE_KEYS.meals, []));
      setMeasurements(readLocal(STORAGE_KEYS.measurements, []));
      setPrs(readLocal(STORAGE_KEYS.prs, []));
      setFriends([]);
      setDirectMessages([]);
      setSoloLeague([]);
    } finally {
      setBusyAction(null);
    }
  };

  const acknowledgeDisclaimer = async () => {
    writeLocal(STORAGE_KEYS.disclaimer, true);
    setProfile((prev) => ({ ...prev, disclaimerAccepted: true }));
    if (user && user.emailVerified) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          disclaimerAccepted: true,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
  };

  const completeMandatoryOnboarding = async (params: {
    heightCm: number;
    weightKg: number;
    age: number;
    gender: 'male' | 'female';
    goal: FitnessGoal;
    activityLevel: ActivityLevel;
    targetCalories: number;
    targetProtein: number;
    targetCarbs: number;
    targetFats: number;
  }) => {
    const clean = {
      heightCm: Math.min(250, Math.max(100, Math.round(finiteOr(params.heightCm, 175)))),
      weightKg: Math.min(400, Math.max(30, Number(finiteOr(params.weightKg, 75).toFixed(1)))),
      age: Math.min(100, Math.max(12, Math.round(finiteOr(params.age, 25)))),
      gender: params.gender,
      goal: params.goal,
      activityLevel: params.activityLevel,
      targetCalories: Math.min(10000, Math.max(800, Math.round(finiteOr(params.targetCalories, 2400)))),
      targetProtein: Math.min(600, Math.max(20, Math.round(finiteOr(params.targetProtein, 160)))),
      targetCarbs: Math.min(1200, Math.max(0, Math.round(finiteOr(params.targetCarbs, 250)))),
      targetFats: Math.min(400, Math.max(10, Math.round(finiteOr(params.targetFats, 70)))),
      disclaimerAccepted: true,
      onboardingCompleted: true,
      activeProgramId:
        params.goal === 'cut' ? 'hiit-burn-4' : params.goal === 'bulk' ? 'ppl-6' : 'upper-lower-4',
      activeDietId:
        params.goal === 'cut'
          ? 'cut-high-protein'
          : params.goal === 'bulk'
          ? 'clean-lean-bulk'
          : 'egyptian-budget-gym',
    };
    setBusyAction('onboarding');
    writeLocal(STORAGE_KEYS.disclaimer, true);
    writeLocal(STORAGE_KEYS.targets, clean);
    setProfile((prev) => ({ ...prev, ...clean }));
    try {
      if (user && user.emailVerified) {
        await updateDoc(doc(db, 'users', user.uid), {
          ...clean,
          updatedAt: serverTimestamp(),
        });
        const bmId = makeId('bm');
        const today = new Date().toISOString().slice(0, 10);
        await setDoc(doc(db, 'measurements', bmId), {
          id: bmId,
          uid: user.uid,
          weightKg: clean.weightKg,
          bodyFatPct: 18,
          waistCm: 84,
          chestCm: 100,
          armCm: 35,
          recordedDate: today,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user?.uid}`);
    } finally {
      setBusyAction(null);
    }
  };

  const setActiveProgram = async (programId: string) => {
    const cleanId = programId.trim().slice(0, 64);
    setProfile((prev) => ({ ...prev, activeProgramId: cleanId }));
    if (user && user.emailVerified) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          activeProgramId: cleanId,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
  };

  const setActiveDiet = async (dietId: string) => {
    const cleanId = dietId.trim().slice(0, 64);
    setProfile((prev) => ({ ...prev, activeDietId: cleanId }));
    if (user && user.emailVerified) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          activeDietId: cleanId,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
  };

  const updateTargets = async (params: {
    goal: FitnessGoal;
    activityLevel: ActivityLevel;
    targetCalories: number;
    targetProtein: number;
    targetCarbs: number;
    targetFats: number;
  }) => {
    const clamped = {
      goal: params.goal,
      activityLevel: params.activityLevel,
      targetCalories: Math.min(10000, Math.max(800, Math.round(finiteOr(params.targetCalories, 2400)))),
      targetProtein: Math.min(600, Math.max(20, Math.round(finiteOr(params.targetProtein, 160)))),
      targetCarbs: Math.min(1200, Math.max(0, Math.round(finiteOr(params.targetCarbs, 250)))),
      targetFats: Math.min(400, Math.max(10, Math.round(finiteOr(params.targetFats, 70)))),
    };
    writeLocal(STORAGE_KEYS.targets, clamped);
    setProfile((prev) => ({ ...prev, ...clamped }));
    if (user && user.emailVerified) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          ...clamped,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
  };

  const addWorkoutLog = async (entry: {
    exerciseName: string;
    discipline: Discipline;
    muscleGroup: string;
    sets: number;
    reps: number;
    weightKg: number;
    durationSec: number;
    notes: string;
  }) => {
    const id = makeId('wk');
    const today = new Date().toISOString().slice(0, 10);
    const payload: WorkoutLog = {
      id,
      uid: user?.uid ?? 'guest-preview',
      exerciseName: entry.exerciseName.trim().slice(0, 100) || 'Training Set',
      discipline: entry.discipline,
      muscleGroup: entry.muscleGroup.trim().slice(0, 40) || 'Full Body',
      sets: Math.min(100, Math.max(1, Math.round(finiteOr(entry.sets, 3)))),
      reps: Math.min(500, Math.max(1, Math.round(finiteOr(entry.reps, 10)))),
      weightKg: Math.min(1000, Math.max(0, Number(finiteOr(entry.weightKg, 0).toFixed(1)))),
      durationSec: Math.min(86400, Math.max(0, Math.round(finiteOr(entry.durationSec, 90)))),
      notes: entry.notes.trim().slice(0, 300),
      loggedDate: today,
    };

    if (!user || !user.emailVerified) {
      const next = [payload, ...workouts];
      setWorkouts(next);
      writeLocal(STORAGE_KEYS.workouts, next);
      return;
    }

    try {
      await setDoc(doc(db, 'workouts', id), {
        ...payload,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `workouts/${id}`);
    }
  };

  const removeWorkoutLog = async (id: string) => {
    if (!user || !user.emailVerified) {
      const next = workouts.filter((w) => w.id !== id);
      setWorkouts(next);
      writeLocal(STORAGE_KEYS.workouts, next);
      return;
    }
    try {
      await deleteDoc(doc(db, 'workouts', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `workouts/${id}`);
    }
  };

  const addMealLog = async (entry: {
    name: string;
    mealType: MealType;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatsG: number;
    source: 'ai-scanner' | 'manual';
  }) => {
    const id = makeId('ml');
    const today = new Date().toISOString().slice(0, 10);
    const payload: MealLog = {
      id,
      uid: user?.uid ?? 'guest-preview',
      name: entry.name.trim().slice(0, 120) || 'Logged Meal',
      mealType: entry.mealType,
      calories: Math.min(10000, Math.max(0, Math.round(finiteOr(entry.calories, 0)))),
      proteinG: Math.min(1000, Math.max(0, Math.round(finiteOr(entry.proteinG, 0)))),
      carbsG: Math.min(1500, Math.max(0, Math.round(finiteOr(entry.carbsG, 0)))),
      fatsG: Math.min(1000, Math.max(0, Math.round(finiteOr(entry.fatsG, 0)))),
      source: entry.source,
      loggedDate: today,
    };

    if (!user || !user.emailVerified) {
      const next = [payload, ...meals];
      setMeals(next);
      writeLocal(STORAGE_KEYS.meals, next);
      return;
    }

    try {
      await setDoc(doc(db, 'meals', id), {
        ...payload,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `meals/${id}`);
    }
  };

  const removeMealLog = async (id: string) => {
    if (!user || !user.emailVerified) {
      const next = meals.filter((m) => m.id !== id);
      setMeals(next);
      writeLocal(STORAGE_KEYS.meals, next);
      return;
    }
    try {
      await deleteDoc(doc(db, 'meals', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `meals/${id}`);
    }
  };

  const addBodyMeasurement = async (entry: {
    weightKg: number;
    bodyFatPct: number;
    waistCm: number;
    chestCm: number;
    armCm: number;
  }) => {
    const id = makeId('bm');
    const today = new Date().toISOString().slice(0, 10);
    const payload: BodyMeasurement = {
      id,
      uid: user?.uid ?? 'guest-preview',
      weightKg: Math.min(400, Math.max(20, Number(finiteOr(entry.weightKg, 75).toFixed(1)))),
      bodyFatPct: Math.min(75, Math.max(2, Number(finiteOr(entry.bodyFatPct, 18).toFixed(1)))),
      waistCm: Math.min(250, Math.max(30, Number(finiteOr(entry.waistCm, 84).toFixed(1)))),
      chestCm: Math.min(250, Math.max(40, Number(finiteOr(entry.chestCm, 100).toFixed(1)))),
      armCm: Math.min(100, Math.max(15, Number(finiteOr(entry.armCm, 35).toFixed(1)))),
      recordedDate: today,
    };

    if (!user || !user.emailVerified) {
      const next = [...measurements, payload];
      setMeasurements(next);
      writeLocal(STORAGE_KEYS.measurements, next);
      return;
    }

    try {
      await setDoc(doc(db, 'measurements', id), {
        ...payload,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `measurements/${id}`);
    }
  };

  const addPersonalRecord = async (entry: {
    exerciseName: string;
    weightKg: number;
    reps: number;
  }) => {
    const id = makeId('pr');
    const today = new Date().toISOString().slice(0, 10);
    const weight = Math.min(1000, Math.max(0, Number(finiteOr(entry.weightKg, 0).toFixed(1))));
    const reps = Math.min(200, Math.max(1, Math.round(finiteOr(entry.reps, 1))));
    const estimated1RmKg = Number((weight * (1 + reps / 30)).toFixed(1));
    const payload: PersonalRecord = {
      id,
      uid: user?.uid ?? 'guest-preview',
      exerciseName: entry.exerciseName.trim().slice(0, 100) || 'Compound Lift',
      weightKg: weight,
      reps,
      estimated1RmKg: Math.min(1500, estimated1RmKg),
      achievedDate: today,
    };

    if (!user || !user.emailVerified) {
      const next = [payload, ...prs].sort((a, b) => b.estimated1RmKg - a.estimated1RmKg);
      setPrs(next);
      writeLocal(STORAGE_KEYS.prs, next);
      return;
    }

    try {
      await setDoc(doc(db, 'prs', id), {
        ...payload,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `prs/${id}`);
    }
  };

  const addFriendContact = async (friendUid: string, displayName: string) => {
    if (!user || !user.emailVerified) return;
    const cleanUid = friendUid.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
    const cleanName = displayName.trim().slice(0, 80);
    if (!cleanUid || !cleanName || cleanUid === user.uid) return;

    try {
      await setDoc(doc(db, 'users', user.uid, 'friends', cleanUid), {
        uid: cleanUid,
        displayName: cleanName,
        addedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/friends/${cleanUid}`);
    }
  };

  const removeFriendContact = async (friendUid: string) => {
    if (!user || !user.emailVerified) return;
    const cleanUid = friendUid.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
    if (!cleanUid) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'friends', cleanUid));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/friends/${cleanUid}`);
    }
  };

  const sendDirectMessage = async (receiverUid: string, receiverName: string, message: string) => {
    if (!user || !user.emailVerified) return;
    const cleanReceiverUid = receiverUid.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
    const cleanMsg = message.trim().slice(0, 600);
    if (!cleanReceiverUid || !cleanMsg || cleanReceiverUid === user.uid) return;

    const id = makeId('dm');
    const senderName = (profile.displayName || user.displayName || 'ELARB Athlete').trim().slice(0, 80) || 'ELARB Athlete';
    const cleanReceiverName = receiverName.trim().slice(0, 80) || 'Athlete';
    const participants = [user.uid, cleanReceiverUid].sort();

    try {
      await setDoc(doc(db, 'directMessages', id), {
        id,
        participants,
        senderUid: user.uid,
        senderName,
        receiverUid: cleanReceiverUid,
        receiverName: cleanReceiverName,
        message: cleanMsg,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `directMessages/${id}`);
    }
  };

  const adminUpdateUser = async (targetUid: string, role: UserRole, status: UserStatus) => {
    if (!user || !user.emailVerified || !isAdmin) return;
    try {
      await updateDoc(doc(db, 'users', targetUid), {
        role,
        status,
        updatedAt: serverTimestamp(),
      });

      // Keep /admins registry in sync with role elevation/demotion
      if (role === 'admin') {
        await setDoc(doc(db, 'admins', targetUid), {
          uid: targetUid,
          email: 'delegated-admin@elarb.app',
          grantedBy: user.uid,
          createdAt: serverTimestamp(),
        });
      } else if (targetUid !== user.uid) {
        await deleteDoc(doc(db, 'admins', targetUid)).catch(() => {});
      }

      const logId = makeId('aud');
      await setDoc(doc(db, 'auditLogs', logId), {
        id: logId,
        actorUid: user.uid,
        action: 'USER_RBAC_UPDATED',
        targetId: targetUid,
        details: `role=${role}, status=${status}`,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUid}`);
    }
  };

  const adminPublishExercise = async (entry: {
    name: string;
    nameAr: string;
    discipline: Discipline;
    muscleGroup: string;
    equipment: string;
    instructions: string;
  }) => {
    if (!user || !user.emailVerified || !isAdmin) return;
    const id = makeId('ex');
    try {
      await setDoc(doc(db, 'exercises', id), {
        id,
        name: entry.name.trim().slice(0, 100),
        nameAr: entry.nameAr.trim().slice(0, 100),
        discipline: entry.discipline,
        muscleGroup: entry.muscleGroup.trim().slice(0, 40),
        equipment: entry.equipment.trim().slice(0, 40),
        instructions: entry.instructions.trim().slice(0, 400),
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
      const logId = makeId('aud');
      await setDoc(doc(db, 'auditLogs', logId), {
        id: logId,
        actorUid: user.uid,
        action: 'EXERCISE_PUBLISHED',
        targetId: id,
        details: entry.name.trim().slice(0, 120),
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `exercises/${id}`);
    }
  };

  const clearLocalCache = () => {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
    if (!user) {
      setWorkouts([]);
      setMeals([]);
      setMeasurements([]);
      setPrs([]);
      setProfile(DEFAULT_PROFILE);
    }
  };

  const exportUserDataJson = () => {
    const bundle = {
      app: 'ELARB FitPro Ultra',
      exportedAt: new Date().toISOString(),
      profile,
      workouts,
      meals,
      measurements,
      prs,
      friends,
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `elarb-fitpro-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteCloudAccountData = async () => {
    setBusyAction('delete-account');
    try {
      clearLocalCache();
      if (user && user.emailVerified) {
        const uid = user.uid;
        const refsToDelete: DocumentReference[] = [];
        const colNames = ['workouts', 'meals', 'measurements', 'prs'] as const;
        for (const colName of colNames) {
          const snap = await getDocs(query(collection(db, colName), where('uid', '==', uid)));
          snap.docs.forEach((d) => refsToDelete.push(d.ref));
        }
        const friendsSnap = await getDocs(collection(db, 'users', uid, 'friends'));
        friendsSnap.docs.forEach((d) => refsToDelete.push(d.ref));

        refsToDelete.push(doc(db, 'leagueEntries', uid));
        refsToDelete.push(doc(db, 'users', uid, 'private', 'pii'));
        refsToDelete.push(doc(db, 'users', uid));

        // Commit in chunks safely below Firestore's 500-write batch limit
        for (let i = 0; i < refsToDelete.length; i += 400) {
          const batch = writeBatch(db);
          refsToDelete.slice(i, i + 400).forEach((ref) => batch.delete(ref));
          if (i + 400 >= refsToDelete.length) {
            const logId = makeId('aud');
            batch.set(doc(db, 'auditLogs', logId), {
              id: logId,
              actorUid: uid,
              action: 'ACCOUNT_DATA_DELETED',
              targetId: uid,
              details: 'User executed Google Play self-service account data deletion.',
              createdAt: serverTimestamp(),
            });
          }
          await batch.commit();
        }
        await signOutUser();
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'user-account-bundle');
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <FitnessContext.Provider
      value={{
        user,
        emailUnverified,
        authReady,
        profileLoaded,
        needsOnboarding,
        isAdmin,
        profile,
        workouts,
        meals,
        measurements,
        prs,
        customExercises,
        soloLeague,
        friends,
        directMessages,
        allUsers,
        auditLogs,
        busyAction,
        errorBanner,
        clearError: () => setErrorBanner(null),
        loginWithGoogle,
        logout,
        acknowledgeDisclaimer,
        completeMandatoryOnboarding,
        setActiveProgram,
        setActiveDiet,
        updateTargets,
        addWorkoutLog,
        removeWorkoutLog,
        addMealLog,
        removeMealLog,
        addBodyMeasurement,
        addPersonalRecord,
        addFriendContact,
        removeFriendContact,
        sendDirectMessage,
        adminUpdateUser,
        adminPublishExercise,
        clearLocalCache,
        exportUserDataJson,
        deleteCloudAccountData,
      }}
    >
      {children}
    </FitnessContext.Provider>
  );
};

export function useFitness() {
  const ctx = useContext(FitnessContext);
  if (!ctx) throw new Error('useFitness must be used inside FirebaseProvider');
  return ctx;
}
