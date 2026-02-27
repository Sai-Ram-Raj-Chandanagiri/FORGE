import { createMockPrismaClient, Prisma } from "@forge/db";
import { PaymentService } from "@/server/services/payment.service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeModule(overrides: Record<string, unknown> = {}) {
  return {
    id: "mod-1",
    name: "Paid Module",
    slug: "paid-module",
    shortDescription: "A paid module for testing",
    pricingModel: "ONE_TIME",
    price: new Prisma.Decimal(25),
    currency: "USD",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("PaymentService", () => {
  let prisma: ReturnType<typeof createMockPrismaClient>;
  let service: PaymentService;

  beforeEach(() => {
    prisma = createMockPrismaClient();
    service = new PaymentService(prisma);
    // Clear Stripe env to ensure clean state
    delete process.env.STRIPE_SECRET_KEY;
  });

  // -----------------------------------------------------------------------
  // isConfigured
  // -----------------------------------------------------------------------
  describe("isConfigured", () => {
    it("should return false when STRIPE_SECRET_KEY is not set", () => {
      delete process.env.STRIPE_SECRET_KEY;
      expect(service.isConfigured()).toBe(false);
    });

    it("should return true when STRIPE_SECRET_KEY is set", () => {
      process.env.STRIPE_SECRET_KEY = "sk_test_fake";
      expect(service.isConfigured()).toBe(true);
      delete process.env.STRIPE_SECRET_KEY;
    });
  });

  // -----------------------------------------------------------------------
  // createCheckoutSession
  // -----------------------------------------------------------------------
  describe("createCheckoutSession", () => {
    it("should throw when Stripe is not configured", async () => {
      delete process.env.STRIPE_SECRET_KEY;

      prisma.module.findUnique.mockResolvedValue(makeModule());

      await expect(
        service.createCheckoutSession("user-1", "mod-1", "http://localhost:3000"),
      ).rejects.toThrow("Payment processing is not configured");
    });

    it("should throw when module not found", async () => {
      process.env.STRIPE_SECRET_KEY = "sk_test_fake";

      prisma.module.findUnique.mockResolvedValue(null);

      await expect(
        service.createCheckoutSession("user-1", "mod-1", "http://localhost:3000"),
      ).rejects.toThrow("Module not found");

      delete process.env.STRIPE_SECRET_KEY;
    });

    it("should throw when module price is zero or free", async () => {
      process.env.STRIPE_SECRET_KEY = "sk_test_fake";

      prisma.module.findUnique.mockResolvedValue(makeModule({ price: null }));

      await expect(
        service.createCheckoutSession("user-1", "mod-1", "http://localhost:3000"),
      ).rejects.toThrow("does not require payment");

      delete process.env.STRIPE_SECRET_KEY;
    });
  });

  // -----------------------------------------------------------------------
  // handleWebhookEvent — checkout.session.completed
  // -----------------------------------------------------------------------
  describe("handleWebhookEvent", () => {
    it("should create a purchase on checkout.session.completed", async () => {
      prisma.purchase.findFirst.mockResolvedValue(null);
      prisma.purchase.create.mockResolvedValue({});
      prisma.module.update.mockResolvedValue({});

      const event = {
        type: "checkout.session.completed" as const,
        data: {
          object: {
            id: "cs_test_123",
            metadata: {
              userId: "user-1",
              moduleId: "mod-1",
              pricingModel: "ONE_TIME",
            },
            amount_total: 2500,
            currency: "usd",
            payment_intent: "pi_test_123",
            subscription: null,
          },
        },
      };

      await service.handleWebhookEvent(event as never);

      expect(prisma.purchase.create).toHaveBeenCalledWith({
        data: {
          userId: "user-1",
          moduleId: "mod-1",
          pricePaid: expect.any(Prisma.Decimal),
          currency: "USD",
          status: "ACTIVE",
          stripePaymentId: "pi_test_123",
          subscriptionId: null,
        },
      });

      expect(prisma.module.update).toHaveBeenCalledWith({
        where: { id: "mod-1" },
        data: { downloadCount: { increment: 1 } },
      });
    });

    it("should skip duplicate purchases on checkout.session.completed", async () => {
      prisma.purchase.findFirst.mockResolvedValue({ id: "existing" });

      const event = {
        type: "checkout.session.completed" as const,
        data: {
          object: {
            id: "cs_test_123",
            metadata: { userId: "user-1", moduleId: "mod-1", pricingModel: "ONE_TIME" },
            amount_total: 2500,
            currency: "usd",
            payment_intent: "pi_test_123",
            subscription: null,
          },
        },
      };

      await service.handleWebhookEvent(event as never);

      expect(prisma.purchase.create).not.toHaveBeenCalled();
    });

    it("should store subscriptionId for subscription purchases", async () => {
      prisma.purchase.findFirst.mockResolvedValue(null);
      prisma.purchase.create.mockResolvedValue({});
      prisma.module.update.mockResolvedValue({});

      const event = {
        type: "checkout.session.completed" as const,
        data: {
          object: {
            id: "cs_test_456",
            metadata: {
              userId: "user-2",
              moduleId: "mod-2",
              pricingModel: "SUBSCRIPTION_MONTHLY",
            },
            amount_total: 999,
            currency: "usd",
            payment_intent: null,
            subscription: "sub_test_789",
          },
        },
      };

      await service.handleWebhookEvent(event as never);

      const createCall = prisma.purchase.create.mock.calls[0][0];
      expect(createCall.data.subscriptionId).toBe("sub_test_789");
    });
  });

  // -----------------------------------------------------------------------
  // handleWebhookEvent — customer.subscription.deleted
  // -----------------------------------------------------------------------
  describe("handleWebhookEvent — subscription deleted", () => {
    it("should cancel purchases when subscription is deleted", async () => {
      prisma.purchase.updateMany.mockResolvedValue({ count: 1 });

      const event = {
        type: "customer.subscription.deleted" as const,
        data: {
          object: {
            id: "sub_test_789",
          },
        },
      };

      await service.handleWebhookEvent(event as never);

      expect(prisma.purchase.updateMany).toHaveBeenCalledWith({
        where: { subscriptionId: "sub_test_789", status: "ACTIVE" },
        data: { status: "CANCELLED" },
      });
    });
  });
});
