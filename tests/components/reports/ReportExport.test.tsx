import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  download: vi.fn(),
  save: vi.fn(),
  notify: vi.fn(),
  session: vi.fn(),
  useFetch: vi.fn(),
}));
vi.mock("@/lib/api/reports", async (original) => ({
  ...(await original<typeof import("@/lib/api/reports")>()),
  downloadReport: mocks.download,
  saveReport: mocks.save,
}));
vi.mock("@/components/content-admin/ContentFeedback", () => ({
  useContentSuccess: () => mocks.notify,
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { getSession: mocks.session } }),
}));
vi.mock("@/hooks/useFetch", () => ({ useFetch: mocks.useFetch }));

import { ReportExport, ReportExportMenu } from "@/components/reports/ReportExport";
import { ApiError } from "@/lib/api/errors";
import type { ReportFilters } from "@/types/report";

const cohortA = {
  id: "10000000-0000-4000-8000-00000000000a",
  nombre: "Motos Noviembre",
  courseId: "ca",
};
const cohortB = {
  id: "10000000-0000-4000-8000-00000000000b",
  nombre: "Livianos Ñ",
  courseId: "cb",
};
const fetched = (data: unknown) => ({ data, isLoading: false, error: null, refetch: vi.fn() });
const sessionAs = (role: string | null) =>
  mocks.session.mockResolvedValue({
    data: { session: role ? { user: { app_metadata: { role } } } : null },
  });
const renderPanel = (role?: "admin" | "instructor" | "estudiante" | null) =>
  render(<ReportExport today="2026-11-15" {...(role === undefined ? {} : { role })} />);
const file = { blob: new Blob(["x"]), fileName: "reporte-todos-2026-11-01_2026-11-15.pdf" };
async function exportAs(user: ReturnType<typeof userEvent.setup>, label: "PDF" | "Excel") {
  await user.click(screen.getByRole("button", { name: "Exportar" }));
  await user.click(screen.getByRole("menuitem", { name: `Descargar en ${label}` }));
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionAs("admin");
  mocks.useFetch.mockImplementation((path: string) =>
    path === "/cohorts"
      ? fetched([cohortB, cohortA])
      : fetched([
          { id: "ca", tipo: "A" },
          { id: "cb", tipo: "B" },
        ]),
  );
  mocks.download.mockResolvedValue(file);
  mocks.save.mockReturnValue("blob:reporte");
  URL.revokeObjectURL = vi.fn();
});

