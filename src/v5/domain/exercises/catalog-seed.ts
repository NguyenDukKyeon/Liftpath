import type { ExerciseMetadata } from "./exercise.js";
import { ACCESSORY_CATALOG_SEED } from "./catalog-seed-accessories.js";
import { CORE_CATALOG_SEED } from "./catalog-seed-core.js";
import { LOWER_CATALOG_SEED } from "./catalog-seed-lower.js";
import { UPPER_CATALOG_SEED } from "./catalog-seed-upper.js";

export const EXERCISE_CATALOG: readonly ExerciseMetadata[] = [
  ...CORE_CATALOG_SEED,
  ...UPPER_CATALOG_SEED,
  ...LOWER_CATALOG_SEED,
  ...ACCESSORY_CATALOG_SEED,
].sort((left, right) => left.id.localeCompare(right.id));

// Compatibility alias for Phase 3-5 callers. Stable IDs and metadata remain authoritative.
export const CATALOG_SEED = EXERCISE_CATALOG;
