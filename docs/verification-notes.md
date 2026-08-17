# Verification notes

The dashboard dev server is running and TypeScript reports no errors after the profile-field, preferred-track, source-validation, and workflow-language changes. Vitest passes 4 files and 10 tests.

The desktop capture showed the dashboard loading shell/skeleton at 1280x720. The mobile capture at 375x812 rendered the branded Career Intelligence System dashboard without horizontal overflow; the command-center header, high-priority matches, tracked applications, and verified-source prompt were readable and stacked responsively.

The older transform-error line in the log predates the latest restart; the current dev-server output reports a clean restart and no TypeScript errors.

## Latest verification

The dashboard rendered successfully at desktop 1280x720 and mobile 390x844. The mobile capture showed vertically stacked content with no horizontal overflow; profile, source, schedule, approvals, application tracker, and recruiter sections remained reachable. The application tracker now exposes status, saved resume selection, follow-up date, notes, and cover-note draft context. The recruiter panel remains signal-only and has no send-message action.

`pnpm check` passes. `pnpm test -- --run` passes with 5 test files and 20 tests. Tests cover cron-only access, orphan schedules, structured scheduled failures, report eligibility, review-only approval policy, duplicate applied-submission policy, verified facts, resume context, bilingual language precedence, cover-note safety, and public Greenhouse/Lever endpoint validation.

No public Greenhouse or Lever feed was added in this session, so recurring discovery should remain inactive until the owner supplies and verifies a legitimate source endpoint for the configured tracks.

## Live schedule migration verification — 2026-08-12

Published URL: https://careermonhub-fdbzszhr.manus.space/

The previously active task `hFYDsAZJ7sEPD4Lk7ooQmG` was removed from the Heartbeat owner scope after its update returned 403 permission_denied. The corresponding `workflowSchedules` row (`id=30001`, `userId=180001`) was reset to `scheduleCronTaskUid=NULL` and `isEnabled=0`. After refreshing the published dashboard, the signed-in owner activated monitoring successfully. The live dashboard now shows `Monitoring is active`, `Next run: Managed by schedule`, `Last run: Not recorded`, with 2 active verified public sources. The configured UTC cron is `0 30 3 * * *`, equivalent to 09:00 IST. No LinkedIn ingestion or automatic application/message/post execution is enabled.

Verified source records visible on the live dashboard: Storyblok public careers — Greenhouse — AI / Automation; ElevateBio public careers — Greenhouse — Pharma QA.

## Pause-path verification — 2026-08-12

The published dashboard was active, but clicking `Pause monitoring` on the currently published version produced `Heartbeat UpdateHeartbeatJob failed (403): permission_denied`; the UI remained active. This confirms the pause-path fix is code-complete in the working tree but not yet live. The next required step is to save/publish the current checkpoint, then re-test Pause and Reactivate on the published dashboard. Do not treat the pause path as verified until both transitions complete without an error toast.

## Final live schedule verification — 2026-08-12

Published URL: https://careermonhub-fdbzszhr.manus.space/

After the latest checkpoint, the authenticated dashboard successfully transitioned from active monitoring to “Awaiting activation” with “Next run: Not active” after Pause monitoring, then back to “Monitoring is active” after Activate after deploy. The live page showed the 09:00 IST schedule configuration and no visible error toast during either transition. The dashboard continued to show exactly two verified public sources: Storyblok for AI / Automation and ElevateBio for Pharma QA. No LinkedIn ingestion or automatic application, message, or post execution is enabled.

## Final Heartbeat registry verification — 2026-08-12

After the final live Pause → Reactivate cycle, `manus-heartbeat list --json` returned exactly one job (`total: 1`). The active job is `career-monitor-180001`, task UID `b7SZZTySnbbX7ewHx3CJwV`, with `user_id` and registry actor `310519663713082319`. It is enabled, uses cron `0 30 3 * * *` (09:00 IST), calls `POST /api/scheduled/career-monitor`, and has next execution `2026-08-13T03:30:00Z`. No duplicate active task or stale task was present in the registry.

