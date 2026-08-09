import { describe, expect, it } from "vitest";
import type { Clock } from "../../../src/v5/application/ports/clock";
import type { IdGenerator } from "../../../src/v5/application/ports/id-generator";
import type { V5Database } from "../../../src/v5/application/ports/storage";
import { CATALOG_SEED } from "../../../src/v5/domain/exercises/catalog-seed";
import { createV5Services } from "../../../src/v5/app/create-v5-services";

const database: V5Database = {
  async transaction() {
    throw new Error("composition test does not perform storage IO");
  },
  async getAll() {
    return [];
  },
};

const clock: Clock = { now: () => "2026-08-10T00:00:00.000Z" };
const ids: IdGenerator = { next: (prefix) => `${prefix}_fixed` };

describe("V5 service composition", () => {
  it("builds one bound runtime bundle around injected edge dependencies", () => {
    const services = createV5Services({ database, clock, ids, catalog: CATALOG_SEED });

    expect(services.clock).toBe(clock);
    expect(services.ids).toBe(ids);
    expect(services.catalog).toBe(CATALOG_SEED);
    expect(typeof services.workouts.start).toBe("function");
    expect(typeof services.workouts.resume).toBe("function");
    expect(typeof services.workouts.completeSet).toBe("function");
    expect(typeof services.workouts.completeWorkout).toBe("function");
    expect(typeof services.workouts.recordReadiness).toBe("function");
    expect(typeof services.programs.proposeStructures).toBe("function");
    expect(typeof services.programs.buildPreview).toBe("function");
    expect(typeof services.programs.activate).toBe("function");
    expect(typeof services.programs.getActive).toBe("function");
    expect(typeof services.programs.reviewBlock).toBe("function");
    expect(typeof services.programs.proposeGoalTransition).toBe("function");
    expect(typeof services.programs.activateGoalTransition).toBe("function");
    expect(typeof services.coach.evaluateCompletedSession).toBe("function");
    expect(typeof services.coach.listPending).toBe("function");
    expect(typeof services.coach.accept).toBe("function");
    expect(typeof services.coach.modify).toBe("function");
    expect(typeof services.coach.skip).toBe("function");
    expect(typeof services.backup.exportBackup).toBe("function");
    expect(typeof services.backup.previewBackup).toBe("function");
    expect(typeof services.backup.importBackup).toBe("function");
  });
});
