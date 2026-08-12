import { describe, expect, it } from "vitest";
import { scoreJob, stableExternalKey } from "./careerScoring";

describe("career scoring", () => {
  const profile = {
    skills: ["GMP", "CAPA", "Python", "SQL"],
    preferredRoles: ["QA Officer", "Automation Engineer"],
    preferredLocations: ["India", "Remote"],
    yearsExperience: 4,
  };

  it("ranks an evidence-supported remote automation role as eligible", () => {
    const match = scoreJob({ ...profile, preferredRoles: ["Automation Engineer"] }, {
      title: "Python Automation Engineer",
      location: "Remote, India",
      workplaceType: "remote",
      description: "Build SQL reporting automation. Requires 3 years of experience with Python.",
    });

    expect(match.overallScore).toBeGreaterThanOrEqual(70);
    expect(match.eligibility).toBe("eligible");
    expect(match.evidence.matchedSkills).toEqual(expect.arrayContaining(["python", "sql"]));
    expect(match.evidence.requiredYears).toBe(3);
  });

  it("uses verified education and experience as bounded evidence", () => {
    const match = scoreJob({
      ...profile,
      education: ["Diploma in Biotechnology"],
      verifiedExperience: [{ title: "Quality Officer", years: 2, domain: "Pharmaceutical QA" }],
    }, {
      title: "Quality Officer - Pharmaceutical QA",
      location: "Ahmedabad, India",
      workplaceType: "onsite",
      description: "Diploma in Biotechnology preferred; 2 years of experience.",
    });

    expect(match.evidence.matchedVerifiedFacts).toEqual(expect.arrayContaining(["diploma in biotechnology", "quality officer", "pharmaceutical qa"]));
    expect(match.rationale).toContain("verified education/experience facts");
  });

  it("does not overstate an unrelated role with no matching evidence", () => {
    const match = scoreJob(profile, {
      title: "Graphic Designer",
      location: "Berlin",
      workplaceType: "onsite",
      description: "Create brand illustrations and visual campaigns.",
    });

    expect(match.overallScore).toBeLessThan(45);
    expect(match.eligibility).toBe("ineligible");
    expect(match.evidence.matchedSkills).toHaveLength(0);
  });

  it("generates a stable, source-scoped key for deduplication", () => {
    expect(stableExternalKey(17, "  job-401  ")).toBe("17:job-401");
    expect(stableExternalKey(17, "job-401")).toBe(stableExternalKey(17, "job-401"));
    expect(stableExternalKey(17, "job-401")).not.toBe(stableExternalKey(18, "job-401"));
    expect(stableExternalKey(17, "job-401")).not.toBe(stableExternalKey(17, "job-402"));
  });
});
