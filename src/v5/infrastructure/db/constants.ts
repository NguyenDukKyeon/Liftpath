import type { V5StoreName } from "../../application/ports/storage.js";

export const V5_DB_NAME = "liftpath-v5";
export const V5_DB_VERSION = 4;

export const V5_STORES = [
  "metadata",
  "profiles",
  "programVersions",
  "sessions",
  "sessionExercises",
  "sets",
  "recommendations",
  "readinessEntries",
  "recoverySnapshots",
] as const satisfies readonly V5StoreName[];

export const SESSION_STATUS_INDEX = "by-status";
export const SET_SESSION_INDEX = "by-session";
export const RECOMMENDATION_STATE_INDEX = "by-decision-state";
export const RECOMMENDATION_CREATED_AT_INDEX = "by-created-at";
export const READINESS_SESSION_INDEX = "by-session";
export const READINESS_CREATED_AT_INDEX = "by-created-at";
