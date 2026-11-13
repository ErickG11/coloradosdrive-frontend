"use client";

import { useEffect, useRef, useState } from "react";
import type { ClipboardEvent, FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/inscripcion/EnrollmentField";
import { confirmarCodigo, getProgreso, verificarCorreo } from "@/lib/api/inscripcion";
import {
  inscripcionErrorCode,
  inscripcionErrorMessage,
  sugiereWhatsapp,
} from "@/lib/api/inscripcionErrors";
import type { ProgresoSolicitud } from "@/types/inscripcion";

import { ContactoWhatsApp } from "../ContactoWhatsApp";
import styles from "../wizard.module.css";
import { normalizarCorreo } from "./PasoCorreo";

const LONGITUD_CODIGO = 6;
// El backend permite un código por correo cada 60 s.
const ESPERA_REENVIO_SEGUNDOS = 60;

interface PasoCodigoProps {
  correo: string;
  courseId: string;
  onVerificado: (solicitudId: string, progreso: ProgresoSolicitud) => void;
  onCambiarCorreo: () => void;
  onCerrado: () => void;
}

// Solo dígitos, conservando ceros iniciales (el código es texto, no número).
function soloDigitos(valor: string): string {
  return valor.replace(/\D/g, "").slice(0, LONGITUD_CODIGO);
}

export function PasoCodigo({
  correo,
  courseId,
  onVerificado,
  onCambiarCorreo,
  onCerrado,
}: PasoCodigoProps) {
  const [codigo, setCodigo] = useState("");
  const [errorCodigo, setErrorCodigo] = useState("");
  const [errorGeneral, setErrorGeneral] = useState("");
  const [aviso, setAviso] = useState("");
  const [derivar, setDerivar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [espera, setEspera] = useState(ESPERA_REENVIO_SEGUNDOS);
  // Código ya aceptado cuya consulta de progreso falló: se reintenta sin pedir otro código.
  const [solicitudPendiente, setSolicitudPendiente] = useState<string | null>(null);
  const bloqueo = useRef(false);
  const campoRef = useRef<HTMLInputElement>(null);
  const campos = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (espera <= 0) return;
    const temporizador = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(temporizador);
  }, [espera]);

  async function cargarProgreso(solicitudId: string) {
    try {
      const progreso = await getProgreso(solicitudId);
      onVerificado(solicitudId, progreso);
    } catch (error) {
      setSolicitudPendiente(solicitudId);
      setErrorGeneral(inscripcionErrorMessage(error));
    }
  }

  async function verificar(event: FormEvent) {
    event.preventDefault();
    if (bloqueo.current) return;
    setErrorGeneral("");
    if (solicitudPendiente) {
      bloqueo.current = true;
      setOcupado(true);
      await cargarProgreso(solicitudPendiente);
      bloqueo.current = false;
      setOcupado(false);
      return;
    }
    if (codigo.length !== LONGITUD_CODIGO) {
      setErrorCodigo("Ingresa los 6 dígitos del código.");
      campoRef.current?.focus();
      return;
    }
    setErrorCodigo("");
    bloqueo.current = true;
    setOcupado(true);
    try {
      const { solicitudId } = await confirmarCodigo({
        correo: normalizarCorreo(correo),
        codigo,
      });
      await cargarProgreso(solicitudId);
    } catch (error) {
      setErrorCodigo(inscripcionErrorMessage(error));
      setDerivar(sugiereWhatsapp(error));
      campoRef.current?.focus();
    } finally {
      bloqueo.current = false;
      setOcupado(false);
    }
  }

  async function reenviar() {
    if (bloqueo.current || espera > 0) return;
    bloqueo.current = true;
    setOcupado(true);
    setErrorCodigo("");
    setErrorGeneral("");
    setAviso("");
    try {
      await verificarCorreo({ correo: normalizarCorreo(correo), courseId });
      setCodigo("");
      setEspera(ESPERA_REENVIO_SEGUNDOS);
      // Mensaje genérico: no revela si el correo tiene solicitud o cuenta.
      setAviso("Si el correo puede inscribirse, enviamos un código nuevo. Usa el más reciente.");
    } catch (error) {
      if (inscripcionErrorCode(error) === "INSCRIPCIONES_CERRADAS") {
        onCerrado();
        return;
      }
      setErrorGeneral(inscripcionErrorMessage(error));
      setDerivar(sugiereWhatsapp(error));
    } finally {
      bloqueo.current = false;
      setOcupado(false);
    }
  }

  function alPegar(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = soloDigitos(event.clipboardData.getData("text"));
    setCodigo(pasted);
    campos.current[Math.min(pasted.length, 5)]?.focus();
    setErrorCodigo("");
  }

  return (
    <form className={styles.form} onSubmit={verificar} noValidate>
      <p>
        Si <strong>{correo.trim()}</strong> puede inscribirse, recibirás un código de 6 dígitos. Si
        no llega en unos minutos, revisa tu carpeta de spam.
      </p>
      <fieldset aria-describedby="codigo-ayuda">
        <legend className="mb-3 text-sm font-semibold">Código de verificación</legend>
        <div className={styles.otp}>
          {Array.from({ length: LONGITUD_CODIGO }, (_, index) => (
            <Input
              key={index}
              ref={(element) => {
                campos.current[index] = element;
                if (index === 0) campoRef.current = element;
              }}
              aria-label={`Dígito ${index + 1} del código`}
              value={codigo[index] ?? ""}
              onChange={(event) => {
                const value = soloDigitos(event.target.value);
                setCodigo(
                  value.length > 1
                    ? value
                    : soloDigitos(codigo.slice(0, index) + value + codigo.slice(index + 1)),
                );
                setErrorCodigo("");
                if (value) campos.current[Math.min(index + 1, 5)]?.focus();
              }}
              onKeyDown={(event) => {
                if (event.key === "Backspace" && !codigo[index] && index > 0)
                  campos.current[index - 1]?.focus();
                if (event.key === "ArrowLeft" && index > 0) campos.current[index - 1]?.focus();
                if (event.key === "ArrowRight" && index < 5) campos.current[index + 1]?.focus();
              }}
              onPaste={alPegar}
              inputMode="numeric"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              maxLength={6}
              disabled={solicitudPendiente !== null || ocupado}
              aria-invalid={Boolean(errorCodigo)}
              required
            />
          ))}
        </div>
        <p id="codigo-ayuda" className="mt-3 text-sm text-text-secondary">
          Puedes pegar el código completo.
        </p>
        {errorCodigo ? (
          <p role="alert" className="mt-2 text-sm text-status-error">
            {errorCodigo}
          </p>
        ) : null}
      </fieldset>

      {aviso ? (
        <p role="status" className={`${styles.notice} ${styles.noticeSuccess}`}>
          {aviso}
        </p>
      ) : null}
      {derivar ? <ContactoWhatsApp /> : null}
      {errorGeneral ? (
        <p role="alert" className={styles.noticeError}>
          {errorGeneral}
        </p>
      ) : null}
      <div data-flow-actions className={styles.actions}>
        <Button type="submit" isLoading={ocupado}>
          {solicitudPendiente ? "Reintentar" : "Verificar código"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={ocupado || espera > 0 || solicitudPendiente !== null}
          onClick={() => void reenviar()}
        >
          {espera > 0 ? `Reenviar código en ${espera} s` : "Reenviar código"}
        </Button>
        <Button type="button" variant="ghost" disabled={ocupado} onClick={onCambiarCorreo}>
          Cambiar correo
        </Button>
      </div>
    </form>
  );
}
