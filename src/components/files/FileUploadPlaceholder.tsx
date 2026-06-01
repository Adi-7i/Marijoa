"use client";

import { useState } from "react";
import { UploadIcon } from "@/components/chat/icons";
import styles from "./files.module.css";

export function FileUploadPlaceholder() {
  const [showNotice, setShowNotice] = useState(false);

  function handleClick() {
    setShowNotice(true);
    setTimeout(() => setShowNotice(false), 4000);
  }

  return (
    <div>
      <button
        type="button"
        className={styles.uploadArea}
        onClick={handleClick}
        aria-label="Upload files"
      >
        <div className={styles.uploadIcon}>
          <UploadIcon size={18} />
        </div>
        <p className={styles.uploadText}>Drag files here or click to browse</p>
        <p className={styles.uploadHint}>PDF, DOCX, TXT, CSV, PNG, JPEG · Max 25 MB</p>
      </button>
      {showNotice && (
        <p className={styles.uploadNotice} role="status">
          File upload will connect to the Azure Blob-backed API in the integration phase.
        </p>
      )}
    </div>
  );
}
