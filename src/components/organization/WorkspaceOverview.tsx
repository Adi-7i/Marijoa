"use client";

import { useEffect, useState } from "react";
import type { Chat, Organization, OrganizationMember, Workspace } from "@/types/marijoa";
import { LayersIcon, MessageSquareIcon, PlusIcon, ShieldIcon, UploadIcon } from "@/components/chat/icons";
import { RoleBadge } from "./RoleBadge";
import { MemberPreview } from "./MemberPreview";
import styles from "./organization.module.css";

interface WorkspaceOverviewProps {
  workspace: Workspace;
  org: Organization;
  chats: Chat[];
  members: OrganizationMember[];
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
}

export function WorkspaceOverview({
  workspace,
  org,
  chats,
  members,
  onSelectChat,
  onNewChat,
}: WorkspaceOverviewProps) {
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 3500);
    return () => clearTimeout(t);
  }, [toastMsg]);

  return (
    <main className={styles.pageArea} aria-label={`${workspace.name} workspace overview`}>
      <div className={styles.pageInner}>
        {/* Header */}
        <header className={styles.pageHeader}>
          <div className={styles.wsLogoWrap} aria-hidden="true">
            <LayersIcon size={20} />
          </div>
          <div className={styles.pageHeaderContent}>
            <h1 className={styles.pageName}>{workspace.name}</h1>
            <p className={styles.pageSlug}>{org.name}</p>
          </div>
          {workspace.userRole && (
            <div className={styles.pageHeaderMeta}>
              <RoleBadge role={workspace.userRole} />
            </div>
          )}
        </header>

        {workspace.description && (
          <p className={styles.pageDesc}>{workspace.description}</p>
        )}

        {/* Stats */}
        <div className={styles.statsBar} role="group" aria-label="Workspace stats">
          <div className={styles.statItem}>
            <span className={styles.statValue}>{chats.length}</span>
            <span className={styles.statLabel}>Chats</span>
          </div>
          <div className={styles.statDivider} aria-hidden="true" />
          <div className={styles.statItem}>
            <span className={styles.statValue}>{workspace.fileCount ?? 0}</span>
            <span className={styles.statLabel}>Files</span>
          </div>
          <div className={styles.statDivider} aria-hidden="true" />
          <div className={styles.statItem}>
            <span className={styles.statValue}>{workspace.artifactCount ?? 0}</span>
            <span className={styles.statLabel}>Artifacts</span>
          </div>
          <div className={styles.statDivider} aria-hidden="true" />
          <div className={styles.statItem}>
            <span className={styles.statValue}>{members.length}</span>
            <span className={styles.statLabel}>Members</span>
          </div>
        </div>

        {/* Quick actions */}
        <section className={styles.section} aria-labelledby="ws-actions-heading">
          <p id="ws-actions-heading" className={styles.sectionTitle}>Quick Actions</p>
          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
              onClick={onNewChat}
            >
              <PlusIcon size={14} aria-hidden="true" />
              New Chat
            </button>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => setToastMsg("Use the Files tab in the right panel to upload.")}
            >
              <UploadIcon size={14} aria-hidden="true" />
              Add File
            </button>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => setToastMsg("Open Admin from the sidebar to manage this organization.")}
            >
              <ShieldIcon size={14} aria-hidden="true" />
              Admin
            </button>
          </div>
          {toastMsg && (
            <div className={styles.toastBar} role="status" aria-live="polite">
              {toastMsg}
            </div>
          )}
        </section>

        {/* Recent chats */}
        <section className={styles.section} aria-labelledby="ws-chats-heading">
          <p id="ws-chats-heading" className={styles.sectionTitle}>Recent Chats</p>
          {chats.length === 0 ? (
            <p className={styles.emptyChatMsg}>
              No chats yet. Start one with &ldquo;New Chat&rdquo; above.
            </p>
          ) : (
            <ul className={styles.chatList} aria-label="Workspace chats">
              {chats.map((chat) => (
                <li key={chat.id}>
                  <button
                    type="button"
                    className={styles.chatItem}
                    onClick={() => onSelectChat(chat.id)}
                    aria-label={`Open chat: ${chat.title}`}
                  >
                    <MessageSquareIcon size={13} aria-hidden="true" />
                    <span className={styles.chatItemTitle}>{chat.title}</span>
                    <span className={styles.chatItemMeta}>
                      {chat.messageCount > 0 ? `${chat.messageCount} msg` : "empty"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Members */}
        <section className={styles.section} aria-labelledby="ws-members-heading">
          <p id="ws-members-heading" className={styles.sectionTitle}>Team Members</p>
          <MemberPreview members={members} max={4} showList={false} />
        </section>
      </div>
    </main>
  );
}
