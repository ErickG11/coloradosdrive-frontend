"use client";

import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

interface UseFetchResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// GET client-side reutilizable (listados, selects), con loading/error
// siguiendo el mismo manejo de errores del cliente de API (ApiError con
// mensaje legible; fallback genérico si ni siquiera hay respuesta).
export function useFetch<T>(path: string): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Reinicia el estado al arrancar cada fetch (mount, cambio de `path`,
    // o refetch()); las siguientes actualizaciones ocurren dentro de las
    // callbacks de la promesa, que sí sigue el patrón recomendado.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);

    api
      .get<T>(path)
      .then((result) => {
        if (!cancelled) {
          setData(result);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "No se pudo conectar con el servidor.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [path, reloadToken]);

  const refetch = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  return { data, isLoading, error, refetch };
}
