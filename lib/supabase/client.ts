import { createBrowserClient } from "@supabase/ssr";

import { env } from "../utils/env";

// Cliente de Supabase para Client Components (navegador).
export function createClient() {
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
