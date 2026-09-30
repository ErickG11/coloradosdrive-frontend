import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EnrollmentWizard } from "@/app/(admin)/admin/enrollments/wizard/EnrollmentWizard";
import { StepPracticas } from "@/app/(admin)/admin/enrollments/wizard/StepPracticas";
import { BASE, type CourseSelection } from "@/app/(admin)/admin/enrollments/wizard/wizardTypes";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
vi.mock("@/lib/api/client", () => ({ api: { get: vi.fn(), post: vi.fn() } }));
const get = vi.mocked(api.get),
  post = vi.mocked(api.post);
const cohort = {
  id: "cohort-a",
  course_id: "course-a",
  nombre: "Cohorte A",
  precio: "400",
  cupo_maximo: 20,
  ocupados: 2,
  fecha_inicio_matricula: "2026-09-01",
  fecha_fin_matricula: "2026-10-31",
  fecha_inicio_curso: "2026-11-01",
  fecha_fin_curso: "2026-12-31",
};
const selection: CourseSelection = {
  courseId: "course-a",
  courseTipo: "A",
  courseNombre: "Motocicletas",
  cohortId: "cohort-a",
  manualOverride: false,
  cohort,
};
const plan = {
  timezone: "America/Guayaquil",
  semanas: 1,
  modalidad: "entre_semana",
  fechaInicio: "2026-09-30",
  primerDiaEfectivo: "2026-09-30",
  fechaFin: "2026-10-06",
  fechaFinElegida: "2026-10-06",
  manual: false,
  fechas: ["2026-09-30"],
  dias: 5,
  bloques: 10,
  horas: 10,
};
const suggestion = {
  fechas: ["2026-09-30"],
  horaDeseada: "08:00",
  horaResuelta: "08:00",
  horaAjustada: false,
  instructoresSugeridos: [{ id: "instructor", nombreCompleto: "Instructor local" }],
  totalSesiones: 5,
  horasProgramadas: 10,
  horasRequeridas: 20,
};
const result = {
  operationId: "op",
  studentId: "student",
  studentCreated: true,
  enrollmentId: "e",
  courseId: "course-a",
  courseType: "A",
  cohortId: "cohort-a",
  status: "activo",
  slotsCreated: 10,
  emailStatus: "sent",
  plan,
};
beforeEach(() => {
  vi.resetAllMocks();
  sessionStorage.clear();
  get.mockImplementation(async (path) =>
    path === `${BASE}/catalog`
      ? [
          { tipo: "A", nombre: "Motocicletas", courseId: "course-a" },
          { tipo: "B", nombre: "Vehículos livianos", courseId: "course-b" },
        ]
      : [],
  );
  post.mockImplementation(async (path) => {
    if (path === `${BASE}/course-preview`)
      return {
        courseId: "course-a",
        tipo: "A",
        suggestion: { cohortId: "cohort-a", warning: null },
        cohorts: [cohort],
      };
    if (path === `${BASE}/plan`) return plan;
    if (path === `${BASE}/practice-preview`) return { plan, suggestion };
    if (path === `${BASE}/confirm`) return result;
    throw Error(`Unexpected ${path}`);
  });
});
async function draft(existing = false) {
  const user = userEvent.setup();
  render(<EnrollmentWizard />);
  if (existing) {
    get.mockImplementation(async (path) =>
      path === `${BASE}/catalog`
        ? [
            { tipo: "A", nombre: "Motocicletas", courseId: "course-a" },
            { tipo: "B", nombre: "Vehículos livianos", courseId: "course-b" },
          ]
        : [
            {
              id: "student",
              cedula: "1234567890",
              nombreCompleto: "Ana existente",
              correo: "ana@example.test",
              vigentes: [{ tipo: "B", status: "activo" }],
            },
          ],
    );
    await user.click(screen.getByRole("button", { name: "Estudiante existente" }));
    fireEvent.change(screen.getByLabelText("Buscar por cédula o correo"), {
      target: { value: "ana@example.test" },
    });
    await user.click(screen.getByRole("button", { name: "Buscar estudiante" }));
    await user.click(await screen.findByRole("button", { name: /Ana existente/ }));
  } else {
    fireEvent.change(screen.getByLabelText("Cédula"), { target: { value: "1234567890" } });
    fireEvent.change(screen.getByLabelText("Nombres completos"), {
      target: { value: "Ana nueva" },
    });
    fireEvent.change(screen.getByLabelText("Correo electrónico"), {
      target: { value: "ana@example.test" },
    });
  }
  await user.click(screen.getByRole("button", { name: "Continuar" }));
  await user.click(await screen.findByRole("button", { name: /Tipo A/ }));
  await screen.findByText(/Cupos disponibles/);
  expect(screen.getAllByRole("button", { name: /Tipo [AB]/ })).toHaveLength(2);
  await user.click(screen.getByRole("button", { name: "Continuar" }));
  fireEvent.change(screen.getByLabelText("Fecha de inicio"), { target: { value: "2026-09-30" } });
  await screen.findByText(/5 días · 10 bloques/);
  await user.click(screen.getByRole("button", { name: "Ver sugerencia" }));
  await screen.findByText(/Hora sugerida/);
  await user.click(screen.getByRole("button", { name: "Continuar" }));
  return user;
}
describe("Wizard sin escrituras prematuras", () => {
  it("prepara nuevo estudiante y programa solo al confirmar", async () => {
    const user = await draft();
    expect(post.mock.calls.every(([path]) => !path.endsWith("/confirm"))).toBe(true);
    await user.click(screen.getByRole("button", { name: "Confirmar matrícula y prácticas" }));
    await screen.findByRole("heading", { name: "Matrícula confirmada" });
    expect(post).toHaveBeenCalledWith(
      `${BASE}/confirm`,
      expect.objectContaining({ student: expect.objectContaining({ mode: "new" }) }),
      expect.objectContaining({ headers: { "Idempotency-Key": expect.any(String) } }),
    );
  });
  it("A+B usa la identidad seleccionada y no envía contraseña", async () => {
    const user = await draft(true);
    await user.click(screen.getByRole("button", { name: "Confirmar matrícula y prácticas" }));
    await screen.findByRole("heading", { name: "Matrícula confirmada" });
    expect(post).toHaveBeenCalledWith(
      `${BASE}/confirm`,
      expect.objectContaining({ student: { mode: "existing", id: "student" }, courseType: "A" }),
      expect.anything(),
    );
  });
  it("doble clic solo inicia una confirmación", async () => {
    const user = await draft();
    let finish: (r: unknown) => void = () => {};
    post.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await user.dblClick(screen.getByRole("button", { name: "Confirmar matrícula y prácticas" }));
    expect(post.mock.calls.filter(([p]) => p.endsWith("/confirm"))).toHaveLength(1);
    finish(result);
    await screen.findByRole("heading", { name: "Matrícula confirmada" });
  });
  it("reintento conserva clave y muestra duplicado vigente sin éxito falso", async () => {
    const user = await draft();
    post.mockRejectedValueOnce(new ApiError("Ya existe una matrícula vigente Tipo A", 409));
    get.mockResolvedValue({ phase: "failed", result: null, emailStatus: "pending" });
    await user.click(screen.getByRole("button", { name: "Confirmar matrícula y prácticas" }));
    await screen.findByText(/Ya existe una matrícula vigente/);
    expect(screen.queryByRole("heading", { name: "Matrícula confirmada" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirmar matrícula y prácticas" }));
    await screen.findByRole("heading", { name: "Matrícula confirmada" });
    const calls = post.mock.calls.filter(([p]) => p.endsWith("/confirm"));
    expect(calls[0][2]).toEqual(calls[1][2]);
  });
  it("correo fallido mantiene matrícula y permite reenvío explícito", async () => {
    const user = await draft();
    post.mockResolvedValueOnce({ ...result, emailStatus: "failed" });
    await user.click(screen.getByRole("button", { name: "Confirmar matrícula y prácticas" }));
    await screen.findByText(/falló; la matrícula sigue confirmada/);
    post.mockResolvedValueOnce(result);
    await user.click(screen.getByRole("button", { name: "Reenviar correo de matrícula" }));
    expect(post).toHaveBeenCalledWith(`${BASE}/operations/op/resend-email`, {
      regenerateTemporaryPassword: false,
    });
  });
});
describe("Fecha final en modo automático y manual", () => {
  it("restaura cálculo del servidor sin enviar la fecha manual", async () => {
    const user = userEvent.setup();
    render(<StepPracticas course={selection} value={null} onBack={() => {}} onNext={() => {}} />);
    fireEvent.change(screen.getByLabelText("Fecha de inicio"), { target: { value: "2026-09-30" } });
    await waitFor(() => expect(screen.getByLabelText("Fecha final")).toHaveValue("2026-10-06"));
    fireEvent.change(screen.getByLabelText("Fecha final"), { target: { value: "2026-10-12" } });
    await waitFor(() =>
      expect(post).toHaveBeenLastCalledWith(`${BASE}/plan`, {
        practice: expect.objectContaining({ fechaFin: "2026-10-12" }),
      }),
    );
    await user.click(screen.getByRole("button", { name: "Restaurar cálculo automático" }));
    await waitFor(() => {
      const payload = post.mock.calls.at(-1)?.[1] as { practice: object };
      expect(payload.practice).not.toHaveProperty("fechaFin");
    });
    fireEvent.change(screen.getByLabelText("Duración"), { target: { value: "3" } });
    await waitFor(() =>
      expect(post).toHaveBeenLastCalledWith(`${BASE}/plan`, {
        practice: expect.objectContaining({ semanas: 3 }),
      }),
    );
  });
  it("muestra primer día efectivo sin cambiar inicio elegido", async () => {
    post.mockResolvedValue({ ...plan, fechaInicio: "2026-10-03", primerDiaEfectivo: "2026-10-05" });
    render(<StepPracticas course={selection} value={null} onBack={() => {}} onNext={() => {}} />);
    fireEvent.change(screen.getByLabelText("Fecha de inicio"), { target: { value: "2026-10-03" } });
    await screen.findByText(/El inicio elegido no corresponde/);
    expect(screen.getByLabelText("Fecha de inicio")).toHaveValue("2026-10-03");
  });
  it("rango sin días no permite continuar", async () => {
    post.mockRejectedValue(new ApiError("El rango no contiene días aplicables", 400));
    render(<StepPracticas course={selection} value={null} onBack={() => {}} onNext={() => {}} />);
    fireEvent.change(screen.getByLabelText("Fecha de inicio"), { target: { value: "2026-10-03" } });
    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();
  });
});
