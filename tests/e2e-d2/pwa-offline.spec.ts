import { expect, test } from "@playwright/test";
import { STORAGE_KEY } from "../../src/domain/storage.js";
import { progressionUserState } from "../helpers/app-fixtures.js";
import { seedState } from "../helpers/seed-state.js";

test("PWA is installable, preserves history offline, and replaces stale shell caches", async ({ page, context }, testInfo) => {
  await seedState(page, progressionUserState());
  await page.goto("/");

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  const client = await context.newCDPSession(page);
  const installability = await client.send("Page.getInstallabilityErrors") as {
    installabilityErrors: Array<{ errorId: string; errorArguments: unknown[] }>;
  };
  expect(installability.installabilityErrors).toEqual([]);

  const manifestResult = await client.send("Page.getAppManifest") as {
    data?: string;
    errors?: Array<{ message: string }>;
  };
  expect(manifestResult.errors ?? []).toEqual([]);
  const manifest = JSON.parse(manifestResult.data ?? "{}") as {
    name?: string;
    short_name?: string;
    display?: string;
    icons?: Array<{ src: string }>;
  };
  expect(manifest.name).toContain("LiftPath 4.0");
  expect(manifest.short_name).toBe("LiftPath 4.0");
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons?.length).toBeGreaterThan(0);

  const assetStatus = await page.evaluate(async () => {
    const manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!manifestLink) return { manifest: 0, icon: 0 };
    const response = await fetch(manifestLink.href, { cache: "no-store" });
    const data = await response.json() as { icons?: Array<{ src: string }> };
    const iconUrl = new URL(data.icons?.[0]?.src ?? "", manifestLink.href).href;
    const icon = await fetch(iconUrl, { cache: "no-store" });
    return { manifest: response.status, icon: icon.status };
  });
  expect(assetStatus).toEqual({ manifest: 200, icon: 200 });

  await expect.poll(() => page.evaluate(async () => {
    const cache = await caches.open("liftpath-shell-v10");
    return (await cache.keys()).map((request) => new URL(request.url).pathname);
  })).toEqual(expect.arrayContaining([
    "/",
    "/manifest.webmanifest",
    expect.stringMatching(/^\/assets\/index-.*\.js$/),
    expect.stringMatching(/^\/assets\/index-.*\.css$/),
  ]));

  await page.evaluate(async () => {
    await caches.open("liftpath-shell-v9");
  });
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /buổi tập của bạn/i })).toBeVisible();
  const storedHistoryCount = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as { history?: unknown[] }).history?.length ?? 0 : 0;
  }, STORAGE_KEY);
  expect(storedHistoryCount).toBeGreaterThan(0);

  await context.setOffline(false);
  await page.evaluate(async () => {
    const current = await navigator.serviceWorker.getRegistration();
    await current?.unregister();
    const registration = await navigator.serviceWorker.register("/sw.js?d2-update=1", { scope: "/" });
    const worker = registration.installing ?? registration.waiting ?? registration.active;
    if (!registration.active && worker) {
      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error("Timed out activating replacement service worker")), 10_000);
        worker.addEventListener("statechange", () => {
          if (worker.state === "activated") {
            window.clearTimeout(timeout);
            resolve();
          }
        });
      });
    }
    await navigator.serviceWorker.ready;
  });

  await expect.poll(() => page.evaluate(() => caches.keys())).not.toContain("liftpath-shell-v9");
  await expect.poll(() => page.evaluate(() => caches.keys())).toContain("liftpath-shell-v10");
  await page.screenshot({ path: testInfo.outputPath("pwa-offline-restored.png"), fullPage: true });
});
