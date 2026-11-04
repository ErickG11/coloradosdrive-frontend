"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormError } from "@/components/ui/FormError";
import { getInscripcionConfig, sesionSolicitud } from "@/lib/api/inscripcion";
import { inscripcionErrorMessage } from "@/lib/api/inscripcionErrors";
import type { InscripcionConfig, ProgresoSolicitud } from "@/types/inscripcion";

import { IndicadorPasos } from "./IndicadorPasos";
import { InscripcionesCerradas } from "./InscripcionesCerradas";
import { PasoCodigo } from "./pasos/PasoCodigo";
import { PasoCorreo } from "./pasos/PasoCorreo";
import { PasoRequisitos } from "./pasos/PasoRequisitos";
import { PASOS_EXTERNOS, PasoPendiente } from "./pasos/registro";
import {
  PASO_CODIGO,
  PASO_CONSENTIMIENTO,
  PASO_CORREO,
  PASO_ESTADO,
  PASO_REQUISITOS,
  type PasoId,
  type PasoProps,
} from "./pasos/tipos";
import { pasoSegunProgreso } from "./reanudacion";
import styles from "./wizard.module.css";

const TITULOS: Record<PasoId, string> = {
  0: "Antes de empezar",
  1: "Tu correo electrónico",
  2: "Verifica tu correo",
  3: "Consentimiento y términos",
  4: "Tus datos",
  5: "Nivel de estudios",
  6: "Revisar y enviar",
  7: "Estado de tu solicitud",
};

const AYUDAS: Record<PasoId, string> = {
  0: "Elige tu curso y confirma que cumples los requisitos para inscribirte en línea.",
  1: "Usaremos tu correo para verificar tu identidad y avisarte sobre tu solicitud.",
  2: "Ingresa el código de 6 dígitos que enviamos a tu correo.",
  3: "Lee el aviso de privacidad y los términos, y registra tu aceptación.",
  4: "Completa tus datos personales tal como figuran en tu cédula.",
  5: "Indica tu nivel de estudios y adjunta el certificado si corresponde.",
  6: "Revisa tu información antes de enviarla a la escuela.",
  7: "Consulta cómo avanza tu solicitud.",
};

// Primer paso con sesión verificada: antes de él no se puede retroceder una vez
// confirmado el código.
const PRIMER_PASO_VERIFICADO = PASO_CONSENTIMIENTO;

