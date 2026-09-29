export type AssignmentWarning = "matricula_por_cerrar";

// Refleja la respuesta de POST /admin/cohort-assignment/preview.
export interface CohortAssignmentSuggestion {
  cohortId: string;
  cohortNombre: string;
  warning: AssignmentWarning | null;
}

export interface CohortAssignmentUnavailable {
  cohortId: null;
  mensaje: string;
}

export type CohortAssignmentPreview = CohortAssignmentSuggestion | CohortAssignmentUnavailable;
