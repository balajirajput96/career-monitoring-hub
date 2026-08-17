# Project TODO

- [x] Add persistent database models for candidate profiles, jobs, application records, recruiter contacts, reports, run history, approval requests, and workflow state.
- [x] Implement preferred-track controls in the owner profile editor and verify profile save/load behavior alongside private resume uploads.
- [x] Implement a two-track job discovery pipeline for Pharmaceutical QA and AI/Python/Automation roles using legitimate, configurable public career-feed sources.
- [x] Add deterministic deduplication, eligibility classification, ranking, and match-score calculations that preserve source URLs and verification status.
- [x] Add reviewable LLM cover-note drafts alongside match explanations and bilingual daily summaries, with no external action path.
- [x] Build a polished dashboard with job feed, track/location/date filters, score breakdowns, run status, and meaningful-event indicators.
- [x] Add recruiter-contact tracking controls, follow-up/notes editing, resume selection, and explicit application-level duplicate safeguards to the persistent application tracker.
- [x] Implement an approval queue that prevents external application submissions, messages, or posts unless the owner explicitly approves the individual action.
- [x] Implement a configurable daily 09:00 IST default scheduled workflow that discovers, verifies, scores, deduplicates, records, and reports without a manual trigger after production activation.
- [x] Add verified recruiter-response and operational-blocker owner notifications while retaining signal-only delivery.
- [x] Add run logs, error handling, recovery state, and source-verification labels for scheduled-work reliability.
- [x] Add automated tests for approval gates, report eligibility, and scheduled-work safety in addition to scoring, deduplication, and resume-storage coverage.
- [x] Verify the responsive UI and scheduled-work configuration, then create a deployment-ready checkpoint.
- [x] Import and verify career profile details from the user-provided Google Doc, including Diploma in Biotechnology and two years of Quality Officer/QA experience.
- [x] Apply the verified Google Doc profile details to scoring, preferred roles, resume context, and bilingual report settings without inventing missing facts.
- [x] Confirm a legitimate public job-feed source before activating recurring discovery for the configured tracks.

---

## Change history

- User provided a Google Doc as the source of truth for career details and added Diploma in Biotechnology plus two years of Quality Officer/QA experience.
- Verified profile persistence now includes education, structured verified experience, and factsSource; missing profiles bootstrap from the documented facts without setting an email.
- Public source creation is restricted to HTTPS Greenhouse boards JSON and Lever postings JSON endpoints.
- [x] Add visible preferred-track editing controls in the profile form and verify save/load round-trip.
- [x] Extend deterministic scoring with relevant verified education/experience signals and regression tests without inventing employment history.
- [x] Document verified facts as the resume-context source of truth until a dedicated resume-context feature is implemented.
- [x] Wire bilingual daily reporting to the intended profile/report language setting and cover the language path with tests.
- [x] Ensure verified profile facts are available to resume-context and scoring features without inventing employment history.
- [x] Add explicit automated tests for resume upload/storage validation, owned resume selection, metadata persistence, and rejection of invalid or unowned references.
- [x] Add explicit automated tests for general job deduplication behavior, separate from repeated application-submission blocking.
- [x] Resolve live recurring-schedule activation guard: stale owner task was migrated; the signed-in published dashboard now shows Monitoring is active with 09:00 IST scheduling.
- [x] Investigate and fix the live schedule activation permission issue so Activate/Pause does not surface a 403 on the published site.
- [x] Add a regression test or documented verification for existing-task re-enable/update using the correct user session token.
- [x] Re-verify the published dashboard after the fix: clean activation, scheduled next run, and no error toast.
- [x] Resolve cron task ownership mismatch between the published app user and the platform owner, without creating duplicate active jobs.
- [x] Cover activate and pause behavior for an existing task with a mocked ownership/session policy, including 403 handling.
- [x] Re-verify the published dashboard after the ownership fix and confirm no activation or pause error toast.
- [x] Add regression tests for pauseSchedule on an existing task, including mocked Heartbeat 403 responses and ownership/session policy behavior.
- [x] Live-verify the published Pause monitoring action, then reactivate it, confirming no error toast in either direction.
- [x] Document the final live Heartbeat state after pause/reactivate: one active user-owned task UID and no duplicate cron jobs.
- [x] Add an explicit test for the existing-task activateSchedule router path with mocked Heartbeat ownership/session outcomes.
- [x] Add an explicit test for pauseSchedule on an existing persisted task, including mocked 403 handling and non-destructive TRPC behavior.
- [x] Add a direct router-level pauseSchedule test where Heartbeat 403 remains unrecoverable, asserting the intended non-destructive TRPC error and unchanged persisted schedule state.

- [ ] Validate the first scheduled discovery run, including bilingual English/Hindi report generation, threshold behavior, and persisted run results.
- [x] Make scheduled discovery complete within Heartbeat's execution budget by removing inline retry-prone AI calls and bounding per-run source/job work.
- [x] Add regression tests proving scheduled discovery uses deterministic report/explanation fallbacks and does not invoke LLM or notification network calls inline.
- [x] Add a mocked scheduled-workflow execution test proving no inline LLM or owner-notification calls occur.
- [x] Add a bounded-load scheduled-workflow test covering multiple sources and the explicit per-run processing limit.
- [ ] Publish the timeout-safe workflow and re-verify a completed Heartbeat callback with a persisted bilingual report.
- [x] Add privacy-preserving recruiter-response email ingestion with read-only access, sender/thread matching, deduplication, and manual-review status updates only.
- [x] Research and add additional legitimate public Greenhouse/Lever sources for Pharmaceutical QA and AI/Python/Automation tracks, with source verification and tests.

