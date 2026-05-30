import type { UserProfile as UserProfileType } from "@/types/chat";
import styles from "@/components/chat/chat-ui.module.css";

interface UserProfileProps {
  user: UserProfileType;
  className?: string;
}

const gradients = [
  ["#4f46e5", "#9333ea"],
  ["#0f766e", "#06b6d4"],
  ["#ea580c", "#f59e0b"],
  ["#db2777", "#e11d48"],
  ["#059669", "#16a34a"],
  ["#2563eb", "#0ea5e9"],
  ["#7c3aed", "#d946ef"],
  ["#65a30d", "#eab308"],
];

function hashName(name: string) {
  return [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

export function UserProfile({ user, className }: UserProfileProps) {
  const pair = gradients[hashName(user.name) % gradients.length];

  return (
    <div className={`${styles.userProfileWrap} ${className ?? ""}`} role="complementary" aria-label="Signed in user">
      <button type="button" className={styles.userProfile} aria-label={`User profile: ${user.name}`}>
        <span
          className={styles.avatar}
          style={{ background: `linear-gradient(135deg, ${pair[0]}, ${pair[1]})` }}
          aria-hidden="true"
        >
          {user.initials.slice(0, 2).toUpperCase()}
        </span>
        <span className={styles.userName}>{user.name}</span>
      </button>
    </div>
  );
}
