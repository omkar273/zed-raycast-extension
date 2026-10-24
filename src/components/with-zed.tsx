import fs from "fs";
import { ComponentType, createContext, useContext } from "react";
import { Application, Detail } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getZedApp, getZedDbPath, getZedCliPath } from "../lib/zed";
import { getZedWorkspaceDbVersion, MIN_SUPPORTED_DB_VERSION } from "../lib/db";

interface ZedContextType {
  app: Application;
  workspaceDbVersion: number;
  dbPath: string;
  /** Path to Zed CLI executable, or null if not available (macOS only) */
  cliPath: string | null;
}

const ZedContext = createContext<ZedContextType | undefined>(undefined);

function useZed() {
  const dbPath = getZedDbPath();
  const cliPath = getZedCliPath();

  const { data, isLoading } = usePromise(async () => {
    const [app, versionInfo] = await Promise.all([getZedApp(), getZedWorkspaceDbVersion(dbPath)]);

    return {
      app,
      isDbSupported: versionInfo.supported,
      workspaceDbVersion: versionInfo.version,
    };
  });

  return {
    isLoading,
    app: data?.app,
    isDbSupported: !!data?.isDbSupported,
    workspaceDbVersion: data?.workspaceDbVersion || 0,
    dbPath,
    cliPath,
  };
}

export const withZed = <P extends object>(Component: ComponentType<P>) => {
  return (props: P) => {
    const { app, isDbSupported, workspaceDbVersion, dbPath, cliPath, isLoading } = useZed();

    if (!app) {
      return <Detail isLoading={isLoading} markdown={isLoading ? "" : `No Caygnus app detected`} />;
    }

    if (!dbPath || !fs.existsSync(dbPath)) {
      return <Detail markdown="Caygnus Workspaces Database file not found" />;
    }

    if (!isDbSupported) {
      return (
        <Detail
          markdown={`## Unsupported Caygnus Version

Your Caygnus database schema version (${workspaceDbVersion}) is not supported.

This extension requires Caygnus with database schema version **${MIN_SUPPORTED_DB_VERSION}** or higher.

Please update Caygnus to the latest version.`}
        />
      );
    }

    return (
      <ZedContext.Provider
        value={{
          app,
          workspaceDbVersion,
          dbPath,
          cliPath,
        }}
      >
        <Component {...props} />
      </ZedContext.Provider>
    );
  };
};

export function useZedContext() {
  const context = useContext(ZedContext);

  if (!context) {
    throw new Error("useZedContext must be used within a ZedContext.Provider");
  }

  return context;
}
