import type { VersionedRecord } from "../domain/common/types.js";
import { createIndexedDbDatabase } from "../infrastructure/repositories/indexed-db-database.js";
import {
  verifyBackupRoundTrip,
  type BackupRoundTripResult,
} from "./backup-roundtrip-diagnostic.js";

interface RollbackResult {
  caught: boolean;
  firstExists: boolean;
  secondExists: boolean;
}

interface V5PreviewDiagnostics {
  verifyTransactionRollback(): Promise<RollbackResult>;
  verifyBackupRoundTrip(): Promise<BackupRoundTripResult>;
}

declare global {
  interface Window {
    __liftpathV5Diagnostics?: V5PreviewDiagnostics;
  }
}

function makeRecord(id: string): VersionedRecord {
  const now = new Date().toISOString();
  return { id, createdAt: now, updatedAt: now, revision: 1 };
}

async function verifyTransactionRollback(): Promise<RollbackResult> {
  const database = createIndexedDbDatabase();
  const suffix = crypto.randomUUID();
  const first = makeRecord(`rollback-first-${suffix}`);
  const second = makeRecord(`rollback-second-${suffix}`);
  let caught = false;

  try {
    await database.transaction(["metadata"], "readwrite", async (tx) => {
      await tx.put("metadata", first);
      await tx.put("metadata", second);
      throw new Error("intentional rollback probe");
    });
  } catch {
    caught = true;
  }

  const records = await database.getAll<VersionedRecord>("metadata");
  return {
    caught,
    firstExists: records.some((record) => record.id === first.id),
    secondExists: records.some((record) => record.id === second.id),
  };
}

export function isPreviewDiagnosticsAllowed(search: string, hostname: string): boolean {
  const localHost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  return localHost && new URLSearchParams(search).get("diagnostics") === "1";
}

export function installPreviewDiagnostics(search: string): () => void {
  if (!isPreviewDiagnosticsAllowed(search, window.location.hostname)) {
    return () => undefined;
  }

  window.__liftpathV5Diagnostics = {
    verifyTransactionRollback,
    verifyBackupRoundTrip,
  };

  return () => {
    delete window.__liftpathV5Diagnostics;
  };
}
