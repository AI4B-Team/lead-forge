/**
 * The viewer's IANA time zone, passed to server functions that format dates
 * (job titles). Server code runs in UTC, which rolled evening jobs to the
 * next calendar day in the title while Last Scrub showed the correct local
 * time. Falls back to undefined during SSR so the server keeps its default.
 */
export function localTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

export const LOCAL_TZ = typeof window === "undefined" ? undefined : localTimeZone();
