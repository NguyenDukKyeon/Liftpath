import { LiftPathV5Error } from "../common/errors.js";
import type { ExerciseMetadata, MuscleId } from "../exercises/exercise.js";
import {
  INDIRECT_SET_CREDIT,
  PROGRAMMING_POLICY_VERSION,
  WORKLOAD_BANDS,
  type MusclePriority,
} from "./policy-constants.js";
import type { ProgramExercise, ProgramSession, PrescribedSet } from "./program.js";
import type { PrescriptionInput, ProgramProposal } from "./prescription.js";
import { ALL_MUSCLES } from "./policies/goal-policy.js";
import { composeMusclePriorities, type MusclePriorityMap } from "./policies/specialization-policy.js";

const PRIORITY_WEIGHT: Record<MusclePriority, number> = {
  maintenance: 1,
  normal: 2,
  high: 3,
  specialization: 4,
};

const LOWER_MUSCLES = new Set<MuscleId>(["quads", "hamstrings", "glutes", "calves"]);

function emptyWorkload(): Record<MuscleId, number> {
  return Object.fromEntries(ALL_MUSCLES.map((muscle) => [muscle, 0])) as Record<MuscleId, number>;
}

function workloadTargets(input: PrescriptionInput, priorities: MusclePriorityMap): Record<MuscleId, number> {
  return Object.fromEntries(
    ALL_MUSCLES.map((muscle) => {
      const priority = priorities[muscle];
      const band = WORKLOAD_BANDS[input.profile.goal][input.profile.level][priority];
      const target = priority === "high" || priority === "specialization"
        ? band.targetDirectEquivalentSets
        : band.minDirectEquivalentSets;
      return [muscle, target];
    }),
  ) as Record<MuscleId, number>;
}

function workloadMaximums(input: PrescriptionInput, priorities: MusclePriorityMap): Record<MuscleId, number> {
  return Object.fromEntries(
    ALL_MUSCLES.map((muscle) => [
      muscle,
      WORKLOAD_BANDS[input.profile.goal][input.profile.level][priorities[muscle]].maxDirectEquivalentSets,
    ]),
  ) as Record<MuscleId, number>;
}

function filterCatalog(input: PrescriptionInput): ExerciseMetadata[] {
  const available = new Set(input.profile.constraints.equipment);
  const disliked = new Set(input.profile.constraints.dislikedExerciseIds);
  const restricted = new Set(input.profile.constraints.restrictedMovementPatterns);
  const filtered = input.catalog
    .filter((exercise) => exercise.kind === "resistance" || exercise.kind === "bodyweight")
    .filter((exercise) => exercise.equipment.every((item) => available.has(item)))
    .filter((exercise) => !disliked.has(exercise.id))
    .filter((exercise) => !restricted.has(exercise.movementPattern))
    .sort((left, right) => left.id.localeCompare(right.id));

  if (filtered.length === 0) {
    throw new LiftPathV5Error("VALIDATION_ERROR", "No exercises satisfy the selected training constraints");
  }
  return filtered;
}

function sessionExerciseLimit(minutes: number): number {
  if (minutes <= 30) return 4;
  if (minutes <= 45) return 5;
  return 6;
}

function isLowerExercise(exercise: ExerciseMetadata): boolean {
  return exercise.primaryMuscles.length > 0 && exercise.primaryMuscles.every((muscle) => LOWER_MUSCLES.has(muscle));
}

function sessionCompatibility(sessionKey: string, exercise: ExerciseMetadata): number {
  const key = sessionKey.toLowerCase();
  const pattern = exercise.movementPattern;
  if (key.includes("full")) return 3;
  if (key.includes("limbs")) return 2;
  if (isLowerExercise(exercise)) {
    return key.includes("lower") || key.includes("legs") ? 4 : 0;
  }
  if (key.includes("push")) return pattern.includes("push") || pattern.includes("extension") ? 5 : 1;
  if (key.includes("pull")) return pattern.includes("pull") || pattern.includes("flexion") || pattern.includes("rear") ? 5 : 1;
  if (key.includes("upper") || key.includes("torso")) return 4;
  return 1;
}

