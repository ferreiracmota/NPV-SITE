# PR #14 — Hotmart ↔ Clube NPV (não ativar)

Branch: `feature/hotmart-renovacoes-seguro-20261020`
PR: https://github.com/ferreiracmota/NPV-SITE/pull/14 (rascunho)

**ESTADO:** código e SQL preparados; migração validada com fixture em PostgreSQL
17 descartável no GitHub Actions. NÃO migrado ao Supabase oficial. NÃO feito
merge. NENHUM saldo real ou perfil alterado. NÃO há webhook nem cron ativos.
IDs em testes são inteiramente fictícios e não podem ser usados na conta real.

## Componentes preservados

- `api/hotmart/identify.js` — consulta protegida READ-ONLY de catálogo e
  candidatos (sem insert/update/RPC); resultados minimizados.
- `api/hotmart/webhook.js` — autenticação HOTTOK, filtro de produtos,
  validação oficial de pagamento, gravação apenas pela função protegida.
- `api/hotmart/reconcile.js` — execução protegida por CRON_SECRET, delega
  à função de conciliação e permanece sem qualquer cron em produção.
- A carteira já existente `clube_point_events`, `clube_point_rules`,
  `clube_profiles` e `auth.users`. Nenhuma interface alterada.

**Somente estes três endpoints** ficam em `api/hotmart/`. Auxiliares:
`clube/hotmart/core.mjs`, `discovery.mjs`, `identify-core.mjs`,
`competencies.mjs`. Testes: `clube/hotmart/*.test.mjs`,
`clube/hotmart/pg/{fixture,scenarios,permissions}.sql` e `pg/concurrent.sh`.

## Política aprovada

- Mensal: 1 competência por pagamento mensal recorrente aprovado.
- Trimestral: 3 competências de 1 mês, a partir do pagamento trimestral
  confirmado, liberadas no mês de cada competência. Ex.: 31/10, 30/11,
  31/12. Sem antecipação das competências 2 e 3.
- Valor por competência = regra `renovacao` vigente no momento do crédito
  (atualmente 400). Trimestral totaliza 1.200 se a regra ficar em 400.
- Sem teto global. Limites específicos das demais atividades não são alterados.
- Compra inicial, parcelamento, previsão de cobrança e sincronização
  inicial NÃO concedem pontos.
- Exige confirmação Hotmart, assinatura vinculada e aprovada, email
  confirmado Supabase Auth, ID de produto+plano autorizado, número de
  recorrência > 1, transação única, data posterior ao marco de primeira
  sincronização e a `starts_at` explicitamente aprovada.
- A primeira sincronização grava `baseline_at` e `baseline_transaction`,
  preservando-os nas próximas sincronizações, sem recalcular o histórico.

## Migração preparada — nunca aplicar automaticamente

`clube/migrations/20261020_hotmart_integracao_pendente.sql`

Estruturas e funções:
- `clube_hotmart_products`: allowlist de produto/UCODE e planos 30/90 dias;
- `clube_hotmart_subscriptions`: vinculação aprovada ou pendente e
  baseline imutável;
- `clube_hotmart_payments`: transação única por produto e assinante;
- `clube_hotmart_competencies`: unique(payment_id, ordinal), prazos,
  crédito e estorno distintos, estados scheduled/credited/reversed/void;
- `clube_hotmart_webhook_events`: trilha de eventos recebidos;
- `clube_hotmart_sync_state`: cursor por produto, atualizado só após
  concluir a página inteira;
- `clube_hotmart_config`: `live_credit_enabled=false` por padrão,
  requer `starts_at` para autorizar ativação futura;
- RPC `clube_hotmart_register_baseline` apenas service_role;
- RPC `clube_hotmart_ingest` (registro/agenda/estorno) apenas service_role;
- RPC `clube_hotmart_release_due` apenas service_role; impõe kill switch
  e bloqueios `FOR UPDATE SKIP LOCKED` no pagamento + lock do perfil +
  idempotência com referência única por competência.

Para estorno: só competências creditadas recebem lançamento negativo,
sem apagar o lançamento original ou resgates; competências futuras são
anuladas. Cancelamento de recorrências futuras sem evento financeiro não
estorna cobranças anteriores. Saldo insuficiente pode ficar negativo e
deve ser revisado na política comercial antes de homologar produção.

O SQL altera `clube_point_events.performed_by` para permitir NULL
identificando autoria automatizada. É alteração de schema sujeita à
revisão/backup antes da migração oficial; NÃO aplicar sem autorização.

