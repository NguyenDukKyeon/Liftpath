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

  expect(result.catalogSize).toBeGreaterThanOrEqual(100);
  expect(result.activeProgramId).toBeNull();
  expect(result.activeBlockId).toBeNull();
  expect(Number.isNaN(Date.parse(result.clockSample))).toBe(false);
  expect(result.generatedId).toMatch(/^diagnostic_/);
});

test("rest timer appears only after a set is durably completed", async ({ page }) => {
  await page.goto("/?v5=1&demo=workout-core");

  await expect(page.getByRole("button", { name: "Start workout" })).toBeVisible();
  await page.getByRole("button", { name: "Start workout" }).click();
  await expect(page.getByText("0 / 4 sets complete")).toBeVisible();
  await expect(page.getByTestId("rest-timer")).toHaveCount(0);

  await page.getByRole("button", { name: "Complete set" }).click();

  await expect(page.getByText("1 / 4 sets complete")).toBeVisible();
  await expect(page.getByTestId("rest-timer")).toBeVisible();
  await expect(page.getByTestId("rest-timer")).toContainText("Rest:");
});
