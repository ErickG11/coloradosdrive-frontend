import { Card } from "@/components/ui";
import { LogoutButton } from "@/components/layout/LogoutButton";

export default function AccountInactivePage() {
  return (
    <Card title="Cuenta inactiva" titleAs="h1">
      <p role="alert" className="text-sm text-text-secondary">
        Tu cuenta está inactiva. Contacta al administrador para recuperar el acceso.
      </p>
      {/* Con sesión vigente /login redirige de vuelta aquí: se cierra sesión primero. */}
      <div className="mt-4">
        <LogoutButton />
      </div>
    </Card>
  );
}
