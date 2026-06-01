import type { AuditAction } from "@/types/marijoa";
import styles from "./admin.module.css";

const ACTION_LABELS: Record<AuditAction, string> = {
  USER_LOGIN:               "User Login",
  USER_LOGOUT:              "User Logout",
  ORGANIZATION_CREATED:     "Org Created",
  ORGANIZATION_MEMBER_ADDED:"Member Added",
  WORKSPACE_CREATED:        "Workspace Created",
  WORKSPACE_UPDATED:        "Workspace Updated",
  WORKSPACE_DELETED:        "Workspace Deleted",
  CHAT_CREATED:             "Chat Created",
  CHAT_UPDATED:             "Chat Updated",
  CHAT_DELETED:             "Chat Deleted",
  MESSAGE_CREATED:          "Message Sent",
  AI_RESPONSE_CREATED:      "AI Response",
  AI_STREAM_COMPLETED:      "AI Stream Done",
  ARTIFACT_CREATED:         "Artifact Created",
  ARTIFACT_UPDATED:         "Artifact Updated",
  ARTIFACT_DELETED:         "Artifact Deleted",
  FILE_UPLOADED:            "File Uploaded",
  FILE_DELETED:             "File Deleted",
  ADMIN_USERS_VIEWED:       "Users Viewed",
  ADMIN_AUDIT_LOGS_VIEWED:  "Audit Viewed",
  ADMIN_USAGE_VIEWED:       "Usage Viewed",
};

function actionClass(action: AuditAction): string {
  if (action === "USER_LOGIN" || action === "USER_LOGOUT") return styles.actionAuth;
  if (action.startsWith("ORGANIZATION_")) return styles.actionOrg;
  if (action.startsWith("WORKSPACE_")) return styles.actionWorkspace;
  if (action === "CHAT_CREATED" || action === "CHAT_UPDATED" || action === "CHAT_DELETED" ||
      action === "MESSAGE_CREATED") return styles.actionContent;
  if (action.startsWith("AI_")) return styles.actionAI;
  if (action.startsWith("ARTIFACT_")) return styles.actionArtifact;
  if (action.startsWith("FILE_")) return styles.actionFile;
  if (action.startsWith("ADMIN_")) return styles.actionAdmin;
  return styles.actionAuth;
}

interface AuditActionBadgeProps {
  action: AuditAction;
}

export function AuditActionBadge({ action }: AuditActionBadgeProps) {
  return (
    <span className={`${styles.actionBadge} ${actionClass(action)}`}>
      {ACTION_LABELS[action]}
    </span>
  );
}

export { ACTION_LABELS };
