"use client";

import type { FileItem } from "@/types/marijoa";
import { UploadIcon } from "@/components/chat/icons";
import { FileCard } from "./FileCard";
import { FileUploadPlaceholder } from "./FileUploadPlaceholder";
import styles from "./files.module.css";

interface FileListProps {
  files: FileItem[];
  canUpload?: boolean;
  onUpload?: (file: File) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
}

export function FileList({ files, canUpload = false, onUpload, onDelete }: FileListProps) {
  return (
    <div className={styles.panel}>
      <FileUploadPlaceholder canUpload={canUpload} onUpload={onUpload} />

      {files.length > 0 && (
        <div className={styles.panelHeader}>
          <span className={styles.countLabel}>
            {files.length} file{files.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {files.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}><UploadIcon size={18} /></div>
          <p className={styles.emptyTitle}>No files yet</p>
          <p className={styles.emptySub}>
            Upload files using the drop zone above. They will appear here once stored in your workspace.
          </p>
        </div>
      ) : (
        <div className={styles.list}>
          {files.map((file) => (
            <FileCard key={file.id} file={file} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
