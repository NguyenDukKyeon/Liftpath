import { expect, test } from "@playwright/test";
import { v3StateFixture } from "../fixtures/v3-state.js";
import { seedRawStorage } from "../helpers/seed-state.js";

test("v3 history and active draft migrate without resetting user data", async ({ page }) => {
  const legacy = JSON.parse(JSON.stringify(v3StateFixture));
  legacy.draft.exercises[0].sets[0].done = false;

  await seedRawStorage(page, "liftpath-personal-v3", legacy);
  await page.goto("/");

  await expect(page.getByText("Full Body B").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dumbbell Bench Press" })).toBeVisible();
  await page.getByRole("button", { name: /hoàn thành hiệp 1/i }).click();
  await page.getByRole("button", { name: /^kết thúc$/i }).click();
  await page.getByRole("button", { name: /lưu buổi tập/i }).click();
  await expect(page.getByRole("heading", { name: /hôm nay bạn làm tốt điều gì/i })).toBeVisible();
  await page.getByRole("button", { name: /^hoàn tất$/i }).click();

  await page.getByRole("button", { name: /^nhật ký$/i }).click();
  await expect(page.getByRole("heading", { name: /^nhật ký$/i })).toBeVisible();

  const persisted = await page.evaluate(() => {
    const raw = localStorage.getItem("liftpath-personal-v4");
    if (!raw) return null;
    const state = JSON.parse(raw);
    return {
      schemaVersion: state.schemaVersion,
      history: state.history.length,
      bodyStats: state.bodyStats.length,
      customExercises: state.customExercises.length,
      customPrograms: state.customPrograms.length,
    };
  });
  expect(persisted).toEqual({
    schemaVersion: 4,
    history: 2,
    bodyStats: 1,
    customExercises: 1,
    customPrograms: 1,
  });
});
