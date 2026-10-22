import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StepCurso } from "@/app/(admin)/admin/enrollments/wizard/StepCurso";
import { StepDatosEstudiante } from "@/app/(admin)/admin/enrollments/wizard/StepDatosEstudiante";
import { StepDocumentosPago } from "@/app/(admin)/admin/enrollments/wizard/StepDocumentosPago";
import { StepPracticas } from "@/app/(admin)/admin/enrollments/wizard/StepPracticas";
import {
  BASE,
  EMPTY_STUDENT,
  type CourseSelection,
} from "@/app/(admin)/admin/enrollments/wizard/wizardTypes";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

vi.mock("@/lib/api/client", () => ({ api: { get: vi.fn(), post: vi.fn() } }));
const post = vi.mocked(api.post);

const CEDULA = "1710034065";
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
  instructoresSugeridos: [
    { id: "i1", nombreCompleto: "Instructor uno" },
    { id: "i2", nombreCompleto: "Instructor dos" },
  ],
  totalSesiones: 5,
  horasProgramadas: 10,
  horasRequeridas: 20,
};

beforeEach(() => {
  vi.resetAllMocks();
});

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
function fillStudent(overrides: Partial<Record<string, string>> = {}) {
  const v = {
    Cédula: CEDULA,
    "Nombres completos": "Ana Pérez",
    "Correo electrónico": "ana@example.test",
    ...overrides,
  };
  for (const [label, value] of Object.entries(v)) fill(label, value as string);
}
const click = (name: string | RegExp) =>
  userEvent.setup().click(screen.getByRole("button", { name }));

