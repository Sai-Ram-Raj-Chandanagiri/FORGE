import { z } from "zod";
import { hash } from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";

export const authRouter = router({
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email("Invalid email address"),
        username: z
          .string()
          .min(3, "Username must be at least 3 characters")
          .max(20, "Username must be at most 20 characters")
          .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, hyphens, and underscores"),
        password: z.string().min(8, "Password must be at least 8 characters"),
        name: z.string().min(1, "Name is required").max(50),
        role: z.enum(["USER", "DEVELOPER"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existingEmail = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });
      if (existingEmail) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists",
        });
      }

      const existingUsername = await ctx.prisma.user.findUnique({
        where: { username: input.username },
      });
      if (existingUsername) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This username is already taken",
        });
      }

      const passwordHash = await hash(input.password, 12);

      const user = await ctx.prisma.user.create({
        data: {
          email: input.email,
          username: input.username,
          name: input.name,
          passwordHash,
          role: input.role,
          status: "ACTIVE",
          emailVerified: new Date(),
        },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          role: true,
        },
      });

      return user;
    }),
});
