"use client";

import { EnrollmentFlowFrame, FlowStepIcon } from "./EnrollmentFlowFrame";
import { PasswordGuidance } from "./PasswordGuidance";
import { EnrollmentIcon } from "./EnrollmentVisual";
import flowStyles from "./enrollment-flow.module.css";
import Link from "next/link";
import visual from "./enrollment-surface.module.css";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button, Card, FormError } from "@/components/ui";
import { Input } from "@/components/inscripcion/EnrollmentField";
import { buttonClassName } from "@/components/ui/buttonStyles";
import { whatsappHref } from "@/lib/content/landing";
import { createClient } from "@/lib/supabase/client";

const MIN_LENGTH = 10;
const LINK_TYPES = ["recovery", "invite"] as const;
type LinkType = (typeof LINK_TYPES)[number];
interface LinkParams {
  tokenHash: string;
  type: LinkType;
}

type View = "loading" | "ready" | "invalid" | "expired";

const EXPIRED_CODES = ["otp_expired", "flow_state_expired"];
const TITLE_CLASS =
  "font-display text-2xl font-semibold tracking-tight text-text-primary outline-none";

// Pantalla del enlace de un solo uso del correo de aprobación. El token se lee
// de la URL y se borra de ella al cargar, pero NO se consume hasta que la
// persona pulsa «Crear mi contraseña» (los escáneres de correo abren el
// enlace y no pulsan botones). El token vive solo en una referencia en
// memoria: nunca en storage ni en logs.
export function CrearContrasena() {
  const router = useRouter();
  const params = useRef<LinkParams | null>(null);
  const read = useRef(false);
  // Tras verifyOtp la sesión ya existe y el token está gastado: un reintento
  // solo debe repetir updateUser.
  const verified = useRef(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [view, setView] = useState<View>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (read.current) return;
    read.current = true;
    const search = new URLSearchParams(window.location.search);
    const tokenHash = search.get("token_hash");
    const type = search.get("type");
    // Fuera de la URL cuanto antes: historial, capturas y Referer.
    window.history.replaceState(null, "", window.location.pathname);
    const valid = Boolean(tokenHash) && LINK_TYPES.some((allowed) => allowed === type);
    if (valid) params.current = { tokenHash: tokenHash ?? "", type: type as LinkType };
    // La URL solo existe en el navegador: la vista se decide tras leerla.
    queueMicrotask(() => setView(valid ? "ready" : "invalid"));
  }, []);

  // Al cambiar de pantalla el foco va al título para anunciar el cambio.
  useEffect(() => {
    if (view !== "loading") headingRef.current?.focus();
  }, [view, done]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password.length < MIN_LENGTH) {
      setPasswordError(`La contraseña debe tener al menos ${MIN_LENGTH} caracteres.`);
      passwordRef.current?.focus();
      return;
    }
    setPasswordError(null);
    if (password !== confirm) {
      setConfirmError("Las contraseñas no coinciden.");
      return;
    }
    setConfirmError(null);
    const link = params.current;
    if (!link && !verified.current) return;

    setBusy(true);
    const supabase = createClient();
    if (!verified.current && link) {
      const { error: otpError } = await supabase.auth.verifyOtp({
        token_hash: link.tokenHash,
        type: link.type,
      });
      if (otpError) {
        setBusy(false);
        if (otpError.status && otpError.status < 500) {
          // Vencido, ya usado o inválido: el token no sirve para reintentar.
          params.current = null;
          setPassword("");
          setConfirm("");
          setView(EXPIRED_CODES.includes(otpError.code ?? "") ? "expired" : "invalid");
        } else {
          setError("No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.");
        }
        return;
      }
      verified.current = true;
      params.current = null;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setBusy(false);
      if (updateError.code === "weak_password") {
        setPasswordError("Esa contraseña es demasiado fácil de adivinar. Elige otra más segura.");
        passwordRef.current?.focus();
      } else if (updateError.code === "same_password") {
        setPasswordError("Elige una contraseña distinta a la anterior.");
        passwordRef.current?.focus();
      } else {
        setError("No pudimos guardar tu contraseña. Inténtalo de nuevo.");
      }
      return;
    }

    // La sesión creada por el enlace se cierra: la persona inicia sesión con
    // la contraseña recién creada.
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    setPassword("");
    setConfirm("");
    setBusy(false);
    setDone(true);
  }

  return (
    <main>
      <EnrollmentFlowFrame step={1} total={1} student>
        <div className={visual.surface}>
          <Card className="flex flex-col gap-5 md:p-8">
            {view === "loading" ? (
              <p role="status" className="text-sm text-text-secondary">
                Cargando…
              </p>
            ) : null}

            {view === "ready" && !done ? (
              <>
                <header className="flex flex-col gap-3">
                  <FlowStepIcon step={2} />
                  <h1 ref={headingRef} tabIndex={-1} className={TITLE_CLASS}>
                    Crea tu contraseña
                  </h1>
                  <p className="text-sm text-text-secondary">
                    Tu solicitud fue aprobada. Elige una contraseña de al menos {MIN_LENGTH}{" "}
                    caracteres para entrar a tu cuenta.
                  </p>
                </header>
                <form
                  onSubmit={(e) => void handleSubmit(e)}
                  noValidate
                  className="flex flex-col gap-4"
                >
                  <Input
                    ref={passwordRef}
                    name="newPassword"
                    label="Contraseña"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    error={passwordError ?? undefined}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError(null);
                    }}
                  />
                  <PasswordGuidance value={password} minimum={MIN_LENGTH} />
                  <Input
                    name="confirmPassword"
                    label="Confirmar contraseña"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirm}
                    error={confirmError ?? undefined}
                    onChange={(e) => {
                      setConfirm(e.target.value);
                      setConfirmError(null);
                    }}
                  />
                  <FormError>{error}</FormError>
                  <Button type="submit" isLoading={busy} className="min-h-11">
                    Crear mi contraseña
                  </Button>
                </form>
              </>
            ) : null}

            {view === "ready" && done ? (
              <>
                <span className={flowStyles.success}>
                  <EnrollmentIcon name="check" />
                </span>
                <h1 ref={headingRef} tabIndex={-1} className={TITLE_CLASS}>
                  Contraseña creada
                </h1>
                <p role="status" className="text-sm text-text-secondary">
                  Ya puedes iniciar sesión con tu correo y tu nueva contraseña.
                </p>
                <Button
                  className="min-h-11"
                  onClick={() => {
                    router.replace("/login");
                    router.refresh();
                  }}
                >
                  Iniciar sesión
                </Button>
              </>
            ) : null}

            {view === "expired" || view === "invalid" ? (
              <>
                <FlowStepIcon step={2} />
                <h1 ref={headingRef} tabIndex={-1} className={TITLE_CLASS}>
                  {view === "expired" ? "Este enlace ya no es válido" : "Enlace no válido"}
                </h1>
                <p className="text-sm text-text-secondary">
                  {view === "expired"
                    ? "El enlace venció o ya fue usado. Los enlaces son de un solo uso."
                    : "El enlace está incompleto o es incorrecto."}{" "}
                  Escríbenos para que te enviemos uno nuevo. Si ya creaste tu contraseña, inicia
                  sesión.
                </p>
                <a
                  href={whatsappHref(
                    "Hola, Colorados Drive. Mi enlace para crear la contraseña no funciona. ¿Me pueden enviar uno nuevo?",
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClassName("primary", "md", "min-h-11")}
                >
                  Pedir un enlace nuevo por WhatsApp
                </a>
                <Link href="/login" className={buttonClassName("secondary", "md", "min-h-11")}>
                  Iniciar sesión
                </Link>
              </>
            ) : null}
          </Card>
        </div>
      </EnrollmentFlowFrame>
    </main>
  );
}
