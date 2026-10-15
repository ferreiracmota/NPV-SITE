-- Reserva PRIVADA do administrador principal do Clube NPV.
-- Esta etapa não concede acesso nem cria conta/senha.
-- Liberação exige conta real e email_confirmed_at preenchido no Supabase Auth.
create schema if not exists clube_private;
revoke all on schema clube_private from public, anon, authenticated;
create table if not exists clube_private.pending_admin_emails (
  email text primary key,
  registered_at timestamptz not null default now(),
  promoted_at timestamptz
);
revoke all on clube_private.pending_admin_emails from public, anon, authenticated;
insert into clube_private.pending_admin_emails(email)
values ('ferreiracmota@gmail.com')
on conflict (email) do nothing;
-- A promoção será uma ação administrativa separada após confirmação de email.
-- Conferir em auth.users:
-- select id, email, email_confirmed_at from auth.users
-- where lower(email) = lower('ferreiracmota@gmail.com');
-- Somente após isso:
-- insert into public.clube_admins(user_id)
-- select u.id from auth.users u
-- join clube_private.pending_admin_emails r on lower(u.email)=lower(r.email)
-- where u.email_confirmed_at is not null
-- on conflict (user_id) do nothing;
