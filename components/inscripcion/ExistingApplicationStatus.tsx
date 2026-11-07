"use client";
import { buttonClassName } from "@/components/ui/Button";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { solicitudes, solicitudMessage } from "@/lib/api/solicitudes";
import type { SolicitudProgress } from "@/types/solicitud";
import styles from "./inscripcion.module.css";
export function ExistingApplicationStatus({
  progress,
  course,
  onDocuments,
}: {
  progress: SolicitudProgress;
  course?: string;
  onDocuments: () => void;
}) {
  const [contact, setContact] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    if (progress.estado !== "rechazada") return;
    let alive = true;
    solicitudes
      .notice()
      .then((n) => {
        if (alive) setContact(n.contactoDerechos);
      })
      .catch((e) => {
        if (alive) setError(solicitudMessage(e));
      });
    return () => {
      alive = false;
    };
  }, [progress.estado]);
  const sent = progress.estado === "enviada",
    approved = progress.estado === "aprobada";
  return (
    <section className={styles.form} aria-label="Estado de tu solicitud" aria-live="polite">
      <StatusBadge
        status={progress.estado}
        label={sent ? "Pendiente de revisión" : approved ? "Aprobada" : "Rechazada"}
        tone={sent ? "warning" : approved ? "success" : "error"}
      />
      <h3 className="font-display text-xl font-semibold">
        {sent
          ? "Tu solicitud está pendiente de revisión"
          : approved
            ? "Tu solicitud ya fue aprobada"
            : "Tu solicitud fue rechazada"}
      </h3>
      {progress.enviadaAt ? (
        <p>
          Fecha de envío:{" "}
          {new Date(progress.enviadaAt).toLocaleString("es-EC", { timeZone: "America/Guayaquil" })}
        </p>
      ) : null}
      {course ? <p>Curso: {course}</p> : null}
      {sent ? (
        <>
          <p>La escuela revisará tus datos y documentos. Recibirás la respuesta en tu correo.</p>
          <Button variant="secondary" onClick={onDocuments}>
            Continuar subiendo documentos
          </Button>
        </>
      ) : approved ? (
        <>
          <p>Revisa tu correo para encontrar tus credenciales de acceso.</p>
          <Link href="/login" className={buttonClassName("secondary")}>
            Iniciar sesión
          </Link>
        </>
      ) : (
        <>
          <p>
            Motivo: {progress.motivoRechazo ?? "Contacta a la escuela para conocer el detalle."}
          </p>
          {contact ? (
            <a className="underline" href={`mailto:${contact}`}>
              Contactar a la escuela: {contact}
            </a>
          ) : (
            <p role="alert">{error || "Cargando contacto de la escuela…"}</p>
          )}
        </>
      )}
    </section>
  );
}
