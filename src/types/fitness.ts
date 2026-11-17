export type Language = 'en' | 'ar';
export type UserRole = 'member' | 'coach' | 'admin';
export type UserStatus = 'active' | 'suspended';
export type FitnessGoal = 'cut' | 'maintain' | 'bulk';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete';
export type Discipline = 'Bodybuilding' | 'Calisthenics' | 'CrossFit' | 'HIIT';
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
export type AppTab = 'overview' | 'workouts' | 'nutrition' | 'progress' | 'compliance' | 'admin';

export interface UserProfile {
  uid: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  goal: FitnessGoal;
  activityLevel: ActivityLevel;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFats: number;
  disclaimerAccepted: boolean;
  heightCm?: number;
  weightKg?: number;
  age?: number;
  gender?: 'male' | 'female';
  onboardingCompleted?: boolean;
  activeProgramId?: string;
  activeDietId?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ProgramExercise {
  id: string;
  name: string;
  nameAr: string;
  muscleGroup: string;
  sets: number;
  reps: string;
  restSec: number;
  suggestedWeightKg: number;
  cueEn: string;
  cueAr: string;
}

export interface ProgramDay {
  dayIndex: number;
  dayNameEn: string;
  dayNameAr: string;
  focusEn: string;
  focusAr: string;
  isRest: boolean;
  exercises: ProgramExercise[];
}

export interface TrainingProgram {
  id: string;
  titleEn: string;
  titleAr: string;
  taglineEn: string;
  taglineAr: string;
  discipline: Discipline;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  goalTag: FitnessGoal | 'all';
  daysPerWeek: number;
  sessionMinutes: number;
  equipmentEn: string;
  equipmentAr: string;
  schedule: ProgramDay[];
}

export interface DietMealItem {
  id: string;
  mealType: MealType;
  nameEn: string;
  nameAr: string;
  portionsEn: string;
  portionsAr: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
}

export interface DietPlan {
  id: string;
  titleEn: string;
  titleAr: string;
  taglineEn: string;
  taglineAr: string;
  goalTag: FitnessGoal;
  styleTagEn: string;
  styleTagAr: string;
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatsG: number;
  hydrationLiters: number;
  meals: DietMealItem[];
}

export interface WorkoutLog {
  id: string;
  uid: string;
  exerciseName: string;
  discipline: Discipline;
  muscleGroup: string;
  sets: number;
  reps: number;
  weightKg: number;
  durationSec: number;
  notes: string;
  loggedDate: string;
  createdAt?: unknown;
}

export interface MealLog {
  id: string;
  uid: string;
  name: string;
  mealType: MealType;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  source: 'ai-scanner' | 'manual';
  loggedDate: string;
  createdAt?: unknown;
}

export interface BodyMeasurement {
  id: string;
  uid: string;
  weightKg: number;
  bodyFatPct: number;
  waistCm: number;
  chestCm: number;
  armCm: number;
  recordedDate: string;
  createdAt?: unknown;
}

export interface PersonalRecord {
  id: string;
  uid: string;
  exerciseName: string;
  weightKg: number;
  reps: number;
  estimated1RmKg: number;
  achievedDate: string;
  createdAt?: unknown;
}

export type MotionPattern =
  | 'press'
  | 'squat'
  | 'hinge'
  | 'pull'
  | 'curl'
  | 'lateral'
  | 'core'
  | 'lunge'
  | 'conditioning'
  | 'dip';

export interface ExerciseItem {
  id: string;
  name: string;
  nameAr: string;
  discipline: Discipline;
  muscleGroup: string;
  equipment: string;
  instructions: string;
  instructionsAr?: string;
  mistakes?: string;
  mistakesAr?: string;
  motionPattern?: MotionPattern;
  defaultSets?: number;
  defaultReps?: string;
  isCustom?: boolean;
}

export interface AuditLogEntry {
  id: string;
  actorUid: string;
  action: string;
  targetId: string;
  details: string;
  createdAt?: unknown;
}

export interface FoodAnalysisResult {
  mealName: string;
  servingSize: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  fiberG: number;
  confidenceNote: string;
  items: Array<{
    name: string;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatsG: number;
  }>;
}

export interface AiWorkoutPlan {
  planTitle: string;
  weeklySummary: string;
  safetyTip: string;
  days: Array<{
    dayLabel: string;
    focus: string;
    exercises: Array<{
      name: string;
      sets: number;
      reps: string;
      restSec: number;
    }>;
  }>;
}
