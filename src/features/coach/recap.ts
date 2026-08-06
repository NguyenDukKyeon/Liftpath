import { defaultProgression } from "../../data.js";
import {
  detectPersonalRecords,
  sessionVolume,
} from "../../domain/training.js";
import type {
  ExerciseEntry,
  LoggedSet,
  PersonalRecord,
  Session,
  TrackingMode,
  WorkoutRecap,
} from "../../types.js";
import type {
  CoachDecision,
  CoachReasonCode,
  PainConcern,
} from "./contracts.js";
import { explainReason } from "./explanations.js";
import {
  recommendProgression,
  type ProgressionExposure,
  type ProgressionResult,
} from "./progression.js";

export type WorkoutCoachRecapItem = {
  reasonCode: string;
  headline: string;
  explanation: string;
  exerciseId?: string;
};

export type ExerciseDecisionSnapshot = {
  exerciseId: string;
  exerciseName: string;
  decision: CoachDecision<ProgressionResult>;
};

export type WorkoutCoachRecap = WorkoutRecap & {
  generatedAt: string;
  wentWell: WorkoutCoachRecapItem[];
  attention: WorkoutCoachRecapItem[];
  nextTime: WorkoutCoachRecapItem[];
  exerciseDecisions: ExerciseDecisionSnapshot[];
  readinessEvidence: unknown;
};

export type WorkoutRecapInput = {
  session: Session;
  historyBefore: Session[];
  readiness: {
    input?: {
      pain?: PainConcern | null;
      energy?: string;
      soreness?: string;
    };
    appliedReasonCodes?: CoachReasonCode[];
  } | null;
};

const modeFor = (entry: ExerciseEntry): TrackingMode => {
  if (entry.snapshot.trackingMode) return entry.snapshot.trackingMode;
  if (entry.snapshot.suffix === "seconds") return "duration";
  if (entry.snapshot.incrementKg === 0) return "bodyweight-reps";
  return "weight-reps";
};

const effortFromLegacy = (value: string): LoggedSet["effort"] => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 10
    ? { mode: "rpe", value: parsed }
    : null;
};

const loggedSetsFor = (entry: ExerciseEntry): LoggedSet[] => {
  if (entry.loggedSets?.length) return entry.loggedSets;
  const mode = modeFor(entry);
  return entry.sets.map((set) => {
    const base = { id: set.id, kind: set.kind, effort: effortFromLegacy(set.rpe), done: set.done };
    const reps = set.reps === "" ? null : Number(set.reps);
    const weight = set.weight === "" ? null : Number(set.weight);
    if (mode === "duration") return { ...base, trackingMode: "duration", seconds: reps };
    if (mode === "distance") return { ...base, trackingMode: "distance", distanceMeters: reps };
    if (mode === "bodyweight-reps") return { ...base, trackingMode: "bodyweight-reps", reps };
    if (mode === "assisted-reps") return { ...base, trackingMode: "assisted-reps", assistanceKg: weight, reps };
    if (mode === "weighted-bodyweight-reps") return { ...base, trackingMode: "weighted-bodyweight-reps", addedWeightKg: weight, reps };
    return { ...base, trackingMode: "weight-reps", weightKg: weight, reps };
  });
};

const exposuresFor = (
  current: Session,
  history: Session[],
  exerciseId: string,
): ProgressionExposure[] => [current, ...history]
  .flatMap((session): ProgressionExposure[] => {
    const entry = session.exercises.find((item) => item.exerciseId === exerciseId);
    return entry ? [{ completedAt: session.endedAt, sets: loggedSetsFor(entry) }] : [];
  })
  .slice(0, 3);

const painFor = (
  readiness: WorkoutRecapInput["readiness"],
  entry: ExerciseEntry,
) => {
  const pain = readiness?.input?.pain ?? null;
  return pain && entry.snapshot.movementPattern && pain.affectedPatterns.includes(entry.snapshot.movementPattern)
    ? pain
    : null;
};

const nextHeadline = (decision: CoachDecision<ProgressionResult>) => {
  const value = decision.value;
  if (value.action === "increase-load" && value.targetLoadKg != null) return `Tăng lên ${value.targetLoadKg} kg`;
  if (value.action === "reduce-load" && value.targetLoadKg != null) return `Giảm về ${value.targetLoadKg} kg`;
  if (value.action === "increase-reps" && value.targetReps != null) return `Nâng mục tiêu lên ${value.targetReps} reps`;
  if (value.action === "increase-duration" && value.targetSeconds != null) return `Nâng mục tiêu lên ${value.targetSeconds} giây`;
  if (value.action === "manual-review") return "Đánh giá lại bài trước lần tập tới";
  if (value.targetLoadKg != null) return `Giữ khoảng ${value.targetLoadKg} kg`;
  return "Giữ mục tiêu hiện tại";
};

const item = (
  reasonCode: string,
  headline: string,
  explanation: string,
  exerciseId?: string,
): WorkoutCoachRecapItem => ({ reasonCode, headline, explanation, exerciseId });

const completedWorkingSets = (entry: ExerciseEntry) => entry.sets.filter((set) => set.done && set.kind !== "warmup").length;

