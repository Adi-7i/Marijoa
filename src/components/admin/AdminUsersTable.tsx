"use client";

import { useState } from "react";
import type { OrganizationMember, OrganizationRole } from "@/types/marijoa";
import { RoleBadge } from "@/components/organization/RoleBadge";
import { InviteMemberModal } from "@/components/organization/InviteMemberModal";
import { MemberStatusBadge } from "./MemberStatusBadge";
import { UserPlusIcon } from "@/components/chat/icons";
import { formatRelative } from "@/lib/format";
import styles from "./admin.module.css";

const PALETTE_CLASSES = [
  styles.avatarPalette0,
  styles.avatarPalette1,
  styles.avatarPalette2,
  styles.avatarPalette3,
  styles.avatarPalette4,
  styles.avatarPalette5,
  styles.avatarPalette6,
];

const ROLE_OPTIONS: Array<{ value: "" | OrganizationRole; label: string }> = [
  { value: "", label: "All Roles" },
  { value: "OWNER",   label: "Owner" },
  { value: "ADMIN",   label: "Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "MEMBER",  label: "Member" },
  { value: "VIEWER",  label: "Viewer" },
];

const ACTION_NOTICE =
  "Member role and status updates are coming soon.";

interface AdminUsersTableProps {
  members: OrganizationMember[];
  organizationId?: string;
  onInviteCreated?: () => void;
}

export function AdminUsersTable({
  members,
  organizationId,
  onInviteCreated,
}: AdminUsersTableProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | OrganizationRole>("");
  const [notice, setNotice] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const filtered = members.filter((m) => {
    const matchesSearch =
      !search.trim() ||
      m.fullName.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = !roleFilter || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  function showNotice(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  }

  return (
    <div>
      {/* Controls */}
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.sectionTitle}>Members</p>
          <p className={styles.sectionSubtitle}>{members.length} total</p>
        </div>
        <div className={styles.sectionActions}>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => setShowInviteModal(true)}
          >
            <UserPlusIcon size={14} />
            Invite Member
          </button>
        </div>
      </div>

      <div className={styles.tableControls}>
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Search members…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search members"
        />
        <select
          className={styles.filterSelect}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as "" | OrganizationRole)}
          aria-label="Filter by role"
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Member</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.emptyState}>
                  No members match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((member, index) => (
                <tr key={member.id}>
                  <td>
                    <div className={styles.userCell}>
                      <span
                        className={`${styles.avatar} ${PALETTE_CLASSES[index % PALETTE_CLASSES.length]}`}
                        aria-hidden="true"
                      >
                        {member.initials}
                      </span>
                      <div className={styles.userInfo}>
                        <p className={styles.userName}>{member.fullName}</p>
                        <p className={styles.userEmail}>{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <RoleBadge role={member.role} />
                  </td>
                  <td>
                    <MemberStatusBadge status={member.status} />
                  </td>
                  <td className={styles.metaText}>
                    {member.joinedAt ? formatRelative(member.joinedAt) : "—"}
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.rowAction}
                        onClick={() => showNotice(ACTION_NOTICE)}
                        aria-label={`Change role for ${member.fullName}`}
                      >
                        Change Role
                      </button>
                      {member.status !== "SUSPENDED" && (
                        <button
                          type="button"
                          className={styles.rowAction}
                          onClick={() => showNotice(ACTION_NOTICE)}
                          aria-label={`Suspend ${member.fullName}`}
                        >
                          Suspend
                        </button>
                      )}
                      <button
                        type="button"
                        className={`${styles.rowAction} ${styles.rowActionDanger}`}
                        onClick={() => showNotice(ACTION_NOTICE)}
                        aria-label={`Remove ${member.fullName}`}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {notice && <p className={styles.notice}>{notice}</p>}

      {showInviteModal && organizationId && (
        <InviteMemberModal
          organizationId={organizationId}
          onInvited={() => {
            onInviteCreated?.();
          }}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  );
}
