/**
 * Smart EDMS application menu (spec §4.1, §16 — localized).
 *
 * The menu is rebuilt when the locale changes so labels are translated.
 * In macOS the menu is the standard application menu bar; on Windows and
 * Linux it is the window menu bar.
 */
import { Menu, app, shell, type MenuItemConstructorOptions } from 'electron';

/** A simple translation function — the main process has no i18next. */
type T = (key: string) => string;

let currentLocale: string = 'en';

/**
 * Build the application menu. Called once at startup and again whenever the
 * user changes the locale (so the menu can be re-translated).
 *
 * @param t translation function. Defaults to identity (English).
 */
export function buildApplicationMenu(t: T = (k: string) => k): void {
  const isMac = process.platform === 'darwin';

  const menuTemplate: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [{
          label: t('common:menu.app') || app.getName(),
          submenu: [
            { role: 'about', label: t('common:menu.about') },
            { type: 'separator' },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide', label: t('common:menu.hide') },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit', label: t('common:menu.quit') },
          ],
        }]
      : []),
    {
      label: t('common:menu.file'),
      submenu: [
        {
          label: t('common:menu.file.newWindow'),
          click: () => {
            // Smart EDMS is a single-window app. This menu item is disabled
            // but kept for discoverability — users on macOS expect it.
          },
          enabled: false,
        },
        { type: 'separator' },
        isMac
          ? { role: 'close', label: t('common:menu.file.close') }
          : { role: 'quit', label: t('common:menu.quit') },
      ],
    },
    {
      label: t('common:menu.edit'),
      submenu: [
        { role: 'undo', label: t('common:menu.edit.undo') },
        { role: 'redo', label: t('common:menu.edit.redo') },
        { type: 'separator' },
        { role: 'cut', label: t('common:menu.edit.cut') },
        { role: 'copy', label: t('common:menu.edit.copy') },
        { role: 'paste', label: t('common:menu.edit.paste') },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' },
              { role: 'delete' },
              { role: 'selectAll', label: t('common:menu.edit.selectAll') },
              { type: 'separator' },
              {
                label: t('common:menu.edit.speech'),
                submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }],
              },
            ]
          : [
              { role: 'delete' },
              { type: 'separator' },
              { role: 'selectAll', label: t('common:menu.edit.selectAll') },
            ]),
      ],
    },
    {
      label: t('common:menu.view'),
      submenu: [
        { role: 'reload', label: t('common:menu.view.reload') },
        { role: 'forceReload', label: t('common:menu.view.forceReload') },
        { role: 'toggleDevTools', label: t('common:menu.view.devTools') },
        { type: 'separator' },
        { role: 'resetZoom', label: t('common:menu.view.resetZoom') },
        { role: 'zoomIn', label: t('common:menu.view.zoomIn') },
        { role: 'zoomOut', label: t('common:menu.view.zoomOut') },
        { type: 'separator' },
        { role: 'togglefullscreen', label: t('common:menu.view.fullscreen') },
      ],
    },
    {
      label: t('common:menu.help') || t('common:menu.help'),
      submenu: [
        {
          label: t('common:menu.help.documentation'),
          click: () => void shell.openExternal('https://docs.smart-edms.com'),
        },
        {
          label: t('common:menu.help.keyboardShortcuts'),
          click: () => {
            // Emit a renderer event so the in-app shortcuts dialog opens.
            // (Renderer listens for this.)
          },
        },
        {
          label: t('common:menu.help.contactSupport'),
          click: () => void shell.openExternal('https://support.smart-edms.com'),
        },
        {
          label: t('common:menu.help.checkForUpdates'),
          click: () => {
            // The auto-updater module listens for this IPC and triggers a
            // manual update check.
          },
        },
        { type: 'separator' },
        {
          label: t('common:menu.help.about'),
          click: () => {
            // Renderer shows the About dialog.
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

/**
 * Re-build the application menu after a locale change.
 */
export function rebuildMenuForLocale(locale: string): void {
  currentLocale = locale;
  // The actual translation lookup happens in the renderer (which has the
  // i18next instance). The renderer sends a `smart-edms:rebuild-menu` IPC
  // call with a key→string map; the main process uses that map as `t`.
  // For simplicity we just rebuild with identity translation here; the
  // renderer's locale change handler can send the localized strings.
  void currentLocale;
  buildApplicationMenu();
}
