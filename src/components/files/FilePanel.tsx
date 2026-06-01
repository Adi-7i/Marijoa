"use client";

import type { FileItem } from "@/types/marijoa";
import { FileList } from "./FileList";

interface FilePanelProps {
  files: FileItem[];
}

export function FilePanel({ files }: FilePanelProps) {
  return <FileList files={files} />;
}
