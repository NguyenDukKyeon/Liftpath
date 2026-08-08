import type { GoalPolicy, MusclePriorityMap } from "./goal-policy.js";

function baseline(): MusclePriorityMap {
  return {
    lats: "normal", side_delts: "normal", rear_delts: "normal", upper_back: "normal",
    upper_chest: "normal", chest: "normal", biceps: "normal", triceps: "normal",
    quads: "normal", hamstrings: "normal", glutes: "normal", calves: "normal", core: "normal",
  };
}

export const strengthGoalPolicy: GoalPolicy = {
  id: "strength",
  version: "1.0.0",
  basePriorities: baseline,
};
