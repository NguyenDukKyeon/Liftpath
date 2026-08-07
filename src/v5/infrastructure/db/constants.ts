import type { V5StoreName } from "../../application/ports/storage.js";

export const V5_DB_NAME = "liftpath-v5";
export const V5_DB_VERSION = 1;

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
