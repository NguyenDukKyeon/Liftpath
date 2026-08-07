import { useEffect, useState, type ReactNode } from "react";
import {
  loadStorageHealth as loadDefaultStorageHealth,
  type StorageHealth,
  type StorageHealthLoader,
} from "../application/backup/storage-health.js";
import { LiftPathV5Error } from "../domain/common/errors.js";
import { installPreviewDiagnostics } from "./preview-diagnostics.js";

interface V5PreviewAppProps {
  loadStorageHealth?: StorageHealthLoader;
  workoutMode?: ReactNode;
}

function storageFailure(error: unknown): StorageHealth {
  const detail = error instanceof LiftPathV5Error ? error.message : "Unknown storage failure";
  return { status: "error", message: detail };
}

export function V5PreviewApp({
  loadStorageHealth = loadDefaultStorageHealth,
  workoutMode,
}: V5PreviewAppProps = {}) {
  const [storageHealth, setStorageHealth] = useState<StorageHealth | null>(null);
  const [storageAttempt, setStorageAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setStorageHealth(null);

    void loadStorageHealth()
      .then((health) => {
        if (active) setStorageHealth(health);
      })
      .catch((error: unknown) => {
        if (active) setStorageHealth(storageFailure(error));
      });

    return () => {
      active = false;
    };
  }, [loadStorageHealth, storageAttempt]);

  useEffect(() => installPreviewDiagnostics(window.location.search), []);

  const databaseInfo = storageHealth?.status === "ready" ? storageHealth.databaseInfo : null;

  return (
    <main data-testid="v5-preview-root">
      <p>LIFTPATH 5 PREVIEW</p>
      <h1>Personal Coach foundation</h1>

      {storageHealth?.status === "error" && (
        <section role="alert" aria-live="assertive">
          <strong>Không thể lưu dữ liệu LiftPath 5</strong>
          <p>{storageHealth.message}</p>
          <button type="button" onClick={() => setStorageAttempt((attempt) => attempt + 1)}>
            Thử lại
          </button>
        </section>
      )}

      {databaseInfo && (
        <>
          <output
            data-testid="v5-db-info"
            data-db-name={databaseInfo.name}
            data-db-stores={databaseInfo.stores.join(",")}
          />
          {workoutMode}
        </>
      )}
    </main>
  );
}
