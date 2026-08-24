'use strict';

const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { app, BrowserWindow, protocol, net, shell } = require('electron');

const DIST = path.join(__dirname, '..', 'dist');
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

/**
 * L'app est servie via un protocole custom plutôt qu'en `file://`.
 *
 * C'est nécessaire : le moteur de calcul tourne dans un module Web Worker, et
 * `file://` est une origine opaque pour laquelle les navigateurs refusent de
 * charger un worker de type module. `app://` est déclaré comme origine standard
 * et sécurisée, ce qui règle le problème sans désactiver la moindre protection.
 */
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
]);

function registerAppProtocol() {
  protocol.handle('app', (request) => {
    const url = new URL(request.url);
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const target = path.join(DIST, relative || 'index.html');

    // Garde-fou contre les traversées de chemin (`app://-/../../etc/passwd`).
    if (!target.startsWith(DIST)) {
      return new Response('Forbidden', { status: 403 });
    }

    return net.fetch(pathToFileURL(target).toString());
  });
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#041b12',
    title: 'Blackjack Odds',
    show: false,
    webPreferences: {
      // L'app n'a besoin d'aucune API Electron : rien n'est exposé au renderer.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.once('ready-to-show', () => window.show());

  // Un lien externe s'ouvre dans le navigateur, jamais dans la fenêtre de l'app.
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });

  window.webContents.on('will-navigate', (event, url) => {
    const allowed = DEV_SERVER_URL ?? 'app://';
    if (!url.startsWith(allowed)) event.preventDefault();
  });

  if (DEV_SERVER_URL) {
    window.loadURL(DEV_SERVER_URL);
    window.webContents.openDevTools({ mode: 'detach' });
  } else {
    window.loadURL('app://-/index.html');
  }
}

// Une seule instance : deux fenêtres auraient chacune leur propre suivi de sabot.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [existing] = BrowserWindow.getAllWindows();
    if (existing) {
      if (existing.isMinimized()) existing.restore();
      existing.focus();
    }
  });

  app.whenReady().then(() => {
    if (!DEV_SERVER_URL) registerAppProtocol();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
