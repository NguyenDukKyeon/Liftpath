import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { progressionUserState } from "../helpers/app-fixtures.js";
import { seedState } from "../helpers/seed-state.js";

const assertNoSeriousViolations = async (page: Page, screen: string) => {
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter((item) =>
    item.impact === "serious" || item.impact === "critical");
  expect(
    blocking,
    `${screen}\n${blocking.map((item) => `${item.id}: ${item.help}`).join("\n")}`,
  ).toEqual([]);
};

const assertTouchTarget = async (locator: Locator, label: string) => {
  const box = await locator.boundingBox();
  expect(box, `${label} must render`).not.toBeNull();
  expect(box!.width, `${label} width`).toBeGreaterThanOrEqual(44);
  expect(box!.height, `${label} height`).toBeGreaterThanOrEqual(44);
};

const assertNoHorizontalOverflow = async (page: Page, screen: string) => {
  expect(
    await page.evaluate(() =>
      document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    `${screen} must not overflow horizontally`,
  ).toBe(true);
};

test("@a11y supporting destinations have no serious violations or overflow", async ({ page }) => {
  const state = progressionUserState();
  state.settings.theme = "dark";
  await seedState(page, state);
  await page.goto("/");

  const bottomNavigation = page.locator(".bottom-nav");
  const destinations = [
    { label: null, screen: "today" },
    { label: "Giáo án", screen: "programs" },
    { label: "Nhật ký", screen: "history" },
    { label: "Tiến bộ", screen: "insights" },
    { label: "Cài đặt", screen: "settings" },
  ] as const;

  for (const destination of destinations) {
    if (destination.label) {
      await bottomNavigation.getByRole("button", { name: destination.label }).click();
    }
    await expect(page.locator(".app-shell")).toHaveAttribute("data-screen", destination.screen);
    await assertNoSeriousViolations(page, destination.screen);
    await assertNoHorizontalOverflow(page, destination.screen);
    await assertTouchTarget(
      bottomNavigation.locator("button.active"),
      `${destination.screen} active navigation target`,
    );
  }

  await assertTouchTarget(page.locator(".theme-picker button").first(), "theme selection");
  await assertTouchTarget(page.getByRole("switch").first(), "settings toggle");
  await assertTouchTarget(
    page.getByRole("button", { name: /xuất backup json/i }),
    "backup action",
  );
});
