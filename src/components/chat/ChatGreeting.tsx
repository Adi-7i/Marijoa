import { USER_GREETING } from "@/lib/constants";
import { cn } from "@/lib/cn";

interface ChatGreetingProps {
  className?: string;
}

/**
 * Centered greeting heading displayed on the main chat canvas.
 * Uses Playfair Display (serif) for an elegant, premium feel.
 */
export function ChatGreeting({ className }: ChatGreetingProps) {
  return (
    <div className={cn("text-center select-none", className)}>
      <h1
        className={cn(
          "text-[clamp(30px,3.5vw,40px)] font-semibold leading-tight",
          "text-neutral-700 tracking-[-0.01em]"
        )}
        style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
      >
        {USER_GREETING}
      </h1>
    </div>
  );
}
