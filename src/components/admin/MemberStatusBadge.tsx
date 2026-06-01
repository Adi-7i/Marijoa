import type { MemberStatus } from "@/types/marijoa";
import styles from "./admin.module.css";

const STATUS_CONFIG: Record<MemberStatus, { label: string; className: string }> = {
  ACTIVE:    { label: "Active",    className: styles.statusActive },
  INVITED:   { label: "Invited",   className: styles.statusInvited },
  SUSPENDED: { label: "Suspended", className: styles.statusSuspended },
  REMOVED:   { label: "Removed",   className: styles.statusRemoved },
};

interface MemberStatusBadgeProps {
  status: MemberStatus;
}

export function MemberStatusBadge({ status }: MemberStatusBadgeProps) {
  const { label, className } = STATUS_CONFIG[status];
  return (
    <span className={`${styles.statusBadge} ${className}`}>
      <span className={styles.statusDot} aria-hidden="true" />
      {label}
    </span>
  );
}
