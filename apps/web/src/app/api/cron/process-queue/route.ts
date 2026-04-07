import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ActionQueueService } from "@/server/services/action-queue.service";
import { logger } from "@/lib/logger";

const log = logger.forService("CronProcessQueue");

/**
 * POST /api/cron/process-queue
 * Processes pending action queue items and scheduled tasks.
 * Protected by CRON_SECRET header validation.
 */
export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const startTime = Date.now();

  try {
    const service = new ActionQueueService(prisma);

    const [queueResult, taskResult] = await Promise.all([
      service.processQueue(),
      service.processScheduledTasks(),
    ]);

    const durationMs = Date.now() - startTime;

    log.info("Cron process-queue completed", {
      processed: queueResult.processed,
      failed: queueResult.failed,
      tasksTriggered: taskResult.triggered,
      durationMs,
    });

    return NextResponse.json({
      processed: queueResult.processed,
      failed: queueResult.failed,
      tasksTriggered: taskResult.triggered,
      durationMs,
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    log.error("Cron process-queue failed", { error, durationMs });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
