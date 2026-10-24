import fs from "fs";
import { getApplications, getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { homedir } from "os";
import { execWithCleanEnv, isMac, isWindows } from "./utils";
import { zedBuild } from "./preferences";

export type ZedBuild = Preferences["build"];
export type ZedBundleId = "com.caygnus.Caygnus";

const ZedBundleIdBuildMapping: Record<ZedBuild, { macos: ZedBundleId; windows: { name: string } }> = {
  Caygnus: { macos: "com.caygnus.Caygnus", windows: { name: "Caygnus" } },
};

// Caygnus is built from Zed's dev channel and keeps Zed's data folder.
const ZedDbNameMapping: Record<ZedBuild, string> = {
  Caygnus: "0-dev",
};

/**
 * The CLI inside the app bundle comes first: Caygnus's "install cli" links
 * /usr/local/bin/zed, which may belong to a stock Zed install instead.
 */
const ZedCliPaths: Record<ZedBuild, string> = {
  Caygnus: "/Applications/Caygnus.app/Contents/MacOS/cli",
};

/**
 * Fallback for the CLI installed with "zed: install cli".
 */
const ZedAppCliPaths: Record<ZedBuild, string> = {
  Caygnus: "/usr/local/bin/zed",
};

export function getZedBundleId(build: ZedBuild): ZedBundleId {
  return ZedBundleIdBuildMapping[build].macos;
}

export function getZedWindowsMetadata(build: ZedBuild): { name: string } {
  return ZedBundleIdBuildMapping[build].windows;
}

export function getZedDbName(build: ZedBuild): string {
  return ZedDbNameMapping[build];
}

export function getZedDbPath() {
  const preferences = getPreferenceValues<Preferences>();
  const zedBuild = preferences.build;
  if (isMac) {
    return `${homedir()}/Library/Application Support/Zed/db/${getZedDbName(zedBuild)}/db.sqlite`;
  } else {
    return `${homedir()}\\AppData\\Local\\Zed\\db\\${getZedDbName(zedBuild)}\\db.sqlite`;
  }
}

export async function getZedApp() {
  const applications = await getApplications();
  const zedBundleId = getZedBundleId(zedBuild);
  const windowsMetadata = getZedWindowsMetadata(zedBuild);

  const app = applications.find((a) => {
    if (isMac) {
      return a.bundleId === zedBundleId;
    }
    if (isWindows) {
      return a.name === windowsMetadata.name;
    }
  });

  return app;
}

/**
 * Get the path to the Zed CLI executable.
 * First checks for the installed CLI (via "zed: install cli"), then falls back to the app bundle CLI.
 * Returns null on Windows or if no CLI is found.
 */
export function getZedCliPath(build: ZedBuild = zedBuild): string | null {
  if (!isMac) {
    return null;
  }

  // Check for installed CLI first
  const installedCliPath = ZedCliPaths[build];
  if (fs.existsSync(installedCliPath)) {
    return installedCliPath;
  }

  // Fall back to CLI inside app bundle
  const appCliPath = ZedAppCliPaths[build];
  if (fs.existsSync(appCliPath)) {
    return appCliPath;
  }

  return null;
}

const ZedProcessNameMapping: Record<ZedBundleId, string> = {
  "com.caygnus.Caygnus": "Caygnus",
};

export async function closeZedWindow(windowTitle: string, bundleId: ZedBundleId): Promise<boolean> {
  const processName = ZedProcessNameMapping[bundleId];
  const escapedTitle = windowTitle.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  const script = `
tell application "System Events"
  tell process "${processName}"
    repeat with w in (every window)
      if name of w contains "${escapedTitle}" then
        click (first button of w whose description is "close button")
        return "true"
      end if
    end repeat
    return "false"
  end tell
end tell
`;

  try {
    const result = await runAppleScript(script);
    return result === "true";
  } catch (error) {
    console.error("Failed to close Caygnus window:", error);
    return false;
  }
}

/**
 * Open a workspace with multiple paths using the Zed CLI.
 * This is required for multi-folder workspaces since the URI scheme only supports a single path.
 *
 * Uses a clean environment to prevent Raycast's environment variables from
 * being inherited by Zed terminals.
 *
 * @param cliPath - Path to the Zed CLI executable
 * @param paths - Array of paths to open (supports multiple folders)
 * @param newWindow - Whether to open in a new window (default: false)
 * @returns Promise that resolves when the command completes
 */
export async function openWithZedCli(cliPath: string, paths: string[], newWindow = false): Promise<void> {
  const args = newWindow ? ["-n", ...paths] : paths;

  try {
    await execWithCleanEnv(cliPath, args);
  } catch (error) {
    console.error("Failed to open with Caygnus CLI:", error);
    throw error;
  }
}
