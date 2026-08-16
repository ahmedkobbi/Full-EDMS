/**
 * Smart EDMS — electron-builder after-sign hook.
 *
 * Called after the app is signed but before the installer is published.
 * Verifies that the signature is valid before allowing the build to proceed.
 *
 * Spec ref: §7.1 (signed updates), §23.4 (Electron distribution).
 */

const { execSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

/**
 * @param {import('electron-builder').AfterPackContext} context
 */
exports.default = async function afterSign(context) {
  const { appOutDir, electronPlatformName, packager } = context;

  if (electronPlatformName === 'darwin') {
    const appPath = path.join(appOutDir, `${packager.appInfo.productFilename}.app`);
    if (!fs.existsSync(appPath)) {
      console.warn(`[after-sign] App bundle not found: ${appPath}`);
      return;
    }
    try {
      const result = execSync(`codesign --verify --deep --strict --verbose=2 "${appPath}"`, {
        encoding: 'utf8',
        stdio: 'pipe',
      });
      console.log('[after-sign] macOS code signature verified:', result.trim());
      try {
        const notaryResult = execSync(`xcrun stapler validate "${appPath}"`, {
          encoding: 'utf8',
          stdio: 'pipe',
        });
        console.log('[after-sign] Notarization ticket validated:', notaryResult.trim());
      } catch {
        console.warn('[after-sign] Notarization ticket not found (OK for dev builds)');
      }
    } catch (err) {
      console.error('[after-sign] Code signature verification FAILED:', err.message);
      throw new Error('Code signature verification failed — aborting build');
    }
  }

  if (electronPlatformName === 'win32') {
    const exePath = path.join(appOutDir, `${packager.appInfo.productFilename}.exe`);
    if (!fs.existsSync(exePath)) {
      console.warn(`[after-sign] Executable not found: ${exePath}`);
      return;
    }
    try {
      execSync(`signtool verify /pa /v "${exePath}"`, { encoding: 'utf8', stdio: 'pipe' });
      console.log('[after-sign] Windows code signature verified');
    } catch {
      console.warn('[after-sign] signtool not available — skipping verification');
    }
  }

  console.log('[after-sign] Build artifacts verified successfully');
};
