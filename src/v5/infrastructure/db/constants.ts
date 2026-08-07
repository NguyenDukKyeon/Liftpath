import type { V5StoreName } from "../../application/ports/storage.js";

export const V5_DB_NAME = "liftpath-v5";
export const V5_DB_VERSION = 2;

export const V5_STORES = [
  "metadata",
  "profiles",
  "programVersions",
  "sessions",
  "sessionExercises",
  "sets",
  "recommendations",
  "recoverySnapshots",
] as const satisfies readonly V5StoreName[];

export const SESSION_STATUS_INDEX = "by-status";
export const SET_SESSION_INDEX = "by-session";
