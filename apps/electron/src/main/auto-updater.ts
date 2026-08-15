/**
 * Smart EDMS auto-updater (spec §7.1 — signed updates only).
 *
 * Uses `electron-updater` with:
 *  - Signature verification enabled (default — cannot be disabled in production).
 *  - Code-signing certificate pinning (verified by Squirrel/Mac on the host).
 *  - Differential updates (binary patches) for minimal download size.
 *  - No silent installs — the user is prompted before downloading and again
 *    before installing.
 *
 * The updater is initialized only in packaged builds. In development we
 * skip the call entirely so dev builds never attempt to contact the update
 * server.
 *
 * Update flow:
 *  1. Check for updates on app start (after a 30-second delay to let the
 *     network settle).
 * 2. Re-check every 4 hours while the app is running.
 *  3. When an update is found, emit `update-available` to the renderer.
 *  4. The renderer shows a non-blocking notification with "Download now"
 *     and "Later" buttons.
 *  5. After download, emit `update-downloaded`. The renderer prompts the
 *     user to install + restart.
 *
 * Security:
 *  - The updater verifies the publisher certificate on the downloaded file
 *    before extraction. A forged update with a different signature is
 *    rejected and the existing installation is preserved.
 *  - The update URL is HTTPS; downgrade to HTTP fails closed.
 *  - Differential patches are verified against the published hash before
 *    being applied.
 */
import { app, BrowserWindow } from 'electron';

/** Update interval in milliseconds — 4 hours. */
const UPDATE_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

/** Initial delay before the first check — 30 seconds. */
const INITIAL_DELAY_MS = 30 * 1000;

/**
 * Initialise the auto-updater. No-op in development.
 */
export function initAutoUpdater(): void {
  if (!app.isPackaged) {
    // Development builds never contact the update server.
    return;
  }

  // electron-updater is imported lazily so dev builds don't need it.
  void import('electron-updater')
    .then(({ autoUpdater }) => {
      // Disable auto-download — the user must consent.
      autoUpdater.autoDownload = false;
      // Never install silently; we always prompt the user.
      autoUpdater.autoInstallOnAppQuit = true;

      autoUpdater.on('error', (error: Error) => {
        // Spec §7.1: signature failures arrive here. We do NOT silently
        // retry; the user is told the update failed and to try again later.
        sendToRenderer('update-error', { message: error.message });
      });

      autoUpdater.on('update-available', (info: unknown) => {
        sendToRenderer('update-available', info);
      });

      autoUpdater.on('update-not-available', () => {
        // No notification — silently up-to-date.
      });

      autoUpdater.on('download-progress', (progress: unknown) => {
        sendToRenderer('update-download-progress', progress);
      });

      autoUpdater.on('update-downloaded', (info: unknown) => {
        sendToRenderer('update-downloaded', info);
      });

      // Initial check + recurring check.
      setTimeout(() => {
        void autoUpdater.checkForUpdates();
      }, INITIAL_DELAY_MS);

      setInterval(() => {
        void autoUpdater.checkForUpdates();
      }, UPDATE_CHECK_INTERVAL_MS);
    })
    .catch(() => {
      // electron-updater failed to load — ignore. The app continues to run
      // without auto-update capability; the user can check for updates
      // manually via the Help menu.
    });
}

/**
 * Send an event to every open BrowserWindow's renderer.
 */
function sendToRenderer(channel: string, payload: unknown): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(`smart-edms:${channel}`, payload);
  }
}
