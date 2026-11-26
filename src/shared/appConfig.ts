/**
 * Settings the portal sends for the app (App settings page), delivered with
 * the Home screen data (/api/dashboard → appConfig). Kept here for the rest of
 * the app; until Home has loaded once, the defaults below apply.
 */
export type AppConfig = {
  /** Seconds the scanner waits after opening, so there is time to aim. */
  scanDelaySeconds: number;
  /** The most characters a scan puts into a search box; 0 is no limit. */
  scanMaxChars: number;
  /** Which end of a longer code is kept: 'end' (last characters) or 'start'. */
  scanKeep: 'end' | 'start';
};

let config: AppConfig = { scanDelaySeconds: 2.5, scanMaxChars: 0, scanKeep: 'end' };

export function getAppConfig(): AppConfig {
  return config;
}

/** From the Home data. Anything missing or out of range keeps its current value. */
export function setAppConfig(next: Partial<AppConfig> | null | undefined) {
  if (!next) return;
  const delay = Number(next.scanDelaySeconds);
  const max = Number(next.scanMaxChars);
  config = {
    scanDelaySeconds: Number.isFinite(delay) && delay >= 0 && delay <= 10 ? delay : config.scanDelaySeconds,
    scanMaxChars: Number.isInteger(max) && max >= 0 ? max : config.scanMaxChars,
    scanKeep: next.scanKeep === 'start' || next.scanKeep === 'end' ? next.scanKeep : config.scanKeep,
  };
}

/** A scanned code cut to the configured length, from the configured end. */
export function clipScan(code: string): string {
  const { scanMaxChars: n, scanKeep } = config;
  if (!n || code.length <= n) return code;
  return scanKeep === 'start' ? code.slice(0, n) : code.slice(-n);
}
