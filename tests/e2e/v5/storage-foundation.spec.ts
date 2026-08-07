import { expect, test } from "@playwright/test";

test("V4 stays default and V5 requires preview flag", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#root")).not.toBeEmpty();
  await expect(page.getByTestId("v5-preview-root")).toHaveCount(0);

  await page.goto("/?v5=1");
  await expect(page.getByTestId("v5-preview-root")).toBeVisible();
});
