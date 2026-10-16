-- Matches the deployed sh_guard_agreement_signing definition supplied by the owner.
-- Accept legacy PDFs and immutable retry PDFs belonging to this exact assignment.
-- Existing trigger bindings and completed records are preserved.
BEGIN;

CREATE OR REPLACE FUNCTION public.sh_guard_agreement_signing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  base_path text;
BEGIN
  IF auth.uid() IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Not assigned';
  END IF;
  IF OLD.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Already completed';
  END IF;

  IF NEW.code IS DISTINCT FROM OLD.code
    OR NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.document_key IS DISTINCT FROM OLD.document_key
    OR NEW.issued_at IS DISTINCT FROM OLD.issued_at
    OR NEW.assigned_email IS DISTINCT FROM OLD.assigned_email
    OR NEW.associate_name IS DISTINCT FROM OLD.associate_name
    OR NEW.effective_date IS DISTINCT FROM OLD.effective_date
    OR NEW.work_location IS DISTINCT FROM OLD.work_location
  THEN
    RAISE EXCEPTION 'Immutable assignment details';
  END IF;

  base_path := OLD.user_id::text || '/' || OLD.code;
  IF NEW.terms_accepted IS NOT TRUE
    OR nullif(trim(NEW.signature_name), '') IS NULL
    OR NEW.signature_date IS NULL
    OR NOT coalesce(
      NEW.signed_pdf_path = base_path || '.pdf'
      OR (
        left(NEW.signed_pdf_path, length(base_path) + 1) = base_path || '-'
        AND substr(NEW.signed_pdf_path, length(base_path) + 2)
          ~ '^([0-9a-f]{32}|[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12})[.]pdf$'
      ), false
    )
  THEN
    RAISE EXCEPTION 'Completed document and signer details required';
  END IF;

  IF OLD.document_key IN ('manager-10', 'manager-20') THEN
    IF NEW.status IS DISTINCT FROM 'acknowledged'
      OR NEW.signature_png IS NOT NULL THEN
      RAISE EXCEPTION 'Manager acknowledgment only';
    END IF;
  ELSE
    IF NEW.status IS DISTINCT FROM 'signed'
      OR NEW.signature_png IS NULL
      OR NEW.signature_png NOT LIKE 'data:image/png;base64,%' THEN
      RAISE EXCEPTION 'Drawn signature required';
    END IF;
  END IF;

  NEW.signed_at = now();
  RETURN NEW;
END;
$function$;

COMMIT;
