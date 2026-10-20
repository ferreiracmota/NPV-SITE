# Integração NPV + Hotmart — preparação DESATIVADA
Data: 20/10/2026
Branch isolada: feature/hotmart-renovacoes-seguro-20261020

## STATUS
Não publicada em produção. Não executada migração no Supabase real. Nenhum crédito real.
Frontend, login, pontuações, resgates e interface mantidos.

## DIAGNÓSTICO REAL
Supabase Clube NPV: dnlyfwcrfocgafgfoyna.
Categoria clube_point_rules.renovacao: 400 pontos.
Extrato: clube_point_events, reference_id único, performed_by atualmente obrigatório.
Antes de qualquer modificação: 19 eventos, soma 1170 pontos.
A função clube_award_points exige administrador e não possui teto mensal implementado.
Não assumir que o texto antigo "2.000" seja configuração efetiva no banco.

## ARQUIVOS CRIADOS
api/hotmart/webhook.js: endpoint POST seguro 2.0.0; HOTTOK e filtro de produto.
api/hotmart/core.mjs: cruzamento Hotmart assinatura + compra.
api/hotmart/reconcile.js: reconsulta limitada a 5 transações conhecidas por chamada.
api/hotmart/discovery.mjs: percorre os IDs oficiais da lista de assinaturas,
com checkpoint persistido por produto; examina até 2 assinantes por chamada,
consulta compras e aceita somente recorrências após starts_at.
api/hotmart/discovery.test.mjs: testes de descoberta sem rede real.
api/hotmart/core.test.mjs: cenários de teste simulados, sem contas reais.
clube/migrations/20261020_hotmart_integracao_pendente.sql: tabelas de vínculo,
eventos, pagamentos, índices e função SQL transacional, com RLS e kill switch.
.github/workflows/hotmart-qa.yml: testes Node sem dinheiro real.

## FLUXO
1. Hotmart Webhook 2.0.0 envia evento e token X-HOTMART-HOTTOK.
2. Servidor compara token em tempo constante, versão e IDs autorizados.
3. Consulta API de assinaturas: email do ASSINANTE, produto, código e plano.
4. Consulta API de compras: transação aprovada, recorrência >= 2,
compra de assinatura (não parcela), plano mensal com período 30 dias.
5. SQL registra evento, lock transacional e índice único da transação.
6. Só vincula se email do assinante da API corresponde a email confirmado
no Supabase Auth, perfil aprovado e sem conflito de identidade.
7. Só bonifica após data de ativação futura e confirmação de teto.
8. Consulta valor atual da regra renovacao (agora 400) em cada operação;
lança no clube_point_events com referência única e extrato existente.
9. Reembolso e chargeback revertem por ajuste negativo sem apagar histórico.
Cancelamento apenas de próximas cobranças não reverte mensalidade paga.

## VARIÁVEIS DE SERVIDOR (somente painel Vercel; NUNCA na conversa)
HOTMART_HOTTOK — sensitive
HOTMART_CLIENT_ID — encrypted
HOTMART_CLIENT_SECRET — sensitive
HOTMART_BASIC_TOKEN — sensitive
HOTMART_ALLOWED_PRODUCT_IDS — números oficiais separados por vírgula
SUPABASE_URL — somente backend
SUPABASE_SERVICE_ROLE_KEY — sensitive, somente backend
CRON_SECRET — sensitive, somente backend
NUNCA usar prefixo VITE_ para segredo.

## WEBHOOK A CONFIGURAR APÓS HOMOLOGAÇÃO
URL: https://www.naopensevai.com/api/hotmart/webhook
Versão: 2.0.0
Filtrar produtos oficiais NPV.
Eventos: PURCHASE_APPROVED, PURCHASE_REFUNDED, PURCHASE_CHARGEBACK,
PURCHASE_CANCELED, PURCHASE_DELAYED e SUBSCRIPTION_CANCELLATION.
Configurar HOTTOK oficial, não simular eventos pagos em produção.

## DECISÕES PENDENTES
1. IDs oficiais: product.id, product.ucode e subscription.plan.id; confirmar
mensalidade no endpoint de planos. Nenhum produto foi presumido.
2. Plano trimestral: ainda SEM crédito automático. Proposta A: 400 por
renovação trimestral aprovada; proposta B: 400 por competência mensal
sem antecipar pagamento, após definição comercial/técnica.
O usuário deverá aprovar uma regra. Parcelamento NÃO é assinatura.
3. Determinar qual teto mensal regular existe no sistema e quais tipos compõem
o teto; campo regular_monthly_limit é NULL, bloqueando crédito real.
4. Confirmar política para saldo negativo após estorno de benefício resgatado.
5. Fixar starts_at futura explicitamente e autorizar live_credit_enabled=true.
6. Conferir o comportamento real da paginação Hotmart e os limites de API;
a conciliação de eventos NUNCA recebidos foi preparada com cursores, mas
ainda não está agendada nem homologada com as credenciais reais.

## HOMOLOGAÇÃO NECESSÁRIA
Aplicar migração PRIMEIRO em banco isolado após aprovação de eventual custo.
Executar testes E2E no sandbox Hotmart/Supabase, sem pagamentos reais:
mensal, renovação, duplicação, atraso, cancelamento, estorno, cadastro tardio,
divergência de e-mails, trimestre/parcelas, concorrência, falha no banco,
recuperação. Testar RLS, ROLLBACK, webhook sem token, limites, extrato e saldo.
Conferir soma e total de movimentações antes e depois; não sobrescrever.
Agendar Vercel Cron apenas depois de aprovar toda a homologação.

## ESTÁGIOS
Diagnóstico: realizado contra Supabase atual e repositório oficial.
Código: criado na branch isolada, não ativado.
Banco: migração preparada, NÃO APLICADA.
Credenciais: ausentes.
Webhook: não conectado.
Testes sintáticos/unitários: executados no CI (consultar run e aprovação).
Testes E2E reais: pendentes.
Produção e créditos automáticos: NÃO ATIVOS.
