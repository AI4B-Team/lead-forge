import { createFileRoute, redirect } from "@tanstack/react-router";

/** The doors page is gone: the assistant is the single entry point for new lists. */
export const Route = createFileRoute("/_authenticated/app/new-list/")({
  beforeLoad: () => {
    throw redirect({ to: "/app/assistant", search: {} });
  },
});
