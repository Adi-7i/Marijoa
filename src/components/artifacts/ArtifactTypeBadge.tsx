"use client";

import type { ArtifactType } from "@/types/marijoa";
import {
  BarChartIcon,
  BoxIcon,
  FileTextIcon,
  MailIcon,
  PencilIcon,
  TableIcon,
  ZapIcon,
} from "@/components/chat/icons";
import styles from "./artifacts.module.css";

const TYPE_CONFIG: Record<
  ArtifactType,
  { label: string; cssClass: string; Icon: (props: { size?: number }) => React.ReactElement | null }
> = {
  code:     { label: "Code",     cssClass: styles.typeCode,     Icon: BoxIcon },
  document: { label: "Doc",      cssClass: styles.typeDocument, Icon: FileTextIcon },
  prompt:   { label: "Prompt",   cssClass: styles.typePrompt,   Icon: ZapIcon },
  email:    { label: "Email",    cssClass: styles.typeEmail,    Icon: MailIcon },
  proposal: { label: "Proposal", cssClass: styles.typeProposal, Icon: FileTextIcon },
  note:     { label: "Note",     cssClass: styles.typeNote,     Icon: PencilIcon },
  chart:    { label: "Chart",    cssClass: styles.typeChart,    Icon: BarChartIcon },
  table:    { label: "Table",    cssClass: styles.typeTable,    Icon: TableIcon },
};

import type React from "react";

interface ArtifactTypeBadgeProps {
  type: ArtifactType;
  showIcon?: boolean;
}

export function ArtifactTypeBadge({ type, showIcon = true }: ArtifactTypeBadgeProps) {
  const config = TYPE_CONFIG[type] ?? TYPE_CONFIG.note;
  const { label, cssClass, Icon } = config;
  return (
    <span className={`${styles.typeBadge} ${cssClass}`}>
      {showIcon && <Icon size={10} aria-hidden="true" />}
      {label}
    </span>
  );
}

export { TYPE_CONFIG };
