"use client";

import type { OrganizationRole, Workspace } from "@/types/marijoa";
import { BuildingIcon, LayersIcon } from "@/components/chat/icons";
import styles from "./workspace.module.css";

interface WorkspaceListProps {
  orgName: string;
  orgRole: OrganizationRole;
  workspaces: Workspace[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onShowOrgOverview?: () => void;
}

export function WorkspaceList({
  orgName,
  orgRole: _orgRole,
  workspaces,
  selectedId,
  onSelect,
  onShowOrgOverview,
}: WorkspaceListProps) {
  if (workspaces.length === 0) return null;

  return (
    <div className={styles.wsListWrap}>
      <button
        type="button"
        className={styles.orgIndicator}
        onClick={onShowOrgOverview}
        aria-label={`${orgName} — view organization overview`}
        title="View organization overview"
      >
        <BuildingIcon size={12} aria-hidden="true" className={styles.orgIndicatorIcon} />
        <span className={styles.orgIndicatorName}>{orgName}</span>
      </button>

      <ul className={styles.wsList} role="list" aria-label="Organization workspaces">
        {workspaces.map((ws) => (
          <li key={ws.id}>
            <button
              type="button"
              className={`${styles.wsListItem} ${ws.id === selectedId ? styles.wsListItemActive : ""}`}
              aria-pressed={ws.id === selectedId}
              aria-label={`${ws.name} workspace`}
              onClick={() => onSelect(ws.id)}
            >
              <LayersIcon size={12} aria-hidden="true" className={styles.wsListItemIcon} />
              <span className={styles.wsListItemName}>{ws.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
