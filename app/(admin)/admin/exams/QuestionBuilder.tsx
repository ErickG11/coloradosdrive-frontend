"use client";

import { Button, IconButton, Input, Select, Textarea } from "@/components/ui";
import { TrashIcon } from "@/components/ui/icons";
import type { QuestionType } from "@/types";

export interface QuestionOptionFormValue {
  optionText: string;
  isCorrect: boolean;
}

export interface QuestionFormValue {
  /** Presente solo en edición, para preguntas que ya existían al cargar el formulario. */
  id?: string;
  type: QuestionType;
  prompt: string;
  points: string;
  correctAnswerText: string;
  synonyms: string[];
  options: QuestionOptionFormValue[];
}

export function emptyQuestion(): QuestionFormValue {
  return {
    type: "opcion_multiple",
    prompt: "",
    points: "1",
    correctAnswerText: "",
    synonyms: [],
    options: [
      { optionText: "", isCorrect: true },
      { optionText: "", isCorrect: false },
    ],
  };
}

const TYPE_OPTIONS: { value: QuestionType; label: string }[] = [
  { value: "opcion_multiple", label: "Opción múltiple" },
  { value: "texto_abierto", label: "Texto abierto" },
];

interface QuestionBuilderProps {
  question: QuestionFormValue;
  index: number;
  canRemove: boolean;
  onChange: (question: QuestionFormValue) => void;
  onRemove: () => void;
}

// Una pregunta del constructor dinámico (RF-02, tarea 2): cambia de forma
// según el tipo (opción múltiple con arreglo de opciones + cuál es
// correcta vía radio; texto abierto con respuesta correcta + sinónimos).
// orderIndex no se guarda en el estado local: se calcula por posición en
// el arreglo al armar el payload (ver ExamForm), así que reordenar nunca
// puede dejar índices inconsistentes.
export function QuestionBuilder({
  question,
  index,
  canRemove,
  onChange,
  onRemove,
}: QuestionBuilderProps) {
  const questionLabel = `Pregunta ${index + 1}`;

  function updateField<K extends keyof QuestionFormValue>(field: K, value: QuestionFormValue[K]) {
    onChange({ ...question, [field]: value });
  }

  function handleTypeChange(type: QuestionType) {
    // Cambiar de tipo resetea los campos exclusivos del otro tipo: el
    // backend rechaza correctAnswerText en opcion_multiple y options en
    // texto_abierto (questions_open_text_has_answer, migración 004).
    onChange({
      ...question,
      type,
      correctAnswerText: "",
      synonyms: [],
      options:
        type === "opcion_multiple"
          ? [
              { optionText: "", isCorrect: true },
              { optionText: "", isCorrect: false },
            ]
          : [],
    });
  }

  function updateOption(optionIndex: number, value: QuestionOptionFormValue) {
    const options = question.options.map((option, i) => (i === optionIndex ? value : option));
    updateField("options", options);
  }

  function addOption() {
    updateField("options", [...question.options, { optionText: "", isCorrect: false }]);
  }

  function removeOption(optionIndex: number) {
    updateField(
      "options",
      question.options.filter((_, i) => i !== optionIndex),
    );
  }

  function markOptionCorrect(optionIndex: number) {
    updateField(
      "options",
      question.options.map((option, i) => ({ ...option, isCorrect: i === optionIndex })),
    );
  }

  function updateSynonym(synonymIndex: number, value: string) {
    updateField(
      "synonyms",
      question.synonyms.map((synonym, i) => (i === synonymIndex ? value : synonym)),
    );
  }

  function addSynonym() {
    updateField("synonyms", [...question.synonyms, ""]);
  }

  function removeSynonym(synonymIndex: number) {
    updateField(
      "synonyms",
      question.synonyms.filter((_, i) => i !== synonymIndex),
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-md border border-border bg-bg-sunken p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-base font-semibold text-text-primary">{questionLabel}</h3>
        <IconButton
          icon={<TrashIcon className="h-5 w-5" />}
          variant="danger"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label={`Quitar ${questionLabel}`}
          title={canRemove ? undefined : "El examen necesita al menos una pregunta"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
        <Select
          label={`${questionLabel} - Tipo`}
          name={`question-${index}-type`}
          value={question.type}
          onChange={(event) => handleTypeChange(event.target.value as QuestionType)}
        >
          {TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Input
          label={`${questionLabel} - Puntos`}
          name={`question-${index}-points`}
          type="number"
          min="0.01"
          step="0.01"
          required
          value={question.points}
          onChange={(event) => updateField("points", event.target.value)}
        />
      </div>

      <Textarea
        label={`${questionLabel} - Enunciado`}
        name={`question-${index}-prompt`}
        required
        value={question.prompt}
        onChange={(event) => updateField("prompt", event.target.value)}
      />

      {question.type === "opcion_multiple" ? (
        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium text-text-secondary">
            Opciones (marca la correcta)
          </span>
          {question.options.map((option, optionIndex) => (
            <div key={optionIndex} className="flex items-center gap-3">
              <input
                type="radio"
                name={`question-${index}-correct-option`}
                aria-label={`${questionLabel} - Opción ${optionIndex + 1} es correcta`}
                checked={option.isCorrect}
                onChange={() => markOptionCorrect(optionIndex)}
                className="h-4 w-4 accent-accent-red"
              />
              <Input
                label={`${questionLabel} - Opción ${optionIndex + 1}`}
                name={`question-${index}-option-${optionIndex}`}
                required
                value={option.optionText}
                onChange={(event) =>
                  updateOption(optionIndex, { ...option, optionText: event.target.value })
                }
                className="flex-1"
              />
              <IconButton
                icon={<TrashIcon className="h-5 w-5" />}
                variant="ghost"
                onClick={() => removeOption(optionIndex)}
                disabled={question.options.length <= 2}
                aria-label={`Quitar ${questionLabel} - Opción ${optionIndex + 1}`}
                title={
                  question.options.length <= 2
                    ? "Una pregunta de opción múltiple necesita al menos 2 opciones"
                    : undefined
                }
              />
            </div>
          ))}
          <Button type="button" variant="secondary" size="sm" onClick={addOption}>
            Agregar opción
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Textarea
            label={`${questionLabel} - Respuesta correcta`}
            name={`question-${index}-correct-answer-text`}
            required
            value={question.correctAnswerText}
            onChange={(event) => updateField("correctAnswerText", event.target.value)}
          />
          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium text-text-secondary">
              Sinónimos aceptados (opcional)
            </span>
            {question.synonyms.map((synonym, synonymIndex) => (
              <div key={synonymIndex} className="flex items-center gap-3">
                <Input
                  label={`${questionLabel} - Sinónimo ${synonymIndex + 1}`}
                  name={`question-${index}-synonym-${synonymIndex}`}
                  required
                  value={synonym}
                  onChange={(event) => updateSynonym(synonymIndex, event.target.value)}
                  className="flex-1"
                />
                <IconButton
                  icon={<TrashIcon className="h-5 w-5" />}
                  variant="ghost"
                  onClick={() => removeSynonym(synonymIndex)}
                  aria-label={`Quitar ${questionLabel} - Sinónimo ${synonymIndex + 1}`}
                />
              </div>
            ))}
            <Button type="button" variant="secondary" size="sm" onClick={addSynonym}>
              Agregar sinónimo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
