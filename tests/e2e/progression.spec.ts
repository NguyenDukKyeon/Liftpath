import { expect, test } from "@playwright/test";
import { progressionUserState } from "../helpers/app-fixtures.js";
import { seedState } from "../helpers/seed-state.js";

test("returning user sees, copies, and applies the load progression", async ({ page }) => {
  await seedState(page, progressionUserState());
  await page.goto("/");

  await expect(page.getByText("Progression Test Plan").first()).toBeVisible();
  await page.getByRole("button", { name: /bắt đầu tập/i }).first().click();
  await page.getByRole("button", { name: /xác nhận và bắt đầu/i }).click();

  const coach = page.getByLabel("Hướng dẫn của LiftPath");
  await expect(coach).toContainText("Tăng lên 22 kg");
  await expect(coach).toContainText(/đầu trên|working set|rep range/i);

  await page.getByRole("button", { name: /sao chép kết quả lần trước vào hiệp 1/i }).click();
  const load = page.getByLabel("Kg hiệp 1");
  const reps = page.getByLabel("Reps hiệp 1");
  await expect(load).toHaveValue("20");
  await expect(reps).toHaveValue("12");

  await page.getByRole("button", { name: /tăng 2 kg ở hiệp 1/i }).click();
  await expect(load).toHaveValue("22");
  await page.getByRole("button", { name: /hoàn thành hiệp 1/i }).click();
  await expect(page.locator(".workout-title strong")).toContainText("1/");
});
