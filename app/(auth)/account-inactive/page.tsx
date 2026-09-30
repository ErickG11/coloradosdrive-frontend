import Link from "next/link";

import { Card } from "@/components/ui";

export default function AccountInactivePage() {
  return (
    <Card title="Cuenta inactiva">
      <p role="alert" className="text-sm text-text-secondary">
        Tu cuenta de instructor está inactiva. Contacta al administrador para recuperar el acceso.
      </p>
      <Link href="/login" className="mt-4 inline-block text-accent-blue underline">
        Volver al inicio de sesión
      </Link>
    </Card>
  );
}
