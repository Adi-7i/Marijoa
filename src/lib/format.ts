export function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const h = 60 * 60 * 1000;
  const d = 24 * h;
  if (diff < h) return "Just now";
  if (diff < d) return `${Math.max(1, Math.round(diff / h))}h ago`;
  if (diff < d * 2) return "Yesterday";
  return `${Math.max(1, Math.round(diff / d))}d ago`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function truncate(text: string, max: number): string {
  const clean = text.replace(/```[\s\S]*?```/g, "[code]").replace(/[#*`_]/g, "").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max).trimEnd() + "…";
}
