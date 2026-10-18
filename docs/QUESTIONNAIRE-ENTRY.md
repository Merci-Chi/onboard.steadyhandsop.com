# Action Needed questionnaire entry

The legacy `/actions/hEi269a/` URL shown in the reported screenshot now opens
only the assigned one-question-at-a-time popup questionnaire. Its old PDF,
signature, notice-download, document-storage and signing-RPC code has been
removed from index.html and action.js. Existing stored records are not deleted.

The actions dashboard now reads `outreach_action_assignments`, scoped to the
signed-in Supabase Auth user, instead of using `sh_associate_pause` and its
PDF completion fields. Assigned records open the popup; completed records
show completion; unassigned accounts cannot begin. Cancellation is respected.

The entry uses this site's existing Supabase client and session. It opens the
popup on this domain without redirecting to a separate signing page or requiring
another site's sign-in. The popup and API assets in `actions/questionnaire/`
match the popup implementation in `Merci-Chi/outreach.steadyhandsop.com`.
If that canonical implementation changes, synchronize these four local assets.

Uses the same existing assigned-action and phone-answer migrations as Outreach
and Admin. This entry-point correction requires no additional SQL and creates
no assignments automatically. Answers go to the existing protected submission
RPC and appear in the same Admin outcomes. No PDF is created or downloaded.

Checks: `node --test tests/action-needed.test.mjs tests/questionnaire-entry.test.mjs`.
The popup component itself is also covered by the Outreach questionnaire tests.
