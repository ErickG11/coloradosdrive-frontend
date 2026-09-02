import type { Role } from "@/types/user";

// Ruta principal de cada rol tras iniciar sesión.
export function getRoleHomePath(role: Role): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "estudiante":
      return "/student";
    case "instructor":
      return "/instructor";
  }
}
