"use client";

import { FileIcon, FileTextIcon, ImageIcon } from "@/components/chat/icons";
import styles from "./files.module.css";

type IconFC = (props: { size?: number }) => React.ReactElement | null;

interface ExtConfig {
  label: string;
  cssClass: string;
  Icon: IconFC;
}

import type React from "react";

const EXT_MAP: Record<string, ExtConfig> = {
  pdf:  { label: "PDF",  cssClass: styles.typePdf,     Icon: FileTextIcon },
  docx: { label: "DOCX", cssClass: styles.typeDocx,    Icon: FileTextIcon },
  doc:  { label: "DOC",  cssClass: styles.typeDocx,    Icon: FileTextIcon },
  csv:  { label: "CSV",  cssClass: styles.typeCsv,     Icon: FileTextIcon },
  png:  { label: "PNG",  cssClass: styles.typePng,     Icon: ImageIcon },
  jpg:  { label: "JPG",  cssClass: styles.typeJpeg,    Icon: ImageIcon },
  jpeg: { label: "JPEG", cssClass: styles.typeJpeg,    Icon: ImageIcon },
  txt:  { label: "TXT",  cssClass: styles.typeTxt,     Icon: FileTextIcon },
  yaml: { label: "YAML", cssClass: styles.typeYaml,    Icon: FileTextIcon },
  yml:  { label: "YAML", cssClass: styles.typeYaml,    Icon: FileTextIcon },
  md:   { label: "MD",   cssClass: styles.typeMd,      Icon: FileTextIcon },
};

const DEFAULT_CONFIG: ExtConfig = { label: "FILE", cssClass: styles.typeDefault, Icon: FileIcon };

function getExtension(filename: string): string {
  return (filename.split(".").pop() ?? "").toLowerCase();
}

interface FileTypeBadgeProps {
  filename: string;
}

export function FileTypeBadge({ filename }: FileTypeBadgeProps) {
  const ext = getExtension(filename);
  const config = EXT_MAP[ext] ?? DEFAULT_CONFIG;
  const { label, cssClass } = config;
  return (
    <span className={`${styles.typeBadge} ${cssClass}`} aria-label={`${label} file`}>
      {label}
    </span>
  );
}

export { getExtension };
