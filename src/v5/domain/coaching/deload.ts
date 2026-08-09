import type { EntityId } from "../common/types.js";
import type { EvidenceConfidence } from "./confidence.js";
import type { ProgramPatch } from "./recommendation.js";

export const DELOAD_VOLUME_MULTIPLIER = 0.7;

export interface DeloadSessionSignal {
  sessionId: EntityId;
  broadRegression: boolean;
  highEffort: boolean;
  recoveryFlag: boolean;
}

export interface DeloadInput {
  weekNumber?: number;
  sessionSignals: readonly DeloadSessionSignal[];
}

export interface DeloadRecommendation {
  patch: ProgramPatch;
  confidence: EvidenceConfidence;
  reasonCode: "BROAD_FATIGUE_DELOAD";
}

export function recommendDeload(input: DeloadInput): DeloadRecommendation | null {
  const qualifying = input.sessionSignals.filter(
    (signal) => signal.broadRegression && signal.highEffort && signal.recoveryFlag,
  );
  if (qualifying.length < 5) return null;

  return {
    patch: { kind: "reduced_volume_week", multiplier: DELOAD_VOLUME_MULTIPLIER },
    confidence: "high",
    reasonCode: "BROAD_FATIGUE_DELOAD",
  };
}
