-- Migration already applied in Supabase on 2026-10-30.
-- Keeps all existing templates intact and inserts a disabled preparation-only ex-student model.
alter table public.clube_email_templates drop constraint clube_email_templates_key_check;
alter table public.clube_email_templates add constraint clube_email_templates_key_check
 check (key in ('reward_unlocked','new_reward','challenge_completed','birthday','birthday_inactive','renewal','referral'));
insert into public.clube_email_templates
 (key,name,enabled,subject,headline,body,button_label,active_since)
values
 ('birthday_inactive','Aniversário — Ex-aluna',false,
 'Feliz aniversário, {{primeiro_nome}}! 💚',
 'Um novo ciclo cheio de conquistas!',
 E'Oi, {{primeiro_nome}}! 💚\n\nPassando para desejar um aniversário especial e um novo ciclo cheio de saúde, movimento e conquistas. Foi muito bom ter você com a gente e seguimos torcendo por você!\n\nCom carinho, equipe Não Pense, Vai! ✈️',
 'Visitar nosso site',now())
on conflict (key) do nothing;
-- Activation is forbidden in app backend until subscription and email consent are implemented.
