"use client";

import type { FileItem } from "@/types/marijoa";
import { FileList } from "./FileList";
import { Spinner } from "@/components/ui/Spinner";
import { Notice } from "@/components/ui/Notice";

interface FilePanelProps {
  files: FileItem[];
  isLoading?: boolean;
  error?: string | null;
  canUpload?: boolean;
  onUpload?: (file: File) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
}

export function FilePanel({
  files,
  isLoading = false,
  error = null,
  canUpload = false,
  onUpload,
  onDelete,
}: FilePanelProps) {
  if (isLoading && files.length === 0) {
    return (
      <div style={{ padding: 24, display: "flex", justifyContent: "center" }}>
        <Spinner aria-label="Loading files" />
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
  return (
    <FileList
      files={files}
      canUpload={canUpload}
      onUpload={onUpload}
      onDelete={onDelete}
    />
  );
}
