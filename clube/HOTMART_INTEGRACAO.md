# Hotmart + Clube de Benefícios NPV — integração simplificada (modelo Strava)

Status: **FASE 1 IMPLEMENTADA EM CÓDIGO, SEM CONSULTA REAL**.
Branch de trabalho: `feature/hotmart-renovacoes-seguro-20261020`.
PR de rascunho: https://github.com/ferreiracmota/NPV-SITE/pull/14
**Nenhum arquivo desta branch foi publicado, nenhuma migração foi aplicada,
nenhum webhook foi ativado e nenhum ponto foi movimentado.**

## Decisões comerciais já aprovadas (20/10/2026)

- Mensal: 400 pontos por renovação REALMENTE paga e confirmada.
- Trimestral: 3 competências mensais de 400 pontos = até 1200
  por pagamento trimestral REALMENTE confirmado, sem antecipação:
  primeira competência a partir da renovação aprovada; demais
  a cada mês de cobertura. Uma compra em 3 parcelas nunca são 3 renovações.
- **Sem teto global por aluno**. Preservar as regras específicas de outros benefícios.
- Sem pontos por primeira contratação, primeira sincronização, vencimento estimado,
  compra recusada ou eventos anteriores ao marco configurado.
- A operação nova deverá usar a categoria renovacao da tabela clube_point_rules
  (400 agora; futuro valor configurável) e eventos no extrato existente.

## Fase 1 — leitura somente

Arquivos novos:
- api/hotmart/identify-core.mjs: catálogo oficial Hotmart, lista de assinaturas,
  periodicidade 30/90 dias, datas, histórico, baseline e cruzamento com Supabase.
- api/hotmart/identify.js: endpoint GET com credencial de acesso PRIVADA;
  modo catalog devolve produtos de assinatura da conta oficial;
  modo assinantes faz a consulta read-only dos IDs expressamente autorizados,
  cruza e-mails com Supabase Auth confirmado + clube_profiles approved e
  retorna dados minimizados e status de vínculo, SEM GRAVAÇÃO.
- api/hotmart/identify.test.mjs: testes sem rede real nem contas de alunos.
- api/hotmart/competencies.mjs: cálculo puro de competência mensal/trimestral,
  idempotência por chave transação + ordinal, liberada somente quando mês vence.

Endpoints da futura implantação em Preview, com autorização:
GET /api/hotmart/identify?mode=catalog
GET /api/hotmart/identify?mode=assinantes
Cabeçalho obrigatório Authorization: Bearer <credencial privada HOTMART_IDENTIFY_SECRET>.
A ausência de credenciais retorna 503. Não oferecer endpoint público.

## Credenciais ainda ausentes (NÃO compartilhá-las no chat)

Hotmart > Ferramentas > Credenciais Developers > criar credencial com acesso de
leitura de produtos, assinaturas e compras; guardar exclusivamente em
Vercel (ambiente Preview autenticado):
HOTMART_CLIENT_ID, HOTMART_CLIENT_SECRET, HOTMART_BASIC_TOKEN,
HOTMART_IDENTIFY_SECRET, HOTMART_ALLOWED_PRODUCT_IDS,
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
O identificador de produto NÃO deve ser presumido: primeiro executar
modo catalog após autorização, confirmar os produtos reais NPV; só então
configurar HOTMART_ALLOWED_PRODUCT_IDS para consultas aos assinantes.
NÃO configurar serviço de escrita para esta fase. Não usar VITE_ em segredos.

## Fase 2 — preparada, mas NÃO ATIVADA

Reaproveitar no PR #14: api/hotmart/core.mjs, webhook.js, discovery.mjs,
reconcile.js e a migração SQL ainda NÃO APLICADA.
O SQL anterior exigia um teto geral mensal. Essa exigência foi removida.
O SQL antigo de lançamento ainda NÃO implementa o parcelamento do benefício
trimestral por competência: **não ativar live_credit_enabled**.
O bloqueio de segurança exige baseline_at registrada após primeira identificação.
Para etapas posteriores, adaptar as RPCs para liberar 1 competência por mês,
com unicidade (product_id, transaction_id, ordinal), e estornar somente
competências efetivamente creditadas. Homologar em banco isolado primeiro.
Não migrar o banco NPV atual sem nova autorização.

## Conferência oficial das APIs

Fontes:
- https://developers.hotmart.com/docs/pt-BR/v1/product/product-list/
- https://developers.hotmart.com/docs/pt-BR/v1/subscription/get-subscribers/
- https://developers.hotmart.com/docs/es/v1/subscription/get-subscription-purchases/
- https://developers.hotmart.com/docs/pt-BR/start/app-auth/
- https://developers.hotmart.com/docs/en/2.0.0/webhook/purchase-webhook/

Nota: date_next_charge é PREVISÃO de tentativa de cobrança, nunca prova de
pagamento. Os timestamps da documentação alternam segundos e milissegundos,
portanto os normalizadores aceitam ambos.

## Critérios para avançar

1. Acesso OAuth oficial de leitura, com credenciais no Vercel Preview.
2. Identificar IDs e UCODE dos produtos/planos NPV pela própria Hotmart.
3. Obter lista real somente leitura, preservar privacidade, verificar contas
   Supabase confirmadas; não vincular apenas por e-mail informado.
4. Fotografar baseline real (último pagamento aprovado e próxima cobrança),
   sem criar conta fictícia nem alterar saldo.
5. Homologar o mecanismo de persistência do vínculo e a distribuição trimestral
   em DB de testes; validar conflitos e duplicidade concorrente.
6. Testes E2E webhook, falhas, atrasos, estornos, 30/90 dias e 12 cenários
   mandatórios; verificar integridade histórica, RLS e idempotência.
7. Aprovação explícita antes de migrar Supabase de produção, publicar endpoint
   ou permitir créditos reais; fixar data starts_at futura.

**Estado do banco oficial ao diagnóstico**: 19 eventos, soma assinada de
1.170 pontos; regra renovacao=400. Apenas leituras efetuadas.
