"use client";

import { useState } from "react";
import type { AuditLog, AuditAction } from "@/types/marijoa";
import { AuditActionBadge } from "./AuditActionBadge";
import { formatRelative } from "@/lib/format";
import styles from "./admin.module.css";

const ACTION_FILTER_OPTIONS: Array<{ value: "" | AuditAction; label: string }> = [
  { value: "",                    label: "All Actions" },
  { value: "USER_LOGIN",          label: "User Login" },
  { value: "AI_RESPONSE_CREATED", label: "AI Response" },
  { value: "ARTIFACT_CREATED",    label: "Artifact Created" },
  { value: "ARTIFACT_UPDATED",    label: "Artifact Updated" },
  { value: "FILE_UPLOADED",       label: "File Uploaded" },
  { value: "WORKSPACE_CREATED",   label: "Workspace Created" },
  { value: "CHAT_CREATED",        label: "Chat Created" },
  { value: "ORGANIZATION_MEMBER_ADDED", label: "Member Added" },
  { value: "ADMIN_USERS_VIEWED",  label: "Users Viewed" },
  { value: "ADMIN_USAGE_VIEWED",  label: "Usage Viewed" },
  { value: "ADMIN_AUDIT_LOGS_VIEWED", label: "Audit Viewed" },
];

interface AuditLogsTableProps {
  logs: AuditLog[];
}

export function AuditLogsTable({ logs }: AuditLogsTableProps) {
  const [actionFilter, setActionFilter] = useState<"" | AuditAction>("");
  const [userFilter, setUserFilter] = useState("");

  const uniqueUsers = Array.from(
    new Set(logs.map((l) => l.userName).filter(Boolean))
  ) as string[];

  const filtered = logs
    .filter((l) => !actionFilter || l.action === actionFilter)
    .filter((l) => !userFilter || l.userName === userFilter)
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.sectionTitle}>Audit Logs</p>
          <p className={styles.sectionSubtitle}>{filtered.length} events shown</p>
        </div>
      </div>

      <div className={styles.tableControls}>
        <select
          className={styles.filterSelect}
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value as "" | AuditAction)}
          aria-label="Filter by action"
        >
          {ACTION_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          className={styles.filterSelect}
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          aria-label="Filter by user"
        >
          <option value="">All Users</option>
          {uniqueUsers.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>

        <span className={styles.filterPlaceholder} aria-hidden="true">
          Date range filtering coming soon
        </span>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Time</th>
              <th>Action</th>
              <th>User</th>
              <th>Entity</th>
              <th>Workspace</th>
              <th>IP Address</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.emptyState}>
                  No audit events match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((log) => (
                <tr key={log.id}>
                  <td className={styles.metaText} style={{ whiteSpace: "nowrap" }}>
                    {formatRelative(log.createdAt)}
                  </td>
                  <td>
                    <AuditActionBadge action={log.action} />
                  </td>
                  <td>
                    {log.userName ? (
                      <span className={styles.userName}>{log.userName}</span>
                    ) : (
                      <span className={styles.metaText}>System</span>
                    )}
                  </td>
                  <td className={styles.metaText} style={{ textTransform: "capitalize" }}>
                    {log.entityType}
                  </td>
                  <td className={styles.metaText}>
                    {log.workspaceName ?? "—"}
                  </td>
                  <td className={styles.ipText}>
                    {log.ipAddress ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
