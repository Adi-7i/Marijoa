"use client";

import type { AdminUsageSummary } from "@/types/marijoa";
import { formatBytes } from "@/lib/format";
import {
  PersonIcon,
  CheckCircleIcon,
  BoxIcon,
  MessageSquareIcon,
  FileTextIcon,
  BookmarkIcon,
  FileIcon,
  BarChartIcon,
} from "@/components/chat/icons";
import styles from "./admin.module.css";

interface UsageSummaryCardsProps {
  usage: AdminUsageSummary;
}

interface MetricCard {
  label: string;
  value: string;
  desc: string;
  icon: React.ReactNode;
}

export function UsageSummaryCards({ usage }: UsageSummaryCardsProps) {
  const cards: MetricCard[] = [
    {
      label: "Users",
      value: String(usage.usersCount),
      desc: "total members",
      icon: <PersonIcon size={16} />,
    },
    {
      label: "Active Users",
      value: String(usage.activeUsersCount),
      desc: "currently active",
      icon: <CheckCircleIcon size={16} />,
    },
    {
      label: "Workspaces",
      value: String(usage.workspacesCount),
      desc: "team workspaces",
      icon: <BoxIcon size={16} />,
    },
    {
      label: "Chats",
      value: String(usage.chatsCount),
      desc: "across all workspaces",
      icon: <MessageSquareIcon size={16} />,
    },
    {
      label: "Messages",
      value: String(usage.messagesCount),
      desc: "total messages",
      icon: <FileTextIcon size={16} />,
    },
    {
      label: "Artifacts",
      value: String(usage.artifactsCount),
      desc: "saved artifacts",
      icon: <BookmarkIcon size={16} />,
    },
    {
      label: "Files",
      value: String(usage.filesCount),
      desc: "uploaded files",
      icon: <FileIcon size={16} />,
    },
    {
      label: "Storage Used",
      value: formatBytes(usage.storageBytes),
      desc: "total storage",
      icon: <BarChartIcon size={16} />,
    },
  ];

  return (
    <div className={styles.cardsGrid}>
      {cards.map((card) => (
        <div key={card.label} className={styles.card}>
          <div className={styles.cardTop}>
            <p className={styles.cardValue}>{card.value}</p>
            <div className={styles.cardIconWrap}>{card.icon}</div>
          </div>
          <p className={styles.cardLabel}>{card.label}</p>
          <p className={styles.cardDesc}>{card.desc}</p>
        </div>
      ))}
    </div>
  );
}
