"use client";
import { EnrollmentActionLink } from "@/components/inscripcion/EnrollmentActionLink";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/inscripcion/EnrollmentField";
import { Select } from "@/components/inscripcion/EnrollmentField";
import { Card } from "@/components/ui/Card";
import { FormError } from "@/components/ui/FormError";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { solicitudes, solicitudMessage } from "@/lib/api/solicitudes";
import type { PublicCourse } from "@/types/publicCourse";
import type { SolicitudProgress, SolicitudSession } from "@/types/solicitud";
import { emailError } from "./validation";
import { ReviewAndSend } from "./ReviewAndSend";
import type { DocumentoTipo } from "@/types/solicitud";
import { ExistingApplicationStatus } from "./ExistingApplicationStatus";
import { SentStep } from "./SentStep";
import { firstIncompleteStep, type InscripcionStep } from "./flowProgress";
import { DocumentsStep } from "./DocumentsStep";
import { DataStep } from "./DataStep";
import { ConsentStep } from "./ConsentStep";
import { CodeStep } from "./CodeStep";
import { Toast } from "./Toast";
import { ENROLLMENT_STEPS, ProgressSummary } from "./ProgressSummary";
import styles from "./inscripcion.module.css";

export function InscripcionFlow({ initialCourseId = "" }: { initialCourseId?: string }) {
  const [courses, setCourses] = useState<PublicCourse[]>([]);
  const [courseId, setCourseId] = useState(initialCourseId);
  const [correo, setCorreo] = useState("");
  const [step, setStep] = useState<InscripcionStep>("correo");
  const [recoveryStep, setRecoveryStep] = useState<InscripcionStep>("codigo");
  const [missingDocuments, setMissingDocuments] = useState<DocumentoTipo[]>([]);
  const [progress, setProgress] = useState<SolicitudProgress | null>(null);
  const [session, setSession] = useState<SolicitudSession | null>(null);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [retry, setRetry] = useState(0);
  const heading = useRef<HTMLSpanElement>(null),
    sending = useRef(false);
  useEffect(() => {
    let alive = true;
    solicitudes
      .courses()
      .then((rows) => {
        if (alive) {
          setCourses(rows);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (alive) {
          setError(solicitudMessage(e));
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [retry]);
  useEffect(() => {
    heading.current?.focus();
  }, [step, loading]);
  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (sending.current) return;
    if (!courses.some((c) => c.id === courseId)) {
      setError("Selecciona un curso disponible para continuar.");
      return;
    }
    const invalidEmail = emailError(correo);
    if (invalidEmail) {
      setError(invalidEmail);
      document.getElementById("applicant-email")?.focus();
      return;
    }
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      await solicitudes.sendCode(correo.trim().toLowerCase(), courseId);
      setStep("codigo");
      setMessage("Código enviado. Revisa tu correo.");
    } catch (e) {
      setError(solicitudMessage(e));
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  async function resume(s: SolicitudSession) {
    setSession(s);
    if (step !== "reanudando") setRecoveryStep(step);
    setStep("reanudando");
    setError("");
    setBusy(true);
    try {
      const p = await solicitudes.progress(s);
      setProgress(p);
      setCourseId(p.courseId);
      setStep(firstIncompleteStep(p));
      setMessage("Progreso recuperado.");
    } catch (e) {
      setError(solicitudMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className={`${styles.page} ${styles.enrollmentPage}`}>
      <div className={`${styles.flow} ${styles.enrollmentFlow}`}>
        <div className={styles.actions}>
          <EnrollmentActionLink href="/">Volver al inicio</EnrollmentActionLink>
          <ThemeToggle />
        </div>
        <header className={styles.pageHeading}>
          <span className={styles.eyebrow}>Colorados Drive</span>
          <h1>Solicitar inscripción</h1>
        </header>
        <Toast message={message} onDismiss={() => setMessage("")} />
        <div className={styles.workspace}>
          <ProgressSummary
            step={
              step === "reanudando"
                ? recoveryStep
                : ["estado", "enviado"].includes(step)
                  ? "revision"
                  : step
            }
            course={courses.find((c) => c.id === courseId)?.nombre}
            correo={correo}
            verified={Boolean(session)}
          />
          <div className={styles.currentStep}>
            {loading || courses.length === 0 ? <FormError>{error}</FormError> : null}
            {loading ? (
              <p role="status">Cargando cursos…</p>
            ) : courses.length === 0 ? (
              <Card>
                <p>No pudimos cargar los cursos.</p>
                <Button
                  onClick={() => {
                    setLoading(true);
                    setError("");
                    setRetry(retry + 1);
                  }}
                >
                  Reintentar
                </Button>
              </Card>
            ) : (
              <Card
                className={styles.stepPanel}
                title={
                  <span ref={heading} tabIndex={-1}>
                    {step === "correo"
                      ? "1. Curso y correo"
                      : step === "codigo"
                        ? "2. Verifica tu correo"
                        : step === "consentimiento"
                          ? "3. Consentimiento"
                          : step === "datos"
                            ? "4. Datos personales"
                            : step === "documentos"
                              ? "5. Documentos"
                              : step === "revision"
                                ? "6. Revisar y enviar"
                                : step === "estado"
                                  ? "Estado de tu solicitud"
                                  : step === "enviado"
                                    ? "Solicitud enviada"
                                    : "Recuperando tu solicitud"}
                  </span>
                }
              >
                <p className={styles.stepHelp}>
                  {ENROLLMENT_STEPS.find((item) => item.key === step)?.help ??
                    "Espera mientras recuperamos tu progreso."}
                </p>
                {session && progress ? (
                  <p className={styles.originalCourse}>
                    Curso solicitado:{" "}
                    {courses.find((c) => c.id === progress.courseId)?.nombre ??
                      "Curso original conservado"}
                  </p>
                ) : null}
                {step !== "correo" ? <FormError>{error}</FormError> : null}
                <div key={step} className={styles.stepEntry}>
                  {step === "estado" && progress ? (
                    <ExistingApplicationStatus
                      progress={progress}
                      course={courses.find((c) => c.id === courseId)?.nombre}
                      onDocuments={() => setStep("documentos")}
                    />
                  ) : step === "correo" ? (
                    <form onSubmit={send} className={styles.form} noValidate>
                      <Select
                        label="Curso"
                        value={courseId}
                        onChange={(e) => setCourseId(e.target.value)}
                        required
                        error={error.includes("curso") ? error : undefined}
                        aria-describedby="course-help"
                      >
                        <option value="">Selecciona un curso</option>
                        {courses.map((c) => (
                          <option key={c.id} value={c.id}>
                            Tipo {c.tipo} — {c.nombre}
                          </option>
                        ))}
                      </Select>
                      <p id="course-help" className={styles.fieldHelp}>
                        El curso se conserva después de guardar tus datos.
                      </p>
                      <Input
                        id="applicant-email"
                        maxLength={254}
                        onBlur={() => {
                          const error = emailError(correo);
                          if (error) setError(error);
                        }}
                        label="Correo electrónico"
                        type="email"
                        autoComplete="email"
                        value={correo}
                        onChange={(e) => setCorreo(e.target.value)}
                        required
                        error={error && !error.includes("curso") ? error : undefined}
                        aria-describedby="email-help"
                      />
                      <p id="email-help" className="text-sm text-text-secondary">
                        Usaremos este correo para verificar tu solicitud y enviarte la respuesta.
                      </p>
                      <div className={styles.stepActions}>
                        <Button type="submit" isLoading={busy}>
                          Enviar código
                        </Button>
                      </div>
                    </form>
                  ) : step === "codigo" ? (
                    <CodeStep
                      correo={correo}
                      courseId={courseId}
                      onNotice={setMessage}
                      onBack={() => {
                        setStep("correo");
                        setError("");
                      }}
                      onVerified={(s) => {
                        void resume(s);
                      }}
                    />
                  ) : session && step === "consentimiento" ? (
                    <ConsentStep
                      session={session}
                      onAccepted={() => {
                        void resume(session);
                      }}
                    />
                  ) : session && step === "datos" ? (
                    <DataStep
                      session={session}
                      onSaved={(s) => {
                        void resume(s);
                      }}
                    />
                  ) : session && step === "documentos" ? (
                    <DocumentsStep
                      session={session}
                      initialDocuments={progress?.documentos}
                      missing={missingDocuments}
                      sent={Boolean(progress?.enviadaAt)}
                      onUploaded={(tipo, estado) =>
                        setProgress((previous) =>
                          previous
                            ? {
                                ...previous,
                                documentos: [
                                  ...previous.documentos.filter((doc) => doc.tipo !== tipo),
                                  { tipo, estado },
                                ],
                              }
                            : previous,
                        )
                      }
                      onNotice={setMessage}
                      onFinish={() => {
                        setStep(progress?.enviadaAt ? "estado" : "revision");
                      }}
                    />
                  ) : step === "revision" && session ? (
                    <ReviewAndSend
                      session={session}
                      documents={progress?.documentos ?? []}
                      onBack={(missing) => {
                        setMissingDocuments(missing);
                        setStep("documentos");
                      }}
                      onSubmitted={(result) => {
                        setProgress((previous) =>
                          previous
                            ? { ...previous, estado: result.estado, enviadaAt: result.enviadaAt }
                            : previous,
                        );
                        setStep("enviado");
                        setMessage("Solicitud enviada para revisión.");
                      }}
                    />
                  ) : step === "enviado" ? (
                    <SentStep onDocuments={() => setStep("documentos")} />
                  ) : (
                    <div className={styles.form}>
                      <p role="status">
                        {busy ? "Recuperando progreso…" : "Puedes volver a consultar tu progreso."}
                      </p>
                      {session ? (
                        <Button disabled={busy} onClick={() => void resume(session)}>
                          Reintentar recuperación
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        disabled={busy}
                        onClick={() => {
                          setSession(null);
                          setProgress(null);
                          setStep("correo");
                          setError("");
                        }}
                      >
                        Volver a verificar correo
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
        <Link href="/login">Iniciar sesión</Link>
      </div>
    </main>
  );
}
