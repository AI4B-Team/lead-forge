import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy path: /app/new-job → /app/new-list. */
export const Route = createFileRoute("/_authenticated/app/new-job/")({
  beforeLoad: ({ location }) => {
    throw redirect({ href: `/app/new-list${location.searchStr ?? ""}` });
  },
});