## Additional verified public source evidence — 12 Aug 2026

- Legend Biotech official public Greenhouse board: https://job-boards.greenhouse.io/legendcareers. The board rendered current openings and included Global Quality / QA roles. JSON endpoint validated with HTTP 200 and `application/json`: https://boards-api.greenhouse.io/v1/boards/legendcareers/jobs?content=true. Added to the signed-in dashboard as `Legend Biotech public careers` on the Pharma QA track.
- Remote official public Greenhouse board: https://job-boards.greenhouse.io/remotecom. The board states that most roles are globally remote but country/time-zone restrictions must be checked in each advert. JSON endpoint validated with HTTP 200 and `application/json`: https://boards-api.greenhouse.io/v1/boards/remotecom/jobs?content=true. Added to the signed-in dashboard as `Remote public careers` on the AI / Automation track. India eligibility remains role-specific and is not assumed globally.
- Live dashboard source count increased from 2 to 4. No applications or messages were submitted.
- The first recurring Heartbeat execution has not occurred yet; registry history currently reports zero runs, so bilingual report output remains pending the first scheduled execution.

## Recruiter-response ingestion smoke test — 12 Aug 2026

The configured Gmail connector was queried read-only for recent messages matching interview, application, recruiter, assessment, or next-steps subjects. The connector authenticated as `balajirajput968@gmail.com` and returned zero threads. No email was sent, drafted, labeled, or modified. The application now contains persistent, deduplicated `recruiterEmailEvents` storage plus protected ingestion/list procedures for a future approved mailbox sync; all ingested events remain `unreviewed` and only a matched verified contact may receive a local `replied` status update.

## Expansion regression verification — 12 Aug 2026

The recruiter event model now supports sender normalization, thread-based reconciliation when an earlier event identifies a verified contact, deduplication by user/message ID, and protected manual transitions to `reviewed` or `ignored`. The new public-source contract tests accept both Legend Biotech and Remote Greenhouse endpoints and preserve the rule that worldwide remote does not imply India eligibility. TypeScript passes and the full Vitest suite passes with 8 files and 35 tests.

A remaining deployment-boundary item is the actual recurring Gmail connector-to-app transport. The local Gmail MCP read-only smoke test authenticated successfully and returned zero candidate threads, but the deployed web app cannot directly invoke an MCP server. Until an approved webhook/API transport is configured, Gmail ingestion remains an explicit protected import procedure rather than an automatic scheduled mailbox sync. No email was sent or modified.

The final mocked-store ingestion regression now exercises `ingestRecruiterEmailEvents` with a matched verified recruiter and asserts the contact is updated to `responseStatus: replied` while the email event remains `reviewStatus: unreviewed`. The protected router test also confirms signed-in review success and unauthenticated rejection. The suite now passes 10 files and 42 tests.

The user-provided n8n workspace URL `https://n8n-latest-xddq.onrender.com/home/workflows` was opened on 12 Aug 2026. The host returned Render's application-loading page and showed cold-start messages (service waking, allocating compute, preparing instance, starting instance, environment variables injected, finalizing startup). The n8n workflows UI and authentication state were not yet available during this observation; no workflow was created or modified.

At 14:42:46 local session time on 12 Aug 2026, the specified Render n8n workspace still served Render's application-loading interstitial. The visible startup log progressed through waking, allocating resources, preparing instance, starting instance, and injecting environment variables, but no n8n login form or workflows UI was exposed. Source URL: https://n8n-latest-xddq.onrender.com/home/workflows

Additional monitoring at 14:43:54 local session time: the user-provided Render n8n URL again showed Render's application-loading interstitial after a refresh. Startup log reached incoming request and service waking, but the n8n login page/workflows UI was still unavailable; no takeover was requested.

