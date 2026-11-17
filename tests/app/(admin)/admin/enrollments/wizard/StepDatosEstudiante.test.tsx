import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { StepDatosEstudiante } from "@/app/(admin)/admin/enrollments/wizard/StepDatosEstudiante";
import {
  BASE,
  EMPTY_STUDENT,
  phoneError,
} from "@/app/(admin)/admin/enrollments/wizard/wizardTypes";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { BIRTH_DATE_MESSAGES } from "@/lib/utils/birthDate";

vi.mock("@/lib/api/client", () => ({ api: { get: vi.fn(), post: vi.fn() } }));
vi.mock("@/hooks/useFetch", () => ({
  useFetch: () => ({ data: { documentTypes: ["cedula"] }, isLoading: false, error: null }),
}));
const post = vi.mocked(api.post);
const onNext = vi.fn();

function fill(extra: Record<string, string> = {}) {
  const values: Record<string, string> = {
    Cédula: "1710034065",
    "Nombres completos": "Ana Nueva",
    "Correo electrónico": "ana@example.test",
    ...extra,
  };
  for (const [label, value] of Object.entries(values))
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

beforeEach(() => {
  vi.resetAllMocks();
  post.mockResolvedValue({ cedula: false, correo: false });
});

describe("phoneError", () => {
  it("el teléfono es opcional y acepta los formatos del servidor", () => {
    for (const ok of ["", "0991234567", "+593 99 123 4567", "(02) 245-6789"])
      expect(phoneError(ok)).toBeNull();
  });
  it("rechaza letras, pocos dígitos y largos excesivos", () => {
    for (const bad of ["abc1234567", "12345", "+++++++++", "1".repeat(21)])
      expect(phoneError(bad)).not.toBeNull();
  });
});

describe("paso 1 del asistente: validaciones al Continuar", () => {
  it("la fecha de nacimiento no limita el calendario y el error aparece junto al campo", async () => {
    render(<StepDatosEstudiante value={EMPTY_STUDENT} onNext={onNext} />);
    const birth = screen.getByLabelText("Fecha de nacimiento (opcional)");
    expect(birth).not.toHaveAttribute("min");
    expect(birth).not.toHaveAttribute("max");
    fill({ "Fecha de nacimiento (opcional)": "2999-01-01" });
    await userEvent.setup().click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByText(BIRTH_DATE_MESSAGES.futura)).toBeInTheDocument();
    expect(birth).toHaveAttribute("aria-invalid", "true");
    expect(birth).toBeEnabled();
    expect(post).not.toHaveBeenCalled();
    expect(onNext).not.toHaveBeenCalled();
  });

  it("un menor de 15 años muestra el mensaje de edad mínima", async () => {
    render(<StepDatosEstudiante value={EMPTY_STUDENT} onNext={onNext} />);
    const year = new Date().getFullYear() - 5;
    fill({ "Fecha de nacimiento (opcional)": `${String(year)}-01-01` });
    await userEvent.setup().click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByText(BIRTH_DATE_MESSAGES.edadMinima)).toBeInTheDocument();
    expect(onNext).not.toHaveBeenCalled();
  });

  it("un teléfono inválido muestra el error junto al campo y no consulta duplicados", async () => {
    render(<StepDatosEstudiante value={EMPTY_STUDENT} onNext={onNext} />);
    fill({ Teléfono: "abc" });
    await userEvent.setup().click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByLabelText("Teléfono")).toHaveAttribute("aria-invalid", "true");
    expect(post).not.toHaveBeenCalled();
  });

  it("consulta duplicados una vez y avanza si ni la cédula ni el correo existen", async () => {
    render(<StepDatosEstudiante value={EMPTY_STUDENT} onNext={onNext} />);
    fill({ Teléfono: "0991234567", "Fecha de nacimiento (opcional)": "2000-05-20" });
    await userEvent.setup().click(screen.getByRole("button", { name: "Continuar" }));

    await waitFor(() => expect(onNext).toHaveBeenCalledOnce());
    expect(post).toHaveBeenCalledOnce();
    expect(post).toHaveBeenCalledWith(`${BASE}/duplicates`, {
      correo: "ana@example.test",
      cedula: "1710034065",
    });
  });

  it("si la cédula y el correo ya existen avisa de ambos a la vez y no avanza", async () => {
    post.mockResolvedValue({ cedula: true, correo: true });
    render(<StepDatosEstudiante value={EMPTY_STUDENT} onNext={onNext} />);
    fill();
    await userEvent.setup().click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByText(/documento ya está registrado/)).toBeInTheDocument();
    expect(screen.getByText(/correo ya está registrado/)).toBeInTheDocument();
    expect(screen.getByLabelText("Cédula")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Correo electrónico")).toHaveAttribute("aria-invalid", "true");
    expect(onNext).not.toHaveBeenCalled();
  });

  it("editar el campo con error borra solo ese error", async () => {
    post.mockResolvedValue({ cedula: false, correo: true });
    render(<StepDatosEstudiante value={EMPTY_STUDENT} onNext={onNext} />);
    fill();
    await userEvent.setup().click(screen.getByRole("button", { name: "Continuar" }));
    await screen.findByText(/correo ya está registrado/);

    fireEvent.change(screen.getByLabelText("Correo electrónico"), {
      target: { value: "otra@example.test" },
    });

    expect(screen.queryByText(/correo ya está registrado/)).not.toBeInTheDocument();
  });

  it("un rechazo 4xx de la consulta se muestra y no avanza; un fallo de red no bloquea", async () => {
    post.mockRejectedValueOnce(new ApiError("Cédula inválida", 400));
    render(<StepDatosEstudiante value={EMPTY_STUDENT} onNext={onNext} />);
    fill();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(await screen.findByText("Cédula inválida")).toBeInTheDocument();
    expect(onNext).not.toHaveBeenCalled();

    post.mockRejectedValueOnce(new Error("network"));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await waitFor(() => expect(onNext).toHaveBeenCalledOnce());
  });
});
