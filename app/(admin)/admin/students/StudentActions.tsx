"use client";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Modal, buttonClassName } from "@/components/ui";
import {
  deleteStudent,
  setStudentAccess,
  studentActionError,
  studentDeletedHref,
  studentDeletionsHref,
} from "@/lib/api/studentActions";
import type { StudentDetail } from "@/types";

export function StudentActions({
  student,
  disabled,
  deletionPending,
  onBusyChange,
  onChanged,
  onPending,
  onReload,
}: {
  student: StudentDetail;
  disabled: boolean;
  deletionPending: boolean;
  onBusyChange: (busy: boolean) => void;
  onChanged: (message: string) => void;
  onPending: () => void;
  onReload: () => void;
}) {
  const router = useRouter();
  const [action, setAction] = useState<"desactivar" | "reactivar" | "eliminar" | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [failure, setFailure] = useState<ReturnType<typeof studentActionError> | null>(null);
  const [started, setStarted] = useState(false);
  function close() {
    if (!submitting.current) {
      setAction(null);
      setConfirmation("");
      setFailure(null);
      setStarted(false);
    }
  }
  function open(next: typeof action) {
    setConfirmation("");
    setFailure(null);
    setStarted(false);
    setAction(next);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (
      !action ||
      submitting.current ||
      started ||
      failure?.verify ||
      failure?.pending ||
      (action === "eliminar" && confirmation !== student.cedula)
    )
      return;
    submitting.current = true;
    setBusy(true);
    onBusyChange(true);
    setFailure(null);
    const typed = confirmation;
    setConfirmation("");
    try {
      if (action === "eliminar") {
        const op = await deleteStudent(student.id, typed);
        if (op.status === "completo") {
          setStarted(true);
          router.replace(studentDeletedHref);
          return;
        }
        setStarted(true);
        onPending();
        setFailure({
          message: "Eliminación iniciada; consulta su estado para completarla.",
          pending: true,
        });
      } else {
        const result = await setStudentAccess(student.id, action === "reactivar");
        const conflicts = result.reservas.some((r) => r.status === "pendiente_reprogramar");
        const message = !result.activo
          ? "Acceso desactivado. Se liberaron las reservas futuras."
          : result.recuperacionPendiente
            ? "Acceso reactivado. No se pudo confirmar toda la recuperación; consulta las reservas pendientes."
            : conflicts
              ? "Acceso reactivado. Hay reservas pendientes de reprogramar."
              : "Acceso reactivado correctamente.";
        setAction(null);
        onChanged(message);
      }
    } catch (error) {
      const state = studentActionError(error);
      setFailure(state);
      if (state.pending || (action === "eliminar" && state.verify)) {
        setStarted(true);
        onPending();
      }
    } finally {
      submitting.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  }
  return (
    <>
      <p className="text-sm text-text-secondary">
        Estado de acceso: <strong>{student.activo ? "Activo" : "Inactivo"}</strong>
      </p>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="secondary"
          disabled={disabled || busy || deletionPending}
          onClick={() => open(student.activo ? "desactivar" : "reactivar")}
        >
          {student.activo ? "Desactivar" : "Reactivar"}
        </Button>
        <Button
          variant="danger"
          disabled={disabled || busy || deletionPending}
          onClick={() => open("eliminar")}
        >
          Eliminar definitivamente
        </Button>
        {deletionPending && (
          <Link className={buttonClassName("secondary")} href={studentDeletionsHref}>
            Ver eliminaciones pendientes
          </Link>
        )}
      </div>
      <Modal
        isOpen={action !== null}
        onClose={close}
        title={
          action === "eliminar"
            ? `Eliminar definitivamente a ${student.nombreCompleto}`
            : action === "reactivar"
              ? "Reactivar alumno"
              : "Desactivar alumno"
        }
      >
        <form onSubmit={submit} className="flex flex-col gap-4" aria-busy={busy}>
          {action === "eliminar" ? (
            <>
              <p>Esta acción no se puede deshacer. Se eliminarán:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Su cuenta de acceso</li>
                <li>Sus matrículas y checklist de documentos</li>
                <li>Los exámenes que haya rendido</li>
                <li>Sus prácticas</li>
                <li>Sus solicitudes de inscripción y archivos adjuntos</li>
              </ul>
              <p>
                Si solo quieres que no pueda ingresar, usa &quot;Desactivar&quot;: es reversible.
              </p>
              {!started && (
                <Input
                  id="deletion-confirmation"
                  label="Para confirmar, escribe la cédula del alumno:"
                  autoComplete="off"
                  inputMode="numeric"
                  value={confirmation}
                  disabled={busy}
                  onChange={(e) => setConfirmation(e.target.value)}
                  error={failure?.invalidConfirmation ? failure.message : undefined}
                />
              )}
            </>
          ) : (
            <p>
              {action === "desactivar"
                ? "El alumno no podrá ingresar. Sus prácticas futuras se liberarán; se conservarán sus matrículas, pagos y asistencia. Esta acción es reversible."
                : "Se habilitará el acceso y se intentará recuperar cada reserva cancelada por desactivación. Los conflictos quedarán pendientes de reprogramar."}
            </p>
          )}
          {/* La confirmación inválida ya se muestra junto al campo (role=alert): no se repite. */}
          {failure && !failure.invalidConfirmation && (
            <div role="alert" className="space-y-3 text-accent-red">
              <p>{failure.message}</p>
              {(failure.pending || started) && (
                <Link className={buttonClassName("secondary")} href={studentDeletionsHref}>
                  Consultar eliminaciones pendientes
                </Link>
              )}
              {failure.verify && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    close();
                    onReload();
                  }}
                >
                  Recargar ficha
                </Button>
              )}
            </div>
          )}
          {started && (
            <p>La operación puede haberse iniciado. Cerrar esta pantalla no la revierte.</p>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="secondary" disabled={busy} onClick={close}>
              {started ? "Cerrar" : "Cancelar"}
            </Button>
            {!started && (
              <Button
                type="submit"
                variant={action === "eliminar" ? "danger" : "primary"}
                isLoading={busy}
                disabled={
                  Boolean(failure?.verify || failure?.pending) ||
                  (action === "eliminar" && confirmation !== student.cedula)
                }
              >
                {action === "eliminar"
                  ? "Eliminar definitivamente"
                  : action === "reactivar"
                    ? "Reactivar"
                    : "Desactivar"}
              </Button>
            )}
          </div>
        </form>
      </Modal>
    </>
  );
}
