import { and, desc, eq } from "drizzle-orm";
import { reelProductionItems, reelProductionRuns, reelProductionSettings } from "../drizzle/schema";
import { getDb } from "./db";

const DRIVE_ROOT_ID = "1fKigp_hlEqqWB0F0DkMeKXTpMQXzPnrv";

async function dbOrThrow() {
  const db = await getDb();
  if (!db) throw new Error("Database connection is unavailable");
  return db;
}

const completed = [1, 2, 3, 4].map(reelNumber => ({
  reelNumber, batchNumber: 1, title: `Verified Drive package — Reel ${String(reelNumber).padStart(4, "0")}`,
  category: "Existing verified package", topicKey: `drive-reel-${String(reelNumber).padStart(4, "0")}`,
  productionStatus: "delivered" as const, evidenceStatus: "verified" as const, deliveryVerified: true,
}));

export async function getOrCreateReelSettings(userId: number) {
  const db = await dbOrThrow();
  const existing = (await db.select().from(reelProductionSettings).where(eq(reelProductionSettings.userId, userId)).limit(1))[0];
  if (existing) return existing;
  await db.insert(reelProductionSettings).values({ userId, driveRootFolderId: DRIVE_ROOT_ID, activeBatchNumber: 1, nextReelNumber: 6 });
  await db.insert(reelProductionItems).values([
    ...completed.map(item => ({ userId, ...item })),
    { userId, reelNumber: 5, batchNumber: 1, title: "इरादा नहीं, अगर-तो प्लान", category: "Habits and decision making", topicKey: "implementation-intentions-if-then-planning", claimSlug: "cue_response_plan", productionStatus: "delivered", evidenceStatus: "verified", driveFolderId: "1gNTWkIm2hBdmw3zdE8VRFXcvRQEfuj7G", driveVideoFileId: "1uqa5fqprTDVUdI7a4yVTE5iIKNabyD0x", deliveryVerified: true, sourceMetadata: { reelId: "0005", sources: 3 }, qcMetadata: { durationSeconds: 60, resolution: "720x1280" }, completedAt: new Date() },
  ]);
  return (await db.select().from(reelProductionSettings).where(eq(reelProductionSettings.userId, userId)).limit(1))[0]!;
}

export function batchForReel(reelNumber: number) { return Math.floor((reelNumber - 1) / 30) + 1; }

export async function getReelDashboard(userId: number) {
  const db = await dbOrThrow();
  const settings = await getOrCreateReelSettings(userId);
  const [items, runs] = await Promise.all([
    db.select().from(reelProductionItems).where(eq(reelProductionItems.userId, userId)).orderBy(desc(reelProductionItems.reelNumber)).limit(18),
    db.select().from(reelProductionRuns).where(eq(reelProductionRuns.userId, userId)).orderBy(desc(reelProductionRuns.startedAt)).limit(8),
  ]);
  return { settings, items, runs, metrics: { delivered: items.filter(i => i.deliveryVerified).length, blocked: items.filter(i => i.productionStatus === "blocked").length, nextReelNumber: settings.nextReelNumber, activeBatchNumber: settings.activeBatchNumber } };
}

export async function setReelContinuation(userId: number, isEnabled: boolean) {
  const db = await dbOrThrow(); const settings = await getOrCreateReelSettings(userId);
  await db.update(reelProductionSettings).set({ isEnabled, lastError: isEnabled ? null : settings.lastError }).where(eq(reelProductionSettings.id, settings.id));
  return getReelDashboard(userId);
}

export async function recordReelBlocker(userId: number, blocker: string) {
  const db = await dbOrThrow(); const settings = await getOrCreateReelSettings(userId);
  await db.insert(reelProductionRuns).values({ userId, targetReelNumber: settings.nextReelNumber, triggerType: "manual", status: "failed", error: blocker, summary: "No delivery was claimed; a blocker was recorded.", completedAt: new Date() });
  await db.update(reelProductionSettings).set({ lastError: blocker }).where(eq(reelProductionSettings.id, settings.id));
  return getReelDashboard(userId);
}