Activation redirect fix verified at 15:15:57 local session time on 12 Aug 2026. The user-provided email link originally redirected to localhost:5678, but replacing only the host with the public Render n8n URL opened `/settings/usage` successfully. The page reported: “You’re on the Community Edition”, “Registered”, and “License activated — Your Registered Community Edition has been successfully activated.” No credentials were exposed or bypassed.

## OAuth-free manual recruiter-email importer — 12 Aug 2026

An OAuth-free manual recruiter-email importer was added to the signed-in Career Hub dashboard. It accepts a stable message ID, sender, subject, optional thread ID, received time, and optional snippet; it then reuses the protected event-ingestion contract for normalization, deduplication, contact matching, and manual-review-only persistence. The review queue shows an explicit load-error/retry state and permits only `reviewed` or `ignored` outcomes; it never sends an email or performs an external action.

Vitest now discovers server and client tests. The complete suite passed with 13 test files and 49 tests, including actual rendered Home-component interaction tests for importer submission payloads and review-control restrictions. TypeScript validation also passed. Automatic Gmail polling remains dependent on a user-authorized Gmail credential in self-hosted n8n; no Google password, 2FA, or OAuth secret was handled by the agent.

## Gmail delivery architecture evidence — 12 Aug 2026

Official n8n documentation confirms that Gmail Trigger operates by polling at the chosen poll time and requires a Google credential: https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.gmailtrigger/. The official self-hosted Google OAuth guidance requires a Google Cloud project, Gmail API enablement, consent-screen configuration, a Web OAuth client, and the n8n instance's registered public callback URL: https://docs.n8n.io/integrations/builtin/credentials/google/oauth-generic/. Google also documents a separate Gmail API push path through Cloud Pub/Sub, but that route requires the same OAuth/API authorization plus Pub/Sub topic/subscription configuration and a periodically renewed mailbox watch: https://developers.google.com/workspace/gmail/api/guides/push.

The selected n8n Gmail Trigger approach therefore remains a read-only polling integration rather than a direct Gmail webhook. It cannot be activated without the mailbox owner's Google OAuth authorization; the manual importer remains the active no-credential alternative.

## Scheduled workflow timeout hardening — 12 Aug 2026

- The active Heartbeat task previously recorded one failed callback with `Execution timeout of 30 seconds exceeded`; the recurring task remains the single user-owned `0 30 3 * * *` UTC schedule (09:00 IST).
- `runScheduledCareerWorkflow` now concurrently fetches validated public feeds with an 8-second timeout, processes at most 12 jobs per source and 24 jobs per run, and writes deterministic bilingual reports without inline LLM or owner-notification calls.
- A mocked scheduled-execution test verifies three sources, the 24-job global cap, a persisted Hindi report, source update records, and zero inline LLM/notification calls. The full suite passes **52/52** tests and `pnpm exec tsc --noEmit` passes.
- The timeout-safe code still requires publication and a subsequent Heartbeat callback completion before the live schedule verification item can be closed.

## Connected-service and GitHub access verification — 17 Aug 2026

- The GitHub connector is enabled. `gh auth status` verified an active HTTPS CLI token for `balajirajput96`; no repository, issue, pull request, or account setting was changed during the check.
- Gmail, Google Workspace, n8n, and n8n API connectors are enabled. The Gmail connector has `balajirajput968@gmail.com` listed as a known account, but no Gmail action is authorized or configured in the deployed Career Hub. Google Workspace lists two known accounts, with the `balajirajput968@gmail.com` workspace account agent-authorized.
- Browser verification initially found GitHub signed out. GitHub temporarily returned its “Unicorn / No server is currently available” page on the login route; retrying opened the normal sign-in form. The owner was offered secure browser takeover for password and 2FA entry. Browser login remains optional because the authenticated CLI integration is sufficient for project Git operations.

## Signed recruiter-email webhook contract — 17 Aug 2026

