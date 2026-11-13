export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly field?: string;
  readonly detalles?: {
    faltantes?: string[];
    cantidad?: number;
    pendientes?: { item_id: string; titulo: string }[];
  };

  constructor(
    message: string,
    status: number,
    metadata?: {
      code?: string;
      field?: string;
      detalles?: {
        faltantes?: string[];
        cantidad?: number;
        pendientes?: { item_id: string; titulo: string }[];
      };
    },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = metadata?.code;
    this.field = metadata?.field;
    this.detalles = metadata?.detalles;
  }
}
