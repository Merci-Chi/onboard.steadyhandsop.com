-- Run in the Supabase SQL Editor for the project used by onboarding.
-- The app uploads user_id/assignment_code-attempt_id.pdf with upsert:false.
-- Keep existing policies; add only owner-and-assignment-scoped permissions.
BEGIN;

UPDATE storage.buckets
SET public = false
WHERE id = 'sh-signed-agreements';

DROP POLICY IF EXISTS sh_agreement_owner_insert_v2 ON storage.objects;
CREATE POLICY sh_agreement_owner_insert_v2
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'sh-signed-agreements'
  AND storage.foldername(name) = ARRAY[(SELECT auth.uid())::text]
  AND storage.extension(name) = 'pdf'
  AND EXISTS (
    SELECT 1
    FROM public.sh_individual_agreement_actions AS a
    WHERE a.user_id = (SELECT auth.uid())
      AND a.status = 'pending'
      AND (
        storage.filename(storage.objects.name) = a.code || '.pdf'
        OR left(storage.filename(storage.objects.name), length(a.code) + 1)
           = a.code || '-'
      )
  )
);

DROP POLICY IF EXISTS sh_agreement_owner_select_v2 ON storage.objects;
CREATE POLICY sh_agreement_owner_select_v2
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'sh-signed-agreements'
  AND storage.foldername(name) = ARRAY[(SELECT auth.uid())::text]
  AND EXISTS (
    SELECT 1
    FROM public.sh_individual_agreement_actions AS a
    WHERE a.user_id = (SELECT auth.uid())
      AND (
        (a.status IN ('signed', 'acknowledged')
         AND a.signed_pdf_path = storage.objects.name)
        OR (
          a.status = 'pending'
          AND storage.extension(storage.objects.name) = 'pdf'
          AND (
            storage.filename(storage.objects.name) = a.code || '.pdf'
            OR left(storage.filename(storage.objects.name), length(a.code) + 1)
               = a.code || '-'
          )
        )
      )
  )
);

COMMIT;
