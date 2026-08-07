import { expect, test } from "@playwright/test";

test("repository survives reload", async ({ page }) => {
  await page.goto("/?v5=1&diagnostics=1");

  const seeded = await page.evaluate(async () => {
    type Diagnostics = {
      seedWorkoutRepositoryReloadProbe?(): Promise<{
        sessionId: string;
        setIds: string[];
      }>;
    };
    const diagnostics = (window as typeof window & { __liftpathV5Diagnostics?: Diagnostics })
      .__liftpathV5Diagnostics;
    if (!diagnostics?.seedWorkoutRepositoryReloadProbe) {
      throw new Error("V5 workout repository diagnostics unavailable");
    }
    return diagnostics.seedWorkoutRepositoryReloadProbe();
  });

  await page.reload();

  const restored = await page.evaluate(async () => {
    type Diagnostics = {
      readWorkoutRepositoryReloadProbe?(): Promise<{
        activeSessionId: string | null;
        setIds: string[];
      }>;
    };
    const diagnostics = (window as typeof window & { __liftpathV5Diagnostics?: Diagnostics })
      .__liftpathV5Diagnostics;
    if (!diagnostics?.readWorkoutRepositoryReloadProbe) {
      throw new Error("V5 workout repository diagnostics unavailable after reload");
    }
    return diagnostics.readWorkoutRepositoryReloadProbe();
  });

  expect(restored.activeSessionId).toBe(seeded.sessionId);
  expect(restored.setIds).toEqual(seeded.setIds);
});

test("set survives reload after committed completion", async ({ page }) => {
  await page.goto("/?v5=1&diagnostics=1");

  const committed = await page.evaluate(async () => {
    type Diagnostics = {
      completeSetReloadProbe?(): Promise<{
        setId: string;
        loadKg?: number;
        reps?: number;
        rir?: number;
      }>;
    };
    const diagnostics = (window as typeof window & { __liftpathV5Diagnostics?: Diagnostics })
      .__liftpathV5Diagnostics;
    if (!diagnostics?.completeSetReloadProbe) {
      throw new Error("V5 complete-set diagnostics unavailable");
    }
    return diagnostics.completeSetReloadProbe();
  });

  await page.reload();

  const restored = await page.evaluate(async (setId) => {
    type Diagnostics = {
      readCommittedSetProbe?(setId: string): Promise<{
        setId: string;
        loadKg?: number;
        reps?: number;
        rir?: number;
      } | null>;
    };
    const diagnostics = (window as typeof window & { __liftpathV5Diagnostics?: Diagnostics })
      .__liftpathV5Diagnostics;
    if (!diagnostics?.readCommittedSetProbe) {
      throw new Error("V5 committed-set diagnostics unavailable after reload");
    }
    return diagnostics.readCommittedSetProbe(setId);
  }, committed.setId);

  expect(restored).toEqual(committed);
});

test("active workout resumes after reload and completed workout stays completed", async ({ page }) => {
  await page.goto("/?v5=1");

  await expect(page.getByRole("button", { name: "Start workout" })).toBeVisible();
  await page.getByRole("button", { name: "Start workout" }).click();
  await expect(page.getByText("0 / 4 sets complete")).toBeVisible();

  const sessionId = (await page.getByTestId("v5-active-session-id").textContent())?.trim();
  expect(sessionId).toBeTruthy();

  for (const completedCount of [1, 2]) {
    await page.getByRole("button", { name: "Complete set" }).click();
    await expect(page.getByText(`${completedCount} / 4 sets complete`)).toBeVisible();
  }

  await page.reload();

  await expect(page.getByTestId("v5-active-session-id")).toHaveText(sessionId!);
  await expect(page.getByText("2 / 4 sets complete")).toBeVisible();

  for (const completedCount of [3, 4]) {
    await page.getByRole("button", { name: "Complete set" }).click();
    await expect(page.getByText(`${completedCount} / 4 sets complete`)).toBeVisible();
  }

  await page.getByRole("button", { name: "Complete workout" }).click();
  await expect(page.getByText("Workout completed")).toBeVisible();
  await expect(page.getByRole("button", { name: "Start workout" })).toBeVisible();

  await page.reload();

  await expect(page.getByRole("button", { name: "Start workout" })).toBeVisible();
  await expect(page.getByTestId("v5-active-session-id")).toHaveCount(0);
});
