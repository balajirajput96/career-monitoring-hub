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