export const buildWorkoutRecap = ({
  session,
  historyBefore,
  readiness,
}: WorkoutRecapInput): WorkoutCoachRecap => {
  const prs: PersonalRecord[] = detectPersonalRecords(session, historyBefore);
  const exerciseDecisions: ExerciseDecisionSnapshot[] = session.exercises.map((entry) => {
    const mode = modeFor(entry);
    const pseudoExercise = {
      id: entry.exerciseId,
      name: entry.snapshot.name,
      primary: entry.snapshot.primary,
      secondary: entry.snapshot.secondary,
      equipment: entry.snapshot.equipment,
      equipmentTags: mode === "bodyweight-reps" ? ["bodyweight" as const] : ["dumbbell" as const],
      sets: entry.target.sets,
      min: entry.target.min,
      max: entry.target.max,
      rest: entry.target.rest,
      technique: "",
      alternatives: [],
      type: "upper" as const,
      suffix: entry.snapshot.suffix,
      incrementKg: entry.snapshot.incrementKg,
      trackingMode: mode,
      movementPattern: entry.snapshot.movementPattern,
      unilateral: entry.snapshot.unilateral,
    };
    const decision = recommendProgression({
      exerciseId: entry.exerciseId,
      strategy: entry.target.progression ?? defaultProgression(pseudoExercise),
      trackingMode: mode,
      target: { min: entry.target.min, max: entry.target.max },
      recentExposures: exposuresFor(session, historyBefore, entry.exerciseId),
      interruptionDays: 0,
      painConcern: painFor(readiness, entry),
      availableIncrementKg: Math.max(0.5, entry.snapshot.incrementKg || 0.5),
    });
    return { exerciseId: entry.exerciseId, exerciseName: entry.snapshot.name, decision };
  });

  const plannedSets = session.exercises.reduce((sum, entry) => sum + Math.max(1, entry.target.sets), 0);
  const completedSets = session.exercises.reduce((sum, entry) => sum + completedWorkingSets(entry), 0);
  const adherence = plannedSets ? completedSets / plannedSets : 0;
  const wentWell: WorkoutCoachRecapItem[] = [];
  const attention: WorkoutCoachRecapItem[] = [];
  const nextTime: WorkoutCoachRecapItem[] = [];

  if (adherence >= 0.8) {
    wentWell.push(item(
      "recap-plan-adherence",
      "Bạn đã hoàn thành phần chính của buổi tập",
      explainReason("recap-plan-adherence"),
    ));
  }

  if (prs.length) {
    wentWell.push(item(
      "recap-personal-record",
      `${prs.length} thành tích cá nhân mới`,
      explainReason("recap-personal-record"),
    ));
  }

  const progressionReady = exerciseDecisions.filter(({ decision }) =>
    decision.value.action === "increase-load"
    || decision.value.action === "increase-reps"
    || decision.value.action === "increase-duration");
  if (progressionReady.length) {
    wentWell.push(item(
      "recap-progression-ready",
      `${progressionReady.length} bài sẵn sàng tiến bộ`,
      explainReason("recap-progression-ready"),
    ));
  }

  const painInReadiness = readiness?.input?.pain;
  const painInNotes = /\b(đau|nhói|pain|khó chịu)\b/i.test(`${session.note} ${session.feedback?.note ?? ""} ${session.exercises.map((entry) => entry.note).join(" ")}`);
  if (painInReadiness || painInNotes) {
    attention.push(item(
      "recap-pain-attention",
      "Ưu tiên xem lại tín hiệu đau",
      explainReason("recap-pain-attention"),
    ));
  }

  const incompletePrimary = session.exercises
    .slice(0, 2)
    .filter((entry) => completedWorkingSets(entry) < entry.target.sets);
  if (incompletePrimary.length) {
    attention.push(item(
      "recap-primary-work-incomplete",
      `${incompletePrimary.length} bài chính chưa hoàn thành kế hoạch`,
      explainReason("recap-primary-work-incomplete"),
    ));
  }

  if ((session.feedback?.energy ?? 3) <= 2 || (session.feedback?.soreness ?? 3) >= 4) {
    attention.push(item(
      "recap-recovery-attention",
      "Hồi phục hôm nay cần được theo dõi",
      explainReason("recap-recovery-attention"),
    ));
  }

  exerciseDecisions.forEach(({ exerciseId, exerciseName, decision }) => {
    nextTime.push(item(
      decision.reasonCode,
      `${exerciseName}: ${nextHeadline(decision)}`,
      decision.explanation,
      exerciseId,
    ));
  });

  if (!wentWell.length && completedSets > 0) {
    wentWell.push(item(
      "recap-plan-adherence",
      "Bạn đã ghi lại buổi tập đầy đủ để LiftPath học từ dữ liệu",
      "Dữ liệu nhất quán quan trọng hơn một con số volume đơn lẻ.",
    ));
  }

  const volume = Math.round(sessionVolume(session));
  const durationMinutes = Math.max(1, Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 60_000));
  const strongest = [...session.exercises]
    .sort((a, b) => completedWorkingSets(b) - completedWorkingSets(a))[0];

  return {
    sessionId: session.id,
    generatedAt: session.endedAt,
    durationMinutes,
    totalSets: session.totalSets,
    volume,
    prs,
    strongestExercise: strongest?.snapshot.name,
    nextAction: nextTime[0]?.headline ?? "Giữ kế hoạch và thu thập thêm dữ liệu.",
    wentWell,
    attention,
    nextTime,
    exerciseDecisions,
    readinessEvidence: readiness ? JSON.parse(JSON.stringify(readiness)) : null,
  };
};

export const isWorkoutCoachRecap = (value: WorkoutRecap): value is WorkoutCoachRecap =>
  "wentWell" in value && Array.isArray((value as WorkoutCoachRecap).wentWell);
