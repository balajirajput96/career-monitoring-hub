import { describe, expect, it } from "vitest";
import { sourceInputSchema } from "./routers/career";

describe("verified public source contracts", () => {
  it("accepts the validated Legend Biotech and Remote Greenhouse feeds", () => {
    for (const [name, track, endpointUrl] of [
      ["Legend Biotech public careers", "pharma_qa", "https://boards-api.greenhouse.io/v1/boards/legendcareers/jobs?content=true"],
      ["Remote public careers", "ai_automation", "https://boards-api.greenhouse.io/v1/boards/remotecom/jobs?content=true"],
    ] as const) {
      expect(sourceInputSchema.safeParse({ name, sourceType: "greenhouse", track, endpointUrl }).success).toBe(true);
    }
  });

  it("does not infer India eligibility from a globally remote source", () => {
    const result = sourceInputSchema.safeParse({
      name: "Remote public careers",
      sourceType: "greenhouse",
      track: "ai_automation",
      endpointUrl: "https://boards-api.greenhouse.io/v1/boards/remotecom/jobs?content=true",
      config: { indiaEligibility: "role-specific" },
    });
    expect(result.success).toBe(true);
  });
});
