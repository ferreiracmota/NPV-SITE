import './App.css'
import asset12 from './assets/544-2713.webp'
import asset13 from './assets/544-2715.webp'
import asset14 from './assets/544-2717.webp'
import asset15 from './assets/544-2719.webp'
import asset16 from './assets/544-2721.webp'
import asset47 from './assets/692-4129.webp'
import asset66 from './assets/647-3704.webp'
import asset67 from './assets/647-3709.webp'
import asset68 from './assets/647-3714.webp'
import asset69 from './assets/647-3719.webp'
import asset70 from './assets/647-3724.webp'
import asset72 from './assets/647-3837.webp'
import asset73 from './assets/647-3838.webp'
import asset74 from './assets/647-3839.webp'
import asset75 from './assets/647-3840.webp'
import asset76 from './assets/647-3841.webp'
import asset77 from './assets/647-3842.webp'
import logoNPV from './assets/logo-branca-npv.PNG'
import seloGarantia from './assets/Selo-de-Garantia-de-7-Dias-PNG-Transparente.png'
import antesDepois8 from "./assets/antes-depois8.PNG";
import antesDepois3 from "./assets/antes-depois3.JPG";
import antesDepois10 from "./assets/antes-depois10.JPG";
import antesDepois4 from "./assets/antes-depois4.PNG";
import antesDepois5 from "./assets/antes-depois5.JPG";
import antesDepois7 from "./assets/antes-depois7.JPG";
import antesDepois1 from "./assets/antes-depois1.JPG";
import antesDepois2 from "./assets/antes-depois2.JPG";
import antesDepois9 from "./assets/antes-depois9.JPG";
import antesDepois6 from "./assets/antes-depois6.JPG";
import parceiro1 from "./assets/Parceiro1.PNG";
import parceiro2 from "./assets/Parceiro2.PNG";
import parceiro3 from "./assets/Parceiro3.PNG";
import parceiro4 from "./assets/Parceiro4.PNG";
import parceiro5 from "./assets/Parceiro5.PNG";
import especialista1 from "./assets/Especialista1.PNG";
import especialista2 from "./assets/Especialista2.PNG";
import especialista3 from "./assets/Especialista3.PNG";
import especialista4 from "./assets/Especialista4.PNG";
import especialista5 from "./assets/Especialista5.PNG";
import videofundo1 from "./assets/videofundo1.MP4";
import sobremim from "./assets/sobre-mim.JPG";
import videofundomobile from "./assets/videofundomobile.MP4";
import modulo1        from './assets/modulo1.jpg'
import modulo2  from './assets/modulo2.jpg'
import modulo3       from './assets/modulo3.jpg'
import modulo4       from './assets/modulo4.jpg'
import modulo5     from './assets/modulo5.jpg'
import modulo6        from './assets/modulo6.jpg'
import modulo7      from './assets/modulo7.jpg'
import modulo8  from './assets/modulo8.jpg'
import modulo9      from './assets/modulo9.jpg'
import modulo10 from './assets/modulo10.jpg'
import modulo11      from './assets/modulo11.jpg'
import modulo12      from './assets/modulo12.png'

import React, { useState, useEffect, useRef } from 'react'

