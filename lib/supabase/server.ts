import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { env } from "../utils/env";

// Cliente de Supabase para Server Components, Server Actions y Route
// Handlers. `cookies()` es async desde Next.js 15+ (obligatorio en 16).
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // `setAll` fue llamado desde un Server Component. Se puede
          // ignorar si hay un proxy (proxy.ts) refrescando la sesión.
        }
      },
    },
  });
}
