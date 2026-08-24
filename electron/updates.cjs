'use strict';

const { app, ipcMain, shell } = require('electron');
const { autoUpdater } = require('electron-updater');

const RELEASES_URL = 'https://github.com/Alexiswastaken/blackjack-odds/releases/latest';

/**
 * Mise à jour depuis les releases GitHub.
 *
 * Deux limites structurelles, gérées explicitement plutôt que subies :
 *
 * 1. macOS refuse d'installer une mise à jour sur une app non signée
 *    (Squirrel.Mac exige une signature Developer ID). La *vérification* marche,
 *    l'installation non — on renvoie donc l'utilisateur vers la page des
 *    releases plutôt que d'échouer silencieusement au redémarrage.
 * 2. Un dépôt GitHub privé n'est pas lisible sans jeton. Comme embarquer un
 *    jeton dans l'app est exclu, la vérification renvoie alors une erreur
 *    explicite plutôt qu'un « à jour » mensonger.
 */
const CAN_AUTO_INSTALL = process.platform !== 'darwin';

/**
 * Les erreurs d'`electron-updater` embarquent la trace complète et tous les
 * en-têtes HTTP — plusieurs dizaines de lignes, illisibles dans un panneau de
 * réglages. On ne garde que la première ligne, qui porte la cause réelle.
 */
function briefError(error) {
  const raw = error instanceof Error ? error.message : String(error);
  const firstLine = raw.split('\n')[0].trim();
  return firstLine.length > 200 ? `${firstLine.slice(0, 197)}…` : firstLine;
}

function registerUpdateHandlers(getWindow) {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on('download-progress', (progress) => {
    const window = getWindow();
    if (window && !window.isDestroyed()) {
      window.webContents.send('update:progress', progress.percent / 100);
    }
  });

  ipcMain.handle('app:version', () => app.getVersion());

  ipcMain.handle('update:check', async () => {
    // En développement, il n'y a pas d'app packagée à mettre à jour.
    if (!app.isPackaged) {
      return { status: 'unsupported', canAutoInstall: CAN_AUTO_INSTALL };
    }

    try {
      const result = await autoUpdater.checkForUpdates();
      const latest = result?.updateInfo?.version;

      if (!latest || latest === app.getVersion()) {
        return { status: 'up-to-date', version: app.getVersion(), canAutoInstall: CAN_AUTO_INSTALL };
      }
      return { status: 'available', version: latest, canAutoInstall: CAN_AUTO_INSTALL };
    } catch (error) {
      return { status: 'error', message: briefError(error), canAutoInstall: CAN_AUTO_INSTALL };
    }
  });

  ipcMain.handle('update:download', async () => {
    if (!CAN_AUTO_INSTALL) {
      return { status: 'manual', url: RELEASES_URL };
    }
    try {
      await autoUpdater.downloadUpdate();
      return { status: 'ready' };
    } catch (error) {
      return { status: 'error', message: briefError(error) };
    }
  });

  ipcMain.handle('update:install', () => {
    if (!CAN_AUTO_INSTALL) {
      void shell.openExternal(RELEASES_URL);
      return { status: 'manual' };
    }
    // `quitAndInstall` doit être le dernier appel : il ferme l'application.
    setImmediate(() => autoUpdater.quitAndInstall());
    return { status: 'installing' };
  });

  ipcMain.handle('update:open-releases', () => {
    void shell.openExternal(RELEASES_URL);
    return { status: 'opened' };
  });
}

module.exports = { registerUpdateHandlers, RELEASES_URL };
