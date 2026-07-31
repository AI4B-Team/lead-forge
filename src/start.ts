import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { supabase } from "@/integrations/supabase/client";

// Project-specific replacement for the generated attachSupabaseAuth: when the
// stored refresh token is stale, getSession() returns null and the RPC hits the
// server with no bearer -> "Unauthorized: No authorization header provided" and
// a blank screen from the router error boundary. Try one explicit refresh, and
// if there is genuinely no session, send the user to /auth instead of firing an
// unauthenticated request.
const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    let token: string | undefined;
    if (typeof window !== "undefined") {
      const { data } = await supabase.auth.getSession();
      token = data.session?.access_token;
      if (!token) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        token = refreshed.session?.access_token;
      }
      // Public pages (e.g. the free tools) call unauthenticated server fns, so
      // only bounce to /auth when the caller is inside the signed-in app.
      const inApp = window.location.pathname.startsWith("/app");
      if (!token && inApp && !window.location.pathname.startsWith("/auth")) {
        window.location.replace("/auth");
        await new Promise(() => {}); // page is navigating away
      }
    }
    return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
  },
);

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, csrfMiddleware],
}));
