import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { createClient } from "@/lib/supabase/client";

const mockedCreateClient = vi.mocked(createClient);

function mockUser(id: string | null) {
  mockedCreateClient.mockReturnValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: id ? { id } : null } }) },
  } as unknown as ReturnType<typeof createClient>);
}

describe("useCurrentUserId", () => {
  beforeEach(() => {
    mockedCreateClient.mockReset();
  });

  it("empieza en null y se resuelve con el id de la sesión activa", async () => {
    mockUser("user-1");

    const { result } = renderHook(() => useCurrentUserId());

    expect(result.current).toBeNull();
    await waitFor(() => expect(result.current).toBe("user-1"));
  });

  it("se mantiene en null si no hay sesión activa", async () => {
    mockUser(null);

    const { result } = renderHook(() => useCurrentUserId());

    await waitFor(() => expect(mockedCreateClient).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });
});
