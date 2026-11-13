import { act, render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import Page from "@/app/(instructor)/instructor/asistencias/page";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { confirmarIdentidadPresencial } from "@/lib/api/inscripcion";
import type { PracticeSlotWithNames } from "@/types";
vi.mock("@/lib/api/client", () => ({ api: { get: vi.fn(), patch: vi.fn() } }));
vi.mock("@/lib/api/inscripcion", () => ({ confirmarIdentidadPresencial: vi.fn() }));
const query = vi.hoisted(() => ({ value: "" }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(query.value) }));
const base: PracticeSlotWithNames = {
  id: "one",
  cohortId: "cohort",
  instructorId: "instructor",
  studentId: "student",
  studentName: "Ana",
  instructorName: "Instructor",
  scheduledAt: "2026-03-10T15:00:00Z",
  durationMinutes: 60,
  status: "completado",
  attended: null,
  courseType: "A",
  confirmationNotifiedAt: null,
  releaseNotifiedAt: null,
  confirmedAt: null,
  createdAt: "",
  updatedAt: "",
};
let rows: PracticeSlotWithNames[];
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-03-10T18:00:00Z"));
  query.value = "";
  rows = [base, { ...base, id: "two", scheduledAt: "2026-03-10T16:00:00Z" }];
  vi.mocked(api.get).mockImplementation((async (path: string) =>
    path.includes("instructor-groups")
      ? [{ id: "block", slotIds: ["one", "two"] }]
      : rows) as typeof api.get);
  vi.mocked(api.patch).mockImplementation((async (path: string, body: { attended: boolean }) => {
    const id = path.split("/")[2];
    rows = rows.map((s) => (s.id === id ? { ...s, attended: body.attended } : s));
    return rows.find((s) => s.id === id);
  }) as typeof api.patch);
});
afterEach(() => vi.useRealTimers());
describe("Asistencias con cron simulado", () => {
  it("muestra el resultado optimista y revierte únicamente la hora rechazada", async () => {
    let reject!: (cause: unknown) => void;
    vi.mocked(api.patch).mockImplementationOnce(
      () =>
        new Promise((_resolve, fail) => {
          reject = fail;
        }),
    );
    const user = userEvent.setup();
    render(<Page />);
    await user.click(await screen.findByRole("button", { name: "Asistió" }));
    expect(
      within(screen.getByRole("listitem", { name: "Hora 10:00" })).getByText("Asistió"),
    ).toBeInTheDocument();
    await act(async () => reject(new ApiError("Rechazo", 403)));
    await screen.findByRole("button", { name: "Reintentar hora 10:00" });
    expect(
      within(screen.getByRole("listitem", { name: "Hora 10:00" })).getByText("Sin registrar"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("listitem", { name: "Hora 11:00" })).getByText("Asistió"),
    ).toBeInTheDocument();
  });
  it("muestra error de carga y recupera con Reintentar", async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error("Sin conexión"));
    const user = userEvent.setup();
    render(<Page />);
    expect(screen.getByText("Cargando asistencias…")).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent("Sin conexión");
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("article")).toBeInTheDocument();
  });
  it.each([true, false])(
    "registra el bloque attended=%s con PATCH secuenciales y devuelve el foco al resultado",
    async (attended) => {
      let active = 0;
      vi.mocked(api.patch).mockImplementation((async (
        path: string,
        body: { attended: boolean },
      ) => {
        expect(active).toBe(0);
        active++;
        await Promise.resolve();
        active--;
        return { ...rows.find((s) => path.includes(`/${s.id}/`))!, attended: body.attended };
      }) as typeof api.patch);
      const user = userEvent.setup();
      render(<Page />);
      await user.click(
        await screen.findByRole("button", { name: attended ? "Asistió" : "No asistió" }),
      );
      await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(2));
      expect(vi.mocked(api.patch).mock.calls.map(([p]) => p)).toEqual([
        "/practice-slots/one/attendance",
        "/practice-slots/two/attendance",
      ]);
      const result = await screen.findByText(/2 hora\(s\) guardada/);
      expect(result).toHaveFocus();
      expect(screen.getByText("Todo al día")).toBeInTheDocument();
    },
  );
  it("conserva el éxito parcial y reintenta solamente la hora fallida", async () => {
    vi.mocked(api.patch)
      .mockResolvedValueOnce({ ...base, attended: true })
      .mockRejectedValueOnce(new ApiError("Fallo de esa hora", 400))
      .mockResolvedValueOnce({ ...rows[1], attended: true });
    const user = userEvent.setup();
    render(<Page />);
    await user.click(await screen.findByRole("button", { name: "Asistió" }));
    const retry = await screen.findByRole("button", { name: "Reintentar hora 11:00" });
    expect(
      within(screen.getByRole("listitem", { name: "Hora 10:00" })).getByText("Asistió"),
    ).toBeInTheDocument();
    await user.click(retry);
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(3));
    expect(vi.mocked(api.patch).mock.calls[2][0]).toBe("/practice-slots/two/attendance");
  });
  it("reconsulta una respuesta incierta y no repite una escritura que sí quedó guardada", async () => {
    vi.mocked(api.patch).mockImplementationOnce((async () => {
      rows = rows.map((s) => (s.id === "one" ? { ...s, attended: true } : s));
      throw new Error("timeout");
    }) as typeof api.patch);
    const user = userEvent.setup();
    render(<Page />);
    await user.click(await screen.findByRole("button", { name: "Asistió" }));
    await screen.findByText(/2 hora\(s\) guardada/);
    expect(api.patch).toHaveBeenCalledTimes(2);
    expect(
      vi.mocked(api.get).mock.calls.filter(([p]) => !p.includes("instructor-groups")),
    ).toHaveLength(2);
  });
  it("si no se pudo reconsultar, verifica de nuevo antes del reintento", async () => {
    const get = vi.mocked(api.get);
    const implementation = get.getMockImplementation()!;
    get.mockImplementation((async (p: string) => {
      if (
        !p.includes("instructor-groups") &&
        get.mock.calls.filter(([s]) => !s.includes("instructor-groups")).length === 2
      )
        throw new Error("sin red");
      return implementation(p);
    }) as typeof api.get);
    vi.mocked(api.patch).mockRejectedValueOnce(new Error("timeout"));
    const user = userEvent.setup();
    render(<Page />);
    await user.click(await screen.findByRole("button", { name: "Asistió" }));
    await user.click(await screen.findByRole("button", { name: "Reintentar hora 10:00" }));
    await screen.findByText(/1 hora\(s\) guardada/);
    expect(get.mock.calls.filter(([p]) => !p.includes("instructor-groups"))).toHaveLength(3);
  });
  it("corrige ambas horas con un solo motivo y conserva el diálogo ante motivo corto", async () => {
    rows = rows.map((s) => ({ ...s, attended: true }));
    const user = userEvent.setup();
    render(<Page />);
    await screen.findByText("Todo al día");
    await user.click(screen.getByRole("button", { name: "Registradas" }));
    await user.click(screen.getByRole("button", { name: "Corregir bloque" }));
    await user.selectOptions(screen.getByLabelText("Asistencia a registrar"), "false");
    await user.click(screen.getByRole("button", { name: "Confirmar cambio" }));
    expect(api.patch).not.toHaveBeenCalled();
    await user.type(
      screen.getByLabelText("Motivo de la corrección"),
      "Verifiqué el registro original",
    );
    await user.click(screen.getByRole("button", { name: "Confirmar cambio" }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(2));
    for (const [, body] of vi.mocked(api.patch).mock.calls)
      expect(body).toEqual({ attended: false, motivo: "Verifiqué el registro original" });
  });
  it("respeta el plazo de cada hora y permite ajustar solo la que sigue dentro de 48 h", async () => {
    vi.setSystemTime(new Date("2026-03-12T16:30:00Z"));
    rows = rows.map((s) => ({ ...s, attended: true }));
    const user = userEvent.setup();
    render(<Page />);
    await screen.findByText("Todo al día");
    await user.click(screen.getByRole("button", { name: "Registradas" }));
    expect(screen.queryByRole("button", { name: "Corregir bloque" })).not.toBeInTheDocument();
    expect(screen.getByText("Pide la corrección al administrador")).toBeInTheDocument();
    expect(screen.getByText(/Puedes corregir durante 30 min/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ajustar por hora" }));
    expect(screen.getAllByRole("button", { name: "Cambiar asistencia" })).toHaveLength(1);
  });
  it("filtra alumno y registradas, valida 60 días e ignora un rango vacío sin fallar", async () => {
    rows[1] = { ...rows[1], attended: false };
    const user = userEvent.setup();
    render(<Page />);
    await screen.findByRole("article");
    await user.type(screen.getByLabelText("Buscar alumno"), "nadie");
    expect(screen.getByText("Todo al día")).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Buscar alumno"));
    await user.click(screen.getByRole("button", { name: "Registradas" }));
    expect(screen.getByRole("article")).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Desde"));
    expect(screen.getByRole("alert")).toHaveTextContent("1 a 60 días");
    await user.type(screen.getByLabelText("Desde"), "2025-01-01");
    expect(screen.getByRole("alert")).toHaveTextContent("1 a 60 días");
  });
  it("permite confirmar cédula antes del fin sin ofrecer asistencia futura ni en curso", async () => {
    query.value = "fecha=2026-03-10";
    vi.setSystemTime(new Date("2026-03-10T15:30:00Z"));
    rows = rows.map((s) => ({ ...s, status: "confirmado", identidadPresencialPendiente: true }));
    const user = userEvent.setup();
    render(<Page />);
    expect(await screen.findByText("En curso")).toBeInTheDocument();
    expect(screen.getByText("Próxima")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Asistió" })).not.toBeInTheDocument();
    await user.click(screen.getByLabelText("Confirmé la cédula original"));
    await user.click(screen.getByRole("button", { name: "Guardar confirmación" }));
    expect(confirmarIdentidadPresencial).toHaveBeenCalledTimes(1);
    expect(api.patch).not.toHaveBeenCalled();
  });
});
