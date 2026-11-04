import type { Metadata } from "next";

import { MfaEnrolamiento } from "@/components/seguridad/MfaEnrolamiento";

export const metadata: Metadata = { title: "Seguridad de la cuenta" };

export default function Page() {
  return <MfaEnrolamiento />;
}
