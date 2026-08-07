import type { EntityId, PolicyVersion, VersionedRecord } from "../common/types.js";

export interface PrescribedSet {
  ordinal: number;
  minReps: number;
  maxReps: number;
  targetRir: number;
  prescribedLoadKg?: number;
}

export interface ProgramExercise {
  exerciseId: EntityId;
  order: number;
  sets: PrescribedSet[];
}

export interface ProgramSession {
  key: string;
  name: string;
  exercises: ProgramExercise[];
}

export interface ProgramVersion extends VersionedRecord {
  versionNumber: number;
  name: string;
  sessions: ProgramSession[];
  profileId?: EntityId;
  policyVersion?: PolicyVersion;
  structureId?: string;
  rationale?: string[];
}
