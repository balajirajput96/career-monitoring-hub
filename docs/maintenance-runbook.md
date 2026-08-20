# Career Monitoring Hub — Durable Operations Runbook

## Operating purpose

The Career Monitoring Hub is a **review-first discovery system**, not an autonomous application bot. Its deployed recurring workflow preserves the verified candidate profile, searches only configured public Greenhouse and Lever JSON feeds, ranks newly discovered opportunities, persists bilingual summaries, and leaves every external submission or message for owner review.

> **Non-negotiable safety boundary:** no scheduled operation may submit an application, send or draft an email, send a recruiter message, scrape LinkedIn, circumvent an access control, or infer credentials, location eligibility, or professional experience that the profile does not verify.

## Current durable operating model

| Area | Deployed behavior | Durable evidence | Owner control |
| --- | --- | --- | --- |
| Job discovery | One daily callback at **09:00 IST** reads active public Greenhouse and Lever feeds only. | Persisted source, workflow-run, job, match, and report records. | Pause, reactivate, or remove the schedule in the Career Hub dashboard. |
| Execution envelope | Each source request has an 8-second timeout; a run processes at most 12 jobs per source, 24 total jobs, and has a 20-second processing budget. | `scheduledExecutionPolicy` and regression coverage. | Edit source configuration only after endpoint validation. |
| Match scoring | Deterministic scoring uses verified skills, education, two years of QA/Quality Officer experience, preferred locations, role details, and publicly stated eligibility. | Persisted job-match evidence and rationale. | Review queues, thresholds, and the verified profile in the dashboard. |
| Reporting | Every completed, warning-completed, or skipped run persists English and Hindi summaries. | `dailyReports.contentEnglish` and `dailyReports.contentHindi`. | Read the latest bilingual report in the dashboard. |
| Applications and messages | Discovery records candidates for review only. No scheduled path has a submission or delivery capability. | Approval requests, applications, and recruiter events remain separate persisted records. | The owner must explicitly approve any external action through the review flow. |
| Code changes | Repository checks run on every pushed change: type checking, Vitest tests, production build, and high/critical security audit gate. | GitHub Actions workflow history. | Review code and CI status in the private repository. |

## Routine cycle and recovery

Each daily callback validates that it belongs to the persisted schedule, skips an orphaned or disabled task, and prevents overlapping runs. It independently fetches active sources within the bounded time budget, records source errors as reviewable blockers, deduplicates vacancies using stable external keys, persists match evidence, and saves the bilingual report. A transient source error produces a warning-completed run rather than a false claim of success.

If the callback fails, the platform may retry according to its managed retry behavior. The next scheduled cycle continues from the persisted database state; it does not resubmit applications, duplicate existing jobs, or erase earlier results. Operational review should begin with the most recent workflow run, source error, and bilingual report. When a code change is required, it must pass the local regression suite and the private repository’s hosted CI before being treated as operationally verified.

| Signal | Interpretation | Safe response |
| --- | --- | --- |
| `completed` | Sources were processed within the policy envelope. | Review new high-priority matches and any manual-approval queue entries. |
| `completed_with_warnings` | At least one source produced a recoverable error or processing limit warning. | Inspect the persisted blocker and source configuration; keep other verified results. |
| `skipped` | The schedule was disabled, already running, orphaned, or the profile was incomplete. | Correct the recorded state before the next run; do not force duplicate execution. |
| `failed` | An unexpected error prevented completion. | Inspect the structured callback error, repair code or configuration, run regression checks, then allow the next managed cycle. |

## Frequency and scope boundaries

The current daily cadence is deliberately bounded. Launching a fresh full-agent session every hour or more frequently would be costly, duplicate public-feed discovery, and provide no corresponding benefit to this deterministic workflow. The dashboard may refresh its already-persisted view for convenience, but that is not a new source-discovery run.

Any future near-real-time monitoring request must first be designed as a separate, resource-bounded service. It must retain the same public-feed-only rule, persistent deduplication, explicit error logging, and manual-approval gate. It must not be implemented as a high-frequency agent loop or as an in-process timer that could silently stop when an instance sleeps.

## Privacy and integrity commitments

Operational inventories may contain only system health facts: schedule status, task identifier, last/next run time, source status, workflow status, test/CI outcome, and documented blocker class. They must not expose credentials, private tokens, inbox content, raw recruiter communications, or data from unrelated repositories/accounts.

All reported vacancies, match scores, remote/India eligibility labels, recruiter contacts, and application states remain evidence-bound. When a public source does not establish a fact, the system records it as unverified rather than guessing.
