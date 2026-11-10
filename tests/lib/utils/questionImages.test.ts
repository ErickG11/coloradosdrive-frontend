import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/errors";
import {
  imageFileLabel,
  keepQuestionDraftKeys,
  QUESTION_IMAGE_MAX_BYTES,
  questionImageError,
  validateQuestionImage,
} from "@/lib/utils/questionImages";
import type { QuestionFormValue } from "@/types/examDraft";
import { PNG_BYTES } from "../../helpers/questionImages";

describe("validación de imagen local", () => {
  it.each([
    [PNG_BYTES, "archivo.jpg", "application/pdf", "image/png", "pregunta.png"],
    [new Uint8Array([255, 216, 255, 0]), "foto.webp", "", "image/jpeg", "pregunta.jpg"],
    [
      new TextEncoder().encode("RIFF1234WEBPVP8L"),
      "imagen.png",
      "image/png",
      "image/webp",
      "pregunta.webp",
    ],
  ])(
    "detecta bytes reales y genera nombre neutro (%s)",
    async (bytes, name, type, mime, filename) => {
      await expect(validateQuestionImage(new File([bytes], name, { type }))).resolves.toEqual({
        mime,
        filename,
      });
    },
  );
  it.each(["<svg xmlns='http://www.w3.org/2000/svg'/>", "archivo falso", "RIFF1234WAVEVP8 ", ""])(
    "rechaza SVG renombrado y otros formatos: %s",
    async (value) => {
      await expect(
        validateQuestionImage(new File([value], "renombrada.png", { type: "image/png" })),
      ).rejects.toThrow(/Solo se admiten/);
    },
  );
  it("rechaza más de 3 MiB antes de leer el archivo", async () => {
    await expect(
      validateQuestionImage(
        new File([new Uint8Array(QUESTION_IMAGE_MAX_BYTES + 1)], "grande.jpg", {
          type: "image/jpeg",
        }),
      ),
    ).rejects.toThrow(/supera el máximo/);
  });
  it("el nombre mostrado elimina rutas y controles y el vacío tiene alternativa", () => {
    expect(imageFileLabel("C:\\privado\\señal\u0000.png")).toBe("señal.png");
    expect(imageFileLabel("/directorio/imagen.png")).toBe("imagen.png");
    expect(imageFileLabel("")).toBe("Imagen seleccionada");
    expect(imageFileLabel("x".repeat(500))).toHaveLength(100);
  });
});
it("mapea códigos sin filtrar mensajes del proveedor; informa cuota compartida", () => {
  for (const code of [
    "IMAGE_TOO_LARGE",
    "IMAGE_TYPE_INVALID",
    "IMAGE_REQUIRED",
    "IMAGE_UPLOAD_INVALID",
    "IMAGE_NOT_FOUND",
    "IMAGE_CONFLICT",
    "UPLOAD_DAILY_LIMIT",
    "IMAGE_UPLOAD_FAILED",
    "CONTENT_UNAVAILABLE",
    "EXAM_PUBLISHED_UNPUBLISH",
    "EXAM_STRUCTURE_FROZEN",
    "ATTEMPT_EXPIRED",
  ]) {
    const message = questionImageError(new ApiError("URL_PRIVADA_TOKEN", 409, { code }));
    expect(message).not.toContain("URL_PRIVADA_TOKEN");
    expect(message.length).toBeGreaterThan(15);
  }
  expect(questionImageError(new ApiError("", 429, { code: "UPLOAD_DAILY_LIMIT" }))).toMatch(
    /50.*comparte con Contenido/,
  );
  expect(questionImageError(new ApiError("", 409, { code: "IMAGE_CONFLICT" }))).toContain(
    "Recarga",
  );
});
it("asocia archivos con IDs confirmados aunque la relectura cambie el orden", () => {
  const first = { draftKey: "local-a", prompt: "Igual" } as QuestionFormValue;
  const second = { draftKey: "local-b", prompt: "Igual" } as QuestionFormValue;
  const saved = [
    { id: "server-b", prompt: "Igual" },
    { id: "server-a", prompt: "Igual" },
  ] as QuestionFormValue[];
  expect(
    keepQuestionDraftKeys(saved, [first, second], {
      "local-a": "server-a",
      "local-b": "server-b",
    }).map((q) => q.draftKey),
  ).toEqual(["local-b", "local-a"]);
  expect(
    keepQuestionDraftKeys(saved, [first, second], {}).every((q) => q.draftKey === undefined),
  ).toBe(true);
});
