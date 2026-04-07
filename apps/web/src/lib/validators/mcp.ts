import { z } from "zod";

export const addConnectionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),
  serverUrl: z
    .string()
    .trim()
    .min(1, "Server URL is required")
    .max(2048, "URL must be at most 2048 characters")
    .refine(
      (url) =>
        url.startsWith("http://") ||
        url.startsWith("https://") ||
        url.startsWith("stdio://"),
      "URL must start with http://, https://, or stdio://",
    ),
  transport: z.enum(["SSE", "STDIO", "STREAMABLE_HTTP"]),
  authToken: z.string().max(10000).optional(),
});

export const connectionIdSchema = z.object({
  connectionId: z.string(),
});

export const toggleConnectionSchema = z.object({
  connectionId: z.string(),
  isActive: z.boolean(),
});

export type AddConnectionInput = z.infer<typeof addConnectionSchema>;
export type ConnectionIdInput = z.infer<typeof connectionIdSchema>;
export type ToggleConnectionInput = z.infer<typeof toggleConnectionSchema>;
