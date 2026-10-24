"use client";
import { useParams } from "next/navigation";
import { CohortsWorkspace } from "../../CohortsWorkspace";
export default function EditCohortPage() {
  const params = useParams<{ id: string }>();
  return <CohortsWorkspace initialPanel={params.id} />;
}
