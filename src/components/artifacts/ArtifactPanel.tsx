"use client";

import { useState } from "react";
import type { Artifact } from "@/types/marijoa";
import { ArtifactList } from "./ArtifactList";
import { ArtifactDetail } from "./ArtifactDetail";

interface ArtifactPanelProps {
  artifacts: Artifact[];
}

export function ArtifactPanel({ artifacts }: ArtifactPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const visible = artifacts.filter((a) => !deletedIds.has(a.id));
  const selected = visible.find((a) => a.id === selectedId) ?? null;

  function handleDelete(id: string) {
    setDeletedIds((prev) => new Set([...prev, id]));
    setSelectedId(null);
  }

  if (selected) {
    return (
      <ArtifactDetail
        artifact={selected}
        onBack={() => setSelectedId(null)}
        onDelete={handleDelete}
      />
    );
  }

  return (
    <ArtifactList
      artifacts={visible}
      onSelect={(id) => setSelectedId(id)}
    />
  );
}
