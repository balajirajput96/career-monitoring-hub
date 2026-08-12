import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  BellRing,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Globe2,
  LayoutList,
  Loader2,
  MapPin,
  Plus,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  UserRound,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type ProfileForm = {
  headline: string;
  yearsExperience: number;
  education: string;
  verifiedExperience: string;
  factsSource: string;
  skills: string;
  certifications: string;
  preferredRoles: string;
  preferredLocations: string;
  preferredTracks: Array<"pharma_qa" | "ai_automation">;
  resumeVersions: Array<{ name: string; notes?: string; url?: string; storageKey?: string }>;
  summary: string;
  outputLanguage: "en" | "hi";
};

const emptyProfile: ProfileForm = {
  headline: "",
  yearsExperience: 0,
  education: "",
  verifiedExperience: "",
  factsSource: "",
  skills: "",
  certifications: "",
  preferredRoles: "",
  preferredLocations: "India, Remote",
  preferredTracks: ["pharma_qa", "ai_automation"],
  resumeVersions: [],
  summary: "",
  outputLanguage: "en",
};

const splitList = (value: string) => value.split(",").map(item => item.trim()).filter(Boolean);
const statusTone: Record<string, string> = {
  found: "bg-slate-100 text-slate-700",
  shortlisted: "bg-sky-100 text-sky-800",
  approval_pending: "bg-amber-100 text-amber-800",
  applied: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
  follow_up: "bg-violet-100 text-violet-800",
  closed: "bg-slate-200 text-slate-600",
};

