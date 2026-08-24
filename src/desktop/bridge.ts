/** Contrat du pont exposé par `electron/preload.cjs`. Absent sur le web. */

export interface UpdateCheckResult {
  status: 'available' | 'up-to-date' | 'error' | 'unsupported';
  version?: string;
  message?: string;
  canAutoInstall: boolean;
}

export interface UpdateDownloadResult {
  status: 'ready' | 'manual' | 'error';
  message?: string;
  url?: string;
}

export interface DesktopBridge {
  platform: string;
  getVersion: () => Promise<string>;
  checkForUpdate: () => Promise<UpdateCheckResult>;
  downloadUpdate: () => Promise<UpdateDownloadResult>;
  installUpdate: () => Promise<{ status: string }>;
  openReleases: () => Promise<{ status: string }>;
  onDownloadProgress: (callback: (percent: number) => void) => () => void;
}

declare global {
  interface Window {
    desktop?: DesktopBridge;
  }
}

export function getDesktop(): DesktopBridge | null {
  return typeof window !== 'undefined' && window.desktop ? window.desktop : null;
}

export const isDesktop = (): boolean => getDesktop() !== null;
