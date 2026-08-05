import { expect, test } from "@playwright/test";
import { returningUserState } from "../helpers/app-fixtures.js";
import { seedState } from "../helpers/seed-state.js";

test("sharp knee pain blocks the unsafe session and avoids diagnosis claims", async ({ page }) => {
  await seedState(page, returningUserState());
  await page.goto("/");
  await page.getByRole("button", { name: /bắt đầu tập/i }).first().click();

  await page.getByRole("button", { name: /có vùng đau cần tránh/i }).click();
  await page.getByLabel("Vùng đau").selectOption("knee");
  await page.getByLabel("Mức cảnh báo").selectOption("sharp");

  await expect(page.getByRole("heading", { name: /không nên bắt đầu buổi này/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /buổi tập đang bị chặn/i })).toBeDisabled();
  await expect(page.getByText(/LiftPath không chẩn đoán chấn thương/i)).toBeVisible();
  await expect(page.getByText(/^Dừng chuyển động gây đau\./i)).toBeVisible();
});
