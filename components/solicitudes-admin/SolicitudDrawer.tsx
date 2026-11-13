"use client";
import type { ReactNode } from "react";
import { SidePanel } from "@/components/ui/SidePanel";
export function SolicitudDrawer({
  title,
  avatar,
  header,
  children,
  footer,
  actions,
  onClose,
}: {
  title: string;
  avatar: ReactNode;
  header: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  actions?: ReactNode;
  onClose: () => void;
}) {
  return (
    <SidePanel
      id="solicitud-panel"
      title={title}
      avatar={avatar}
      header={header}
      actions={actions}
      footer={footer}
      onClose={onClose}
    >
      {children}
    </SidePanel>
  );
}
