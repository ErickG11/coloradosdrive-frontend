"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Toast } from "@/components/inscripcion/Toast";
const Context = createContext<(message: string) => void>(() => undefined);
export function ContentFeedback({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  const notify = useCallback((text: string) => setMessage(text), []);
  return (
    <Context.Provider value={notify}>
      {children}
      <div className="fixed bottom-4 right-4 z-[70] max-h-[40dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto">
        <Toast message={message} onDismiss={() => setMessage("")} />
      </div>
    </Context.Provider>
  );
}
export const useContentSuccess = () => useContext(Context);
