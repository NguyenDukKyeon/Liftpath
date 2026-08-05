import type {
  ExerciseId,
  LoggedSet,
  ProgressionStrategy,
  TrackingMode,
} from "../../types.js";
import type {
  CoachDecision,
  CoachEvidence,
  CoachReasonCode,
  PainConcern,
} from "./contracts.js";
import { explainReason } from "./explanations.js";

export type ProgressionExposure = {
  completedAt: string;
  sets: LoggedSet[];
};

export type ProgressionAction =
  | "increase-load"
  | "hold-load"
  | "reduce-load"
  | "increase-reps"
  | "increase-duration"
  | "manual-review";

export type ProgressionResult = {
  action: ProgressionAction;
  targetLoadKg: number | null;
  targetReps: number | null;
  targetSeconds: number | null;
};

export type ProgressionInput = {
  exerciseId: ExerciseId;
  strategy: ProgressionStrategy;
  trackingMode: TrackingMode;
  target: { min: number; max: number };
  recentExposures: ProgressionExposure[];
  interruptionDays: number;
  painConcern: PainConcern | null;
  availableIncrementKg: number;
};

type ExposureSummary = {
  metrics: number[];
  loads: number[];
  allAtTop: boolean;
  allAtMinimum: boolean;
  poor: boolean;
  effortAcceptable: boolean;
};

const workingSets = (exposure: ProgressionExposure) =>
  exposure.sets.filter((set) => set.done && set.kind !== "warmup");

const metricFor = (set: LoggedSet): number | null => {
  switch (set.trackingMode) {
    case "weight-reps":
    case "bodyweight-reps":
    case "assisted-reps":
    case "weighted-bodyweight-reps":
      return set.reps;
    case "duration":
      return set.seconds;
    case "distance":
      return set.distanceMeters;
  }
};

const loadFor = (set: LoggedSet): number | null => {
  switch (set.trackingMode) {
    case "weight-reps":
      return set.weightKg;
    case "weighted-bodyweight-reps":
      return set.addedWeightKg;
    case "assisted-reps":
      return set.assistanceKg;
    default:
      return null;
  }
};

const effortAcceptable = (set: LoggedSet) => {
  if (!set.effort) return true;
  if (set.effort.mode === "rir") return set.effort.value >= 1;
  return set.effort.value <= 9;
};

const effortTooHigh = (set: LoggedSet) => {
  if (!set.effort) return false;
  if (set.effort.mode === "rir") return set.effort.value <= 0;
  return set.effort.value >= 9.5;
};

const summarize = (
  exposure: ProgressionExposure,
  target: ProgressionInput["target"],
): ExposureSummary | null => {
  const sets = workingSets(exposure);
  const metrics = sets.flatMap((set) => {
    const value = metricFor(set);
    return value != null && Number.isFinite(value) && value > 0 ? [value] : [];
  });
  if (!metrics.length) return null;
  const loads = sets.flatMap((set) => {
    const value = loadFor(set);
    return value != null && Number.isFinite(value) && value >= 0 ? [value] : [];
  });
  const acceptable = sets.every(effortAcceptable);
  const belowRange = metrics.every((value) => value < target.min);
  const highEffort = sets.filter(effortTooHigh).length >= Math.ceil(sets.length / 2);
  return {
    metrics,
    loads,
    allAtTop: metrics.every((value) => value >= target.max) && acceptable,
    allAtMinimum: metrics.every((value) => value >= target.min) && acceptable,
    poor: belowRange || highEffort,
    effortAcceptable: acceptable,
  };
};

const rounded = (value: number, increment: number) => {
  const step = increment > 0 ? increment : 0.5;
  return Math.round(value / step) * step;
};

const latestLoad = (summary: ExposureSummary | null) => {
  if (!summary?.loads.length) return null;
  return summary.loads.reduce((sum, value) => sum + value, 0) / summary.loads.length;
};

const decision = (
  value: ProgressionResult,
  reasonCode: CoachReasonCode,
  confidence: CoachDecision<ProgressionResult>["confidence"],
  evidence: CoachEvidence[],
): CoachDecision<ProgressionResult> => ({
  value,
  reasonCode,
  explanation: explainReason(reasonCode),
  confidence,
  evidence,
});

const result = (
  action: ProgressionAction,
  targetLoadKg: number | null = null,
  targetReps: number | null = null,
  targetSeconds: number | null = null,
): ProgressionResult => ({ action, targetLoadKg, targetReps, targetSeconds });

