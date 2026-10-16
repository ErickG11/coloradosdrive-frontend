"use client";
import Link from "next/link";
import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Select, buttonClassName } from "@/components/ui";
import { useFetch } from "@/hooks/useFetch";
import { ApiError } from "@/lib/api/errors";
import {
  deleteStudent,
  studentActionError,
  studentDeletedHref,
  studentDeletionsHref,
} from "@/lib/api/studentActions";
import type { StudentDeletions, StudentDeletionOperation } from "@/types/student";

const phases: Record<StudentDeletionOperation["phase"], string> = {
  bloqueo: "Bloqueo de acceso",
  storage: "Archivos y datos",
  auth: "Cuenta de acceso",
  completo: "Completada",
};
function StudentDeletionsList() {
  const params = useSearchParams(),
    router = useRouter();
  const state = ["pendiente", "fallido"].includes(params.get("estado") ?? "")
    ? params.get("estado")!
    : "";
  const requestedPage = Number(params.get("page") ?? 1);
  const page =
    Number.isInteger(requestedPage) && requestedPage >= 1 && requestedPage <= 100000
      ? requestedPage
      : 1;
  const query = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (state) query.set("estado", state);
  const list = useFetch<StudentDeletions>(`/admin/estudiantes/eliminaciones?${query}`);
  const [busyId, setBusyId] = useState<string | null>(null),
    lock = useRef(false);
  const [message, setMessage] = useState<string | null>(null),
    [copyNotice, setCopyNotice] = useState<string | null>(null);
  const pages = Math.max(1, Math.ceil((list.data?.total ?? 0) / 20));
  function navigate(nextPage: number, nextState = state) {
    const q = new URLSearchParams({ page: String(nextPage) });
    if (nextState) q.set("estado", nextState);
    router.replace(`${studentDeletionsHref}?${q}`, { scroll: false });
  }
  async function retry(id: string) {
    if (lock.current) return;
    lock.current = true;
    setBusyId(id);
    setMessage(null);
    let completed = false;
    try {
      const op = await deleteStudent(id);
      if (op.status === "completo") {
        completed = true;
        router.replace(studentDeletedHref);
        return;
      }
      setMessage("La eliminación sigue pendiente. Revisa la fase antes de reintentar.");
      list.refetch();
    } catch (error) {
      const failure = studentActionError(error);
      setMessage(
        failure.verify
          ? "No se pudo confirmar la eliminación; verifica la fase actualizada en esta lista antes de reintentar."
          : failure.message,
      );
      list.refetch();
    } finally {
      if (!completed) {
        lock.current = false;
        setBusyId(null);
      }
    }
  }
  async function copy(id: string) {
    try {
      await navigator.clipboard.writeText(id);
      setCopyNotice(`UUID copiado: ${id}`);
    } catch {
      setCopyNotice(
        "No se pudo copiar el UUID. Puedes seleccionarlo en la tabla y copiarlo manualmente.",
      );
    }
  }
  return (
    <div className="flex flex-col gap-6">
      <Link className={buttonClassName("secondary", "sm", "self-start")} href="/admin/students">
        Volver a Alumnos
      </Link>
      <h1 className="font-display text-2xl font-bold text-text-primary">
        Eliminaciones pendientes
      </h1>
      <p className="text-sm text-text-secondary">
        Reanuda operaciones ya confirmadas. Funciona aunque la ficha del alumno ya no exista.
      </p>
      <Select
        id="deletion-state"
        label="Estado de eliminación"
        value={state}
        disabled={busyId !== null}
        onChange={(e) => navigate(1, e.target.value)}
      >
        <option value="">Pendientes y fallidas</option>
        <option value="pendiente">Pendientes</option>
        <option value="fallido">Fallidas</option>
      </Select>
      {message && (
        <p role="alert" className="text-accent-red">
          {message}
        </p>
      )}
      {copyNotice && <p role="status">{copyNotice}</p>}
      {list.isLoading ? (
        <p role="status">Cargando eliminaciones…</p>
      ) : list.error ? (
        <div role="alert" className="space-y-3 text-accent-red">
          <p>
            {!list.errorCode || list.errorCode === "UNCONFIRMED"
              ? list.error
              : studentActionError(
                  new ApiError(list.error, list.errorStatus ?? 500, {
                    code: list.errorCode ?? undefined,
                  }),
                ).message}
          </p>
          <Button variant="secondary" onClick={list.refetch}>
            Reintentar consulta
          </Button>
        </div>
      ) : list.data?.items.length ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  {["UUID del alumno", "Estado", "Fase pendiente", "Actualizado", "Acciones"].map(
                    (title) => (
                      <th key={title} scope="col" className="px-3 py-2">
                        {title}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((op) => (
                  <tr key={op.student_id} className="border-t border-border">
                    <td className="px-3 py-3">
                      <code className="select-text whitespace-nowrap">{op.student_id}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Copiar UUID ${op.student_id}`}
                        onClick={() => void copy(op.student_id)}
                      >
                        Copiar UUID
                      </Button>
                    </td>
                    <td className="px-3 py-3">
                      {op.status === "fallido" ? "Fallida" : "Pendiente"}
                    </td>
                    <td className="px-3 py-3">
                      {phases[op.phase]}
                      <p className="text-text-secondary">Reintentos: {op.retry_count}</p>
                    </td>
                    <td className="px-3 py-3">
                      <time dateTime={op.updated_at}>
                        {new Intl.DateTimeFormat("es-EC", {
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(new Date(op.updated_at))}
                      </time>
                    </td>
                    <td className="px-3 py-3">
                      <Button
                        variant="secondary"
                        disabled={busyId !== null}
                        isLoading={busyId === op.student_id}
                        aria-label={`Reintentar eliminación ${op.student_id}`}
                        onClick={() => void retry(op.student_id)}
                      >
                        Reintentar eliminación
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <p>No hay eliminaciones pendientes o fallidas.</p>
      )}
      <nav aria-label="Paginación de eliminaciones" className="flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          disabled={list.isLoading || busyId !== null || page <= 1}
          onClick={() => navigate(page - 1)}
        >
          Anterior
        </Button>
        <span>
          Página {page} de {pages}
        </span>
        <Button
          variant="secondary"
          disabled={list.isLoading || busyId !== null || page >= pages}
          onClick={() => navigate(page + 1)}
        >
          Siguiente
        </Button>
      </nav>
    </div>
  );
}
export default function StudentDeletionsPage() {
  return (
    <Suspense fallback={<p role="status">Cargando eliminaciones…</p>}>
      <StudentDeletionsList />
    </Suspense>
  );
}
