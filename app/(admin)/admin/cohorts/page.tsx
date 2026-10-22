"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { buttonClassName, FormError, IconButton, iconButtonClassName } from "@/components/ui";
import { EditIcon, TrashIcon } from "@/components/ui/icons";
import { useFetch } from "@/hooks/useFetch";
import { formatMoney } from "@/lib/utils/money";
import type { Cohort, Course } from "@/types";

import { DeleteCohortModal } from "./DeleteCohortModal";

function courseLabel(course: Course | undefined): string {
  if (!course) {
    return "—";
  }
  return `${course.nombre} (Tipo ${course.tipo})`;
}

// Avisos que llegan desde el formulario (?aviso=...) tras crear o guardar.
const NOTICES: Record<string, string> = {
  "cohorte-creada": "Cohorte creada correctamente.",
  "cohorte-guardada": "Cambios guardados correctamente.",
};

// Región viva siempre montada: el texto se agrega después del montaje (así se
// anuncia). Se oculta mientras se abre o completa una eliminación.
function CohortNotice({ hidden }: { hidden: boolean }) {
  const params = useSearchParams();
  // Se lee una sola vez: el aviso sigue visible aunque luego se limpie la URL.
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const found = NOTICES[params.get("aviso") ?? ""];
    if (!found) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotice(found);
    // Quita ?aviso de la URL (sin navegar) para que recargar o volver con
    // Atrás/Adelante no repita el aviso.
    window.history.replaceState(window.history.state, "", window.location.pathname);
  }, [params]);

  return (
    <p role="status" className="text-sm text-accent-blue empty:hidden">
      {hidden ? "" : notice}
    </p>
  );
}

export default function CohortsPage() {
  const {
    data: cohorts,
    isLoading: isLoadingCohorts,
    error: cohortsError,
    refetch: refetchCohorts,
  } = useFetch<Cohort[]>("/cohorts");
  const {
    data: courses,
    isLoading: isLoadingCourses,
    error: coursesError,
  } = useFetch<Course[]>("/courses");

  // Con datos ya cargados, un refetch no reemplaza la tabla por «Cargando…».
  const isLoading = (isLoadingCohorts && !cohorts) || (isLoadingCourses && !courses);
  const error = cohortsError ?? coursesError;
  const coursesById = new Map((courses ?? []).map((course) => [course.id, course]));
  const [toDelete, setToDelete] = useState<Cohort | null>(null);
  const [deletedMessage, setDeletedMessage] = useState<string | null>(null);
  // Ids eliminados en esta pantalla: la fila desaparece al instante, sin
  // esperar a que vuelva la lista del servidor.
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const deletedRef = useRef<HTMLParagraphElement>(null);
  const visibleCohorts = (cohorts ?? []).filter((cohort) => !removedIds.includes(cohort.id));

  // Al cerrar el modal el foco se pierde: pasa al mensaje de éxito.
  useEffect(() => {
    if (deletedMessage) deletedRef.current?.focus();
  }, [deletedMessage]);

  function handleDeleted(cohort: Cohort, message: string) {
    setToDelete(null);
    setRemovedIds((ids) => [...ids, cohort.id]);
    setDeletedMessage(message);
    refetchCohorts();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
          Cohortes
        </h1>
        <Link href="/admin/cohorts/new" className={buttonClassName()}>
          Nueva cohorte
        </Link>
      </div>

      <Suspense fallback={null}>
        <CohortNotice hidden={toDelete !== null || deletedMessage !== null} />
      </Suspense>
      {/* Región viva siempre montada: solo cambia su texto. */}
      <p
        ref={deletedRef}
        role="status"
        tabIndex={-1}
        className="text-sm text-accent-blue outline-none empty:hidden"
      >
        {deletedMessage}
      </p>

      {isLoading ? <p className="text-sm text-text-secondary">Cargando…</p> : null}
      {error ? <FormError>{error}</FormError> : null}

      {!isLoading && !error ? (
        <div className="overflow-x-auto rounded-md border border-border bg-bg-surface backdrop-blur-md">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-bg-sunken">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-text-secondary">Cohorte</th>
                <th className="px-4 py-2 text-left font-medium text-text-secondary">Curso</th>
                <th className="px-4 py-2 text-left font-medium text-text-secondary">Precio</th>
                <th className="px-4 py-2 text-left font-medium text-text-secondary">Creada</th>
                <th className="px-4 py-2 text-left font-medium text-text-secondary">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleCohorts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-text-secondary">
                    Todavía no hay cohortes.
                  </td>
                </tr>
              ) : (
                visibleCohorts.map((cohort) => (
                  <tr key={cohort.id}>
                    <td className="px-4 py-2 text-text-primary">{cohort.nombre}</td>
                    <td className="px-4 py-2 text-text-secondary">
                      {courseLabel(coursesById.get(cohort.courseId))}
                    </td>
                    <td className="px-4 py-2 text-text-secondary">{formatMoney(cohort.precio)}</td>
                    <td className="px-4 py-2 text-text-secondary">
                      {new Date(cohort.createdAt).toLocaleDateString("es-EC")}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/cohorts/${cohort.id}/edit`}
                          aria-label={`Editar ${cohort.nombre}`}
                          title={`Editar ${cohort.nombre}`}
                          className={iconButtonClassName("ghost")}
                        >
                          <EditIcon className="h-5 w-5" />
                        </Link>
                        <IconButton
                          variant="danger"
                          icon={<TrashIcon className="h-5 w-5" />}
                          aria-label={`Eliminar ${cohort.nombre}`}
                          onClick={() => {
                            setDeletedMessage(null);
                            setToDelete(cohort);
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {toDelete ? (
        <DeleteCohortModal
          cohort={toDelete}
          courseLabel={courseLabel(coursesById.get(toDelete.courseId))}
          onClose={() => setToDelete(null)}
          onDeleted={(message) => handleDeleted(toDelete, message)}
          onGone={refetchCohorts}
        />
      ) : null}
    </div>
  );
}
