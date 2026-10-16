-- Read-only diagnostics. Return function definitions and unique indexes,
-- not associate names, signatures, signed files, or account records.
SELECT
  'completion validation' AS item,
  p.oid::regprocedure::text AS name,
  pg_get_functiondef(p.oid) AS definition
FROM pg_proc AS p
JOIN pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND (
    p.prosrc ILIKE '%Completed document and signer details required%'
    OR p.oid IN (
      SELECT t.tgfoid
      FROM pg_trigger AS t
      WHERE t.tgrelid = 'public.sh_individual_agreement_actions'::regclass
        AND NOT t.tgisinternal
    )
  )
UNION ALL
SELECT 'unique index', indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'sh_individual_agreement_actions'
  AND indexdef ILIKE '%UNIQUE%';
