export type ProfileForScoring = {
  skills: string[];
  preferredRoles: string[];
  preferredLocations: string[];
  yearsExperience: number;
  education?: string[] | null;
  verifiedExperience?: Array<{ title: string; years: number; domain: string }> | null;
};

export type JobForScoring = {
  title: string;
  location: string;
  workplaceType: string;
  description?: string | null;
};

export type DeterministicMatch = {
  overallScore: number;
  skillsScore: number;
  experienceScore: number;
  locationScore: number;
  eligibility: "eligible" | "review" | "ineligible";
  evidence: {
    matchedSkills: string[];
    matchedRoles: string[];
    matchedVerifiedFacts: string[];
    requiredYears?: number;
    locationSignal: string;
  };
  rationale: string;
};

const clean = (value: string) => value.trim().toLocaleLowerCase();

const safeArray = (value: string[] | null | undefined) =>
  (value ?? []).map(clean).filter(Boolean);

export function scoreJob(profile: ProfileForScoring, job: JobForScoring): DeterministicMatch {
  const jobText = `${job.title} ${job.location} ${job.workplaceType} ${job.description ?? ""}`.toLocaleLowerCase();
  const skills = safeArray(profile.skills);
  const preferredRoles = safeArray(profile.preferredRoles);
  const preferredLocations = safeArray(profile.preferredLocations);
  const verifiedFacts = [
    ...(profile.education ?? []),
    ...(profile.verifiedExperience ?? []).flatMap(item => [item.title, item.domain]),
  ].map(clean).filter(Boolean);

  const matchedSkills = skills.filter(skill => jobText.includes(skill));
  const matchedVerifiedFacts = verifiedFacts.filter(fact => jobText.includes(fact));
  const matchedRoles = preferredRoles.filter(role => jobText.includes(role));
  const skillsScore = skills.length === 0 ? 0 : Math.round((matchedSkills.length / skills.length) * 55);
  const roleScore = preferredRoles.length === 0 ? 0 : Math.round((matchedRoles.length / preferredRoles.length) * 20);

  const yearsMatch = jobText.match(/(\d{1,2})\s*(?:\+|plus)?\s*years?(?:\s+of)?\s+experience/i);
  const requiredYears = yearsMatch ? Number.parseInt(yearsMatch[1], 10) : undefined;
  const experienceScore = requiredYears === undefined ? 10 : profile.yearsExperience >= requiredYears ? 15 : 3;

  const isRemote = /remote|work from home|wfh|anywhere/.test(jobText);
  const isIndia = /india|mumbai|pune|bengaluru|bangalore|hyderabad|ahmedabad|delhi|gurugram|noida|chennai/.test(jobText);
  const locationMatch = preferredLocations.some(location => jobText.includes(location));
  const locationScore = locationMatch || (isRemote && preferredLocations.some(location => /remote|worldwide|india/.test(location)))
    ? 10
    : isIndia || isRemote
      ? 6
      : 0;

  const verifiedFactsScore = verifiedFacts.length === 0 ? 0 : Math.min(5, Math.round((matchedVerifiedFacts.length / verifiedFacts.length) * 5));
  const overallScore = Math.min(100, skillsScore + roleScore + experienceScore + locationScore + verifiedFactsScore);
  const eligibility: DeterministicMatch["eligibility"] = overallScore >= 70
    ? "eligible"
    : overallScore >= 45
      ? "review"
      : "ineligible";

  const locationSignal = locationMatch
    ? "Matches a preferred location"
    : isRemote
      ? "Remote work signal detected"
      : isIndia
        ? "India location signal detected"
        : "No preferred-location signal detected";

  const rationale = `Matched ${matchedSkills.length}/${skills.length || 0} stored skills, ${matchedRoles.length}/${preferredRoles.length || 0} preferred-role terms, and ${matchedVerifiedFacts.length}/${verifiedFacts.length || 0} verified education/experience facts. ${locationSignal}.${requiredYears !== undefined ? ` Role requests about ${requiredYears} years of experience.` : " Experience requirement was not reliably parsed."}`;

  return {
    overallScore,
    skillsScore,
    experienceScore,
    locationScore,
    eligibility,
    evidence: { matchedSkills, matchedRoles, matchedVerifiedFacts, requiredYears, locationSignal },
    rationale,
  };
}

export function stableExternalKey(sourceId: number, sourceJobId: string | number) {
  return `${sourceId}:${String(sourceJobId).trim()}`.slice(0, 500);
}
