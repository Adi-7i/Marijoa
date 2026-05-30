import { z } from "zod";
import { COMPOSER_MAX_LENGTH } from "@/lib/constants";

/**
 * Zod schema for validating a chat message.
 * - Trims whitespace
 * - Rejects empty strings
 * - Enforces maximum length
 */
export const chatMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Message cannot be empty.")
    .max(
      COMPOSER_MAX_LENGTH,
      `Message must be ${COMPOSER_MAX_LENGTH} characters or fewer.`
    ),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
