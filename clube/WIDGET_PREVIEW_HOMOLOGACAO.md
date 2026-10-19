# Widget do site NPV — homologação isolada

## Checkpoint
- Versão visual aprovada: branch `checkpoint/widget-aprovado-20261019`
- Branch de desenvolvimento: `preview/clube-npv-widget-glass-20261019`
- Nunca realizar merge em `main` sem autorização expressa.

## Banco, escopos e segurança
- Supabase do site oficial e do Preview é o mesmo projeto (`dnlyfwcrfocgafgfoyna`).
- Migração aditiva: `20261019_clube_widget_preview_isolado.sql`.
- Tabela `public.clube_site_widget_settings`, com `scope='preview'`, `draft` e `published`; sem registro ou publicação de `production`.
- RLS: SELECT/INSERT/UPDATE do rascunho exclusivamente para `clube_is_admin()`; sem DELETE; visitantes não recebem permissão de SELECT.
- RPC `clube_site_widget_public('preview')`: retorno sanitizado exclusivamente de `published`, ranking demonstrativo e campos públicos de prêmios/parceiros selecionados; nunca retorna rascunho nem perfis/pontos reais.
- `clube_site_widget_public('production')` retorna NULL até homologação/migração explícita.
- O domínio oficial resolve `WIDGET_SCOPE='production'`; previews *.vercel.app usam `preview`. A leitura é isolada mesmo em caso de erro humano durante o merge.
- Upload de avatar/logo no bucket público existente `clube-npv-recompensas`, restrito por política de INSERT do administrador e formatos JPG/PNG/WebP até 4 MB. As imagens não contêm dados reais de alunos.

## Painel
Entre no Clube com usuário administrador, acesse **Widget do site** no menu lateral, edite ranking fictício, parceiros e recompensas, envie avatar/logo e ajuste cores. Confira a prévia embutida. Clique **Salvar rascunho** para salvar sem alterar o widget público de teste ou **Publicar no Preview** para liberar uma versão atômica ao visitante, sem novo deploy de código. A home consulta o Supabase a cada 60 segundos (ou no reload). O comando Desativar somente vale no Preview depois de publicado.

## Condições de aceite (a verificar com sessão real)
- Login administrador no Preview e opção Widget do site visível; usuários normais não recebem a seção.
- Rascunho não afeta visitante; publicação atualiza o widget; desativação o oculta e reativação mostra novamente.
- Ranking de três nomes e pontos exclusivamente fictícios, avatares/identificador exemplo mantidos.
- Recompensas e parceiros selecionados usam a foto e o cadastro já existentes sem expor dados pessoais.
- Envio/substituição da logo e dos avatares, restrições de arquivo.
- Aparência padrão idêntica à do checkpoint no desktop e no mobile.
- Responsividade e expansão/fechamento/scroll desktop, iPhone e Android.
- Falha de Supabase não quebra a home.
- Deploy preview do commit final READY em `npv-site1` (possui variáveis publicáveis Supabase de ambiente preview) e URLs de home / e /clube; **não usar prévia antiga como se fosse nova**.

## Verificações concluídas
- GitHub Actions: compilação Vite completa na branch de teste.
- Políticas Supabase (RLS, anon sem tabela, admin permitido); testes SQL transacionais com rollback; zero registros persistentes de configuração de teste.
- Deploy de produção e branch main não alterados.
