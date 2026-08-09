import { expect, test } from "@playwright/test";

test("service composition reaches production repositories through one runtime bundle", async ({ page }) => {
  await page.goto("/?v5=1&diagnostics=1");
  await expect(page.getByTestId("v5-db-info")).toBeAttached();

  const result = await page.evaluate(async () => {
    const diagnostics = (window as any).__liftpathV5Diagnostics;
    if (!diagnostics?.verifyServiceComposition) {
      throw new Error("V5 service composition diagnostics unavailable");
    }
    return diagnostics.verifyServiceComposition();
  });

  expect(result.catalogSize).toBeGreaterThan(0);
  expect(result.activeProgramId).toBeNull();
  expect(result.activeBlockId).toBeNull();
  expect(Number.isNaN(Date.parse(result.clockSample))).toBe(false);
  expect(result.generatedId).toMatch(/^diagnostic_/);
});
