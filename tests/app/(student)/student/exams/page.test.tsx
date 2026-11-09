import { beforeEach, describe, expect, it, vi } from "vitest";

import StudentExamsPage from "@/app/(student)/student/exams/page";

const redirect = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
);
vi.mock("next/navigation", () => ({ redirect }));

describe("StudentExamsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("el listado de exámenes ahora vive en Mi curso: redirige a /student/course", () => {
    expect(() => StudentExamsPage()).toThrow("NEXT_REDIRECT:/student/course");
    expect(redirect).toHaveBeenCalledWith("/student/course");
  });
});
