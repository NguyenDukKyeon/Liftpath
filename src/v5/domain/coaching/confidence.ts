import type { PolicyVersion } from "../common/types.js";

export type EvidenceConfidence = "low" | "medium" | "high";

export const COACH_POLICY_VERSION: PolicyVersion = "1.0.0";

export function confidenceForExposureCount(count: number): EvidenceConfidence {
  if (count < 3) return "low";
  if (count < 5) return "medium";
  return "high";
}
