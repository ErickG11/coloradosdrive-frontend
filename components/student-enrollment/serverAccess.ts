import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/utils/env";

export const studentAccountAccess = cache(
  async (): Promise<{ mustChangePassword: boolean; inscripcionIncompleta: boolean }> => {
    const supabase = await createClient();
    const verified = await supabase.auth.getUser();
    if (verified.error || !verified.data.user) redirect("/login");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) redirect("/login");
    const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/estudiantes/account-status`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 401) redirect("/login");
    if (response.status === 403) redirect("/account-inactive");
    if (!response.ok)
      throw new Error("No se pudo verificar el acceso de tu cuenta. Intenta nuevamente.");
    const body: unknown = await response.json();
    if (
      !body ||
      typeof body !== "object" ||
      !("mustChangePassword" in body) ||
      typeof body.mustChangePassword !== "boolean" ||
      !("inscripcionIncompleta" in body) ||
      typeof body.inscripcionIncompleta !== "boolean"
    )
      throw new Error("No se pudo verificar la inscripción de tu cuenta.");
    return {
      mustChangePassword: body.mustChangePassword,
      inscripcionIncompleta: body.inscripcionIncompleta,
    };
  },
);
