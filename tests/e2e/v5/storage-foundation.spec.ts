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
  const probe = page.getByTestId("v5-db-info");

  await expect(probe).toHaveAttribute("data-db-name", "liftpath-v5");
  const stores = (await probe.getAttribute("data-db-stores"))?.split(",") ?? [];

  expect(stores).toEqual(
    expect.arrayContaining(["metadata", "sets", "sessions", "recoverySnapshots"]),
  );
});

test("rolls back writes when transaction work throws", async ({ page }) => {
  await page.goto("/?v5=1&diagnostics=1");

  const result = await page.evaluate(async () => {
    type Diagnostics = {
      verifyTransactionRollback(): Promise<{
        caught: boolean;
        firstExists: boolean;
        secondExists: boolean;
      }>;
    };
    const diagnostics = (window as typeof window & { __liftpathV5Diagnostics?: Diagnostics })
      .__liftpathV5Diagnostics;
    if (!diagnostics) throw new Error("V5 diagnostics unavailable");
    return diagnostics.verifyTransactionRollback();
  });

  expect(result).toEqual({ caught: true, firstExists: false, secondExists: false });
});
