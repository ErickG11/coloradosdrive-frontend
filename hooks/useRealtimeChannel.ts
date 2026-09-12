"use client";

import { useEffect, useRef } from "react";

import { createClient } from "@/lib/supabase/client";

type RealtimeEventHandlers = Record<string, (payload: unknown) => void>;

// Hook reutilizable para suscribirse a un canal de Supabase Broadcast (RF-03:
// liberación de cupo, recordatorio de confirmación; pensado también para el
// chat de Sprint 6). Un solo canal + una sola suscripción, con todos sus
// eventos registrados sobre ella - patrón recomendado por Supabase en vez de
// abrir un canal por evento.
//
// Los nombres de evento (las claves de `handlers`) deben ser estables
// mientras `channelName` no cambie: se leen una sola vez, al abrir el canal,
// para registrar los listeners. Las funciones sí pueden ser nuevas en cada
// render (no hace falta useCallback en quien llama): se guardan en un ref
// que el efecto no observa, así que un objeto de handlers distinto en cada
// render no fuerza una desuscripción/resuscripción - cada evento recibido
// invoca la versión más reciente del handler, leída del ref en el momento
// en que llega, no la que estaba vigente cuando se abrió el canal.
export function useRealtimeChannel(
  channelName: string | null,
  handlers: RealtimeEventHandlers,
): void {
  const handlersRef = useRef(handlers);
  // Los refs solo se actualizan fuera del render (aquí, en un efecto sin
  // dependencias que corre después de cada uno) - nunca asignando
  // directamente en el cuerpo de la función.
  useEffect(() => {
    handlersRef.current = handlers;
  });

  const eventNames = Object.keys(handlers).sort().join(",");

  useEffect(() => {
    if (!channelName) return undefined;

    const supabase = createClient();
    const channel = supabase.channel(channelName);

    for (const event of eventNames.split(",").filter(Boolean)) {
      channel.on("broadcast", { event }, ({ payload }: { payload: unknown }) => {
        handlersRef.current[event]?.(payload);
      });
    }

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eventNames (no `handlers`) es la dependencia real: solo debe
    // reabrirse el canal si cambia el propio canal o el conjunto de
    // eventos a escuchar, nunca por una nueva identidad de función.
  }, [channelName, eventNames]);
}
