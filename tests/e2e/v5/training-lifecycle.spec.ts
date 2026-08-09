import { expect, test } from "@playwright/test";

test("approved goal transition preserves prior program and block history across reload", async ({ page }) => {
  await page.goto("/?v5=1&diagnostics=1");
  await expect(page.getByTestId("v5-db-info")).toBeAttached();

  const transition = await page.evaluate(async () => {
    const diagnostics = (window as any).__liftpathV5Diagnostics;
    if (!diagnostics?.verifyTrainingLifecycleTransition) {
      throw new Error("V5 training lifecycle diagnostics unavailable");
    }
    return diagnostics.verifyTrainingLifecycleTransition();
  });

  expect(transition.source).toBe("user_goal_change");
  expect(transition.proposalStructureId).toBe("upper-lower-4");
  expect(transition.retainedExerciseIds.length).toBeGreaterThan(0);
  expect(transition.oldProgramId).not.toBe(transition.newProgramId);
  expect(transition.oldBlockId).not.toBe(transition.newBlockId);

  await page.reload();
  await expect(page.getByTestId("v5-db-info")).toBeAttached();

  const snapshot = await page.evaluate(async () => {
    const open = indexedDB.open("liftpath-v5");
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    const tx = db.transaction(["profiles", "programVersions", "trainingBlocks", "metadata"], "readonly");
    const all = <T>(store: string) => new Promise<T[]>((resolve, reject) => {
      const request = tx.objectStore(store).getAll();
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
    const get = <T>(store: string, key: string) => new Promise<T>((resolve, reject) => {
      const request = tx.objectStore(store).get(key);
      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => reject(request.error);
    });
    const [profiles, programs, blocks, pointer] = await Promise.all([
      all<any>("profiles"),
      all<any>("programVersions"),
      all<any>("trainingBlocks"),
      get<any>("metadata", "active-program"),
    ]);
    db.close();
    return { profiles, programs, blocks, pointer };
  });

  expect(snapshot.programs.find((program) => program.id === transition.oldProgramId)).toBeTruthy();
  const nextProgram = snapshot.programs.find((program) => program.id === transition.newProgramId);
  expect(nextProgram?.source).toBe("user_goal_change");
  expect(nextProgram?.structureId).toBe("upper-lower-4");
  expect(nextProgram?.transitionRetainedExerciseIds).toEqual(transition.retainedExerciseIds);

  const oldBlock = snapshot.blocks.find((block) => block.id === transition.oldBlockId);
  const nextBlock = snapshot.blocks.find((block) => block.id === transition.newBlockId);
  expect(oldBlock?.status).toBe("completed");
  expect(oldBlock?.initialProgramVersionId).toBe(transition.oldProgramId);
  expect(nextBlock?.status).toBe("active");
  expect(nextBlock?.initialProgramVersionId).toBe(transition.newProgramId);
  expect(nextBlock?.currentProgramVersionId).toBe(transition.newProgramId);
  expect(nextBlock?.structureId).toBe(oldBlock?.structureId);

  expect(snapshot.profiles).toHaveLength(1);
  expect(snapshot.profiles[0]?.primarySpecialization).toBe("arms");
  expect(snapshot.pointer.value.programVersionId).toBe(transition.newProgramId);
});
