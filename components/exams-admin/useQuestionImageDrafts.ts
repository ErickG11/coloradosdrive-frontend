"use client";
import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/errors";
import { questionImageApi } from "@/lib/api/questionImages";
import {
  questionDraftKey,
  questionImageError,
  validateQuestionImage,
} from "@/lib/utils/questionImages";
import type { QuestionImage, Question } from "@/types/exam";
import type { QuestionFormValue } from "@/types/examDraft";

export interface QuestionImageDraft {
  action: "upload" | "remove" | "alt" | null;
  file?: File;
  preview?: string;
  alt: string;
  checking?: boolean;
  busy?: boolean;
  error?: string;
  code?: string;
}
export function useQuestionImageDrafts() {
  const [drafts, setDrafts] = useState<Record<string, QuestionImageDraft>>({});
  const current = useRef(drafts);
  const versions = useRef(new Map<string, number>());
  const urls = useRef(new Set<string>());
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    const owned = urls.current;
    return () => {
      live.current = false;
      for (const url of owned) URL.revokeObjectURL(url);
      owned.clear();
    };
  }, []);
  function put(key: string, value: QuestionImageDraft | null) {
    const next = { ...current.current };
    if (value) next[key] = value;
    else delete next[key];
    current.current = next;
    if (live.current) setDrafts(next);
  }
  function release(key: string) {
    const url = current.current[key]?.preview;
    if (url) {
      URL.revokeObjectURL(url);
      urls.current.delete(url);
    }
  }
  function discard(key: string) {
    versions.current.set(key, (versions.current.get(key) ?? 0) + 1);
    release(key);
    put(key, null);
  }
  async function choose(key: string, file: File, alt: string) {
    const version = (versions.current.get(key) ?? 0) + 1;
    versions.current.set(key, version);
    const before = current.current[key];
    put(key, {
      ...(before ?? { action: null, alt }),
      checking: true,
      error: undefined,
      code: undefined,
    });
    try {
      await validateQuestionImage(file);
      if (!live.current || versions.current.get(key) !== version) return;
      const preview = URL.createObjectURL(file);
      release(key);
      urls.current.add(preview);
      put(key, { action: "upload", file, preview, alt });
    } catch (error) {
      if (live.current && versions.current.get(key) === version)
        put(key, {
          ...(before ?? { action: null, alt }),
          checking: false,
          error: error instanceof Error ? error.message : "No se pudo leer la imagen.",
        });
    }
  }
  function changeAlt(key: string, alt: string, image?: QuestionImage | null) {
    const before = current.current[key];
    if (before?.action === "upload")
      put(key, { ...before, alt, error: undefined, code: undefined });
    else if (alt === (image?.alt ?? "")) discard(key);
    else put(key, { action: "alt", alt });
  }
  function remove(key: string, image?: QuestionImage | null) {
    discard(key);
    if (image) put(key, { action: "remove", alt: "" });
  }
  async function saveOne(
    examId: string,
    question: QuestionFormValue,
  ): Promise<{ ok: boolean; image?: QuestionImage | null; code?: string }> {
    const key = questionDraftKey(question),
      draft = current.current[key];
    if (!draft?.action) return { ok: true };
    if (draft.code === "IMAGE_CONFLICT" || draft.code === "IMAGE_NOT_FOUND")
      return { ok: false, code: draft.code };
    if (draft.busy || draft.checking) return { ok: false };
    if (!question.id) {
      put(key, {
        ...draft,
        error:
          "Guardado, pero no se pudo confirmar el ID de esta pregunta. No se subió la imagen. Recarga antes de continuar.",
      });
      return { ok: false };
    }
    put(key, { ...draft, busy: true, error: undefined });
    try {
      let saved: Question | undefined;
      if (draft.action === "upload" && draft.file)
        saved = await questionImageApi.upload(examId, question.id, draft.file, draft.alt);
      else if (draft.action === "alt")
        saved = await questionImageApi.alt(examId, question.id, draft.alt);
      else if (draft.action === "remove") await questionImageApi.remove(examId, question.id);
      discard(key);
      return { ok: true, image: saved?.image ?? null };
    } catch (error) {
      const code = error instanceof ApiError ? error.code : undefined;
      put(key, { ...draft, busy: false, error: questionImageError(error), code });
      return { ok: false, code };
    }
  }
  const entries = Object.values(drafts);
  return {
    drafts,
    discard,
    choose,
    changeAlt,
    remove,
    saveOne,
    hasPending: entries.some((entry) => entry.action !== null),
    checking: entries.some((entry) => entry.checking),
    saving: entries.some((entry) => entry.busy),
    pending: () => Object.values(current.current).some((entry) => entry.action !== null),
    working: () => Object.values(current.current).some((entry) => entry.busy || entry.checking),
  };
}
