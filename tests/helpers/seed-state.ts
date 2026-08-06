import type { Page } from "@playwright/test";
import { STORAGE_KEY } from "../../src/domain/storage.js";
import type { AppState } from "../../src/types.js";

export const seedState = async (page: Page, state: AppState) => {
  await page.addInitScript(
    ([key, value]) => localStorage.setItem(key, value),
    [STORAGE_KEY, JSON.stringify(state)] as const,
  );
};

export const seedRawStorage = async (
  page: Page,
  key: string,
  value: unknown,
) => {
  await page.addInitScript(
    ([storageKey, serialized]) => localStorage.setItem(storageKey, serialized),
    [key, JSON.stringify(value)] as const,
  );
};

export const clearLiftPathStorage = async (page: Page) => {
  await page.addInitScript(() => {
    localStorage.clear();
  });
};