describe("Paso 1: validación y duplicados al pulsar Continuar", () => {
  function renderStep(onNext = vi.fn()) {
    render(<StepDatosEstudiante value={EMPTY_STUDENT} onNext={onNext} />);
    return onNext;
  }

  it("campos vacíos: avisos junto a cada campo, accesibles, foco en el primero y sin consultar", async () => {
    const onNext = renderStep();
    await click("Continuar");
    const cedula = screen.getByLabelText("Cédula");
    expect(cedula).toHaveAttribute("aria-invalid", "true");
    expect(cedula).toHaveFocus();
    const described = cedula.getAttribute("aria-describedby");
    expect(document.getElementById(described ?? "")).toHaveTextContent("Ingresa la cédula.");
    expect(document.getElementById(described ?? "")).toHaveAttribute("role", "alert");
    expect(screen.getByText("Ingresa el nombre completo.")).toBeInTheDocument();
    expect(screen.getByText("Ingresa el correo electrónico.")).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
    expect(onNext).not.toHaveBeenCalled();
  });

  it.each([
    ["Cédula", "1234567890", "Ingresa una cédula ecuatoriana válida de 10 dígitos."],
    [
      "Nombres completos",
      "Ana 2",
      "El nombre completo debe incluir letras y no puede contener números.",
    ],
    ["Nombres completos", "x".repeat(201), "El nombre completo no puede superar 200 caracteres."],
    ["Correo electrónico", "sin-arroba", "Ingresa un correo electrónico válido."],
    ["Correo electrónico", `${"a".repeat(250)}@x.co`, "El correo no puede superar 254 caracteres."],
    [
      "Teléfono",
      "abc12",
      "Ingresa un teléfono válido de 7 a 20 caracteres (solo dígitos, +, espacios, guiones y paréntesis).",
    ],
    ["Fecha de nacimiento (opcional)", "1800-01-01", "La edad debe estar entre 15 y 100 años."],
  ])("%s = %j se rechaza sin consultar duplicados", async (label, value, message) => {
    const onNext = renderStep();
    fillStudent();
    fill(label, value);
    await click("Continuar");
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.getByLabelText(label)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(label)).toHaveFocus();
    expect(post).not.toHaveBeenCalled();
    expect(onNext).not.toHaveBeenCalled();
  });

  it("rechaza hoy (día de Guayaquil) como fecha de nacimiento y fija min y max", async () => {
    const onNext = renderStep();
    fillStudent();
    const date = screen.getByLabelText("Fecha de nacimiento (opcional)");
    expect(date).toHaveAttribute("min");
    expect(date).toHaveAttribute("max");
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guayaquil" }).format();
    expect((date as HTMLInputElement).max < today).toBe(true);
    fill("Fecha de nacimiento (opcional)", today);
    await click("Continuar");
    expect(
      screen.getByText("La fecha de nacimiento no puede ser hoy ni una fecha futura."),
    ).toBeInTheDocument();
    expect(onNext).not.toHaveBeenCalled();
  });

  it("no consulta duplicados por tecla, solo al pulsar Continuar", async () => {
    renderStep();
    fillStudent();
    expect(post).not.toHaveBeenCalled();
  });

  it("cédula existente: aviso con el texto del servidor, foco y no avanza", async () => {
    post.mockResolvedValue({ cedula: true, correo: false });
    const onNext = renderStep();
    fillStudent();
    await click("Continuar");
    expect(post).toHaveBeenCalledWith(`${BASE}/duplicates`, {
      cedula: CEDULA,
      correo: "ana@example.test",
    });
    const message = await screen.findByText(
      "La cédula ya existe. Busca y selecciona el estudiante existente.",
    );
    expect(message).toHaveAttribute("role", "alert");
    expect(screen.getByLabelText("Cédula")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Cédula")).toHaveFocus();
    expect(onNext).not.toHaveBeenCalled();
  });

  it("correo existente: aviso junto al correo y foco en él", async () => {
    post.mockResolvedValue({ cedula: false, correo: true });
    const onNext = renderStep();
    fillStudent();
    await click("Continuar");
    await screen.findByText("El correo ya existe. Busca y selecciona el estudiante existente.");
    expect(screen.getByLabelText("Correo electrónico")).toHaveFocus();
    expect(screen.getByLabelText("Cédula")).toHaveAttribute("aria-invalid", "false");
    expect(onNext).not.toHaveBeenCalled();
  });

  it("al corregir el campo se quita el aviso", async () => {
    post.mockResolvedValue({ cedula: true, correo: false });
    renderStep();
    fillStudent();
    await click("Continuar");
    await screen.findByText(/La cédula ya existe/);
    fill("Cédula", "0901234567");
    expect(screen.queryByText(/La cédula ya existe/)).not.toBeInTheDocument();
  });

  it("sin duplicados avanza con los datos", async () => {
    post.mockResolvedValue({ cedula: false, correo: false });
    const onNext = renderStep();
    fillStudent();
    await click("Continuar");
    await waitFor(() => expect(onNext).toHaveBeenCalledOnce());
    expect(onNext).toHaveBeenCalledWith(expect.objectContaining({ cedula: CEDULA, mode: "new" }));
  });

  it.each([
    ["red", new TypeError("fetch failed")],
    ["error 500", new ApiError("Error interno del servidor.", 500)],
  ])("si la consulta falla por %s no bloquea el avance", async (_name, failure) => {
    post.mockRejectedValue(failure);
    const onNext = renderStep();
    fillStudent();
    await click("Continuar");
    await waitFor(() => expect(onNext).toHaveBeenCalledOnce());
  });

  it("muestra el error 400 del servidor junto al campo indicado", async () => {
    post.mockRejectedValue(
      new ApiError("Ingresa una cédula ecuatoriana válida de 10 dígitos.", 400, {
        code: "INVALID_FIELD",
        field: "cedula",
      }),
    );
    const onNext = renderStep();
    fillStudent();
    await click("Continuar");
    await screen.findByText("Ingresa una cédula ecuatoriana válida de 10 dígitos.");
    expect(onNext).not.toHaveBeenCalled();
  });

  it("estudiante existente sin seleccionar: aviso junto a la búsqueda y foco", async () => {
    const onNext = renderStep();
    await click("Estudiante existente");
    await click("Continuar");
    expect(screen.getByText("Selecciona un estudiante existente válido.")).toBeInTheDocument();
    expect(screen.getByLabelText("Buscar por cédula o correo")).toHaveFocus();
    expect(onNext).not.toHaveBeenCalled();
  });

  it("aviso del servidor al confirmar: aparece junto al campo con foco al volver al paso", async () => {
    render(
      <StepDatosEstudiante
        value={{ ...EMPTY_STUDENT, cedula: CEDULA }}
        onNext={vi.fn()}
        serverError={{
          step: 1,
          field: "cedula",
          message: "La cédula ya existe. Busca y selecciona el estudiante existente.",
        }}
      />,
    );
    expect(screen.getByLabelText("Cédula")).toHaveFocus();
    expect(screen.getByLabelText("Cédula")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/La cédula ya existe/)).toBeInTheDocument();
  });
});

