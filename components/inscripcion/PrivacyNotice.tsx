"use client";
import { EnrollmentActionLink } from "@/components/inscripcion/EnrollmentActionLink";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { solicitudes, solicitudMessage } from "@/lib/api/solicitudes";
import type { PrivacyNotice } from "@/types/solicitud";
import styles from "./inscripcion.module.css";
export function PrivacyNoticeText({ notice }: { notice: PrivacyNotice }) {
  return (
    <div className={styles.form}>
      <p className="font-semibold text-status-warning">
        BORRADOR — pendiente de revisión del representante legal de la escuela.
      </p>
      <p>Versión {notice.version}</p>
      <h2 className="text-lg font-semibold">Responsable y finalidad</h2>
      <p>
        ColoradosDrive, escuela de conducción en Santo Domingo de los Tsáchilas, recibe estos datos
        para gestionar tu solicitud, revisar requisitos, comunicar una decisión y, si se aprueba,
        crear tu cuenta y matrícula.
      </p>
      <h2 className="text-lg font-semibold">Datos solicitados</h2>
      <p>
        Correo, cédula, nombre, teléfono opcional, fecha de nacimiento y los documentos que decidas
        entregar: cédula, papeleta de votación, tipo de sangre y título de bachiller o certificado
        de décimo. Para postulantes de 15 a 17 años se solicita nombre, cédula y autorización del
        representante legal.
      </p>
      <h2 className="text-lg font-semibold">Acceso y revisión</h2>
      <p>
        El personal administrativo autorizado revisa los documentos manualmente. Se usan servicios
        de alojamiento, autenticación, almacenamiento y correo para operar la plataforma. No se
        consulta a Registro Civil, Ministerio de Educación, CNE ni proveedores externos de
        validación.
      </p>
      <h2 className="text-lg font-semibold">Conservación</h2>
      <p>
        Las solicitudes rechazadas o abandonadas se eliminan después de {notice.retencionDias} días
        según su estado. Los borradores, incluso con documentos, se eliminan a los 7 días; las
        solicitudes enviadas se conservan para revisión. Los expedientes aprobados pasan a la
        gestión del alumno; su política de conservación debe completarse en la revisión legal. Los
        eventos técnicos de auditoría no contienen nombres, cédulas, correos ni documentos.
      </p>
      <h2 className="text-lg font-semibold">Tus derechos y contacto</h2>
      <p>
        Puedes solicitar acceso, rectificación o eliminación escribiendo a{" "}
        <a className="underline" href={`mailto:${notice.contactoDerechos}`}>
          {notice.contactoDerechos}
        </a>
        . La escuela atenderá y verificará tu solicitud antes de actuar.
      </p>
      <p>
        Los documentos faltantes no impiden enviar la solicitud. Puedes entregarlos físicamente en
        la escuela, incluso con el curso iniciado. La aprobación corresponde al administrador.
      </p>
    </div>
  );
}
export function PrivacyPage() {
  const [notice, setNotice] = useState<PrivacyNotice | null>(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    solicitudes
      .notice()
      .then((n) => {
        if (alive) setNotice(n);
      })
      .catch((e) => {
        if (alive) setError(solicitudMessage(e));
      });
    return () => {
      alive = false;
    };
  }, [retry]);
  return (
    <main className={styles.page}>
      <div className={styles.flow}>
        <EnrollmentActionLink href="/">Volver al inicio</EnrollmentActionLink>
        <h1 className="text-2xl font-bold">Aviso de privacidad</h1>
        <FormError>{error}</FormError>
        {notice ? (
          <Card>
            <PrivacyNoticeText notice={notice} />
          </Card>
        ) : error ? (
          <Button
            onClick={() => {
              setError("");
              setRetry(retry + 1);
            }}
          >
            Reintentar
          </Button>
        ) : (
          <p role="status">Cargando aviso…</p>
        )}
      </div>
    </main>
  );
}
