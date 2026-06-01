import { SettingsIcon, PersonIcon, BuildingIcon } from "@/components/chat/icons";
import styles from "@/components/layout/panel.module.css";

interface AdminPanelPlaceholderProps {
  orgName?: string;
}

export function AdminPanelPlaceholder({ orgName }: AdminPanelPlaceholderProps) {
  return (
    <div className={styles.adminPanel}>
      <div className={styles.adminSection}>
        <div className={styles.adminSectionHeader}>
          <BuildingIcon size={13} />
          {orgName ?? "Organization"} Settings
        </div>
        <div className={styles.adminSectionBody}>
          Organization management, billing, and SSO configuration will be available here once admin APIs are integrated.
        </div>
      </div>

      <div className={styles.adminSection}>
        <div className={styles.adminSectionHeader}>
          <PersonIcon size={13} />
          Members
        </div>
        <div className={styles.adminSectionBody}>
          Invite and manage team members, assign roles, and configure permissions.
        </div>
      </div>

      <div className={styles.adminSection}>
        <div className={styles.adminSectionHeader}>
          <SettingsIcon size={13} />
          Workspace Settings
        </div>
        <div className={styles.adminSectionBody}>
          Configure workspace AI models, context retention, and workspace-level access controls.
        </div>
      </div>
    </div>
  );
}
