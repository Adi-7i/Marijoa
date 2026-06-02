"use client";

import { BuildingIcon, PlusCircleIcon } from "@/components/chat/icons";
import styles from "./organization.module.css";

interface OrganizationEmptyStateProps {
  onCreate: () => void;
  loading?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
}

export function OrganizationEmptyState({
  onCreate,
  loading = false,
  errorMessage,
  onRetry,
}: OrganizationEmptyStateProps) {
  return (
    <main className={styles.pageArea} aria-label="No organizations yet">
      <div className={styles.pageInner}>
        <div
          role="status"
          aria-live="polite"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: "64px 16px",
            textAlign: "center",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "var(--color-surface-2, #f3f4f6)",
              color: "var(--color-text)",
            }}
          >
            <BuildingIcon size={28} />
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>
            Create your first organization
          </h1>
          <p
            style={{
              margin: 0,
              maxWidth: 460,
              fontSize: 14,
              lineHeight: 1.55,
              color: "var(--color-text-muted)",
            }}
          >
            Organizations let you collaborate on workspaces with teammates,
            share artifacts, and manage member access. Your personal workspace
            stays private.
          </p>

          {errorMessage && (
            <p role="alert" style={{ color: "#b91c1c", fontSize: 13, margin: 0 }}>
              {errorMessage}
              {onRetry && (
                <>
                  {" "}
                  <button
                    type="button"
                    onClick={onRetry}
                    style={{
                      background: "transparent",
                      border: 0,
                      padding: 0,
                      color: "inherit",
                      textDecoration: "underline",
                      cursor: "pointer",
                    }}
                  >
                    Try again
                  </button>
                </>
              )}
            </p>
          )}

          <button
            type="button"
            onClick={onCreate}
            disabled={loading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              marginTop: 4,
              padding: "10px 18px",
              border: 0,
              borderRadius: 10,
              background: "#1a1a1a",
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            <PlusCircleIcon size={16} aria-hidden="true" />
            Create organization
          </button>
        </div>
      </div>
    </main>
  );
}