export function InscripcionWizard({ initialCourseId = "" }: { initialCourseId?: string }) {
  const [config, setConfig] = useState<InscripcionConfig | null>(null);
  const [errorConfig, setErrorConfig] = useState("");
  const [cerrado, setCerrado] = useState(false);
  const [paso, setPaso] = useState<PasoId>(PASO_REQUISITOS);
  const [courseId, setCourseId] = useState(initialCourseId);
  const [correo, setCorreo] = useState("");
  const [solicitudId, setSolicitudId] = useState<string | null>(null);
  const [progreso, setProgreso] = useState<ProgresoSolicitud | null>(null);
  const [intento, setIntento] = useState(0);
  const tituloRef = useRef<HTMLSpanElement>(null);
  const primerRender = useRef(true);

  const aplicarConfig = useCallback((datos: InscripcionConfig) => {
    setConfig(datos);
    setErrorConfig("");
    setCerrado(!datos.inscripcionesAbiertas);
    // Un courseId de la URL que ya no existe se descarta.
    setCourseId((actual) => (datos.cursos.some((c) => c.id === actual) ? actual : ""));
  }, []);

  useEffect(() => {
    let vigente = true;
    getInscripcionConfig()
      .then((datos) => {
        if (vigente) aplicarConfig(datos);
      })
      .catch((error) => {
        if (vigente) setErrorConfig(inscripcionErrorMessage(error));
      });
    return () => {
      vigente = false;
    };
  }, [aplicarConfig, intento]);

  // El token vive solo en memoria: al salir de la página se descarta.
  useEffect(() => () => sesionSolicitud.limpiar(), []);

  // Foco gestionado: al cambiar de paso el foco va al título del paso.
  useEffect(() => {
    if (primerRender.current) {
      primerRender.current = false;
      return;
    }
    tituloRef.current?.focus();
  }, [paso, cerrado]);

  const irAPaso = useCallback(
    (destino: PasoId) => {
      if (destino <= PASO_CODIGO) {
        // Volver a los pasos del correo descarta la sesión verificada.
        sesionSolicitud.limpiar();
        setSolicitudId(null);
        setProgreso(null);
        setPaso(destino);
        return;
      }
      if (!solicitudId) {
        setPaso(PASO_CORREO);
        return;
      }
      setPaso(destino);
    },
    [solicitudId],
  );

  const avanzar = useCallback(() => {
    setPaso((actual) => (actual < PASO_ESTADO ? ((actual + 1) as PasoId) : actual));
  }, []);

  const volver = useCallback(() => {
    setPaso((actual) =>
      actual > PRIMER_PASO_VERIFICADO && actual <= PASO_ESTADO ? ((actual - 1) as PasoId) : actual,
    );
  }, []);

  // Con el código confirmado el servidor entrega el progreso: se conserva el curso original
  // de la solicitud y se reanuda en el primer paso incompleto.
  function alVerificar(id: string, datos: ProgresoSolicitud) {
    setSolicitudId(id);
    setProgreso(datos);
    setCourseId(datos.courseId);
    setPaso(pasoSegunProgreso(datos));
  }

  function renderPaso(datos: InscripcionConfig) {
    const propsPaso: PasoProps | null = solicitudId
      ? {
          solicitudId,
          progreso,
          onProgreso: setProgreso,
          onAvanzar: avanzar,
          onVolver: volver,
          irAPaso,
        }
      : null;

    if (paso === PASO_REQUISITOS) {
      return (
        <PasoRequisitos
          config={datos}
          courseId={courseId}
          onCourseChange={setCourseId}
          onContinuar={() => setPaso(PASO_CORREO)}
        />
      );
    }
    if (paso === PASO_CORREO) {
      return (
        <PasoCorreo
          correo={correo}
          courseId={courseId}
          onCorreoChange={setCorreo}
          onEnviado={() => setPaso(PASO_CODIGO)}
          onVolver={() => setPaso(PASO_REQUISITOS)}
          onCerrado={() => setCerrado(true)}
        />
      );
    }
    if (paso === PASO_CODIGO) {
      return (
        <PasoCodigo
          correo={correo}
          courseId={courseId}
          onVerificado={alVerificar}
          onCambiarCorreo={() => setPaso(PASO_CORREO)}
          onCerrado={() => setCerrado(true)}
        />
      );
    }
    if (paso === PASO_CONSENTIMIENTO) {
      // El paso 3 se conecta en su propia tarea.
      return <PasoPendiente />;
    }
    const Externo = PASOS_EXTERNOS[paso];
    if (!propsPaso || !Externo) return <PasoPendiente />;
    return <Externo {...propsPaso} />;
  }

  return (
    <main className={styles.page}>
      <div className={styles.top}>
        <Link href="/">Volver al inicio</Link>
        <ThemeToggle />
      </div>
      <header>
        <span className={styles.eyebrow}>Colorados Drive</span>
        <h1 className={styles.title}>Solicitar inscripción</h1>
      </header>

      {config === null ? (
        errorConfig ? (
          <Card className={styles.panel}>
            <FormError>{errorConfig}</FormError>
            <div className={styles.actions}>
              <Button
                onClick={() => {
                  setErrorConfig("");
                  setIntento((n) => n + 1);
                }}
              >
                Reintentar
              </Button>
            </div>
          </Card>
        ) : (
          <p role="status">Cargando información de inscripción…</p>
        )
      ) : cerrado ? (
        <Card
          className={styles.panel}
          title={
            <span ref={tituloRef} tabIndex={-1} className={styles.panelTitle}>
              Inscripciones cerradas
            </span>
          }
        >
          <InscripcionesCerradas />
        </Card>
      ) : (
        <>
          <IndicadorPasos paso={paso} />
          <Card
            className={styles.panel}
            title={
              <span ref={tituloRef} tabIndex={-1} className={styles.panelTitle}>
                {TITULOS[paso]}
              </span>
            }
          >
            <p className={styles.help}>{AYUDAS[paso]}</p>
            {renderPaso(config)}
          </Card>
        </>
      )}
    </main>
  );
}
