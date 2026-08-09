import { CATALOG_SEED } from "../exercises/catalog-seed.js";
import type { MuscleId } from "../exercises/exercise.js";
import { WORKLOAD_BANDS } from "../programming/policy-constants.js";
import type { ProgramVersion } from "../programming/program.js";
import { classifyEffortStatus } from "./effort-status.js";
import { classifyPerformanceTrend, type PerformanceExposure } from "./performance-trend.js";
import { confidenceForExposureCount } from "./confidence.js";
import { recommendDeload } from "./deload.js";
import { recommendProgression } from "./progression.js";
import type { CoachContext } from "./context.js";
import type { CoachRecommendationDraft } from "./recommendation.js";
import { evaluateVShapeAdaptation } from "./vshape-adaptation.js";

const DEFAULT_LOAD_INCREMENT_KG = 2.5;

interface ExerciseTarget {
  exerciseId: string;
  minReps: number;
  maxReps: number;
  targetRir: number;
}

function stableTargets(program: ProgramVersion): ExerciseTarget[] {
  const seen = new Set<string>();
  const targets: ExerciseTarget[] = [];
  for (const session of program.sessions) {
    for (const exercise of [...session.exercises].sort((a, b) => a.order - b.order || a.exerciseId.localeCompare(b.exerciseId))) {
      if (seen.has(exercise.exerciseId)) continue;
      const prescribed = [...exercise.sets].sort((a, b) => a.ordinal - b.ordinal)[0];
      if (!prescribed) continue;
      seen.add(exercise.exerciseId);
      targets.push({
        exerciseId: exercise.exerciseId,
        minReps: prescribed.minReps,
        maxReps: prescribed.maxReps,
        targetRir: prescribed.targetRir,
      });
    }
  }
  return targets;
}

function exposuresFor(context: CoachContext, exerciseId: string): PerformanceExposure[] {
  return context.recentSets
    .filter((set) => set.exerciseId === exerciseId && set.loadKg !== undefined && set.reps !== undefined)
    .slice()
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt) || a.id.localeCompare(b.id))
    .map((set) => ({ id: set.id, loadKg: set.loadKg ?? 0, reps: set.reps ?? 0, rir: set.rir }));
}

function adherenceStatus(context: CoachContext): "complete" | "partial" | "missed" {
  if (context.recentSessions.length === 0) return "partial";
  if (context.recentSessions.every((session) => session.status === "completed")) return "complete";
  if (context.recentSessions.every((session) => session.status !== "completed")) return "missed";
  return "partial";
}

function primaryPriorityMuscle(exerciseId: string): MuscleId | undefined {
  const metadata = CATALOG_SEED.find((exercise) => exercise.id === exerciseId);
  return metadata?.primaryMuscles.find((muscle) => muscle === "lats" || muscle === "side_delts");
}

function workloadForMuscle(program: ProgramVersion, muscle: MuscleId): number {
  let sets = 0;
  for (const session of program.sessions) {
    for (const exercise of session.exercises) {
      const metadata = CATALOG_SEED.find((item) => item.id === exercise.exerciseId);
      if (metadata?.primaryMuscles.includes(muscle)) sets += exercise.sets.length;
    }
  }
  return sets;
}

function reorderTarget(program: ProgramVersion, exerciseId: string): string | undefined {
  for (const session of program.sessions) {
    const ordered = [...session.exercises].sort((a, b) => a.order - b.order || a.exerciseId.localeCompare(b.exerciseId));
    const index = ordered.findIndex((exercise) => exercise.exerciseId === exerciseId);
    if (index < 0) continue;
    return ordered.slice(index + 1).find((exercise) => {
      const metadata = CATALOG_SEED.find((item) => item.id === exercise.exerciseId);
      return !metadata?.primaryMuscles.some((muscle) => muscle === "lats" || muscle === "side_delts");
    })?.exerciseId;
  }
  return undefined;
}

