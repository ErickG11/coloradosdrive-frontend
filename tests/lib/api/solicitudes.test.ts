import { afterEach, expect, it, vi } from "vitest";
import { solicitudes, uploadSolicitudDocument, solicitudMessage } from "@/lib/api/solicitudes";
import { ApiError } from "@/lib/api/errors";
afterEach(() => vi.unstubAllGlobals());
it("envía públicos sin sesión y preserva cero inicial", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ solicitudId: "s", token: "temporal" })));
  vi.stubGlobal("fetch", fetcher);
  await solicitudes.confirmCode("a@example.com", "012345");
  expect(fetcher).toHaveBeenCalledWith(
    "http://localhost:3000/solicitudes/confirmar-codigo",
    expect.objectContaining({
      body: JSON.stringify({ correo: "a@example.com", codigo: "012345" }),
    }),
  );
  expect(fetcher.mock.calls[0][1].headers).not.toHaveProperty("Authorization");
});
it("sube multipart sin Content-Type manual y usa el token temporal", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response("{}"));
  vi.stubGlobal("fetch", fetcher);
  await uploadSolicitudDocument(
    { solicitudId: "s", token: "temporal" },
    "cedula",
    new File(["pdf"], "a.pdf", { type: "application/pdf" }),
  );
  expect(fetcher.mock.calls[0][1].headers).toEqual({ Authorization: "Bearer temporal" });
  expect(fetcher.mock.calls[0][1].body).toBeInstanceOf(FormData);
});
it("traduce códigos estables y no divulga errores de red", () => {
  expect(solicitudMessage(new ApiError("x", 429, { code: "INTENTOS_AGOTADOS" }))).toContain(
    "Solicita un nuevo código",
  );
  expect(solicitudMessage(new Error("detalle interno"))).not.toContain("detalle interno");
});
it.each(["DOCUMENTO_YA_REVISADO", "SOLICITUD_CERRADA"])("traduce %s al español", (code) => {
  expect(solicitudMessage(new ApiError("internal", 409, { code }))).toMatch(/(revisado|cerrada)/);
  expect(solicitudMessage(new ApiError("internal", 409, { code }))).not.toContain("internal");
});