function scoreTone(score: number) {
  if (score >= 80) return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  if (score >= 60) return "bg-sky-50 text-sky-800 ring-sky-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function formatDate(value?: Date | string | null) {
  if (!value) return "Not recorded";
  return new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export default function Home() {
  const utils = trpc.useUtils();
  const overview = trpc.career.overview.useQuery(undefined, { refetchInterval: 60_000 });
  const saveProfile = trpc.career.profile.save.useMutation({ onSuccess: () => { toast.success("Career profile saved"); utils.career.overview.invalidate(); } });
  const uploadResume = trpc.career.profile.uploadResume.useMutation({ onSuccess: resume => { setProfileForm(current => ({ ...current, resumeVersions: [...current.resumeVersions, resume] })); toast.success("Resume stored privately — save your profile to retain it."); }, onError: error => toast.error(error.message) });
  const saveSchedule = trpc.career.schedule.save.useMutation({ onSuccess: () => { toast.success("Schedule preferences saved"); utils.career.overview.invalidate(); } });
  const activateSchedule = trpc.career.schedule.activate.useMutation({ onSuccess: () => { toast.success("Recurring workflow activated"); utils.career.overview.invalidate(); }, onError: error => toast.error(error.message) });
  const pauseSchedule = trpc.career.schedule.pause.useMutation({ onSuccess: () => { toast.success("Recurring workflow paused"); utils.career.overview.invalidate(); }, onError: error => toast.error(error.message) });
  const addSource = trpc.career.sources.add.useMutation({ onSuccess: () => { toast.success("Source added"); utils.career.overview.invalidate(); setSourceForm({ name: "", sourceType: "greenhouse", track: "pharma_qa", endpointUrl: "" }); }, onError: error => toast.error(error.message) });
  const removeSource = trpc.career.sources.remove.useMutation({ onSuccess: () => { toast.success("Source removed"); utils.career.overview.invalidate(); } });
  const updateApplication = trpc.career.applications.update.useMutation({ onSuccess: () => utils.career.overview.invalidate(), onError: error => toast.error(error.message) });
  const requestApproval = trpc.career.approvals.request.useMutation({ onSuccess: () => { toast.success("Approval request created — no external action was taken"); utils.career.overview.invalidate(); }, onError: error => toast.error(error.message) });
  const decideApproval = trpc.career.approvals.decide.useMutation({ onSuccess: () => { toast.success("Approval decision saved — external delivery remains a separate guarded step"); utils.career.overview.invalidate(); } });

  const [profileForm, setProfileForm] = useState<ProfileForm>(emptyProfile);
  const [sourceForm, setSourceForm] = useState({ name: "", sourceType: "greenhouse" as "greenhouse" | "lever", track: "pharma_qa" as "pharma_qa" | "ai_automation", endpointUrl: "" });
  const [jobTrack, setJobTrack] = useState<"all" | "pharma_qa" | "ai_automation">("all");
  const [jobLocation, setJobLocation] = useState("");
  const [scheduleForm, setScheduleForm] = useState({ cronExpression: "0 30 3 * * *", language: "en" as "en" | "hi", highPriorityThreshold: 80 });

  useEffect(() => {
    const profile = overview.data?.profile;
    if (!profile) return;
    setProfileForm({
      headline: profile.headline,
      yearsExperience: profile.yearsExperience,
      education: profile.education.join(", "),
      verifiedExperience: profile.verifiedExperience.map(item => `${item.title} — ${item.years} years — ${item.domain}`).join("; "),
      factsSource: profile.factsSource ?? "",
      skills: profile.skills.join(", "),
      certifications: profile.certifications.join(", "),
      preferredRoles: profile.preferredRoles.join(", "),
      preferredLocations: profile.preferredLocations.join(", "),
      preferredTracks: profile.preferredTracks,
      resumeVersions: profile.resumeVersions,
      summary: profile.summary ?? "",
      outputLanguage: profile.outputLanguage === "hi" ? "hi" : "en",
    });
  }, [overview.data?.profile]);

  useEffect(() => {
    const schedule = overview.data?.schedule;
    if (!schedule) return;
    setScheduleForm({
      cronExpression: schedule.cronExpression,
      language: schedule.language === "hi" ? "hi" : "en",
      highPriorityThreshold: schedule.highPriorityThreshold,
    });
  }, [overview.data?.schedule]);

  const filteredJobs = useMemo(() => (overview.data?.jobs ?? []).filter(item => {
    const trackPass = jobTrack === "all" || item.job.track === jobTrack;
    const locationPass = !jobLocation.trim() || `${item.job.location} ${item.job.workplaceType}`.toLowerCase().includes(jobLocation.toLowerCase());
    return trackPass && locationPass;
  }), [overview.data?.jobs, jobTrack, jobLocation]);

  const submitProfile = (event: FormEvent) => {
    event.preventDefault();
    saveProfile.mutate({
      headline: profileForm.headline || "Career profile",
      yearsExperience: Number(profileForm.yearsExperience) || 0,
      education: splitList(profileForm.education),
      verifiedExperience: profileForm.verifiedExperience.split(";").map(item => item.trim()).filter(Boolean).map(item => {
        const [title = "Verified experience", years = "0", domain = ""] = item.split("—").map(part => part.trim());
        return { title, years: Number.parseFloat(years) || 0, domain: domain || "Quality assurance" };
      }),
      factsSource: profileForm.factsSource || undefined,
      skills: splitList(profileForm.skills),
      certifications: splitList(profileForm.certifications),
      preferredRoles: splitList(profileForm.preferredRoles),
      preferredLocations: splitList(profileForm.preferredLocations),
      preferredTracks: profileForm.preferredTracks,
      resumeVersions: profileForm.resumeVersions,
      summary: profileForm.summary || undefined,
      outputLanguage: profileForm.outputLanguage,
    });
  };

  const submitSource = (event: FormEvent) => {
    event.preventDefault();
    addSource.mutate(sourceForm);
  };

  const saveCurrentSchedule = () => {
    saveSchedule.mutate({ ...scheduleForm, timezone: "Asia/Kolkata" });
  };

  const uploadSelectedResume = (file?: File) => {
    if (!file) return;
    const allowed = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(file.type)) { toast.error("Choose a PDF or DOCX resume."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Resume files must be no larger than 5 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const base64 = result.split(",")[1];
      if (!base64) { toast.error("The resume could not be read."); return; }
      uploadResume.mutate({ fileName: file.name, contentType: file.type as "application/pdf" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document", base64 });
    };
    reader.readAsDataURL(file);
  };

  if (overview.isLoading) {
    return <DashboardLayout><div className="min-h-[70vh] grid place-items-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div></DashboardLayout>;
  }

  if (overview.isError || !overview.data) {
    return <DashboardLayout><div className="soft-panel max-w-xl rounded-3xl p-8"><AlertTriangle className="h-7 w-7 text-destructive" /><h1 className="mt-4 text-xl font-semibold">The monitoring hub could not load</h1><p className="mt-2 text-sm text-muted-foreground">Refresh the page. If the problem persists, check the service logs before activating the scheduled workflow.</p></div></DashboardLayout>;
  }

  const { metrics, schedule, jobs, applications, pendingApprovals, reports, runs, sources } = overview.data;
  const nextStep = !overview.data.profile ? "Complete profile" : sources.length === 0 ? "Add a verified source" : schedule.isEnabled ? "Monitoring is scheduled" : "Activate schedule after deployment";

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6 pb-12">
        <section id="overview" className="soft-panel relative overflow-hidden rounded-[1.75rem] border border-white/70 p-6 sm:p-8">
          <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-emerald-200/50 blur-3xl" />
          <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700"><Sparkles className="h-3.5 w-3.5" /> Career intelligence system</div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">A focused job search, with you in control.</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">Two professional tracks. Evidence-first rankings. A hard approval gate before every application, message, or post.</p>
            </div>
            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-3 text-sm shadow-sm">
              <div className="flex items-center gap-2 font-medium text-emerald-900"><ShieldCheck className="h-4 w-4" /> {nextStep}</div>
              <p className="mt-1 text-xs text-emerald-800">Routine processing stays silent. Meaningful events only.</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "High-priority matches", value: metrics.highPriorityCount, icon: Target, detail: `≥ ${schedule.highPriorityThreshold} score` },
            { label: "Tracked applications", value: metrics.trackedApplications, icon: BriefcaseBusiness, detail: "Persistent lifecycle history" },
            { label: "Active verified sources", value: metrics.activeSources, icon: Globe2, detail: "Public career feeds only" },
            { label: "Awaiting your review", value: pendingApprovals.length, icon: ClipboardCheck, detail: "No action sent automatically" },
          ].map(card => <div key={card.label} className="soft-panel rounded-2xl border border-white/80 p-5"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-500">{card.label}</p><p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{card.value}</p></div><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white"><card.icon className="h-4.5 w-4.5" /></div></div><p className="mt-3 text-xs text-slate-500">{card.detail}</p></div>)}
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div id="opportunities" className="soft-panel rounded-3xl border border-white/80 p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2"><LayoutList className="h-4 w-4 text-primary" /><h2 className="font-semibold text-slate-900">New opportunities</h2></div><p className="mt-1 text-sm text-slate-500">Only source-linked roles are shown. Duplicate listings are discarded on ingest.</p></div><div className="flex flex-wrap gap-2"><Select value={jobTrack} onValueChange={value => setJobTrack(value as typeof jobTrack)}><SelectTrigger className="h-9 w-[156px] bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All tracks</SelectItem><SelectItem value="pharma_qa">Pharmaceutical QA</SelectItem><SelectItem value="ai_automation">AI / Automation</SelectItem></SelectContent></Select><Input className="h-9 w-[145px] bg-white" value={jobLocation} onChange={event => setJobLocation(event.target.value)} placeholder="India / remote" /></div></div>
            <div className="mt-5 space-y-3">
              {filteredJobs.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-5 py-10 text-center"><BriefcaseBusiness className="mx-auto h-6 w-6 text-slate-400" /><p className="mt-3 font-medium text-slate-700">No verified jobs yet</p><p className="mt-1 text-sm text-slate-500">Save your profile, then add a documented Greenhouse or Lever public jobs endpoint. The scheduled workflow will do the rest.</p></div> : filteredJobs.map(item => {
                const score = item.match?.overallScore ?? 0;
                return <article key={item.job.id} className="rounded-2xl border border-slate-100 bg-white/80 p-4 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/50"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge className="border-0 bg-slate-900 text-[10px] font-semibold uppercase tracking-wider text-white">{item.job.track === "pharma_qa" ? "Pharma QA" : "AI / Automation"}</Badge><Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-800"><BadgeCheck className="mr-1 h-3 w-3" /> verified source</Badge></div><h3 className="mt-2 font-semibold text-slate-900">{item.job.title}</h3><p className="mt-1 text-sm text-slate-600">{item.job.company}</p><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {item.job.location}</span><span>{item.job.workplaceType.replaceAll("_", " ")}</span><span>Discovered {formatDate(item.job.discoveredAt)}</span></div></div><div className="flex shrink-0 items-center gap-2"><div className={`rounded-xl px-3 py-2 text-center ring-1 ${scoreTone(score)}`}><p className="text-lg font-semibold leading-none">{score}</p><p className="mt-1 text-[9px] font-bold uppercase tracking-wider">Match</p></div><a href={item.job.sourceUrl} target="_blank" rel="noreferrer" className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" aria-label="Open verified job source"><ArrowUpRight className="h-4 w-4" /></a></div></div><p className="mt-3 line-clamp-2 text-sm leading-5 text-slate-600">{item.match?.rationale ?? "Structured match explanation will be recorded after the next scheduled workflow."}</p><div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3"><span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusTone[item.application?.status ?? "found"]}`}>{(item.application?.status ?? "found").replaceAll("_", " ")}</span><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => updateApplication.mutate({ jobId: item.job.id, status: "shortlisted" })}>Shortlist</Button><Button size="sm" onClick={() => requestApproval.mutate({ jobId: item.job.id, applicationId: item.application?.id, actionType: "application_submit" })}>Request approval</Button></div></div></article>;
              })}
            </div>
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl bg-slate-900 p-6 text-slate-50 shadow-xl shadow-slate-300/30"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-300">Workflow schedule</p><h2 className="mt-2 text-xl font-semibold">{schedule.isEnabled ? "Monitoring is active" : "Awaiting activation"}</h2></div><CalendarClock className="h-5 w-5 text-emerald-300" /></div><p className="mt-3 text-sm leading-6 text-slate-300">Daily discovery and reporting are configured for <span className="font-medium text-white">09:00 IST</span> by default. The schedule is the sole recurring trigger.</p><div className="mt-5 rounded-2xl bg-white/10 p-3 text-xs text-slate-300"><div className="flex justify-between"><span>Next run</span><span className="font-medium text-white">{schedule.isEnabled ? "Managed by schedule" : "Not active"}</span></div><div className="mt-2 flex justify-between"><span>Last run</span><span className="font-medium text-white">{formatDate(schedule.lastRunAt)}</span></div></div><div className="mt-5 flex gap-2">{schedule.isEnabled ? <Button variant="secondary" size="sm" className="flex-1" onClick={() => pauseSchedule.mutate()}>Pause monitoring</Button> : <Button size="sm" className="flex-1 bg-emerald-400 text-slate-950 hover:bg-emerald-300" onClick={() => activateSchedule.mutate()}>Activate after deploy</Button>}</div></section>
            <section className="soft-panel rounded-3xl border border-white/80 p-5"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /><h2 className="font-semibold text-slate-900">Latest daily report</h2></div>{reports[0] ? <><p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">{reports[0].content}</p><p className="mt-4 text-xs text-slate-500">Generated {formatDate(reports[0].createdAt)} · {reports[0].language === "hi" ? "Hindi" : "English"}</p></> : <p className="mt-3 text-sm leading-6 text-slate-500">Your end-of-run report will appear here after the first scheduled discovery.</p>}</section>
          </aside>
        </section>

        <section id="approvals" className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="soft-panel rounded-3xl border border-white/80 p-5 sm:p-6"><div className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-primary" /><h2 className="font-semibold text-slate-900">Approval queue</h2></div><p className="mt-1 text-sm text-slate-500">Approving a request records your decision; it does not silently submit an application, send a message, or publish a post.</p><div className="mt-5 space-y-3">{pendingApprovals.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-5 py-8 text-center"><CheckCircle2 className="mx-auto h-6 w-6 text-emerald-500" /><p className="mt-3 font-medium text-slate-700">Nothing needs your decision</p><p className="mt-1 text-sm text-slate-500">Any external action will arrive here first, with a source link and a clear record.</p></div> : pendingApprovals.map(item => <div key={item.approval.id} className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><Badge className="border-0 bg-amber-200 text-[10px] font-semibold uppercase tracking-wider text-amber-900">Review needed</Badge><p className="mt-2 font-medium text-slate-900">{item.approval.actionType.replaceAll("_", " ")} · {item.job?.title ?? "Linked item"}</p><p className="mt-1 text-sm text-slate-600">{item.job?.company ?? ""}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => decideApproval.mutate({ approvalId: item.approval.id, decision: "declined" })}>Decline</Button><Button size="sm" onClick={() => decideApproval.mutate({ approvalId: item.approval.id, decision: "approved" })}>Approve review</Button></div></div></div>)}</div></div>
          <div className="soft-panel rounded-3xl border border-white/80 p-5"><div className="flex items-center gap-2"><BellRing className="h-4 w-4 text-primary" /><h2 className="font-semibold text-slate-900">Signal-only alerts</h2></div><div className="mt-4 space-y-3 text-sm"><div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><p><span className="font-medium text-slate-800">High-priority matches</span><br /><span className="text-slate-500">Only roles above your threshold.</span></p></div><div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><p><span className="font-medium text-slate-800">Approval requests</span><br /><span className="text-slate-500">Before any external step.</span></p></div><div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><p><span className="font-medium text-slate-800">Recruiter responses</span><br /><span className="text-slate-500">When a verified contact is recorded.</span></p></div></div></div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="soft-panel rounded-3xl border border-white/80 p-5 sm:p-6"><div className="flex items-center justify-between"><div><div className="flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4 text-primary" /><h2 className="font-semibold text-slate-900">Application tracker</h2></div><p className="mt-1 text-sm text-slate-500">Persistent status, notes and follow-up context.</p></div><Badge variant="outline" className="border-slate-200 bg-white">{applications.length} records</Badge></div><div className="mt-5 space-y-3">{applications.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-6 text-center text-sm text-slate-500">Shortlist a verified job to begin tracking it.</p> : applications.slice(0, 6).map(item => <div key={item.application.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white/80 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate font-medium text-slate-900">{item.job.title}</p><p className="mt-1 text-sm text-slate-500">{item.job.company} · {item.match?.overallScore ?? 0} match</p></div><Select value={item.application.status} onValueChange={value => updateApplication.mutate({ jobId: item.job.id, status: value as "found" | "shortlisted" | "approval_pending" | "applied" | "rejected" | "follow_up" | "closed" })}><SelectTrigger className="h-9 w-[158px] bg-white"><SelectValue /></SelectTrigger><SelectContent>{["found", "shortlisted", "approval_pending", "applied", "follow_up", "rejected", "closed"].map(status => <SelectItem key={status} value={status}>{status.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select></div>)}</div></div>
          <div className="soft-panel rounded-3xl border border-white/80 p-5 sm:p-6"><div className="flex items-center gap-2"><Settings2 className="h-4 w-4 text-primary" /><h2 className="font-semibold text-slate-900">Schedule preferences</h2></div><p className="mt-1 text-sm text-slate-500">Stored in UTC for reliable execution; the default maps to 09:00 IST.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><Label htmlFor="cron">Six-field UTC cron</Label><Input id="cron" className="mt-1.5 bg-white font-mono text-xs" value={scheduleForm.cronExpression} onChange={event => setScheduleForm(current => ({ ...current, cronExpression: event.target.value }))} /></div><div><Label htmlFor="threshold">High-priority score</Label><Input id="threshold" type="number" min={50} max={100} className="mt-1.5 bg-white" value={scheduleForm.highPriorityThreshold} onChange={event => setScheduleForm(current => ({ ...current, highPriorityThreshold: Number(event.target.value) }))} /></div><div><Label>Report language</Label><Select value={scheduleForm.language} onValueChange={value => setScheduleForm(current => ({ ...current, language: value as "en" | "hi" }))}><SelectTrigger className="mt-1.5 bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="en">English</SelectItem><SelectItem value="hi">Hindi</SelectItem></SelectContent></Select></div><div><Label>Timezone</Label><div className="mt-1.5 flex h-9 items-center rounded-md border border-input bg-slate-50 px-3 text-sm text-slate-600">Asia/Kolkata (IST)</div></div></div><Button className="mt-5" onClick={saveCurrentSchedule} disabled={saveSchedule.isPending}>{saveSchedule.isPending ? "Saving…" : "Save schedule preferences"}</Button></div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <form id="profile" onSubmit={submitProfile} className="soft-panel scroll-mt-5 rounded-3xl border border-white/80 p-5 sm:p-6"><div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-primary" /><h2 className="font-semibold text-slate-900">Career profile</h2></div><p className="mt-1 text-sm text-slate-500">This data drives deterministic ranking before the LLM writes an explanation.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><Label htmlFor="headline">Professional headline</Label><Input id="headline" className="mt-1.5 bg-white" value={profileForm.headline} onChange={event => setProfileForm(current => ({ ...current, headline: event.target.value }))} placeholder="e.g. Pharmaceutical QA professional | Python automation" /></div><div><Label htmlFor="experience">Years of experience</Label><Input id="experience" type="number" min={0} max={60} className="mt-1.5 bg-white" value={profileForm.yearsExperience} onChange={event => setProfileForm(current => ({ ...current, yearsExperience: Number(event.target.value) }))} /></div><div><Label htmlFor="education">Education</Label><Input id="education" className="mt-1.5 bg-white" value={profileForm.education} onChange={event => setProfileForm(current => ({ ...current, education: event.target.value }))} placeholder="Diploma in Biotechnology" /></div><div className="sm:col-span-2"><Label htmlFor="verified-experience">Verified experience <span className="text-muted-foreground">(title — years — domain; separate entries with ;)</span></Label><Textarea id="verified-experience" className="mt-1.5 min-h-20 bg-white" value={profileForm.verifiedExperience} onChange={event => setProfileForm(current => ({ ...current, verifiedExperience: event.target.value }))} placeholder="Quality Officer / QA — 2 — Pharmaceutical quality assurance" /></div><div className="sm:col-span-2"><Label>Preferred career tracks</Label><div className="mt-2 grid gap-2 sm:grid-cols-2">{([{ value: "pharma_qa", label: "Pharmaceutical QA" }, { value: "ai_automation", label: "AI / Python / Automation" }] as const).map(track => <label key={track.value} className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"><input type="checkbox" checked={profileForm.preferredTracks.includes(track.value)} onChange={event => setProfileForm(current => { const next = event.target.checked ? Array.from(new Set([...current.preferredTracks, track.value])) : current.preferredTracks.filter(item => item !== track.value); return { ...current, preferredTracks: next.length ? next : current.preferredTracks }; })} /><span>{track.label}</span></label>)}</div></div><div><Label>Output language</Label><Select value={profileForm.outputLanguage} onValueChange={value => setProfileForm(current => ({ ...current, outputLanguage: value as "en" | "hi" }))}><SelectTrigger className="mt-1.5 bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="en">English</SelectItem><SelectItem value="hi">Hindi</SelectItem></SelectContent></Select></div><div className="sm:col-span-2"><Label htmlFor="skills">Skills <span className="text-muted-foreground">(comma-separated)</span></Label><Textarea id="skills" className="mt-1.5 min-h-20 bg-white" value={profileForm.skills} onChange={event => setProfileForm(current => ({ ...current, skills: event.target.value }))} placeholder="GMP, SOPs, CAPA, Python, SQL, automation" /></div><div><Label htmlFor="roles">Preferred roles</Label><Textarea id="roles" className="mt-1.5 min-h-20 bg-white" value={profileForm.preferredRoles} onChange={event => setProfileForm(current => ({ ...current, preferredRoles: event.target.value }))} placeholder="QA Officer, Automation Engineer" /></div><div><Label htmlFor="locations">Preferred locations</Label><Textarea id="locations" className="mt-1.5 min-h-20 bg-white" value={profileForm.preferredLocations} onChange={event => setProfileForm(current => ({ ...current, preferredLocations: event.target.value }))} placeholder="India, Remote" /></div><div><Label htmlFor="certs">Certifications</Label><Textarea id="certs" className="mt-1.5 min-h-20 bg-white" value={profileForm.certifications} onChange={event => setProfileForm(current => ({ ...current, certifications: event.target.value }))} placeholder="GMP certification, Python certification" /></div><div><Label htmlFor="resumes">Resume uploads</Label><Input id="resumes" className="mt-1.5 cursor-pointer bg-white" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={event => uploadSelectedResume(event.target.files?.[0])} disabled={uploadResume.isPending} /><p className="mt-1.5 text-xs text-slate-500">PDF or DOCX, up to 5 MB. Stored privately; uploading never submits an application.</p><div className="mt-2 space-y-1.5">{profileForm.resumeVersions.length === 0 ? <p className="text-xs text-slate-500">No resume uploaded yet.</p> : profileForm.resumeVersions.map((resume, index) => <div key={`${resume.name}-${index}`} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-white/70 px-2.5 py-2 text-xs"><a href={resume.url} target="_blank" rel="noreferrer" className="truncate font-medium text-slate-700 hover:text-primary">{resume.name}</a><Button type="button" size="icon" variant="ghost" className="h-6 w-6 shrink-0 text-slate-400 hover:text-destructive" onClick={() => setProfileForm(current => ({ ...current, resumeVersions: current.resumeVersions.filter((_, currentIndex) => currentIndex !== index) }))} aria-label={`Remove ${resume.name}`}><Trash2 className="h-3.5 w-3.5" /></Button></div>)}</div></div><div className="sm:col-span-2"><Label htmlFor="facts-source">Verified facts source URL</Label><Input id="facts-source" type="url" className="mt-1.5 bg-white" value={profileForm.factsSource} onChange={event => setProfileForm(current => ({ ...current, factsSource: event.target.value }))} placeholder="Google Doc or other evidence URL" /></div><div className="sm:col-span-2"><Label htmlFor="summary">Profile summary</Label><Textarea id="summary" className="mt-1.5 min-h-24 bg-white" value={profileForm.summary} onChange={event => setProfileForm(current => ({ ...current, summary: event.target.value }))} placeholder="Brief factual summary for matching. Do not add sensitive personal data." /></div></div><Button type="submit" className="mt-5" disabled={saveProfile.isPending}>{saveProfile.isPending ? "Saving…" : "Save career profile"}</Button></form>
          <form onSubmit={submitSource} className="soft-panel rounded-3xl border border-white/80 p-5 sm:p-6"><div className="flex items-center justify-between"><div><div className="flex items-center gap-2"><Globe2 className="h-4 w-4 text-primary" /><h2 className="font-semibold text-slate-900">Verified job sources</h2></div><p className="mt-1 text-sm text-slate-500">Add only public, documented career-feed endpoints. LinkedIn is not automatically ingested.</p></div><Badge variant="outline" className="border-slate-200 bg-white">{sources.length} source{sources.length === 1 ? "" : "s"}</Badge></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><Label htmlFor="source-name">Company or source name</Label><Input id="source-name" className="mt-1.5 bg-white" value={sourceForm.name} onChange={event => setSourceForm(current => ({ ...current, name: event.target.value }))} placeholder="Company careers feed" /></div><div><Label>Feed format</Label><Select value={sourceForm.sourceType} onValueChange={value => setSourceForm(current => ({ ...current, sourceType: value as "greenhouse" | "lever" }))}><SelectTrigger className="mt-1.5 bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="greenhouse">Greenhouse public JSON</SelectItem><SelectItem value="lever">Lever public JSON</SelectItem></SelectContent></Select></div><div><Label>Track</Label><Select value={sourceForm.track} onValueChange={value => setSourceForm(current => ({ ...current, track: value as "pharma_qa" | "ai_automation" }))}><SelectTrigger className="mt-1.5 bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pharma_qa">Pharmaceutical QA</SelectItem><SelectItem value="ai_automation">AI / Automation</SelectItem></SelectContent></Select></div><div className="sm:col-span-2"><Label htmlFor="endpoint">Public jobs endpoint URL</Label><Input id="endpoint" type="url" className="mt-1.5 bg-white" value={sourceForm.endpointUrl} onChange={event => setSourceForm(current => ({ ...current, endpointUrl: event.target.value }))} placeholder="https://boards-api.greenhouse.io/v1/boards/company/jobs?content=true" /></div></div><Button type="submit" className="mt-5" disabled={addSource.isPending}><Plus className="mr-1.5 h-4 w-4" />Add verified source</Button><div className="mt-5 space-y-2">{sources.length === 0 ? <p className="text-sm text-slate-500">No sources added yet. The workflow will never invent opportunities or scrape protected platforms.</p> : sources.map(source => <div key={source.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white/80 px-3 py-2.5"><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-800">{source.name}</p><p className="text-xs text-slate-500">{source.sourceType} · {source.track === "pharma_qa" ? "Pharma QA" : "AI / Automation"}</p></div><Button type="button" size="icon" variant="ghost" className="text-slate-500 hover:text-destructive" onClick={() => removeSource.mutate({ sourceId: source.id })} aria-label={`Remove ${source.name}`}><Trash2 className="h-4 w-4" /></Button></div>)}</div></form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white/70 p-5"><div className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-primary" /><h2 className="font-semibold text-slate-900">Recent workflow activity</h2></div><div className="mt-4 grid gap-3 md:grid-cols-3">{runs.length === 0 ? <p className="col-span-full text-sm text-slate-500">No scheduled runs recorded yet.</p> : runs.map(run => <div key={run.id} className="rounded-2xl bg-slate-50 p-4"><div className="flex items-center justify-between"><Badge variant="outline" className="bg-white capitalize">{run.status.replaceAll("_", " ")}</Badge><span className="text-xs text-slate-500">{formatDate(run.startedAt)}</span></div><p className="mt-3 line-clamp-3 text-sm leading-5 text-slate-600">{run.summary ?? run.error ?? "Scheduled run recorded."}</p></div>)}</div></section>
      </div>
    </DashboardLayout>
  );
}