export function evaluateCoach(context: CoachContext): CoachRecommendationDraft | null {
  const painExerciseIds = context.readiness.flatMap((entry) => entry.painExerciseIds).sort();
  const painfulExercise = painExerciseIds[0];
  if (painfulExercise) {
    const evidenceIds = context.readiness
      .filter((entry) => entry.painExerciseIds.includes(painfulExercise))
      .map((entry) => entry.sessionId)
      .sort();
    return {
      type: "safety",
      priority: "safety",
      reasonCode: "PAIN_BLOCKS_PROGRESSION",
      evidenceIds,
      confidence: confidenceForExposureCount(evidenceIds.length),
      proposedPatch: { kind: "set_count", exerciseId: painfulExercise, sets: 0 },
      expectedIntent: "Pause normal progression for the affected movement until the user reviews the plan.",
      coachPolicyVersion: context.coachPolicyVersion,
      programmingPolicyVersion: context.programmingPolicyVersion,
    };
  }

  const targets = stableTargets(context.activeProgram);
  const trends = targets.map((target) => {
    const exposures = exposuresFor(context, target.exerciseId);
    return {
      target,
      exposures,
      trend: classifyPerformanceTrend(exposures),
      effort: classifyEffortStatus(exposures, target.targetRir),
    };
  });

  const broadRegression = trends.length > 0
    && trends.filter((entry) => entry.trend === "declining").length >= Math.max(1, Math.ceil(trends.length / 2));
  const deload = recommendDeload({
    sessionSignals: context.recentSessions.map((session) => {
      const readiness = context.readiness.find((entry) => entry.sessionId === session.id);
      const sessionSets = context.recentSets.filter((set) => set.sessionId === session.id);
      return {
        sessionId: session.id,
        broadRegression,
        highEffort: sessionSets.some((set) => set.rir !== undefined && set.rir <= 1),
        recoveryFlag: readiness?.energy === "low" || readiness?.soreness === "high",
      };
    }),
  });
  if (deload) {
    return {
      type: "deload",
      priority: "fatigue",
      reasonCode: deload.reasonCode,
      evidenceIds: context.recentSessions.map((session) => session.id).sort(),
      confidence: deload.confidence,
      proposedPatch: deload.patch,
      expectedIntent: "Reduce workload temporarily after repeated broad fatigue evidence.",
      coachPolicyVersion: context.coachPolicyVersion,
      programmingPolicyVersion: context.programmingPolicyVersion,
    };
  }

  if (adherenceStatus(context) !== "complete") return null;

  for (const entry of trends) {
    const patch = recommendProgression({
      exerciseId: entry.target.exerciseId,
      exposures: entry.exposures,
      minReps: entry.target.minReps,
      maxReps: entry.target.maxReps,
      targetRir: entry.target.targetRir,
      loadIncrementKg: DEFAULT_LOAD_INCREMENT_KG,
    });
    if (!patch) continue;

    const evidenceIds = entry.exposures.slice(-3).map((exposure) => exposure.id);
    const confidence = confidenceForExposureCount(entry.exposures.length);
    if (patch.kind === "set_target_rir") {
      return {
        type: "effort",
        priority: "fatigue",
        reasonCode: "EFFORT_TOO_HIGH",
        evidenceIds,
        confidence,
        proposedPatch: patch,
        expectedIntent: "Restore the prescribed effort target before progressing load or volume.",
        coachPolicyVersion: context.coachPolicyVersion,
        programmingPolicyVersion: context.programmingPolicyVersion,
      };
    }
    if (patch.kind === "set_load") {
      return {
        type: "progression",
        priority: "progression",
        reasonCode: "PROGRESSION_TOP_RANGE",
        evidenceIds,
        confidence,
        proposedPatch: patch,
        expectedIntent: "Progress load after repeated top-of-range work at target effort.",
        coachPolicyVersion: context.coachPolicyVersion,
        programmingPolicyVersion: context.programmingPolicyVersion,
      };
    }
  }

  if (context.profile.primarySpecialization === "v_shape") {
    for (const entry of trends) {
      const muscle = primaryPriorityMuscle(entry.target.exerciseId);
      if (!muscle) continue;
      const result = evaluateVShapeAdaptation({
        exerciseId: entry.target.exerciseId,
        muscle,
        performanceTrend: entry.trend,
        effortStatus: entry.effort,
        adherence: "complete",
        recoveryNormal: context.readiness.every((item) => item.energy !== "low" && item.soreness !== "high"),
        workloadSets: workloadForMuscle(context.activeProgram, muscle),
        workloadMax: WORKLOAD_BANDS[context.profile.goal][context.profile.level].specialization.maxDirectEquivalentSets,
        exposureCount: entry.exposures.length,
        targetRir: entry.target.targetRir,
        beforeExerciseId: reorderTarget(context.activeProgram, entry.target.exerciseId),
      });
      if (!result.patch || !result.priority) continue;
      return {
        type: "specialization",
        priority: result.priority,
        reasonCode: result.reasonCode,
        evidenceIds: entry.exposures.slice(-5).map((exposure) => exposure.id),
        confidence: result.confidence,
        proposedPatch: result.patch,
        expectedIntent: "Redistribute V-Shape priority before increasing total workload.",
        coachPolicyVersion: context.coachPolicyVersion,
        programmingPolicyVersion: context.programmingPolicyVersion,
      };
    }
  }

  return null;
}
