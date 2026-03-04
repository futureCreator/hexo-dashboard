import fs from "fs";
import path from "path";
import os from "os";

const CONFIG_PATH = path.join(os.homedir(), ".hexo-dashboard-config.json");

export interface Settings {
  hexoPath: string;
  gaPropertyId?: string;
  gaServiceAccountPath?: string;
}

export function loadSettings(): Settings {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      return { hexoPath: "" };
    }
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    return JSON.parse(raw) as Settings;
  } catch {
    return { hexoPath: "" };
  }
}

export function saveSettings(settings: Settings): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(settings, null, 2), "utf-8");
}
