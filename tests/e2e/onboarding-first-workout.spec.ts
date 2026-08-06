import { expect, test } from "@playwright/test";
import { clearLiftPathStorage } from "../helpers/seed-state.js";

test("beginner completes onboarding, logs a set with blank effort, and sees recap", async ({ page }) => {
  await clearLiftPathStorage(page);
  await page.goto("/");

  await expect(page).toHaveTitle(/LiftPath/i);
  await expect(page.getByRole("heading", { name: /bạn muốn ưu tiên điều gì/i })).toBeVisible();

  for (let step = 0; step < 3; step += 1) {
    await page.getByRole("button", { name: /tiếp tục/i }).click();
  }
  await expect(page.getByRole("heading", { name: /lộ trình được đề xuất/i })).toBeVisible();
  await page.getByRole("button", { name: /dùng lộ trình này/i }).click();

  await expect(page.getByRole("heading", { name: /buổi tập của bạn/i })).toBeVisible();
  await page.getByRole("button", { name: /bắt đầu tập/i }).first().click();
  await expect(page.getByRole("heading", { name: /sẵn sàng tập hôm nay/i })).toBeVisible();
  await page.getByRole("button", { name: /tập như kế hoạch/i }).click();

  await expect(page.locator(".workout-title strong")).toContainText(/0\/\d+ hiệp hoàn thành/);
  const load = page.getByLabel(/^(Kg|Hỗ trợ|\+Kg) hiệp 1$/).first();
  if (await load.count()) await load.fill("10");
  await page.getByLabel(/^(Reps|Giây|Mét) hiệp 1$/).first().fill("8");
  await expect(page.getByRole("button", { name: /hoàn thành hiệp 1/i })).toBeEnabled();
  await page.getByRole("button", { name: /hoàn thành hiệp 1/i }).click();

  await page.getByRole("button", { name: /^kết thúc$/i }).click();
  await expect(page.getByRole("dialog", { name: /đánh giá và kết thúc/i })).toBeVisible();
  await page.getByRole("button", { name: /lưu buổi tập/i }).click();

  await expect(page.getByRole("heading", { name: /hôm nay bạn làm tốt điều gì/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /có gì cần chú ý/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /lần sau sẽ thay đổi gì/i })).toBeVisible();
});
