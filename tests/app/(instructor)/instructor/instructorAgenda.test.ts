import { describe, expect, it } from "vitest";
import {
  buildAgendaBlocks,
  layoutDay,
  readBlocks,
} from "@/app/(instructor)/instructor/_lib/instructorAgenda";
import type { PracticeSlotWithNames } from "@/types";

const slot: PracticeSlotWithNames = {
  id: "one",
  cohortId: "cohort",
  instructorId: "instructor",
  studentId: "student",
  scheduledAt: "2026-03-10T15:00:00Z",
  durationMinutes: 60,
  status: "confirmado",
  attended: null,
  instructorName: "Instructor",
  studentName: "Alumno",
  confirmationNotifiedAt: null,
  releaseNotifiedAt: null,
  confirmedAt: null,
  createdAt: "",
  updatedAt: "",
};
describe("bloques y distribución del calendario", () => {
  it("usa las horas reales ordenadas para formar un bloque de dos horas", () => {
    const blocks = buildAgendaBlocks(
      [{ ...slot, id: "two", scheduledAt: "2026-03-10T16:00:00Z" }, slot],
      [{ id: "block", slotIds: ["two", "one"] }],
    );
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      startsAt: slot.scheduledAt,
      endsAt: "2026-03-10T17:00:00.000Z",
      minutes: 120,
    });
  });
  it.each([
    { studentId: "other" },
    { cohortId: "other" },
    { scheduledAt: "2026-03-10T17:00:00Z" },
    { scheduledAt: "2026-03-11T16:00:00Z" },
  ])("no agrupa horas incompatibles: %j", (override) => {
    expect(
      buildAgendaBlocks(
        [slot, { ...slot, id: "two", scheduledAt: "2026-03-10T16:00:00Z", ...override }],
        [{ id: "block", slotIds: ["one", "two"] }],
      ),
    ).toHaveLength(2);
  });
  it("los bloques contiguos usan una columna y las coincidencias usan columnas distintas", () => {
    const blocks = buildAgendaBlocks(
      [
        slot,
        { ...slot, id: "two", scheduledAt: "2026-03-10T16:00:00Z" },
        { ...slot, id: "overlap", scheduledAt: "2026-03-10T16:00:00Z", studentId: "other" },
        { ...slot, id: "after", scheduledAt: "2026-03-10T17:00:00Z" },
      ],
      [{ id: "block", slotIds: ["one", "two"] }],
    );
    const layout = layoutDay(blocks);
    expect(layout.map(({ block, lane, lanes }) => [block.id, lane, lanes])).toEqual([
      ["block", 0, 2],
      ["slot:overlap", 1, 2],
      ["slot:after", 0, 1],
    ]);
    for (const a of layout)
      for (const b of layout) {
        if (a === b || a.lane !== b.lane) continue;
        expect(
          Date.parse(a.block.endsAt) <= Date.parse(b.block.startsAt) ||
            Date.parse(b.block.endsAt) <= Date.parse(a.block.startsAt),
        ).toBe(true);
      }
  });
  it("rechaza identificadores duplicados o de tipo incorrecto y conserva el respaldo por franjas", () => {
    expect(
      readBlocks([
        { id: "a", slotIds: ["one"] },
        { id: "b", slotIds: ["one"] },
      ]),
    ).toBeNull();
    expect(readBlocks([{ id: "a", slotIds: [1] }])).toBeNull();
    expect(buildAgendaBlocks([slot], [])).toHaveLength(1);
  });
});
