import type { ExerciseMetadata } from "../../domain/exercises/exercise.js";
import { LiftPathV5Error } from "../../domain/common/errors.js";
import { createInitialPrescription } from "../../domain/programming/prescription-engine.js";
import type { ProgramProposal } from "../../domain/programming/prescription.js";
import {
  validateTrainingProfileDraft,
  type TrainingProfile,
  type TrainingProfileDraft,
} from "../../domain/programming/profile.js";
import { rankStructureProposals } from "../../domain/programming/structure-proposals.js";

export interface BuildProgramPreviewDependencies {
  catalog: ExerciseMetadata[];
}

const PREVIEW_TIME = "1970-01-01T00:00:00.000Z";

export function buildProgramPreview(
  profile: TrainingProfileDraft,
  structureId: string,
  dependencies: BuildProgramPreviewDependencies,
): ProgramProposal {
  validateTrainingProfileDraft(profile);
  const structure = rankStructureProposals(profile).find(
    (candidate) => candidate.id === structureId,
  );
  if (!structure) {
    throw new LiftPathV5Error(
      "VALIDATION_ERROR",
      "Selected training structure is not available for this profile",
    );
  }

  const previewProfile: TrainingProfile = {
    ...profile,
    constraints: {
      ...profile.constraints,
      equipment: [...profile.constraints.equipment],
      dislikedExerciseIds: [...profile.constraints.dislikedExerciseIds],
      restrictedMovementPatterns: [...profile.constraints.restrictedMovementPatterns],
    },
    id: "preview-profile",
    createdAt: PREVIEW_TIME,
    updatedAt: PREVIEW_TIME,
    revision: 1,
  };

  return createInitialPrescription({
    profile: previewProfile,
    structure,
    catalog: [...dependencies.catalog],
  });
}
