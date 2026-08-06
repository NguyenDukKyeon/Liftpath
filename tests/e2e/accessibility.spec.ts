import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  activeWorkoutState,
  recapUserState,
  returningUserState,
} from "../helpers/app-fixtures.js";
import { clearLiftPathStorage, seedState } from "../helpers/seed-state.js";

const assertNoSeriousViolations = async (page: Page) => {
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter((item) =>
    item.impact === "serious" || item.impact === "critical");
  expect(blocking, blocking.map((item) => `${item.id}: ${item.help}`).join("\n")).toEqual([]);
};

const assertNoHorizontalOverflow = async (page: Page) => {
  expect(await page.evaluate(() =>
    document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
};

const assertTouchTarget = async (locator: Locator, label: string) => {
  const box = await locator.boundingBox();
  expect(box, `${label} must be rendered`).not.toBeNull();
  expect(box!.width, `${label} width`).toBeGreaterThanOrEqual(44);
  expect(box!.height, `${label} height`).toBeGreaterThanOrEqual(44);
};

const assertInsideViewport = async (page: Page, locator: Locator, label: string) => {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(box, `${label} must be rendered`).not.toBeNull();
  expect(viewport, `${label} viewport must exist`).not.toBeNull();
  expect(box!.y, `${label} top`).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height, `${label} bottom`).toBeLessThanOrEqual(viewport!.height - 8);
};

test("@a11y onboarding has no serious violations, overflow, or undersized primary action", async ({ page }) => {
  await clearLiftPathStorage(page);
  await page.goto("/");

  await expect(page.locator('[data-ui="focused-coach"]')).toBeVisible();
  await assertNoSeriousViolations(page);
  await assertNoHorizontalOverflow(page);
  await assertTouchTarget(page.getByRole("button", { name: /tiếp tục/i }), "Onboarding continue");
});

test("@a11y readiness has no serious violations, overflow, or undersized fast action", async ({ page }) => {
  await seedState(page, returningUserState());
  await page.goto("/");
  await page.getByRole("button", { name: /bắt đầu tập/i }).first().click();

  await expect(page.locator('[data-ui="focused-coach"]')).toBeVisible();
  await assertNoSeriousViolations(page);
  await assertNoHorizontalOverflow(page);
  await assertTouchTarget(
    page.getByRole("button", { name: /tập như kế hoạch/i }),
    "Readiness fast action",
  );
});

test("@a11y workout has no serious violations, overflow, or hidden focused set input", async ({ page }) => {
  await seedState(page, activeWorkoutState());
  await page.goto("/");

  await expect(page.locator('[data-ui="focused-coach"]')).toBeVisible();
  await assertNoSeriousViolations(page);
  await assertNoHorizontalOverflow(page);
  const completeSet = page.getByRole("button", { name: /hoàn thành hiệp 1/i });
  await assertTouchTarget(completeSet, "Complete set");
  await assertInsideViewport(page, completeSet, "Complete set above the fold");
  await assertTouchTarget(page.getByRole("button", { name: /^kết thúc$/i }), "Finish workout");

  const finalInput = page.locator('input[type="number"]:visible').last();
  await finalInput.scrollIntoViewIfNeeded();
  await finalInput.focus();
  await assertInsideViewport(page, finalInput, "Focused set input");
});

test("@a11y recap has no serious violations, overflow, or undersized completion", async ({ page }) => {
  await seedState(page, recapUserState());
  await page.goto("/");

  await expect(page.locator('[data-ui="focused-coach"]')).toBeVisible();
  await assertNoSeriousViolations(page);
  await assertNoHorizontalOverflow(page);
  await assertTouchTarget(page.getByRole("button", { name: /^hoàn tất$/i }), "Recap completion");
});
