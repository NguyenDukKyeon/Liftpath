import { expect, test } from "@playwright/test";

test("V4 stays default and V5 requires preview flag", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#root")).not.toBeEmpty();
  await expect(page.getByTestId("v5-preview-root")).toHaveCount(0);

  await page.goto("/?v5=1");
  await expect(page.getByTestId("v5-preview-root")).toBeVisible();
});

test("opens isolated V5 IndexedDB schema", async ({ page }) => {
  await page.goto("/?v5=1");
  const info = await page.evaluate(async () => {
    const moduleUrl = new URL("/src/v5/infrastructure/db/open-db.ts", window.location.origin).href;
    const mod = await import(/* @vite-ignore */ moduleUrl);
    const db = await mod.openLiftPathV5Db();
    const result = { name: db.name, stores: [...db.objectStoreNames] };
    db.close();
    return result;
  });

  expect(info.name).toBe("liftpath-v5");
  expect(info.stores).toEqual(
    expect.arrayContaining(["metadata", "sets", "sessions", "recoverySnapshots"]),
  );
});
