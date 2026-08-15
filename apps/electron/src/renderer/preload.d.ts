/**
 * Ambient type declarations for the Smart EDMS preload bridge (spec §7.1).
 *
 * The preload script exposes a frozen `window.smartEdms` object via
 * `contextBridge.exposeInMainWorld`. These declarations make the bridge
 * type-safe in the renderer without requiring the renderer to import the
 * preload module (which would defeat contextIsolation).
 *
 * The shape MUST match `SmartEdmsApi` exported from `src/main/preload.ts`.
 */

export interface SmartEdmsFilePickerFilter {
  readonly name: string;
  readonly extensions: readonly string[];
}

export interface SmartEdmsAppInfo {
  readonly version: string;
  readonly platform: NodeJS.Platform;
  readonly arch: string;
  readonly electronVersion: string;
  readonly chromeVersion: string;
  readonly nodeVersion: string;
  readonly isPackaged: boolean;
}

export interface SmartEdmsStoredCredentials {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: string;
  readonly tenantId: string;
  readonly userId: string;
}

export interface SmartEdmsBridge {
  /** Open a native file picker. Returns paths or null if cancelled. */
  openFilePicker(filters?: readonly SmartEdmsFilePickerFilter[]): Promise<string[] | null>;

  /** Subscribe to OS-level theme changes. Returns an unsubscribe function. */
  onNativeThemeChange(callback: (theme: 'light' | 'dark') => void): () => void;

  /** Return static information about the running application. */
  getAppInfo(): Promise<SmartEdmsAppInfo>;

  /** Persist credentials in OS-encrypted safeStorage. */
  saveCredentials(payload: SmartEdmsStoredCredentials): Promise<void>;

  /** Retrieve the stored credentials, or null if none are stored. */
  getCredentials(): Promise<SmartEdmsStoredCredentials | null>;

  /** Erase any stored credentials (logout). */
  clearCredentials(): Promise<void>;

  /** Push a theme preference to the main process so nativeTheme follows it. */
  setNativeTheme(preference: 'system' | 'light' | 'dark'): Promise<void>;
}

declare global {
  interface Window {
    smartEdms?: SmartEdmsBridge;
  }
}

export {};
