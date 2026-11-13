import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { StudentSchedulePicker } from "@/components/student-enrollment/StudentSchedulePicker";
import { studentScheduleApi } from "@/lib/api/studentSchedule";
import type { useStudentReservation } from "@/components/student-enrollment/useStudentReservation";
vi.mock("@/lib/api/studentSchedule", () => ({
  studentScheduleApi: {
    rules: vi.fn(),
    calendar: vi.fn(),
    options: vi.fn(),
    preview: vi.fn(),
    reserve: vi.fn(),
  },
  scheduleError: () => "Error de prueba",
}));
vi.mock("@/components/student-enrollment/WaitlistControl", () => ({
  NoOpenCoursePanel: () => <p>Sin curso abierto</p>,
  WaitlistControl: () => null,
}));
const fechas = ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20"];
const days = fechas.map((fecha) => ({
  fecha,
  horas: 2,
  horaInicio: "07:00",
  horaFin: "09:00",
  inicio: `${fecha}T12:00:00Z`,
  fin: `${fecha}T14:00:00Z`,
  disponible: true,
  motivo: null,
}));
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(studentScheduleApi.rules).mockResolvedValue({
    active: true,
    serverNow: "2026-11-12T12:00:00Z",
    endHour: 22,
    options: [
      {
        modalidad: "entre_semana",
        horasPorDia: 1,
        sesiones: 10,
        totalHoras: 10,
        habilitada: true,
        primeraFecha: fechas[0],
        ultimaFecha: "2026-11-27",
      },
      {
        modalidad: "entre_semana",
        horasPorDia: 2,
        sesiones: 5,
        totalHoras: 10,
        habilitada: true,
        primeraFecha: fechas[0],
        ultimaFecha: fechas[4],
      },
    ],
  });
  vi.mocked(studentScheduleApi.calendar).mockResolvedValue({
    serverNow: "2026-11-12T12:00:00Z",
    dias: [{ fecha: fechas[0], disponible: true, planDays: days }],
  });
  vi.mocked(studentScheduleApi.options).mockResolvedValue({
    enrollmentId: "e",
    serverNow: "2026-11-12T12:00:00Z",
    horasRequeridas: 10,
    fechaInicioEfectiva: fechas[0],
    ajustada: false,
    cohorte: null,
    sinCohorte: null,
    horas: [{ hora: "07:00", factible: true, motivo: null, diasFallan: [] }],
  });
  vi.mocked(studentScheduleApi.preview).mockResolvedValue({
    enrollmentId: "e",
    serverNow: "2026-11-12T12:00:00Z",
    precioCentavos: 15000,
    modalidad: "entre_semana",
    horasTotales: 10,
    horasPorDia: 2,
    horaInicio: "07:00",
    fechaInicioSolicitada: fechas[0],
    fechaInicioEfectiva: fechas[0],
    ajustada: false,
    dias: days,
    ultimaFecha: fechas[4],
    ultimaHoraFin: "09:00",
    ultimoFin: days[4].fin,
    cohorte: null,
    sinCohorte: null,
    diasFallan: [],
    factible: true,
  });
});
it("resumen fijo y Continuar deshabilitado hasta elegir horas, fecha y horario; reserva al continuar", async () => {
  const user = userEvent.setup(),
    onReserved = vi.fn();
  const state = {
    ready: true,
    held: false,
    error: null,
    checking: false,
    reservation: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useStudentReservation>;
  vi.mocked(studentScheduleApi.reserve).mockResolvedValue({ id: "r" } as Awaited<
    ReturnType<typeof studentScheduleApi.reserve>
  >);
  render(
    <StudentSchedulePicker
      enrollmentId="e"
      state={state}
      onReserved={onReserved}
      onNext={vi.fn()}
    />,
  );
  const next = screen.getByRole("button", { name: "Continuar" });
  expect(next).toBeDisabled();
  await user.click(await screen.findByRole("button", { name: /2 horas por día/ }));
  expect(next).toBeDisabled();
  await waitFor(() =>
    expect(screen.getByRole("button", { name: /lun.*16/i })).toHaveAttribute(
      "aria-disabled",
      "false",
    ),
  );
  await user.click(screen.getByRole("button", { name: /lun.*16/i }));
  expect(next).toBeDisabled();
  await user.click(await screen.findByRole("button", { name: "07:00 – 09:00" }));
  await waitFor(() => expect(next).toBeEnabled());
  expect(screen.getByText(/10 horas en total/)).toBeInTheDocument();
  expect(screen.getByText(/Precio del curso:.*150.*Se fija al reservar/)).toBeInTheDocument();
  expect(screen.getByLabelText("Resumen del plan")).toHaveClass("sticky", "bottom-0");
  await user.click(next);
  await waitFor(() => expect(onReserved).toHaveBeenCalledWith({ id: "r" }));
  expect(studentScheduleApi.reserve).toHaveBeenCalledWith("e", {
    modalidad: "entre_semana",
    horasPorDia: 2,
    fechaInicio: "2026-11-16",
    horaInicio: 7,
  });
});
