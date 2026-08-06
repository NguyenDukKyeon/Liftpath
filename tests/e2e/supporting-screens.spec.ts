import { expect, test } from "@playwright/test";
import { returningUserState } from "../helpers/app-fixtures.js";
import { seedState } from "../helpers/seed-state.js";

test("supporting shell identifies and navigates every Athletic Precision destination", async ({ page }) => {
  const state = returningUserState();
  state.settings.theme = "dark";
  await seedState(page, state);
  await page.goto("/");

  const shell = page.locator(".app-shell");
  const content = page.locator("main.page-content");
  const bottomNavigation = page.locator(".bottom-nav");

  await expect(shell).toHaveAttribute("data-ui", "athletic-supporting");
  await expect(shell).toHaveAttribute("data-screen", "today");
  await expect(content).toHaveClass(/screen-today/);
  await expect(page.getByRole("heading", { name: "Buổi tập của bạn" }).first()).toBeVisible();

  const tokens = await shell.evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      accent: styles.getPropertyValue("--accent").trim(),
      background: styles.getPropertyValue("--bg").trim(),
    };
  });
  expect(tokens).toEqual({ accent: "#b8f70b", background: "#050705" });

  const activeTarget = bottomNavigation.locator("button.active");
  const activeBox = await activeTarget.boundingBox();
  expect(activeBox, "active bottom-navigation target must render").not.toBeNull();
  expect(activeBox!.width).toBeGreaterThanOrEqual(44);
  expect(activeBox!.height).toBeGreaterThanOrEqual(44);

  const destinations = [
    ["Giáo án", "programs", "Giáo án"],
    ["Nhật ký", "history", "Nhật ký"],
    ["Tiến bộ", "insights", "Tiến bộ"],
    ["Cài đặt", "settings", "Cài đặt"],
    ["Hôm nay", "today", "Buổi tập của bạn"],
  ] as const;

  for (const [label, screen, heading] of destinations) {
    await bottomNavigation.getByRole("button", { name: label }).click();
    await expect(shell).toHaveAttribute("data-screen", screen);
    await expect(content).toHaveClass(new RegExp(`screen-${screen}`));
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
    expect(await page.evaluate(() =>
      document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }
});
