# LiftPath 5 Foundation, Data, and Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish an isolated V5 runtime, deterministic domain primitives, native IndexedDB persistence, transactional repositories, explicit storage failures, recovery snapshots, and verified backup round-trip without changing V4 data.

**Architecture:** Add V5 under `src/v5/` and expose it only through an explicit preview selector while V4 remains default. Use repository ports plus a native IndexedDB adapter; authoritative records are persisted independently and backup/recovery are application use cases rather than whole-app JSON replacement.

**Tech Stack:** React 19.2, TypeScript 5.8, Vite 8, native IndexedDB, Node `node:test`, Vitest/Testing Library, Playwright.

## Global Constraints

- V5 storage identity is separate from all V4 storage.
- No V4 migration, clear, overwrite, or conversion.
- No mandatory backend/account.
- IndexedDB is V5 primary persistence.
- No giant serialized AppState in localStorage.
- Storage success is acknowledged only after transaction success.
- Recovery/import operations create a pre-destructive snapshot.
- Corruption must enter recovery flow rather than silently returning an empty app.
- Raw authoritative records remain independently addressable.

---

## File Map

**Create**
- `src/v5/app/V5PreviewApp.tsx` — minimal V5 preview shell and storage-health rendering.
- `src/v5/app/select-runtime.ts` — explicit V4/V5 preview selector.
- `src/v5/domain/common/types.ts` — IDs, timestamps, revisions, policy versions.
- `src/v5/domain/common/errors.ts` — typed domain/storage/backup error taxonomy.
- `src/v5/domain/common/validation.ts` — primitive invariant helpers.
- `src/v5/application/ports/clock.ts` — `Clock` port.
- `src/v5/application/ports/id-generator.ts` — `IdGenerator` port.
- `src/v5/application/ports/storage.ts` — repository and transaction contracts used by this slice.
- `src/v5/infrastructure/db/constants.ts` — DB name/version/store names.
- `src/v5/infrastructure/db/open-db.ts` — database open/upgrade logic.
- `src/v5/infrastructure/db/transaction.ts` — promise helpers and transaction completion.
- `src/v5/infrastructure/repositories/metadata-repository.ts` — schema/health metadata adapter.
- `src/v5/application/backup/backup-types.ts` — manifest and bundle contracts.
- `src/v5/application/backup/export-backup.ts` — backup exporter use case.
- `src/v5/application/backup/import-backup.ts` — validation/preview/import use case.
- `src/v5/infrastructure/backup/json-backup-codec.ts` — JSON encode/decode/checksum helper.
- `tests/v5/domain/common.test.ts`
- `tests/v5/application/backup.test.ts`
- `tests/components/v5/V5PreviewApp.test.tsx`
- `tests/e2e/v5/storage-foundation.spec.ts`

**Modify**
- `src/main.tsx` — render V5 only when explicit preview selector chooses it; keep V4 default.
- `tsconfig.test.json` — include `src/v5/domain/**/*.ts`, `src/v5/application/**/*.ts`, and `tests/v5/**/*.ts`.

## Interfaces

```ts
// src/v5/domain/common/types.ts
export type EntityId = string;
export type ISODateTime = string;
export type PolicyVersion = `${number}.${number}.${number}`;
export type Revision = number;

export interface VersionedRecord {
  id: EntityId;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  revision: Revision;
}

// src/v5/application/ports/storage.ts
export interface V5Transaction {
  put<T extends VersionedRecord>(store: V5StoreName, record: T): Promise<void>;
  get<T>(store: V5StoreName, id: EntityId): Promise<T | undefined>;
  delete(store: V5StoreName, id: EntityId): Promise<void>;
}

export interface V5Database {
  transaction<T>(stores: V5StoreName[], mode: IDBTransactionMode, work: (tx: V5Transaction) => Promise<T>): Promise<T>;
  getAll<T>(store: V5StoreName): Promise<T[]>;
}
```

### Task 1: Isolated V5 preview entry

**Files:**
- Create: `src/v5/app/select-runtime.ts`
- Create: `src/v5/app/V5PreviewApp.tsx`
- Modify: `src/main.tsx`
- Test: `tests/components/v5/V5PreviewApp.test.tsx`
- Test: `tests/e2e/v5/storage-foundation.spec.ts`

**Interfaces:**
- Produces: `selectRuntime(search: string): "v4" | "v5"`.
- Produces: `<V5PreviewApp />`.

- [ ] **Step 1: Write the selector unit behavior in the component test file**

