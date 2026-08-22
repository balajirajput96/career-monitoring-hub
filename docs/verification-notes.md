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


## No-cost Gmail bridge decision and runtime recovery — 17 Aug 2026

Paid Render persistence was declined. The safe no-cost decision is to retain the existing Career Hub manual recruiter-email importer and provide an owner-run Google Apps Script template for optional read-only Gmail polling. The template does not store credentials in Career Hub, does not send or draft mail, and posts only minimized recruiter-event fields through the signed webhook after owner authorization. n8n remains inactive on Render Free because its owner/workflow state is lost on redeploy without a persistent disk.

After rollback and restart, the latest `devserver.log` entries show normal OAuth initialization and `Server running on http://localhost:3000/` with no current `ERR_MODULE_NOT_FOUND`; the earlier webhook error is historical. TypeScript reports zero errors and the full Vitest suite remains 58/58. The baseline-browser-mapping notice is a dependency freshness warning, not an application runtime failure.


## Replacement Heartbeat pre-execution check — 17 Aug 2026 18:39 UTC

The platform registry currently contains exactly one enabled replacement task: `3HB9Jfaqhug4ADmtvrqCGA`, callback `/api/scheduled/career-monitor`, cron `0 30 3 * * *`, and next execution `2026-08-18T03:30:00Z`. The task has no runs yet because the current UTC time is `2026-08-17T18:39:18Z`; this is before the scheduled execution. The stale metadata repair is therefore complete, while first-callback and persisted Hindi-report verification remain open.


## Post-callback agent verification scheduling — 17 Aug 2026

The current-task schedule registry is empty. A one-time verification schedule was not created because the schedule service returned `failed_precondition: project not deployed yet`, despite the WebDev project having a published checkpoint. No retry was issued against the same failing operation, and no existing Heartbeat task or production schedule was changed. The replacement Heartbeat remains the sole production verifier; its first callback must be checked in a later session after `2026-08-18T03:30:00Z`.

## Code and dependency security remediation — 17 Aug 2026

The project was audited after the code/runtime recovery. All critical and high local dependency advisories were remediated with compatible, lockfile-backed upgrades and workspace overrides. The toolchain now uses Vite `7.3.6`, Vitest `4.1.10`, `@vitejs/plugin-react` `5.2.0`, matching `@trpc/*` `11.18.0` packages, Drizzle ORM `0.45.2`, Drizzle Kit `0.31.10`, and Express `4.22.2`. The obsolete JSX-location debug plugin was removed because its published peer range did not support the current Vite line. Vitest configuration now explicitly registers the React transform, keeping TSX component tests compatible after the test-runner upgrade.

`pnpm install --frozen-lockfile --ignore-scripts`, `pnpm run check`, `pnpm test`, and `pnpm run build` completed successfully. The suite passes **58/58 tests in 16 files**. A fresh development-server restart returned HTTP `200` from `http://127.0.0.1:3000/`; the current log ends with OAuth initialization and `Server running on http://localhost:3000/`. The historical `ERR_MODULE_NOT_FOUND` entry predates this restart and did not recur.

The final local audit reports **0 critical, 0 high, 0 low, and 1 moderate** advisory. The remaining advisory is the legacy `esbuild@0.18.20` bundled beneath Drizzle Kit's deprecated `@esbuild-kit/esm-loader` → `@esbuild-kit/core-utils` development-only chain. The current Drizzle Kit release (`0.31.10`) still pins that transitive dependency to `~0.18.20`; scoped resolution attempts did not replace the upstream-pinned package. This code is not part of the deployed client/server runtime, and Drizzle Kit's CLI version command succeeds. It remains documented rather than hidden until its upstream replaces the deprecated loader chain.

## GitHub Actions CI — 17 Aug 2026

GitHub Actions CI now runs on every push and pull request targeting `main`. The workflow uses the repository's pinned pnpm package-manager metadata and executes frozen installation, TypeScript type-checking, the full Vitest suite, a production build, and a critical/high advisory gate. Hosted run [`32059380143`](https://github.com/balajirajput96/career-monitoring-hub/actions/runs/32059380143) completed successfully for commit `380d709`, including all five validation stages. The first two CI runs exposed only workflow bootstrap configuration mistakes (pnpm setup/cache ordering and duplicated version declarations); both were fixed, then validated by the successful third run.

