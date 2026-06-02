"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { UploadIcon } from "@/components/chat/icons";
import { Spinner } from "@/components/ui/Spinner";
import { MAX_UPLOAD_BYTES, validateFileSize } from "@/lib/api/files";
import { showToast } from "@/lib/toast";
import styles from "./files.module.css";

interface FileUploadPlaceholderProps {
  canUpload?: boolean;
  onUpload?: (file: File) => Promise<void> | void;
}

const SIZE_LABEL = `${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB`;

export function FileUploadPlaceholder({ canUpload = false, onUpload }: FileUploadPlaceholderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File) {
    if (!canUpload || !onUpload) {
      showToast("Open a workspace before uploading files.", { variant: "info" });
      return;
    }
    const validation = validateFileSize(file);
    if (!validation.ok) {
      showToast(validation.message ?? "Invalid file.", { variant: "error" });
      return;
    }
    setBusy(true);
    try {
      await onUpload(file);
    } finally {
      setBusy(false);
    }
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void handleFile(file);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    if (!dragOver) setDragOver(true);
  }

  function handleDragLeave() {
    if (dragOver) setDragOver(false);
  }

  const disabled = !canUpload || busy;

  return (
    <div>
      <label
        className={styles.uploadArea}
        data-drag-over={dragOver ? "true" : undefined}
        aria-disabled={disabled}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={disabled ? (event) => event.preventDefault() : handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: "hidden",
            clip: "rect(0,0,0,0)",
            border: 0,
          }}
          onChange={handleChange}
          disabled={disabled}
          accept=".pdf,.docx,.txt,.csv,.png,.jpg,.jpeg,.webp,.gif,.md,.yaml,.yml,.json,.xlsx,.pptx"
        />
        <div className={styles.uploadIcon}>
          {busy ? <Spinner aria-label="Uploading" /> : <UploadIcon size={18} />}
        </div>
        <p className={styles.uploadText}>
          {busy ? "Uploading…" : "Drag files here or click to browse"}
        </p>
        <p className={styles.uploadHint}>
          PDF, DOCX, TXT, CSV, PNG, JPEG · Max {SIZE_LABEL}
        </p>
      </label>
    </div>
  );
}
