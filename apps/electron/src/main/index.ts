/**
 * Smart EDMS Electron main process entry (spec §4.1, §7.1).
 *
 * Security defaults enforced here:
 *  - contextIsolation: true
 *  - nodeIntegration: false
 *  - sandbox: true
 *  - webSecurity: true
 *  - allowRunningInsecureContent: false
 *  - No `remote` module (removed since Electron 14)
 *  - No `eval` (CSP forbids 'unsafe-eval')
 *  - Strict CSP injected via response headers
 *  - Navigation restricted to the renderer origin
 *  - New-window creation blocked (only one BrowserWindow)
 *  - Preload script exposes a minimal typed API via contextBridge
 *
 * The main process NEVER imports or evaluates renderer code. It only manages
 * windows, IPC, native theme sync, file dialogs, and the auto-updater.
 */
import { app, BrowserWindow, nativeTheme, session, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerIpcHandlers } from './ipc.js';
import { buildApplicationMenu } from './menu.js';
import { initAutoUpdater } from './auto-updater.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Allowed renderer origins. In production this is the bundled file:// URL. */
const ALLOWED_ORIGINS = new Set<string>([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

/** Strict CSP enforced at the network layer (spec §7.1). */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' ws://localhost:4000 http://localhost:4000 https://updates.smart-edms.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

/**
 * Create the single Smart EDMS BrowserWindow. The window is created once at
 * app ready and re-created only if the user explicitly closes it.
 */
function createWindow(): BrowserWindow {
  const preloadPath = path.join(__dirname, 'preload.js');

  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    backgroundColor: '#0b0d12',
    title: 'Smart EDMS',
    icon: path.join(__dirname, '../../resources/icon.png'),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      // SECURITY (spec §7.1): all four must be set as below.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      // No `remote` module — removed since Electron 14; we never enable it.
      // No `experimentalFeatures`.
      preload: preloadPath,
      spellcheck: false,
      // Disable the renderer's ability to navigate away from the app.
      navigateOnDragDrop: false,
    },
  });

  // Spec §7.1: Block all new-window creation. The renderer cannot use
  // window.open() to spawn a process or escape the sandbox.
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // Spec §7.1: Restrict navigation. Only allow internal `file://` URLs in
  // production and `http(s)://localhost:*` in dev.
  window.webContents.on('will-navigate', (event, url) => {
    const parsed = new URL(url);
    const isFile = parsed.protocol === 'file:';
    const isAllowedDev = ALLOWED_ORIGINS.has(`${parsed.protocol}//${parsed.host}`);
    if (!isFile && !isAllowedDev) {
      event.preventDefault();
    }
  });

  // External links must go to the user's default browser, not a new Electron
  // window.
  window.webContents.on('will-redirect', (event, url) => {
    const parsed = new URL(url);
    const isAllowed = ALLOWED_ORIGINS.has(`${parsed.protocol}//${parsed.host}`);
    if (!isAllowed && parsed.protocol !== 'file:') {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  window.once('ready-to-show', () => {
    window.show();
  });

  // Load the renderer. In dev this is the Vite dev server; in production
  // it's the bundled index.html inside the ASAR archive.
  if (process.env.NODE_ENV === 'development' && !app.isPackaged) {
    void window.loadURL('http://localhost:5173');
    window.webContents.openDevTools({ mode: 'detach' });
  } else {
    void window.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  return window;
}

/**
 * Install the strict CSP on the default session. Done before any window is
 * created so the policy is in force for the very first renderer request.
 */
function installContentSecurityPolicy(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [CONTENT_SECURITY_POLICY],
        'X-Content-Type-Options': ['nosniff'],
        'X-Frame-Options': ['DENY'],
        'Referrer-Policy': ['no-referrer'],
        'Strict-Transport-Security': [
          'max-age=31536000; includeSubDomains; preload',
        ],
      },
    });
  });
}

/**
 * Apply the OS-level native theme preference. The renderer mirrors this
 * setting via the `smart-edms:native-theme-changed` IPC event.
 */
function applyNativeTheme(preference: 'system' | 'light' | 'dark'): void {
  nativeTheme.themeSource = preference;
}

app.whenReady().then(() => {
  installContentSecurityPolicy();
  registerIpcHandlers();
  buildApplicationMenu();
  initAutoUpdater();

  // Initial native-theme preference: respect the OS by default.
  applyNativeTheme('system');

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// macOS: keep running without a window so the user can re-activate.
// All other platforms: quit when all windows are closed.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: prevent the renderer from being able to spawn insecure web
// preferences. This is belt-and-braces — we already set them at window
// creation, but Electron emits this event for any future web view.
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-attach-webview', (event, webPreferences) => {
    // Strip any potentially insecure preferences.
    delete (webPreferences as { preload?: string }).preload;
    (webPreferences as { nodeIntegration?: boolean }).nodeIntegration = false;
    event.preventDefault();
  });
});

// Expose the applyNativeTheme function for the IPC module.
export { applyNativeTheme };
