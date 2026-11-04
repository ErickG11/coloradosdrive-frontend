"use client";
import Link from "next/link";
import { forwardRef, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormError } from "@/components/ui/FormError";
import { reenviarEnlaceAcceso } from "@/lib/api/inscripcion";
import { adminErrorMessage } from "./adminErrors";
import type { ResultadoDecision } from "./decisionTipos";
import styles from "./solicitudes.module.css";

const TITULOS = {
  aprobada: "Solicitud aprobada",
  devuelta: "Solicitud devuelta al postulante",
  rechazada: "Solicitud rechazada",
} as const;

// Resultado de la decisión: cohorte asignada o pendiente, si el correo salió y, al aprobar, la
// acción de reenviar el enlace para crear la contraseña.
export const ResultadoDecisionCard = forwardRef<HTMLDivElement, { resultado: ResultadoDecision }>(
  function ResultadoDecisionCard({ resultado }, ref) {
    const [reenvio, setReenvio] = useState<"" | "enviado" | "fallo">(""),
      [error, setError] = useState(""),
      [ocupado, setOcupado] = useState(false);
    const lock = useRef(false);
    const titulo =
      resultado.estado in TITULOS
        ? TITULOS[resultado.estado as keyof typeof TITULOS]
        : "Decisión registrada";
    // Tras aprobar, el correo puede no haber salido: el reenvío cubre ese caso y los enlaces perdidos.
    const puedeReenviar = resultado.estado === "aprobada" && Boolean(resultado.studentId);

    async function reenviar() {
      if (lock.current || !resultado.studentId) return;
      lock.current = true;
      setOcupado(true);
      setError("");
      setReenvio("");
      try {
        const respuesta = await reenviarEnlaceAcceso(resultado.studentId);
        setReenvio(respuesta.correoEnviado ? "enviado" : "fallo");
      } catch (e) {
        setError(adminErrorMessage(e));
      } finally {
        lock.current = false;
        setOcupado(false);
      }
    }

    return (
      <div ref={ref} tabIndex={-1} className={styles.resultFocus}>
        <Card title={titulo} className="border-status-success">
          <div className={styles.detail}>
            {resultado.estado === "aprobada" ? (
              <>
                {resultado.cohorte ? (
                  <p>Cohorte asignada: {resultado.cohorte.nombre}</p>
                ) : (
                  <p>
                    Cohorte pendiente: se asignará cuando haya una disponible. También puedes
                    asignarla desde Alumnos.
                  </p>
                )}
                {resultado.studentId ? (
                  <Link
                    className="inline-flex min-h-11 items-center underline"
                    href={`/admin/students/${encodeURIComponent(resultado.studentId)}`}
                  >
                    Ver ficha del alumno
                  </Link>
                ) : null}
              </>
            ) : null}
            {resultado.correoEnviado === true ? (
              <p className="text-sm text-status-success" role="status">
                {resultado.estado === "aprobada"
                  ? "Correo enviado con el enlace para crear la contraseña."
                  : "Correo enviado al postulante."}
              </p>
            ) : resultado.correoEnviado === false ? (
              <p role="alert" className="text-sm text-status-warning">
                La decisión se guardó, pero el correo no se pudo enviar.
                {puedeReenviar
                  ? " Reenvía el enlace desde aquí."
                  : " Contacta al postulante por otro medio."}
              </p>
            ) : (
              <p className="text-sm text-text-secondary">
                Este motivo no envía correo al postulante.
              </p>
            )}
            {puedeReenviar ? (
              <div className={styles.detail}>
                <div className={styles.controls}>
                  <Button variant="secondary" isLoading={ocupado} onClick={() => void reenviar()}>
                    Reenviar enlace para crear contraseña
                  </Button>
                </div>
                {reenvio === "enviado" ? (
                  <p role="status" className="text-sm text-status-success">
                    Enlace nuevo enviado.
                  </p>
                ) : null}
                {reenvio === "fallo" ? (
                  <p role="alert" className="text-sm text-status-warning">
                    El enlace se generó pero el correo no salió. Intenta de nuevo en unos minutos.
                  </p>
                ) : null}
                <FormError>{error}</FormError>
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    );
  },
);
