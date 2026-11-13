"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (compact)
    return (
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-center px-0"
        isLoading={isLoading}
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
        onClick={() => void handleLogout()}
      >
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
          <path
            d="M8 3.5H5a1.5 1.5 0 0 0-1.5 1.5v10A1.5 1.5 0 0 0 5 16.5h3M12.5 6.5 16 10l-3.5 3.5M16 10H8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Button>
    );
  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start pl-12"
      isLoading={isLoading}
      onClick={() => void handleLogout()}
    >
      Cerrar sesión
    </Button>
  );
}