// Componente FAQItem
function FAQItem({ q, a, index }) {
  // 1) Começa FECHADO
  const [open, setOpen] = React.useState(false);

  // 2) Só para animar a entrada (fade/slide) quando aparece na tela
  const [visible, setVisible] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const io = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible(true),
      { rootMargin: "0px 0px -20% 0px", threshold: 0.1 }
    );
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  

  return (
    <div
      ref={ref}
      // Fade + slide-in apenas; NÃO abre o conteúdo
      className={`rounded-3xl bg-zinc-100 p-5 md:p-6 mb-4 md:mb-6
                  transition-all duration-500
                  ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
      style={{ transitionDelay: `${index * 120}ms` }}
    >
      <button
        type="button"
        className="w-full flex items-center justify-between text-left"
        aria-expanded={open}
        aria-controls={`faq-panel-${index}`}
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-lg font-semibold">{q}</span>
        <span className="text-sm leading-none">{open ? "▲" : ">"}</span>
      </button>

      {/* Contêiner colapsável: começa fechado (altura 0) */}
      <div
        id={`faq-panel-${index}`}
        className={`grid transition-all duration-300 ease-out ${
          open ? "grid-rows-[1fr] mt-3" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden text-gray-700 text-base">
          {a}
        </div>
      </div>
    </div>
  );
}





// Perguntas & respostas do FAQ
const faqs = [
  {
    q: "Como vou ter acesso aos Treinos?",
    a: "Após a compra ser confirmada você receberá um e-mail com o botão de login e senha para a área de membros onde terá acesso a todos os treinos."
  },
  {
    q: "Como vou poder tirar dúvidas?",
    a: "Você terá acesso ao Instagram exclusivo para alunos onde poderá tirar todas as dúvidas que surgirem."
  },
  {
    q: "Quanto tempo dura o Plano?",
    a: "Mensal: renova em 30 dias. Trimestral: renova em 3 meses a partir da compra. Pode cancelar quando quiser pelo e-mail naopensevai@gmail.com."
  },
  {
    q: "Como faço para cancelar?",
    a: "Envie um e-mail para naopensevai@gmail.com ou fale com nosso WhatsApp de suporte."
  },
  {
    q: "Os treinos têm data para serem alterados?",
    a: "As planilhas são alteradas a cada 5 semanas. A data fica no canto superior das planilhas em PDF."
  },
  {
    q: "Todos os exercícios têm vídeos das execuções?",
    a: "Sim. Você terá acesso aos vídeos das execuções e às planilhas caso queira imprimir."
  },
  {
    q: "Como vou saber qual o meu nível?",
    a: "Você verá os três níveis e poderá avaliar em qual se encaixa. Se não concluir as séries e repetições prescritas, você entrou em um nível acima."
  },
  {
    q: "Vou receber também dieta ou sugestão de suplementos?",
    a: "Você recebe orientações gerais e materiais complementares conforme seu plano e módulos disponibilizados."
  },
  {
    q: "Como o pagamento é feito?",
    a: "O pagamento é processado pela plataforma de checkout; após aprovado, o acesso é liberado automaticamente."
  }
];


function App() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0)
  const [email, setEmail] = useState('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isContactDropdownOpen, setIsContactDropdownOpen] = useState(false)

  // Carregar script do LightWidget
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://cdn.lightwidget.com/widgets/lightwidget.js'
    script.async = true
    document.head.appendChild(script)
    
    return () => {
      document.head.removeChild(script)
    }
  }, [])

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % 3) // 3 depoimentos
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  // Função para scroll suave até seção
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Dados editáveis do site
  const siteData = {
    topBanner: {
      text: "Acesse nossa plataforma / Encontre conteúdos incríveis"
    },
    hero: {
      title: "SEU CORPO DOS SONHOS",
      subtitle: "ESTÁ PRESTES",
      subtitle2: "A DECOLAR.",
      subtitle3: "EMBARQUE AGORA",
      subtitle4: "Treinos inteligentes com acompanhamento profissional para entregar resultados de verdade, no seu tempo e do seu jeito.",

      buttonText: "QUERO DECOLAR 🡢"
    },
    beforeAfter: [
      antesDepois1, antesDepois2, antesDepois3, antesDepois4, antesDepois5, antesDepois6, antesDepois7, antesDepois8, antesDepois9, antesDepois10
    ],
    team: {
  title: "UMA EQUIPE DE ESPECIALISTAS",
  members: [
    { photo: especialista1, name: "Carina Gomes", role: "Corredora" },
    { photo: especialista2, name: "Gabriel Ferreira", role: "Fisioterapeuta" },
    { photo: especialista3, name: "Denise Cunha",           role: "Nutricionista" },
    { photo: especialista4, name: "Jéssica Silva", role: "Psicóloga" },
    { photo: especialista5, name: "Carlos Ferreira", role: "Educador Físico" }
  ]
},
    partners: {
  title: "NOSSOS PARCEIROS",
  items: [
    { logo: parceiro1, link: "https://www.teste.com.br", coupon: "" },
    { logo: parceiro2, link: "https://www.teste.com.br", coupon: "NPV10" },
    { logo: parceiro3, link: "https://www.teste.com.br", coupon: "NPV15" },
    { logo: parceiro4, link: "https://www.teste.com.br", coupon: "" },
    { logo: parceiro5, link: "https://www.teste.com.br", coupon: "" }
  ]
}
,

    projects: {
      title: "BONUS DA PLATAFORMA",
      items: [modulo1, modulo2, modulo3, modulo4, modulo5, modulo6, modulo7, modulo8, modulo9, modulo10, modulo11,modulo12]

    },
    testimonials: [
      { image: asset66, name: "ALEX MARTINS", role: "PERSONAL TRAINER", text: "Transformação incrível! O programa mudou completamente minha vida e minha forma física." },
      { image: asset67, name: "KETLEN LARA", role: "", text: "Desde que comecei, não foi só o meu corpo que mudou, mas principalmente minha mentalidade. Tem sido incrível! 🤩💪" },
      { image: asset68, name: "ANA CLARA", role: "", text: "a plataforma é simplesmente maraaavilhosa, tem tudo!!" },
      { image: asset69, name: "JOÃO PEDRO", role: "EDUCADOR FÍSICO", text: "Superou todas as minhas expectativas. Equipe altamente qualificada." },
      { image: asset70, name: "ANA COSTA", role: "PERSONAL TRAINER", text: "Programa completo e eficiente. Mudou minha perspectiva sobre fitness." }
    ],
    plans: {
      title: <div className="text-center mt-0 mb-10">
  {/* Primeira linha */}
  <p className="font-extrabold tracking-tight leading-tight text-4xl md:text-6xl text-pink-500">
    VOCÊ É O AVIÃO
  </p>

  {/* Segunda linha */}
  <p className="mt-1 uppercase font-semibold tracking-widest text-xs md:text-sm text-gray-800">
    QUE ESTAVA FALTANDO NO TIME
  </p>

  {/* Terceira linha - com contorno */}
  <p className="mt-3 font-extrabold text-5xl md:text-7xl custom-outline">
    DECOLE AGORA!
  </p>

  {/* Quarta linha */}
  <p className="mt-2 text-base md:text-lg text-gray-900">
    <span className="font-bold">O corpo que você sonha</span>{" "}
    <span className="font-light">está logo ali.</span>
  </p>
</div>


,
      monthly: {
        title: "MENSAL",
        subtitle: "SEM FIDELIDADE",
        price: "R$ 39,90",
        features: [
          "Acesso completo à plataforma",
          "Materiais exclusivos",
          "Comunidade privada",
          "Dietas e E-book de receitas",
          "Bônus especiais"
        ]
      },
      quarterly: {
        title: "TRIMESTRAL",
        subtitle: "3 MESES",
        price: "R$ 3x33,30",
        originalPrice: "R$ 119,70",
        features: [
          "Acesso completo à plataforma",
          "Materiais exclusivos",
          "Comunidade privada",
          "Dietas e E-book de receitas",
          "Bônus especiais"
        ]
      }
      
    },
    instagram: {
      title: "SIGA-ME NO INSTAGRAM",
      handle: "@naopensevai",
      username: "naopensevai",
      posts: [asset72, asset73, asset74, asset75, asset76, asset77]
    },
    aboutMe: {
  title: "UM NOVO JEITO<br />DE EVOLUIR",
  photo: sobremim, // Placeholder - usuário pode trocar
  text: [
    "Com mais de 8 anos no mercado fitness e mais de 1.000 alunos já treinados, <strong>Carlos Ferreira</strong> sempre entendeu que <strong>resultados reais não vêm apenas de treinos</strong>. Eles acontecem quando o treino certo, com as combinações adequadas e o volume correto, se unem a uma mente saudável, a uma boa alimentação e ao cuidado com o corpo como um todo.",

    "Foi pensando nisso que nasceu a plataforma <strong>Não Pense, Vai!</strong>, um ambiente completo, criado para entregar tudo o que você precisa em um só lugar.",

    "Aqui, cada detalhe importa: treinos inteligentes, orientação prática e o suporte necessário para que você evolua de forma consistente, saudável e duradoura."
  ],
  sevenDaysBadge: asset47
},

    videoTestimonials: {
      title: "DEPOIMENTOS EM VÍDEO",
      subtitle: "Veja o que nossos alunos têm a dizer",
      videos: [
        {
          id: 1,
          thumbnail: asset12, // Placeholder
          videoUrl: "https://www.youtube.com/embed/OGPNZTdIhNw", // Depoimento 1
          title: "Depoimento 1"
        },
        {
          id: 2,
          thumbnail: asset13, // Placeholder
          videoUrl: "https://www.youtube.com/embed/gXlTq44dywk", // Depoimento 2
          title: "Depoimento 2"
        },
        {
          id: 3,
          thumbnail: asset14, // Placeholder
          videoUrl: "https://www.youtube.com/embed/mK9Y2uHvv-w", // Depoimento 3
          title: "Depoimento 3"
        },
        {
          id: 4,
          thumbnail: asset15, // Placeholder
          videoUrl: "https://www.youtube.com/embed/5hQ0JZ65j0k", // Depoimento 4
          title: "Depoimento 4"
        }
      ]
    }
  }

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % siteData.testimonials.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [siteData.testimonials.length])

  // Handle email subscription
  const handleEmailSubmit = (e) => {
    e.preventDefault()
    if (email) {
      alert(`Obrigado! Você será notificado no e-mail: ${email}`)
      setEmail('')
    }
  }

  return (
    <div className="min-h-screen bg-black text-white font-inter">
      {/* Top Banner Animado */}
<div className="bg-[#AFCB21] text-black py-2 overflow-hidden">
  <div className="inline-flex animate-marquee">
    {/* Cópia 1 */}
    <span className="text-sm font-medium px-4">
      {siteData.topBanner.text} • {siteData.topBanner.text} • {siteData.topBanner.text}
    </span>
    {/* Cópia 2 (para loop contínuo) */}
    <span className="text-sm font-medium px-4" aria-hidden="true">
      {siteData.topBanner.text} • {siteData.topBanner.text} • {siteData.topBanner.text}
    </span>
  </div>
</div>


      {/* Header */}
<header className="bg-black border-b border-gray-800 sticky top-0 z-50">
  <div className="container mx-auto px-4 py-1">
    {/* MOBILE = grid 3 colunas | DESKTOP = flex padrão */}
    <div className="grid grid-cols-3 items-center md:flex md:items-center md:justify-between">
      
      {/* ESQUERDA (logo) */}
      <div className="justify-self-start flex items-center">
        <img src={logoNPV} alt="Não Pense, Vai" className="h-12" />
      </div>

      {/* CENTRO (hambúrguer) — só MOBILE */}
      <button
        type="button"
        onClick={() => setIsMenuOpen((v) => !v)}
        aria-label="Abrir menu"
        className="md:hidden justify-self-center inline-flex items-center p-2 text-white"
      >
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
          <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>

      {/* DIREITA (botão) — só MOBILE */}
      <a
        href="https://sso.hotmart.com/login?service=https%3A%2F%2Fsso.hotmart.com%2Foauth2.0%2FcallbackAuthorize%3Fclient_id%3Db432cdd3-eb60-46bd-892b-5b450a65153e%26redirect_uri%3Dhttps%253A%252F%252Fhotmart.com%252Fen%252Fclub%252Fnaopensevai%252Fauth%252Flogin%253Frealm%253Dclub%26response_type%3Dcode%26response_mode%3Dquery%26client_name%3DCasOAuthClient"
        target="_blank"
        rel="noopener noreferrer"
        className="md:hidden justify-self-end inline-flex items-center rounded-md bg-[#AFCB21] px-3 py-1.5 text-black font-semibold text-xs hover:brightness-110 transition"
      >
        ÁREA DE ALUNOS
      </a>

      {/* DESKTOP: nav central + dropdown contato + botão à direita */}
      <div className="hidden md:flex items-center w-full">
        {/* NAV central */}
        <nav className="mx-auto flex gap-8">
          <button onClick={() => scrollToSection('inicio')} className="hover:text-[#AFCB21] transition-colors">INÍCIO</button>
          <button onClick={() => scrollToSection('about-section')} className="hover:text-[#AFCB21] transition-colors">SOBRE</button>
          <button onClick={() => scrollToSection('planos')} className="hover:text-[#AFCB21] transition-colors">PLANOS</button>

          {/* Dropdown Contato (mantido) */}
          <div className="relative">
            <button
              onClick={() => setIsContactDropdownOpen(!isContactDropdownOpen)}
              className="hover:text-[#AFCB21] transition-colors flex items-center"
            >
              CONTATO
              <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {isContactDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
                <div className="p-4">
                  {/* E-mail */}
                  <div className="flex items-center mb-3">
                    <svg className="w-5 h-5 text-[#AFCB21] mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884l8 4.8 8-4.8A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4.8-8-4.8V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                    <a href="mailto:naopensevai@gmail.com" className="text-white hover:text-pink-500">
                      naopensevai@gmail.com
                    </a>
                  </div>

                  {/* WhatsApp */}
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-[#AFCB21] mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 3a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H3a1 1 0 01-1-1V3zM3 7h2a1 1 0 011 1v2a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1zm0 4h2a1 1 0 011 1v2a1 1 0 01-1 1H3a1 1 0 01-1-1v-2a1 1 0 011-1zm4-8h2a1 1 0 011 1v2a1 1 0 01-1 1H7a1 1 0 01-1-1V3a1 1 0 011-1z" />
                    </svg>
                    <a 
                      href="https://wa.me/5531972158847?text=Ol%C3%A1%2C%20quero%20saber%20mais%20sobre%20a%20plataforma%20de%20treino%20da%20N%C3%A3o%20Pense%20Vai." 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-white hover:text-pink-500"
                    >
                      (31) 97215-8847
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Botão ÁREA DE ALUNOS (só DESKTOP) */}
        <a 
          href="https://sso.hotmart.com/login?service=https%3A%2F%2Fsso.hotmart.com%2Foauth2.0%2FcallbackAuthorize%3Fclient_id%3Db432cdd3-eb60-46bd-892b-5b450a65153e%26redirect_uri%3Dhttps%253A%252F%252Fhotmart.com%252Fen%252Fclub%252Fnaopensevai%252Fauth%252Flogin%253Frealm%253Dclub%26response_type%3Dcode%26response_mode%3Dquery%26client_name%3DCasOAuthClient"
          target="_blank" 
          rel="noopener noreferrer"
          className="ml-4 hidden md:inline-flex items-center rounded-md bg-[#AFCB21] px-4 py-2 text-black font-semibold hover:brightness-110 transition"
        >
          ÁREA DE ALUNOS
        </a>
      </div>
    </div>
  </div>

  {/* MENU MOBILE (mantido) */}
  {isMenuOpen && (
    <div className="md:hidden bg-black border-t border-gray-800">
      <nav className="flex flex-col space-y-4 p-4">
        <button onClick={() => scrollToSection('inicio')} className="text-left hover:text-[#AFCB21] transition-colors">INÍCIO</button>
        <button onClick={() => scrollToSection('sobre')} className="text-left hover:text-[#AFCB21] transition-colors">SOBRE</button>
        <button onClick={() => scrollToSection('planos')} className="text-left hover:text-[#AFCB21] transition-colors">PLANOS</button>

        {/* Dropdown CONTATO (mantido) */}
        <div className="relative">
          <button
            onClick={() => setIsContactDropdownOpen((v) => !v)}
            className="hover:text-[#AFCB21] transition-colors flex items-center"
          >
            CONTATO
            <svg className="w-4 h-4 ml-1 fill-current" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414L10 13.414 5.293 8.707a1 1 0 010-1.414z" />
            </svg>
          </button>

          {isContactDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 p-4">
              <a
                href="mailto:naopensevai@gmail.com"
                className="flex items-center gap-2 text-white hover:text-[#AFCB21] transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2.94 6.34l6.47 4.04c.37.23.83.23 1.2 0l6.47-4.04A2 2 0 0016.76 5H3.24a2 2 0 00-.3 1.34z" />
                  <path d="M17 7.76l-5.74 3.59a3 3 0 01-3.12 0L2.4 7.76V14a2 2 0 002 2h10.8a2 2 0 002-2V7.76z" />
                </svg>
                <span>naopensevai@gmail.com</span>
              </a>

              <a
                href="https://wa.me/5531972158847?text=Ol%C3%A1%2C%20quero%20saber%20mais%20sobre%20a%20plataforma%20de%20treino%20da%20N%C3%A3o%20Pense%20e%20Vai."
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center gap-2 text-white hover:text-[#AFCB21] transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.52 3.48A11.94 11.94 0 0012.06 0C5.45 0 .1 5.35.1 11.96c0 2.11.55 4.17 1.59 5.98L0 24l6.24-1.63a11.93 11.93 0 005.82 1.49h.01c6.61 0 11.96-5.35 11.96-11.96 0-3.2-1.25-6.21-3.51-8.42zM12.06 21.9h-.01a9.93 9.93 0 01-5.04-1.37l-.36-.21-3.7.97.99-3.61-.23-.37a9.92 9.92 0 01-1.51-5.35C2.2 6.45 6.5 2.15 12.06 2.15c2.64 0 5.13 1.03 7 2.9a9.83 9.83 0 012.95 7c0 5.56-4.3 9.85-9.95 9.85zm5.77-7.43c-.31-.16-1.82-.9-2.1-1-.28-.1-.48-.16-.69.16-.2.31-.79 1-.97 1.2-.18.21-.36.23-.67.08-.31-.16-1.3-.48-2.48-1.53-.92-.82-1.54-1.84-1.72-2.15-.18-.31-.02-.48.13-.63.14-.14.31-.36.46-.54.16-.18.21-.31.31-.51.1-.21.05-.39-.02-.55-.08-.16-.69-1.65-.95-2.26-.25-.61-.51-.52-.69-.52-.18 0-.39-.02-.6-.02-.21 0-.55.08-.84.39-.28.31-1.1 1.08-1.1 2.63 0 1.55 1.13 3.05 1.29 3.26.16.21 2.23 3.4 5.4 4.76.76.33 1.36.52 1.83.67.77.25 1.47.21 2.02.13.62-.09 1.82-.74 2.08-1.45.26-.71.26-1.32.18-1.45-.08-.13-.28-.21-.59-.37z" />
                </svg>
                <span>(31) 97215-8847</span>
              </a>
            </div>
          )}
        </div>
      </nav>
    </div>
  )}
</header>

      {/* Hero Section */}
<section
  id="inicio"
  className="relative min-h-[90svh] md:min-h-[100svh] flex items-start md:items-center justify-center overflow-hidden"
>
  {/* Vídeo de fundo (desktop + mobile) */}
  <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
    {/* Desktop / tablet (>= md) */}
    <video
      className="hidden md:block w-full h-full object-cover"
      src={videofundo1}
      muted
      playsInline
      autoPlay
      loop
      preload="auto"
    />
    {/* Mobile (< md) */}
    <video
      className="md:hidden w-full h-full object-cover"
      src={videofundomobile}
      muted
      playsInline
      autoPlay
      loop
      preload="auto"
    />
  </div>

{/* Logos por cima do vídeo – topo da hero */}
<div
  className="
    absolute left-1/2 -translate-x-1/2
    top-2 md:top-3          /* ajuste fino da distância do topo */
    z-40                     /* abaixo do header (z-50), acima do vídeo */
    flex items-center gap-4 md:gap-6
  "
>
  {siteData.partners.items.map((p, i) => (
    <a
      key={`hero-logo-${i}`}
      href={p.link}
      target="_blank"
      rel="noopener noreferrer"
      className="transition duration-300"
    >
      <img
  src={p.logo}
  alt={`Parceiro ${i + 1}`}
  className="
    h-7 md:h-10 object-contain
    filter brightness-0
    hover:brightness-100 hover:grayscale-0
    transition duration-300
  "
/>

    </a>
  ))}
</div>


  {/* Conteúdo por cima do vídeo */}
  <div className="relative z-10 text-center px-4 mt-60 md:mt-0">
    <h1 className="text-4xl md:text-6xl lg:text-6xl font-black leading-tight">
      <span className="text-white block animate-slide-up">{siteData.hero.title}</span>
      <span className="text-white block animate-slide-up animation-delay-200">{siteData.hero.subtitle}</span>
      <span className="text-pink-500 text-[55px] md:text-[90px] lg:text-8x1 font-black block drop-shadow-md animate-slide-up animation-delay-400">{siteData.hero.subtitle2}</span>
      <span className="text-white block animate-slide-up animation-delay-600">{siteData.hero.subtitle3}</span>
      <span className="text-xs sm:text-sm font-light text-white mt-2 block text-center">
  <span className="hidden sm:inline">
    Treinos inteligentes com acompanhamento profissional para entregar resultados de verdade, no seu tempo e do seu jeito.
  </span>
  <span className="sm:hidden">
    Treinos inteligentes com acompanhamento profissional para<br />
    entregar resultados de verdade, no seu tempo e do seu jeito.
  </span>
</span>

    </h1>

    {/* subtítulo curtinho */}
    <p className="text-white/80 text-base md:text-lg leading-relaxed max-w-md mx-auto mt-3">
      {siteData.hero.kicker}
    </p>

    {/* Botão */}
    <a
      href="https://pay.hotmart.com/N97646212X?off=xmopb4bq&hotfeature=518"
      target="_blank"
      rel="noopener noreferrer"
      className="block w-full max-w-md mx-auto text-center text-[20px] font-light text-white py-4 px-6 rounded-lg bg-[#AFCB21] glow-button mt-10"
    >

      QUERO DECOLAR ➜
    </a>
  </div>
</section>

      {/* Before/After Section */}
      <section id="sobre" className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 text-[#AFCB21]">ANTES E DEPOIS</h2>
            <p className="text-gray-900">Veja as transformações reais dos nossos alunos</p>
          </div>
          
          {/* Carrossel horizontal de transformações */}
          <div className="relative overflow-hidden">
  <div className="inline-flex w-max animate-scroll-horizontal gap-2 md:gap-2">
    {[...siteData.beforeAfter, ...siteData.beforeAfter].map((img, index) => (
      <div
  key={index}
  className="
    flex-shrink-0
    w-70 h-70            /* MOBILE: volta ao tamanho antigo (160x160) */
    sm:w-48 sm:h-48      /* tablet pequeno */
    md:w-80 md:h-80      /* desktop médio */
    lg:w-92 lg:h-92      /* desktop grande */
  "
>
  <img
    src={img}
    alt={`Transformação ${index + 1}`}
    className="w-full h-full object-cover rounded-lg shadow-2xl"
  />
</div>
    ))}
  </div>
</div>
          
          {/* Botão estratégico */}
          <div className="text-center mt-12">
            <a 
              href="https://pay.hotmart.com/N97646212X?off=xmopb4bq&hotfeature=51&_hi=eyJjaWQiOiIxNzIyODIwNDcyNDEyNTMxNzU1NzcyNjcyMDg0MzAwIiwiYmlkIjoiMTcyMjgyMDQ3MjQxMjUzMTc1NTc3MjY3MjA4NDMwMCIsInNpZCI6IjBlNDEwZGM1ZGExMTQ5YWRiY2ExOWYzYThhMzk0Y2JkIn0=.1757252754756&bid=1757252757439" 
              target="_blank"
      rel="noopener noreferrer"
      className="block w-full max-w-md mx-auto text-center text-[20px] font-light text-white py-4 px-6 rounded-lg bg-[#AFCB21] glow-button mt-7"
    >
              QUERO OS MESMOS RESULTADOS
            </a>
          </div>
        </div>
      </section>



{/* Projects Section (BÔNUS) */}
<section className="pt-12 pb-6 bg-gray-900">
  <div className="container mx-auto px-4 text-center">
    <h2 className="text-4xl font-bold mb-8">{siteData.projects.title}</h2>

    {/* grid dos cards */}
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-6">
      {siteData.projects.items.slice(0, 12).map((project, index) => (
        <div key={index} className="bg-black rounded-2xl overflow-hidden shadow-xl">
          <div className="relative w-full aspect-[3/4]">
            <img
              src={project}
              alt={`Bônus ${index + 1}`}
              className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
              draggable="false"
            />
          </div>
        </div>
      ))}
    </div>

    {/* Botão dentro da seção */}
    <div className="mt-8">
      <a
        href="https://pay.hotmart.com/N97646212X"
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full max-w-md mx-auto text-center text-[15px] font-light text-white py-4 px-6 rounded-lg bg-[#AFCB21] glow-button"
      >
        ACESSO TOTAL POR APENAS R$1,33/dia
      </a>
    </div>
  </div>
</section>

 {/* Team Section */}
<section className="py-12 bg-black">
  <div className="container mx-auto px-4 text-center">
    
    {/* UMA EQUIPE DE ESPECIALISTAS */}
    <h2 className="text-4xl font-bold mb-12 text-center">
      {siteData.team.title}
    </h2>

    <div className="grid grid-cols-2 gap-8 justify-items-center 
            md:flex md:flex-wrap md:justify-center md:gap-12">

      {siteData.team.members.map((m, index) => (
        <div
    key={index}
    className={
      "text-center group " +
      (index === siteData.team.members.length - 1
        ? "col-span-2 justify-self-center md:col-span-1" // centraliza a última no mobile
        : "")
    }
  >
          <img
            src={m.photo}
            alt={m.name}
            className="w-32 h-32 rounded-full mx-auto mb-3 object-cover group-hover:scale-110 transition-transform duration-300 shadow-lg"
          />
          <div className="leading-tight">
            <strong className="block">{m.name}</strong>
            <span className="block text-xs text-white/70">{m.role}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
</section>


      {/* Partners Section */}
      <section className="py-8 bg-gray-100">
        <div className="container mx-auto px-4">
          <h2
  className="
    text-4xl font-bold mb-6 text-center
    text-[#AFCB21]          /* mobile: cinza */
    md:text-[#AFCB21]      /* desktop: verde */
  "
>
  NOSSOS PARCEIROS
</h2>

{/* Carrossel horizontal de parceiros */}
<div className="relative overflow-hidden">
  <div className="inline-flex w-max items-center animate-scroll-horizontal partners-fast gap-8 md:gap-12">
    {[...siteData.partners.items, ...siteData.partners.items].map((p, index) => (
  <div key={index} className="group inline-flex shrink-0 flex-col items-center">
    <a href={p.link} target="_blank" rel="noopener noreferrer" className="group">
      <img
        src={p.logo}
        alt={`Parceiro ${index + 1}`}
        className="h-20 md:h-24 w-auto max-w-[160px] object-contain mx-auto transition duration-300 grayscale brightness-90 group-[:touched]:grayscale-0 group-[:touched]:brightness-100 md:group-hover:grayscale-0 md:group-hover:brightness-100"
      />
    </a>
    {p.coupon && (
      <span className="mt-1 text-[11px] text-black md:text-xs font-medium">
        CUPOM: {p.coupon}
      </span>
    )}
  </div>
))}
  </div>
</div>




        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-black">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-12">DEPOIMENTOS</h2>
          <div className="max-w-3xl mx-auto">
            <div className="relative bg-gray-900 rounded-2xl p-8 shadow-2xl">
              <img 
                src={siteData.testimonials[currentTestimonial].image} 
                alt={siteData.testimonials[currentTestimonial].name}
                className="w-24 h-24 rounded-full mx-auto mb-6 object-cover border-4 border-[#AFCB21]"
              />
              <blockquote className="text-lg text-gray-300 mb-6 italic">
                "{siteData.testimonials[currentTestimonial].text}"
              </blockquote>
              <h3 className="text-xl font-bold text-[#AFCB21] mb-2">
                {siteData.testimonials[currentTestimonial].name}
              </h3>
              <p className="text-gray-400">
                {siteData.testimonials[currentTestimonial].role}
              </p>
            </div>
            <div className="flex justify-center space-x-2 mt-8">
              {siteData.testimonials.map((_, index) => (
                <button
                  key={index}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentTestimonial ? 'bg-[#AFCB21] scale-125' : 'bg-gray-600 hover:bg-gray-500'
                  }`}
                  onClick={() => setCurrentTestimonial(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Plans Section */}
      <section id="planos" className="py-20 bg-gray-100">
  <div className="container mx-auto px-4">
    <h2 className="text-4xl font-bold text-center mb-12 text-[#AFCB21]">
      {siteData.plans.title}
    </h2>
    {/* ...grid dos cards... */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Plano Mensal */}
            <div className="bg-black border border-gray-700 rounded-lg p-8 text-center hover:scale-105 transition-transform duration-300 shadow-xl">
              <h3 className="text-2xl font-bold mb-2">{siteData.plans.monthly.title}</h3>
              <p className="text-gray-400 mb-6">{siteData.plans.monthly.subtitle}</p>
              <div className="text-4xl font-bold text-[#AFCB21] mb-6">{siteData.plans.monthly.price}</div>
              <ul className="text-left mb-8 space-y-3">
                {siteData.plans.monthly.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <span className="text-[#AFCB21] mr-3 text-xl">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <a 
                href="https://pay.hotmart.com/N97646212X?off=xmopb4bq&hotfeature=51&_hi=eyJjaWQiOiIxNzIyODIwNDcyNDEyNTMxNzU1NzcyNjcyMDg0MzAwIiwiYmlkIjoiMTcyMjgyMDQ3MjQxMjUzMTc1NTc3MjY3MjA4NDMwMCIsInNpZCI6IjBlNDEwZGM1ZGExMTQ5YWRiY2ExOWYzYThhMzk0Y2JkIn0=.1757252754756&bid=1757252757439" 
                target="_blank"
      rel="noopener noreferrer"
      className="block w-full max-w-md mx-auto text-center text-[20px] font-light text-white py-4 px-6 rounded-lg bg-[#AFCB21] glow-button mt-7"
    >
                ASSINAR AGORA
              </a>
            </div>

            {/* Plano Trimestral */}
            <div className="bg-[#AFCB21] text-black rounded-lg p-8 text-center relative hover:scale-105 transition-transform duration-300 shadow-xl">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-black text-[#AFCB21] px-4 py-1 rounded text-sm font-bold">
                MAIS POPULAR
              </div>
              <h3 className="text-2xl font-bold mb-2">{siteData.plans.quarterly.title}</h3>
              <p className="text-gray-800 mb-6">{siteData.plans.quarterly.subtitle}</p>
              <div className="mb-6">
                <div className="text-4xl font-bold mb-2">{siteData.plans.quarterly.price}</div>
                <div className="text-sm text-gray-700 line-through">{siteData.plans.quarterly.originalPrice}</div>
              </div>
              <ul className="text-left mb-8 space-y-3">
                {siteData.plans.quarterly.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <span className="text-black mr-3 text-xl">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <a 
                href="https://pay.hotmart.com/N97646212X?off=xmopb4bq&hotfeature=51&_hi=eyJjaWQiOiIxNzIyODIwNDcyNDEyNTMxNzU1NzcyNjcyMDg0MzAwIiwiYmlkIjoiMTcyMjgyMDQ3MjQxMjUzMTc1NTc3MjY3MjA4NDMwMCIsInNpZCI6IjBlNDEwZGM1ZGExMTQ5YWRiY2ExOWYzYThhMzk0Y2JkIn0=.1757252754756&bid=1757252757439" 
                target="_blank"
      rel="noopener noreferrer"
      className="block w-full max-w-md mx-auto text-center text-[20px] font-light text-white py-4 px-6 rounded-lg bg-black glow-button mt-7"
    >
                ASSINAR AGORA
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* About Me Section */}
      <section id="about-section" className="py-10 bg-black">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            {/* Foto à esquerda */}
            <div className="lg:w-1/2 flex item-stretch">
              <img
  src={siteData.aboutMe.photo}
  alt="Sobre mim"
  className="w-full h-96 md:h-[45rem] object-cover md:object-top rounded-lg shadow-2xl"
/>
            </div>
            
            {/* Texto à direita */}
            <div className="lg:w-1/2">
              <h2
  className="text-3xl font-bold mb-6 text-[#AFCB21] text-center leading-snug"
  dangerouslySetInnerHTML={{ __html: siteData.aboutMe.title }}
/>


{Array.isArray(siteData.aboutMe.text) &&
  siteData.aboutMe.text.map((paragraph, index) => (
    <p
  key={index}
  className="text-lg text-gray-300 leading-relaxed mb-4"
  dangerouslySetInnerHTML={{ __html: paragraph }}
/>

  ))
}
              {/*<a 
                href="https://pay.hotmart.com/N97646212X?off=xmopb4bq&hotfeature=51&_hi=eyJjaWQiOiIxNzIyODIwNDcyNDEyNTMxNzU1NzcyNjcyMDg0MzAwIiwiYmlkIjoiMTcyMjgyMDQ3MjQxMjUzMTc1NTc3MjY3MjA4NDMwMCIsInNpZCI6IjBlNDEwZGM1ZGExMTQ5YWRiY2ExOWYzYThhMzk0Y2JkIn0=.1757252754756&bid=1757252757439" 
                target="_blank"
      rel="noopener noreferrer"
      className="block w-full max-w-md mx-auto text-center text-[20px] font-light text-white py-4 px-6 rounded-lg bg-[#AFCB21] glow-button mt-7"
    >
                COMEÇAR AGORA
              </a> */}
            </div>
          </div>
        </div>
      </section>

      {/* Video Testimonials Section */}
      <section className="py-20 bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">{siteData.videoTestimonials.title}</h2>
            <p className="text-gray-400 text-lg">{siteData.videoTestimonials.subtitle}</p>
          </div>
          
          {/* Grid de vídeos - 4 vídeos na vertical (MOBILE) */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-10">
  {siteData.videoTestimonials.videos.map((video) => (
    <div
      key={video.id}
      className="relative w-full aspect-[9/16] overflow-hidden rounded-lg bg-black"
    >
      <iframe
        src={video.videoUrl}               // ideal: URL /embed/… (ex.: https://www.youtube.com/embed/ID)
        title={video.title}
        className="absolute inset-0 w-full h-full block"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
        allowFullScreen
      />
    </div>
  ))}
</div>

          
          {/* CTA após vídeos */}
          <div className="text-center mt-12">
            <a 
              href="https://pay.hotmart.com/N97646212X?off=xmopb4bq&hotfeature=51&_hi=eyJjaWQiOiIxNzIyODIwNDcyNDEyNTMxNzU1NzcyNjcyMDg0MzAwIiwiYmlkIjoiMTcyMjgyMDQ3MjQxMjUzMTc1NTc3MjY3MjA4NDMwMCIsInNpZCI6IjBlNDEwZGM1ZGExMTQ5YWRiY2ExOWYzYThhMzk0Y2JkIn0=.1757252754756&bid=1757252757439" 
              target="_blank"
      rel="noopener noreferrer"
      className="block w-full max-w-md mx-auto text-center text-[20px] font-light text-white py-4 px-6 rounded-lg bg-[#AFCB21] glow-button mt-7"
    >
              QUERO TER ESSES RESULTADOS
            </a>
          </div>
        </div>
      </section>

      {/* Guarantee Seal Section */}
<section className="py-16 bg-black">
  <div className="container mx-auto px-4">
    {/* Mobile: coluna; Desktop: linha centralizada e com gap menor */}
    <div className="flex flex-col items-center gap-8 lg:flex-row lg:justify-center lg:gap-8">
      
      {/* Selo — mobile centralizado; desktop mantém tamanho e efeito */}
      <div>
        <img
          src={seloGarantia}
          alt="Garantia de 7 Dias"
          className="mx-auto lg:mx-0 w-60 md:w-40 mb-4 hover:scale-110 transition-transform duration-300"
        />
      </div>

      {/* Texto — mobile centralizado; desktop alinhado à esquerda */}
      <div className="text-center lg:text-left max-w-prose">
        <h2 className="text-2xl md:text-4xl font-bold text-[#AFCB21]">
          <p>ENTRE DE CABEÇA</p> 
          <p>POR 7 DIAS</p>
        </h2>
        <div className="text-base md:text-lg text-gray-300 leading-relaxed space-y-4">
  <p className="mt-4"><strong>Se não sentir diferença, o risco é todo nosso.</strong></p>
  <p>
    Durante <strong>7 dias você treina de verdade</strong>, aproveita todos os recursos e
    descobre como a nossa plataforma pode transformar seus resultados.
  </p>
  <p>
    E se achar que não é pra você 👉 <strong>cancelamos e devolvemos 100% do valor, sem desculpas.</strong>
  </p>
  <p>⚡ <strong>Zero burocracia. Zero pegadinha. Só resultado.</strong></p>
  <p>Porque acreditamos no que entregamos.</p>
</div>

      </div>

    </div>
  </div>
</section>

  <div className="min-h-screen bg-black text-white font-inter">
    {/* ... aqui vem o banner, header, seções ... */}

    {/* FAQ Section */}
    <section id="faq" className="py-16 bg-zinc-50 text-black">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">
          Possui alguma dúvida?
        </h2>

        <div className="space-y-4">
          {faqs.map((item, i) => (
            <FAQItem key={i} q={item.q} a={item.a} index={i} />
          ))}
        </div>
      </div>
    </section>

      {/* Instagram Section */}
      <section className="py-20 bg-gray-800">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4 ">{siteData.instagram.title}</h2>
          <p className="text-[#AFCB21] text-xl mb-8">{siteData.instagram.handle}</p>
          
          {/* LightWidget Instagram Feed */}
          <div className="mb-8">
            <iframe 
              src="//lightwidget.com/widgets/2f1798ec8db754e1bbfa4b14196aaf6c.html" 
              className="lightwidget-widget w-full border-0 overflow-hidden h-96"
              style={{ width: '100%', border: 0, overflow: 'hidden' }}
            />
          </div>
          
          <div className="mt-8">
            <a 
              href="https://instagram.com/naopensevai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-full font-bold hover:scale-105 transition-transform duration-300"
            >
              Seguir no Instagram
            </a>
          </div>
        </div>
      </section>
  </div>


      {/* Footer */}
      <footer className="bg-black border-t border-gray-800 py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="mb-4">
            <img src={logoNPV} alt="Não Pense, Vai" className="h-12 mx-auto" />
          </div>
          <p className="text-gray-400 mb-6">
            Transforme seus objetivos em algo real
          </p>
          <div className="flex justify-center space-x-6 mb-6">
            <a href="#" className="text-gray-400 hover:text-[#AFCB21] transition-colors">Política de Privacidade</a>
            <a href="#" className="text-gray-400 hover:text-[#AFCB21] transition-colors">Termos de Uso</a>
            <a href="#" className="text-gray-400 hover:text-[#AFCB21] transition-colors">Suporte</a>
          </div>
          <p className="text-gray-500 text-sm">
            © 2025 Não Pense, Vai – Todos os direitos reservados
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App

