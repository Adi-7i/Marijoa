import { USER_GREETING } from "@/lib/constants";
import styles from "@/components/chat/chat-ui.module.css";

interface ChatGreetingProps {
  className?: string;
}

export function ChatGreeting({ className }: ChatGreetingProps) {
  return (
    <h1 className={`${styles.emptyTitle} ${className ?? ""}`}>
      {USER_GREETING}
    </h1>
  );
}
