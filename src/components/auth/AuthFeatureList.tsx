import { CheckIcon } from "@/components/chat/icons";
import styles from "./auth.module.css";

const FEATURES: Array<{ title: string; desc: string }> = [
  {
    title: "Personal AI chat",
    desc: "A private space to think, draft, and explore ideas.",
  },
  {
    title: "Organization workspaces",
    desc: "Separate teams, clients, and projects with clean boundaries.",
  },
  {
    title: "Files and artifacts",
    desc: "Save outputs, attach documents, and reuse context.",
  },
  {
    title: "Secure admin controls",
    desc: "Role-based access, usage visibility, and audit logs.",
  },
];

export function AuthFeatureList() {
  return (
    <ul className={styles.featureList}>
      {FEATURES.map((f) => (
        <li key={f.title} className={styles.featureItem}>
          <span className={styles.featureCheck} aria-hidden="true">
            <CheckIcon size={12} />
          </span>
          <span>
            <strong>{f.title}</strong> — {f.desc}
          </span>
        </li>
      ))}
    </ul>
  );
}
