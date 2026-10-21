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


## Consulta real Hotmart — 21/10/2026

Auditoria READ-ONLY da API oficial na branch Preview do PR #14. Zero alteracoes
em producao, zero creditos, zero novas assinaturas, zero vinculos gravados.
Nenhum identificador pessoal de aluno foi salvo neste repositorio.

### Produto e planos REAIS, explicitamente autorizados

- Produto 6304828, UCODE 588a8af3-ca54-4745-9420-47e5d45d51e0:
  PLATAFORMA DE TREINO PARA MULHERES | NAO PENSE, VAI! (ACTIVE).
- Plano mensal: codigo g64ryxgr, plano numerico 1155921, MONTHLY,
  ASSINATURA, maximo 1 parcela.
- Plano trimestral: codigo il6n3k8y, plano numerico 1155920, QUARTERLY,
  MULTIPLOS_PAGAMENTOS, ate 3 parcelas. Nao equiparar cada parcela a renovacao.
- Allowlist somente no Preview restrito a branch: HOTMART_ALLOWED_PRODUCT_IDS=6304828.
  As credenciais originais permanecem Sensitive e apenas no Preview.

### Assinaturas oficiais

GET /payments/api/v1/subscriptions com product_id=6304828,
accession_date=1, paginação integral (3 paginas), sem filtro date_next_charge.

- Total 45 (mensal 39, trimestral 6): ACTIVE 2, DELAYED 6, INACTIVE 8,
  CANCELLED_BY_ADMIN 15, CANCELLED_BY_CUSTOMER 14.
- **Cuidado real comprovado:** adicionar date_next_charge=1 retornou
  somente 27 assinaturas, omitindo ativas, atrasadas e inativas. Para
  inventariar a base, NAO utilizar esse filtro. Proxima cobranca prevista
  nao e comprovante de compra.
- Vínculos: 45 assinaturas com 37 emails distintos, comparados via
  digest SHA-256 com sal aleatorio e SELECT no Supabase. 0 candidatos
  vinculados e 45 pendentes sem perfil correspondente. Clube possuia
  2 perfis, 1 aprovado. Nenhum perfil novo criado.

### Histórico real de pagamentos

GET /payments/api/v1/subscriptions/{subscriber_code}/purchases
consultado para os 45 assinantes. 45 historicos completos, 200
registros: COMPLETE 76, APPROVED 1, OVERDUE 108, REFUNDED 4,
CHARGEBACK 2, CANCELLED 5, EXPIRED 3, WAITING_PAYMENT 1.
77 entradas COMPLETE/APPROVED com approved_date (75 de assinaturas
mensais, 2 trimestrais); NAO equivalem automaticamente a renovacoes
bonificaveis. Meios: PIX 85, CREDIT_CARD 82, PIX_AUTOMATIC 33.
45 registros possuem recurrency_number=1, e 155 possuem numero >1,
considerando todos os estados, inclusive inadimplentes e estornados.

**Divergencia importante da API real:** campo purchase_subscription
NAO apareceu em NENHUM dos 200 registros, apesar de previsto na
documentacao oficial. Ausencia nao significa false nem confirma que
uma parcela representa renovacao. O motor de pontos atual deve
continuar FAIL-CLOSED, sem concessao. Em especial, as transacoes
do plano trimestral MULTIPLOS_PAGAMENTOS precisam de prova oficial
complementar (sumario/vendas/historico de cobrancas) antes de separar
parcelamento financeiro de renovacao trimestral efetivamente paga.

### Limites de homologacao

Instantaneo de 21/10/2026, nao alimenta automaticamente o painel
oficial. Para exibir dados reais em Production ainda faltam:
controle administrativo real e permissao minima no backend, estrategia
protegida de credenciais server-side (nao herdar Preview), gestao de
paginacao/erros, vinculacao robusta sem cadastros falsos, validacao
de statuses reais e testes ponta a ponta. Isso dependera de nova
autorizacao expressa para publicar a integracao read-only.

Nao fazer merge do PR #14, nao aplicar migracoes oficiais, nao
habilitar creditos, webhook, cron ou pontos retroativos.
