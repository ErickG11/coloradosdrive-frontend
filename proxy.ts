import { type NextRequest, NextResponse } from "next/server";

import { getUserRole } from "@/lib/supabase/getUserRole";
import { updateSession } from "@/lib/supabase/middleware";
import { getRoleHomePath } from "@/lib/utils/roleRedirect";
import type { Role } from "@/types/user";
import { env } from "@/lib/utils/env";

// Prefijo de ruta -> rol requerido. Ver types/user.ts (Role) y
// lib/utils/roleRedirect.ts (la ruta principal de cada rol).
const PROTECTED_PREFIXES: Record<string, Role> = {
  "/admin": "admin",
  "/student": "estudiante",
  "/instructor": "instructor",
};

function matchProtectedPrefix(pathname: string): string | undefined {
  return Object.keys(PROTECTED_PREFIXES).find(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

// `middleware` fue renombrado a `proxy` en Next.js 16 (ver
// node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md).
export async function proxy(request: NextRequest) {
  const { supabaseResponse, user, accessToken } = await updateSession(request);

  const matchedPrefix = matchProtectedPrefix(request.nextUrl.pathname);
  if (!matchedPrefix) {
    return supabaseResponse;
  }

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role = getUserRole(user);
  const requiredRole = PROTECTED_PREFIXES[matchedPrefix];

  if (role !== requiredRole) {
    const destination = role ? getRoleHomePath(role) : "/login";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  if (role === "estudiante" || role === "instructor") {
    const prefix = role === "estudiante" ? "estudiantes" : "instructores";
    const home = role === "estudiante" ? "/student" : "/instructor";
    const changePath = `${home}/change-password`;
    const status = await fetch(`${env.NEXT_PUBLIC_API_URL}/${prefix}/account-status`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (role === "instructor" && status.status === 403)
      return NextResponse.redirect(new URL("/account-inactive", request.url));
    if (!status.ok)
      return NextResponse.json(
        { message: "No se pudo verificar el estado de la cuenta." },
        { status: 503 },
      );
    const account = (await status.json()) as { mustChangePassword: boolean };
    const changePage = request.nextUrl.pathname === changePath;
    if (account.mustChangePassword && !changePage)
      return NextResponse.redirect(new URL(changePath, request.url));
    if (!account.mustChangePassword && changePage)
      return NextResponse.redirect(new URL(home, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
