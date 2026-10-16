-- Ajustes de segurança posteriores à criação do banco (15/10/2026).
-- Revoke explicit Supabase API privileges for unauthenticated users.
-- PUBLIC revocation alone is insufficient because Supabase may grant anon
-- directly via default privileges.
revoke execute on function public.clube_is_admin() from public, anon;
revoke execute on function public.clube_member_approved() from public, anon;
revoke execute on function public.clube_new_auth_user() from public, anon, authenticated;
revoke execute on function public.clube_award_points(uuid,text,integer,text) from public, anon;
revoke execute on function public.clube_request_redemption(uuid) from public, anon;
revoke execute on function public.clube_resolve_redemption(uuid,boolean) from public, anon;

-- Regrant only the precisely intended browser RPCs to authenticated sessions.
grant execute on function public.clube_is_admin() to authenticated;
grant execute on function public.clube_member_approved() to authenticated;
grant execute on function public.clube_award_points(uuid,text,integer,text) to authenticated;
grant execute on function public.clube_request_redemption(uuid) to authenticated;
grant execute on function public.clube_resolve_redemption(uuid,boolean) to authenticated;

-- Foreign key coverage for higher-volume audit and redemption tables.
create index if not exists clube_point_events_performed_by_idx on public.clube_point_events(performed_by);
create index if not exists clube_redemptions_resolved_by_idx on public.clube_redemptions(resolved_by);
create index if not exists clube_redemptions_reward_idx on public.clube_redemptions(reward_id);
