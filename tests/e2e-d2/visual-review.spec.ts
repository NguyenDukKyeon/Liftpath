import { expect, test } from "@playwright/test";
import {
  activeWorkoutState,
  recapUserState,
  returningUserState,
} from "../helpers/app-fixtures.js";
import { clearLiftPathStorage, seedState } from "../helpers/seed-state.js";

const settleAndCapture = async (
  page: import("@playwright/test").Page,
  path: string,
) => {
  await page.waitForTimeout(300);
  await page.screenshot({ path, fullPage: false });
};

test("captures focused onboarding first viewport", async ({ page }, testInfo) => {
  await clearLiftPathStorage(page);
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /bạn muốn ưu tiên điều gì/i })).toBeVisible();
  await expect(page.locator('[data-ui="focused-coach"]')).toBeVisible();
  await settleAndCapture(page, testInfo.outputPath("focused-onboarding.png"));
});

test("captures fast readiness first viewport", async ({ page }, testInfo) => {
  await seedState(page, returningUserState());
  await page.goto("/");
  await page.getByRole("button", { name: /bắt đầu tập/i }).first().click();

  await expect(page.getByRole("button", { name: /tập như kế hoạch/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /tôi cần điều chỉnh/i })).toBeVisible();
  await settleAndCapture(page, testInfo.outputPath("focused-readiness.png"));
});

test("captures set-first workout first viewport", async ({ page }, testInfo) => {
  await seedState(page, activeWorkoutState());
  await page.goto("/");

  await expect(page.getByRole("button", { name: /hoàn thành hiệp 1/i })).toBeInViewport();
  await expect(page.getByRole("button", { name: /xem lý do/i })).toBeVisible();
  await settleAndCapture(page, testInfo.outputPath("focused-workout.png"));
});

test("captures value-first recap first viewport", async ({ page }, testInfo) => {
  await seedState(page, recapUserState());
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /ưu tiên buổi tiếp theo/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /hôm nay bạn làm tốt điều gì/i })).toBeVisible();
  await settleAndCapture(page, testInfo.outputPath("focused-recap.png"));
});
