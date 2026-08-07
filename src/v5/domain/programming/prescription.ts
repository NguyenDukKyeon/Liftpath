import type { ExerciseMetadata, MuscleId } from "../exercises/exercise.js";
import type { PolicyVersion } from "../common/types.js";
import type { ProgramVersion } from "./program.js";
import type { TrainingProfile } from "./profile.js";
import type { StructureProposal } from "./structure-proposals.js";

export interface PrescriptionInput {
  profile: TrainingProfile;
  structure: StructureProposal;
  catalog: ExerciseMetadata[];
}

export interface ProgramProposal {
  name: string;
  policyVersion: PolicyVersion;
  structureId: string;
  rationale: string[];
  sessions: ProgramVersion["sessions"];
  workloadByMuscle: Record<MuscleId, number>;
}
