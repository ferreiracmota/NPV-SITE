-- NPV | Historico de cargas: depois de salvo, registro nao pode ser
-- sobrescrito pela aluna. Preserva 100% dos registros existentes e a
-- exclusao explicita ja disponibilizada no Clube (com confirmacao).
-- As restricoes de proprietario/conta aprovada e RLS atuais permanecem.
drop policy if exists clube_training_load_owner_update
  on public.clube_training_load_entries;

revoke update on public.clube_training_load_entries from authenticated;

-- Uma insercao concorrente na mesma data/exercicio ja e bloqueada
-- por unique(student_id, exercise_slug, recorded_on).
-- Administradores tecnicos continuam sujeitos aos privilegios de servidor.
