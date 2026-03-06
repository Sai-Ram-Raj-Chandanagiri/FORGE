import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@forge/db";
import { PaymentService } from "@/server/services/payment.service";
import { logger } from "@/lib/logger";

const log = logger.forService("StripeWebhook");
const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const body = await request.text();
  const paymentService = new PaymentService(prisma);

  try {
    const event = paymentService.verifyWebhookSignature(body, signature);
    await paymentService.handleWebhookEvent(event);
    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook processing failed";
    log.error("Error:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
