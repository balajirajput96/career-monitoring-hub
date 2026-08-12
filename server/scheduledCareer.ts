import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { getScheduleByTaskUid } from "./careerStore";
import { runScheduledCareerWorkflow } from "./careerWorkflow";

export async function careerMonitorHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const schedule = await getScheduleByTaskUid(user.taskUid);
    if (!schedule) return res.json({ ok: true, skipped: "orphan" });
    const result = await runScheduledCareerWorkflow(schedule.id);
    return res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scheduled workflow error";
    return res.status(500).json({
      error: message,
      context: { url: req.originalUrl },
      timestamp: new Date().toISOString(),
    });
  }
}