const holdForPoorEvidence = (
  input: ProgressionInput,
  summaries: ExposureSummary[],
  load: number | null,
) => {
  const repeatedPoor = summaries.length >= 2 && summaries.slice(0, 2).every((item) => item.poor);
  if (repeatedPoor && load != null && input.trackingMode === "weight-reps") {
    const strategyStep = input.strategy.type === "double-progression" || input.strategy.type === "linear-load"
      ? input.strategy.incrementKg
      : input.availableIncrementKg;
    const next = rounded(Math.max(0, load - Math.max(strategyStep, input.availableIncrementKg)), Math.max(strategyStep, input.availableIncrementKg));
    return decision(
      result("reduce-load", next),
      "progression-repeated-below-range",
      "high",
      [
        { key: "consecutivePoorExposures", value: 2 },
        { key: "previousLoadKg", value: load },
        { key: "targetLoadKg", value: next },
      ],
    );
  }
  if (summaries[0]?.poor) {
    return decision(
      result("hold-load", load),
      "progression-poor-session-observe",
      "medium",
      [{ key: "poorExposures", value: 1 }],
    );
  }
  return null;
};

export const recommendProgression = (
  input: ProgressionInput,
): CoachDecision<ProgressionResult> => {
  const valid = input.recentExposures
    .map((exposure) => summarize(exposure, input.target))
    .filter((item): item is ExposureSummary => Boolean(item));
  const latest = valid[0] ?? null;
  const load = latestLoad(latest);

  if (input.painConcern) {
    return decision(
      result("manual-review", load),
      "pain-blocks-progression",
      "high",
      [
        { key: "bodyArea", value: input.painConcern.bodyArea },
        { key: "severity", value: input.painConcern.severity },
      ],
    );
  }

  if (input.strategy.type === "manual") {
    return decision(
      result("manual-review", load),
      "progression-manual-strategy",
      "high",
      [{ key: "strategy", value: input.strategy.type }],
    );
  }

  if (!latest) {
    return decision(
      result("hold-load", null),
      "progression-insufficient-history",
      "low",
      [{ key: "validExposures", value: 0 }],
    );
  }

  const poorDecision = holdForPoorEvidence(input, valid, load);
  if (poorDecision) return poorDecision;

  let candidate: CoachDecision<ProgressionResult>;
  switch (input.strategy.type) {
    case "double-progression": {
      if (latest.allAtTop && load != null) {
        const step = Math.max(input.strategy.incrementKg, input.availableIncrementKg);
        candidate = decision(
          result("increase-load", rounded(load + step, step)),
          "progression-top-range-complete",
          "high",
          [
            { key: "workingSets", value: latest.metrics.length },
            { key: "topTarget", value: input.target.max },
            { key: "previousLoadKg", value: load },
          ],
        );
      } else {
        candidate = decision(
          result("hold-load", load),
          "progression-reps-still-building",
          "medium",
          [
            { key: "lowestMetric", value: Math.min(...latest.metrics) },
            { key: "topTarget", value: input.target.max },
          ],
        );
      }
      break;
    }
    case "linear-load": {
      if (latest.allAtMinimum && load != null) {
        const step = Math.max(input.strategy.incrementKg, input.availableIncrementKg);
        candidate = decision(
          result("increase-load", rounded(load + step, step)),
          "progression-linear-success",
          "high",
          [
            { key: "workingSets", value: latest.metrics.length },
            { key: "minimumTarget", value: input.target.min },
            { key: "previousLoadKg", value: load },
          ],
        );
      } else {
        candidate = decision(
          result("hold-load", load),
          "progression-hold-current",
          "medium",
          [{ key: "minimumTarget", value: input.target.min }],
        );
      }
      break;
    }
    case "rep-progression": {
      if (latest.allAtTop) {
        candidate = decision(
          result("increase-reps", load, input.target.max + input.strategy.repStep),
          "progression-top-range-complete",
          "high",
          [
            { key: "previousRepTarget", value: input.target.max },
            { key: "repStep", value: input.strategy.repStep },
          ],
        );
      } else {
        candidate = decision(
          result("hold-load", load, input.target.max),
          "progression-reps-still-building",
          "medium",
          [{ key: "topTarget", value: input.target.max }],
        );
      }
      break;
    }
    case "duration-progression": {
      if (latest.allAtTop) {
        candidate = decision(
          result("increase-duration", null, null, input.target.max + input.strategy.secondsStep),
          "progression-duration-complete",
          "high",
          [
            { key: "previousSeconds", value: input.target.max },
            { key: "secondsStep", value: input.strategy.secondsStep },
          ],
        );
      } else {
        candidate = decision(
          result("hold-load", null, null, input.target.max),
          "progression-hold-current",
          "medium",
          [{ key: "targetSeconds", value: input.target.max }],
        );
      }
      break;
    }
  }

  const isAutomaticIncrease = candidate.value.action === "increase-load"
    || candidate.value.action === "increase-reps"
    || candidate.value.action === "increase-duration";
  if (input.interruptionDays >= 21 && isAutomaticIncrease) {
    return decision(
      result("hold-load", load, input.trackingMode === "bodyweight-reps" ? input.target.max : null, input.trackingMode === "duration" ? input.target.max : null),
      "progression-interruption-guard",
      "low",
      [
        { key: "interruptionDays", value: input.interruptionDays },
        { key: "previousLoadKg", value: load ?? 0 },
      ],
    );
  }

  return candidate;
};
