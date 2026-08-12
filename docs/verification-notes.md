# Verification notes

The dashboard dev server is running and TypeScript reports no errors after the profile-field, preferred-track, source-validation, and workflow-language changes. Vitest passes 4 files and 10 tests.

The desktop capture showed the dashboard loading shell/skeleton at 1280x720. The mobile capture at 375x812 rendered the branded Career Intelligence System dashboard without horizontal overflow; the command-center header, high-priority matches, tracked applications, and verified-source prompt were readable and stacked responsively.

The older transform-error line in the log predates the latest restart; the current dev-server output reports a clean restart and no TypeScript errors.

## Latest verification

The dashboard rendered successfully at desktop 1280x720 and mobile 390x844. The mobile capture showed vertically stacked content with no horizontal overflow; profile, source, schedule, approvals, application tracker, and recruiter sections remained reachable. The application tracker now exposes status, saved resume selection, follow-up date, notes, and cover-note draft context. The recruiter panel remains signal-only and has no send-message action.

`pnpm check` passes. `pnpm test -- --run` passes with 5 test files and 20 tests. Tests cover cron-only access, orphan schedules, structured scheduled failures, report eligibility, review-only approval policy, duplicate applied-submission policy, verified facts, resume context, bilingual language precedence, cover-note safety, and public Greenhouse/Lever endpoint validation.

No public Greenhouse or Lever feed was added in this session, so recurring discovery should remain inactive until the owner supplies and verifies a legitimate source endpoint for the configured tracks.
