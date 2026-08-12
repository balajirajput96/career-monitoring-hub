import { describe, expect, it } from "vitest";
import { profileInputSchema } from "./routers/career";

const baseProfile = {
  headline: "QA and automation professional",
  yearsExperience: 4,
  education: ["Diploma in Biotechnology"],
  verifiedExperience: [{ title: "Quality Officer", years: 2, domain: "Pharmaceutical QA" }],
  skills: ["GMP", "Python"],
  certifications: [],
  preferredRoles: ["QA Officer"],
  preferredLocations: ["India"],
  preferredTracks: ["pharma_qa"] as const,
  summary: "Evidence-based profile.",
  outputLanguage: "en" as const,
};

describe("career profile resume metadata", () => {
  it("accepts a resume stored through the application storage path", () => {
    const result = profileInputSchema.safeParse({
      ...baseProfile,
      resumeVersions: [{
        name: "pharma-qa-resume.pdf",
        storageKey: "career-resumes/42/pharma-qa-resume_ab12cd34.pdf",
        url: "/manus-storage/career-resumes/42/pharma-qa-resume_ab12cd34.pdf",
      }],
    });

    expect(result.success).toBe(true);
  });

  it("rejects arbitrary external URLs as resume storage references", () => {
    const result = profileInputSchema.safeParse({
      ...baseProfile,
      resumeVersions: [{ name: "resume.pdf", url: "https://untrusted.example/resume.pdf" }],
    });

    expect(result.success).toBe(false);
  });
});
