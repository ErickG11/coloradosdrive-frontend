"use client";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { ICard } from "@kushki/js-sdk/Card";
import { Button } from "@/components/ui/Button";
import type { StudentPayment, PaymentConfiguration } from "@/types/studentPayment";
interface Props {
  payment: StudentPayment;
  config: PaymentConfiguration;
  onToken: (token: string) => Promise<void>;
  disabled: boolean;
}
export function KushkiHostedFields({ payment, config, onToken, disabled }: Props) {
  const prefix = `kushki-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const root = useRef<HTMLFormElement>(null);
  const instance = useRef<ICard | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const mounted = useRef(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    mounted.current = true;
    const container = root.current;
    queue.current = queue.current.then(async () => {
      if (cancelled || !container || !config.publicKey) return;
      try {
        const [{ init }, { initCardToken }] = await Promise.all([
          import("@kushki/js-sdk"),
          import("@kushki/js-sdk/Card"),
        ]);
        if (cancelled) return;
        const sdk = await init({ publicCredentialId: config.publicKey, inTest: config.inTest });
        if (cancelled) return;
        const computed = getComputedStyle(container);
        const card = await initCardToken(sdk, {
          currency: "USD",
          isSubscription: false,
          preventAutofill: true,
          amount: { subtotalIva0: payment.totalCentavos / 100, subtotalIva: 0, iva: 0, ice: 0 },
          fields: {
            cardholderName: {
              selector: `#${prefix}-name`,
              label: "Nombre del titular",
              isRequired: true,
            },
            cardNumber: {
              selector: `#${prefix}-number`,
              label: "Número de tarjeta",
              isRequired: true,
            },
            expirationDate: {
              selector: `#${prefix}-expiry`,
              label: "Vencimiento",
              isRequired: true,
            },
            cvv: { selector: `#${prefix}-cvv`, label: "Código de seguridad", isRequired: true },
          },
          styles: {
            input: {
              color: computed.color,
              "font-family": computed.fontFamily,
              "font-size": "16px",
              padding: "12px",
            },
            container: { background: computed.getPropertyValue("--color-bg-field").trim() },
            label: { color: computed.color },
          },
        });
        if (cancelled) {
          container.querySelectorAll("[data-hosted-field]").forEach((el) => el.replaceChildren());
          return;
        }
        instance.current = card;
        setReady(true);
        setError(null);
      } catch {
        if (!cancelled) {
          setReady(false);
          setError("No pudimos cargar el formulario seguro. Reintenta o contacta a la escuela.");
        }
      }
    });
    return () => {
      cancelled = true;
      mounted.current = false;
      instance.current = null;
      container?.querySelectorAll("[data-hosted-field]").forEach((el) => el.replaceChildren());
    };
  }, [prefix, config.publicKey, config.inTest, payment.totalCentavos, retry]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!instance.current || busy || disabled) return;
    setBusy(true);
    setError(null);
    try {
      const { token } = await instance.current.requestToken();
      if (mounted.current) await onToken(token);
    } catch {
      if (mounted.current)
        setError(
          "Revisa los campos y completa la validación de tu banco. Si ya intentaste pagar, consulta el estado antes de repetir.",
        );
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <form onSubmit={(e) => void submit(e)} className="mt-5 grid gap-4" ref={root}>
      <p className="text-sm text-text-secondary">
        Los datos de tu tarjeta se introducen en campos seguros de Kushki.
      </p>
      <div id={`${prefix}-name`} data-hosted-field className="min-h-20" />
      <div id={`${prefix}-number`} data-hosted-field className="min-h-20" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div id={`${prefix}-expiry`} data-hosted-field className="min-h-20" />
        <div id={`${prefix}-cvv`} data-hosted-field className="min-h-20" />
      </div>
      {!ready && !error ? <p role="status">Cargando formulario seguro…</p> : null}
      {error ? (
        <div>
          <p role="alert">{error}</p>
          {!ready ? (
            <Button
              type="button"
              variant="secondary"
              className="mt-3"
              onClick={() => {
                setReady(false);
                setError(null);
                setRetry((v) => v + 1);
              }}
            >
              Reintentar carga
            </Button>
          ) : null}
        </div>
      ) : null}
      <Button type="submit" disabled={!ready || disabled || busy} isLoading={busy}>
        Confirmar pago con tarjeta
      </Button>
    </form>
  );
}
