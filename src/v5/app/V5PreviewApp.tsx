import { useEffect, useState } from "react";
import { openLiftPathV5Db } from "../infrastructure/db/open-db.js";

interface DatabaseInfo {
  name: string;
  stores: string[];
}

export function V5PreviewApp() {
  const [databaseInfo, setDatabaseInfo] = useState<DatabaseInfo | null>(null);

  useEffect(() => {
    let active = true;

    void openLiftPathV5Db().then((db) => {
      if (active) {
        setDatabaseInfo({ name: db.name, stores: [...db.objectStoreNames] });
      }
      db.close();
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main data-testid="v5-preview-root">
      <p>LIFTPATH 5 PREVIEW</p>
      <h1>Personal Coach foundation</h1>
      {databaseInfo && (
        <output
          data-testid="v5-db-info"
          data-db-name={databaseInfo.name}
          data-db-stores={databaseInfo.stores.join(",")}
        />
      )}
    </main>
  );
}
