# Enable compact login tokens

The website includes automatic refresh of oversized sessions and prevents oversized credentials from being sent to data/storage endpoints. **The server hook below must be enabled to actually issue smaller tokens.** Browser code cannot rewrite a signed JWT.

## Apply to the existing Supabase project

1. Open the project's SQL Editor and run `compact-token-hook.sql`.
2. Open **Authentication > Hooks > Custom Access Token**, choose the Postgres function `public.sh_compact_access_token_hook`, and enable it. If a hook already exists, incorporate this filtering into that hook so its existing claims and authorization behavior are preserved.
3. Refresh the website. A large existing session will request a fresh token automatically. If necessary, sign in again.
4. Verify the access token size is below 6,000 bytes without copying, sharing or logging the token itself. Test the affected users as well as a fresh test user.

The hook excludes only `steadyhands_onboarding` and `steadyhands_training` from JWT user metadata. It does **not** delete those records from the account, delete old signatures, remove app metadata, change roles, or edit signed agreements. Existing issued tokens are unchanged until refreshed. Other unusually large claims may still require separate investigation.

## Agreement storage checks

The signing client writes an immutable PDF to `sh-signed-agreements/<user_id>/<assignment_code>-<attempt_uuid>.pdf` and records that exact path on the assignment. Confirm the existing storage policies permit the assigned user to upload/read that path. Do not make the bucket public or grant broad access as a workaround. The assignment update still requires its matching user ID and pending status.

The client preserves an uploaded PDF across same-page retries, checks current assignment status before signing, and handles a lost success response by re-reading the completed record. Existing completed agreements remain unchanged. A missing assignment, incorrect associate name, revoked action, storage-policy rejection, or database restriction requires administrator correction; retrying does not bypass it.

## Verification

Run `node --test tests/agreement-reliability.test.mjs` for the deterministic recovery and submission tests. Tests simulate service responses; they do not establish the production policies or actual device behavior.

After enabling the hook, use a designated test assignment to verify sign-in, PDF display, drawn signature, submission, reload, and signed-PDF download on iPhone Safari, Android Chrome, and desktop. Also retry after a temporary disconnect. Do not use an employee's production agreement for a test signature.

The older `/actions/hEi269a/` implementation was not changed.
