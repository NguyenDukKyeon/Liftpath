import { LiftPathV5Error } from "../../domain/common/errors.js";
import type { ISODateTime } from "../../domain/common/types.js";

export interface RestTimerState {
  startedAt: ISODateTime;
  targetSeconds: number;
}

function timestampMs(value: ISODateTime, field: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new LiftPathV5Error("VALIDATION_ERROR", `${field} must be a valid ISO timestamp`);
  }
  return parsed;
}

export function remainingRestSeconds(state: RestTimerState, now: ISODateTime): number {
  if (!Number.isFinite(state.targetSeconds) || state.targetSeconds <= 0) {
    throw new LiftPathV5Error("VALIDATION_ERROR", "Rest target must be a positive number of seconds");
  }
  const startedAtMs = timestampMs(state.startedAt, "Rest start");
  const nowMs = timestampMs(now, "Current time");
  const elapsedSeconds = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
  return Math.max(0, Math.ceil(state.targetSeconds - elapsedSeconds));
}