The deployed Career Hub now exposes `POST /api/integrations/n8n/recruiter-email` for an independently authorized, read-only n8n transport. The endpoint accepts raw JSON only and requires the following headers: `X-Career-Timestamp` (Unix milliseconds) and `X-Career-Signature` (`sha256=<hex>` accepted). The signature is an HMAC-SHA256 of the exact string `${timestamp}.${rawJsonBody}` using `RECRUITER_EMAIL_WEBHOOK_SECRET`.

Requests fail closed when the secret is absent, the signature is missing or invalid, the request is older than five minutes, JSON/schema validation fails, or the configured owner cannot be resolved. A validated request may contain up to 100 recruiter events; it has no client-supplied user identifier. The handler always resolves `OWNER_OPEN_ID` server-side, then reuses the existing event-ingestion logic for sender normalization, message-ID deduplication, thread/contact reconciliation, and `unreviewed` status. It has no send, draft, label, delete, application-submit, or message-submit capability.

`pnpm exec tsc --noEmit` passed and the full Vitest suite passed with **58/58 tests across 16 files**, including six webhook-specific tests for a valid signed event, invalid signature, replay protection, malformed sender rejection, missing-secret fail-closed behavior, and a structured JSON 500 response for owner/database failures. The n8n workflow and live delivery remain intentionally blocked until a legitimate shared secret is present in both services and the mailbox owner completes Google OAuth for a read-only Gmail credential. The [n8n Gmail Trigger documentation](https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.gmailtrigger/) confirms this trigger depends on an authorized Gmail credential.

## Live Heartbeat validation — 13–17 Aug 2026

The active task `b7SZZTySnbbX7ewHx3CJwV` completed successfully on five consecutive scheduled executions from 13 through 17 August. Each callback returned HTTP 200 with `status: completed`, checked four public sources, and completed in 5.8–7.3 seconds. This confirms that the published timeout-safe workflow is well within the prior timeout failure mode; the single 12 August timeout predates this published workflow.

Persisted `workflowRuns` and `dailyReports` exist for every successful callback. The current owner schedule is intentionally configured as `en`, so its persisted 17 August report is English and records zero new jobs, zero high-priority matches, zero source errors, and four sources checked. The schedule's high-priority threshold is 80; all newly persisted 13–15 August matches scored 3, 15, 3, and 10, so the observed zero high-priority count is correct. Hindi report generation and report persistence remain covered by the bounded scheduled-workflow regression: a Hindi profile yields a `hi` daily report containing the Hindi manual-approval requirement, while still bypassing inline AI and notifications. Reporting is language-selectable, not an automatic translation of each individual persisted report into two records.

### Scheduler repair and pending Hindi live evidence — 17 Aug 2026

A controlled temporary Hindi-language validation attempt exposed delayed Heartbeat schedule-update propagation: no Hindi callback was dispatched in the requested validation windows. The only delayed callback at 14:45 UTC persisted an English report, because the schedule had already been restored to English before the delayed execution. No external action occurred in any validation attempt.

To remove stale metadata safely, the old task `b7SZZTySnbbX7ewHx3CJwV` was retired only after a replacement task was created and its UID was atomically persisted on the owner schedule. The active task is now `3HB9Jfaqhug4ADmtvrqCGA` (`career-monitor-restored-180001`), enabled with `0 30 3 * * *`, callback `/api/scheduled/career-monitor`, and an expected next execution of `2026-08-18T03:30:00Z` (09:00 IST). The platform registry contains exactly one active task. Its first callback and a real persisted Hindi report are still pending verification.

## n8n read-only handoff

`docs/n8n-readonly-gmail-webhook-setup.md` now provides a reproducible owner-run configuration for Gmail Trigger → minimal event transformation → exact-body HMAC signing → Career Hub webhook delivery. The guide cites current n8n documentation, preserves the existing no-send/no-draft/no-auto-apply boundaries, and documents a concrete owner validation checklist. It intentionally requires a legitimate Gmail OAuth credential and a host-protected shared secret before activation.
