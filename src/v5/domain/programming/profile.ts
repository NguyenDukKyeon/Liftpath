import { LiftPathV5Error } from "../common/errors.js";
import type { VersionedRecord } from "../common/types.js";
import { validateTrainingConstraints, type TrainingConstraints } from "./constraints.js";
import type { PrimaryGoal, TrainingLevel } from "./goals.js";
import { isSpecializationCompatible, type SpecializationId } from "./specializations.js";

export interface TrainingProfileDraft {
  level: TrainingLevel;
  goal: PrimaryGoal;
  primarySpecialization: SpecializationId;
  secondaryFocus?: SpecializationId;
  constraints: TrainingConstraints;
}

export interface TrainingProfile extends VersionedRecord, TrainingProfileDraft {}

export function validateTrainingProfileDraft(profile: TrainingProfileDraft): void {
  validateTrainingConstraints(profile.constraints);

  if (profile.secondaryFocus === profile.primarySpecialization) {
    throw new LiftPathV5Error(
      "VALIDATION_ERROR",
      "Secondary focus must be different from the primary specialization",
    );
  }

  if (!isSpecializationCompatible(profile.goal, profile.primarySpecialization)) {
    throw new LiftPathV5Error(
      "VALIDATION_ERROR",
      "Primary specialization is incompatible with the selected goal",
    );
  }

  if (profile.secondaryFocus && !isSpecializationCompatible(profile.goal, profile.secondaryFocus)) {
    throw new LiftPathV5Error(
      "VALIDATION_ERROR",
      "Secondary focus is incompatible with the selected goal",
    );
  }
}
