# Hotmart — Assinaturas: integração somente leitura (PR #18)

**Estado: em homologação Preview; sem publicação Production.** Este trabalho
parte da `main` aprovada e reutiliza `ClubeHotmartAdmin.jsx` e
`api/clube/hotmart-admin.js`. Não incorpora o PR #14, suas migrações,
webhooks, conciliação, funções de pontos nem cron.

## Fonte de verdade

Auditoria oficial de 21/10/2026, já registrada no PR #14:
- Produto **6304828**, UCODE **588a8af3-ca54-4745-9420-47e5d45d51e0**;
- Planos numéricos validados na auditoria: **1155921 (30 dias)** e
  **1155920 (90 dias)**; códigos Hotmart g64ryxgr e il6n3k8y;
- 45 assinaturas históricas; 2 ACTIVE, 6 DELAYED, 8 INACTIVE,
  15 CANCELLED_BY_ADMIN, 14 CANCELLED_BY_CUSTOMER;
- 39 mensais e 6 trimestrais;
- 200 registros de pagamento: 77 COMPLETE/APPROVED (não significa
  77 renovações elegíveis);
- campo purchase_subscription ausente nos 200 registros, exigindo
  bloqueio de qualquer crédito/contagem definitiva de renovação;
- 37 e-mails históricos distintos. 0 vínculos confirmados na auditoria.
  **Não confundir 45 históricos com 45 alunos pendentes de cadastro**.

Estes valores são documentação para conferência, NÃO são carregados como
totais em produção. O dashboard só exibirá dados de consulta atual
bem-sucedida.

## Contrato de segurança e de integração

- GET `/api/clube/hotmart-admin` reaproveitado (sem novo endpoint público);
- Valida JWT fresco pelo Supabase Auth `getUser` e consulta `clube_admins`
  sob o JWT antes de ler PII. Não usa role do navegador, user_metadata,
  cookie ou query string para autorizar.
- Resposta `private, no-store, max-age=0`, `Vary: Authorization`,
  sem CORS cross-origin e sem logs de dados ou credenciais.
- O frontend recebe informações pessoais **somente após** autorização
  do backend. Não salva dados em localStorage, IndexedDB, arquivos estáticos,
  GitHub, logs ou analytics; mantém resposta apenas na memória da aba.
- Importa somente `clube/hotmart-admin/reader.mjs`, sem import de
  `api/hotmart/webhook.js`, `reconcile.js` ou RPCs financeiros.
- Sem INSERT/UPDATE/UPSERT/DELETE/RPC ou alterações no Supabase.
- `HOTMART_ADMIN_READONLY_ENABLED` ausente/desligado por padrão.
- Allowlist estrita: `HOTMART_ALLOWED_PRODUCT_IDS=6304828`.
- `HOTMART_CLIENT_ID`, `HOTMART_CLIENT_SECRET`, `HOTMART_BASIC_TOKEN`
  exclusivamente no backend. Identificação do endpoint PR #14
  (`HOTMART_IDENTIFY_SECRET`) **não** é necessária no backend da aba.
- PROD: variáveis somente no servidor, sob controles mínimos de acesso;
  **Preview da PR #14 não é Production nem esta nova branch.**
  Não criar/copiar nem ativar env Production sem autorização explícita.

## Leitura e atualização

- Toda abertura da aba consulta endpoint admin; clique Atualizar força nova leitura.
- Backend usa OAuth Hotmart server-side e pagina integralmente assinaturas
  `product_id=6304828&accession_date=1`, sem `date_next_charge=1`
  (filtro que omitiu assinaturas na auditoria).
- Histórico oficial `/:subscriber_code/purchases` é consultado para todos,
  concorrência máxima 5, com limite de páginas e timeout de rede.
- Falha parcial, 429, 5xx, resposta inesperada, repetição de cursor ou plano
  fora da allowlist impedem validar uma sincronização como bem-sucedida.
- Os status COMPLETE/APPROVED com approved_date comprovam **pagamento**
  em registros da API, mas NÃO renovação bonificável. REFUNDED, CHARGEBACK
  e OVERDUE são separados; nenhuma pontuação é calculada.
- `next_charge_at` é a próxima cobrança **prevista**, não um pagamento.
- Apenas cache efêmero em memória da função (TTL fresco 5 minutos,
  última leitura 60 minutos se API falhar). A data de sincronização
  é a da última consulta COMPLETA. Cache **não é durável** entre instâncias
  Vercel; uma instância fria sem cache exibe falha, não números inventados.
  Em uma mesma sessão admin, a aba mantém último resultado apenas em RAM.
  Uma futura persistência privada e durável exige aprovação e arquitetura
  separada, não faz parte deste PR.

## Vínculo ao Clube

A consulta de assinaturas funciona sem `SUPABASE_SERVICE_ROLE_KEY`.
Sem essa chave server-only, a identidade **não é verificável**;
o painel mostra `linked=null` e `pending=null`, não zero.

Quando um administrador configurar a chave **somente no servidor Preview**
de forma autorizada, o leitor compara e-mail real Hotmart com perfil
aprovado e **e-mail confirmado do Supabase Auth**, bloqueia perfis duplicados
e divergências, e marca `linked` apenas com confirmação.
O indicador *Vínculos pendentes* conta apenas **ACTIVE sem vínculo**;
cancelados, atrasados e inativos não contam como espera de cadastro.
Não grava vínculo, não cria usuário e não pontua.

## Testes e checklist antes de aprovação da publicação

- CI: `.github/workflows/hotmart-admin-qa.yml`.
- `node --test qa/hotmart-admin/*.test.mjs` usa SOMENTE e-mails
  `@example.invalid`, dados sintéticos de 45 assinaturas, mock Hotmart,
  mock auth/Db, paginação incompleta, concorrência limitada, erros,
  autorização e ausência de qualquer escrita.
- Build Vite e Chromium/WebKit em 320, 390, 768 e 1440 pixels;
  filtros por nome/e-mail, plano/situação e scroll horizontal.
- Testes reais pendentes até configurar segredos de Preview no PR #18:
  validação de usuário admin real, produtos, últimas compras,
  comparação de perfis com e-mails verificados e limites da API.
- Antes de qualquer publicação Production: usuário aprova expressamente,
  variáveis server-only de Production configuradas em painel protegido,
  teste com admin real, revisão dos dados retornados e deploy controlado.
- PR #14 fica RASCUNHO e não é mesclado. Sem migrações, cron,
  webhooks, creditação ou ponto retroativo.
