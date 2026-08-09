import type { MusclePriorityMap } from "./goal-policy.js";

export function applyVShapePolicy(base: MusclePriorityMap): MusclePriorityMap {
  return {
    ...base,
    lats: "specialization",
    side_delts: "specialization",
    rear_delts: "high",
    upper_back: "high",
    upper_chest: base.upper_chest === "maintenance" ? "normal" : "high",
  };
}
