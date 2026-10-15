# Revisão pré-publicação — Não Pense, Vai! (15/10/2026)

> Documento de QA da **versão de teste**. Não é autorização para publicar nem substituir a versão atual. PR #1 de teste mantém `main` intacta e deve continuar em rascunho.

## Código, identidade e navegação
- [x] Projeto React/Vite compila na Vercel (`npv-site` e `npv-site1`).
- [x] Sem links vazios `href="#"` e sem `target="_blank"` desacompanhado de `rel="noopener noreferrer"` nos links do App.
- [x] Mantidas identidade preto/verde-limão/rosa, texto da abertura e respiro mobile de 144 px.
- [x] Menu com estado acessível, Escape, links para seções; logo volta ao início.
- [x] Carrossel de resultados com rolagem vertical mobile preservada, controles teclado, pause fora da tela.
- [x] FAQ com comportamento acessível e link de atendimento.
- [x] Instagram sem dependência do LightWidget; perfil abre diretamente.
- [ ] Conferência visual real na prévia protegida por login (iPhone e desktop).
- [ ] Vídeo de fundo: arquivo preservado, mas reprodução não confirmada; deixado como pendência não prioritária a pedido do responsável.

## Hotmart — verificar na conta do produtor ANTES do merge
**Produto encontrado nos dois checkouts públicos:** Plataforma de Treino para Mulheres | Não Pense, Vai!

| Fluxo | URL vinculada | Valor do site (não modificado) | Resultado da consulta pública (locale em inglês) |
|---|---|---|---|
| Mensal | https://pay.hotmart.com/J102054674M?off=g64ryxgr&checkoutMode=10 | R$ 39,90 | US$ 9.00/mês, inglês |
| Trimestral | https://pay.hotmart.com/J102054674M?off=il6n3k8y&checkoutMode=10 | 3x de R$ 33,30 | US$ 22.00/trimestre, inglês |
| Área de alunos | Link SSO para Hotmart Club no código | — | Abriu tela de login, sem login autenticado |

- [ ] Confirmar nas ofertas Hotmart se os clientes no Brasil veem **BRL** e os valores corretos para cada oferta.
- [ ] Confirmar se trimestral é **parcelado em 3x** ou **cobrado em parcela única por trimestre**, e se renovação é trimestral.
- [ ] Corrigir na Hotmart a descrição do checkout trimestral **"ACESSO A PLATAFORMA | RENOVAÇÃO MENSAL AUTOMÁTICA"** se não refletir a oferta real.
- [ ] Confirmar login de aluno autenticado na Hotmart Club (sem realizar compra de teste nem pedir senha por chat).
- [ ] Confirmar e registrar regras de cancelamento, reembolso de 7 dias e validade da assinatura.
- [x] Site avisa para conferir moeda, valor final, parcelamento e periodicidade no checkout.
- [x] Nenhuma URL de compra, oferta ou valor contratual foi alterado nesta revisão.

## Links externos
- [x] Link do Cafezin Lounge abriu página Saipos.
- [x] Instagram Cia do Esporte abriu perfil público.
- [x] Link TFSports respondeu, mas redireciona para experiência/app TFSports e não comprova evento ainda ativo.
- [ ] Instagram NF Moda Fitness e Ciladas Burger: consultas externas sofreram timeout; revalidar manualmente. Não classificá-los como links quebrados sem evidência.

## Documentos legais e informações comerciais
- [x] Criada Política de Privacidade em `/politica-de-privacidade.html` com linguagem baseada na LGPD. **Pendente de conferência da identificação legal do controlador e dos tratamentos reais antes de publicar.**
- [x] Criados Termos de Uso em `/termos-de-uso.html` com vedação a compartilhar login e redistribuir materiais, impressão pessoal permitida e direitos do consumidor preservados. **Pendente de revisão final pelo responsável.**
- [ ] Alinhar as promessas atuais de garantia (incluindo "devolvemos 100%") com as condições reais da Hotmart e da legislação aplicável.
- [x] Rodapé da prévia aponta diretamente para as páginas legais criadas; site oficial ainda não foi alterado.
- [ ] Revisar com responsável o texto sobre renovação, acesso a conteúdos, suporte e frequência de alteração dos treinos.

## Critérios mínimos antes de publicar
1. Responsável confirma preços, moeda, parcelas e periodicidade na Hotmart para compradores do Brasil.
2. Checkout mensal, trimestral e área de alunos validados no navegador real, sem compra.
3. Textos legais criados na prévia, revisar identidade cadastral, práticas reais de dados e condições antes da aprovação/publicação.
4. Revisão visual em celular e desktop da versão de prévia.
5. Aprovação **expressa** do proprietário para publicação; só então avaliar merge de PR #1.
