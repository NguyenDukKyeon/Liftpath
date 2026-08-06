import { expect, test, type Page } from "@playwright/test";
import { progressionUserState } from "../helpers/app-fixtures.js";
import { seedState } from "../helpers/seed-state.js";

const openDestination = async (page: Page, label: string) => {
  const bottomNavigation = page.locator(".bottom-nav");
  const navigation = await bottomNavigation.isVisible()
    ? bottomNavigation
    : page.locator(".rail-nav");
  await navigation.getByRole("button", { name: label }).click();
};

const assertViewportIntegrity = async (page: Page) => {
  expect(await page.evaluate(() =>
    document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  const shell = page.locator('[data-ui="athletic-supporting"]');
  await expect(shell).toBeVisible();
  await page.waitForTimeout(220);
};

test("captures every Phase B supporting destination", async ({ page }, testInfo) => {
  const state = progressionUserState();
  state.settings.theme = "dark";
  await seedState(page, state);
  await page.goto("/");

  const captures = [
    { screen: "today", heading: "Buổi tập của bạn", label: null },
    { screen: "programs", heading: "Giáo án", label: "Giáo án" },
    { screen: "history", heading: "Nhật ký", label: "Nhật ký" },
    { screen: "insights", heading: "Tiến bộ", label: "Tiến bộ" },
    { screen: "settings", heading: "Cài đặt", label: "Cài đặt" },
  ] as const;

  for (const capture of captures) {
    if (capture.label) await openDestination(page, capture.label);
    await expect(page.locator(".app-shell")).toHaveAttribute("data-screen", capture.screen);
    await expect(page.getByRole("heading", { name: capture.heading }).first()).toBeVisible();
    await assertViewportIntegrity(page);
    await page.screenshot({
      path: testInfo.outputPath(`phase-b-${capture.screen}.png`),
      fullPage: false,
      animations: "disabled",
    });
  }
});
