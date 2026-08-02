import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy path: "Jobs" is now "Lists". Keeps old links and bookmarks working. */
export const Route = createFileRoute("/_authenticated/app/jobs/")({
  beforeLoad: ({ location }) => {
    throw redirect({ href: `/app/lists${location.searchStr ?? ""}` });
  },
});
