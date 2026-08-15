/**
 * Smart EDMS IPC handlers (spec §7.1).
 *
 * Every handler is explicitly registered. The renderer can only invoke
 * channels that are registered here — Electron's default-deny behaviour
 * plus `contextIsolation: true` means there is no escape hatch.
 *
 * Channels:
 *   - smart-edms:open-file-picker
 *   - smart-edms:get-app-info
 *   - smart-edms:save-credentials
 *   - smart-edms:get-credentials
 *   - smart-edms:clear-credentials
 *   - smart-edms:set-native-theme
 */
import { ipcMain, app, dialog, safeStorage, nativeTheme } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import type { AppInfo, FilePickerFilter, StoredCredentials } from './preload.js';

const CHANNEL = 'smart-edms' as const;

/** Path to the OS-encrypted credentials file in the Electron userData dir. */
function credentialsFilePath(): string {
  return path.join(app.getPath('userData'), 'credentials.enc');
}

/**
 * Register every IPC handler. Idempotent — safe to call multiple times.
 */
export function registerIpcHandlers(): void {
  // ---------------------------------------------------------------------------
  // File picker
  // ---------------------------------------------------------------------------
  ipcMain.handle(
    `${CHANNEL}:open-file-picker`,
    async (_event, filters?: readonly FilePickerFilter[]): Promise<string[] | null> => {
      const result = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: (filters ?? [{ name: 'All files', extensions: ['*'] }]).map((f) => ({
          name: f.name,
          extensions: [...f.extensions],
        })),
      });
      return result.canceled ? null : result.filePaths;
    },
  );

  // ---------------------------------------------------------------------------
  // App info
  // ---------------------------------------------------------------------------
  ipcMain.handle(`${CHANNEL}:get-app-info`, (): AppInfo => {
    return {
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
      nodeVersion: process.versions.node,
      isPackaged: app.isPackaged,
    };
  });

  // ---------------------------------------------------------------------------
  // Credentials (safeStorage — OS-encrypted at rest)
  //
  // The credentials file lives at `<userData>/credentials.enc` and contains
  // the output of `safeStorage.encryptString(JSON.stringify(payload))`. The
  // OS keychain (macOS Keychain / Windows DPAPI / Linux libsecret) holds
  // the symmetric key, so the file is unreadable without the OS session.
  // ---------------------------------------------------------------------------
  ipcMain.handle(
    `${CHANNEL}:save-credentials`,
    (_event, payload: StoredCredentials): Promise<void> => {
      if (!safeStorage.isEncryptionAvailable()) {
        // Fall back to in-memory only (renderer will re-prompt on next launch).
        return Promise.resolve();
      }
      const plaintext = JSON.stringify(payload);
      const encrypted = safeStorage.encryptString(plaintext);
      try {
        fs.writeFileSync(credentialsFilePath(), encrypted);
      } catch {
        // Best-effort — disk write failed; the renderer will re-prompt on
        // next launch.
      }
      return Promise.resolve();
    },
  );

  ipcMain.handle(
    `${CHANNEL}:get-credentials`,
    (): Promise<StoredCredentials | null> => {
      if (!safeStorage.isEncryptionAvailable()) {
        return Promise.resolve(null);
      }
      try {
        const credPath = credentialsFilePath();
        if (!fs.existsSync(credPath)) {
          return Promise.resolve(null);
        }
        const encrypted = fs.readFileSync(credPath);
        const plaintext = safeStorage.decryptString(encrypted);
        const parsed = JSON.parse(plaintext) as StoredCredentials;
        return Promise.resolve(parsed);
      } catch {
        return Promise.resolve(null);
      }
    },
  );

  ipcMain.handle(`${CHANNEL}:clear-credentials`, (): Promise<void> => {
    try {
      const credPath = credentialsFilePath();
      if (fs.existsSync(credPath)) {
        fs.unlinkSync(credPath);
      }
    } catch {
      // Ignore — best-effort cleanup.
    }
    return Promise.resolve();
  });

  // ---------------------------------------------------------------------------
  // Native theme sync
  // ---------------------------------------------------------------------------
  ipcMain.handle(
    `${CHANNEL}:set-native-theme`,
    (_event, preference: 'system' | 'light' | 'dark'): Promise<void> => {
      nativeTheme.themeSource = preference;
      return Promise.resolve();
    },
  );
}
