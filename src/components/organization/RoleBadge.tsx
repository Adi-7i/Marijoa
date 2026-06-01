"use client";

import type { OrganizationRole } from "@/types/marijoa";
import styles from "./organization.module.css";

const ROLE_LABELS: Record<OrganizationRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MANAGER: "Manager",
  MEMBER: "Member",
  VIEWER: "Viewer",
};

const ROLE_CLASSES: Record<OrganizationRole, string> = {
  OWNER: styles.roleOwner,
  ADMIN: styles.roleAdmin,
  MANAGER: styles.roleManager,
  MEMBER: styles.roleMember,
  VIEWER: styles.roleViewer,
};

interface RoleBadgeProps {
  role: OrganizationRole;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <span className={`${styles.roleBadge} ${ROLE_CLASSES[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}
