import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getReelDashboard, recordReelBlocker, setReelContinuation } from "../reelProductionStore";

export const reelsRouter = router({
  overview: protectedProcedure.query(({ ctx }) => getReelDashboard(ctx.user.id)),
  setContinuation: protectedProcedure.input(z.object({ enabled: z.boolean() })).mutation(({ ctx, input }) => setReelContinuation(ctx.user.id, input.enabled)),
  recordBlocker: protectedProcedure.input(z.object({ blocker: z.string().trim().min(8).max(1200) })).mutation(({ ctx, input }) => recordReelBlocker(ctx.user.id, input.blocker)),
});
