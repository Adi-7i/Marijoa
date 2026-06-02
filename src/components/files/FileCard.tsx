"use client";

import { useState } from "react";
import type { FileItem } from "@/types/marijoa";
import { formatBytes, formatRelative } from "@/lib/format";
import { DownloadIcon, EyeIcon, Trash2Icon } from "@/components/chat/icons";
import { showToast } from "@/lib/toast";
import { getDownloadUrl } from "@/lib/api/files";
import { ApiError } from "@/lib/api/errors";
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
  onDelete?: (id: string) => Promise<void> | void;
}

export function FileCard({ file, onDelete }: FileCardProps) {
  const [busy, setBusy] = useState<"none" | "download" | "delete">("none");
  const statusClass = file.status ? (STATUS_CLASS[file.status] ?? "") : "";

  async function openDownload(mode: "preview" | "download") {
    if (busy !== "none") return;
    setBusy("download");
    try {
      const { download_url } = await getDownloadUrl(file.id);
      if (typeof window !== "undefined") {
        if (mode === "preview") {
          window.open(download_url, "_blank", "noopener,noreferrer");
        } else {
          const link = document.createElement("a");
          link.href = download_url;
          link.download = file.name;
          link.rel = "noopener noreferrer";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not get file URL.";
      showToast(message, { variant: "error" });
    } finally {
      setBusy("none");
    }
  }

  async function handleDelete() {
    if (!onDelete || busy !== "none") return;
    setBusy("delete");
    try {
      await onDelete(file.id);
    } finally {
      setBusy("none");
    }
  }

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
      </div>
      <div className={styles.cardActions}>
        <button
          type="button"
          className={styles.cardAction}
          aria-label="View file"
          title="View"
          disabled={busy !== "none"}
          onClick={() => void openDownload("preview")}
        >
          <EyeIcon size={13} />
        </button>
        <button
          type="button"
          className={styles.cardAction}
          aria-label="Download file"
          title="Download"
          disabled={busy !== "none"}
          onClick={() => void openDownload("download")}
        >
          <DownloadIcon size={13} />
        </button>
        {onDelete && (
          <button
            type="button"
            className={`${styles.cardAction} ${styles.cardActionDanger}`}
            aria-label="Delete file"
            title="Delete"
            disabled={busy !== "none"}
            onClick={() => void handleDelete()}
          >
            <Trash2Icon size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