function chooseSessionIndex(
  sessions: ProgramSession[],
  exercise: ExerciseMetadata,
  perSessionLimit: number,
): number | undefined {
  const candidates = sessions
    .map((session, index) => ({
      index,
      score: sessionCompatibility(session.key, exercise),
      count: session.exercises.length,
      duplicate: session.exercises.some((item) => item.exerciseId === exercise.id),
    }))
    .filter((candidate) => !candidate.duplicate && candidate.count < perSessionLimit && candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.count - right.count || left.index - right.index);
  return candidates[0]?.index;
}

function remainingMaximumSets(
  exercise: ExerciseMetadata,
  workload: Record<MuscleId, number>,
  maximums: Record<MuscleId, number>,
): number {
  const allowances: number[] = [];
  for (const muscle of exercise.primaryMuscles) {
    allowances.push(Math.floor(maximums[muscle] - workload[muscle] + 1e-9));
  }
  for (const muscle of exercise.secondaryMuscles) {
    allowances.push(Math.floor((maximums[muscle] - workload[muscle] + 1e-9) / INDIRECT_SET_CREDIT));
  }
  if (allowances.length === 0) return 0;
  return Math.max(0, Math.min(...allowances));
}

function exerciseNeedScore(
  exercise: ExerciseMetadata,
  priorities: MusclePriorityMap,
  targets: Record<MuscleId, number>,
  workload: Record<MuscleId, number>,
  exposureCount: number,
  level: PrescriptionInput["profile"]["level"],
): number {
  if (exposureCount >= 3) return Number.NEGATIVE_INFINITY;
  let score = 0;
  for (const muscle of exercise.primaryMuscles) {
    const deficit = Math.max(0, targets[muscle] - workload[muscle]);
    score += deficit * PRIORITY_WEIGHT[priorities[muscle]];
    if (workload[muscle] === 0) score += 4;
  }
  for (const muscle of exercise.secondaryMuscles) {
    const deficit = Math.max(0, targets[muscle] - workload[muscle]);
    score += deficit * PRIORITY_WEIGHT[priorities[muscle]] * INDIRECT_SET_CREDIT * 0.5;
  }
  if (level === "beginner" && exercise.skillDemand === "high") score -= 2;
  if (level === "beginner" && exercise.fatigueClass === "high") score -= 1.5;
  return score;
}

function chooseSetCount(
  exercise: ExerciseMetadata,
  priorities: MusclePriorityMap,
  targets: Record<MuscleId, number>,
  workload: Record<MuscleId, number>,
  maximums: Record<MuscleId, number>,
): number {
  const directDeficit = Math.max(
    0,
    ...exercise.primaryMuscles.map((muscle) => targets[muscle] - workload[muscle]),
  );
  const priority = exercise.primaryMuscles.reduce<MusclePriority>(
    (best, muscle) => PRIORITY_WEIGHT[priorities[muscle]] > PRIORITY_WEIGHT[best] ? priorities[muscle] : best,
    "maintenance",
  );
  const preferred = priority === "specialization" || priority === "high" ? 4 : 3;
  const allowed = remainingMaximumSets(exercise, workload, maximums);
  return Math.max(0, Math.min(preferred, Math.max(1, Math.ceil(directDeficit)), allowed));
}

function addWorkload(workload: Record<MuscleId, number>, exercise: ExerciseMetadata, sets: number): void {
  for (const muscle of exercise.primaryMuscles) workload[muscle] += sets;
  for (const muscle of exercise.secondaryMuscles) workload[muscle] += sets * INDIRECT_SET_CREDIT;
}

function pickRepRange(exercise: ExerciseMetadata, goal: PrescriptionInput["profile"]["goal"]): { min: number; max: number } {
  const sorted = [...exercise.supportedRepRanges].sort((left, right) => left.min - right.min || left.max - right.max);
  if (goal === "strength") return sorted[0];
  return sorted[sorted.length - 1];
}

function makeSets(exercise: ExerciseMetadata, count: number, input: PrescriptionInput): PrescribedSet[] {
  const range = pickRepRange(exercise, input.profile.goal);
  const targetRir = input.profile.goal === "hypertrophy" ? 2 : 3;
  return Array.from({ length: count }, (_, index) => ({
    ordinal: index + 1,
    minReps: range.min,
    maxReps: range.max,
    targetRir,
  }));
}

