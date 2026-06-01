"use client";

import { useState } from "react";
import type { FileItem } from "@/types/marijoa";
import { formatBytes, formatRelative } from "@/lib/format";
import { DownloadIcon, EyeIcon, Trash2Icon } from "@/components/chat/icons";
import { FileTypeBadge } from "./FileTypeBadge";
import styles from "./files.module.css";

const STATUS_CLASS: Record<string, string> = {
  READY:      styles.statusReady,
  PROCESSING: styles.statusProcessing,
  FAILED:     styles.statusFailed,
  UPLOADED:   styles.statusUploaded,
};

interface FileCardProps {
  file: FileItem;
  onDelete?: (id: string) => void;
}

export function FileCard({ file, onDelete }: FileCardProps) {
  const [showNotice, setShowNotice] = useState(false);

  function mockAction(msg: string) {
    setShowNotice(true);
    setTimeout(() => setShowNotice(false), 2500);
    console.info("[mock]", msg);
  }

  const statusClass = file.status ? (STATUS_CLASS[file.status] ?? "") : "";

  return (
    <div className={styles.card}>
      <FileTypeBadge filename={file.name} />
      <div className={styles.cardInfo}>
        <p className={styles.cardName} title={file.name}>{file.name}</p>
        <div className={styles.cardMeta}>
          <span className={styles.cardMetaText}>{formatBytes(file.sizeBytes)}</span>
          {file.status && (
            <span className={`${styles.statusBadge} ${statusClass}`}>{file.status}</span>
          )}
          <span className={styles.cardMetaText}>{formatRelative(file.uploadedAt)}</span>
        </div>
        {showNotice && (
          <p className={styles.uploadNotice}>
            File actions will connect to the backend in the integration phase.
          </p>
        )}
      </div>
      <div className={styles.cardActions}>
        <button
          type="button"
          className={styles.cardAction}
          aria-label="View file"
          title="View"
          onClick={() => mockAction("view")}
        >
          <EyeIcon size={13} />
        </button>
        <button
          type="button"
          className={styles.cardAction}
          aria-label="Download file"
          title="Download"
          onClick={() => mockAction("download")}
        >
          <DownloadIcon size={13} />
        </button>
        <button
          type="button"
          className={`${styles.cardAction} ${styles.cardActionDanger}`}
          aria-label="Delete file"
          title="Delete"
          onClick={() => onDelete?.(file.id)}
        >
          <Trash2Icon size={13} />
        </button>
      </div>
    </div>
  );
}
