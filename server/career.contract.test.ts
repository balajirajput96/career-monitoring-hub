import { describe, expect, it } from "vitest";
import { profileInputSchema, sourceInputSchema } from "./routers/career";
import { resolveReportLanguage } from "./careerWorkflow";
import { buildResumeContext } from "./careerStore";

describe("career profile contract", () => {
  it("accepts verified education, experience, and source facts", () => {
    const parsed = profileInputSchema.parse({
      headline: "Quality Officer | Pharma QA",
      yearsExperience: 2,
      education: ["Diploma in Biotechnology"],
      verifiedExperience: [{ title: "Quality Officer / QA", years: 2, domain: "Pharmaceutical quality assurance" }],
      factsSource: "https://docs.google.com/document/d/1VjV4w9b7BnpEwTbmux1BG_-g33ODHcDHXI6h6cpnmhE/edit?usp=drivesdk",
      skills: ["Python automation"],
      certifications: [],
      preferredRoles: ["QA Officer"],
      preferredLocations: ["India", "Worldwide remote"],
      preferredTracks: ["pharma_qa", "ai_automation"],
      resumeVersions: [],
      outputLanguage: "en",
    });

    expect(parsed.education).toEqual(["Diploma in Biotechnology"]);
    expect(parsed.verifiedExperience[0]?.years).toBe(2);
  });
});

describe("resume context contract", () => {
  it("preserves only verified facts and source metadata", () => {
    const context = buildResumeContext({
      education: ["Diploma in Biotechnology"],
      verifiedExperience: [{ title: "Quality Officer / QA", years: 2, domain: "Pharmaceutical quality assurance" }],
      factsSource: "https://docs.google.com/document/d/example",
      skills: ["Python automation"],
      preferredRoles: ["QA Officer"],
    });

    expect(context.education).toEqual(["Diploma in Biotechnology"]);
    expect(context.verifiedExperience[0]?.years).toBe(2);
    expect(context.factsSource).toContain("docs.google.com");
    expect(JSON.stringify(context)).not.toContain("invented");
  });
});

describe("bilingual report language contract", () => {
  it("uses Hindi when either the verified profile or schedule requests Hindi", () => {
    expect(resolveReportLanguage("hi", "en")).toBe("hi");
    expect(resolveReportLanguage("en", "hi")).toBe("hi");
    expect(resolveReportLanguage("en", "en")).toBe("en");
  });
});

describe("public job source contract", () => {
  const base = { name: "Example feed", track: "pharma_qa" as const };

  it("accepts public Greenhouse JSON endpoints", () => {
    expect(sourceInputSchema.safeParse({ ...base, sourceType: "greenhouse", endpointUrl: "https://boards-api.greenhouse.io/v1/boards/example/jobs" }).success).toBe(true);
  });

  it("accepts public Lever JSON endpoints", () => {
    expect(sourceInputSchema.safeParse({ ...base, sourceType: "lever", endpointUrl: "https://api.lever.co/v0/postings/example?mode=json" }).success).toBe(true);
  });

  it("rejects unsupported or non-public source URLs", () => {
    expect(sourceInputSchema.safeParse({ ...base, sourceType: "greenhouse", endpointUrl: "https://example.com/jobs" }).success).toBe(false);
    expect(sourceInputSchema.safeParse({ ...base, sourceType: "company_careers", endpointUrl: "https://example.com/jobs" }).success).toBe(false);
  });
});

export {};