## Deployed database contract repair — 17 Aug 2026

The deployed database had legacy physical names (`jobSourceType`, `jobTrack`) while runtime Drizzle queries expected the declared `sourceType` and `track` columns. This caused `career.overview` source reads to return HTTP 500 for affected signed-in sessions. The repair preserved all existing rows and non-destructively renamed the `jobSources` columns, then reconciled the journalled migration for the `jobListings.track` column and related index. Drizzle now explicitly maps each enum field to the physical names declared by the schema.

The repaired database retains the four active verified public sources and the active owner schedule. A fresh browser request to `career.overview` returned HTTP 200 without a legacy-column query error. The visible preview has zero sources because it is signed in as a separate admin account (Dilip Singh); the configured monitor, profile, sources, and schedule remain owned by Balaji Rajput (user 180001), and no cross-user data move was made. Owner-session browser verification remains pending legitimate access to that account.

The regression suite now contains an explicit physical-column mapping assertion and passes **59/59 tests across 16 files**. TypeScript, the production build, and the critical/high audit gate also pass after the repair; the already-documented dev-only moderate Drizzle/esbuild advisory remains unchanged.

## One-time scheduled discovery verification — 18 Aug 2026

Before the next platform-owned 09:00 IST callback, the existing bounded, review-only scheduled workflow was invoked once through its internal entrypoint for the configured owner schedule (`id=30001`). The run completed in roughly four seconds and persisted workflow run `210001` with `status: completed`, no error, four sources checked, zero source errors, and zero new jobs. It also persisted the corresponding English daily report for `2026-08-18` and updated the schedule's `lastRunAt` timestamp. No application, recruiter message, or email was submitted.

The verification initially queried the physical SQL column as `status`; inspection confirmed this was a query mistake, not an application defect. The existing `workflowRunStatusEnum` correctly maps the TypeScript `workflowRuns.status` property to the deployed `workflowRunStatus` column. A regression assertion now covers that mapping. The full local validation passes **59/59 tests**, TypeScript, the production build, and the high/critical audit gate; only the separately documented dev-only moderate Drizzle/esbuild advisory remains.

## Final GitHub sync and rebase check — 18 Aug 2026

