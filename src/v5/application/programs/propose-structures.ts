import type { TrainingProfileDraft } from "../../domain/programming/profile.js";
import {
  rankStructureProposals,
  type StructureProposal,
} from "../../domain/programming/structure-proposals.js";

export function proposeStructures(profile: TrainingProfileDraft): StructureProposal[] {
  return rankStructureProposals(profile);
}
