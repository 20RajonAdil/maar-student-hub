/**
 * The integration-managed auth gate. Every route under
 * src/routes/_authenticated/ is protected by this layout.
 *
 * `ssr: false` because the Supabase session lives in localStorage —
 * the server can't read it, so we skip SSR for the whole subtree.
 * The `beforeLoad` runs client-side and redirects to /auth if there's no user.
 */
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: () => <Outlet />,
});
