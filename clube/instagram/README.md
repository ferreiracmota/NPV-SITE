# NPV — Prévia real de Instagram por DM e Story
Data: 27/10/2026. Branch: `preview/clube-instagram-stories-20261027`.

## Estado auditado em 28/10/2026 — aguardando a Meta

- App correto: **NPV Clube de Benefícios**, Meta App ID `1670483874468146`; Instagram profissional oficial **@naopensevai**, IG ID `17841461793945231`.
- Domínio `naopensevai.com` confirmado como **Verified** na Meta. Metatag no `index.html`; site oficial exibe a empresa responsável em `/informacoes-da-empresa.html`.
- Verificação empresarial de **VITRINE PUBLICIDADES LTDA** reenviada com razão social, CNPJ e endereço visíveis no site. A aprovação da Meta e a análise de permissões de mensageria **não foram concluídas**.
- Handshake GET do callback `https://www.naopensevai.com/api/instagram/webhook` foi aceito pela Meta, mas **não confirma entrega de webhook POST com Story real**.
- Vercel, **Production**: `NPV_INSTAGRAM_ENABLED=false` e `NPV_INSTAGRAM_AWARD_ENABLED=false` verificados; **não ativar** enquanto não houver webhook assinado de teste, vínculo seguro por DM, deduplicação e auditoria completos.
- Configuração pendente: substituir `INSTAGRAM_APP_SECRET` legado pelo segredo do aplicativo Meta correto, através de variável de ambiente protegida, sem copiar dados sensíveis para código/chat; conferir autorização do Instagram e registro de webhook.
- Supabase oficial: três tabelas com RLS ativo e funções RPC concedidas somente ao `service_role`; zero links, códigos e eventos registrados no momento desta auditoria; regra de Story encontrada com **200 pontos**.
- A medição de Stories no painel considera os limites exatos do mês em **America/Sao_Paulo** (o banco mantém `timestamptz`).
- Teste seguro no banco: em transação com `ROLLBACK`, a menção de perfil não vinculado não gerou pontos. Nenhum evento de teste permaneceu após o rollback.

**Próximos bloqueios reais:** revisão/permissões do app e credencial correta, entrega de menção real assinada, confirmação do formato de identificador estável do Story, conta-teste aprovada e teste de duplicidade/limite mensal em ambiente isolado. Nunca apresentar uma tela local/mock como prova de integração real.

## Homologação restrita à conta-aluno — PR de 28/10/2026

A Meta confirmou a verificação empresarial da VITRINE PUBLICIDADES LTDA e do domínio naopensevai.com. A análise de `instagram_business_basic` e `instagram_business_manage_messages` em **Uso permitido** ainda exige justificativa e demonstração. Verificação empresarial não equivale a concessão dessas permissões.

**Achado crítico:** o comentário da variável sensível `INSTAGRAM_APP_SECRET` na Vercel Production ainda menciona o app legado `4205484039583967`. Não verificar nem copiar o segredo para logs, navegador, chat ou código. O responsável deve substituir essa variável pelo segredo do app oficial `1670483874468146` diretamente no painel protegido da Vercel e redeployar o ambiente de teste. Também é necessário conferir conta profissional autorizada na Meta e subscription do webhook.

Para um teste real com o app correto (nunca ligar a pontuação):

- `INSTAGRAM_APP_ID=1670483874468146` é obrigatório no backend, evitando ativação para outro aplicativo.
- `NPV_INSTAGRAM_TEST_MODE=true` impõe teste exclusivo; informar `NPV_INSTAGRAM_TEST_STUDENT_ID` (UUID da conta de aluno aprovada) como variável do servidor, nunca no frontend ou commit.
- `NPV_INSTAGRAM_ENABLED=true` só deve ser configurada após o segredo do aplicativo correto, identificador da conta, assinatura Meta e rota do webhook estarem confirmados.
- `NPV_INSTAGRAM_AWARD_ENABLED=false` deve continuar; o código também força `award=false` em modo de teste, independentemente do valor da flag.
- No modo de teste, geração de código e processamento de menções são restritos ao aluno autorizado; menções sem vínculo de terceiros são descartadas, sem gravá-las no banco.
- O administrador conserva acesso de leitura ao monitoramento, sem poder gerar outro código enquanto o piloto estiver ativo.
- Testar em `/clube/instagram-teste` ou na seção Instagram e Stories, com conta de aluno, e enviar o código à conta `@naopensevai` por DM. Conferir evento na tabela (status `review`, 0 pontos). Não demonstrar crédito fictício.
- Preferir um callback público no domínio oficial com gate de teste no backend: previews da Vercel protegidos por SSO não recebem webhooks externos. Isso não autoriza desproteger o site todo.
- Antes de trocar o modo de teste para produção geral, exigir confirmação documentada de DM real, identificação estável do Story, RLS, idempotência e limite mensal. Não alterar o Club 2.1.1, Strava, Hotmart ou pontuação de alunas para montar a prova.

**Nota sobre análise do app Meta:** o fluxo de código por DM comprova propriedade da conta pessoal da aluna, mas NÃO equivale ao Instagram Login/OAuth da conta profissional `@naopensevai`. As permissões `instagram_business_basic` e `instagram_business_manage_messages` podem requerer demonstração da autorização profissional e de mensagens recebidas; confirmar exigência exata no formulário da Meta e não declarar OAuth implementado se não estiver.

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
