import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy path: /app/new-job/{step} → /app/new-list/{step}, search preserved. */
export const Route = createFileRoute("/_authenticated/app/new-job/$")({
  beforeLoad: ({ params, location }) => {
    const rest = (params as { _splat?: string })._splat ?? "";
    throw redirect({ href: `/app/new-list/${rest}${location.searchStr ?? ""}` });
  },
});
