import { env } from "../utils/env";

import type { PublicCourse } from "@/types/publicCourse";

// GET /public/courses no requiere auth, así que se llama con fetch directo
// en vez de `api.get` (ese wrapper adjunta el JWT vía el cliente de
// Supabase del navegador, pensado para Client Components autenticados).
// Se usa desde el Server Component de "/" para renderizar la landing sin
// esperar hidratación. Si el backend no responde, la landing se muestra
// igual sin la sección de cursos en vez de romper la primera pantalla
// pública del sitio.
export async function getPublicCourses(): Promise<PublicCourse[]> {
  try {
    const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/public/courses`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return [];
    }

    return (await response.json()) as PublicCourse[];
  } catch {
    return [];
  }
}
