# NPV — Prévia real de Instagram por DM e Story
Data: 27/10/2026. Branch: `preview/clube-instagram-stories-20261027`.

## Objetivo
Associar o sender.id (IGSID) que enviou um código único por DM ao id da aluna
autenticada e aprovada no Clube; identificar exclusivamente notificações reais
de `story_mention` assinadas pela Meta; impedir duplicidade e respeitar a
regra de 200 pontos e teto de 5 Stories válidos/mês (horário de São Paulo).

**Não pedir senha do Instagram**. Um campo livre `@username` não prova posse
de conta. O aluno deve poder usar Instagram pessoal.

## Entregue nesta branch e na preparação do banco
- Página exclusiva `/clube/instagram-teste`: login do Clube, código temporário,
  abertura de DM, atualização do vínculo e visualização de Stories efetivamente
  recebidos; não contém simulador.
- `POST/GET/DELETE /api/instagram/link`: JWT Supabase, aprovação de cadastro,
  código aleatório de 48 bits, SHA-256 armazenado, validade de 10 minutos e
  proteção de frequência.
- `GET/POST /api/instagram/webhook`: handshake Meta, assinatura HMAC
  `X-Hub-Signature-256`, validação do destinatário, distinção DM/Story e RPC.
- `GET /api/instagram/activity`: apenas eventos da aluna autenticada.
- Migração SQL **aplicada em 27/10/2026 no Supabase oficial**, apenas novas tabelas, com RLS, identidade IG
  exclusiva, código único, deduplicação de menções e RPC transacional de crédito.
- Tabelas vazias após criação; 19 lançamentos de pontos preexistentes preservados. Integração e crédito automáticos DESLIGADOS por padrão.
- Menu novo **Instagram · Stories** dentro do Clube oficial e acesso a partir de **Continue acumulando**.

## Bloqueios para teste de ponta a ponta com Story verdadeiro
1. Autorizar a conta profissional **@naopensevai** em um app da Meta for Developers
   com mensageria do Instagram. Revisar permissões de mensagens e modo de app
   (testadores podem ter requisitos específicos; acesso a terceiros depende de
   permissões/revisão da Meta).
2. Configurar um callback HTTPS **alcançável pela Meta**, não bloqueado pelo
   SSO/Deployment Protection da Vercel. Prévia protegida não recebe webhook
   externo. Não remover proteção geral nem publicar no oficial sem aprovação.
3. Adicionar as variáveis de ambiente **somente ao ambiente de teste**:
   `NPV_INSTAGRAM_ENABLED=true`, `INSTAGRAM_APP_SECRET`,
   `INSTAGRAM_WEBHOOK_VERIFY_TOKEN`, `INSTAGRAM_BUSINESS_ID`.
   Já existe acesso ao Supabase por variáveis protegidas; confirmar o alvo correto.
   Nunca colar segredos no chat, no GitHub, nem em variáveis `VITE_*`.
4. **Banco oficial já preparado de forma aditiva**: as três tabelas têm RLS e políticas explícitas negando acesso anon/authenticated. Nenhum lançamento de ponto foi modificado. Para testes destrutivos de homologação, usar contas e dados isolados, nunca conferir com saldos reais.
5. Vincular uma conta teste aprovada do Clube: entrar, gerar código, enviar DM.
   Verificar vínculo por IGSID. Publicar Story que mencione @naopensevai.
   Acompanhar notificação assinada e evento recebido.
6. Testar Story duplicado, perfil sem vínculo, usuário não aprovado, limite
   mensal e conta privada antes de liberar créditos.
7. Para ativar crédito real, configurar **deliberadamente** em ambiente
   autorizado `NPV_INSTAGRAM_AWARD_ENABLED=true` e um ator de auditoria
   designado por `NPV_INSTAGRAM_ACTOR_ID` (UUID presente em
   `clube_admins`). O backend tem comportamento fail-closed; sem essas
   condições o Story entra em análise, sem ponto.

## Validação
- `node --test clube/instagram/instagram-webhook.test.mjs`
- `pnpm run build`
- Workflow `instagram-preview-check.yml` em push/PR.
- Em nenhum caso inferir sucesso de webhook porque o @ foi digitado.
- Possíveis limitações da Meta: menções de contas privadas nem sempre chegam;
  Story pode expirar antes da validação; a API de `mentioned_media` não é a
  mesma coisa que os eventos de mensageria `story_mention`.

## Publicação
O usuário autorizou a instalação da área no Clube oficial em 27/10/2026.
Pode publicar o menu e as APIs protegidas, **sem habilitar NPV_INSTAGRAM_ENABLED**
até a autorização da Meta. O crédito automático só pode ser ligado após
comprovação com Story real. Cópia de segurança do código em
`backup/clube-antes-instagram-20261027`.
