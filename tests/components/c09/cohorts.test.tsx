import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CohortForm, type CohortFormValues } from "@/app/(admin)/admin/cohorts/CohortForm";
import { CohortPricesCard } from "@/app/(admin)/admin/cohorts/CohortPricesCard";
import { CancelCohortModal } from "@/app/(admin)/admin/cohorts/CancelCohortModal";
import { CohortsWorkspace } from "@/app/(admin)/admin/cohorts/CohortsWorkspace";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { Cohort, Course } from "@/types";
const { refetch, push, refresh } = vi.hoisted(() => ({
  refetch: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));
const config = {
  active: true,
  serverNow: "2026-11-12T17:00:00Z",
  pricesActive: true,
  prices: [
    { tipo: "A", centavos: 15000 },
    { tipo: "B", centavos: 20000 },
  ],
};
const values: CohortFormValues = {
  courseId: "course-a",
  nombre: "Cohorte C09",
  precio: "150",
  cupoMaximo: "20",
  fechaInicioMatricula: "2026-11-01",
  fechaFinMatricula: "2026-12-10",
  fechaInicioCurso: "2026-11-30",
  fechaFinCurso: "2026-12-31",
  tipoModalidad: "",
  horariosCapacitacionTeoria: "",
  numeroVehiculos: "",
  numeroAulas: "",
};
const course = { id: "course-a", nombre: "Motocicletas", tipo: "A" } as Course;
const cohort = {
  ...values,
  id: "cohort-a",
  precio: 150,
  cupoMaximo: 20,
  tipoModalidad: null,
  horariosCapacitacionTeoria: null,
  numeroVehiculos: null,
  numeroAulas: null,
  habilitada: true,
  updatedAt: "2026-11-12T12:00:00.123456Z",
  createdAt: "2026-11-01T12:00:00Z",
} as Cohort;
vi.mock("@/hooks/useFetch", () => ({
  useFetch: (path: string) => ({
    data:
      path === "/cohorts/configuracion"
        ? config
        : path === "/courses"
          ? [course]
          : path === "/cohorts"
            ? [cohort]
            : null,
    isLoading: false,
    error: null,
    refetch,
  }),
}));
vi.mock("@/lib/api/client", () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/app/(admin)/admin/cohorts/useCohortStudentCounts", () => ({
  useCohortStudentCounts: () => ({
    "cohort-a": { total: 0, activos: 0, finalizados: 0, retirados: 0 },
  }),
}));
function form(section: "general" | "dates" = "general", initial = values) {
  return render(
    <CohortForm
      courses={[course]}
      cohortId="cohort-a"
      initialValues={initial}
      initialSection={section}
      habilitadaInicial
      rulesState="matricula_abierta"
      codigo="CD-CODIGO-LARGO"
      version={cohort.updatedAt}
      onSaved={vi.fn()}
    />,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.patch).mockResolvedValue({ id: "cohort-a" });
  vi.mocked(api.post).mockResolvedValue({ count: 0 });
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
describe("C09 cohortes", () => {
  it("separa información y fechas; no muestra el código largo", async () => {
    const user = userEvent.setup();
    form();
    expect(screen.getByRole("tab", { name: "Información general" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByLabelText("Inicio de matrícula")).not.toBeVisible();
    expect(screen.queryByText(/CD-CODIGO-LARGO/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Aplazar cohorte" }));
    expect(screen.getByLabelText("Inicio de matrícula")).toBeVisible();
    expect(screen.getByLabelText("Nombre de la cohorte")).not.toBeVisible();
    expect(screen.getByText(/Cierre de matrícula:.*5 dic 2026.*23:59:59/)).toBeInTheDocument();
    expect(screen.getByLabelText("Motivo del aplazamiento")).toBeRequired();
  });
  it("abre directamente fechas y respeta el teclado de las pestañas", async () => {
    const user = userEvent.setup();
    form("dates");
    const tab = screen.getByRole("tab", { name: "Aplazar cohorte" });
    expect(tab).toHaveAttribute("aria-selected", "true");
    tab.focus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Información general" })).toHaveFocus();
  });
  it("un curso iniciado permite extender solo su fin; uno terminado es de solo lectura", () => {
    const { unmount } = form("dates", { ...values, fechaInicioCurso: "2026-11-01" });
    expect(screen.getByLabelText("Inicio de matrícula")).toBeDisabled();
    expect(screen.getByLabelText("Fin de matrícula")).toBeDisabled();
    expect(screen.getByLabelText("Inicio de curso")).toBeDisabled();
    expect(screen.getByLabelText("Fin de curso")).toBeEnabled();
    unmount();
    form("dates", {
      ...values,
      fechaFinMatricula: "2026-10-01",
      fechaInicioCurso: "2026-10-01",
      fechaFinCurso: "2026-11-01",
    });
    expect(screen.getByRole("button", { name: "Guardar fechas" })).toBeDisabled();
    expect(screen.getByText(/Cohorte terminada: solo lectura/)).toBeInTheDocument();
  });
  it("al guardar fechas conserva versión y motivo y ofrece notificar interesados", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue({ count: 3, type: "A" });
    form("dates");
    fireEvent.change(screen.getByLabelText("Fin de curso"), { target: { value: "2027-01-15" } });
    await user.type(screen.getByLabelText("Motivo del aplazamiento"), "Ampliación autorizada");
    await user.click(screen.getByRole("button", { name: "Guardar fechas" }));
    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith(
        "/cohorts/cohort-a",
        expect.objectContaining({
          updatedAt: cohort.updatedAt,
          fechaFinCurso: "2027-01-15",
          reason: "Ampliación autorizada",
        }),
      ),
    );
    expect(
      await screen.findByRole("dialog", { name: /Notificar a 3 interesados/ }),
    ).toBeInTheDocument();
  });
  it("guardar fechas ignora un borrador inválido de la otra pestaña", async () => {
    const user = userEvent.setup();
    form();
    fireEvent.change(screen.getByLabelText("Número de vehículos"), { target: { value: "-1" } });
    await user.click(screen.getByRole("tab", { name: "Aplazar cohorte" }));
    fireEvent.change(screen.getByLabelText("Fin de curso"), { target: { value: "2027-01-15" } });
    await user.type(screen.getByLabelText("Motivo del aplazamiento"), "Ampliación de fechas");
    await user.click(screen.getByRole("button", { name: "Guardar fechas" }));
    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith(
        "/cohorts/cohort-a",
        expect.objectContaining({ numeroVehiculos: null, fechaFinCurso: "2027-01-15" }),
      ),
    );
  });
  it("presenta dos tarjetas con importes del servidor y edita un tipo por modal", async () => {
    const user = userEvent.setup();
    render(<CohortPricesCard />);
    expect(screen.getByText("$150.00")).toBeInTheDocument();
    expect(screen.getByText("$200.00")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Editar precio Tipo A" }));
    fireEvent.change(screen.getByLabelText("Nuevo precio (USD)"), { target: { value: "175.25" } });
    await user.type(screen.getByLabelText("Motivo del cambio"), "Tarifa aprobada");
    await user.click(screen.getByRole("button", { name: "Guardar precio" }));
    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith("/cohorts/configuracion/precio", {
        tipo: "A",
        centavos: 17525,
        motivo: "Tarifa aprobada",
      }),
    );
  });
  it("muestra tres acciones accesibles por fila y el reloj abre Aplazar cohorte", async () => {
    const user = userEvent.setup();
    render(<CohortsWorkspace />);
    expect(screen.getByRole("link", { name: "Aplazar cohorte Cohorte C09" })).toHaveAttribute(
      "href",
      "/admin/cohorts/cohort-a/edit?seccion=fechas",
    );
    expect(screen.getByRole("link", { name: "Editar Cohorte C09" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cancelar cohorte Cohorte C09" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Aplazar cohorte Cohorte C09" }));
    // El editor carga datos por id; la intención se conserva también en la URL sin JavaScript.
    expect(screen.getByRole("region", { name: "Editar cohorte" })).toBeInTheDocument();
    expect(screen.queryByText("Reasignar o cancelar")).not.toBeInTheDocument();
  });
  it("cancelar exige motivo y conserva el error, el conteo y el enlace a alumnos", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockRejectedValue(
      new ApiError("Hay 4 alumnos con compromisos.", 409, {
        code: "COHORTE_CANCELACION_BLOQUEADA",
        detalles: { cantidad: 4 },
      }),
    );
    render(
      <CancelCohortModal
        cohort={cohort}
        onClose={vi.fn()}
        onCancelled={vi.fn()}
        onReload={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Cancelar cohorte" })).toBeDisabled();
    await user.type(screen.getByLabelText("Motivo de cancelación"), "Cancelación administrativa");
    await user.click(screen.getByRole("button", { name: "Cancelar cohorte" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "COHORTE_CANCELACION_BLOQUEADA: Hay 4 alumnos con compromisos.",
    );
    expect(screen.getByText("Alumnos afectados: 4.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver alumnos de esta cohorte" })).toHaveAttribute(
      "href",
      "/admin/students?cohortId=cohort-a",
    );
    expect(within(screen.getByRole("dialog")).getByLabelText("Motivo de cancelación")).toHaveValue(
      "Cancelación administrativa",
    );
  });
});
