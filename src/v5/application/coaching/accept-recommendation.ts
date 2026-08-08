import type { Clock } from "../ports/clock.js";
import type { IdGenerator } from "../ports/id-generator.js";
import type { ProgramRepository } from "../ports/program-repository.js";
import type { RecommendationRepository } from "../ports/recommendation-repository.js";
import { LiftPathV5Error } from "../../domain/common/errors.js";
import type { EntityId, ISODateTime } from "../../domain/common/types.js";
import type { CoachRecommendation, DecisionState, ProgramPatch } from "../../domain/coaching/recommendation.js";
import type { PrescribedSet, ProgramExercise, ProgramSession, ProgramVersion } from "../../domain/programming/program.js";

export interface CoachDecisionDependencies {
  programs: Pick<ProgramRepository, "getActive" | "applyCoachDecision">;
  recommendations: RecommendationRepository;
  ids: IdGenerator;
  clock: Clock;
}

function validation(message: string): never {
  throw new LiftPathV5Error("VALIDATION_ERROR", message);
}

function cloneSet(set: PrescribedSet): PrescribedSet { return { ...set }; }
function cloneExercise(exercise: ProgramExercise): ProgramExercise {
  return { ...exercise, sets: exercise.sets.map(cloneSet) };
}
function cloneSession(session: ProgramSession): ProgramSession {
  return { ...session, exercises: session.exercises.map(cloneExercise) };
}

function patchSessions(source: ProgramVersion, patch: ProgramPatch): ProgramSession[] {
  const sessions = source.sessions.map(cloneSession);
  const raw = patch as ProgramPatch & Record<string, unknown>;
  let matched = false;

  switch (raw.kind) {
    case "set_load": {
      if (!Number.isFinite(raw.loadKg) || raw.loadKg < 0) validation("Coach load patch is invalid");
      for (const session of sessions) for (const exercise of session.exercises) {
        if (exercise.exerciseId !== raw.exerciseId) continue;
        matched = true;
        exercise.sets = exercise.sets.map((set) => ({ ...set, prescribedLoadKg: raw.loadKg }));
      }
      break;
    }
    case "set_target_rir": {
      if (!Number.isInteger(raw.targetRir) || raw.targetRir < 0 || raw.targetRir > 10) validation("Coach RIR patch is invalid");
      for (const session of sessions) for (const exercise of session.exercises) {
        if (exercise.exerciseId !== raw.exerciseId) continue;
        matched = true;
        exercise.sets = exercise.sets.map((set) => ({ ...set, targetRir: raw.targetRir }));
      }
      break;
    }
    case "set_count": {
      if (!Number.isInteger(raw.sets) || raw.sets < 0) validation("Coach set-count patch is invalid");
      for (const session of sessions) for (const exercise of session.exercises) {
        if (exercise.exerciseId !== raw.exerciseId) continue;
        matched = true;
        if (raw.sets > exercise.sets.length && exercise.sets.length === 0) validation("Cannot expand an exercise without a prescribed set template");
        const next = exercise.sets.slice(0, raw.sets).map(cloneSet);
        while (next.length < raw.sets) {
          const template = exercise.sets[exercise.sets.length - 1];
          if (!template) validation("Missing prescribed set template");
          next.push({ ...template, ordinal: next.length + 1 });
        }
        exercise.sets = next.map((set, index) => ({ ...set, ordinal: index + 1 }));
      }
      break;
    }
    case "move_exercise": {
      for (const session of sessions) {
        const ordered = session.exercises.slice().sort((a, b) => a.order - b.order || a.exerciseId.localeCompare(b.exerciseId));
        const from = ordered.findIndex((exercise) => exercise.exerciseId === raw.exerciseId);
        const before = ordered.findIndex((exercise) => exercise.exerciseId === raw.beforeExerciseId);
        if (from < 0 || before < 0 || from === before) continue;
        const [moving] = ordered.splice(from, 1);
        if (!moving) continue;
        const insertion = ordered.findIndex((exercise) => exercise.exerciseId === raw.beforeExerciseId);
        ordered.splice(insertion, 0, moving);
        session.exercises = ordered.map((exercise, index) => ({ ...exercise, order: index + 1 }));
        matched = true;
        break;
      }
      break;
    }
    case "replace_exercise": {
      if (!raw.replacementExerciseId) validation("Coach replacement exercise is invalid");
      for (const session of sessions) for (const exercise of session.exercises) {
        if (exercise.exerciseId !== raw.exerciseId) continue;
        exercise.exerciseId = raw.replacementExerciseId;
        matched = true;
      }
      break;
    }
    case "reduced_volume_week": {
      if (!Number.isFinite(raw.multiplier) || raw.multiplier <= 0 || raw.multiplier > 1) validation("Coach volume multiplier is invalid");
      for (const session of sessions) for (const exercise of session.exercises) {
        if (exercise.sets.length === 0) continue;
        const count = Math.max(1, Math.round(exercise.sets.length * raw.multiplier));
        exercise.sets = exercise.sets.slice(0, count).map((set, index) => ({ ...set, ordinal: index + 1 }));
        matched = true;
      }
      break;
    }
    default:
      validation("Coach patch cannot change the selected training structure");
  }

  if (!matched) validation("Coach patch does not match the active program");
  return sessions;
}

export function createPatchedProgramVersion(
  active: ProgramVersion,
  patch: ProgramPatch,
  recommendationId: EntityId,
  id: EntityId,
  now: ISODateTime,
): ProgramVersion {
  const originalKeys = active.sessions.map((session) => session.key);
  const sessions = patchSessions(active, patch);
  const nextKeys = sessions.map((session) => session.key);
  if (originalKeys.length !== nextKeys.length || originalKeys.some((key, index) => key !== nextKeys[index])) {
    validation("Coach decision cannot change the selected training structure");
  }

  return {
    ...active,
    id,
    createdAt: now,
    updatedAt: now,
    revision: 1,
    versionNumber: active.versionNumber + 1,
    sessions,
    sourceRecommendationId: recommendationId,
  };
}

export function markRecommendation(
  recommendation: CoachRecommendation,
  decisionState: DecisionState,
  now: ISODateTime,
): CoachRecommendation {
  return {
    ...recommendation,
    decisionState,
    updatedAt: now,
    revision: recommendation.revision + 1,
  };
}

export async function acceptRecommendation(
  id: EntityId,
  deps: CoachDecisionDependencies,
): Promise<ProgramVersion | null> {
  const recommendation = await deps.recommendations.get(id);
  if (!recommendation || recommendation.decisionState !== "pending") return null;
  const active = await deps.programs.getActive();
  if (!active) return null;

  const now = deps.clock.now();
  const next = createPatchedProgramVersion(active, recommendation.proposedPatch, recommendation.id, deps.ids.next("program"), now);
  await deps.programs.applyCoachDecision(next, markRecommendation(recommendation, "accepted", now));
  return next;
}
