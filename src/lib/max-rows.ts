/** Remembers the last row cap a workspace used, so it isn't re-entered each run. */
const key = (workspaceId: string) => `leadtrace_max_rows:${workspaceId}`;

export const DEFAULT_MAX_ROWS = 500;

export function loadMaxRows(workspaceId: string): number | null {
  try {
    const raw = localStorage.getItem(key(workspaceId));
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? Math.min(50000, Math.round(n)) : null;
  } catch {
    return null;
  }
}

export function saveMaxRows(workspaceId: string, value: number) {
  try { localStorage.setItem(key(workspaceId), String(value)); } catch { /* ignore */ }
}
