import {
  SettingsIcon,
  ShieldIcon,
  UsersIcon,
  ZapIcon,
  BarChartIcon,
} from "@/components/chat/icons";
import styles from "./admin.module.css";

const SETTINGS_CARDS = [
  {
    title: "General Settings",
    desc: "Organization name, slug, logo, and timezone preferences.",
    icon: <SettingsIcon size={15} />,
  },
  {
    title: "Member Permissions",
    desc: "Default role for new members, workspace access policies, and guest controls.",
    icon: <UsersIcon size={15} />,
  },
  {
    title: "AI Workspace Settings",
    desc: "Default AI model, context retention window, and system instruction templates.",
    icon: <ZapIcon size={15} />,
  },
  {
    title: "Security & Audit",
    desc: "Session policies, IP allowlisting, SSO configuration, and audit retention.",
    icon: <ShieldIcon size={15} />,
  },
  {
    title: "Billing / Premium Plan",
    desc: "Subscription tier, seat count, usage limits, and payment information.",
    icon: <BarChartIcon size={15} />,
  },
];

export function AdminSettingsPlaceholder() {
  return (
    <div>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.sectionTitle}>Organization Settings</p>
          <p className={styles.sectionSubtitle}>
            Configuration options will be available in the integration phase.
          </p>
        </div>
      </div>

      <div className={styles.settingsGrid}>
        {SETTINGS_CARDS.map((card) => (
          <div key={card.title} className={styles.settingCard}>
            <p className={styles.settingCardTitle}>
              <span className={styles.settingCardIconWrap}>{card.icon}</span>
              {card.title}
            </p>
            <p className={styles.settingCardBody}>{card.desc}</p>
            <span className={styles.settingCardCta}>Coming in a later phase.</span>
          </div>
        ))}
      </div>
    </div>
  );
}
