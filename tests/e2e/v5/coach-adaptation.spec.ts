import { expect, test, type Page } from "@playwright/test";

async function seedDecision(page: Page, safety = false): Promise<void> {
  await page.goto("/?v5=1");
  await expect(page.getByTestId("v5-db-info")).toBeAttached();

  await page.evaluate(async ({ safety }) => {
    const stamp = "2026-08-08T05:00:00.000Z";
    const open = indexedDB.open("liftpath-v5");
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });

    const tx = db.transaction(["profiles", "programVersions", "recommendations", "metadata"], "readwrite");
    tx.objectStore("profiles").put({
      id: "profile-1", createdAt: stamp, updatedAt: stamp, revision: 1,
      level: "beginner", goal: "hypertrophy", primarySpecialization: "v_shape",
      constraints: { daysPerWeek: 4, sessionMinutes: 60, equipment: ["cable", "dumbbell"], dislikedExerciseIds: [], restrictedMovementPatterns: [] },
    });
    tx.objectStore("programVersions").put({
      id: "program-1", createdAt: stamp, updatedAt: stamp, revision: 1,
      versionNumber: 1, name: "V-Shape Coach Test", profileId: "profile-1",
      policyVersion: "1.0.0", structureId: "upper-lower-4",
      sessions: [
        { key: "upper-a", name: "Upper A", exercises: [
          { exerciseId: "lat-pulldown", order: 1, sets: [{ ordinal: 1, minReps: 8, maxReps: 12, targetRir: 2, prescribedLoadKg: 50 }] },
          { exerciseId: "lateral-raise", order: 2, sets: [{ ordinal: 1, minReps: 10, maxReps: 15, targetRir: 2, prescribedLoadKg: 10 }] },
        ] },
        { key: "lower-a", name: "Lower A", exercises: [] },
      ],
    });
    tx.objectStore("metadata").put({
      id: "active-program",
      value: { profileId: "profile-1", programVersionId: "program-1" },
      createdAt: stamp, updatedAt: stamp, revision: 1,
    });
    tx.objectStore("recommendations").put({
      id: "recommendation-1", createdAt: stamp, updatedAt: stamp, revision: 1,
      type: safety ? "safety" : "progression",
      priority: safety ? "safety" : "progression",
      reasonCode: safety ? "PAIN_BLOCKS_PROGRESSION" : "PROGRESSION_TOP_RANGE",
      evidenceIds: ["set-1", "set-2", "set-3"],
      confidence: "medium",
      proposedPatch: safety
        ? { kind: "set_count", exerciseId: "lateral-raise", sets: 0 }
        : { kind: "set_load", exerciseId: "lat-pulldown", loadKg: 52.5 },
      expectedIntent: safety
        ? "Pause normal progression for the affected movement until the user reviews the plan."
        : "Progress load after repeated top-of-range work at target effort.",
      decisionState: "pending",
      coachPolicyVersion: "1.0.0",
      programmingPolicyVersion: "1.0.0",
    });

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("seed transaction aborted"));
    });
    db.close();
  }, { safety });

  await page.reload();
}

async function decisionSnapshot(page: Page) {
  return page.evaluate(async () => {
    const open = indexedDB.open("liftpath-v5");
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    const tx = db.transaction(["programVersions", "recommendations", "metadata"], "readonly");
    const getAll = <T>(store: string) => new Promise<T[]>((resolve, reject) => {
      const request = tx.objectStore(store).getAll();
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
    const get = <T>(store: string, key: string) => new Promise<T>((resolve, reject) => {
      const request = tx.objectStore(store).get(key);
      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => reject(request.error);
    });
    const programs = await getAll<any>("programVersions");
    const recommendations = await getAll<any>("recommendations");
    const pointer = await get<any>("metadata", "active-program");
    db.close();
    return { programs, recommendations, pointer };
  });
}

test("accepting a progression recommendation creates and restores a new active ProgramVersion", async ({ page }) => {
  await seedDecision(page, false);

  await expect(page.getByRole("heading", { name: "Coach recommendation" })).toBeVisible();
  await expect(page.getByText(/52\.5 kg/i)).toBeVisible();
  await page.getByRole("button", { name: "Accept" }).click();
  await expect(page.getByRole("heading", { name: "Coach recommendation" })).toHaveCount(0);

  const activeId = (await page.getByTestId("v5-active-program-id").textContent())?.trim();
  expect(activeId).toBeTruthy();
  expect(activeId).not.toBe("program-1");

  await page.reload();
  await expect(page.getByTestId("v5-active-program-id")).toHaveText(activeId!);

  const snapshot = await decisionSnapshot(page);
  expect(snapshot.programs).toHaveLength(2);
  expect(snapshot.programs.find((program) => program.id === "program-1")).toBeTruthy();
  const next = snapshot.programs.find((program) => program.id === activeId);
  expect(next.sourceRecommendationId).toBe("recommendation-1");
  expect(next.versionNumber).toBe(2);
  expect(next.structureId).toBe("upper-lower-4");
  expect(next.sessions.map((session: any) => session.key)).toEqual(["upper-a", "lower-a"]);
  expect(next.sessions[0].exercises[0].sets[0].prescribedLoadKg).toBe(52.5);
  expect(snapshot.recommendations[0].decisionState).toBe("accepted");
  expect(snapshot.pointer.value.programVersionId).toBe(activeId);
});

test("pain-safety decision does not generate or apply a normal load increase", async ({ page }) => {
  await seedDecision(page, true);

  await expect(page.getByText(/pause normal progression/i)).toBeVisible();
  await expect(page.getByText(/lateral-raise to 0 working sets/i)).toBeVisible();
  await expect(page.getByText(/lateral-raise load/i)).toHaveCount(0);
  await page.getByRole("button", { name: "Accept" }).click();
  await expect(page.getByRole("heading", { name: "Coach recommendation" })).toHaveCount(0);

  const snapshot = await decisionSnapshot(page);
  const activeId = snapshot.pointer.value.programVersionId;
  const active = snapshot.programs.find((program) => program.id === activeId);
  const upper = active.sessions.find((session: any) => session.key === "upper-a");
  const pulldown = upper.exercises.find((exercise: any) => exercise.exerciseId === "lat-pulldown");
  const lateralRaise = upper.exercises.find((exercise: any) => exercise.exerciseId === "lateral-raise");
  expect(pulldown.sets[0].prescribedLoadKg).toBe(50);
  expect(lateralRaise.sets).toHaveLength(0);
  expect(snapshot.recommendations[0].decisionState).toBe("accepted");
});
