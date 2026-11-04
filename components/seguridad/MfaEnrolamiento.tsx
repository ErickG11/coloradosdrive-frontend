"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

import { Button, Card, FormError, Input, StatusBadge } from "@/components/ui";
import {
  codigoValido,
  enrolarTotp,
  listarFactoresTotp,
  mensajeMfa,
  verificarTotp,
  type EnrolamientoTotp,
} from "@/lib/auth/mfa";

type Fase = "cargando" | "inactiva" | "enrolando" | "activa" | "error";

// Panel de seguridad del admin: activa la verificación en dos pasos (TOTP).
// Orden seguro: enrolar primero; el backend activa ADMIN_MFA_REQUIRED después.
export function MfaEnrolamiento() {
  const [fase, setFase] = useState<Fase>("cargando");
  const [enrolamiento, setEnrolamiento] = useState<EnrolamientoTotp | null>(null);
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const codigoRef = useRef<HTMLInputElement>(null);
  const estadoRef = useRef<HTMLHeadingElement>(null);
  const bloqueo = useRef(false);

  const cargar = useCallback(async () => {
    setFase("cargando");
    setError(null);
    try {
      const factores = await listarFactoresTotp();
      setFase(factores.some((f) => f.verificado) ? "activa" : "inactiva");
    } catch (cause) {
      setError(mensajeMfa(cause));
      setFase("error");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar();
  }, [cargar]);

  useEffect(() => {
    if (fase === "enrolando") codigoRef.current?.focus();
    if (fase === "activa") estadoRef.current?.focus();
  }, [fase]);

  async function empezar() {
    if (bloqueo.current) return;
    bloqueo.current = true;
    setOcupado(true);
    setError(null);
    try {
      setEnrolamiento(await enrolarTotp());
      setCodigo("");
      setFase("enrolando");
    } catch (cause) {
      setError(mensajeMfa(cause));
    } finally {
      bloqueo.current = false;
      setOcupado(false);
    }
  }

  async function verificar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (bloqueo.current || !enrolamiento) return;
    if (!codigoValido(codigo)) {
      setError("Escribe los 6 dígitos que muestra tu app autenticadora.");
      codigoRef.current?.focus();
      return;
    }
    bloqueo.current = true;
    setOcupado(true);
    setError(null);
    try {
      await verificarTotp(enrolamiento.factorId, codigo);
      setEnrolamiento(null);
      setCodigo("");
      setFase("activa");
    } catch (cause) {
      setError(mensajeMfa(cause));
      codigoRef.current?.focus();
    } finally {
      bloqueo.current = false;
      setOcupado(false);
    }
  }

  return (
    <section className="grid min-w-0 gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold">Seguridad de la cuenta</h1>
        <p className="mt-2 text-text-secondary">
          Protege el panel de administración con un código de un solo uso además de tu contraseña.
        </p>
      </header>

      <Card title="Verificación en dos pasos">
        {fase === "cargando" ? <p role="status">Cargando estado…</p> : null}

        {fase === "error" ? (
          <div className="grid justify-items-start gap-3">
            <FormError>{error}</FormError>
            <Button className="min-h-11" onClick={() => void cargar()}>
              Reintentar
            </Button>
          </div>
        ) : null}

        {fase === "inactiva" ? (
          <div className="grid justify-items-start gap-3">
            <StatusBadge status="pendiente" label="Desactivada" />
            <p className="text-sm text-text-secondary">
              Necesitas una app autenticadora (Google Authenticator, Microsoft Authenticator, Authy
              u otra compatible).
            </p>
            <FormError>{error}</FormError>
            <Button className="min-h-11" isLoading={ocupado} onClick={() => void empezar()}>
              Activar verificación en dos pasos
            </Button>
          </div>
        ) : null}

        {fase === "enrolando" && enrolamiento ? (
          <form onSubmit={(event) => void verificar(event)} className="grid max-w-md gap-4">
            <ol className="grid list-inside list-decimal gap-2 text-sm text-text-secondary">
              <li>Abre tu app autenticadora y escanea el código QR.</li>
              <li>Escribe el código de 6 dígitos que muestra la app.</li>
            </ol>
            <div className="w-fit rounded-md border border-border bg-white p-3">
              {/* El QR es una data URI SVG generada por Supabase; <img> no ejecuta scripts. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={enrolamiento.qrCode}
                alt="Código QR para tu app autenticadora"
                width={192}
                height={192}
                className="h-48 w-48"
              />
            </div>
            <details className="text-sm">
              <summary className="min-h-11 cursor-pointer py-2">
                No puedo escanear el código
              </summary>
              <p className="text-text-secondary">Escribe esta clave en tu app:</p>
              <code className="mt-1 block break-all rounded-sm bg-bg-sunken p-2">
                {enrolamiento.secreto}
              </code>
            </details>
            <Input
              ref={codigoRef}
              label="Código de 6 dígitos"
              name="mfa-codigo"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              pattern="[0-9]{6}"
              value={codigo}
              onChange={(event) => setCodigo(event.target.value.replace(/\D/g, ""))}
              error={error ?? undefined}
              required
            />
            <div className="flex flex-wrap gap-3">
              <Button type="submit" className="min-h-11" isLoading={ocupado}>
                Verificar y activar
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="min-h-11"
                disabled={ocupado}
                onClick={() => {
                  setEnrolamiento(null);
                  setError(null);
                  setFase("inactiva");
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        ) : null}

        {fase === "activa" ? (
          <div className="grid gap-3">
            <h2
              ref={estadoRef}
              tabIndex={-1}
              className="flex flex-wrap items-center gap-2 text-base font-semibold outline-none"
            >
              Verificación en dos pasos <StatusBadge status="activo" label="Activada" />
            </h2>
            <p className="text-sm text-text-secondary">
              Tu cuenta ya tiene un factor de verificación. Cuando el equipo técnico active la
              exigencia en el servidor, se te pedirá el código después de iniciar sesión.
            </p>
            <p className="text-sm text-text-secondary">
              Si pierdes el dispositivo, contacta al responsable técnico para restablecer el factor
              desde el panel de Supabase Auth.
            </p>
          </div>
        ) : null}
      </Card>
    </section>
  );
}