function finalizeOrdering(sessions: ProgramSession[]): ProgramSession[] {
  return sessions.map((session) => ({
    ...session,
    exercises: session.exercises.map((exercise, index) => ({ ...exercise, order: index + 1 })),
  }));
}

function majorCoverageSatisfied(workload: Record<MuscleId, number>): boolean {
  return ["lats", "side_delts", "chest", "quads", "hamstrings", "glutes"].every(
    (muscle) => workload[muscle as MuscleId] > 0,
  );
}

export function createInitialPrescription(input: PrescriptionInput): ProgramProposal {
  if (input.structure.daysPerWeek !== input.profile.constraints.daysPerWeek) {
    throw new LiftPathV5Error("VALIDATION_ERROR", "Selected structure does not match available training days");
  }
  if (input.structure.sessionKeys.length !== input.structure.daysPerWeek) {
    throw new LiftPathV5Error("VALIDATION_ERROR", "Selected structure has an invalid session count");
  }

  const priorities = composeMusclePriorities(input.profile);
  const targets = workloadTargets(input, priorities);
  const maximums = workloadMaximums(input, priorities);
  const catalog = filterCatalog(input);
  const workload = emptyWorkload();
  const exposures = new Map<string, number>();
  const perSessionLimit = sessionExerciseLimit(input.profile.constraints.sessionMinutes);
  const sessions: ProgramSession[] = input.structure.sessionKeys.map((key) => ({
    key,
    name: key.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "),
    exercises: [],
  }));
  const slotBudget = sessions.length * perSessionLimit;

  for (let slot = 0; slot < slotBudget; slot += 1) {
    const ranked = catalog
      .map((exercise) => {
        const sessionIndex = chooseSessionIndex(sessions, exercise, perSessionLimit);
        const exposureCount = exposures.get(exercise.id) ?? 0;
        const score = sessionIndex === undefined
          ? Number.NEGATIVE_INFINITY
          : exerciseNeedScore(exercise, priorities, targets, workload, exposureCount, input.profile.level);
        return { exercise, sessionIndex, score };
      })
      .filter((candidate) => candidate.sessionIndex !== undefined && candidate.score > 0)
      .sort((left, right) => right.score - left.score || left.exercise.id.localeCompare(right.exercise.id));

    const best = ranked[0];
    if (!best || best.sessionIndex === undefined) break;
    const setCount = chooseSetCount(best.exercise, priorities, targets, workload, maximums);
    if (setCount <= 0) {
      exposures.set(best.exercise.id, 3);
      slot -= 1;
      continue;
    }

    const prescribed: ProgramExercise = {
      exerciseId: best.exercise.id,
      order: sessions[best.sessionIndex].exercises.length + 1,
      sets: makeSets(best.exercise, setCount, input),
    };
    sessions[best.sessionIndex].exercises.push(prescribed);
    exposures.set(best.exercise.id, (exposures.get(best.exercise.id) ?? 0) + 1);
    addWorkload(workload, best.exercise, setCount);

    const targetsSatisfied = ALL_MUSCLES.every((muscle) => workload[muscle] + 1e-9 >= targets[muscle]);
    if (targetsSatisfied && majorCoverageSatisfied(workload)) break;
  }

  if (!majorCoverageSatisfied(workload)) {
    throw new LiftPathV5Error("VALIDATION_ERROR", "Available exercises cannot produce balanced whole-body coverage");
  }

  return {
    name: `${input.structure.name} · ${input.profile.primarySpecialization.replaceAll("_", " ")}`,
    policyVersion: PROGRAMMING_POLICY_VERSION,
    structureId: input.structure.id,
    rationale: [
      `Built for ${input.profile.goal.replaceAll("_", " ")}.`,
      `Primary specialization: ${input.profile.primarySpecialization.replaceAll("_", " ")}.`,
      `Selected structure: ${input.structure.name}.`,
    ],
    sessions: finalizeOrdering(sessions),
    workloadByMuscle: workload,
  };
}