describe("Exportar reportes · quién lo ve", () => {
  it.each(["instructor", "estudiante", null] as const)("no se muestra al rol %s", (role) => {
    const { container } = renderPanel(role);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText("Ranking de instructores")).not.toBeInTheDocument();
  });

  it("con sesión de instructor o sin sesión tampoco aparece", async () => {
    sessionAs("instructor");
    const first = renderPanel();
    await waitFor(() => expect(mocks.session).toHaveBeenCalled());
    expect(first.container).toBeEmptyDOMElement();
    first.unmount();
    sessionAs(null);
    const second = renderPanel();
    await waitFor(() => expect(mocks.session).toHaveBeenCalledTimes(2));
    expect(second.container).toBeEmptyDOMElement();
  });

  it("se muestra al administrador según su sesión, con el ranking como opción", async () => {
    renderPanel();
    expect(await screen.findByRole("heading", { name: "Exportar reportes" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Ranking de instructores" })).toBeInTheDocument();
  });
});

describe("Exportar reportes · filtros", () => {
  it("parte del mes en curso y resume los filtros junto al botón", () => {
    renderPanel("admin");
    expect(screen.getByLabelText("Desde")).toHaveValue("2026-11-01");
    expect(screen.getByLabelText("Hasta")).toHaveValue("2026-11-15");
    const summary = screen.getByLabelText("Filtros que se aplicarán al reporte");
    expect(summary).toHaveTextContent("Período:01/11/2026 al 15/11/2026");
    expect(summary).toHaveTextContent("Tipo de curso:Todos");
    expect(summary).toHaveTextContent("Cohorte:Todas");
    expect(summary).toHaveTextContent("Reporte:Todos los reportes");
  });

  it("envía exactamente los filtros que están en pantalla", async () => {
    const user = userEvent.setup();
    renderPanel("admin");
    await user.clear(screen.getByLabelText("Desde"));
    await user.type(screen.getByLabelText("Desde"), "2026-10-01");
    await user.clear(screen.getByLabelText("Hasta"));
    await user.type(screen.getByLabelText("Hasta"), "2026-10-31");
    await user.selectOptions(screen.getByLabelText("Tipo de curso"), "B");
    await user.selectOptions(screen.getByLabelText("Cohorte"), cohortB.id);
    await user.selectOptions(screen.getByLabelText("Reporte"), "finanzas");
    const summary = screen.getByLabelText("Filtros que se aplicarán al reporte");
    expect(summary).toHaveTextContent("Período:01/10/2026 al 31/10/2026");
    expect(summary).toHaveTextContent("Tipo de curso:Tipo B");
    expect(summary).toHaveTextContent("Cohorte:Livianos Ñ");
    expect(summary).toHaveTextContent("Reporte:Finanzas");
    await exportAs(user, "Excel");
    const expected: ReportFilters = {
      desde: "2026-10-01",
      hasta: "2026-10-31",
      tipoCurso: "B",
      cohorteId: cohortB.id,
      tipo: "finanzas",
    };
    expect(mocks.download).toHaveBeenCalledTimes(1);
    expect(mocks.download).toHaveBeenCalledWith(expected, "xlsx", expect.any(AbortSignal));
  });

  it("ofrece solo las cohortes del tipo de curso elegido y suelta la que ya no corresponde", async () => {
    const user = userEvent.setup();
    renderPanel("admin");
    const cohort = screen.getByLabelText("Cohorte");
    expect(
      within(cohort)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["Todas", "Livianos Ñ", "Motos Noviembre"]);
    await user.selectOptions(cohort, cohortA.id);
    await user.selectOptions(screen.getByLabelText("Tipo de curso"), "B");
    expect(cohort).toHaveValue("");
    expect(
      within(cohort)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["Todas", "Livianos Ñ"]);
  });

  it("valida las fechas en el cliente, muestra el error junto al campo y no exporta", async () => {
    const user = userEvent.setup();
    renderPanel("admin");
    const desde = screen.getByLabelText("Desde");
    await user.clear(desde);
    await user.type(desde, "2026-12-01");
    expect(desde).toHaveAttribute("aria-invalid", "true");
    expect(desde).toHaveAccessibleDescription(
      "La fecha inicial no puede ser posterior a la fecha final.",
    );
    await exportAs(user, "PDF");
    expect(mocks.download).not.toHaveBeenCalled();
    expect(screen.getByText("Corrige las fechas antes de exportar.")).toBeInTheDocument();
    await user.clear(desde);
    expect(desde).toHaveAccessibleDescription("Indica la fecha inicial.");
  });
});

describe("Exportar reportes · descarga", () => {
  it("descarga el PDF, avisa con el toast de éxito y deja un enlace alternativo", async () => {
    const user = userEvent.setup();
    renderPanel("admin");
    await exportAs(user, "PDF");
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith("Reporte descargado"));
    expect(mocks.download).toHaveBeenCalledWith(
      {
        desde: "2026-11-01",
        hasta: "2026-11-15",
        tipoCurso: "todos",
        cohorteId: "",
        tipo: "todos",
      },
      "pdf",
      expect.any(AbortSignal),
    );
    expect(mocks.save).toHaveBeenCalledWith(file);
    const link = screen.getByRole("link", { name: `Abrir ${file.fileName}` });
    expect(link).toHaveAttribute("href", "blob:reporte");
    expect(link).toHaveAttribute("download", file.fileName);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exportar" })).toBeEnabled();
  });

  it("mientras exporta deshabilita el botón, indica la carga y evita el doble clic", async () => {
    const user = userEvent.setup();
    let finish: (value: typeof file) => void = () => undefined;
    mocks.download.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    renderPanel("admin");
    await exportAs(user, "Excel");
    const busy = screen.getByRole("button", { name: "Generando Excel…" });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Generando el reporte en Excel…");
    await user.click(busy);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(mocks.download).toHaveBeenCalledTimes(1);
    finish(file);
    expect(await screen.findByRole("button", { name: "Exportar" })).toBeEnabled();
    expect(mocks.notify).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      429,
      "LIMITE_PETICIONES",
      "Hiciste demasiadas exportaciones. Espera unos minutos e inténtalo de nuevo.",
    ],
    [403, undefined, "Solo el administrador puede exportar reportes."],
    [401, undefined, "Tu sesión expiró. Inicia sesión de nuevo para exportar."],
    [
      413,
      undefined,
      "El reporte es demasiado grande. Acota el rango de fechas o elige una cohorte.",
    ],
    [500, undefined, "No pudimos generar el reporte. Inténtalo de nuevo en unos minutos."],
  ])("muestra el error %s en español, sin toast de éxito", async (status, code, message) => {
    const user = userEvent.setup();
    mocks.download.mockRejectedValue(new ApiError(message, status, { code }));
    renderPanel("admin");
    await exportAs(user, "PDF");
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(mocks.notify).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
    expect(screen.queryByRole("link", { name: /Abrir/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exportar" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Cerrar aviso" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("un rechazo del servidor por un filtro se muestra junto a ese campo", async () => {
    const user = userEvent.setup();
    mocks.download.mockRejectedValue(
      new ApiError("La cohorte seleccionada no existe", 400, {
        code: "COHORTE_NO_ENCONTRADA",
        field: "cohorteId",
      }),
    );
    renderPanel("admin");
    await exportAs(user, "PDF");
    await waitFor(() =>
      expect(screen.getByLabelText("Cohorte")).toHaveAccessibleDescription(
        "La cohorte seleccionada no existe",
      ),
    );
    expect(screen.getByLabelText("Cohorte")).toHaveAttribute("aria-invalid", "true");
  });

  it("un error inesperado no rompe la pantalla", async () => {
    const user = userEvent.setup();
    mocks.download.mockRejectedValue(new Error("fallo raro"));
    renderPanel("admin");
    await exportAs(user, "PDF");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo exportar el reporte. Inténtalo de nuevo.",
    );
  });

  it("al desmontar cancela la exportación en curso y libera el archivo anterior", async () => {
    const user = userEvent.setup();
    const view = renderPanel("admin");
    await exportAs(user, "PDF");
    await waitFor(() => expect(mocks.notify).toHaveBeenCalled());
    mocks.download.mockReturnValue(new Promise(() => undefined));
    await exportAs(user, "Excel");
    const signal = mocks.download.mock.calls[1][2] as AbortSignal;
    expect(signal.aborted).toBe(false);
    view.unmount();
    expect(signal.aborted).toBe(true);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:reporte");
  });
});

describe("Exportar reportes · accesibilidad del menú", () => {
  const filters: ReportFilters = {
    desde: "2026-11-01",
    hasta: "2026-11-30",
    tipoCurso: "todos",
    cohorteId: "",
    tipo: "instructores",
  };

  it("se maneja con el teclado: abrir, recorrer, cerrar con Escape y elegir con Enter", async () => {
    const user = userEvent.setup();
    render(<ReportExportMenu filters={filters} role="admin" />);
    const trigger = screen.getByRole("button", { name: "Exportar" });
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    trigger.focus();
    await user.keyboard("{ArrowDown}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menuitem", { name: "Descargar en PDF" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Descargar en Excel" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Descargar en PDF" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    await user.keyboard("{Enter}{ArrowDown}{Enter}");
    await waitFor(() =>
      expect(mocks.download).toHaveBeenCalledWith(filters, "xlsx", expect.any(AbortSignal)),
    );
  });

  it("el menú se cierra al hacer clic fuera", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <p>Otra zona</p>
        <ReportExportMenu filters={filters} role="admin" />
      </div>,
    );
    await user.click(screen.getByRole("button", { name: "Exportar" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    await user.click(screen.getByText("Otra zona"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("como pieza suelta (panel de CD-345) usa los filtros que recibe y no se muestra a otros roles", () => {
    const view = render(<ReportExportMenu filters={filters} role="instructor" />);
    expect(view.container).toBeEmptyDOMElement();
    view.rerender(<ReportExportMenu filters={filters} cohortName={null} role="admin" />);
    expect(screen.getByLabelText("Filtros que se aplicarán al reporte")).toHaveTextContent(
      "Reporte:Ranking de instructores",
    );
  });
});
