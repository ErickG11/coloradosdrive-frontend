import { describe, expect, it, vi } from "vitest";

import InstructorSchedulePage from "@/app/(instructor)/instructor/schedule/page";
import { redirect } from "next/navigation";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

describe("InstructorSchedulePage", () => {
  it("redirige la ruta anterior a la agenda única", () => {
    InstructorSchedulePage();
    expect(redirect).toHaveBeenCalledExactlyOnceWith("/instructor");
  });
});
