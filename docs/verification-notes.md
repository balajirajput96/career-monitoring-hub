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
