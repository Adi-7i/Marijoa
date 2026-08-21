"use client";

import { useState } from "react";
import type { InvitationStatus, OrganizationInvitation } from "@/types/marijoa";
import {
  approveInvitation,
  cancelInvitation,
  rejectInvitation,
} from "@/lib/api/invitations";
import { ApiError } from "@/lib/api/errors";
import { showToast } from "@/lib/toast";
import { InviteMemberModal } from "@/components/organization/InviteMemberModal";
import { UserPlusIcon } from "@/components/chat/icons";
import { formatRelative } from "@/lib/format";
import styles from "./admin.module.css";

const STATUS_LABELS: Record<InvitationStatus, string> = {
  PENDING_SIGNUP: "Pending signup",
  PENDING_APPROVAL: "Awaiting approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

const STATUS_TONES: Record<InvitationStatus, { bg: string; fg: string }> = {
  PENDING_SIGNUP:   { bg: "#fef3c7", fg: "#92400e" },
  PENDING_APPROVAL: { bg: "#dbeafe", fg: "#1d4ed8" },
  APPROVED:         { bg: "#d1fae5", fg: "#065f46" },
  REJECTED:         { bg: "#fee2e2", fg: "#b91c1c" },
  EXPIRED:          { bg: "#f4f4f5", fg: "#525252" },
  CANCELLED:        { bg: "#f4f4f5", fg: "#525252" },
};

interface InvitationsTableProps {
  organizationId: string;
  invitations: OrganizationInvitation[];
  onChanged: () => void;
}

export function InvitationsTable({
  organizationId,
  invitations,
  onChanged,
}: InvitationsTableProps) {
  const [statusFilter, setStatusFilter] = useState<"" | InvitationStatus>("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const filtered = invitations.filter(
    (inv) => !statusFilter || inv.status === statusFilter
  );

  async function handleApprove(id: string) {
    setBusyId(id);
    try {
      await approveInvitation(organizationId, id);
      showToast("Invitation approved.", { variant: "success" });
      onChanged();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Approve failed.";
      showToast(msg, { variant: "error" });
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string) {
    setBusyId(id);
    try {
      await rejectInvitation(organizationId, id);
      showToast("Invitation rejected.", { variant: "info" });
      onChanged();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Reject failed.";
      showToast(msg, { variant: "error" });
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(id: string) {
    setBusyId(id);
    try {
      await cancelInvitation(organizationId, id);
      showToast("Invitation cancelled.", { variant: "info" });
      onChanged();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Cancel failed.";
      showToast(msg, { variant: "error" });
    } finally {
      setBusyId(null);
    }
  }

  // For PENDING_SIGNUP, the backend does not return the raw token after creation.
  // The admin must use the link surfaced in the InviteMemberModal at create time.
  // We expose a "Copy link" only on the just-created modal flow — here we only
  // show statuses and actions.

  const pendingApprovalCount = invitations.filter(
    (i) => i.status === "PENDING_APPROVAL"
  ).length;

  return (
    <div>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.sectionTitle}>Invitations</p>
          <p className={styles.sectionSubtitle}>
            {pendingApprovalCount > 0
              ? `${pendingApprovalCount} awaiting approval`
              : `${invitations.length} total`}
          </p>
        </div>
        <div className={styles.sectionActions}>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => setShowInviteModal(true)}
          >
            <UserPlusIcon size={14} />
            New Invitation
          </button>
        </div>
      </div>

      <div className={styles.tableControls}>
        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as InvitationStatus | "")}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="PENDING_APPROVAL">Awaiting approval</option>
          <option value="PENDING_SIGNUP">Pending signup</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="EXPIRED">Expired</option>
        </select>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th>Expires</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.emptyState}>
                  {invitations.length === 0
                    ? "No invitations yet. Create one to invite a team member."
                    : "No invitations match this filter."}
                </td>
              </tr>
            ) : (
              filtered.map((inv) => {
                const tone = STATUS_TONES[inv.status];
                const isBusy = busyId === inv.id;
                return (
                  <tr key={inv.id}>
                    <td>
                      <div className={styles.userInfo}>
                        <p className={styles.userName}>{inv.email}</p>
                      </div>
                    </td>
                    <td className={styles.metaText}>{inv.role}</td>
                    <td>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          height: 22,
                          padding: "0 8px",
                          borderRadius: 6,
                          background: tone.bg,
                          color: tone.fg,
                          fontSize: 11.5,
                          fontWeight: 600,
                        }}
                      >
                        {STATUS_LABELS[inv.status]}
                      </span>
                    </td>
                    <td className={styles.metaText}>
                      {formatRelative(inv.createdAt)}
                    </td>
                    <td className={styles.metaText}>
                      {new Date(inv.expiresAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        {inv.status === "PENDING_APPROVAL" && (
                          <>
                            <button
                              type="button"
                              className={styles.rowAction}
                              onClick={() => handleApprove(inv.id)}
                              disabled={isBusy}
                            >
                              {isBusy ? "Working…" : "Approve"}
                            </button>
                            <button
                              type="button"
                              className={`${styles.rowAction} ${styles.rowActionDanger}`}
                              onClick={() => handleReject(inv.id)}
                              disabled={isBusy}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {inv.status === "PENDING_SIGNUP" && (
                          <button
                            type="button"
                            className={`${styles.rowAction} ${styles.rowActionDanger}`}
                            onClick={() => handleCancel(inv.id)}
                            disabled={isBusy}
                          >
                            {isBusy ? "Working…" : "Cancel"}
                          </button>
                        )}
                        {(inv.status === "APPROVED" ||
                          inv.status === "REJECTED" ||
                          inv.status === "EXPIRED" ||
                          inv.status === "CANCELLED") && (
                          <span className={styles.metaText}>—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showInviteModal && (
        <InviteMemberModal
          organizationId={organizationId}
          onInvited={() => {
            onChanged();
          }}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  );
}
