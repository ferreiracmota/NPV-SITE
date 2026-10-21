# Clube NPV — Hotmart no administrativo (PR #17, NÃO PUBLICAR AINDA)

## Escopo

Esta mudança é independente da integração financeira do PR #14. A aba \`Hotmart — Assinaturas\`
já existe na main, e foi **estendida sem reconstrução**. A alteração introduz somente
leituras, sem schema, migração, webhook, cron, créditos, resgates ou alterações de saldos.

A implementação foi preparada em branch \`feat/clube-hotmart-real-readonly-20261021\`.
**NÃO mesclar/publicar antes da homologação em Preview protegido e autorização expressa.**

## Dados oficiais já auditados no PR #14 (21/10/2026)

- Produto permitido: 6304828; UCODE \`588a8af3-ca54-4745-9420-47e5d45d51e0\`.
- Mensal: plano numérico 1155921, código g64ryxgr, 30 dias.
- Trimestral: plano numérico 1155920, código il6n3k8y, 90 dias;
  \`MULTIPLOS_PAGAMENTOS\` não implica novas renovações.
- Instantâneo: 45 assinaturas, 2 ACTIVE, 39 mensais e 6 trimestrais.
- Os 77 pagamentos \`COMPLETE\`/\`APPROVED\` da auditoria **não são**
  77 renovações bonificáveis.
- Nunca copiar dados pessoais reais para testes, código, Git ou logs.

## Arquitetura

- **Endpoint existente** \`GET /api/clube/hotmart-admin\`: exige JWT Supabase
  Auth validado pelo servidor e linha em \`clube_admins\` antes de qualquer leitura.
  Resposta privada com \`Cache-Control: no-store, private\`.
- \`clube/hotmart-admin/reader.mjs\`: OAuth Hotmart e lista paginada completa com
  filtro \`product_id=6304828\` e \`accession_date=1\`. Não filtrar pelo
  \`date_next_charge\`, comprovadamente omite assinaturas reais.
- Os cinco estados mantidos: ACTIVE, DELAYED, INACTIVE, CANCELLED_BY_ADMIN,
  CANCELLED_BY_CUSTOMER; estados desconhecidos são indicados separadamente.
- \`?action=payments&subscriber_code=...\`: só retorna para código encontrado
  **na lista oficial autorizada**. Histórico solicitado progressivamente a partir
  do navegador autenticado, até duas chamadas simultâneas; nenhuma consulta
  de pagamentos permite gerar créditos.
- OAuth curto reutilizado apenas em memória efêmera server-side. Snapshot de
  assinaturas em memória efêmera (90s) e nunca em storage, CDN ou arquivo.
  \`refresh=1\` força consulta; falha mantém instantâneo anterior como \`stale\`
  e mostra aviso, sem substituir indiscriminadamente números por zero.
- Histórico de pagamentos identifica \`COMPLETE/APPROVED\` com approved_date,
  mas **\`renewals=null\` e \`points=null\`** até aprovação financeira.
- Correlação opcional e SOMENTE leitura: chave \`SUPABASE_SERVICE_ROLE_KEY\`
  exclusivamente no servidor, depois de validar administrador; consulta perfis,
  exige unicidade de e-mail, \`clube_profiles.approved\`, e e-mail correspondente
  confirmado em \`auth.users\`. Sem chave apropriada, a UI exibe
  *vínculos não verificados* e métricas de vínculo nulas.
- O indicador **Vínculos pendentes** conta somente ACTIVE sem vínculo confirmado,
  não todas as assinaturas históricas.
- Busca, filtro de plano, dos cinco estados e de vínculo operam sobre todas
  as assinaturas carregadas. A tabela mantém rolagem horizontal no celular.

## Configuração protegida futura

A produção **não** herda automaticamente segredos da branch PR #14.
No ambiente aprovado pelo usuário, em funções server-side da Vercel:

- \`HOTMART_CLIENT_ID\` (sensitive, server-only)
- \`HOTMART_CLIENT_SECRET\` (sensitive, server-only)
- \`HOTMART_BASIC_TOKEN\` (sensitive, server-only)
- \`HOTMART_ALLOWED_PRODUCT_IDS=6304828\` (escopo fixo; nunca valores inventados)
- \`SUPABASE_URL\` (URL, servidor; pode usar VITE_CLUBE_SUPABASE_URL)
- \`SUPABASE_SERVICE_ROLE_KEY\` (sensitive, **somente servidor**; opcional,
  mas necessário para **confirmar** identidade via Auth).
- \`VITE_CLUBE_SUPABASE_URL\` e \`VITE_CLUBE_SUPABASE_PUBLISHABLE_KEY\`
  mantidos como os existentes do Clube para autenticação normal. **Nunca**
  usar prefixo \`VITE_\` nas credenciais Hotmart ou service role.

**Não configurar em Production antes de testar o acesso real em uma Preview
protegida desta mesma branch com variáveis com escopo restrito e permissão
suficiente.** Não extrair segredos Sensitive do PR #14, não enviá-los ao chat.

## Testes e limites

- \`qa/hotmart-admin/security.test.mjs\`: autenticação, interface somente admin.
- \`qa/hotmart-admin/reader.test.mjs\`: paginação/falhas, status, plano, identidade,
  last paid distinto de renovação, tentativas de acesso sem permissão e
  nenhuma escrita. Dados **inteiramente fictícios**.
- \`qa/hotmart-admin/visual.mjs\` e \`real-visual.mjs\`: Chromium/WebKit,
  desktop/mobile, filtros, destaque, tabela rolável e bloqueio de não-admin.
- Não homologado ainda com Hotmart real **através deste endpoint**, nem
  banco Supabase de testes com perfis verificados e credenciais server-side.
  A auditoria real já foi feita no PR #14, mas não substitui teste
  ponta a ponta desta nova conexão protegida.

Antes da publicação: revisar o Preview, testar com conta admin real e
usuário comum, verificar token/CSRF/caches, registrar sucesso de inventário
e históricos (com métricas **sem PII**) e aprovar expressamente.
