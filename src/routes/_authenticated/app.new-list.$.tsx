import { createFileRoute, redirect } from "@tanstack/react-router";

const SOURCES = new Set(["business", "records", "upload"]);

/**
 * Legacy sub-routes land on the assistant with their source pre-set:
 * /business → ?source=business, /records → ?source=records, /upload → ?source=upload.
 */
export const Route = createFileRoute("/_authenticated/app/new-list/$")({
  beforeLoad: ({ params, location }) => {
    const step = ((params as { _splat?: string })._splat ?? "").split("/")[0] ?? "";
    const source = SOURCES.has(step) ? step : undefined;
    const url = new URLSearchParams(location.searchStr?.replace(/^\?/, "") ?? "");
    const niche = url.get("niche") ?? undefined;
    throw redirect({ to: "/app/assistant", search: { ...(source ? { source } : {}), ...(niche ? { niche } : {}) } });
  },
});
