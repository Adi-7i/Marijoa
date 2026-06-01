import { APP_NAME } from "@/lib/constants";
import { MarijoaMark } from "@/components/chat/icons";
import { AuthFeatureList } from "./AuthFeatureList";
import styles from "./auth.module.css";

export function AuthBrandPanel() {
  return (
    <aside className={styles.brandColumn} aria-label="Marijoa brand panel">
      <div className={styles.brandHeader}>
        <MarijoaMark size={28} className={styles.brandLogo} />
        <span className={styles.brandName}>{APP_NAME}</span>
      </div>

      <div className={styles.brandBody}>
        <h1 className={styles.brandTagline}>
          Private AI workspace for personal chat and business workflows.
        </h1>
        <p className={styles.brandLead}>
          Marijoa keeps your conversations, files, and team context together —
          so your AI work feels calm, organized, and yours.
        </p>

        <AuthFeatureList />

        <div className={styles.brandModes}>
          <div className={styles.brandModeCard}>
            <span className={styles.brandModeTitle}>Personal Mode</span>
            <span className={styles.brandModeDesc}>
              A private workspace just for you. Start chatting immediately.
            </span>
          </div>
          <div className={styles.brandModeCard}>
            <span className={styles.brandModeTitle}>Organization Mode</span>
            <span className={styles.brandModeDesc}>
              Premium / business tier — shared workspaces, members, and admin
              controls.
            </span>
          </div>
        </div>

        <span className={styles.brandTeaser}>Premium tier · coming soon</span>
      </div>

      <div className={styles.brandFooter}>
        <span>© Marijoa — Private AI workspace.</span>
        <span>All data stays inside your organization boundary.</span>
      </div>
    </aside>
  );
}
