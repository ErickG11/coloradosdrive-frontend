import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EnrollmentWizard } from "@/app/(admin)/admin/enrollments/wizard/EnrollmentWizard";
import { StepPracticas } from "@/app/(admin)/admin/enrollments/wizard/StepPracticas";
import { StepDocumentosPago } from "@/app/(admin)/admin/enrollments/wizard/StepDocumentosPago";
import { BASE, type CourseSelection } from "@/app/(admin)/admin/enrollments/wizard/wizardTypes";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
vi.mock("@/lib/api/client", () => ({ api: { get: vi.fn(), post: vi.fn() } }));
const VALID_CEDULA = "1710034065";
const get = vi.mocked(api.get),
  post = vi.mocked(api.post);
const cohort = {
  id: "cohort-a",
  course_id: "course-a",
  nombre: "Cohorte A",
  precio: 400,
  cupo_maximo: 20,
  ocupados: 2,
  fecha_inicio_matricula: "2020-01-01",
  fecha_fin_matricula: "2099-12-31",
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
  montoTotal: 400,
  descuento: 0,
  montoAbonado: 0,
  saldo: 400,
  documentosPendientes: 4,
};
const details = {
  enrollmentId: "e",
  studentId: "student",
  cohortId: "cohort-a",
  montoTotal: 400,
  descuento: 0,
  precioBruto: 400,
  montoAbonado: 0,
  saldo: 400,
  documentosPendientes: 4,
  documentos: ["cedula", "papeleta_votacion", "tipo_sangre", "titulo_bachiller"].map((tipo) => ({
    tipo,
    estado: "pendiente",
    fechaMarcado: null,
    marcadoPor: null,
  })),
};
beforeEach(() => {
  vi.resetAllMocks();
  sessionStorage.clear();
  get.mockImplementation(async (path) =>
    path === `${BASE}/e/details`
      ? details
      : path === `${BASE}/catalog`
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
    if (path === `${BASE}/duplicates`) return { cedula: false, correo: false };
    if (path === `${BASE}/plan`) return plan;
    if (path === `${BASE}/practice-preview`) return { plan, suggestion };
    if (path === `${BASE}/confirm`) return result;
    throw Error(`Unexpected ${path}`);
  });
});
async function draft(existing = false, birthDate?: string) {
  const user = userEvent.setup();
  render(<EnrollmentWizard />);
  if (existing) {
    get.mockImplementation(async (path) =>
      path === `${BASE}/e/details`
        ? details
        : path === `${BASE}/catalog`
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
    fireEvent.change(screen.getByLabelText("Cédula"), { target: { value: VALID_CEDULA } });
    fireEvent.change(screen.getByLabelText("Nombres completos"), {
      target: { value: "Ana nueva" },
    });
    fireEvent.change(screen.getByLabelText("Correo electrónico"), {
      target: { value: "ana@example.test" },
    });
    if (birthDate)
      fireEvent.change(screen.getByLabelText("Fecha de nacimiento (opcional)"), {
        target: { value: birthDate },
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
  expect(screen.getByRole("heading", { name: "Documentos" })).toBeInTheDocument();
  // Con cohorte, el abono debe ser mayor que $0.00.
  fireEvent.change(screen.getByLabelText("Monto abonado (USD)"), { target: { value: "100" } });
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
    const payload = post.mock.calls.find(([path]) => path === `${BASE}/confirm`)?.[1] as {
      student: object;
      documentos: object[];
      pago: object;
    };
    expect(payload.student).not.toHaveProperty("fechaNacimiento");
    expect(payload.documentos).toHaveLength(4);
    expect(payload.pago).toEqual({ modalidad: "abono", descuento: 0, montoAbonado: 100 });
    expect(sessionStorage.getItem("coloradosdrive.manual-enrollment.confirmation")).toBeNull();
  });
  it("el payload de confirmación lleva correo y nombre recortados", async () => {
    const user = await draft();
    // El borrador se llenó sin espacios: se vuelve a la cédula para ensuciarlo.
    await user.click(screen.getByRole("button", { name: "Atrás" }));
    await user.click(screen.getByRole("button", { name: "Atrás" }));
    await user.click(screen.getByRole("button", { name: "Atrás" }));
    await user.click(screen.getByRole("button", { name: "Atrás" }));
    fireEvent.change(screen.getByLabelText("Nombres completos"), {
      target: { value: "  Ana nueva  " },
    });
    fireEvent.change(screen.getByLabelText("Correo electrónico"), {
      target: { value: "ana@example.test " },
    });
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(await screen.findByRole("button", { name: /Tipo A/ }));
    await screen.findByText(/Cupos disponibles/);
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.change(screen.getByLabelText("Fecha de inicio"), { target: { value: "2026-09-30" } });
    await screen.findByText(/5 días · 10 bloques/);
    await user.click(screen.getByRole("button", { name: "Ver sugerencia" }));
    await screen.findByText(/Hora sugerida/);
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.change(screen.getByLabelText("Monto abonado (USD)"), { target: { value: "100" } });
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("button", { name: "Confirmar matrícula y prácticas" }));
    const payload = post.mock.calls.find(([path]) => path === `${BASE}/confirm`)?.[1] as {
      student: { correo: string; nombreCompleto: string };
    };
    expect(payload.student.correo).toBe("ana@example.test");
    expect(payload.student.nombreCompleto).toBe("Ana nueva");
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
    expect(screen.queryByLabelText("Fecha de nacimiento (opcional)")).not.toBeInTheDocument();
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
    expect(sessionStorage.getItem("coloradosdrive.manual-enrollment.confirmation")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Confirmar matrícula y prácticas" }));
    await screen.findByRole("heading", { name: "Matrícula confirmada" });
    const calls = post.mock.calls.filter(([p]) => p.endsWith("/confirm"));
    expect(calls[0][2]).toEqual(calls[1][2]);
    expect(calls[0][1]).toEqual(calls[1][1]);
  });
  it("envía fecha opcional, checklist y pago completo en centavos exactos", async () => {
    const user = await draft(false, "1950-01-01");
    await user.click(screen.getByRole("button", { name: "Atrás" }));
    fireEvent.change(screen.getByLabelText("Papeleta de votación"), {
      target: { value: "entregado" },
    });
    fireEvent.change(screen.getByLabelText("Descuento (USD)"), { target: { value: "0.01" } });
    fireEvent.change(screen.getByLabelText("Modalidad de pago"), { target: { value: "completo" } });
    expect(screen.getByText(/Neto:.*399/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("button", { name: "Confirmar matrícula y prácticas" }));
    const payload = post.mock.calls.find(([path]) => path === `${BASE}/confirm`)?.[1] as {
      student: object;
      documentos: { tipo: string; estado: string }[];
      pago: object;
    };
    expect(payload.student).toHaveProperty("fechaNacimiento", "1950-01-01");
    expect(payload.documentos.find((d) => d.tipo === "papeleta_votacion")?.estado).toBe(
      "entregado",
    );
    expect(payload.pago).toEqual({ modalidad: "completo", descuento: 0.01, montoAbonado: 399.99 });
  });
  it("muestra la exención de papeleta que devuelve details", async () => {
    get.mockImplementation(async (path) =>
      path === `${BASE}/e/details`
        ? {
            ...details,
            documentosPendientes: 3,
            documentos: details.documentos.map((d) =>
              d.tipo === "papeleta_votacion" ? { ...d, estado: "no_aplica" } : d,
            ),
          }
        : path === `${BASE}/catalog`
          ? [{ tipo: "A", nombre: "Motocicletas", courseId: "course-a" }]
          : [],
    );
    const user = await draft();
    await user.click(screen.getByRole("button", { name: "Confirmar matrícula y prácticas" }));
    await waitFor(() =>
      expect(screen.getByText(/Papeleta de votación: no aplica/)).toBeInTheDocument(),
    );
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
describe("Documentos y pago sin cohorte", () => {
  it("deja continuar con todo pendiente, abono sin tope y saldo por calcular", async () => {
    const next = vi.fn();
    const user = userEvent.setup();
    render(
      <StepDocumentosPago
        student={{
          mode: "existing",
          id: "student",
          cedula: "1234567890",
          nombreCompleto: "Ana",
          correo: "ana@example.test",
          telefono: "",
        }}
        course={{ ...selection, cohortId: null, cohort: undefined }}
        value={null}
        onBack={() => {}}
        onNext={next}
      />,
    );
    expect(screen.getByText(/backend lo determinará/)).toBeInTheDocument();
    expect(screen.getByText(/Saldo: Se calculará al asignar cohorte/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Monto abonado (USD)"), {
      target: { value: "1000.01" },
    });
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        documentos: expect.arrayContaining([{ tipo: "papeleta_votacion", estado: "pendiente" }]),
        pago: { modalidad: "abono", descuento: "0", montoAbonado: "1000.01" },
      }),
    );
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
    const next = vi.fn();
    render(<StepPracticas course={selection} value={null} onBack={() => {}} onNext={next} />);
    fireEvent.change(screen.getByLabelText("Fecha de inicio"), { target: { value: "2026-10-03" } });
    await screen.findByRole("alert");
    await userEvent.setup().click(screen.getByRole("button", { name: "Continuar" }));
    expect(next).not.toHaveBeenCalled();
  });
  it("horas por día vacío no se envía como 0 y muestra un error claro", async () => {
    const next = vi.fn();
    render(<StepPracticas course={selection} value={null} onBack={() => {}} onNext={next} />);
    fireEvent.change(screen.getByLabelText("Fecha de inicio"), { target: { value: "2026-09-30" } });
    await waitFor(() => expect(post).toHaveBeenCalled());
    post.mockClear();
    fireEvent.change(screen.getByLabelText("Horas por día"), { target: { value: "" } });
    expect(screen.getByLabelText("Horas por día")).toHaveValue(null);
    expect(screen.getByLabelText("Horas por día")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Ingresa las horas por día.");
    await userEvent.setup().click(screen.getByRole("button", { name: "Continuar" }));
    expect(next).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Horas por día")).toHaveFocus();
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(post).not.toHaveBeenCalled();
  });
  it("horas por día fuera de 1 a 6 no consulta el plan", async () => {
    render(<StepPracticas course={selection} value={null} onBack={() => {}} onNext={() => {}} />);
    fireEvent.change(screen.getByLabelText("Fecha de inicio"), { target: { value: "2026-09-30" } });
    await waitFor(() => expect(post).toHaveBeenCalled());
    post.mockClear();
    fireEvent.change(screen.getByLabelText("Horas por día"), { target: { value: "0" } });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Las horas por día deben ser un entero entre 1 y 6.",
    );
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(post).not.toHaveBeenCalled();
    for (const value of ["7", "16", "2.5"]) {
      fireEvent.change(screen.getByLabelText("Horas por día"), { target: { value } });
      expect(screen.getByRole("alert")).toHaveTextContent("entre 1 y 6.");
    }
    expect(screen.getByLabelText("Horas por día")).toHaveAttribute("min", "1");
    expect(screen.getByLabelText("Horas por día")).toHaveAttribute("max", "6");
    fireEvent.change(screen.getByLabelText("Horas por día"), { target: { value: "6" } });
    await waitFor(() =>
      expect(post).toHaveBeenLastCalledWith(`${BASE}/plan`, {
        practice: expect.objectContaining({ horasPorDia: 6 }),
      }),
    );
    expect(screen.queryByText(/entre 1 y 6/)).not.toBeInTheDocument();
  });
});
describe("Errores del servidor al confirmar llevan al paso del campo", () => {
  async function confirmWith(error: ApiError) {
    const user = await draft();
    post.mockRejectedValueOnce(error);
    await user.click(screen.getByRole("button", { name: "Confirmar matrícula y prácticas" }));
    return user;
  }
  it("DUPLICATE_CEDULA vuelve al paso 1 con el aviso junto a la cédula y foco", async () => {
    await confirmWith(
      new ApiError("La cédula ya existe. Busca y selecciona el estudiante existente.", 409, {
        code: "DUPLICATE_CEDULA",
        field: "student.cedula",
      }),
    );
    const cedula = await screen.findByLabelText("Cédula");
    expect(cedula).toHaveAttribute("aria-invalid", "true");
    expect(cedula).toHaveFocus();
    expect(screen.getByText(/La cédula ya existe/)).toHaveAttribute("role", "alert");
    expect(screen.queryByRole("heading", { name: "Matrícula confirmada" })).not.toBeInTheDocument();
    // No queda una operación a medias: se descarta la clave y el borrador guardado.
    expect(sessionStorage.getItem("coloradosdrive.manual-enrollment.confirmation")).toBeNull();
    expect(get).not.toHaveBeenCalledWith(expect.stringContaining("/operations/"));
  });
  it.each([
    ["BIRTH_DATE_FUTURE", "La fecha de nacimiento no puede ser futura."],
    ["BIRTH_DATE_TOO_YOUNG", "La edad mínima para registrar a un estudiante es de 15 años."],
    ["BIRTH_DATE_TOO_OLD", "La edad máxima permitida es de 100 años."],
  ])("%s vuelve al paso 1 con el mensaje junto a la fecha de nacimiento", async (code, message) => {
    await confirmWith(new ApiError(message, 400, { code, field: "student.fechaNacimiento" }));
    const input = await screen.findByLabelText("Fecha de nacimiento (opcional)");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveFocus();
    expect(screen.getByText(message)).toHaveAttribute("role", "alert");
  });
  it("DUPLICATE_EMAIL vuelve al paso 1 con el aviso junto al correo", async () => {
    await confirmWith(
      new ApiError("El correo ya existe. Busca y selecciona el estudiante existente.", 409, {
        code: "DUPLICATE_EMAIL",
        field: "student.correo",
      }),
    );
    expect(await screen.findByLabelText("Correo electrónico")).toHaveFocus();
    expect(screen.getByText(/El correo ya existe/)).toBeInTheDocument();
  });
  it.each([
    ["COHORT_FULL", "La cohorte ya no tiene cupo disponible.", 409],
    ["COHORT_ENROLLMENT_CLOSED", "La matrícula de la cohorte no está abierta.", 409],
    ["COHORT_NOT_FOUND", "La cohorte seleccionada no existe.", 404],
    ["COHORT_COURSE_MISMATCH", "La cohorte seleccionada no corresponde al curso elegido.", 400],
  ])("%s vuelve al paso Curso con el mensaje", async (code, message, status) => {
    await confirmWith(new ApiError(message, status, { code, field: "cohortId" }));
    expect(await screen.findByText(/Elige el tipo de curso/)).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(message);
  });
  it("un error de instructor vuelve al paso Prácticas", async () => {
    await confirmWith(
      new ApiError("Selecciona un instructor antes de confirmar.", 400, {
        code: "INVALID_FIELD",
        field: "practice.instructorId",
      }),
    );
    expect(await screen.findByLabelText("Fecha de inicio")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Selecciona un instructor antes de confirmar.",
    );
  });
  it("un error de pago vuelve al paso Documentos y pago junto al campo", async () => {
    await confirmWith(
      new ApiError("El abono no puede superar el monto total neto", 400, {
        code: "INVALID_FIELD",
        field: "pago.montoAbonado",
      }),
    );
    expect(await screen.findByLabelText("Monto abonado (USD)")).toHaveFocus();
    expect(screen.getByText("El abono no puede superar el monto total neto")).toBeInTheDocument();
  });
  it("sin campo (o 5xx) se queda en el paso 5 con el mensaje general", async () => {
    await confirmWith(
      new ApiError("El instructor dejó de estar disponible. Consulta una nueva sugerencia.", 409),
    );
    expect(await screen.findByText(/El instructor dejó de estar disponible/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirmar matrícula y prácticas" }),
    ).toBeInTheDocument();
  });
  it("tras corregir el dato se envía una operación nueva (otra clave)", async () => {
    const user = await confirmWith(
      new ApiError("La cédula ya existe. Busca y selecciona el estudiante existente.", 409, {
        code: "DUPLICATE_CEDULA",
        field: "student.cedula",
      }),
    );
    const firstKey = (
      post.mock.calls.find(([p]) => p === `${BASE}/confirm`)?.[2] as {
        headers: Record<string, string>;
      }
    ).headers["Idempotency-Key"];
    await screen.findByLabelText("Cédula");
    fireEvent.change(screen.getByLabelText("Cédula"), { target: { value: "0901234567" } });
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(await screen.findByRole("button", { name: /Tipo A/ }));
    await screen.findByText(/Cupos disponibles/);
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.change(screen.getByLabelText("Fecha de inicio"), { target: { value: "2026-09-30" } });
    await screen.findByText(/5 días · 10 bloques/);
    await user.click(screen.getByRole("button", { name: "Ver sugerencia" }));
    await screen.findByText(/Hora sugerida/);
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.change(screen.getByLabelText("Monto abonado (USD)"), { target: { value: "100" } });
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("button", { name: "Confirmar matrícula y prácticas" }));
    await screen.findByRole("heading", { name: "Matrícula confirmada" });
    const confirms = post.mock.calls.filter(([p]) => p === `${BASE}/confirm`);
    expect(confirms).toHaveLength(2);
    expect(
      (confirms[1][2] as { headers: Record<string, string> }).headers["Idempotency-Key"],
    ).not.toBe(firstKey);
    expect((confirms[1][1] as { student: { cedula: string } }).student.cedula).toBe("0901234567");
  });
});
