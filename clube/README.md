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
