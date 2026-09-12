"use client";

import { useMemo, useState } from "react";

import { Button, Modal, Select } from "@/components/ui";
import { useFetch } from "@/hooks/useFetch";
import { addMonths, addWeeks, type CalendarViewMode } from "@/lib/utils/calendar";
import type { Cohort, PracticeSlot, UserSummary } from "@/types";

import { PracticeSlotCalendar } from "./PracticeSlotCalendar";
import { PracticeSlotDetail } from "./PracticeSlotDetail";
import { PracticeSlotForm } from "./PracticeSlotForm";

type ModalState =
  | { type: "closed" }
  | { type: "create"; initialScheduledAt?: string }
  | { type: "detail"; slot: PracticeSlot }
  | { type: "edit"; slot: PracticeSlot };

function buildSlotsPath(cohortId: string, instructorId: string): string {
  const params = new URLSearchParams();
  if (cohortId) params.set("cohortId", cohortId);
  if (instructorId) params.set("instructorId", instructorId);
  const query = params.toString();
  return `/practice-slots${query ? `?${query}` : ""}`;
}

export default function PracticeSlotsPage() {
  const [viewMode, setViewMode] = useState<CalendarViewMode>("semana");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [cohortId, setCohortId] = useState("");
  const [instructorId, setInstructorId] = useState("");
  const [modalState, setModalState] = useState<ModalState>({ type: "closed" });

  const { data: cohorts, error: cohortsError } = useFetch<Cohort[]>("/cohorts");
  const { data: instructors, error: instructorsError } = useFetch<UserSummary[]>(
    "/users?rol=instructor",
  );
  const { data: students, error: studentsError } = useFetch<UserSummary[]>("/users?rol=estudiante");

  const slotsPath = useMemo(
    () => buildSlotsPath(cohortId, instructorId),
    [cohortId, instructorId],
  );
  const {
    data: slots,
    isLoading: isLoadingSlots,
    error: slotsError,
    refetch: refetchSlots,
  } = useFetch<PracticeSlot[]>(slotsPath);

  const instructorsById = useMemo(
    () => new Map((instructors ?? []).map((user) => [user.id, user.nombreCompleto])),
    [instructors],
  );
  const studentsById = useMemo(
    () => new Map((students ?? []).map((user) => [user.id, user.nombreCompleto])),
    [students],
  );

  const error = cohortsError ?? instructorsError ?? studentsError ?? slotsError;
  const canCreate = Boolean(cohorts && instructors);

  function closeModal() {
    setModalState({ type: "closed" });
  }

  function handleSaved() {
    closeModal();
    refetchSlots();
  }

  function goToPrevious() {
    setCurrentDate((date) => (viewMode === "semana" ? addWeeks(date, -1) : addMonths(date, -1)));
  }

  function goToNext() {
    setCurrentDate((date) => (viewMode === "semana" ? addWeeks(date, 1) : addMonths(date, 1)));
  }

  const modalTitle =
    modalState.type === "create"
      ? "Nueva franja"
      : modalState.type === "edit"
        ? "Editar franja"
        : modalState.type === "detail"
          ? "Detalle de la franja"
          : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
          Horarios de práctica
        </h1>
        <Button onClick={() => setModalState({ type: "create" })} disabled={!canCreate}>
          Nueva franja
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Select
          label="Cohorte"
          name="cohortFilter"
          value={cohortId}
          onChange={(event) => setCohortId(event.target.value)}
        >
          <option value="">Todas las cohortes</option>
          {(cohorts ?? []).map((cohort) => (
            <option key={cohort.id} value={cohort.id}>
              {cohort.nombre}
            </option>
          ))}
        </Select>
        <Select
          label="Instructor"
          name="instructorFilter"
          value={instructorId}
          onChange={(event) => setInstructorId(event.target.value)}
        >
          <option value="">Todos los instructores</option>
          {(instructors ?? []).map((instructor) => (
            <option key={instructor.id} value={instructor.id}>
              {instructor.nombreCompleto}
            </option>
          ))}
        </Select>

        <div className="ml-auto flex flex-wrap items-end gap-2">
          <div className="flex gap-1">
            <Button variant="secondary" size="sm" aria-label="Anterior" onClick={goToPrevious}>
              ‹
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setCurrentDate(new Date())}>
              Hoy
            </Button>
            <Button variant="secondary" size="sm" aria-label="Siguiente" onClick={goToNext}>
              ›
            </Button>
          </div>
          <Select
            label="Vista"
            name="viewMode"
            value={viewMode}
            onChange={(event) => setViewMode(event.target.value as CalendarViewMode)}
          >
            <option value="semana">Semana</option>
            <option value="mes">Mes</option>
          </Select>
        </div>
      </div>

      {isLoadingSlots ? <p className="text-sm text-text-secondary">Cargando…</p> : null}
      {error ? <p className="text-sm text-accent-red">{error}</p> : null}

      {!isLoadingSlots && !error ? (
        <PracticeSlotCalendar
          slots={slots ?? []}
          instructorsById={instructorsById}
          studentsById={studentsById}
          viewMode={viewMode}
          currentDate={currentDate}
          onSelectSlot={(slot) => setModalState({ type: "detail", slot })}
          onSelectEmptyDay={(date) =>
            setModalState({ type: "create", initialScheduledAt: date.toISOString() })
          }
        />
      ) : null}

      <Modal isOpen={modalState.type !== "closed"} onClose={closeModal} title={modalTitle}>
        {modalState.type === "create" && cohorts && instructors ? (
          <PracticeSlotForm
            cohorts={cohorts}
            instructors={instructors}
            initialScheduledAt={modalState.initialScheduledAt}
            onSaved={handleSaved}
            onCancel={closeModal}
          />
        ) : null}

        {modalState.type === "edit" && cohorts && instructors ? (
          <PracticeSlotForm
            cohorts={cohorts}
            instructors={instructors}
            slot={modalState.slot}
            onSaved={handleSaved}
            onCancel={closeModal}
          />
        ) : null}

        {modalState.type === "detail" ? (
          <PracticeSlotDetail
            slot={modalState.slot}
            instructorName={instructorsById.get(modalState.slot.instructorId) ?? "—"}
            studentName={
              modalState.slot.studentId
                ? (studentsById.get(modalState.slot.studentId) ?? "—")
                : null
            }
            onEdit={() => setModalState({ type: "edit", slot: modalState.slot })}
            onDeleted={handleSaved}
          />
        ) : null}
      </Modal>
    </div>
  );
}
