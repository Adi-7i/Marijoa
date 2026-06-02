"use client";

import { useState } from "react";
import type { Organization, OrganizationRole } from "@/types/marijoa";
import { RoleBadge } from "@/components/organization/RoleBadge";
import { Spinner } from "@/components/ui/Spinner";
import { Notice } from "@/components/ui/Notice";
import { UsageSummaryCards } from "./UsageSummaryCards";
import { AdminUsersTable } from "./AdminUsersTable";
import { AuditLogsTable } from "./AuditLogsTable";
import { AdminSettingsPlaceholder } from "./AdminSettingsPlaceholder";
import {
  ActivityIcon,
  SettingsIcon,
  UsersIcon,
  BarChartIcon,
} from "@/components/chat/icons";
import {
  useAdminAuditLogs,
  useAdminUsage,
  useAdminUsers,
} from "@/hooks/useAdminData";
import styles from "./admin.module.css";

type AdminTab = "overview" | "users" | "audit" | "settings";

const TABS: Array<{ id: AdminTab; label: string; icon: React.ReactNode }> = [
  { id: "overview", label: "Overview",   icon: <BarChartIcon size={14} /> },
  { id: "users",    label: "Users",      icon: <UsersIcon size={14} /> },
  { id: "audit",    label: "Audit Logs", icon: <ActivityIcon size={14} /> },
  { id: "settings", label: "Settings",   icon: <SettingsIcon size={14} /> },
];

interface AdminDashboardProps {
  organizationId: string;
  org: Organization;
  currentUserRole: OrganizationRole;
}

export function AdminDashboard({
  organizationId,
  org,
  currentUserRole,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  const enabled = Boolean(organizationId);
  const usage = useAdminUsage(organizationId, enabled);
  const users = useAdminUsers(organizationId, enabled);
  const audit = useAdminAuditLogs(organizationId, enabled);

  const initials = org.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const adminAccessDenied =
    usage.errorStatus === 403 ||
    users.errorStatus === 403 ||
    audit.errorStatus === 403;

  return (
    <main className={styles.dashboard} aria-label="Admin dashboard">
      <div className={styles.dashboardInner}>

        {/* Header */}
        <div className={styles.dashboardHeader}>
          <div className={styles.dashboardLogoWrap} aria-hidden="true">
            {initials}
          </div>
          <div className={styles.dashboardHeaderContent}>
            <div className={styles.dashboardTitleRow}>
              <h1 className={styles.dashboardTitle}>{org.name}</h1>
              <span className={styles.dashboardAdminLabel}>Admin</span>
              <RoleBadge role={currentUserRole} />
            </div>
            <p className={styles.dashboardDesc}>
              Manage organization users, usage, and activity.
            </p>
          </div>
        </div>

        {/* Tab Bar */}
        <nav className={styles.tabBar} aria-label="Admin sections">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ""}`}
              aria-current={activeTab === tab.id ? "page" : undefined}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        {adminAccessDenied ? (
          <div style={{ marginTop: 16 }}>
            <Notice>
              <span role="alert">You do not have admin access to this organization.</span>
            </Notice>
          </div>
        ) : (
          <>
            {activeTab === "overview" && (
              <AdminTabContent
                isLoading={usage.isLoading && !usage.data}
                error={usage.error}
                onRetry={() => void usage.refresh()}
              >
                {usage.data && <UsageSummaryCards usage={usage.data} />}
              </AdminTabContent>
            )}

            {activeTab === "users" && (
              <AdminTabContent
                isLoading={users.isLoading && (users.data ?? []).length === 0}
                error={users.error}
                onRetry={() => void users.refresh()}
              >
                <AdminUsersTable members={users.data ?? []} />
              </AdminTabContent>
            )}

            {activeTab === "audit" && (
              <AdminTabContent
                isLoading={audit.isLoading && (audit.data ?? []).length === 0}
                error={audit.error}
                onRetry={() => void audit.refresh()}
              >
                <AuditLogsTable logs={audit.data ?? []} />
              </AdminTabContent>
            )}

            {activeTab === "settings" && (
              <AdminSettingsPlaceholder />
            )}
          </>
        )}
      </div>
    </main>
  );
}

function AdminTabContent({
  isLoading,
  error,
  onRetry,
  children,
}: {
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  children: React.ReactNode;
}) {
  if (isLoading) {
    return (
      <div style={{ padding: 40, display: "flex", justifyContent: "center" }}>
        <Spinner aria-label="Loading admin data" />
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ marginTop: 16 }}>
        <Notice>
          <span role="alert">{error}</span>
          <button
            type="button"
            onClick={onRetry}
            style={{
              marginLeft: 8,
              background: "transparent",
              border: 0,
              color: "var(--color-text)",
              textDecoration: "underline",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </Notice>
      </div>
    );
  }
  return <>{children}</>;
}
