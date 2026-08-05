import { expect, test } from "@playwright/test";
import { activeWorkoutState } from "../helpers/app-fixtures.js";
import { clearLiftPathStorage, seedState } from "../helpers/seed-state.js";

const expectNoHorizontalOverflow = async (page: import("@playwright/test").Page) => {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
};

const captureViewport = async (page: import("@playwright/test").Page, path: string) => {
  await page.waitForTimeout(300);
  await page.screenshot({ path, fullPage: false });
};

test("onboarding selections and notes survive backward navigation", async ({ page }, testInfo) => {
  await clearLiftPathStorage(page);
  await page.goto("/");

  await page.getByRole("button", { name: /tiếp tục/i }).click();
  await expect(page.getByRole("heading", { name: /lịch nào bạn thực sự duy trì được/i })).toBeVisible();

  await page.getByRole("button", { name: /^4\s*buổi$/i }).click();
  await page.getByRole("button", { name: /^40 phút$/i }).click();
  await page.getByRole("button", { name: /T3.*Thứ Ba/i }).click();
  await page.getByRole("button", { name: /Thanh đòn/i }).click();
  await page.getByRole("button", { name: /tiếp tục/i }).click();

  const notes = page.getByPlaceholder(/Ghi chú tùy chọn/i);
  await notes.fill("D2: giữ ghi chú khi quay lại bước trước");
  await page.getByRole("button", { name: /quay lại/i }).click();

  await expect(page.getByRole("button", { name: /^4\s*buổi$/i })).toHaveClass(/selected/);
  await expect(page.getByRole("button", { name: /^40 phút$/i })).toHaveClass(/selected/);
  await expect(page.getByRole("button", { name: /T3.*Thứ Ba/i })).toHaveClass(/selected/);
  await expect(page.getByRole("button", { name: /Thanh đòn/i })).toHaveClass(/selected/);

  await page.getByRole("button", { name: /tiếp tục/i }).click();
  await expect(notes).toHaveValue("D2: giữ ghi chú khi quay lại bước trước");
  await expectNoHorizontalOverflow(page);
  await page.locator(".guided-step").scrollIntoViewIfNeeded();
  await captureViewport(page, testInfo.outputPath("onboarding-review.png"));
});

test("permission denial and Wake Lock failure never block set logging", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: class DeniedNotification {
        static permission = "denied";
        static requestPermission = async () => "denied";
      },
    });
    Object.defineProperty(navigator, "vibrate", {
      configurable: true,
      value: () => false,
    });
    Object.defineProperty(navigator, "wakeLock", {
      configurable: true,
      value: { request: async () => { throw new Error("Wake Lock denied"); } },
    });
  });
  await seedState(page, activeWorkoutState());
  await page.goto("/");

  await expect(page.getByText(/Wake Lock chưa hoạt động/i)).toBeVisible();
  const load = page.getByLabel(/^Kg hiệp 1$/).first();
  const reps = page.getByLabel(/^Reps hiệp 1$/).first();
  await load.fill("10");
  await reps.fill("8");
  await page.getByRole("button", { name: /hoàn thành hiệp 1/i }).click();

  await expect(page.locator(".workout-title strong")).toContainText(/1\/\d+ hiệp hoàn thành/);
  await expect(page.getByRole("button", { name: "+15s" })).toBeVisible();
  await page.getByRole("button", { name: "+15s" }).click();
  await page.getByRole("button", { name: "-15s" }).click();
  await page.getByRole("button", { name: /bỏ qua/i }).click();
  await expect(page.locator(".rest-timer")).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  await page.locator(".exercise-coach-card").scrollIntoViewIfNeeded();
  await captureViewport(page, testInfo.outputPath("permission-denial-workout.png"));
});

test("Wake Lock success is visible and numeric fields expose mobile input modes", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "wakeLock", {
      configurable: true,
      value: {
        request: async () => ({
          release: async () => undefined,
          addEventListener: () => undefined,
        }),
      },
    });
  });
  await seedState(page, activeWorkoutState());
  await page.goto("/");

  await expect(page.getByText(/Màn hình đang giữ sáng/i)).toBeVisible();
  const load = page.getByLabel(/^Kg hiệp 1$/).first();
  const reps = page.getByLabel(/^Reps hiệp 1$/).first();
  await expect(load).toHaveAttribute("inputmode", "decimal");
  await expect(reps).toHaveAttribute("inputmode", "numeric");

  await reps.focus();
  await expect.poll(() => reps.evaluate((element) => document.activeElement === element)).toBe(true);
  if (testInfo.project.name !== "ios-webkit") {
    const box = await reps.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual((viewport?.height ?? 0) - 8);
  }
  await expectNoHorizontalOverflow(page);
  await page.locator(".exercise-coach-card").scrollIntoViewIfNeeded();
  await captureViewport(page, testInfo.outputPath("wake-lock-success.png"));
});
