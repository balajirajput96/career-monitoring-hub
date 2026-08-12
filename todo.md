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
