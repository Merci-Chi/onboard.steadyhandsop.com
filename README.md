# Steady Hands LLC — Team Onboarding

Static website for `onboarding.steadyhandsop.com`, designed to match the Steady Hands client portal login.

## Pages
- Welcome to Steady Hands
- Personal Information (legal name, DOB, phone, email, address, position)
- Employment Agreement (orientation acknowledgement draft — **not** a substitute for a real employee agreement)
- Emergency Contact
- Training & Resources
- Onboarding Complete

Only **Sales Associate** and **Marketing Director** are available to select. Other positions appear disabled as **Role full**.

## Publishing
1. Upload the **contents** of this folder into a new GitHub Pages repository.
2. Enable GitHub Pages for the main branch and set the custom domain to `onboarding.steadyhandsop.com`.
3. Point the subdomain DNS CNAME to `merci-chi.github.io`.
4. Under Supabase Authentication > URL Configuration, permit `https://onboarding.steadyhandsop.com/index.html` and `https://onboarding.steadyhandsop.com/reset-password.html` as redirect URLs.
5. Verify Supabase Auth sign-up, sign-in, password recovery, logout, and onboarding progress over HTTPS.

## Important production notes
- This starter stores onboarding progress and entered profile data in Supabase Auth **user metadata** for continuity. User metadata is self-editable and is **not appropriate as authoritative employment records, a secure HR database, or a tamper-resistant signed agreement log**. Before accepting real hires, move sensitive fields (particularly DOB and emergency contacts) into a securely protected, role-restricted HR backend with appropriate retention and deletion policies. Do not use this site to collect IDs or SSNs.
- No background check or identity document upload is included, as requested.
- The agreement page is a clearly labeled **orientation acknowledgement draft** only. Provide each hire an individualized, reviewed employment offer/agreement and separately complete required employment, payroll, and work-authorization forms as applicable.
- Finishing automatically saves `steadyhands_onboarding.complete=true` within the signed-in user's metadata. It **does not** provision CRM/dashboard roles or user permissions. An administrator-controlled backend must independently verify completion before granting access.
- Roles shown as full are disabled in the UI; real role eligibility and opening limits must be enforced server-side before production hiring.
- For local testing, serve through a local HTTP server (e.g. `python3 -m http.server 8000`), rather than using `file://` URLs, because the site uses JavaScript modules and Supabase authentication.

All six provided visual assets are in `images/`. No GitHub repository or live site is changed by this ZIP.

### Required fields and validation
Required fields display red asterisks. Navigating Back and Next continues to save drafts without requiring completion. On final submission, users are taken to the first unfinished section, with specific missing/invalid fields highlighted and explained.

## Role-specific onboarding update

This build has five steps: Welcome, Personal Information, Employment Agreement, Training & Resources, Complete. Emergency Contact is removed. The onboarding site does not request SSNs or perform a background check.

Open roles: Sales Associate (with 2-week paid trial or regular Sales Associate draft acknowledgement) and Marketing Director. Other roles are visible but disabled and labeled Unavailable.

The agreement text is a *draft orientation acknowledgement*, not a finalized binding employment contract. Confirm individual offer details and applicable employment/payroll requirements before using with new hires. Compensation is prefilled only for the previously specified sales trial ($12/hour, $30 per qualifying sale and 20 hours/week); all regular Sales Associate and Marketing Director pay terms remain unspecified.
