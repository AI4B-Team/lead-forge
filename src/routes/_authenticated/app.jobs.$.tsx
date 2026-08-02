import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy path: /app/jobs/{id} → /app/lists/{id}. */
export const Route = createFileRoute("/_authenticated/app/jobs/$")({
  beforeLoad: ({ params, location }) => {
    const rest = (params as { _splat?: string })._splat ?? "";
    throw redirect({ href: `/app/lists/${rest}${location.searchStr ?? ""}` });
  },
});
