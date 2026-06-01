"use client";

import type { OrganizationMember } from "@/types/marijoa";
import { RoleBadge } from "./RoleBadge";
import styles from "./organization.module.css";

// Fixed palette — index-based so no randomness causes hydration mismatch
const AVATAR_PALETTE: { bg: string; fg: string }[] = [
  { bg: "#e8e8e8", fg: "#1a1a1a" },
  { bg: "#dbeafe", fg: "#1d4ed8" },
  { bg: "#fce7f3", fg: "#be185d" },
  { bg: "#fef3c7", fg: "#92400e" },
  { bg: "#d1fae5", fg: "#065f46" },
  { bg: "#f3e8ff", fg: "#7c3aed" },
];

interface MemberPreviewProps {
  members: OrganizationMember[];
  max?: number;
  showList?: boolean;
}

export function MemberPreview({ members, max = 4, showList = false }: MemberPreviewProps) {
  const visible = members.slice(0, max);
  const overflow = members.length - max;

  return (
    <div>
      <div className={styles.memberRow}>
        <div className={styles.memberAvatarStack} aria-hidden="true">
          {visible.map((m, i) => {
            const { bg, fg } = AVATAR_PALETTE[i % AVATAR_PALETTE.length];
            return (
              <span
                key={m.id}
                className={styles.memberAvatar}
                style={{ backgroundColor: bg, color: fg }}
                title={m.fullName}
              >
                {m.initials}
              </span>
            );
          })}
          {overflow > 0 && (
            <span className={styles.memberAvatarOverflow}>+{overflow}</span>
          )}
        </div>
        <span className={styles.memberListLabel}>
          {members.length} member{members.length !== 1 ? "s" : ""}
        </span>
      </div>

      {showList && members.length > 0 && (
        <ul className={styles.memberList} role="list" aria-label="Team members">
          {members.map((m, i) => {
            const { bg, fg } = AVATAR_PALETTE[i % AVATAR_PALETTE.length];
            return (
              <li key={m.id} className={styles.memberListItem}>
                <span
                  className={styles.memberAvatar}
                  style={{ backgroundColor: bg, color: fg }}
                  aria-hidden="true"
                >
                  {m.initials}
                </span>
                <div className={styles.memberInfo}>
                  <div className={styles.memberName}>{m.fullName}</div>
                  <div className={styles.memberEmail}>{m.email}</div>
                </div>
                <RoleBadge role={m.role} />
                {m.status !== "ACTIVE" && (
                  <span className={`${styles.memberStatusBadge} ${styles.memberStatusInvited}`}>
                    {m.status}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
