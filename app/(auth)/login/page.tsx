import type { Metadata } from "next";
import { LoginScreen } from "@/components/auth/LoginScreen";

import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <LoginScreen>
      <LoginForm />
    </LoginScreen>
  );
}
