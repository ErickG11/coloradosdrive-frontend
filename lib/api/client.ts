import { createClient } from "../supabase/client";
import { env } from "../utils/env";
import { ApiError } from "./errors";

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Sobrescribe el token adjuntado automáticamente (útil en tests). */
  token?: string | null;
}

async function getAccessToken(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function extractError(response: Response): Promise<ApiError> {
  try {
    const data: unknown = await response.json();
    if (
      data !== null &&
      typeof data === "object" &&
      "message" in data &&
      typeof (data as { message: unknown }).message === "string"
    ) {
      const body = data as { message: string; code?: unknown; field?: unknown };
      return new ApiError(body.message, response.status, {
        code: typeof body.code === "string" ? body.code : undefined,
        field: typeof body.field === "string" ? body.field : undefined,
      });
    }
  } catch {
    // La respuesta no trae un body JSON parseable.
  }

  switch (response.status) {
    case 401:
      return new ApiError("No autorizado. Inicia sesión nuevamente.", response.status);
    case 403:
      return new ApiError("No tienes permisos para realizar esta acción.", response.status);
    case 404:
      return new ApiError("Recurso no encontrado.", response.status);
    case 500:
      return new ApiError(
        "Error interno del servidor. Intenta de nuevo más tarde.",
        response.status,
      );
    default:
      return new ApiError(`Error inesperado (${response.status}).`, response.status);
  }
}

// Fetch wrapper para el backend REST de ColoradosDrive: arma la URL desde
// NEXT_PUBLIC_API_URL, adjunta el JWT de la sesión activa de Supabase en
// Authorization: Bearer, y centraliza el manejo de errores HTTP.
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { body, token, headers, ...rest } = options;
  const accessToken = token !== undefined ? token : await getAccessToken();

  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw await extractError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string, options?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, options?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...options, method: "DELETE" }),
};
