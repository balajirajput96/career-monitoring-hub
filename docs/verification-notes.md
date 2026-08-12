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
