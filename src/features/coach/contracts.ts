import type {
  AvailableTrainingDays,
  EffortLanguage,
  EquipmentId,
  ExperienceLevel,
  Exercise,
  ExerciseId,
  ExercisePrescription,
  MovementFamiliarity,
  MovementPattern,
  MuscleGroup,
  ProgramId,
  StructuredRestriction,
  TrainingGoal,
  TrainingProgram,
} from "../../types.js";

export type CoachReasonCode =
  | "schedule-prefers-three-days"
  | "schedule-prefers-four-days"
  | "schedule-prefers-six-days"
  | "plan-exact-schedule-match"
  | "plan-session-duration-fit"
  | "experience-prefers-full-body"
  | "experience-prefers-upper-lower"
  | "experience-prefers-ppl"
  | "goal-strength-compounds"
  | "goal-hypertrophy-volume"
  | "equipment-safe-substitution"
  | "restriction-safe-substitution"
  | "equipment-prescription-removed"
  | "primary-pattern-unavailable"
  | "plan-equipment-safe"
  | "plan-recommended"
  | "session-time-shortened"
  | "readiness-low-energy"
  | "readiness-high-soreness"
  | "readiness-effort-reduced"
  | "pain-blocks-movement"
  | "pain-safe-substitution"
  | "no-adjustment-needed"
  | "insufficient-evidence"
  | "safe-default-plan"
  | "pain-blocks-progression"
  | "progression-insufficient-history"
  | "progression-top-range-complete"
  | "progression-reps-still-building"
  | "progression-linear-success"
  | "progression-poor-session-observe"
  | "progression-repeated-below-range"
  | "progression-interruption-guard"
  | "progression-duration-complete"
  | "progression-manual-strategy"
  | "progression-hold-current"
  | "recap-plan-adherence"
  | "recap-progression-ready"
  | "recap-personal-record"
  | "recap-pain-attention"
  | "recap-primary-work-incomplete"
  | "recap-recovery-attention"
  | "recap-next-session-plan"
  | "preference-saved"
  | "preference-cleared";

export type CoachEvidence = {
  key: string;
  value: string | number | boolean;
};

export type CoachConfidence = "low" | "medium" | "high";

export type CoachDecision<T> = {
  value: T;
  reasonCode: CoachReasonCode;
  explanation: string;
  confidence: CoachConfidence;
  evidence: CoachEvidence[];
};

export type PainConcern = {
  bodyArea: StructuredRestriction["bodyArea"];
  severity: "mild" | "sharp" | "unusual" | "worsening" | "joint-specific";
  affectedPatterns: MovementPattern[];
  note?: string;
};

export type PlanBuilderInput = {
  goal: Exclude<TrainingGoal, "fat-loss"> | "fat-loss";
  experience: ExperienceLevel;
  availableDays: AvailableTrainingDays;
  sessionMinutes: 40 | 60 | 75 | 90;
  equipment: EquipmentId[];
  preferredDays: number[];
  priorityMuscles: MuscleGroup[];
  restrictions: StructuredRestriction[];
  effortLanguage: EffortLanguage;
  movementFamiliarity: MovementFamiliarity;
  consistencyWeeks: number;
  recentLoads: Partial<Record<ExerciseId, number>>;
};

export type CoachWorkout = {
  id: string;
  name: string;
  shortName: string;
  focus: string;
  exercises: ExercisePrescription[];
};

export type CoachProgram = Omit<TrainingProgram, "workouts"> & {
  workouts: CoachWorkout[];
};

export type SubstitutionRecord = {
  prescriptionId: string;
  fromExerciseId: ExerciseId;
  toExerciseId: ExerciseId;
  reasonCode: CoachReasonCode;
  explanation: string;
};

export type PlanRecommendation = {
  program: CoachProgram;
  canonicalProgramId: ProgramId;
  substitutions: SubstitutionRecord[];
  removedPrescriptionIds: string[];
  invalidPrescriptionIds: string[];
  estimatedDurationMinutes: number;
  stimulusLabel: "cơ bản" | "cân bằng" | "cao";
  warnings: string[];
  decisions: CoachDecision<string>[];
};

export type SubstitutionInput = {
  exerciseId: ExerciseId;
  equipment: EquipmentId[];
  restrictions: StructuredRestriction[];
  exercises: Record<ExerciseId, Exercise>;
};

export type ReadinessInput = {
  energy: "low" | "normal" | "high";
  soreness: "none" | "manageable" | "high";
  pain: PainConcern | null;
  availableMinutes: number;
};

export type ReadinessChange =
  | { type: "removed"; prescriptionId: string }
  | { type: "blocked"; prescriptionId: string }
  | { type: "set-count"; prescriptionId: string; before: number; after: number }
  | { type: "effort"; prescriptionId: string }
  | { type: "substitution"; prescriptionId: string; exerciseId: ExerciseId };

export type ReadinessAdjustment = {
  prescriptions: ExercisePrescription[];
  removedPrescriptionIds: string[];
  blockedPrescriptionIds: string[];
  changedSetCounts: Array<{ prescriptionId: string; before: number; after: number }>;
  changedEffortPrescriptionIds: string[];
  substitutions: SubstitutionRecord[];
  allowStart: boolean;
  appliedReasonCodes: CoachReasonCode[];
  decisions?: CoachDecision<ReadinessChange>[];
};
