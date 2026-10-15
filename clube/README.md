# Clube NPV — piloto (outubro de 2026)

Projeto separado logicamente do site comercial **Não Pense, Vai!**.

## Como testar

Abra `/clube` na URL da prévia desta branch. Caso a hospedagem não encaminhe essa rota ao Vite, use `/?clube=1`.
A página inicial `/` continua mostrando o site comercial sem alterações.

### O que já é funcional na demonstração

- Alternar a visualização entre **administrador** e **aluno fictício**;
- Cadastrar alunos **fictícios**, consultar e pesquisar a lista;
- Registrar pontos por renovação, indicação, foto aprovada, desafio e aniversário;
- Fazer **ajustes manuais com justificativa** e impedir saldo negativo;
- Exibir histórico de eventos com datas e autoria implícita ao administrador simulado;
- Visualizar, como aluno, apenas o histórico de **um aluno de cada vez** na interface;
- Consultar totais no ano e simular uma futura área de recompensas;
- Editar pontuações fictícias sem recalcular o histórico já lançado;
- Persistir os dados **de demonstração somente no navegador** (localStorage);
- Restaurar os dados fictícios.

### Lojinha de recompensas (simulação)

- A home do aluno exibe 4 prêmios em destaque **abaixo das atividades e das dicas para acumular pontos**.
- A aba **Recompensas** apresenta o catálogo completo e o histórico de solicitações.
- Prêmios ilustrativos: camiseta, coqueteleira, kit snacks, hidratação e benefício de parceiro.
- Cada card mostra custo em pontos, quantidade disponível e saldo insuficiente, quando aplicável.
- O aluno simula **Solicitar resgate**. O pedido fica pendente, reservando pontos para outros pedidos.
- O administrador cria/edita nome, categoria, valor em pontos, estoque, ilustração e visibilidade.
- O administrador **aprova ou recusa** solicitações. Aprovação lança débito no extrato e diminui o estoque; recusa libera a reserva.
- Tudo continua armazenado localmente neste navegador, sem pedidos, cobranças, entregas ou compras reais.
- Os produtos descritos como "parceiros" são apenas **exemplos** e não representam acordos confirmados para troca de pontos.

**Antes de ativar resgates reais:** será necessário adicionar tabelas de prêmios e pedidos com políticas RLS ao Supabase,
aprovação atômica no servidor (protegendo saldo e estoque contra solicitações simultâneas), autenticação e trilha de auditoria.
O atual SQL `clube/schema.sql` cobre só perfis e lançamentos de pontos, não o backend da lojinha.

**ATENÇÃO:** esta é uma interface demonstrativa e NÃO há autenticação nem separação
de contas no servidor nesta fase. O seletor de modo/aluno serve apenas para visualizar
o projeto. Nunca inserir dados verdadeiros de alunos nem publicar como área privada.

## Próxima etapa: autenticação real

Recomendação: Supabase Auth (e-mail e senha, e-mail confirmado e recuperação de senha)
+ Postgres com Row Level Security. O arquivo `clube/schema.sql` prepara o modelo e
as políticas para que:
- cada aluno acesse apenas o próprio perfil/extrato;
- só usuários promovidos a administradores pelo proprietário possam ver todos os
  alunos e lançar pontos;
- alterações de saldo usem eventos auditáveis; correção = novo lançamento.

O SQL é inicial, não foi aplicado a projeto real. Deve ser revisado e testado
antes de migrar a interface para os dados reais. Não inserir chave secreta/service_role
em `src` ou em variáveis públicas VITE_.

Faltam decisões e dados do proprietário antes da ativação:
1. e-mail que terá permissão de administrador;
2. criação da conta/projeto Supabase no plano gratuito (ação na conta do proprietário);
3. sua tabela verdadeira de pontuação, regras de expiração/resgate e aprovações;
4. fluxo de convite/cadastro do aluno; confirmação e redefinição de senha;
5. política de dados e retenção para participantes, e testes de RLS com ao menos 2 contas.

### Hotmart
Neste piloto o administrador valida e lança pontos manualmente.
Automatização futura exige um endpoint seguro e verificação da origem/evento dos
webhooks de pagamento e renovação para não premiar pagamentos cancelados/duplicados.

## Publicação
Esta branch **não deve ser incorporada à main** até o usuário testar e aprovar
o protótipo, serem conectados backend/autenticação reais e feitas as verificações
de segurança, privacidade, recuperação de acesso e termos do Clube.

## Próxima fase preparada: acesso real com Supabase (ainda não ativado)

