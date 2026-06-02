"use client";

import type { Artifact, FileItem, Organization, Workspace, WorkspaceContext } from "@/types/marijoa";
import { ClockIcon, InfoIcon } from "@/components/chat/icons";
import { formatRelative } from "@/lib/format";
import styles from "@/components/layout/panel.module.css";

interface WorkspaceContextPanelProps {
  workspace?: Workspace;
  org?: Organization;
  context?: WorkspaceContext;
  artifacts?: Artifact[];
  files?: FileItem[];
}

export function WorkspaceContextPanel({
  workspace,
  org,
  context,
  artifacts = [],
  files = [],
}: WorkspaceContextPanelProps) {
  const latestArtifact = artifacts.slice().sort(
    (a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt)
  )[0];
  const latestFile = files.slice().sort(
    (a, b) => b.uploadedAt - a.uploadedAt
  )[0];

  return (
    <div className={styles.contextSection}>
      {/* Workspace header */}
      {workspace && (
        <div className={styles.contextRow}>
          <span className={styles.contextLabel}>Workspace</span>
          <span className={styles.contextValue}>{workspace.name}</span>
        </div>
      )}
      {org && (
        <div className={styles.contextRow}>
          <span className={styles.contextLabel}>Organization</span>
          <span className={styles.contextValue}>{org.name}</span>
        </div>
      )}

      {/* Summary */}
      {context?.summary && (
        <div className={styles.contextRow}>
          <span className={styles.contextLabel}>About</span>
          <span className={`${styles.contextValue} ${styles.contextValueMuted}`}>
            {context.summary}
          </span>
        </div>
      )}

      {/* Active instruction */}
      {workspace?.systemInstruction && (
        <div className={styles.contextRow}>
          <span className={styles.contextLabel}>
            <InfoIcon size={11} aria-hidden="true" style={{ verticalAlign: "middle" }} />
            {" "}Active Instruction
          </span>
          <span className={styles.contextValueInstruction}>
            {workspace.systemInstruction}
          </span>
        </div>
      )}

      {/* Stats */}
      {context?.stats && (
        <>
          <div className={styles.contextDivider} />
          <div className={styles.contextRow}>
            <span className={styles.contextLabel}>Stats</span>
            <div className={styles.contextStats}>
              <span className={styles.contextStat}>
                <strong>{context.stats.chats}</strong> chats
              </span>
              <span className={styles.contextStat}>
                <strong>{context.stats.files}</strong> files
              </span>
              <span className={styles.contextStat}>
                <strong>{context.stats.artifacts}</strong> artifacts
              </span>
              <span className={styles.contextStat}>
                <strong>{context.stats.members}</strong> members
              </span>
            </div>
          </div>
        </>
      )}

      {/* Recent activity */}
      {(latestArtifact || latestFile) && (
        <>
          <div className={styles.contextDivider} />
          <div className={styles.contextRow}>
            <span className={styles.contextLabel}>
              <ClockIcon size={11} aria-hidden="true" style={{ verticalAlign: "middle" }} />
              {" "}Recent
            </span>
            {latestArtifact && (
              <div className={styles.recentItem}>
                <span className={styles.recentLabel}>Artifact</span>
                <span className={styles.recentValue}>{latestArtifact.title}</span>
                <span className={styles.recentTime}>
                  {formatRelative(latestArtifact.updatedAt ?? latestArtifact.createdAt)}
                </span>
              </div>
            )}
            {latestFile && (
              <div className={styles.recentItem}>
                <span className={styles.recentLabel}>File</span>
                <span className={styles.recentValue}>{latestFile.name}</span>
                <span className={styles.recentTime}>{formatRelative(latestFile.uploadedAt)}</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Model */}
      <div className={styles.contextDivider} />
      <div className={styles.contextRow}>
        <span className={styles.contextLabel}>Model</span>
        <span className={styles.contextValue}>Marijoa AI Gateway</span>
      </div>
    </div>
  );
}
