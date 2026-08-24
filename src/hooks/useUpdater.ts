import { useCallback, useEffect, useState } from 'react';
import { getDesktop } from '../desktop/bridge';

export type UpdateStage =
  | 'idle'
  | 'checking'
  | 'up-to-date'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'manual'
  | 'unsupported'
  | 'error';

export interface UpdaterState {
  stage: UpdateStage;
  version: string | null;
  appVersion: string | null;
  message: string | null;
  progress: number;
  canAutoInstall: boolean;
}

/** Pilote la vérification / le téléchargement / l'installation d'une mise à jour. */
export function useUpdater() {
  const desktop = getDesktop();

  const [state, setState] = useState<UpdaterState>({
    stage: 'idle',
    version: null,
    appVersion: null,
    message: null,
    progress: 0,
    canAutoInstall: false,
  });

  useEffect(() => {
    if (!desktop) return;
    let cancelled = false;

    void desktop.getVersion().then((appVersion) => {
      if (!cancelled) setState((previous) => ({ ...previous, appVersion }));
    });

    const unsubscribe = desktop.onDownloadProgress((progress) => {
      setState((previous) => ({ ...previous, stage: 'downloading', progress }));
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [desktop]);

  const check = useCallback(async () => {
    if (!desktop) return;
    setState((previous) => ({ ...previous, stage: 'checking', message: null }));

    const result = await desktop.checkForUpdate();
    setState((previous) => ({
      ...previous,
      stage:
        result.status === 'available'
          ? 'available'
          : result.status === 'up-to-date'
            ? 'up-to-date'
            : result.status === 'unsupported'
              ? 'unsupported'
              : 'error',
      version: result.version ?? null,
      message: result.message ?? null,
      canAutoInstall: result.canAutoInstall,
    }));
  }, [desktop]);

  const download = useCallback(async () => {
    if (!desktop) return;
    setState((previous) => ({ ...previous, stage: 'downloading', progress: 0 }));

    const result = await desktop.downloadUpdate();
    setState((previous) => ({
      ...previous,
      stage: result.status === 'ready' ? 'ready' : result.status === 'manual' ? 'manual' : 'error',
      message: result.message ?? null,
    }));
  }, [desktop]);

  const install = useCallback(() => {
    void desktop?.installUpdate();
  }, [desktop]);

  const openReleases = useCallback(() => {
    void desktop?.openReleases();
  }, [desktop]);

  return { ...state, available: desktop !== null, check, download, install, openReleases };
}
