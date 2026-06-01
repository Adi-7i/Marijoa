"use client";

import { useState } from "react";
import type {
  Organization,
  OrganizationMember,
  AuditLog,
  AdminUsageSummary,
  OrganizationRole,
} from "@/types/marijoa";
import { RoleBadge } from "@/components/organization/RoleBadge";
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
import styles from "./admin.module.css";

type AdminTab = "overview" | "users" | "audit" | "settings";

const TABS: Array<{ id: AdminTab; label: string; icon: React.ReactNode }> = [
  { id: "overview", label: "Overview",   icon: <BarChartIcon size={14} /> },
  { id: "users",    label: "Users",      icon: <UsersIcon size={14} /> },
  { id: "audit",    label: "Audit Logs", icon: <ActivityIcon size={14} /> },
  { id: "settings", label: "Settings",   icon: <SettingsIcon size={14} /> },
];

interface AdminDashboardProps {
  org: Organization;
  usage: AdminUsageSummary;
  members: OrganizationMember[];
  auditLogs: AuditLog[];
  currentUserRole: OrganizationRole;
}

export function AdminDashboard({
  org,
  usage,
  members,
  auditLogs,
  currentUserRole,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  const initials = org.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

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
        {activeTab === "overview" && (
          <UsageSummaryCards usage={usage} />
        )}

        {activeTab === "users" && (
          <AdminUsersTable members={members} />
        )}

        {activeTab === "audit" && (
          <AuditLogsTable logs={auditLogs} />
        )}

        {activeTab === "settings" && (
          <AdminSettingsPlaceholder />
        )}
      </div>
    </main>
  );
}
