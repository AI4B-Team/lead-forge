import { createFileRoute, redirect } from "@tanstack/react-router";

// API Keys and webhooks now live on the Integrations page (single source of truth).
export const Route = createFileRoute("/_authenticated/app/api")({
  beforeLoad: () => {
    throw redirect({ to: "/app/integrations", hash: "developer" });
  },
});
