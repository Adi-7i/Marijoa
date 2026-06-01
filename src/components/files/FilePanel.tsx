import type { FileItem } from "@/types/marijoa";
import { FileTextIcon, UploadIcon } from "@/components/chat/icons";
import styles from "@/components/layout/panel.module.css";

interface FilePanelProps {
  files: FileItem[];
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileExtension(name: string) {
  return name.split(".").pop()?.toUpperCase() ?? "FILE";
}

export function FilePanel({ files }: FilePanelProps) {
  if (files.length === 0) {
    return (
      <div className={styles.placeholderHero}>
        <div className={styles.placeholderIcon}>
          <UploadIcon size={18} />
        </div>
        <p className={styles.placeholderTitle}>No files uploaded</p>
        <p className={styles.placeholderSub}>
          Files attached to this workspace will appear here. File upload will be available once the backend is connected.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>{files.length} file{files.length !== 1 ? "s" : ""}</span>
      </div>
      <div className={styles.placeholderList}>
        {files.map((file) => (
          <div key={file.id} className={styles.fileCard} role="article">
            <div className={styles.fileCardIcon}>
              <FileTextIcon size={14} />
            </div>
            <div className={styles.fileCardInfo}>
              <div className={styles.fileCardName}>{file.name}</div>
              <div className={styles.fileCardSize}>
                {fileExtension(file.name)} · {formatBytes(file.sizeBytes)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
