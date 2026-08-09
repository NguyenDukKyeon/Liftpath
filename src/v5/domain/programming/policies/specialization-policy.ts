import type { MuscleId } from "../../exercises/exercise.js";
import type { PolicyVersion } from "../../common/types.js";
import type { TrainingProfileDraft } from "../profile.js";
import type { SpecializationId } from "../specializations.js";
import { getGoalPolicy, type MusclePriorityMap } from "./goal-policy.js";
import { applyVShapePolicy } from "./v-shape.js";

export type { MusclePriorityMap } from "./goal-policy.js";

export interface SpecializationPolicy {
  id: SpecializationId;
  version: PolicyVersion;
  apply(base: MusclePriorityMap): MusclePriorityMap;
}

function focusedPolicy(id: SpecializationId, muscles: readonly MuscleId[]): SpecializationPolicy {
  return {
    id,
    version: "1.0.0",
    apply(base) {
      const next = { ...base };
      for (const muscle of muscles) next[muscle] = "specialization";
      return next;
    },
  };
}

const POLICIES: Record<SpecializationId, SpecializationPolicy> = {
  v_shape: { id: "v_shape", version: "1.0.0", apply: applyVShapePolicy },
  chest: focusedPolicy("chest", ["chest", "upper_chest"]),
  shoulders: focusedPolicy("shoulders", ["side_delts", "rear_delts"]),
  arms: focusedPolicy("arms", ["biceps", "triceps"]),
  back_width: focusedPolicy("back_width", ["lats"]),
  back_thickness: focusedPolicy("back_thickness", ["upper_back", "rear_delts"]),
  quads: focusedPolicy("quads", ["quads"]),
  posterior_chain: focusedPolicy("posterior_chain", ["hamstrings", "glutes"]),
  bench: focusedPolicy("bench", ["chest", "triceps", "side_delts"]),
  squat: focusedPolicy("squat", ["quads", "glutes", "core"]),
  deadlift: focusedPolicy("deadlift", ["hamstrings", "glutes", "upper_back"]),
  overhead_press: focusedPolicy("overhead_press", ["side_delts", "triceps", "upper_chest"]),
};

export function getSpecializationPolicy(id: SpecializationId): SpecializationPolicy {
  return POLICIES[id];
}

function applySecondaryFocus(
  current: MusclePriorityMap,
  policy: SpecializationPolicy,
): MusclePriorityMap {
  const proposed = policy.apply(current);
  const next = { ...current };
  for (const muscle of Object.keys(current) as MuscleId[]) {
    if (current[muscle] === "specialization") continue;
    if (proposed[muscle] === "specialization" || proposed[muscle] === "high") {
      next[muscle] = "high";
    }
  }
  return next;
}

export function composeMusclePriorities(profile: TrainingProfileDraft): MusclePriorityMap {
  const base = getGoalPolicy(profile.goal).basePriorities(profile.level);
  const primary = getSpecializationPolicy(profile.primarySpecialization).apply(base);
  if (!profile.secondaryFocus) return primary;
  return applySecondaryFocus(primary, getSpecializationPolicy(profile.secondaryFocus));
}
