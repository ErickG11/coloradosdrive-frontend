import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  PracticeBlockProvider,
  usePracticeBlocks,
} from "@/components/practice-blocks/PracticeBlockProvider";
import { api } from "@/lib/api/client";
import type { PracticeBlockSummary } from "@/types/practiceBlock";

vi.mock("@/lib/api/client", () => ({ api: { get: vi.fn() } }));

type Handlers = Record<string, () => void>;
const subscriptions = new Map<string, Handlers>();
vi.mock("@/hooks/useRealtimeChannel", () => ({
  useRealtimeChannel: (channel: string | null, handlers: Handlers) => {
    if (channel) subscriptions.set(channel, handlers);
  },
}));

const mockedGet = vi.mocked(api.get);

function enrollment(id: string, cohortId: string): PracticeBlockSummary["enrollments"][number] {
  return {
    id,
    cohortId,
    used: 0,
    remaining: 2,
    targetHours: 10,
    endDate: "2027-01-31",
    reservedHours: 0,
    attendedHours: 0,
    pending: [],
    absences: [],
  };
}

function mockApi(summary: PracticeBlockSummary) {
  mockedGet.mockImplementation((path: string) =>
    Promise.resolve(path.endsWith("/summary") ? summary : []),
  );
}

function Probe() {
  const { summary, loading, refresh } = usePracticeBlocks();
  return (
    <div>
      <p>{loading ? "cargando" : "listo"}</p>
      <p>{`matrículas:${String(summary?.enrollments.length ?? 0)}`}</p>
      <button type="button" onClick={() => void refresh()}>
        actualizar
      </button>
    </div>
  );
}

describe("PracticeBlockProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subscriptions.clear();
  });

  it("carga el resumen y las opciones al montar y deja de cargar", async () => {
    mockApi({ enrollments: [enrollment("e1", "cohort-a")] });

    render(
      <PracticeBlockProvider enabled>
        <Probe />
      </PracticeBlockProvider>,
    );

    expect(screen.getByText("cargando")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("listo")).toBeInTheDocument());
    expect(screen.getByText("matrículas:1")).toBeInTheDocument();
    expect(mockedGet).toHaveBeenCalledWith("/practice-slots/blocks/summary");
    expect(mockedGet).toHaveBeenCalledWith("/practice-slots/blocks/options");
  });

  it("no consulta nada si no está habilitado", () => {
    render(
      <PracticeBlockProvider enabled={false}>
        <Probe />
      </PracticeBlockProvider>,
    );

    expect(mockedGet).not.toHaveBeenCalled();
    expect(screen.getByText("listo")).toBeInTheDocument();
  });

  it("A+B: se suscribe al canal de cada cohorte propia y recarga al recibir avisos", async () => {
    mockApi({ enrollments: [enrollment("e1", "cohort-a"), enrollment("e2", "cohort-b")] });

    render(
      <PracticeBlockProvider enabled>
        <Probe />
      </PracticeBlockProvider>,
    );
    await waitFor(() => expect(subscriptions.has("cohort-cohort-b-practice-slots")).toBe(true));
    expect(subscriptions.has("cohort-cohort-a-practice-slots")).toBe(true);

    for (const event of ["blocks-updated", "slot-released", "slot-taken"]) {
      mockedGet.mockClear();
      act(() => subscriptions.get("cohort-cohort-b-practice-slots")?.[event]?.());
      await waitFor(() => expect(mockedGet).toHaveBeenCalledWith("/practice-slots/blocks/summary"));
    }
  });

  it("sin matrículas todavía no se suscribe a ningún canal de cohorte", async () => {
    mockApi({ enrollments: [] });

    render(
      <PracticeBlockProvider enabled>
        <Probe />
      </PracticeBlockProvider>,
    );
    await waitFor(() => expect(screen.getByText("listo")).toBeInTheDocument());

    expect(subscriptions.size).toBe(0);
  });
});
