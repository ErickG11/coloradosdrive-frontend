import type { Metadata } from "next";

import { MfaEnrolamiento } from "@/components/seguridad/MfaEnrolamiento";
import { RequestRetentionControls } from "@/components/seguridad/RequestRetentionControls";

export const metadata: Metadata = { title: "Seguridad de la cuenta" };

export default function Page() {
  return (
    <>
      <MfaEnrolamiento />
      <RequestRetentionControls />
    </>
  );
}
