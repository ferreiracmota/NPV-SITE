/*
 * Registro editorial de versões do NPV (administrativo).
 * As versões visuais são referências de projeto, atualizadas manualmente ao aprovar um ciclo.
 * O identificador da publicação do site é injetado automaticamente pelo Vite no build.
 * Nunca inserir credenciais, informações de alunos ou métricas reais neste arquivo.
 */
export const NPV_RELEASES = Object.freeze([
  {
    id: 'clube',
    title: 'Clube de Benefícios',
    version: '2.1.1',
    versionKind: 'Versão visual aprovada',
    date: '19/10/2026',
    description: 'Área exclusiva para alunos e administração de benefícios do Não Pense, Vai!. A interface v2.1.1 é a referência visual atual; melhorias funcionais posteriores não alteram automaticamente essa numeração.',
    features: [
      'Login e perfis protegidos pelo Supabase, com área do aluno e painel administrativo.',
      'Saldo de pontos, extrato de movimentações e regras de pontuação configuráveis.',
      'Corridas e caminhadas consultadas no Strava, com acompanhamento de quilômetros e desafios.',
      'Catálogo de recompensas, resgates sujeitos à aprovação e benefícios de parceiros.',
      'Consulta administrativa de assinaturas Hotmart e vínculos confirmados, sem conceder pontos automaticamente.'
    ],
    history: [
      { date: '21/10/2026', text: 'Integração administrativa Hotmart somente leitura e verificação de vínculos.' },
      { date: '20/10/2026', text: 'Refinos do painel de benefícios, atividades e termos do Clube.' },
      { date: '19/10/2026', text: 'Referência visual v2.1.1 para desktop e celular.' }
    ]
  },
  {
    id: 'widget',
    title: 'Widget do Clube',
    version: '2.1.1',
    versionKind: 'Versão visual de referência',
    date: '20/10/2026',
    description: 'Mini painel flutuante na home do site, independente da área autenticada. A versão de referência descreve o visual aprovado; a configuração publicada pode variar sem mudar o código.',
    features: [
      'Widget flutuante e responsivo que acompanha a rolagem.',
      'Acabamento Clear Smoked Glass: vidro fumê, leve transparência e desfoque.',
      'Mensagens de apresentação no modo compacto e expansão para ranking demonstrativo.',
      'Vitrine de recompensas e parceiros; ranking ilustrativo, sem expor dados reais dos alunos.',
      'Painel administrativo para ativar, ocultar, ajustar visual e publicar informações do widget.'
    ],
    history: [
      { date: '20/10/2026', text: 'Consolidação visual v2.1.1 e editor administrativo do widget.' }
    ]
  },
  {
    id: 'site',
    title: 'Site Não Pense, Vai!',
    version: '2.1.1',
    versionKind: 'Versão de referência aprovada',
    date: '22/10/2026',
    description: 'Site institucional e de apresentação da plataforma Não Pense, Vai!. Após as correções e melhorias aprovadas, a referência do site foi alinhada à v2.1.1 do Clube e do widget. O commit técnico continua identificando cada publicação.'
    features: [
      'Página inicial responsiva com vídeos de fundo específicos para desktop e celular.',
      'Apresentação das trilhas de treinos, benefícios e acesso à compra pela Hotmart.',
      'Carrossel de marcas parceiras e conteúdo institucional.',
      'Acesso ao Clube de Benefícios, com termos e política de privacidade.',
      'Identificação automática do build, data de compilação e commit da publicação exibida.'
    ],
    history: [
      { date: '22/10/2026', text: 'Versão de referência do site alinhada à v2.1.1 do Clube e do widget.' },
      { date: '21/10/2026', text: 'Publicação da integração Hotmart na administração do Clube (PR #18).' }
    ]
  }
])