O protótipo agora contém, na mesma branch, um modo separado de funcionamento real:
- `src/clubeSupabase.js`: conexão pública Supabase somente quando há configuração;
- `src/ClubeNPVReal.jsx`: login por e-mail/senha, criação de conta, confirmação
  por e-mail, solicitação de recuperação e troca de senha, saída, e verificação
  de acesso aprovado;
- `clube/schema.sql`: banco, políticas RLS, funções de pontuação, resgates com
  reserva de saldo e aprovação atômica;
- o código da lojinha e do painel demonstração **não foi substituído**.

**Sem as variáveis Supabase, `/clube` continua mostrando somente a
demonstração fictícia**, inclusive após uma implantação. Nenhum login real foi
ativado. O Supabase ainda não foi conectado e nenhuma migração SQL foi aplicada.

### Conectar quando o responsável autorizar

1. Conectar uma conta Supabase e selecionar/criar um projeto **de teste**;
   confirmar preço e limites do plano antes de aceitar cobrança.
2. Abrir o SQL Editor protegido da conta e revisar/executar o script integral
   `clube/schema.sql` em um banco dedicado novo (não executar em outro banco
   existente sem comparar políticas e tabelas).
3. Em Authentication > Providers, habilitar e-mail/senha e **confirmação de
   e-mail**. Em URL Configuration, ajustar Site URL e Redirect URLs para a URL
   HTTPS exata da prévia Vercel, incluindo o caminho `/clube`. Configurar
   serviço de e-mail confiável para produção e revisar limites de envio.
4. Em Vercel > projeto > Environment Variables, adicionar somente ao ambiente
   **Preview** as duas variáveis do arquivo `clube/.env.example`:
   `VITE_CLUBE_SUPABASE_URL` e
   `VITE_CLUBE_SUPABASE_PUBLISHABLE_KEY`. Nunca colar `service_role`
   ou secret key no código, .env do GitHub ou variável que começa com `VITE_`.
5. Criar sua conta normalmente no formulário de login e confirmar o e-mail.
   O proprietário autoriza qual e-mail será promovido a administrador;
   só então adicionar a conta à tabela `clube_admins` via SQL Editor privado,
   conforme as instruções comentadas no final do `clube/schema.sql`.
6. Testar com duas contas reais de TESTE, com e-mails diferentes:
   um aluno pendente, um aluno aprovado e um administrador. Confirmar que cada
   aluno só lê seus registros e que requisições REST para criar/alterar pontos,
   aprovar resgates ou ativar o próprio perfil falham com usuário comum.
7. Testar os casos de segurança dos resgates: saldo menor que o preço;
   duas solicitações simultâneas; duas aprovações simultâneas; estoque zero;
   recusa; repetição de aprovação; tentativa de débito maior que saldo livre.
8. Revisar textos de privacidade e termos do clube e definir política de
   retenção, suporte, expiração anual e atendimento de pedidos de titulares.
9. Só depois da aprovação do proprietário publicar a área real e cadastrar
   alunos verdadeiros.

### Regras da operação

- **Cadastro:** o aluno cria a própria senha por e-mail e confirma a caixa.
  Seu perfil começa em `is_active=false` (pendente), mesmo após login.
- **Ativação:** administrador promove o aluno; nenhum formulário do usuário
  comum pode escrever `is_active` ou `clube_admins`.
- **Pontos:** apenas administrador lança, através da função transacional
  `clube_award_points`. O extrato é imutável: correção exige evento compensatório.
- **Lojinha:** o aluno solicita via `clube_request_reward`, que reserva pontos.
  O administrador aprova/recusa via `clube_decide_reward` — no servidor, com
  controle de estoque, saldo e bloqueios simultâneos. Não existem pedidos
  externos nem integração automática a entregas.
- **Ano:** a interface e as operações contabilizam pontos do ano corrente;
  pedidos pendentes de ano anterior exigem revisão manual.
- **Dados visíveis:** perfis e extratos do clube são protegidos por RLS.
  Não confiar na alternância visual do protótipo como autorização.

### Limitações antes de produção

Ainda precisamos de banco real conectado, e-mail do administrador,
teste das políticas no Supabase, confirmação de domínio da prévia e
validação do número esperado de alunos/lançamentos. A primeira interface
real busca até 2.000 lançamentos recentes e 1.000 solicitações;
antes de atingir esses volumes, implementar paginação/saldos calculados no
servidor para evitar totais incorretos. Não há envio automático de notificações
de aprovação ou integração Hotmart.
