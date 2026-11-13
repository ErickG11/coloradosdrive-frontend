import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PlanFields, type PlanCalendarDay } from "@/components/student-enrollment/PlanFields";
import type { StudentPlanRules, StudentScheduleSelection } from "@/types/studentSchedule";

const rules: StudentPlanRules = {
  active: true,
  serverNow: "2026-11-12T12:00:00Z",
  endHour: 22,
  options: [
    {
      modalidad: "entre_semana",
      horasPorDia: 1,
      habilitada: true,
      sesiones: 10,
      totalHoras: 10,
      primeraFecha: "2026-11-16",
      ultimaFecha: "2026-11-27",
    },
    {
      modalidad: "entre_semana",
      horasPorDia: 2,
      habilitada: true,
      sesiones: 5,
      totalHoras: 10,
      primeraFecha: "2026-11-16",
      ultimaFecha: "2026-11-20",
    },
    {
      modalidad: "fin_de_semana",
      horasPorDia: 2,
      habilitada: true,
      sesiones: 5,
      totalHoras: 10,
      primeraFecha: "2026-11-14",
      ultimaFecha: "2026-11-28",
    },
  ],
};
const plan = ["2026-11-13", "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19"].map(
  (fecha) => ({ fecha, horas: 2 }),
);
const days: PlanCalendarDay[] = [
  { fecha: "2026-11-13", disponible: true, planDays: plan },
  { fecha: "2026-11-14", disponible: false, motivo: "No pertenece a la modalidad." },
];
function Harness({
  initial = {},
  config = rules,
  calendar = days,
}: {
  initial?: Partial<StudentScheduleSelection>;
  config?: StudentPlanRules;
  calendar?: PlanCalendarDay[];
}) {
  const [value, setValue] = useState<StudentScheduleSelection>({
    modalidad: "entre_semana",
    horasPorDia: 0,
    fechaInicio: "",
    horaInicio: -1,
    ...initial,
  });
  const [month, setMonth] = useState("2026-11");
  return (
    <>
      <PlanFields
        rules={config}
        value={value}
        onChange={setValue}
        month={month}
        onMonth={setMonth}
        minDate="2026-11-12"
        days={calendar}
        hours={[
          { hora: "07:00", factible: true, motivo: null, diasFallan: [] },
          {
            hora: "20:00",
            factible: false,
            motivo: { codigo: "DIA_SIN_INSTRUCTOR", mensaje: "No hay instructor libre." },
            diasFallan: [],
          },
        ]}
      />
      <output data-testid="value">{JSON.stringify(value)}</output>
    </>
  );
}
describe("Selector compartido C08", () => {
  it("ofrece dos tarjetas entre semana sin ninguna seleccionada", () => {
    render(<Harness />);
    expect(
      screen.getByRole("button", { name: "1 hora por día · 10 días de práctica · unas 2 semanas" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.getByRole("button", { name: "2 horas por día · 5 días de práctica · 1 semana" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("button", { name: /3 horas por día/ })).not.toBeInTheDocument();
  });
  it("aplica la opción única de fin de semana como tarjeta fija no interactiva", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("radio", { name: "Fin de semana" }));
    expect(
      screen.getByText(
        "2 horas por día (obligatorias en fin de semana) · 5 días de práctica repartidos en 3 fines de semana",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /obligatorias/ })).not.toBeInTheDocument();
    expect(JSON.parse(screen.getByTestId("value").textContent!)).toMatchObject({
      horasPorDia: 2,
      horaInicio: -1,
      fechaInicio: "",
    });
  });
  it("muestra futuras opciones de fin de semana del servidor como seleccionables", () => {
    render(
      <Harness
        initial={{ modalidad: "fin_de_semana" }}
        config={{
          ...rules,
          options: [...rules.options, { ...rules.options[2], horasPorDia: 5, sesiones: 2 }],
        }}
      />,
    );
    expect(screen.getByRole("button", { name: /5 horas por día/ })).toBeInTheDocument();
    expect(screen.queryByText(/obligatorias/)).not.toBeInTheDocument();
  });
  it("pinta exactamente los días recibidos; viernes, lunes a jueves, sin sábado ni domingo", async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness initial={{ horasPorDia: 2 }} />);
    const friday = screen.getByRole("button", { name: /vie.*13/i });
    fireEvent.focus(friday);
    expect(container.querySelectorAll('[data-plan-day="preview"]')).toHaveLength(5);
    await user.click(friday);
    fireEvent.mouseLeave(friday.closest(".grid")!);
    fireEvent.blur(friday);
    expect(container.querySelectorAll("[data-plan-day]")).toHaveLength(5);
    expect(screen.getByRole("button", { name: /sáb.*14/i })).not.toHaveAttribute("data-plan-day");
    expect(screen.getByText("Inicio")).toBeInTheDocument();
    expect(screen.getByText("Fin")).toBeInTheDocument();
  });
  it.each([1, 2])("muestra rangos de %i horas y ninguna hora seleccionada", (h) => {
    render(<Harness initial={{ horasPorDia: h }} />);
    expect(screen.getByRole("button", { name: `07:00 – 0${7 + h}:00` })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByText("Seleccione un horario")).toBeInTheDocument();
    expect(screen.getByText("Mañana")).toBeInTheDocument();
    expect(screen.getByText("Noche")).toBeInTheDocument();
  });
  it("permite enfocar una hora no disponible y expone su motivo sin seleccionarla", async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ horasPorDia: 2 }} />);
    const h = screen.getByRole("button", { name: "20:00 – 22:00" });
    h.focus();
    expect(h).toHaveAccessibleDescription("No hay instructor libre.");
    await user.keyboard("{Enter}");
    expect(h).toHaveAttribute("aria-pressed", "false");
  });
  it("conserva el pintado de un plan que cruza de mes al navegar", async () => {
    const user = userEvent.setup();
    const cross = [
      {
        fecha: "2026-11-30",
        disponible: true,
        planDays: [
          { fecha: "2026-11-30", horas: 2 },
          { fecha: "2026-12-01", horas: 2 },
        ],
      },
    ];
    const { container } = render(
      <Harness initial={{ horasPorDia: 2, fechaInicio: "2026-11-30" }} calendar={cross} />,
    );
    expect(screen.getByText(/Tu plan continúa en diciembre de 2026/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mes siguiente" }));
    expect(screen.getByText("Diciembre de 2026")).toBeInTheDocument();
    expect(container.querySelectorAll('[data-plan-day="selected"]')).toHaveLength(1);
    expect(screen.getByText("Fin")).toBeInTheDocument();
  });
  it("conserva fecha y horario que aún caben al cambiar las horas por día", async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ horasPorDia: 2, fechaInicio: "2026-11-13", horaInicio: 7 }} />);
    await user.click(screen.getByRole("button", { name: /1 hora por día/ }));
    expect(JSON.parse(screen.getByTestId("value").textContent!)).toMatchObject({
      horasPorDia: 1,
      fechaInicio: "2026-11-13",
      horaInicio: 7,
    });
  });
});
