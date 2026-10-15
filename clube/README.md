# Clube NPV — homologação e ativação segura

## Situação atual
Projeto desenvolvido em `feat/clube-npv-piloto-2026-10`, PR #3 **rascunho**,
sem alteração do site principal em `main`.

- **Sem configuração Supabase:** `/clube` mostra o protótipo com alunos e pontos
  fictícios. As alterações ficam SOMENTE no localStorage do navegador.
- **Com as duas variáveis Supabase configuradas:** `/clube` mostra login real
  de e-mail/senha, recuperação de senha e área de membro/administrador com dados
  protegidos por RLS. Nunca compartilhar as chaves secretas na aplicação.
- Para ver apenas o protótipo em prévia, usar `/clube?demo=1`.

**Ainda não foi criado projeto Supabase nem aplicado o banco. A área real
ainda NÃO foi validada com contas de teste ou publicada em produção.**

## Funcionalidades preparadas

### Aluno
- Cadastro por e-mail e senha, confirmação de e-mail, login e redefinição de senha.
- Perfil criado como `approved=false` e liberado somente após aprovação do admin.
- Saldo do ano, extrato individual, pontos reservados por pedidos pendentes.
- Catálogo de recompensas e solicitação de resgate, com histórico de pedidos.

### Administração
- Listagem de todos os cadastros, aprovação de novos alunos.
- Lançamento manual de pontos com justificativa para ajustes.
- Listagem de todas as movimentações; cadastro/edição de recompensas e estoque.
- Aprovação ou recusa de pedidos, com verificação de saldo e estoque no banco.

### Banco protegido
`clube/schema.sql` prepara perfis, administradores, eventos imutáveis,
recompensas, pedidos, políticas RLS e três operações transacionais:

- `clube_award_points` — valida o administrador e o saldo disponível.
- `clube_request_redemption` — reserva pontos enquanto o pedido está pendente.
- `clube_resolve_redemption` — aprova/recusa; na aprovação gera débito auditável
  e reduz o estoque em uma mesma transação.

Todos os produtos iniciais são **exemplos inativos**. Só ativar benefícios
efetivamente acordados com parceiros e prêmios reais em estoque.

## Passos para concluir a configuração

1. Usuário escolhe a organização Supabase. Confirmar o custo oferecido antes de
   criar o projeto de desenvolvimento, preferencialmente na região de São Paulo.
2. No projeto Supabase vazio, revisar e aplicar `clube/schema.sql` via migração.
3. Configurar Auth e-mail/senha **com confirmação de e-mail ativa**,
   URLs de redirecionamento e limites de envio. O link de confirmação e o de
   recuperação devem apontar para a URL HTTPS exata do preview `/clube`.
4. Criar a conta de administrador pelo formulário e confirmar o e-mail;
   **somente o proprietário**, usando o SQL Editor protegido, promove o
   usuário adicionando seu ID a `public.clube_admins`.
   Exemplo de consulta antes de conceder permissão:
   `select id,email from auth.users where email = 'EMAIL_CONFIRMADO';`
   Inserção pelo proprietário, após validação:
   `insert into public.clube_admins(user_id) select id from auth.users where email = 'EMAIL_CONFIRMADO';`
5. Na Vercel, configurar somente para a prévia as variáveis
   `VITE_CLUBE_SUPABASE_URL` e `VITE_CLUBE_SUPABASE_PUBLISHABLE_KEY`.
   Exemplo de nomes em `clube/.env.example`. Nunca colocar `service_role`
   no navegador/repositório nem em variáveis públicas `VITE_`.
6. Verificar com **três contas de teste**: admin, aluno aprovado e aluno
   aguardando. Testar diretamente as políticas RLS, incluindo tentativas de
   ler registros de outro aluno e alterar o próprio status/lançamentos.
7. Testar concorrência e estados do resgate: pontos insuficientes, reserva,
   estoque zero, pedidos duplicados, aprovação dupla e recusa.
8. Confirmar termos, privacidade e LGPD; definir expiração dos pontos e
   tratamento de pedidos pendentes na virada do ano. Revisar a automação
   de renovações Hotmart apenas quando houver webhook seguro no servidor.
9. Só publicar a área real no domínio oficial após aprovação expressa
   e checklist de testes concluído.

## Custos e segurança
Nenhuma compra ou assinatura está autorizada pelo projeto de código.
Custos e limites de Supabase e hospedagem devem ser verificados no plano real
antes de criar recursos. Os scripts de banco são propostas de implementação:
**nunca os aplicar sem validar o projeto-alvo e efetuar testes de segurança**.

## Fluxo da vitrine demonstrativa
O painel fictício anterior continua disponível e inclui cinco recompensas de
exemplo, quatro em destaque na home do aluno, solicitação de resgate,
pontos reservados, aprovação/recusa e atualização de estoque e extrato.
Nada dessa demonstração é transação real.
