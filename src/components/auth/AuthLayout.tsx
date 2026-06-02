import type { ReactNode } from "react";
import { AuthBrandPanel } from "./AuthBrandPanel";
import styles from "./auth.module.css";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className={styles.page}>
      <AuthBrandPanel />
      <section className={styles.formColumn}>
        <div className={styles.formCard}>{children}</div>
      </section>
    </main>
  );
}
