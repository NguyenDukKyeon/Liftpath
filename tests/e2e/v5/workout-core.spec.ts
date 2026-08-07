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
