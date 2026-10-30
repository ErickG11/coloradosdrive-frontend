'use client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

// Se monta únicamente en las pantallas nuevas; la región viva permanece montada.
export function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return <div role="status" aria-live="polite" aria-atomic="true">
    {message ? <Card className="border-status-success bg-status-success-bg text-status-success">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p>{message}</p><Button type="button" variant="ghost" className="min-h-11" onClick={onDismiss}>Cerrar aviso</Button>
      </div>
    </Card> : null}
  </div>;
}
