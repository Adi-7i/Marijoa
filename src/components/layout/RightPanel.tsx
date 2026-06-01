"use client";

import type React from "react";
import type { RightPanelTab, Artifact, FileItem } from "@/types/marijoa";
import { ArtifactPanel } from "@/components/artifacts/ArtifactPanel";
import { FilePanel } from "@/components/files/FilePanel";
import { BoxIcon, FileTextIcon, InfoIcon, XIcon } from "@/components/chat/icons";
import styles from "./panel.module.css";

type TabIcon = (props: { size?: number }) => React.ReactElement | null;

interface RightPanelProps {
  tab: RightPanelTab;
  onTabChange: (tab: RightPanelTab) => void;
  onClose: () => void;
  artifacts: Artifact[];
  files: FileItem[];
  workspaceName?: string;
  orgName?: string;
}

const TABS: { id: RightPanelTab; label: string; Icon: TabIcon }[] = [
  { id: "artifacts", label: "Artifacts", Icon: BoxIcon },
  { id: "files", label: "Files", Icon: FileTextIcon },
  { id: "context", label: "Context", Icon: InfoIcon },
];

export function RightPanel({
  tab,
  onTabChange,
  onClose,
  artifacts,
  files,
  workspaceName,
  orgName,
}: RightPanelProps) {
  return (
    <aside className={styles.rightPanel} aria-label="Workspace panel">
      <div className={styles.rightPanelHeader}>
        <div className={styles.rightPanelTabs} role="tablist">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={`${styles.rightPanelTab} ${tab === id ? styles.rightPanelTabActive : ""}`}
              onClick={() => onTabChange(id)}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={styles.rightPanelClose}
          aria-label="Close panel"
          onClick={onClose}
        >
          <XIcon size={14} />
        </button>
      </div>

      <div className={styles.rightPanelBody} role="tabpanel">
        {tab === "artifacts" && <ArtifactPanel artifacts={artifacts} />}
        {tab === "files" && <FilePanel files={files} />}
        {tab === "context" && (
          <div className={styles.contextSection}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>Workspace Info</span>
            </div>
            {workspaceName && (
              <div className={styles.contextRow}>
                <span className={styles.contextLabel}>Workspace</span>
                <span className={styles.contextValue}>{workspaceName}</span>
              </div>
            )}
            {orgName && (
              <div className={styles.contextRow}>
                <span className={styles.contextLabel}>Organization</span>
                <span className={styles.contextValue}>{orgName}</span>
              </div>
            )}
            <div className={styles.contextRow}>
              <span className={styles.contextLabel}>Model</span>
              <span className={styles.contextValue}>Backend AI Gateway (pending integration)</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
