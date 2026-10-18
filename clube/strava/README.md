# Integração Strava → Clube NPV — etapa preparatória (18/10/2026)

**Status: PREPARAÇÃO / SEM API ATIVA / SEM CRÉDITOS.** O site oficial, cadastro, saldos, extratos e resgates existentes não foram alterados por esta etapa.

## Objetivo combinado
Cada aluno do Clube de Benefícios NPV autoriza individualmente o acesso à própria conta Strava e participa do clube Strava “Não Pense, Vai!”. O NPV consulta km e datas, calcula pontos pela regra do NPV, credita um resumo mensal no dia 1º e mantém aprovação manual **somente de resgates**. Não haverá prints, fotos, planilhas manuais ou validação individual pelo administrador.

## Bloqueio de conformidade confirmado em 18/10/2026
**Não habilitar OAuth, coleta, armazenamento, consulta mensal ou pontuação real usando dados Strava até obter resposta favorável e específica do Strava para este modelo comercial de pontos e resgates.**

Fontes primárias (política vigente 01/06/2026):
- [Strava API Policy 2026, §§ 5.4, 5.5, 5.8, 6.2, 6.3, 7.4](https://www.strava.com/legal/api_policy)
- [Strava API Agreement 2026](https://www.strava.com/legal/api)
- [Getting started / tiers](https://developers.strava.com/docs/getting-started/)
- [OAuth and rotating refresh tokens](https://developers.strava.com/docs/authentication/)

Pontos que demandam confirmação *por escrito*: combinação de km com dados de aluno e programa de recompensas (5.4), persistência de totais e pontos derivados do Strava (5.5 e 6.2), impacto da exclusão/revogação inclusive após resgate (7.4), uso no contexto de assinatura NPV paga (5.8), limites de atletas e escopos.

## O que foi preparado no código
- `monthlyCandidate.mjs`: motor de **simulação, puro, isolado e sem chamadas à API**. Recebe amostras na memória, confere participação no clube, mês local da atividade, tipos elegíveis, ignora atividades manuais e IDs duplicados, soma metros e converte em **pontos candidatos sem gravação**.
- `monthlyCandidate.test.mjs`: testes com dados fictícios para soma, duplicidade, regras, participação no clube e privacidade.
- A regra de negócio de pontos por km, esportes elegíveis e arredondamento é **provisória**, editável e ainda depende de aprovação do proprietário antes da ativação real.
- Nenhum acesso ao Strava, OAuth, webhook, banco do aluno, `clube_point_events` ou `clube_point_rules` é realizado por estes arquivos.

## Arquitetura prevista após autorização expressa
1. Proprietário cria/autoriza aplicação em [Strava Developer Settings](https://www.strava.com/settings/api). **Client Secret** fica apenas no backend, nunca numa variável `VITE_` nem no GitHub.
2. Frontend `/clube`: botão de conexão com consentimento e informações claras de privacidade, revogação e exclusão. Somente usuário autenticado e aprovado.
3. Backend: OAuth 2.0 state/PKCE quando suportado, callback validado e tokens protegidos no servidor; atualizar refresh token sempre que rotacionar. Nunca logar tokens.
4. Consultas individuais `GET /athlete/activities`, paginação, parâmetros after/before no intervalo mensal; verificar se o usuário integra o clube, quando esse endpoint estiver disponível para seu token e escopo. Nunca coletar dados de membros do clube em massa.
5. Webhook Strava e tratamento de desautorização, exclusão e alterações; não usar scraping nem polling para substituir restrições. Reduzir retenção ao máximo, sem manter dados acima dos limites permitidos.
6. Um fechamento idempotente executado por backend no início de cada mês (dia 1º, timezone America/Sao_Paulo), com proteção de duplicidade, controle de taxa, retentativas seguras e capacidade de processamento para todos os alunos.
7. Registrar eventos e pontos no banco **somente se o Strava confirmar por escrito que esse modelo e a retenção de derivados são permitidos**. Acesso admin deve respeitar os limites de exposição e compartilhamento de dados Strava.
8. Validar com uma conta e com usuários de teste, checar segurança/RLS, dispositivos iOS/Android, privacidade, efeito de revogação/deleção, virada de mês e impacto sobre resgates. Publicar no oficial apenas depois da homologação.

## Pendências externas
- Resposta formal e afirmativa do Strava para recompensas, retenção e cobrança.
- Registro da aplicação Strava, Client ID e Client Secret em cofre apropriado, callback e revisão de limites (modalidade inicial é single-player, em seguida até 10 atletas; expansão adicional exige review).
- Definir quais modalidades valem pontos (corrida, caminhada, ciclismo etc.) e pontos por km.
- Conferir integração Hotmart/condição de assinatura sem violar a política de cobrança de funcionalidades Strava.

**Não contornar as restrições por scraping, extração de páginas, credenciais dos alunos, exportação automática informal ou API de terceiros não autorizada.** Se o caso de uso for negado, estudar fonte de atividades própria e consentida do NPV, independente dos dados Strava.

## Execução complementar — 18/10/2026 (configuração independente)
- Criado componente de administração `src/ClubeKmSetup.jsx` com edição de **pontos por km** e modalidades (corrida, caminhada, bicicleta), mais prévia calculada exclusivamente com quilômetros fictícios.
- Integrado à visão geral **somente do administrador** na branch `feat/npv-strava-foundation-20261018`. Site principal (`main`) permanece intocado.
- Criada e aplicada no projeto **Clube NPV** (ref `dnlyfwcrfocgafgfoyna`) a migração aditiva `clube_km_settings_preview_rules_20261018`, versionada em `clube/migrations/20261018_clube_km_settings.sql`.
- Confirmado `RLS ENABLED`, 2 políticas (leitura e edição pelo admin), `anon` sem privilégio, e sessão autenticada sem identidade de administrador retornando 0 linhas.
- Valor inicial: 1 ponto/km; corrida, caminhada e bicicleta. **Somente regra NPV**: nenhum crédito automático ou acesso a Strava é habilitado.
- Conferidos os números do banco após a migração: 19 eventos de pontos, 4 registros de resgate e 2 perfis (migração não os modificou).
- `.github/workflows/clube-km-rules.yml`: `node --test` rodando a cada alteração na branch/PR.
- **Situação de liberação:** apenas preview da Vercel e migração aditiva Supabase; PR #6 continua como rascunho, sem publicação no site oficial.

## Teste oficial de conta individual — rota preparada em 18/10/2026

Existe agora a função Vercel `GET /api/strava/pilot`, com o seguinte fluxo:
- Sem configuração, responde **503**, com mensagem clara, sem contatar Strava e sem modificar nada.
- Após configurar apenas no ambiente do servidor `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET` e `STRAVA_PILOT_CALLBACK_URL` (uma URL HTTPS terminando em `/api/strava/pilot`), redireciona o atleta para OAuth oficial do Strava pedindo somente `activity:read`.
- Callback exige `state` HMAC válido + cookie HttpOnly Secure SameSite=Lax com validade de 10 min, e verifica escopo concedido.
- Troca código diretamente no servidor. Consulta exclusivamente a conta que autorizou via `GET /api/v3/athlete/activities` com janela de 7 dias, 1 página de até 30 atividades.
- Exibe apenas data, esporte e quilômetros ao próprio atleta, em HTML com CSP restritiva; não retorna mapas, fotos, ID, token, nome, GPS ou outros dados de atleta.
- Não salva token nem atividade, não faz agregação mensal, não converte quilômetros em pontos e não chama nenhuma função do banco NPV.
- Testes em `api/strava/pilot.test.mjs` comprovam assinatura, expiração do state, cookie, seleção mínima dos campos, escape de HTML e falha segura sem as credenciais.

**Este teste não implementa a sincronização mensal de vários alunos**, que é outra fase e ainda depende do uso permitido de dados e armazenamento no programa de recompensas. Não requer o navegador TinyFish.

### Requisito externo inevitável
O Strava exige um **aplicativo desenvolvedor** registrado na conta, gerando Client ID e Client Secret; a sessão pessoal do site, isoladamente, não disponibiliza essas credenciais para a API. A configuração é feita em `https://www.strava.com/settings/api`; o segredo deve ser salvo somente no cofre/variáveis de servidor da Vercel, nunca no GitHub ou nesta conversa. O perfil de navegador criado no TinyFish não equivale à autenticação do app OAuth.

### Fontes
- Strava Developers: `https://developers.strava.com/docs/authentication/`
- Strava Developers: `https://developers.strava.com/docs/getting-started/`
- Strava Developers: `https://developers.strava.com/docs/reference/#api-Activities-getLoggedInAthleteActivities`

## Prévia pronta para o proprietário — 18/10/2026
- Página ilustrativa com dados fictícios para testar no celular: `/strava-preview.html` da branch `feat/npv-strava-foundation-20261018`.
- Alias **estável** da Vercel na prévia: `npv-site1-git-feat-npv-strava-fo-26f354-ferreiracmotas-projects.vercel.app`. A hospedagem usa autenticação Vercel na prévia; não publicar dados reais nessa página.
- Variável de ambiente `STRAVA_PILOT_CALLBACK_URL` já criada na **Vercel npv-site1**, somente no target Preview e limitada a esta branch, com URL `https://npv-site1-git-feat-npv-strava-fo-26f354-ferreiracmotas-projects.vercel.app/api/strava/pilot`.
- Preenchimento previsto na conta desenvolvedora Strava:
  - Nome: `Clube de Benefícios NPV`
  - Categoria: `Training` (Treinamento)
  - Website: `https://www.naopensevai.com`
  - Authorization Callback Domain: `npv-site1-git-feat-npv-strava-fo-26f354-ferreiracmotas-projects.vercel.app` (apenas domínio, sem protocolo/path)
  - Clube: opcional, `Não Pense, Vai!`, se disponível.
- O cadastro da aplicação Strava só pode ser feito na conta Strava autenticada do titular em `https://www.strava.com/settings/api`. Necessita assinatura Strava.
- Duas variáveis ainda pendentes: `STRAVA_CLIENT_ID` e `STRAVA_CLIENT_SECRET` em Vercel **somente Preview e a branch**. Secret jamais no chat, GitHub ou browser bundle. Reimplantar após configurar variáveis.
- Para transição a domínio público e inclusão dos demais alunos, revisar callback domínio e limites da API, segredos e política; não implantar em produção com as credenciais da prévia.
