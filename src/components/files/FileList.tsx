"use client";

import { useState } from "react";
import type { FileItem } from "@/types/marijoa";
import { UploadIcon } from "@/components/chat/icons";
import { FileCard } from "./FileCard";
import { FileUploadPlaceholder } from "./FileUploadPlaceholder";
import styles from "./files.module.css";

interface FileListProps {
  files: FileItem[];
}

export function FileList({ files }: FileListProps) {
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const visible = files.filter((f) => !deletedIds.has(f.id));

  function handleDelete(id: string) {
    setDeletedIds((prev) => new Set([...prev, id]));
  }

  return (
    <div className={styles.panel}>
      <FileUploadPlaceholder />

      {visible.length > 0 && (
        <div className={styles.panelHeader}>
          <span className={styles.countLabel}>
            {visible.length} file{visible.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {visible.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}><UploadIcon size={18} /></div>
          <p className={styles.emptyTitle}>No files yet</p>
          <p className={styles.emptySub}>
            Files attached to this workspace will appear here once backend is connected.
          </p>
        </div>
      ) : (
        <div className={styles.list}>
          {visible.map((file) => (
            <FileCard key={file.id} file={file} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
