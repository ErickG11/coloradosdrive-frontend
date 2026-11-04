import type { Metadata } from "next";

import { LoginScreen } from "@/components/auth/LoginScreen";
import { MfaDesafio } from "@/components/seguridad/MfaDesafio";

export const metadata: Metadata = { title: "Verificación en dos pasos" };

export default function MfaPage() {
  return (
    <LoginScreen>
      <MfaDesafio />
    </LoginScreen>
  );
}
