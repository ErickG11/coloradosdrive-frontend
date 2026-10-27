import type { ReactNode } from "react";

import { LoginHeroImage } from "@/components/layout/LoginHeroImage";

export default function AccountInactiveLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-full flex-1 md:grid-cols-2">
      <div className="relative hidden overflow-hidden md:block">
        <LoginHeroImage />
      </div>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12">
        <div className="relative z-10 w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
