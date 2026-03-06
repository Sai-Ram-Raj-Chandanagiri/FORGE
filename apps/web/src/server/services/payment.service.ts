import Stripe from "stripe";
import { TRPCError } from "@trpc/server";
import { Prisma, type PrismaClient } from "@forge/db";
import { logger } from "@/lib/logger";

const log = logger.forService("PaymentService");

// Lazy-initialized Stripe client
let stripeClient: Stripe | null = null;

function getStripe(): Stripe | null {
  if (stripeClient) return stripeClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  stripeClient = new Stripe(key, { apiVersion: "2026-02-25.clover" });
  return stripeClient;
}

export class PaymentService {
  constructor(private prisma: PrismaClient) {}

  /** Check if Stripe is configured */
  isConfigured(): boolean {
    return !!process.env.STRIPE_SECRET_KEY;
  }

  /**
   * Create a Stripe Checkout Session for a paid module purchase.
   * Returns the checkout URL to redirect the user to.
   */
  async createCheckoutSession(
    userId: string,
    moduleId: string,
    origin: string,
  ): Promise<{ checkoutUrl: string }> {
    const stripe = getStripe();
    if (!stripe) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Payment processing is not configured",
      });
    }

    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      select: {
        id: true,
        name: true,
        slug: true,
        shortDescription: true,
        pricingModel: true,
        price: true,
        currency: true,
      },
    });

    if (!module) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Module not found" });
    }

    const priceInCents = Math.round(Number(module.price ?? 0) * 100);
    if (priceInCents <= 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This module is free and does not require payment",
      });
    }

    const isSubscription =
      module.pricingModel === "SUBSCRIPTION_MONTHLY" ||
      module.pricingModel === "SUBSCRIPTION_YEARLY";

    const recurringInterval =
      module.pricingModel === "SUBSCRIPTION_MONTHLY" ? "month" : "year";

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: isSubscription ? "subscription" : "payment",
      line_items: [
        {
          price_data: {
            currency: (module.currency || "USD").toLowerCase(),
            product_data: {
              name: module.name,
              description: module.shortDescription || undefined,
            },
            unit_amount: priceInCents,
            ...(isSubscription && {
              recurring: { interval: recurringInterval },
            }),
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        moduleId: module.id,
        pricingModel: module.pricingModel,
      },
      success_url: `${origin}/store/checkout/success?session_id={CHECKOUT_SESSION_ID}&module=${module.slug}`,
      cancel_url: `${origin}/store/${module.slug}`,
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    if (!session.url) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create checkout session",
      });
    }

    return { checkoutUrl: session.url };
  }

  /**
   * Handle Stripe webhook events.
   * Called from the webhook route after signature verification.
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.handleCheckoutCompleted(session);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionDeleted(subscription);
        break;
      }
    }
  }

  /**
   * Verify and construct a Stripe event from a raw webhook payload.
   */
  verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
  ): Stripe.Event {
    const stripe = getStripe();
    if (!stripe) {
      throw new Error("Stripe is not configured");
    }
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
    }
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }

  /**
   * Cancel a Stripe subscription and mark the purchase as CANCELLED.
   */
  async cancelSubscription(userId: string, purchaseId: string): Promise<void> {
    const stripe = getStripe();
    if (!stripe) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Payment processing is not configured" });
    }

    const purchase = await this.prisma.purchase.findFirst({
      where: { id: purchaseId, userId, status: "ACTIVE" },
      select: { id: true, subscriptionId: true },
    });

    if (!purchase) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Active purchase not found" });
    }

    if (!purchase.subscriptionId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "This purchase is not a subscription" });
    }

    // Cancel in Stripe
    await stripe.subscriptions.cancel(purchase.subscriptionId);

    // Mark as cancelled in our DB immediately (webhook will also fire but this is faster for UX)
    await this.prisma.purchase.update({
      where: { id: purchase.id },
      data: { status: "CANCELLED" },
    });
  }

  // ---------------------------------------------------------------------------
  // Private handlers
  // ---------------------------------------------------------------------------

  private async handleCheckoutCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const userId = session.metadata?.userId;
    const moduleId = session.metadata?.moduleId;
    const pricingModel = session.metadata?.pricingModel;

    if (!userId || !moduleId) {
      log.error("Missing metadata in checkout session:", session.id);
      return;
    }

    // Prevent duplicate purchases
    const existingPurchase = await this.prisma.purchase.findFirst({
      where: { userId, moduleId, status: "ACTIVE" },
    });
    if (existingPurchase) return;

    const amountTotal = session.amount_total ?? 0;

    await this.prisma.purchase.create({
      data: {
        userId,
        moduleId,
        pricePaid: new Prisma.Decimal(amountTotal / 100),
        currency: (session.currency || "usd").toUpperCase(),
        status: "ACTIVE",
        stripePaymentId: session.payment_intent as string | null,
        subscriptionId:
          pricingModel === "SUBSCRIPTION_MONTHLY" ||
          pricingModel === "SUBSCRIPTION_YEARLY"
            ? (session.subscription as string | null)
            : null,
      },
    });

    // Increment download count
    await this.prisma.module.update({
      where: { id: moduleId },
      data: { downloadCount: { increment: 1 } },
    });
  }

  private async handleSubscriptionDeleted(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    const subscriptionId = subscription.id;

    await this.prisma.purchase.updateMany({
      where: { subscriptionId, status: "ACTIVE" },
      data: { status: "CANCELLED" },
    });
  }
}
