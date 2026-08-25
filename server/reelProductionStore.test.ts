import { describe, expect, it } from "vitest";
import { reelProductionRuns } from "../drizzle/schema";
import { batchForReel } from "./reelProductionStore";

describe("reel production queue boundaries", () => {
  it("maps exactly thirty reels to each batch without guessing delivery", () => {
    expect(batchForReel(1)).toBe(1); expect(batchForReel(30)).toBe(1); expect(batchForReel(31)).toBe(2); expect(batchForReel(3000)).toBe(100);
  });

  it("maps reel production run status to the deployed physical column", () => {
    expect(reelProductionRuns.status.name).toBe("workflowRunStatus");
  });
});