## API Hotmart e conciliação

A API de assinaturas pagina com `page_token` / `next_page_token`.
A API `/:subscriber_code/purchases` documenta resposta array; caso
retorne objeto paginado, processamos páginas e rejeitamos dados
incompletos, cursor repetido, falha HTTP ou mais de 8 páginas (fail-closed).
Timestamps aceitos em segundos ou milissegundos. Atraso não credita;
somente APPROVED/COMPLETE após confirmação oficial. FINANCED_INSTALLMENT
não é renovação. Reembolso, cancelamento financeiro e chargeback
são processados por transação com unicidade. O checkpoint do produto
avança APENAS após sucesso de todas as compras da página. Sem reprocessamento
retroativo anterior à `starts_at` / `baseline_at`.

Para reduzir limite de API: até dois assinantes por chamada do conciliador
e máximo oito páginas de histórico por assinante. Operar com intervalo
apropriado quando cron for autorizado. O catálogo e assinaturas reais
precisam confirmar formato, paginação e limites da API.

**CUIDADO COM TROCA DE PLANO:** quando uma assinatura muda de 30 para 90
dias (ou vice-versa), o endpoint de assinaturas pode trazer só o plano
atual. A API de compras nem sempre traz o plano histórico do pagamento.
Para transações antigas ambíguas, exige-se comprovação pela notificação
de compra ou outra fonte oficial vinculada à época; NÃO inferir o plano
anterior apenas do plano atual. Essa verificação é pendência de
homologação com eventos reais e não justifica liberar automaticamente
transações históricas.

## Testes comprovados e limites da validação

GitHub Actions `.github/workflows/hotmart-qa.yml`: Node 22, pnpm,
verificação sintática, testes JavaScript e build de frontend;
PostgreSQL 17 EM CONTAINER DESCARTÁVEL, sem Supabase externo.
Os testes executam exatamente esta migração, cenários de mensal,
trimestral, estornos, chargeback, baseline, RLS, permissões e duas
conexões simultâneas. Cenários usam emails e IDs FICTÍCIOS.

Fixture replica somente as colunas necessárias das tabelas atuais.
**Não representa uma homologação ponta a ponta Supabase** com esquema
completo, políticas reais de Auth, rede, triggers, Vercel ou Hotmart.
Para produção, fazer backup, revisão de migração contra schema atual,
testes de identidade real e revisão de saldo negativo/resgate.
A regra do Clube continua sendo lida da tabela, com valores
exemplificados em 400 e 550 em testes isolados.

## Retomada quando Vercel voltar (sem enviar segredos por chat)

1. Confirmar PREVIEW `HOTMART_CLIENT_ID`, `HOTMART_CLIENT_SECRET`,
   `HOTMART_BASIC_TOKEN`, `HOTMART_IDENTIFY_SECRET`. As quatro estavam
   cadastradas como Sensitive na branch; não duplicar nem exibir valores.
2. No Preview protegido, testar acesso negado sem Authorization e com
   Bearer incorreto. Testar `GET /api/hotmart/identify?mode=catalog`
   autenticado; validar IDs/UCODE sem assumir IDs de testes.
3. **Aprovação do usuário** dos produtos/planos NPV antes de consultar
   assinantes e ativar `HOTMART_ALLOWED_PRODUCT_IDS`.
4. Consulta de assinantes SOMENTE READ-ONLY; cruzar email de assinante
   confirmado com perfil Supabase aprovado e verificar conflitos,
   próxima cobrança e último pagamento; nenhuma persistência ainda.
5. Homologar um banco Supabase de teste com schema/políticas atuais,
   vínculo real autorizado, troca de plano, APIs e webhook com
   dados de teste, cancelamentos, créditos concorrentes e histórico.
6. Somente depois de autorização expressa: aplicar migração em produção,
   configurar allowlist, `starts_at` futura, habilitar release/cron e
   liberar `live_credit_enabled`. Nunca retroagir automaticamente.

Docs oficiais:
- https://developers.hotmart.com/docs/pt-BR/v1/subscription/get-subscribers/
- https://developers.hotmart.com/docs/es/v1/subscription/get-subscription-purchases/
- https://developers.hotmart.com/docs/pt-BR/start/pagination/
- https://developers.hotmart.com/docs/en/2.0.0/webhook/purchase-webhook/

**Nota:** `date_next_charge` é PREVISÃO, não pagamento confirmado.
