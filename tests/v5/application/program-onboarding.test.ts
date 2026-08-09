import assert from "node:assert/strict";
import test from "node:test";
import { CATALOG_SEED } from "../../../src/v5/domain/exercises/catalog-seed.js";
import type { TrainingProfile, TrainingProfileDraft } from "../../../src/v5/domain/programming/profile.js";
import type { ProgramVersion } from "../../../src/v5/domain/programming/program.js";
import type { TrainingBlock } from "../../../src/v5/domain/programming/training-block.js";
import type { ProgramRepository } from "../../../src/v5/application/ports/program-repository.js";
import { buildProgramPreview } from "../../../src/v5/application/programs/build-program-preview.js";
import { activateProgram } from "../../../src/v5/application/programs/activate-program.js";
import { proposeStructures } from "../../../src/v5/application/programs/propose-structures.js";

const draft: TrainingProfileDraft = {
  level: "beginner",
  goal: "hypertrophy",
  primarySpecialization: "v_shape",
  constraints: {
    daysPerWeek: 4,
    sessionMinutes: 60,
    equipment: ["barbell", "rack", "bench", "dumbbell", "cable", "machine"],
    dislikedExerciseIds: [],
    restrictedMovementPatterns: [],
  },
};

class MemoryPrograms implements ProgramRepository {
  saveCalls = 0;
  atomicActivations = 0;
  active?: { profile: TrainingProfile; program: ProgramVersion; block: TrainingBlock };
  rejectActivation = false;

  async save(): Promise<void> { this.saveCalls += 1; }
  async get(): Promise<ProgramVersion | undefined> { return undefined; }

  async activateInitial(profile: TrainingProfile, program: ProgramVersion, block: TrainingBlock): Promise<void> {
    this.atomicActivations += 1;
    if (this.rejectActivation) throw new Error("transaction aborted");
    this.active = { profile, program, block };
  }

  async getActive(): Promise<ProgramVersion | undefined> { return this.active?.program; }
}

const ids = (() => {
  let nextId = 0;
  return { next: (prefix: string) => `${prefix}-${++nextId}` };
})();
const clock = { now: () => "2026-08-08T00:30:00.000Z" } as const;

test("program preview is deterministic and performs no repository writes", () => {
  const programs = new MemoryPrograms();
  const structure = proposeStructures(draft)[0];
  const first = buildProgramPreview(draft, structure.id, { catalog: [...CATALOG_SEED] });
  const second = buildProgramPreview(draft, structure.id, { catalog: [...CATALOG_SEED] });
  assert.deepEqual(first, second);
  assert.equal(programs.saveCalls, 0);
  assert.equal(programs.atomicActivations, 0);
});

test("program activation atomically creates profile, version 1 and training block 1", async () => {
  const programs = new MemoryPrograms();
  const structure = proposeStructures(draft)[0];
  const proposal = buildProgramPreview(draft, structure.id, { catalog: [...CATALOG_SEED] });

  const activated = await activateProgram(proposal, draft, { programs, ids, clock });

  assert.equal(activated.program.versionNumber, 1);
  assert.equal(activated.program.policyVersion, proposal.policyVersion);
  assert.equal(activated.program.structureId, proposal.structureId);
  assert.equal(activated.program.profileId, activated.profile.id);
  assert.equal(activated.block.blockNumber, 1);
  assert.equal(activated.block.status, "active");
  assert.equal(activated.block.structureId, activated.program.structureId);
  assert.equal(activated.block.initialProgramVersionId, activated.program.id);
  assert.equal(activated.block.currentProgramVersionId, activated.program.id);
  assert.equal(programs.atomicActivations, 1);
  assert.equal(programs.saveCalls, 0);
  assert.equal(programs.active?.program.id, activated.program.id);
  assert.equal(programs.active?.block.id, activated.block.id);
});

test("program activation failure leaves no partial profile, program, pointer or block", async () => {
  const programs = new MemoryPrograms();
  programs.rejectActivation = true;
  const structure = proposeStructures(draft)[0];
  const proposal = buildProgramPreview(draft, structure.id, { catalog: [...CATALOG_SEED] });

  await assert.rejects(() => activateProgram(proposal, draft, { programs, ids, clock }));

  assert.equal(programs.atomicActivations, 1);
  assert.equal(programs.active, undefined);
  assert.equal(await programs.getActive(), undefined);
});
