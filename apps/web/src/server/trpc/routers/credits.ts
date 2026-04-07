import { router, publicProcedure, protectedProcedure } from "../trpc";
import {
  purchasePackSchema,
  transactionHistorySchema,
  autoTopUpSchema,
} from "@/lib/validators/credits";
import { CreditService } from "@/server/services/credit.service";

export const creditsRouter = router({
  getBalance: protectedProcedure.query(async ({ ctx }) => {
    const service = new CreditService(ctx.prisma);
    return service.getBalance(ctx.user.id);
  }),

  getTransactions: protectedProcedure
    .input(transactionHistorySchema)
    .query(async ({ ctx, input }) => {
      const service = new CreditService(ctx.prisma);
      return service.getTransactions(ctx.user.id, input);
    }),

  purchasePack: protectedProcedure
    .input(purchasePackSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new CreditService(ctx.prisma);
      return service.purchasePack(ctx.user.id, input.packId);
    }),

  getAvailablePacks: publicProcedure.query(async ({ ctx }) => {
    const service = new CreditService(ctx.prisma);
    return service.getAvailablePacks();
  }),

  setupAutoTopUp: protectedProcedure
    .input(autoTopUpSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new CreditService(ctx.prisma);
      return service.setupAutoTopUp(ctx.user.id, input.packId);
    }),

  removeAutoTopUp: protectedProcedure.mutation(async ({ ctx }) => {
    const service = new CreditService(ctx.prisma);
    return service.removeAutoTopUp(ctx.user.id);
  }),
});
