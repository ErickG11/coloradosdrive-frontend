"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

// DashboardShell ya resuelve el usuario del lado del servidor (email/rol
// para el Sidebar), pero eso no llega a un Client Component que necesita
// el id para su propia suscripción de Realtime (canal personal
// `user-{userId}-...`) - de ahí este hook aparte.
export function useCurrentUserId(): string | null {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) {
        setUserId(data.user?.id ?? null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return userId;
}