The verified scheduled-workflow contract commit [`a00fa00`](https://github.com/balajirajput96/career-monitoring-hub/commit/a00fa00577c6f2b008826d23160f815dfcb1bb8c) was pushed to private GitHub `main` after GitHub CLI reauthorization. Hosted CI run [`32086098584`](https://github.com/balajirajput96/career-monitoring-hub/actions/runs/32086098584) completed successfully: frozen install, type-checking, **59/59** tests, production build, and the high/critical audit gate all passed.

The subsequent final checklist commit [`12d05f1`](https://github.com/balajirajput96/career-monitoring-hub/commit/12d05f1ea0ea4ceb97139fd62813743d7daa318f) was also pushed. A fresh fetch reported GitHub/main parity of `0 0`; the preserved backup branch remained untouched. `git rebase github/main` was a clean no-op because GitHub had zero upstream-only commits, so remote history was not rewritten. Hosted CI run [`32086275097`](https://github.com/balajirajput96/career-monitoring-hub/actions/runs/32086275097) completed successfully for the final checklist commit.

## Read-only inbox event import — 18 Aug 2026

The configured Gmail connector was queried read-only for incoming recruiter correspondence. Two verified inbound replies were persisted for Balaji Rajput (`userId=180001`) as internal, **unreviewed** recruiter-email events: Skant HR's CTC question and Rivpra Formulation's acknowledgement/form request. Each event retains the Gmail message and thread identifiers, has no matched contact, and requires manual **reviewed** or **ignored** action in the dashboard. Outbound applications and the Hetero delivery-failure notice were deliberately excluded to avoid false recruiter contacts. No email was sent, drafted, altered, or deleted.

## Fresh repository audit, safe rebase, and regression validation — 18 Aug 2026

The authenticated GitHub CLI was verified for `balajirajput96`, and the local `main` branch was found one compatible commit behind `github/main`. Before synchronization, a local safety branch, `backup/pre-remediation-audit-20260818`, was created at the previously validated checkpoint commit. The working-tree checklist update was stashed, `git rebase github/main` completed cleanly, and the change was restored without conflict. No remote history was rewritten.

The rebased project passed `pnpm install --frozen-lockfile`, `pnpm run check`, and the full Vitest suite: **59/59 tests across 16 files**. A production build completed successfully, the development runtime returned HTTP `200`, and the high/critical audit gate passed. The audit continues to report the already documented single moderate, development-only Drizzle Kit / deprecated esbuild-loader transitive advisory; no safe supported override replaces that upstream-pinned chain. The branch was at `0 0` divergence with `github/main` immediately before recording this evidence.

The evidence commit [`5241663`](https://github.com/balajirajput96/career-monitoring-hub/commit/524166335e38ac58d64ea2da873eadc2bc9f6795) was pushed to private GitHub `main`. Hosted CI run [`32090977647`](https://github.com/balajirajput96/career-monitoring-hub/actions/runs/32090977647) completed successfully, including locked installation, TypeScript checking, all 59 tests, production bundle generation, and the high/critical dependency gate.

## Replacement Heartbeat first-callback verification — 18 Aug 2026

The replacement task `3HB9Jfaqhug4ADmtvrqCGA` completed its first platform-dispatched callback successfully. Heartbeat run `icDnMM6caNMh7yiS92qNb9` started at `2026-08-18T03:38:24Z` (09:08:24 IST), finished in **3,117 ms**, returned HTTP **200**, and reported `status: completed`; it was not manually triggered. The delayed start relative to the nominal 09:00 IST cron is platform dispatch timing, not a workflow timeout or failure.

The callback persisted workflow run `240001` and its linked daily report `240001`. Both records show four sources checked, zero source errors, zero high-priority matches, and zero new jobs. The real report language is `en`, matching the current schedule configuration, and has non-empty content (188 characters). No external application, recruiter message, or email submission was made; the workflow remains discovery and manual-review only. A real Hindi-language callback remains separately open because no production schedule language change was made for this English run.

Post-callback validation completed successfully: `pnpm run check`, the full **59/59** Vitest suite, and the production build all passed. The high/critical audit gate also passed; the only reported advisory remains the documented development-only moderate Drizzle Kit legacy esbuild-loader dependency.

The callback-evidence commit [`76e16f0`](https://github.com/balajirajput96/career-monitoring-hub/commit/76e16f00b8228ac612f69bf5a402246ccb086050) was accepted by hosted CI run [`32096421828`](https://github.com/balajirajput96/career-monitoring-hub/actions/runs/32096421828), which completed successfully with the locked-install, TypeScript, test, production-build, and high/critical-audit stages.

## Always-bilingual daily reports — 18 Aug 2026

Migration `0005_messy_blonde_phantom.sql` added nullable `contentEnglish` and `contentHindi` fields to the persisted `dailyReports` contract without modifying existing report rows. Every newly completed or skipped scheduled workflow now constructs both deterministic summaries, stores the configured primary language in the existing `content` field, and stores both English and Hindi forms alongside it. The dashboard renders both language sections for newly bilingual reports while preserving backward-compatible rendering for earlier single-language reports.

The persisted behavior was verified with bounded review-only workflow run `270001` against the owner’s configured public Greenhouse/Lever feeds. The run completed successfully with four sources checked, zero source errors, and zero new jobs. Daily report `270001` uses English as its configured primary language (188 characters) and also persists Hindi content (158 characters). The verification did not submit an application, send a message, create an email draft, or alter any external account.

The code change passed `pnpm run check`, **61/61** Vitest assertions across 16 files, and a production build. The rendered dashboard was also visually checked; it correctly displays the signed-in session’s data, and therefore the current non-owner browser session continues to show its own empty dashboard rather than Balaji Rajput’s private records.

## Platform-scheduled bilingual report verification — 19 Aug 2026

Persisted workflow run `300001` for `userId=180001` has trigger type `schedule`, started at `2026-08-19 03:34:02` UTC (09:04:02 IST), completed one second later, and linked daily report `300001` for `2026-08-19`. The run completed successfully after checking four verified public sources: **2** new opportunities, **0** high-priority matches, and **0** source errors. The zero high-priority count is the persisted result at the existing configured threshold; no threshold was changed.

The linked report has configured primary language `en` with a non-empty primary/English summary of **188 characters** and a non-empty Hindi summary of **158 characters**. This confirms the published always-bilingual persistence path is active on a real scheduled run, rather than only on a local or manually invoked verification. The workflow did not submit an application, send or draft an email, send a recruiter message, modify the schedule, or bypass authentication.

Task-level Heartbeat evidence was subsequently retrieved read-only for `3HB9Jfaqhug4ADmtvrqCGA`: run `SyrmCRR7Cu9rSxQA7uPfWK` was scheduled and started at `2026-08-19T03:33:56Z`, finished at `2026-08-19T03:34:03Z` in **6,677 ms**, returned HTTP **200**, had `status: success`, and was not manually triggered. Its response confirms the same persisted statistics—two new jobs, zero high-priority matches, zero source errors, and four sources checked—thereby linking this task execution to workflow run/report `300001` by timestamp and exact outcome. The latest task metadata lists the next primary run for `2026-08-20T03:30:00Z` (09:00 IST). The associated one-time verifier was observed as paused after its scheduled observation window; it was neither retried nor modified, consistent with the read-only verification boundary.

After collecting this evidence, the practical validation suite passed again: TypeScript completed without errors, **61/61** Vitest tests across 16 files passed, and the production build completed. The high/critical dependency audit gate passed; its only remaining finding is the documented moderate development-only transitive advisory.

The existing one-time post-callback verifier `VRAoDCLjaeUeaW3dFez5PY` was rescheduled for 19 Aug 2026 at 09:15 IST, after the next 09:00 IST production callback. It will only inspect the Heartbeat log and persisted report fields, confirm non-empty English and Hindi content, and report verified results. It explicitly must not change schedules, send mail, create drafts, submit applications, send messages, or bypass authentication; it expires at 10:00 IST.

## GitHub re-authorization and synchronized CI — 20 Aug 2026

GitHub CLI was re-authorized for `balajirajput96` through the account's approved GitHub Mobile sudo-mode challenge. Before synchronization, the repository was fetched and reviewed: GitHub `main` contained one compatible analytics-loading fix (`d88a4ab`) while the validated local scheduled-callback evidence commit was one commit ahead. A local safety branch, `backup/pre-sync-20260820`, was created, the uncommitted checklist change was stashed, and the evidence commit was rebased cleanly without rewriting remote history. The checklist was then restored unchanged.

The rebased evidence commit `84cf97e4dfe80d6c2ebdcefeb96dcf61b58b9cc4` was pushed to private GitHub `main`. Local validation after the rebase passed TypeScript checking, **61/61** Vitest tests across 16 files, and the production build. The high/critical audit gate passed; the only remaining finding is the already documented moderate development-only upstream advisory. Hosted GitHub Actions CI run [`32411433462`](https://github.com/balajirajput96/career-monitoring-hub/actions/runs/32411433462) completed successfully for the same commit.

## Read-only operations inventory and maintenance boundary — 20 Aug 2026

A read-only inventory confirmed that private GitHub `main` and the local checked-out commit `84cf97e4dfe80d6c2ebdcefeb96dcf61b58b9cc4` were fully synchronized (`0` remote-only and `0` local-only commits), and the active GitHub CLI identity is `balajirajput96`. No authentication token, cookie, private inbox content, recruiter message, or unrelated repository data was retained in the inventory.

Exactly one enabled project-level scheduled task was present: `career-monitor-restored-180001` (`3HB9Jfaqhug4ADmtvrqCGA`). It posts to `/api/scheduled/career-monitor` under the UTC cron expression `0 30 3 * * *`, which is 09:00 IST daily. Its latest recorded execution began at `2026-08-20T03:37:36Z`, and its next scheduled execution is `2026-08-21T03:30:00Z`. The task description explicitly retains public-feed discovery and manual review before every external action.

The durable maintenance runbook is now captured in [`maintenance-runbook.md`](./maintenance-runbook.md). It documents the existing bounded callback envelope, current recovery flow, review-only application/message boundary, code-validation controls, and restriction against high-frequency full-agent polling. Its companion regression assertion verifies the fixed execution limits and confirms that scheduled work remains review-only.

## Published dashboard account-scope check — 21 Aug 2026

The published dashboard was opened through the available Manus session for **balaji dilip** (`balajidilip930@gmail.com`) and inspected read-only. This account displays the verified profile facts (Diploma in Biotechnology and two years of Quality Officer / pharmaceutical QA experience) but has **0 active sources**, an inactive default schedule, no reports, and no workflow history. This does not match the separately persisted monitored data previously verified for Balaji Rajput's owner-scoped record (including four sources and the enabled Heartbeat task).

No source, schedule, profile, report, application, or user ownership field was changed. The live owner-dashboard reconciliation remains blocked until the exact account that owns the persisted Career Hub data is selected in Manus OAuth; it must not be resolved by copying or moving data between accounts.

### Minimal database ownership confirmation

A read-only database audit then confirmed the separation. **Balaji Rajput** (user `180001`, `balajirajput968@gmail.com`) owns a candidate profile, **four active public sources**, and the enabled daily task `3HB9Jfaqhug4ADmtvrqCGA`. The current published-dashboard session, **balaji dilip** (user `3540001`, `balajidilip930@gmail.com`), has a profile but zero active sources and no schedule. The separate Dilip Singh administrator account likewise has no active schedule or sources. This confirmation is recorded only to target the correct owner session; it is not authorization to merge, transfer, or duplicate account-scoped data.

The separate `balaji dilip` session was signed out at the owner's direction. The Career Hub then opened the normal Manus OAuth authorization URL, but the sandbox browser remained on a blank loading state rather than rendering an email field. No owner email, password, OTP, or other credential was entered. Completing the exact-owner dashboard verification now requires the owner to take over the already-open Manus login page and sign in as `balajirajput968@gmail.com`.

### Owner role reconciliation

At the owner's explicit request, the uniquely verified Balaji Rajput record (user `180001`, `balajirajput968@gmail.com`) was promoted from `user` to `admin`. The database read-back confirmed the exact intended record and new role. No schedule, job source, listing, report, application, recruiter contact, email event, approval request, or other owner-scoped data was updated, copied, reassigned, or deleted.

### Post-promotion data verification

A second read-only aggregate query verified the promoted record retains an enabled `0 30 3 * * *` schedule in `Asia/Kolkata`, four active public sources, and four persisted reports with both English and Hindi content. It also reported zero application rows in `applied` state and zero approval requests in `executed` state. The schedule code retains a fixed public Greenhouse/Lever-only, time-bounded discovery envelope and stores opportunities for review; it contains no scheduled application or message executor.

The browser still displayed the published sign-in landing page after the owner-login handoff, so the owner-specific dashboard presentation itself has not been verified in a browser session. No data-changing workaround has been attempted. The remaining step is to complete Manus OAuth for `balajirajput968@gmail.com` in the open browser page, then reopen the dashboard and compare it against the already verified database state.

### Regression and build validation — 22 Aug 2026

The status-column contract test now explicitly asserts the persisted `applicationStatus`, `approvalAction`, and `approvalStatus` mappings used by the review-first application flow. The complete validation gate passed TypeScript checking, **63/63** Vitest tests across 16 files, and the production build. The dependency audit reported no high or critical findings; the known moderate development-only Drizzle/esbuild transitive advisory remains unchanged. The production bundle emitted a chunk-size recommendation only, not a build failure.