- [ ] Integrate a real read-only Gmail ingestion path into the app/scheduler using protected mailbox reads and persistent recruiter events.
- [x] Add thread-based recruiter matching/reconciliation and protected manual review-status updates.
- [x] Add regression tests for recruiter email deduplication, sender normalization, thread handling, matched-contact updates, and review-only behavior.
- [x] Add source-specific automated tests for Legend Biotech and Remote public feed acceptance and deterministic eligibility limitations.
- [x] Add recruiter email ingestion regression tests covering duplicate messageId handling, thread-based contact reconciliation, matched-contact responseStatus updates, and protected reviewEmailEvent mutation behavior.
- [x] Add an end-to-end or mocked-store ingestion regression test asserting matched-contact responseStatus updates during recruiter email ingest.
- [x] Add a router-level protected test for contacts.reviewEmailEvent covering signed-in success and unauthenticated rejection.
- [x] Add a recruiter email ingestion regression test that exercises ingestRecruiterEmailEvents with a matched contact and explicitly asserts the recruiter's responseStatus is updated as intended during ingest.

- [ ] Add an approved n8n read-only Gmail-to-Career-Hub transport with authenticated webhook delivery and no send/draft capability.
- [ ] Verify the n8n sync end to end with deduplicated recruiter events, thread/contact matching, and manual-review-only state.
- [x] Fix the n8n activation-link localhost redirect by using the public Render usage route and verify Community Edition activation.

- [x] Add a signed server-to-server recruiter-email webhook contract so n8n can ingest events without a browser session or credential bypass.
- [x] Return a structured JSON 500 response when owner lookup or recruiter-event persistence fails, and cover the fail-closed webhook path with regression tests.
- [ ] Configure and test the webhook shared secret for the Career Hub deployment and n8n workflow.

- [x] Create a precise owner-run n8n read-only Gmail-to-Career-Hub setup guide, including OAuth redirect URI, event minimization, and HMAC payload signing.

- [ ] Execute and verify one real Hindi-language scheduled callback with a persisted Hindi daily report, then document both English and Hindi live report evidence. (Blocked: Heartbeat CLI lacks manual trigger; must wait for scheduled execution or owner manual trigger)
- [x] Repair and re-verify the active Heartbeat task after the temporary validation attempt left a stale next-execution timestamp despite the restored 09:00 IST cron expression.
- [ ] Verify the first completed callback from replacement task `3HB9Jfaqhug4ADmtvrqCGA` and its persisted run/report records after 09:00 IST on 18 Aug 2026. (Blocked: Must wait for scheduled execution time)

- [ ] Complete Gmail polling only after the owner authorizes a valid Google OAuth credential in n8n; do not create or store fabricated credentials. (Blocked: Owner declined paid Render upgrade required for persistent n8n; using no-cost Apps Script fallback instead)
- [ ] Complete signed webhook delivery only after a legitimate shared secret is configured in both Career Hub and n8n. (Blocked: Owner declined paid Render upgrade required for persistent n8n; using no-cost Apps Script fallback instead)

- [x] Add a dashboard form to manually import a recruiter email with sender, subject, received time, message ID, optional thread ID, and snippet.
- [x] Display imported recruiter email events in the dashboard and allow only reviewed or ignored status changes.
- [x] Add regression coverage for importer input normalization, mutation payloads, and manual-review-only outcomes.
- [x] Add an explicit recruiter-email review queue error state for failed event loading.
- [x] Add UI-focused manual importer normalization tests for trimming, optional fields, datetime conversion, and review action restrictions.
- [x] Ensure manual importer normalization tests are included in the Vitest run and record their passing output.
- [x] Add a dashboard-level importer test for form serialization/mutation payload construction and reviewed/ignored-only options.
- [x] Add a rendered Home dashboard importer test that submits normalized email data to the contacts.ingestEmailEvents mutation.
- [x] Add a rendered Home review-control test that exposes only reviewed and ignored as actionable status options.

- [x] Verify the current connected-service inventory and GitHub browser sign-in status; request secure owner takeover only if GitHub authentication is unavailable.
- [x] Open GitHub in the browser and verify the web session; request owner takeover only if browser authentication is unavailable.
- [x] Document the verified connected-service inventory and GitHub browser-session result in project verification notes.

- [x] Assess a no-cost alternative to persistent Render n8n for recruiter-email ingestion without weakening read-only and manual-review safety.
- [x] Compare the built-in read-only Gmail connector/manual importer, connector-capable bridge, and inactive n8n on Render Free.
- [x] Select the safest viable no-cost option: owner-run Apps Script template or existing manual importer, without fabricating OAuth credentials or bypassing provider authentication.
- [x] Document that no paid Render plan, persistent disk, card, or billing change was made.
- [x] Repair and re-verify the transient dev-server module-resolution state; current server starts cleanly and TypeScript plus 58 Vitest tests pass.

- [x] Audit all project scripts, TypeScript, Vitest, production build, and runtime logs; fix every reproducible code-level failure.
- [x] Inspect the GitHub repository remote, current branch, upstream divergence, and working tree before any rebase or push.
- [x] Create a safe local backup branch and perform a rebase only when a compatible upstream branch exists; resolve conflicts with tests.
- [x] Commit and push only the validated Career Monitoring Hub code to the authenticated GitHub repository after branch safety is confirmed.
- [x] Remediate actionable dependency security findings and restore compatibility across the supported Vite/Vitest toolchain.
- [x] Eliminate or document the remaining non-runtime transitive dependency advisory after verifying package-manager constraints and build behavior.
