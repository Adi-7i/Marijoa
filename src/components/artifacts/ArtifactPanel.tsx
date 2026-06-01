"use client";

import { useState } from "react";
import type { Artifact } from "@/types/marijoa";
import { Spinner } from "@/components/ui/Spinner";
import { Notice } from "@/components/ui/Notice";
import { ArtifactList } from "./ArtifactList";
import { ArtifactDetail } from "./ArtifactDetail";

interface ArtifactPanelProps {
  artifacts: Artifact[];
  isLoading?: boolean;
  error?: string | null;
  onDelete?: (id: string) => Promise<void> | void;
}

export function ArtifactPanel({
  artifacts,
  isLoading = false,
  error = null,
  onDelete,
}: ArtifactPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const selected = artifacts.find((a) => a.id === selectedId) ?? null;

  async function handleDelete(id: string) {
    setPendingDeleteId(id);
    try {
      await onDelete?.(id);
      setSelectedId(null);
    } finally {
      setPendingDeleteId(null);
    }
  }

  if (isLoading && artifacts.length === 0) {
    return (
      <div style={{ padding: 24, display: "flex", justifyContent: "center" }}>
        <Spinner aria-label="Loading artifacts" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <Notice>
          <span role="alert">{error}</span>
        </Notice>
      </div>
    );
  }

  if (selected) {
    return (
      <ArtifactDetail
        artifact={selected}
        onBack={() => setSelectedId(null)}
        onDelete={pendingDeleteId === selected.id ? undefined : handleDelete}
      />
    );
  }

  return (
    <ArtifactList
      artifacts={artifacts}
      onSelect={(id) => setSelectedId(id)}
    />
  );
}
