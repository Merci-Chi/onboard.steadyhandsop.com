STEADY HANDS — INDIVIDUAL AGREEMENT ACTIONS

Upload only the paths included here to the root of Merci-Chi/onboard.steadyhandsop.com.
Includes 404.html to route GitHub Pages friendly links /agreements/<random-code>
back to agreements/index.html?code=<random-code>. If your site already has
404.html with special behavior, merge the agreement routing instead of replacing it.

1. Run AGREEMENTS_SETUP.sql in Supabase project glonbvrcudwuzjundrii once.
2. Make sure employees have a Supabase Auth account and know their password.
3. Issue a code using SQL example at the bottom of AGREEMENTS_SETUP.sql.
   Choose exactly one document_key:
   trial-hourly, trial-commission, hourly-10, hourly-20, commission.
4. Email the individual link https://onboard.steadyhandsop.com/agreements/<code>
5. User signs in with their Outreach account and signs the original PDF.
   The saved PDF appends a signed certificate page without modifying agreement terms.
6. Admin checks public.sh_individual_agreement_actions status='signed', signed_at,
   signed_pdf_path. The private storage bucket holds the document.

IMPORTANT: GitHub files are public, but names/signatures/PDFs of signed users stay
in authenticated Supabase. The random code is a locator, NOT authentication.
Do not give the public storage bucket access. Assign only through admin SQL.

Existing onboarding pages and the prior actions/hEi269a page are not modified.
This package is an implementation and should be tested with a test account before real agreements.
