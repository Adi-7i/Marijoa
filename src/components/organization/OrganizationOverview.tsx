"use client";

import type { Organization, OrganizationMember, OrganizationRole, Workspace } from "@/types/marijoa";
import { LayersIcon, PlusCircleIcon, UsersIcon } from "@/components/chat/icons";
import { RoleBadge } from "./RoleBadge";
import { MemberPreview } from "./MemberPreview";
import styles from "./organization.module.css";

interface OrganizationOverviewProps {
  org: Organization;
  workspaces: Workspace[];
  members: OrganizationMember[];
  onSelectWorkspace: (id: string) => void;
  onAddWorkspace?: () => void;
  onInviteMember?: () => void;
}

function canManageOrganization(role: OrganizationRole | undefined): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export function OrganizationOverview({
  org,
  workspaces,
  members,
  onSelectWorkspace,
  onAddWorkspace,
  onInviteMember,
}: OrganizationOverviewProps) {
  const orgInitials = org.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const canManage = canManageOrganization(org.role) && org.type === "COMPANY";

  return (
    <main className={styles.pageArea} aria-label="Organization overview">
      <div className={styles.pageInner}>
        {/* Header */}
        <header className={styles.pageHeader}>
          <div className={styles.orgLogoWrap} aria-hidden="true">
            {orgInitials}
          </div>
          <div className={styles.pageHeaderContent}>
            <h1 className={styles.pageName}>{org.name}</h1>
            <p className={styles.pageSlug}>/{org.slug}</p>
          </div>
          <div className={styles.pageHeaderMeta}>
            <RoleBadge role={org.role} />
          </div>
        </header>

        {/* Stats */}
        <div className={styles.statsBar} role="group" aria-label="Organization stats">
          <div className={styles.statItem}>
            <span className={styles.statValue}>{workspaces.length}</span>
            <span className={styles.statLabel}>Workspaces</span>
          </div>
          <div className={styles.statDivider} aria-hidden="true" />
          <div className={styles.statItem}>
            <span className={styles.statValue}>{org.memberCount ?? members.length}</span>
            <span className={styles.statLabel}>Members</span>
          </div>
        </div>

        {/* Workspaces */}
        <section className={styles.section} aria-labelledby="ws-heading">
          <p id="ws-heading" className={styles.sectionTitle}>Workspaces</p>
          {workspaces.length === 0 ? (
            <div
              role="status"
              style={{
                padding: "20px 16px",
                border: "1px dashed var(--color-border)",
                borderRadius: 10,
                color: "var(--color-text-muted)",
                fontSize: 13.5,
                lineHeight: 1.5,
              }}
            >
              <p style={{ margin: 0, fontWeight: 600, color: "var(--color-text-secondary)" }}>
                No workspaces yet
              </p>
              <p style={{ margin: "4px 0 0" }}>
                Create a workspace to start organization chats.
              </p>
            </div>
          ) : (
            <div className={styles.wsGrid}>
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  type="button"
                  className={styles.wsCard}
                  onClick={() => onSelectWorkspace(ws.id)}
                  aria-label={`Open ${ws.name} workspace`}
                >
                  <div className={styles.wsCardHeader}>
                    <div className={styles.wsCardIcon} aria-hidden="true">
                      <LayersIcon size={14} />
                    </div>
                    <span className={styles.wsCardName}>{ws.name}</span>
                  </div>
                  {ws.description && (
                    <p className={styles.wsCardDesc}>{ws.description}</p>
                  )}
                  <div className={styles.wsCardStats} aria-hidden="true">
                    {typeof ws.chatCount === "number" && (
                      <span className={styles.wsCardStat}>{ws.chatCount} chats</span>
                    )}
                    {typeof ws.fileCount === "number" && ws.fileCount > 0 && (
                      <span className={styles.wsCardStat}>{ws.fileCount} files</span>
                    )}
                    {typeof ws.artifactCount === "number" && ws.artifactCount > 0 && (
                      <span className={styles.wsCardStat}>{ws.artifactCount} artifacts</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Members */}
        <section className={styles.section} aria-labelledby="members-heading">
          <p id="members-heading" className={styles.sectionTitle}>Team Members</p>
          <MemberPreview members={members} max={5} showList={true} />
        </section>

        {/* Actions */}
        {canManage && (
          <section className={styles.section} aria-labelledby="actions-heading">
            <p id="actions-heading" className={styles.sectionTitle}>Actions</p>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.actionBtn}
                onClick={onAddWorkspace}
                disabled={!onAddWorkspace}
              >
                <PlusCircleIcon size={14} aria-hidden="true" />
                Add Workspace
              </button>
              <button
                type="button"
                className={styles.actionBtn}
                onClick={onInviteMember}
                disabled={!onInviteMember}
              >
                <UsersIcon size={14} aria-hidden="true" />
                Invite Member
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
