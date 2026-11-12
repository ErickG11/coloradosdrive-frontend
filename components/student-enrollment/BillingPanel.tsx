"use client";
import { useRef, useState } from "react";
import { Button, Card, Input, Select } from "@/components/ui";
import { useFetch } from "@/hooks/useFetch";
import { api } from "@/lib/api/client";
import type { BillingProfile, BillingDocument, BillingState } from "@/types/billing";
import { paymentMoney } from "@/lib/api/studentPayment";
const empty: BillingProfile = {
  name: "",
  documentType: "cedula",
  documentNumber: "",
  address: "",
  email: "",
};
export function BillingPanel({ studentId }: { studentId?: string }) {
  const root = studentId
    ? `/admin/facturacion/alumnos/${studentId}`
    : "/estudiantes/inscripcion/facturacion";
  const state = useFetch<BillingState>(root);
  const [draft, setDraft] = useState<BillingProfile | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const profile = draft ?? state.data?.profile ?? empty;
  async function save() {
    setBusy(true);
    setMessage("");
    try {
      await api.patch(root, { profile });
      setDraft(null);
      state.refetch();
      setMessage("Datos del pagador guardados. Los documentos ya autorizados conservan sus datos.");
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "No se pudo guardar. Consulta antes de reintentar.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (state.data?.active === false) return null;
  if (state.error)
    return (
      <p role="alert">
        {state.error}{" "}
        <Button type="button" onClick={state.refetch}>
          Consultar facturación
        </Button>
      </p>
    );
  if (!state.data) return <p role="status">Consultando facturación…</p>;
  return (
    <Card title="Facturación" className="mt-4">
      <p>
        El pagador puede ser distinto del alumno. El pago y la matrícula se conservan aunque la
        factura esté pendiente. La emisión se tramita por el canal fiscal autorizado.
      </p>
      <fieldset className="mt-3 grid gap-3 sm:grid-cols-2" disabled={busy}>
        <Input
          label="Nombre o razón social del pagador"
          maxLength={200}
          value={profile.name}
          onChange={(e) => setDraft({ ...profile, name: e.target.value })}
        />
        <Select
          label="Tipo de documento del pagador"
          value={profile.documentType}
          onChange={(e) =>
            setDraft({ ...profile, documentType: e.target.value as BillingProfile["documentType"] })
          }
        >
          <option value="cedula">Cédula</option>
          <option value="ruc">RUC</option>
          <option value="pasaporte">Pasaporte</option>
          <option value="otro">Otro</option>
        </Select>
        <Input
          label="Número de documento del pagador"
          maxLength={30}
          value={profile.documentNumber}
          onChange={(e) => setDraft({ ...profile, documentNumber: e.target.value })}
        />
        <Input
          label="Dirección del pagador"
          maxLength={300}
          value={profile.address}
          onChange={(e) => setDraft({ ...profile, address: e.target.value })}
        />
        <Input
          label="Correo para facturación"
          type="email"
          maxLength={254}
          value={profile.email}
          onChange={(e) => setDraft({ ...profile, email: e.target.value })}
        />
        <Button type="button" onClick={() => void save()}>
          Guardar datos de facturación
        </Button>
      </fieldset>
      {state.data.documents?.map((d) => (
        <BillingDocumentView
          key={d.id}
          document={d}
          admin={Boolean(studentId)}
          onChanged={state.refetch}
        />
      ))}
      {!state.data.documents?.length ? (
        <p className="mt-3">
          Sin documentos de pagos nuevos desde la activación. Los pagos históricos no se emiten
          automáticamente.
        </p>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
      <Button type="button" variant="secondary" className="mt-3" onClick={state.refetch}>
        Actualizar estado fiscal
      </Button>
    </Card>
  );
}
function BillingDocumentView({
  document: d,
  admin,
  onChanged,
}: {
  document: BillingDocument;
  admin: boolean;
  onChanged: () => void;
}) {
  const [action, setAction] = useState<"authorization" | "refund" | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [accessKey, setAccessKey] = useState(""),
    [authorization, setAuthorization] = useState(""),
    [authorizedAt, setAuthorizedAt] = useState(""),
    [ruc, setRuc] = useState("");
  const [amount, setAmount] = useState(""),
    [reason, setReason] = useState(""),
    [reference, setReference] = useState("");
  const refundKey = useRef<string | null>(null);
  async function execute(kind: "retry" | "record_authorization" | "refund") {
    setBusy(true);
    setMessage("");
    try {
      if (kind === "refund") {
        refundKey.current ??= crypto.randomUUID();
        await api.post("/admin/facturacion/devoluciones", {
          paymentId: d.paymentId,
          key: refundKey.current,
          amountCentavos: Math.round(Number(amount) * 100),
          reason,
          reference,
        });
        refundKey.current = null;
        setMessage(
          "Devolución documentada; nota de crédito en cola. No se ejecutó ninguna devolución del proveedor.",
        );
      } else {
        await api.post(`/admin/facturacion/documentos/${d.id}`, {
          updatedAt: d.updatedAt,
          action: kind,
          data:
            kind === "retry" ? {} : { accessKey, authorization, authorizedAt, providerRuc: ruc },
        });
        setMessage(
          kind === "retry"
            ? "Reintento encolado sin duplicar documento."
            : "Autorización existente registrada.",
        );
      }
      setAction(null);
      onChanged();
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "No se confirmó la respuesta. Consulta el documento antes de repetir.",
      );
      onChanged();
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="mt-4 grid gap-3 rounded-sm border p-3"
      aria-label={d.kind === "invoice" ? "Factura" : "Nota de crédito"}
    >
      <p>
        {d.kind === "invoice" ? "Factura" : "Nota de crédito"} · {paymentMoney(d.amountCentavos)} ·{" "}
        {d.state === "issued"
          ? "Autorización registrada"
          : d.state === "failed"
            ? "Pagado, emisión fallida; matrícula conservada"
            : "Pagado, factura pendiente"}
      </p>
      {d.state === "issued" ? (
        <dl className="break-all">
          <dt>Clave de acceso</dt>
          <dd>{d.accessKey}</dd>
          <dt>Autorización</dt>
          <dd>{d.authorization}</dd>
          <dt>RUC del proveedor externo (información adicional)</dt>
          <dd>{d.providerRuc}</dd>
        </dl>
      ) : (
        <p>
          Intentos: {d.attempts}.{" "}
          {d.lastErrorCode === "FACTURA_PROVEEDOR_PENDIENTE"
            ? "Proveedor pendiente de elección; requiere gestión manual."
            : ""}
        </p>
      )}
      {admin ? (
        <fieldset disabled={busy} className="grid gap-3">
          {d.state !== "issued" ? (
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="secondary" onClick={() => void execute("retry")}>
                Reintentar sin duplicar
              </Button>
              <Button type="button" variant="secondary" onClick={() => setAction("authorization")}>
                Registrar autorización existente
              </Button>
            </div>
          ) : d.kind === "invoice" ? (
            <Button type="button" variant="secondary" onClick={() => setAction("refund")}>
              Documentar devolución realizada
            </Button>
          ) : null}
          {action === "authorization" ? (
            <>
              <p>
                Registrar solo un documento realmente autorizado por el canal fiscal externo. Este
                formulario no emite ni verifica ante SRI.
              </p>
              <Input
                label="Clave de acceso"
                inputMode="numeric"
                maxLength={49}
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
              />
              <Input
                label="Autorización externa"
                maxLength={160}
                value={authorization}
                onChange={(e) => setAuthorization(e.target.value)}
              />
              <Input
                label="Fecha e instante de autorización (ISO con zona)"
                placeholder="AAAA-MM-DDTHH:mm:ss-05:00"
                value={authorizedAt}
                onChange={(e) => setAuthorizedAt(e.target.value)}
              />
              <Input
                label="RUC del proveedor externo"
                inputMode="numeric"
                maxLength={13}
                value={ruc}
                onChange={(e) => setRuc(e.target.value)}
              />
              <Button type="button" onClick={() => void execute("record_authorization")}>
                Guardar autorización existente
              </Button>
            </>
          ) : null}
          {action === "refund" ? (
            <>
              <p>
                Documenta una devolución ya realizada por el canal autorizado. No ejecuta reembolso,
                no altera automáticamente la matrícula y deja la nota de crédito pendiente.
              </p>
              <Input
                label="Importe devuelto (USD)"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <Input
                label="Motivo de devolución"
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <Input
                label="Referencia de evidencia"
                maxLength={160}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
              <Button type="button" onClick={() => void execute("refund")}>
                Documentar y encolar nota de crédito
              </Button>
            </>
          ) : null}
          {action ? (
            <Button type="button" variant="secondary" onClick={() => setAction(null)}>
              Cerrar sin guardar
            </Button>
          ) : null}
        </fieldset>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