```ts
import { describe, expect, it } from "vitest";
import { selectRuntime } from "../../../src/v5/app/select-runtime";

describe("selectRuntime", () => {
  it("keeps V4 as default and requires an explicit V5 flag", () => {
    expect(selectRuntime("")).toBe("v4");
    expect(selectRuntime("?v5=1")).toBe("v5");
    expect(selectRuntime("?v5=0")).toBe("v4");
  });
});
```

- [ ] **Step 2: Run the focused component test and verify failure**

Run: `npx vitest run tests/components/v5/V5PreviewApp.test.tsx`

Expected: FAIL because `src/v5/app/select-runtime.ts` does not exist.

- [ ] **Step 3: Implement the selector and preview shell**

```ts
// src/v5/app/select-runtime.ts
export function selectRuntime(search: string): "v4" | "v5" {
  return new URLSearchParams(search).get("v5") === "1" ? "v5" : "v4";
}
```

```tsx
// src/v5/app/V5PreviewApp.tsx
export function V5PreviewApp() {
  return (
    <main data-testid="v5-preview-root">
      <p>LIFTPATH 5 PREVIEW</p>
      <h1>Personal Coach foundation</h1>
    </main>
  );
}
```

Modify `src/main.tsx` so the existing V4 `App` remains the default and `?v5=1` renders `V5PreviewApp` inside the existing `ErrorBoundary`.

- [ ] **Step 4: Re-run the focused component test**

Run: `npx vitest run tests/components/v5/V5PreviewApp.test.tsx`

Expected: PASS.

- [ ] **Step 5: Add Playwright preview isolation assertions**

```ts
import { test, expect } from "@playwright/test";

test("V4 stays default and V5 requires preview flag", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("LIFTPATH 4.0")).toBeVisible();
  await page.goto("/?v5=1");
  await expect(page.getByTestId("v5-preview-root")).toBeVisible();
});
```

- [ ] **Step 6: Run the focused E2E test**

Run: `npx playwright test tests/e2e/v5/storage-foundation.spec.ts --grep "V4 stays default"`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/main.tsx src/v5/app tests/components/v5 tests/e2e/v5/storage-foundation.spec.ts
git commit -m "feat(v5): add isolated preview runtime"
```

### Task 2: Domain primitives and error taxonomy

**Files:**
- Create: `src/v5/domain/common/types.ts`
- Create: `src/v5/domain/common/errors.ts`
- Create: `src/v5/domain/common/validation.ts`
- Create: `tests/v5/domain/common.test.ts`
- Modify: `tsconfig.test.json`

**Interfaces:**
- Produces: `EntityId`, `ISODateTime`, `PolicyVersion`, `Revision`, `VersionedRecord`.
- Produces: `LiftPathV5Error` with codes `VALIDATION_ERROR | STORAGE_ERROR | CORRUPTED_DATA | BACKUP_ERROR | COACH_POLICY_ERROR | UNEXPECTED_ERROR`.
- Produces: `assertFiniteNonNegative(name, value)`.

- [ ] **Step 1: Write failing domain tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { assertFiniteNonNegative } from "../../../src/v5/domain/common/validation.js";
import { LiftPathV5Error } from "../../../src/v5/domain/common/errors.js";

test("rejects negative and non-finite numeric inputs", () => {
  assert.throws(() => assertFiniteNonNegative("load", -1), LiftPathV5Error);
  assert.throws(() => assertFiniteNonNegative("load", Number.NaN), LiftPathV5Error);
  assert.doesNotThrow(() => assertFiniteNonNegative("load", 0));
});
```

- [ ] **Step 2: Extend `tsconfig.test.json` and run the failing test**

Add V5 include globs while preserving existing V4 includes.

Run: `npm run test:domain -- --test-name-pattern="rejects negative"`

Expected: compilation/test failure because V5 domain modules do not exist.

- [ ] **Step 3: Implement the typed error and validation helper**

```ts
export type LiftPathV5ErrorCode =
  | "VALIDATION_ERROR"
  | "STORAGE_ERROR"
  | "CORRUPTED_DATA"
  | "BACKUP_ERROR"
  | "COACH_POLICY_ERROR"
  | "UNEXPECTED_ERROR";

export class LiftPathV5Error extends Error {
  constructor(public readonly code: LiftPathV5ErrorCode, message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "LiftPathV5Error";
  }
}
```

```ts
export function assertFiniteNonNegative(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new LiftPathV5Error("VALIDATION_ERROR", `${name} must be finite and >= 0`);
  }
}
```

- [ ] **Step 4: Run domain tests**

Run: `npm run test:domain`

Expected: PASS with all existing V4 domain tests still passing.

- [ ] **Step 5: Commit**

```bash
git add tsconfig.test.json src/v5/domain/common tests/v5/domain/common.test.ts
git commit -m "feat(v5): define domain primitives and errors"
```

