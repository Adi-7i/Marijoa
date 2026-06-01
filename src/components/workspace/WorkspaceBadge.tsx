import type { AppMode } from "@/types/marijoa";
import { LayersIcon } from "@/components/chat/icons";
import styles from "./workspace.module.css";

interface WorkspaceBadgeProps {
  name: string;
  mode: AppMode;
}

export function WorkspaceBadge({ name, mode }: WorkspaceBadgeProps) {
  return (
    <span className={`${styles.badge} ${mode === "personal" ? styles.badgePersonal : styles.badgeCompany}`}>
      <LayersIcon size={10} aria-hidden="true" />
      {name}
    </span>
  );
}
