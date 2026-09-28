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
    // Canal privado: la suscripción exige una política RLS sobre
    // realtime.messages que autorice este topic para el usuario
    // autenticado (ver migrations/011_realtime_broadcast_authorization.sql
    // en el backend) - sin esto, cualquiera con la anon key que
    // adivinara/conociera el nombre del canal podía suscribirse sin
    // ninguna verificación.
    const channel = supabase.channel(channelName, { config: { private: true } });

    for (const event of eventNames.split(",").filter(Boolean)) {
      channel.on("broadcast", { event }, ({ payload }: { payload: unknown }) => {
        handlersRef.current[event]?.(payload);
      });
    }

    // `createClient()` construye un cliente nuevo cada vez; su envío
    // inicial del JWT al cliente de Realtime (`realtime.setAuth`, ver
    // SupabaseClient._listenForAuthEvents en supabase-js) es asíncrono. Sin
    // esperarlo, `channel.subscribe()` puede intentar el join ANTES de que
    // el token esté aplicado - con un canal privado, eso es un
    // CHANNEL_ERROR seguro, aunque la política RLS sea correcta y el
    // usuario sí tenga sesión (falla por orden de ejecución, no por
    // autorización real). getSession() además confirma que hay sesión: sin
    // ninguna, ni vale la pena intentar un canal privado.
    let cancelled = false;
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;

      if (!session) {
        console.error(
          `[useRealtimeChannel] No hay sesión de Supabase Auth activa; no se puede suscribir al canal privado "${channelName}".`,
        );
        return;
      }

      void supabase.realtime.setAuth(session.access_token).then(() => {
        if (cancelled) return;
        channel.subscribe((status, err) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.error(
              `[useRealtimeChannel] No se pudo suscribir al canal "${channelName}" (${status}).`,
              err,
            );
          }
        });
      });
    });

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
    // eventNames (no `handlers`) es la dependencia real: solo debe
    // reabrirse el canal si cambia el propio canal o el conjunto de
    // eventos a escuchar, nunca por una nueva identidad de función.
  }, [channelName, eventNames]);
}