### Task 3: Native IndexedDB schema and open/upgrade path

**Files:**
- Create: `src/v5/infrastructure/db/constants.ts`
- Create: `src/v5/infrastructure/db/open-db.ts`
- Create: `src/v5/infrastructure/db/transaction.ts`
- Test: `tests/e2e/v5/storage-foundation.spec.ts`

**Interfaces:**
- Produces: `V5_DB_NAME = "liftpath-v5"`.
- Produces: `V5_DB_VERSION = 1`.
- Produces: stores `metadata`, `profiles`, `programVersions`, `sessions`, `sessionExercises`, `sets`, `recommendations`, `recoverySnapshots`.
- Produces: `openLiftPathV5Db(): Promise<IDBDatabase>`.

- [ ] **Step 1: Add a failing browser test for DB identity and stores**

```ts
test("opens isolated V5 IndexedDB schema", async ({ page }) => {
  await page.goto("/?v5=1");
  const info = await page.evaluate(async () => {
    const mod = await import("/src/v5/infrastructure/db/open-db.ts");
    const db = await mod.openLiftPathV5Db();
    return { name: db.name, stores: [...db.objectStoreNames] };
  });
  expect(info.name).toBe("liftpath-v5");
  expect(info.stores).toEqual(expect.arrayContaining(["metadata", "sets", "sessions", "recoverySnapshots"]));
});
```

- [ ] **Step 2: Run the focused E2E and verify failure**

Run: `npx playwright test tests/e2e/v5/storage-foundation.spec.ts --grep "opens isolated"`

Expected: FAIL because DB module does not exist.

- [ ] **Step 3: Implement database constants and open logic**

Use `indexedDB.open(V5_DB_NAME, V5_DB_VERSION)`. In `onupgradeneeded`, create only missing stores with `keyPath: "id"`; do not inspect or modify any V4 key/database.

```ts
export const V5_DB_NAME = "liftpath-v5";
export const V5_DB_VERSION = 1;
export const V5_STORES = [
  "metadata", "profiles", "programVersions", "sessions", "sessionExercises", "sets", "recommendations", "recoverySnapshots",
] as const;
export type V5StoreName = (typeof V5_STORES)[number];
```

- [ ] **Step 4: Implement `requestToPromise` and transaction completion helper**

```ts
export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}
```

Also expose `transactionDone(tx)` that resolves on `oncomplete` and rejects on `onabort/onerror`.

- [ ] **Step 5: Re-run the focused E2E test**

Run: `npx playwright test tests/e2e/v5/storage-foundation.spec.ts --grep "opens isolated"`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/v5/infrastructure/db tests/e2e/v5/storage-foundation.spec.ts
git commit -m "feat(v5): add isolated IndexedDB schema"
```

### Task 4: Explicit repository and transaction port

**Files:**
- Create: `src/v5/application/ports/storage.ts`
- Create: `src/v5/infrastructure/repositories/indexed-db-database.ts`
- Create: `src/v5/infrastructure/repositories/metadata-repository.ts`
- Test: `tests/e2e/v5/storage-foundation.spec.ts`

**Interfaces:**
- Produces: `V5Database.transaction()` and `V5Database.getAll()`.
- Produces: `MetadataRepository.read(key)` / `write(record)`.

- [ ] **Step 1: Add a failing E2E transaction test**

Create two metadata records in one transaction, abort by throwing after the first put, and assert neither record exists afterward.

```ts
expect(await count("metadata")).toBe(0);
```

- [ ] **Step 2: Run focused test and confirm failure**

Run: `npx playwright test tests/e2e/v5/storage-foundation.spec.ts --grep "rolls back"`

Expected: FAIL because adapter does not exist.

- [ ] **Step 3: Implement adapter transaction semantics**

Open a native transaction for the requested stores, adapt `put/get/delete` to promises, execute `work`, call `tx.abort()` on thrown application errors, and await `transactionDone(tx)` before resolving.

- [ ] **Step 4: Run focused test**

Run: `npx playwright test tests/e2e/v5/storage-foundation.spec.ts --grep "rolls back"`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/v5/application/ports/storage.ts src/v5/infrastructure/repositories tests/e2e/v5/storage-foundation.spec.ts
git commit -m "feat(v5): add transactional repository adapter"
```

### Task 5: Storage failure surfaced to preview UI

**Files:**
- Modify: `src/v5/app/V5PreviewApp.tsx`
- Create: `src/v5/application/backup/storage-health.ts`
- Test: `tests/components/v5/V5PreviewApp.test.tsx`

**Interfaces:**
- Produces: `StorageHealth = { status: "ready" } | { status: "error"; message: string }`.