describe("Paso 2: curso y cohorte", () => {
  const catalog = [{ tipo: "A" as const, nombre: "Motocicletas", courseId: "course-a" }];
  async function pick(c: typeof cohort, onNext = vi.fn()) {
    post.mockResolvedValue({
      courseId: "course-a",
      tipo: "A",
      suggestion: { cohortId: c.id, warning: null, precio: null, cohortNombre: null },
      cohorts: [c],
    });
    render(<StepCurso catalog={catalog} value={null} onBack={() => {}} onNext={onNext} />);
    await userEvent.setup().click(screen.getByRole("button", { name: /Tipo A/ }));
    await screen.findByText(/Cupos disponibles/);
    return onNext;
  }

  it("sin curso elegido avisa y enfoca el curso", async () => {
    const onNext = vi.fn();
    render(<StepCurso catalog={catalog} value={null} onBack={() => {}} onNext={onNext} />);
    await click("Continuar");
    expect(screen.getByText("Selecciona un tipo de curso válido.")).toHaveAttribute(
      "role",
      "alert",
    );
    expect(onNext).not.toHaveBeenCalled();
  });

  it("cohorte sin cupo no avanza y muestra el mensaje del servidor", async () => {
    const onNext = await pick({ ...cohort, ocupados: 20 });
    await click("Continuar");
    expect(screen.getByText("La cohorte ya no tiene cupo disponible.")).toBeInTheDocument();
    expect(onNext).not.toHaveBeenCalled();
  });

  it("matrícula cerrada no avanza", async () => {
    const onNext = await pick({ ...cohort, fecha_fin_matricula: "2020-02-01" });
    await click("Continuar");
    expect(screen.getByText("La matrícula de la cohorte no está abierta.")).toBeInTheDocument();
    expect(onNext).not.toHaveBeenCalled();
  });

  it("cohorte abierta con cupo avanza", async () => {
    const onNext = await pick(cohort);
    await click("Continuar");
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("pendiente de cohorte (sin cohorte elegible) sigue permitido", async () => {
    post.mockResolvedValue({
      courseId: "course-a",
      tipo: "A",
      suggestion: { cohortId: null, warning: null, precio: null, cohortNombre: null },
      cohorts: [],
    });
    const onNext = vi.fn();
    render(<StepCurso catalog={catalog} value={null} onBack={() => {}} onNext={onNext} />);
    await userEvent.setup().click(screen.getByRole("button", { name: /Tipo A/ }));
    await screen.findByText(/Sin cohorte elegible/);
    await click("Continuar");
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("muestra el error del servidor al confirmar (cohorte llena) al volver al paso", () => {
    render(
      <StepCurso
        catalog={catalog}
        value={null}
        onBack={() => {}}
        onNext={() => {}}
        serverError={{
          step: 2,
          field: "cohortId",
          message: "La cohorte ya no tiene cupo disponible.",
        }}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("La cohorte ya no tiene cupo disponible.");
    expect(document.getElementById("curso-error-box")).toHaveFocus();
  });
});

describe("Paso 3: prácticas", () => {
  async function renderStep(onNext = vi.fn(), course = selection) {
    post.mockImplementation(async (path) =>
      path === `${BASE}/plan` ? plan : { plan, suggestion },
    );
    render(<StepPracticas course={course} value={null} onBack={() => {}} onNext={onNext} />);
    return onNext;
  }

  it("fecha de inicio vacía: aviso, foco y no avanza", async () => {
    const onNext = await renderStep();
    await click("Continuar");
    expect(screen.getByText("Ingresa la fecha de inicio.")).toBeInTheDocument();
    expect(screen.getByLabelText("Fecha de inicio")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Fecha de inicio")).toHaveFocus();
    expect(onNext).not.toHaveBeenCalled();
  });

  it.each([
    ["05:59", "La hora deseada debe estar entre 06:00 y 22:00."],
    ["22:30", "La hora deseada debe estar entre 06:00 y 22:00."],
    [
      "21:00",
      "Con las horas por día elegidas, la práctica debe terminar a más tardar a las 22:00. Elige una hora más temprana o menos horas por día.",
    ],
    ["", "Ingresa la hora deseada."],
  ])("hora deseada %j", async (hora, message) => {
    const onNext = await renderStep();
    fill("Fecha de inicio", "2026-09-30");
    fill("Hora deseada", hora);
    await click("Continuar");
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.getByLabelText("Hora deseada")).toHaveFocus();
    expect(onNext).not.toHaveBeenCalled();
  });

  it("22:00 con 1 hora por día se acepta como límite del horario", async () => {
    await renderStep();
    fill("Fecha de inicio", "2026-09-30");
    fill("Horas por día", "1");
    fill("Hora deseada", "21:00");
    await click("Continuar");
    expect(screen.queryByText(/debe terminar a más tardar/)).not.toBeInTheDocument();
  });

  it("fecha final anterior al inicio: aviso y no consulta el plan", async () => {
    const onNext = await renderStep();
    fill("Fecha de inicio", "2026-09-30");
    await waitFor(() => expect(post).toHaveBeenCalled());
    fill("Fecha final", "2026-09-01");
    expect(screen.getByText("La fecha final no puede ser anterior al inicio.")).toBeInTheDocument();
    post.mockClear();
    await click("Continuar");
    expect(screen.getByLabelText("Fecha final")).toHaveFocus();
    expect(post).not.toHaveBeenCalled();
    expect(onNext).not.toHaveBeenCalled();
  });

  it("con cohorte, sin sugerencia no avanza y lo dice; sin instructor lo pide junto al campo", async () => {
    const onNext = await renderStep();
    fill("Fecha de inicio", "2026-09-30");
    await screen.findByText(/5 días · 10 bloques/);
    await click("Continuar");
    expect(screen.getByText(/Pulsa «Ver sugerencia»/)).toHaveAttribute("role", "alert");
    expect(onNext).not.toHaveBeenCalled();
    await click("Ver sugerencia");
    await screen.findByText(/Hora sugerida/);
    await click("Continuar");
    expect(screen.getByText("Selecciona un instructor antes de confirmar.")).toBeInTheDocument();
    expect(screen.getByLabelText("Instructor")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Instructor")).toHaveFocus();
    expect(onNext).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Instructor"), { target: { value: "i2" } });
    await click("Continuar");
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("el error del servidor sobre un campo de prácticas aparece junto a él", () => {
    render(
      <StepPracticas
        course={selection}
        value={null}
        onBack={() => {}}
        onNext={() => {}}
        serverError={{
          step: 3,
          field: "horaDeseada",
          message: "La hora deseada debe estar entre 06:00 y 22:00.",
        }}
      />,
    );
    expect(screen.getByLabelText("Hora deseada")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Hora deseada")).toHaveFocus();
  });
});

describe("Paso 4: documentos y pago", () => {
  const student = { ...EMPTY_STUDENT, mode: "existing" as const, id: "s" };
  function renderStep(course = selection) {
    const onNext = vi.fn();
    render(
      <StepDocumentosPago
        student={student}
        course={course}
        value={null}
        onBack={() => {}}
        onNext={onNext}
      />,
    );
    return onNext;
  }

  it("abono de $0.00 con cohorte: aviso junto al monto, foco y no avanza", async () => {
    const onNext = renderStep();
    await click("Continuar");
    expect(
      screen.getByText("Con la modalidad Abono, el monto abonado debe ser mayor que $0.00."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Monto abonado (USD)")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Monto abonado (USD)")).toHaveFocus();
    expect(onNext).not.toHaveBeenCalled();
  });

  it("no muestra el error antes de pulsar Continuar", () => {
    renderStep();
    expect(screen.queryByText(/mayor que \$0\.00/)).not.toBeInTheDocument();
  });

  it("descuento mayor que el precio: aviso en el descuento", async () => {
    const onNext = renderStep();
    fill("Descuento (USD)", "401");
    fill("Monto abonado (USD)", "10");
    await click("Continuar");
    expect(screen.getByText(/El descuento no puede superar el precio/)).toBeInTheDocument();
    expect(screen.getByLabelText("Descuento (USD)")).toHaveFocus();
    expect(onNext).not.toHaveBeenCalled();
  });

  it("abonado mayor que el neto: aviso en el monto abonado", async () => {
    const onNext = renderStep();
    fill("Descuento (USD)", "100");
    fill("Monto abonado (USD)", "301");
    await click("Continuar");
    expect(screen.getByText(/El abono no puede superar el monto total neto/)).toBeInTheDocument();
    expect(screen.getByLabelText("Monto abonado (USD)")).toHaveFocus();
    expect(onNext).not.toHaveBeenCalled();
  });

  it("abono por el neto exacto pide pago completo en la modalidad", async () => {
    renderStep();
    fill("Monto abonado (USD)", "400");
    await click("Continuar");
    expect(screen.getByText("Si se abona el total, selecciona pago completo.")).toBeInTheDocument();
    expect(screen.getByLabelText("Modalidad de pago")).toHaveFocus();
  });

  it("abono válido y pago completo (monto fijado al neto) avanzan", async () => {
    const onNext = renderStep();
    fill("Monto abonado (USD)", "0.01");
    await click("Continuar");
    expect(onNext).toHaveBeenCalledOnce();
    onNext.mockClear();
    fill("Modalidad de pago", "completo");
    await click("Continuar");
    expect(onNext).toHaveBeenCalledWith(
      expect.objectContaining({ pago: expect.objectContaining({ modalidad: "completo" }) }),
    );
  });

  it("pendiente de cohorte: abono $0.00 sigue permitido", async () => {
    const onNext = renderStep({ ...selection, cohortId: null, cohort: undefined });
    await click("Continuar");
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("error del servidor sobre el abono aparece junto al campo con foco", () => {
    render(
      <StepDocumentosPago
        student={student}
        course={selection}
        value={null}
        onBack={() => {}}
        onNext={() => {}}
        serverError={{
          step: 4,
          field: "montoAbonado",
          message: "El abono no puede superar el monto total neto",
        }}
      />,
    );
    expect(screen.getByLabelText("Monto abonado (USD)")).toHaveFocus();
    expect(screen.getByText("El abono no puede superar el monto total neto")).toBeInTheDocument();
  });
});

describe("Errores del servidor devueltos a un paso", () => {
  const err = (step: 2 | 3 | 4, field: string, message: string, code?: string) => ({
    step,
    field,
    message,
    code,
  });

  it("paso 2: cohorte llena o cerrada añade qué hacer", () => {
    for (const [code, message] of [
      ["COHORT_FULL", "La cohorte ya no tiene cupo disponible."],
      ["COHORT_ENROLLMENT_CLOSED", "La matrícula de la cohorte no está abierta."],
    ]) {
      const { unmount } = render(
        <StepCurso
          catalog={[]}
          value={null}
          onBack={() => {}}
          onNext={() => {}}
          serverError={err(2, "cohortId", message, code)}
        />,
      );
      expect(screen.getByRole("alert")).toHaveTextContent(`${message} Selecciona otra cohorte.`);
      unmount();
    }
    render(
      <StepCurso
        catalog={[]}
        value={null}
        onBack={() => {}}
        onNext={() => {}}
        serverError={err(2, "cohortId", "La cohorte seleccionada no existe.", "COHORT_NOT_FOUND")}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/^La cohorte seleccionada no existe\.$/);
  });

  describe("paso 3", () => {
    async function ready(serverError: ReturnType<typeof err>) {
      post.mockImplementation(async (path) =>
        path === `${BASE}/plan` ? plan : { plan, suggestion },
      );
      const onNext = vi.fn();
      render(
        <StepPracticas
          course={selection}
          value={{
            form: {
              semanas: 1,
              modalidad: "entre_semana",
              horasPorDia: 2,
              fechaInicio: "2026-09-30",
              horaDeseada: "08:00",
              fechaFin: "",
              manual: false,
            },
            plan: { ...plan, modalidad: "entre_semana" as const },
            suggestion: null,
            instructor: null,
          }}
          onBack={() => {}}
          onNext={onNext}
          serverError={serverError}
        />,
      );
      await screen.findByText(/5 días · 10 bloques/);
      return onNext;
    }

    it("el valor rechazado sigue bloqueando Continuar hasta cambiar el campo", async () => {
      const onNext = await ready(
        err(3, "horaDeseada", "La hora deseada debe estar entre 06:00 y 22:00."),
      );
      await click("Continuar");
      expect(onNext).not.toHaveBeenCalled();
      expect(screen.getByLabelText("Hora deseada")).toHaveFocus();
      fill("Hora deseada", "09:00");
      expect(screen.queryByText(/debe estar entre 06:00 y 22:00/)).not.toBeInTheDocument();
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Ver sugerencia" })).toBeEnabled(),
      );
      await click("Ver sugerencia");
      await screen.findByText(/Hora sugerida/);
      fill("Instructor", "i1");
      await click("Continuar");
      expect(onNext).toHaveBeenCalledOnce();
    });

    it("un campo sin control propio (practice.semanas) se muestra en un aviso general y bloquea", async () => {
      const onNext = await ready(
        err(3, "semanas", "Selecciona una duración de 1, 2 o 3 semanas.", "INVALID_FIELD"),
      );
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Selecciona una duración de 1, 2 o 3 semanas.",
      );
      expect(document.getElementById("paso-error-box")).toHaveFocus();
      await click("Continuar");
      expect(onNext).not.toHaveBeenCalled();
      fill("Duración", "2");
      expect(screen.queryByText(/Selecciona una duración de 1/)).not.toBeInTheDocument();
    });

    it("el instructor rechazado bloquea hasta volver a pedir la sugerencia", async () => {
      const onNext = await ready(
        err(3, "instructorId", "Selecciona un instructor antes de confirmar."),
      );
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Selecciona un instructor antes de confirmar.",
      );
      await click("Continuar");
      expect(onNext).not.toHaveBeenCalled();
      await click("Ver sugerencia");
      await screen.findByText(/Hora sugerida/);
      expect(
        screen.queryByText("Selecciona un instructor antes de confirmar."),
      ).not.toBeInTheDocument();
    });
  });

  describe("paso 4", () => {
    const student = { ...EMPTY_STUDENT, mode: "existing" as const, id: "s" };
    function renderStep(serverError: ReturnType<typeof err>) {
      const onNext = vi.fn();
      render(
        <StepDocumentosPago
          student={student}
          course={selection}
          value={{
            documentos: [],
            pago: { modalidad: "abono", descuento: "0", montoAbonado: "100" },
          }}
          onBack={() => {}}
          onNext={onNext}
          serverError={serverError}
        />,
      );
      return onNext;
    }

    it("el abono rechazado sigue bloqueando hasta cambiar ese campo (no otro)", async () => {
      const onNext = renderStep(
        err(4, "montoAbonado", "El abono no puede superar el monto total neto"),
      );
      await click("Continuar");
      expect(onNext).not.toHaveBeenCalled();
      fill("Descuento (USD)", "10");
      await click("Continuar");
      expect(onNext).not.toHaveBeenCalled();
      fill("Monto abonado (USD)", "100.5");
      await click("Continuar");
      expect(onNext).toHaveBeenCalledOnce();
    });

    it("un error sin control propio (pago, documentos) se muestra en un aviso general", async () => {
      const onNext = renderStep(err(4, "pago", "El pago no es válido.", "INVALID_FIELD"));
      expect(screen.getByRole("alert")).toHaveTextContent("El pago no es válido.");
      expect(document.getElementById("paso-error-box")).toHaveFocus();
      await click("Continuar");
      expect(onNext).not.toHaveBeenCalled();
      fill("Monto abonado (USD)", "50");
      expect(screen.queryByText("El pago no es válido.")).not.toBeInTheDocument();
      await click("Continuar");
      expect(onNext).toHaveBeenCalledOnce();
    });
  });
});
