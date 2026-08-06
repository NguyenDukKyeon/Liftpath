import { expect, test } from "@playwright/test";
import { returningUserState } from "../helpers/app-fixtures.js";
import { seedState } from "../helpers/seed-state.js";

test("supporting shell identifies the active Athletic Precision destination", async ({ page }) => {
  await seedState(page, returningUserState());
  await page.goto("/");

  const shell = page.locator(".app-shell");
  const content = page.locator("main.page-content");

  await expect(shell).toHaveAttribute("data-ui", "athletic-supporting");
  await expect(shell).toHaveAttribute("data-screen", "today");
  await expect(content).toHaveClass(/screen-today/);
  await expect(page.getByRole("heading", { name: "Buổi tập của bạn" })).toBeVisible();

  const destinations = [
    ["Giáo án", "programs", "Giáo án"],
    ["Nhật ký", "history", "Nhật ký"],
    ["Tiến bộ", "insights", "Tiến bộ"],
    ["Cài đặt", "settings", "Cài đặt"],
    ["Hôm nay", "today", "Buổi tập của bạn"],
  ] as const;

  for (const [label, screen, heading] of destinations) {
    await page.getByRole("navigation", { name: "Điều hướng chính" }).last()
      .getByRole("button", { name: label }).click();
    await expect(shell).toHaveAttribute("data-screen", screen);
    await expect(content).toHaveClass(new RegExp(`screen-${screen}`));
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
});
