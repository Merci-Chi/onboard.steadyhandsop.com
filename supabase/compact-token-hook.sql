-- Run in the existing project's SQL Editor, then enable this function in
-- Authentication > Hooks > Custom Access Token. If another hook is configured,
-- merge the claim filtering into that hook instead of replacing its behavior.
-- No signatures, employee records, or metadata are deleted by this migration.
-- App metadata, roles, MFA and all unrelated claims remain unchanged.
begin;
create or replace function public.sh_compact_access_token_hook(event jsonb)
returns jsonb language plpgsql stable set search_path = '' as $$
declare claims jsonb := event->'claims'; meta jsonb;
begin
 meta := coalesce(claims->'user_metadata','{}'::jsonb);
 if jsonb_typeof(meta) = 'object' then
  meta := meta - 'steadyhands_onboarding' - 'steadyhands_training';
  claims := jsonb_set(claims,'{user_metadata}',meta);
 end if;
 return jsonb_build_object('claims',claims);
end;
$$;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.sh_compact_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.sh_compact_access_token_hook(jsonb) from public,anon,authenticated;
commit;
-- Existing sessions need a refresh or new sign-in after the hook is enabled.
-- Diagnose sizes without selecting personal information or token contents:
-- select id, octet_length(raw_user_meta_data::text) as metadata_bytes
-- from auth.users order by metadata_bytes desc;
