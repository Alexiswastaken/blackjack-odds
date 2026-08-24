'use strict';

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Pont renderer ↔ main.
 *
 * Rien d'autre que ces quelques fonctions n'est exposé : le renderer n'a aucun
 * accès à Node, et `contextIsolation` reste actif.
 */
contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  getVersion: () => ipcRenderer.invoke('app:version'),
  checkForUpdate: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  openReleases: () => ipcRenderer.invoke('update:open-releases'),
  onDownloadProgress: (callback) => {
    const listener = (_event, percent) => callback(percent);
    ipcRenderer.on('update:progress', listener);
    return () => ipcRenderer.removeListener('update:progress', listener);
  },
});
