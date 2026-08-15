/**
 * Smart EDMS preload script (spec §7.1).
 *
 * Exposes a MINIMAL typed API to the renderer via contextBridge. The renderer
 * cannot reach Node primitives, `require`, `process`, or any Electron module
 * other than what is explicitly listed below.
 *
 * Exposed surface:
 *   - window.smartEdms.openFilePicker(filters) → string[] | null
 *   - window.smartEdms.onNativeThemeChange(cb)  → unsubscribe()
 *   - window.smartEdms.getAppInfo()              → AppInfo
 *   - window.smartEdms.saveCredentials(payload)  → void
 *   - window.smartEdms.getCredentials()           → StoredCredentials | null
 *   - window.smartEdms.clearCredentials()         → void
 *   - window.smartEdms.setNativeTheme(pref)       → void
 *
 * Credentials (refresh token) are stored using Electron `safeStorage`, which
 * delegates to the OS keychain (macOS Keychain, Windows DPAPI, Linux
 * libsecret). They are encrypted at rest, so a stolen disk does not yield a
 * usable token.
 */
import { contextBridge, ipcRenderer, nativeTheme } from 'electron';

/** Information about the running Electron application. */
export interface AppInfo {
  readonly version: string;
  readonly platform: NodeJS.Platform;
  readonly arch: string;
  readonly electronVersion: string;
  readonly chromeVersion: string;
  readonly nodeVersion: string;
  readonly isPackaged: boolean;
}

/** Filters passed to the file picker. */
export interface FilePickerFilter {
  readonly name: string;
  readonly extensions: readonly string[];
}

/** Credentials persisted in OS-encrypted safeStorage. */
export interface StoredCredentials {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: string;
  readonly tenantId: string;
  readonly userId: string;
}

const CHANNEL = 'smart-edms' as const;

// Wire the renderer-side API to the IPC handlers registered in `ipc.ts`.
const api = {
  /**
   * Open a native file picker. Returns an array of file paths the user
   * selected, or null if the user cancelled. The renderer never receives
   * a Node `Buffer` or file handle — only string paths it can pass to
   * `fetch()` for upload.
   */
  openFilePicker: (filters?: readonly FilePickerFilter[]): Promise<string[] | null> =>
    ipcRenderer.invoke(`${CHANNEL}:open-file-picker`, filters),

  /**
   * Subscribe to OS-level theme changes (light/dark). Returns an
   * unsubscribe function. The renderer uses this to keep its UI in sync
   * with the OS preference when the user has chosen `system` theme.
   */
  onNativeThemeChange: (
    callback: (theme: 'light' | 'dark') => void,
  ): (() => void) => {
    const listener = (): void => {
      callback(nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
    };
    nativeTheme.on('updated', listener);
    return () => {
      nativeTheme.off('updated', listener);
    };
  },

  /** Return static information about the running application. */
  getAppInfo: (): Promise<AppInfo> => ipcRenderer.invoke(`${CHANNEL}:get-app-info`),

  /**
   * Persist credentials in OS-encrypted safeStorage. Replaces any previously
   * stored credentials atomically.
   */
  saveCredentials: (payload: StoredCredentials): Promise<void> =>
    ipcRenderer.invoke(`${CHANNEL}:save-credentials`, payload),

  /** Retrieve the stored credentials, or null if none are stored. */
  getCredentials: (): Promise<StoredCredentials | null> =>
    ipcRenderer.invoke(`${CHANNEL}:get-credentials`),

  /** Erase any stored credentials (logout). */
  clearCredentials: (): Promise<void> => ipcRenderer.invoke(`${CHANNEL}:clear-credentials`),

  /**
   * Push a theme preference (system/light/dark) to the main process so it
   * can update `nativeTheme.themeSource` (which in turn drives the OS-level
   * title bar colour, scrollbars, etc.).
   */
  setNativeTheme: (preference: 'system' | 'light' | 'dark'): Promise<void> =>
    ipcRenderer.invoke(`${CHANNEL}:set-native-theme`, preference),
} as const;

// contextBridge.exposeInMainWorld freezes the exposed object, so the renderer
// cannot tamper with it. Combined with contextIsolation: true and sandbox: true,
// this is the only path the renderer has to the outside world.
contextBridge.exposeInMainWorld('smartEdms', api);

// Export the type so the renderer can import it for `window.smartEdms` typing.
export type SmartEdmsApi = typeof api;
