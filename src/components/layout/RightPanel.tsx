"use client";

import type React from "react";
import type { Artifact, FileItem, Organization, Workspace, WorkspaceContext, RightPanelTab } from "@/types/marijoa";
import { ArtifactPanel } from "@/components/artifacts/ArtifactPanel";
import { FilePanel } from "@/components/files/FilePanel";
import { WorkspaceContextPanel } from "@/components/workspace/WorkspaceContextPanel";
import { BoxIcon, FileTextIcon, InfoIcon, XIcon } from "@/components/chat/icons";
import styles from "./panel.module.css";

type TabIcon = (props: { size?: number }) => React.ReactElement | null;

interface RightPanelProps {
  tab: RightPanelTab;
  onTabChange: (tab: RightPanelTab) => void;
  onClose: () => void;
  artifacts: Artifact[];
  artifactsLoading?: boolean;
  artifactsError?: string | null;
  files: FileItem[];
  filesLoading?: boolean;
  filesError?: string | null;
  workspaceName?: string;
  orgName?: string;
  workspace?: Workspace;
  org?: Organization;
  context?: WorkspaceContext;
  canUpload?: boolean;
  onUploadFile?: (file: File) => Promise<void> | void;
  onDeleteFile?: (id: string) => Promise<void> | void;
  onDeleteArtifact?: (id: string) => Promise<void> | void;
}

const TABS: { id: RightPanelTab; label: string; Icon: TabIcon }[] = [
  { id: "artifacts", label: "Artifacts", Icon: BoxIcon },
  { id: "files",     label: "Files",     Icon: FileTextIcon },
  { id: "context",   label: "Context",   Icon: InfoIcon },
];

export function RightPanel({
  tab,
  onTabChange,
  onClose,
  artifacts,
  artifactsLoading = false,
  artifactsError = null,
  files,
  filesLoading = false,
  filesError = null,
  workspace,
  org,
  context,
  canUpload = false,
  onUploadFile,
  onDeleteFile,
  onDeleteArtifact,
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
        {tab === "artifacts" && (
          <ArtifactPanel
            artifacts={artifacts}
            isLoading={artifactsLoading}
            error={artifactsError}
            onDelete={onDeleteArtifact}
          />
        )}
        {tab === "files" && (
          <FilePanel
            files={files}
            isLoading={filesLoading}
            error={filesError}
            canUpload={canUpload}
            onUpload={onUploadFile}
            onDelete={onDeleteFile}
          />
        )}
        {tab === "context"   && (
          <WorkspaceContextPanel
            workspace={workspace}
            org={org}
            context={context}
            artifacts={artifacts}
            files={files}
          />
        )}
      </div>
    </aside>
  );
}
