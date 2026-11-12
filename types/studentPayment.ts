export interface StudentPayment {
  id: string;
  reservationId: string | null;
  enrollmentId: string | null;
  proveedor: "simulado" | "manual" | "kushki";
  estado: "pendiente" | "rechazado" | "aprobado" | "revision";
  subtotalCentavos: number;
  recargoCentavos: number;
  ivaCentavos: number;
  totalCentavos: number;
  moneda: "USD";
  createdAt: string;
  confirmedAt: string | null;
  serverNow: string;
  requiereRevision: boolean;
  puedeCobrar?: boolean;
  correoEnviado?: boolean;
}
export interface PaymentConfiguration {
  proveedor: StudentPayment["proveedor"];
  publicKey: string | null;
  inTest: boolean;
}
export type PaymentQuote = Pick<
  StudentPayment,
  "subtotalCentavos" | "recargoCentavos" | "ivaCentavos" | "totalCentavos" | "moneda"
>;
export interface AdminPaymentData {
  cotizacion: PaymentQuote | null;
  pagos: {
    id: string;
    estado: StudentPayment["estado"];
    proveedor: StudentPayment["proveedor"];
    total_centavos: number;
    recibido_centavos: number | null;
    motivo_revision: string | null;
    comprobante: string | null;
    created_at: string;
  }[];
  reserva: {
    purpose?: "initial" | "plan_change";
    id: string;
    estado: "vigente" | "pago_en_curso" | "vencida" | "liberada" | "confirmada";
    enrollment_id: string;
    expira_at: string;
  } | null;
}
