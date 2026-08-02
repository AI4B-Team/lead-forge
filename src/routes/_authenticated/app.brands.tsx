import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy path — the page is now the singleton AI Agent. */
export const Route = createFileRoute("/_authenticated/app/brands")({
  beforeLoad: () => {
    throw redirect({ to: "/app/agent" });
  },
});
