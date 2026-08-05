import { expect, test } from "@playwright/test";
import { getProgram } from "../../src/data.js";
import { prepareWorkoutFromState } from "../../src/features/workout/preparation.js";
import { returningUserState } from "../helpers/app-fixtures.js";
import { seedState } from "../helpers/seed-state.js";

test("low energy and 35 minutes remove accessories before primary work", async ({ page }) => {
  const state = returningUserState();
  const program = getProgram(state.settings.programId, state.customPrograms);
  const prepared = prepareWorkoutFromState(state, program.workouts[0].id);
  expect(prepared).not.toBeNull();
  const baseSetTotal = prepared!.prescriptions.reduce((sum, item) => sum + item.setScheme.length, 0);

  await seedState(page, state);
  await page.goto("/");
  await page.getByRole("button", { name: /bắt đầu tập/i }).first().click();
  await page.getByRole("button", { name: /^thấp/i }).click();
  await page.getByRole("slider").fill("35");

  const removed = page.locator(".readiness-summary-grid span").filter({ hasText: "bài phụ bỏ" }).locator("strong");
  await expect(removed).not.toHaveText("0");
  await expect(page.getByText(/năng lượng hôm nay thấp|thời gian hôm nay ngắn/i).first()).toBeVisible();
  await page.getByRole("button", { name: /xác nhận và bắt đầu/i }).click();

  const progress = await page.locator(".workout-title strong").textContent();
  const adjustedTotal = Number(progress?.match(/\/(\d+)/)?.[1] ?? Number.NaN);
  expect(adjustedTotal).toBeLessThan(baseSetTotal);
  await expect(page.getByRole("button", { name: /bài 1:/i })).toBeVisible();
});
