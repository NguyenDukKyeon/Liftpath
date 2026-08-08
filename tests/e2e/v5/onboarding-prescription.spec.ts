import { expect, test } from "@playwright/test";

test("fresh install creates and restores an explicitly approved V-Shape program", async ({ page }) => {
  await page.goto("/?v5=1");

  await expect(page.getByRole("heading", { name: "What is your training level?" })).toBeVisible();
  await page.getByRole("button", { name: "Beginner" }).click();
  await page.getByRole("button", { name: "Build muscle" }).click();
  await page.getByRole("button", { name: "V-Shape" }).click();
  await page.getByRole("button", { name: "4 days" }).click();
  await page.getByRole("button", { name: "60 min" }).click();
  await page.getByRole("button", { name: "Commercial gym" }).click();
  await page.getByRole("button", { name: "See structure options" }).click();

  const choices = page.getByRole("button", { name: /^Choose / });
  await expect(choices).toHaveCount(3);
  await choices.first().click();

  await expect(page.getByRole("heading", { name: "Review your program" })).toBeVisible();
  await expect(page.getByText(/prioritizes lats and lateral delts while maintaining balanced whole-body training/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Start workout" })).toHaveCount(0);

  await page.getByRole("button", { name: "Start this program" }).click();

  await expect(page.getByText("Program active")).toBeVisible();
  await expect(page.getByRole("button", { name: "Start workout" })).toBeVisible();
  const programId = (await page.getByTestId("v5-active-program-id").textContent())?.trim();
  expect(programId).toBeTruthy();

  await page.reload();

  await expect(page.getByText("Program active")).toBeVisible();
  await expect(page.getByTestId("v5-active-program-id")).toHaveText(programId!);
  await expect(page.getByRole("button", { name: "Start workout" })).toBeVisible();
});
