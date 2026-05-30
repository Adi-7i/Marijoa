import type { UserProfile as UserProfileType } from "@/types/chat";
import { cn } from "@/lib/cn";

interface UserProfileProps {
  user: UserProfileType;
  className?: string;
}

/**
 * Bottom sidebar profile area — shows avatar initials and full name.
 */
export function UserProfile({ user, className }: UserProfileProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-4",
        "border-t border-neutral-200/70",
        className
      )}
      role="complementary"
      aria-label="Signed in user"
    >
      {/* Avatar */}
      <div
        className={cn(
          "w-8 h-8 rounded-full flex-shrink-0",
          "flex items-center justify-center",
          "text-[12px] font-semibold tracking-wide select-none"
        )}
        style={{
          backgroundColor: "var(--color-avatar-bg)",
          color: "var(--color-avatar-text)",
        }}
        aria-hidden="true"
      >
        {user.initials}
      </div>

      {/* Name */}
      <span className="text-[13.5px] font-medium text-neutral-700 truncate leading-none">
        {user.name}
      </span>
    </div>
  );
}
