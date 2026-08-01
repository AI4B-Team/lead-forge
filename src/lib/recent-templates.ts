// Per-workspace memory of the templates an operator actually uses, so a list
// they run repeatedly is always one click away in the assistant grid.
export type RecentTemplate = { id: string; ts: number };

const CAP = 12;
const key = (workspaceId: string) => `lf-recent-templates-${workspaceId}`;

export function loadRecentTemplates(workspaceId: string): RecentTemplate[] {
  try {
    const raw = localStorage.getItem(key(workspaceId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((r): r is RecentTemplate =>
        Boolean(r) && typeof (r as RecentTemplate).id === "string" && typeof (r as RecentTemplate).ts === "number")
      .sort((a, b) => b.ts - a.ts)
      .slice(0, CAP);
  } catch {
    return [];
  }
}

/** Upserts a template id at the front of the recents list and caps the length. */
export function touchRecentTemplate(workspaceId: string, id: string): RecentTemplate[] {
  const next = [{ id, ts: Date.now() }, ...loadRecentTemplates(workspaceId).filter((r) => r.id !== id)].slice(0, CAP);
  try {
    localStorage.setItem(key(workspaceId), JSON.stringify(next));
  } catch { /* ignore */ }
  return next;
}