- [ ] **Step 1: Write failing UI test**

Mock the storage-health loader to reject with `LiftPathV5Error("STORAGE_ERROR", "quota exceeded")`; assert a persistent `role="alert"` containing `Không thể lưu dữ liệu LiftPath 5` and a retry button.

- [ ] **Step 2: Run focused test and verify failure**

Run: `npx vitest run tests/components/v5/V5PreviewApp.test.tsx`

Expected: FAIL because storage error UI is absent.

- [ ] **Step 3: Implement storage health loading and persistent alert**

Do not render a success state before the DB open/read operation resolves. Retry calls the loader again; no silent catch.

- [ ] **Step 4: Re-run component tests**

Run: `npx vitest run tests/components/v5/V5PreviewApp.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/v5/app/V5PreviewApp.tsx src/v5/application/backup/storage-health.ts tests/components/v5/V5PreviewApp.test.tsx
git commit -m "feat(v5): surface persistence failures"
```

### Task 6: Backup manifest, checksum, and round-trip

**Files:**
- Create: `src/v5/application/backup/backup-types.ts`
- Create: `src/v5/infrastructure/backup/json-backup-codec.ts`
- Create: `src/v5/application/backup/export-backup.ts`
- Create: `src/v5/application/backup/import-backup.ts`
- Create: `tests/v5/application/backup.test.ts`
- Modify: `tests/e2e/v5/storage-foundation.spec.ts`

**Interfaces:**

```ts
export interface BackupManifest {
  format: "liftpath-v5-backup";
  backupFormatVersion: 1;
  schemaVersion: 1;
  createdAt: ISODateTime;
  recordCounts: Record<string, number>;
  checksum: string;
}

export interface BackupPreview {
  manifest: BackupManifest;
  totalRecords: number;
  warnings: string[];
}
```

- [ ] **Step 1: Write failing checksum/preview tests**

Test that tampering with one authoritative record after encoding makes decode throw `BACKUP_ERROR`, and a valid bundle returns a `BackupPreview` without writing to the database.

- [ ] **Step 2: Run domain/application tests and verify failure**

Run: `npm run test:domain`

Expected: FAIL because backup modules do not exist.

- [ ] **Step 3: Implement deterministic JSON canonicalization and checksum**

Use Web Crypto `crypto.subtle.digest("SHA-256", bytes)` in browser-facing codec code. Canonicalize the payload by sorting top-level store names and record arrays by stable `id` before hashing. Store checksum in the manifest after hashing the payload without the checksum field.

- [ ] **Step 4: Implement export and preview-only import validation**

`exportBackup(db, clock)` reads authoritative/current stores and returns encoded text. `previewBackup(text)` validates format/version/checksum/required record shape and returns counts without mutating storage.

- [ ] **Step 5: Implement destructive import behind automatic snapshot**

`importBackup(text, db, clock, ids)` must:
1. call `previewBackup`;
2. create a recovery snapshot of current V5 authoritative records;
3. replace V5 records inside one transaction;
4. never touch V4 storage.

- [ ] **Step 6: Add E2E round-trip**

Seed profile + two sessions + sets, export, delete only `liftpath-v5`, import, then assert IDs/counts match the seed.

- [ ] **Step 7: Run tests**

Run: `npm run test:domain && npx playwright test tests/e2e/v5/storage-foundation.spec.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/v5/application/backup src/v5/infrastructure/backup tests/v5/application/backup.test.ts tests/e2e/v5/storage-foundation.spec.ts
git commit -m "feat(v5): add backup preview recovery and round trip"
```

### Task 7: Foundation verification gate

**Files:** none unless a failing verification requires a focused fix.

- [ ] **Step 1: Run static/domain/component/build checks**

Run: `npm run check:fast`

Expected: exit 0.

- [ ] **Step 2: Run V5 foundation browser tests**

Run: `npx playwright test tests/e2e/v5/storage-foundation.spec.ts`

Expected: all tests PASS.

- [ ] **Step 3: Run V4 default smoke path**

Run: `npx playwright test --grep-invert @a11y`

Expected: existing V4 E2E suite still passes; if hosted CI/device constraints prevent a full local run, do not claim pass without the actual successful command.

- [ ] **Step 4: Inspect scope**

Run:

```bash
git diff --stat main...HEAD
git status --short
```

Expected: V5 additions plus only the intentional `src/main.tsx`/`tsconfig.test.json` integration changes; no legacy V4 storage implementation edits.

- [ ] **Step 5: Commit any verification-only fix, otherwise do not create an empty commit**

If a fix was required, commit only that fix with a specific message. If no fix was required, proceed to code review without an extra commit.
