import './App.css'
/* Vídeos versionados pelo Vite: urls produzidas junto com a compilação,
   sem depender de /public/videos, que pode não existir na implantação. */
import fundoDesktopVideo from './assets/videofundo1.MP4?url'
import fundoMobileVideo from './assets/videofundomobile.MP4?url'
/* Versão mobile H.264 silenciosa, criada a partir do vídeo original para Safari.
   A capa mantém a abertura bonita mesmo quando o navegador restringe autoplay. */
import fundoMobileIOSVideo from './assets/fundo-mobile-ios.mp4?url'
import fundoMobilePoster from './assets/fundo-mobile-poster.jpg?url'
import asset12 from './assets/544-2713.webp'
import asset13 from './assets/544-2715.webp'
import asset14 from './assets/544-2717.webp'
import asset15 from './assets/544-2719.webp'
import asset16 from './assets/544-2721.webp'
import asset47 from './assets/692-4129.webp'
import comentario1 from './assets/comentario1.webp'
import comentario2 from './assets/comentario2.webp'
import comentario3 from './assets/comentario3.webp'
import comentario4 from './assets/comentario4.webp'
import comentario5 from './assets/comentario5.webp'
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
import sobremim from "./assets/sobre-mim.JPG";
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
import modulo12      from './assets/modulo12.jpg'


import React, { useState, useEffect, useRef, useCallback } from 'react'

// ===== Componente Antes/Depois — autoplay + drag + retoma do ponto atual =====
function BeforeAfter({ slides = [] }) {
  const total = Math.max(slides.length, 1);

  // estado e refs
  const [index, setIndex] = useState(0);
  const railRef = useRef(null);
  const timerRef = useRef(null);
  const resumeRef = useRef(null);
  const isInViewRef = useRef(false);

  // drag
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const deltaXRef = useRef(0);

  // helpers
  const goTo = useCallback(
    (i) => setIndex(((i % total) + total) % total),
    [total]
  );

  // ===== Autoplay =====
  const AUTOPLAY_MS = 2000;   // tempo entre slides
  const RESUME_MS   = 2000;   // retoma depois dessa pausa ao soltar

  const startAutoplay = useCallback(() => {
    clearInterval(timerRef.current);
    if (document.hidden || !isInViewRef.current ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    timerRef.current = setInterval(() => {
      // loop infinito: do último vai pro primeiro
      setIndex((i) => (i + 1) % total);
    }, AUTOPLAY_MS);
  }, [total]);

  const stopAutoplay = useCallback(() => {
    clearInterval(timerRef.current);
    clearTimeout(resumeRef.current);
  }, []);

  const pauseThenResume = useCallback(() => {
    // pausa agora e agenda retomada; quando retomar,
    // continua a partir do índice ATUAL (não reinicia)
    stopAutoplay();
    resumeRef.current = setTimeout(startAutoplay, RESUME_MS);
  }, [startAutoplay, stopAutoplay]);

  // Gira somente quando o carrossel está visível. Economiza bateria e
  // respeita a opção do aparelho de reduzir movimentos.
  useEffect(() => {
    const rail = railRef.current;
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const visibilityChanged = () => {
      if (document.hidden) stopAutoplay();
      else startAutoplay();
    };
    const motionChanged = () => {
      if (motionPreference.matches) stopAutoplay();
      else startAutoplay();
    };
    let observer;
    if (typeof IntersectionObserver === 'function' && rail) {
      observer = new IntersectionObserver(([entry]) => {
        isInViewRef.current = entry.isIntersecting;
        if (entry.isIntersecting) startAutoplay();
        else stopAutoplay();
      }, { threshold: 0.1 });
      observer.observe(rail);
    } else {
      isInViewRef.current = true;
      startAutoplay();
    }
    document.addEventListener('visibilitychange', visibilityChanged);
    motionPreference.addEventListener?.('change', motionChanged);
    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', visibilityChanged);
      motionPreference.removeEventListener?.('change', motionChanged);
      stopAutoplay();
    };
  }, [startAutoplay, stopAutoplay]);

  // ===== Drag (mouse/touch) =====
  const getClientX = (e) =>
    e?.clientX ?? (e?.touches && e.touches[0]?.clientX) ?? 0;

  const onPointerDown = (e) => {
    draggingRef.current = true;
    startXRef.current = getClientX(e);
    deltaXRef.current = 0;
    // pausa enquanto o usuário interage
    stopAutoplay();
  };

  const onPointerMove = (e) => {
    if (!draggingRef.current) return;
    const x = getClientX(e);
    deltaXRef.current = x - startXRef.current;
  };

  const onPointerUp = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;

    const dx = deltaXRef.current;
    const THRESHOLD = 50; // px para considerar troca de slide

    if (dx < -THRESHOLD) goTo(index + 1); // arrastou pra esquerda → próximo
    else if (dx > THRESHOLD) goTo(index - 1); // arrastou pra direita → anterior
    // se não passou do limiar, mantém o índice atual

    // retoma o autoplay a partir do ÍNDICE ATUAL
    pauseThenResume();
  };

  // ===== Centralizar o slide atual movendo APENAS o trilho (não a página) =====
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const children = rail.children;
    if (!children || !children.length) return;

    const child = children[index % children.length];
    if (!child) return;

    const left = child.offsetLeft - (rail.clientWidth - child.clientWidth) / 2;

    // anima só o eixo X do trilho
    requestAnimationFrame(() => {
      rail.scrollTo({ left: Math.max(left, 0), behavior: "smooth" });
    });
  }, [index]);

  return (
    <div className="relative select-none touch-pan-y">
      <div
        ref={railRef}
        className="no-scrollbar flex overflow-x-auto snap-x scroll-smooth gap-3"
        tabIndex={0}
        role="region"
        aria-label="Resultados de alunos. Use as setas do teclado ou deslize para navegar."
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault()
            goTo(index + (event.key === 'ArrowRight' ? 1 : -1))
            pauseThenResume()
          }
        }}
        onMouseDown={onPointerDown}
        onMouseMove={onPointerMove}
        onMouseUp={onPointerUp}
        onMouseLeave={onPointerUp}
        onTouchStart={onPointerDown}
        onTouchMove={onPointerMove}
        onTouchEnd={onPointerUp}
        onTouchCancel={onPointerUp}
      >
        {slides.map((img, i) => (
          <div key={i} className="snap-center shrink-0" style={{ width: "80vw", maxWidth: 360 }}>
            {/* troque 'aspect-square' por 'aspect-[9/16]' se quiser vertical */}
            <div className="relative w-full aspect-square rounded-xl overflow-hidden shadow-md bg-black/10">
              <img
                src={img}
                alt={`Transformação ${i + 1}`}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
                draggable={false}
              />
            </div>
          </div>
        ))}
      </div>

      {/* paginação */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-2 flex gap-1.5">
        {slides.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full ${
              i === index ? "bg-neutral-800/80" : "bg-neutral-400/60"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ===== fim do componente =====


// Componente FAQItem
function FAQItem({ q, a, index }) {
  // 1) Começa FECHADO
  const [open, setOpen] = React.useState(false);

  // 2) Só para animar a entrada (fade/slide) quando aparece na tela
  const [visible, setVisible] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    // Se a animação não for suportada, as dúvidas continuam visíveis.
    if (typeof IntersectionObserver !== 'function' ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }
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
        className="w-full flex items-center justify-between gap-4 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#AFCB21]"
        id={`faq-question-${index}`}
        aria-expanded={open}
        aria-controls={`faq-panel-${index}`}
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-lg font-semibold">{q}</span>
        <svg aria-hidden="true" className={`h-5 w-5 shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* Contêiner colapsável: começa fechado (altura 0) */}
      <div
        id={`faq-panel-${index}`}
        role="region"
        aria-labelledby={`faq-question-${index}`}
        aria-hidden={!open}
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


const beforeAfterSlides = [
  antesDepois1, antesDepois2, antesDepois3, antesDepois4, antesDepois5,
  antesDepois6, antesDepois7, antesDepois8, antesDepois9, antesDepois10
];



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
    a: "O pagamento é processado pela Hotmart. Confira moeda, valor final, parcelamento e periodicidade da assinatura na página de pagamento antes de concluir a compra. Após a aprovação, o acesso é liberado pela plataforma."
  }
];


// Área do Aluno: preserva a plataforma de treinos na Hotmart e adiciona
// o Clube de Benefícios no mesmo domínio. Sem alterar a rota dos treinos.
const HOTMART_STUDENT_LOGIN = 'https://sso.hotmart.com/login?service=https%3A%2F%2Fsso.hotmart.com%2Foauth2.0%2FcallbackAuthorize%3Fclient_id%3Db432cdd3-eb60-46bd-892b-5b450a65153e%26redirect_uri%3Dhttps%253A%252F%252Fhotmart.com%252Fen%252Fclub%252Fnaopensevai%252Fauth%252Flogin%253Frealm%253Dclub%26response_type%3Dcode%26response_mode%3Dquery%26client_name%3DCasOAuthClient'
function StudentAccessMenu({mobile=false}) {
  return <details className={mobile?'relative md:hidden justify-self-end':'relative ml-4 hidden md:block'}>
    <summary aria-label="Abrir opções da Área do Aluno"
      className={mobile
        ? 'cursor-pointer list-none whitespace-nowrap rounded-md bg-[#AFCB21] px-2 sm:px-3 py-1.5 text-black font-semibold text-[10px] sm:text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'
        : 'cursor-pointer list-none whitespace-nowrap rounded-md bg-[#AFCB21] px-4 py-2 text-black font-semibold hover:brightness-110 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'}>
      ÁREA DE ALUNOS <span aria-hidden="true">⌄</span>
    </summary>
    <nav aria-label="Opções da Área do Aluno" className="absolute right-0 top-full z-[100] mt-2 w-64 overflow-hidden rounded-xl border border-[#3a4933] bg-[#141d15] p-2 shadow-2xl">
      <a href={HOTMART_STUDENT_LOGIN} target="_blank" rel="noopener noreferrer" className="block rounded-lg px-3 py-3 text-sm font-semibold text-white hover:bg-[#2e3c28] focus-visible:bg-[#2e3c28]">
        Meus treinos <span className="block pt-1 text-xs font-normal text-gray-300">Acessar a Hotmart ↗</span>
      </a>
      <a href="/clube" className="mt-1 block rounded-lg bg-[#AFCB21]/10 px-3 py-3 text-sm font-semibold text-[#C8E45C] hover:bg-[#AFCB21]/20 focus-visible:bg-[#AFCB21]/20">
        Clube de Benefícios NPV <span className="block pt-1 text-xs font-normal text-gray-200">Pontos e recompensas →</span>
      </a>
    </nav>
  </details>
}

function App() {
  const heroDesktopVideoRef = useRef(null)
  const heroMobileVideoRef = useRef(null)
  const [mobileVideoSource, setMobileVideoSource] = useState(fundoMobileIOSVideo)

  // Safari/iOS: vídeo sempre mudo, inline, com nova tentativa ao carregar,
  // voltar para a página ou interagir. Nenhum controle visual adicional.
  useEffect(() => {
    const resumeHeroVideo = () => {
      if (document.hidden) return
      const video = window.matchMedia('(min-width: 768px)').matches
        ? heroDesktopVideoRef.current
        : heroMobileVideoRef.current
      if (!video) return
      video.defaultMuted = true
      video.muted = true
      video.setAttribute('muted', '')
      video.setAttribute('playsinline', '')
      video.setAttribute('webkit-playsinline', '')
      if (!video.paused) return
      const attempt = video.play()
      if (attempt && typeof attempt.catch === 'function') {
        attempt.catch(() => {
          // O navegador pode proibir autoplay independentemente do código.
          // Nesse caso, a imagem de capa do próprio vídeo evita fundo preto.
        })
      }
    }
    resumeHeroVideo()
    document.addEventListener('visibilitychange', resumeHeroVideo)
    window.addEventListener('pageshow', resumeHeroVideo)
    window.addEventListener('focus', resumeHeroVideo)
    window.addEventListener('pointerdown', resumeHeroVideo, { passive: true })
    window.addEventListener('resize', resumeHeroVideo)
    return () => {
      document.removeEventListener('visibilitychange', resumeHeroVideo)
      window.removeEventListener('pageshow', resumeHeroVideo)
      window.removeEventListener('focus', resumeHeroVideo)
      window.removeEventListener('pointerdown', resumeHeroVideo)
      window.removeEventListener('resize', resumeHeroVideo)
    }
  }, [])

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isContactDropdownOpen, setIsContactDropdownOpen] = useState(false)
  const showTestimonials = false; // começa oculto
  const showVideoTestimonials = false; // começa oculto

const beforeAfterSlides = [
  antesDepois1, antesDepois2, antesDepois3, antesDepois4, antesDepois5,
  antesDepois6, antesDepois7, antesDepois8, antesDepois9, antesDepois10,
];


  // Instagram funciona por link oficial, sem iframe ou widget pago.

  // Auto-rotate testimonials
  /*useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % 3) // 3 depoimentos
    }, 4000)
    return () => clearInterval(interval)
  }, [])*/

  // Fecha o menu antes de rolar, evitando deslocamento da seção no celular.
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId)
    if (!element) return
    setIsMenuOpen(false)
    setIsContactDropdownOpen(false)
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        element.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })
      })
    })
  }

  // Escape fecha menus abertos, sem interferir na navegação da página.
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
        setIsContactDropdownOpen(false)
      }
    }
    const closeMobileMenuOnDesktop = () => {
      if (window.matchMedia('(min-width: 768px)').matches) setIsMenuOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    window.addEventListener('resize', closeMobileMenuOnDesktop)
    return () => {
      document.removeEventListener('keydown', handleEscape)
      window.removeEventListener('resize', closeMobileMenuOnDesktop)
    }
  }, [])

  // Dados editáveis do site
  const siteData = {
    topBanner: {
      text: "NÃO PENSE, VAI! • SUA EVOLUÇÃO COMEÇA AGORA"
    },
    hero: {
      title: "SEU CORPO DOS SONHOS",
      subtitle: "ESTÁ PRESTES",
      subtitle2: "A DECOLAR.",
      subtitle3: "EMBARQUE AGORA",
      subtitle4: "Treinos inteligentes com acompanhamento profissional para entregar resultados de verdade, no seu tempo e do seu jeito.",

      buttonText: "QUERO DECOLAR ➜"
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
    { photo: especialista4, name: "Carlos Ferreira", role: "Educador Físico" },
    //{ photo: especialista5, name: "Jéssica Silva", role: "Psicóloga" },
  ]
},
    partners: {
  title: "NOSSOS PARCEIROS",
  items: [
    // Novos parceiros em destaque: aparecem primeiro no carrossel.
    { logo: "https://cacow.com.br/cdn/shop/files/Template_de_Banner_2.0_-_by_Estudio_Gole_2_2b6ed56a-607b-42de-a4ca-4e857cb86466.png?v=1765388753&width=270", name: "Cacow", link: "https://cacow.com.br/", coupon: "NPV5" },
    { logo: "https://z2performance.com/cdn/shop/files/logo_z2_azul_01.png?v=1725888283&width=100", name: "Z2 Performance", link: "https://z2performance.com/", coupon: "Z2naopensevai" },
    { logo: "https://acdn-us.mitiendanube.com/stores/005/950/623/themes/common/logo-1531537272-1743307940-4b210bcc33dbc7ef880a3ec47b1628e81743307940.png?0", name: "Hey!Mu", link: "https://heymu.com.br/", coupon: "NPV10" },
    { logo: "/parceiros/logo-liquidz.svg", name: "LIQUIDZ", link: "https://www.liquidz.com.br/", coupon: "naopensevai" },
    // Parceiros anteriores: ordem original preservada após os quatro novos.
    { logo: parceiro1, name: "Cafezin Lounge", link: "https://cafezinlounge.saipos.com/home/nutrishakemlpqpz", coupon: "NPV15" },
    { logo: parceiro2, name: "Cia do Esporte", link: "https://www.instagram.com/ciadoesporte2/", coupon: "NPV10" },
    { logo: parceiro3, name: "TF Sports Running Betim", link: "https://link-prod.tfsports.com.br/events/running-betim-12505301321", coupon: "NAOPENSEVAI" },
    { logo: parceiro4, name: "NF Moda Fitness", link: "https://www.instagram.com/nf.modafitness/", coupon: "" },
    { logo: parceiro5, name: "Ciladas Burger", link: "https://www.instagram.com/ciladasburguer/", coupon: "NPV15" }
  ]
}
,
 
    projects: {
      title: "BONUS DA PLATAFORMA",
      items: [modulo1, modulo2, modulo3, modulo4, modulo5, modulo6, modulo7, modulo8, modulo9, modulo10, modulo11,modulo12]

    },
    testimonials: [
      { image: comentario1, name: "ANA CLARA", role: "", text: "amoooo demais!!" },
      { image: comentario2, name: "KETLEN LARA", role: "", text: "Desde que comecei, não foi só o meu corpo que mudou, mas principalmente minha mentalidade. Tem sido incrível! 🤩💪" },
      { image: comentario3, name: "LETICIA GOMES", role: "", text: "a plataforma é simplesmente maraaavilhosa, tem tudo!!" },
      { image: comentario4, name: "MARIA", role: "", text: "Superou todas as minhas expectativas. Equipe altamente qualificada." },
      { image: comentario5, name: "EMANUELA ALMEIDA", role: "", text: "sempre gostei de treinar so bumbum..kkkk...mas agora com esses resultados de braços e costas ,nossa eu tô amandoooo muito viu!" }
    ],
    plans: {
      title: <div className="text-center mt-0 mb-10">
  {/* Primeira linha */}
  <h2 className="font-extrabold tracking-tight leading-tight text-4xl md:text-6xl text-pink-500">
    VOCÊ É O AVIÃO
  </h2>

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
        price: "3x de R$ 33,30",
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

  const testimonials = siteData.testimonials || [];
const [currentTestimonial, setCurrentTestimonial] = useState(0);

  // Auto-rotate testimonials (roda todos que existirem)
useEffect(() => {
  if (!showTestimonials || testimonials.length === 0) return; // Não gastar bateria com carrossel oculto
  const id = setInterval(() => {
    setCurrentTestimonial(prev => (prev + 1) % testimonials.length);
  }, 4000);
  return () => clearInterval(id);
}, [showTestimonials, testimonials.length]);

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
      <button
        type="button"
        aria-label="Voltar ao início"
        onClick={() => scrollToSection('inicio')}
        className="justify-self-start flex items-center rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AFCB21]"
      >
        <img src={logoNPV} alt="Não Pense, Vai!" className="h-12" />
      </button>

      {/* CENTRO (hambúrguer) — só MOBILE */}
      <button
        type="button"
        onClick={() => setIsMenuOpen((v) => !v)}
        aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
        aria-expanded={isMenuOpen}
        aria-controls="mobile-navigation"
        className="md:hidden justify-self-center inline-flex items-center p-2 text-white"
      >
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d={isMenuOpen ? "M5 5l14 14M19 5L5 19" : "M3 6h18M3 12h18M3 18h18"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Área do aluno: escolha entre treinos e Clube NPV (mobile). */}
      <StudentAccessMenu mobile />

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
              aria-expanded={isContactDropdownOpen}
              aria-controls="desktop-contact-options"
              className="hover:text-[#AFCB21] transition-colors flex items-center"
            >
              CONTATO
              <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {isContactDropdownOpen && (
              <div id="desktop-contact-options" className="absolute top-full left-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
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

        {/* Área do aluno: preserva a Hotmart e oferece Clube NPV (desktop). */}
        <StudentAccessMenu />
      </div>
    </div>
  </div>

  {/* MENU MOBILE (mantido) */}
  {isMenuOpen && (
    <div id="mobile-navigation" className="md:hidden bg-black border-t border-gray-800">
      <nav className="flex flex-col space-y-4 p-4">
        <button onClick={() => scrollToSection('inicio')} className="text-left hover:text-[#AFCB21] transition-colors">INÍCIO</button>
        <button onClick={() => scrollToSection('about-section')} className="text-left hover:text-[#AFCB21] transition-colors">SOBRE</button>
        <button onClick={() => scrollToSection('planos')} className="text-left hover:text-[#AFCB21] transition-colors">PLANOS</button>

        {/* Dropdown CONTATO (mantido) */}
        <div className="relative">
          <button
            onClick={() => setIsContactDropdownOpen((v) => !v)}
            aria-expanded={isContactDropdownOpen}
            aria-controls="mobile-contact-options"
            className="hover:text-[#AFCB21] transition-colors flex items-center"
          >
            CONTATO
            <svg className="w-4 h-4 ml-1 fill-current" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414L10 13.414 5.293 8.707a1 1 0 010-1.414z" />
            </svg>
          </button>

          {isContactDropdownOpen && (
            <div id="mobile-contact-options" className="mt-3 w-full max-w-sm bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-4">
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
  className="relative min-h-[90svh] md:min-h-[100svh] flex items-start md:items-center justify-center overflow-hidden pb-36 md:pb-0 scroll-mt-16"
>
  {/* Vídeo de fundo (desktop + mobile) */}
  <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
    {/* Desktop / tablet (>= md) */}
    <video
      ref={heroDesktopVideoRef}
      className="hidden md:block w-full h-full object-cover"
      muted
      playsInline
      autoPlay
      loop
      preload="auto"
      onCanPlay={(event) => {
        if (event.currentTarget.paused) {
          event.currentTarget.play().catch(() => {})
        }
      }}
    >
      <source src={fundoDesktopVideo} type="video/mp4" />
    </video>
    {/* Mobile (< md): MP4 H.264 sem áudio e capa estática em caso de bloqueio de autoplay. */}
    <video
      key={mobileVideoSource}
      ref={heroMobileVideoRef}
      className="md:hidden w-full h-full object-cover"
      poster={fundoMobilePoster}
      muted
      playsInline
      autoPlay
      loop
      preload="auto"
      onLoadedData={(event) => {
        const video = event.currentTarget
        video.defaultMuted = true
        video.muted = true
        if (video.paused) video.play().catch(() => {})
      }}
      onCanPlay={(event) => {
        const video = event.currentTarget
        video.defaultMuted = true
        video.muted = true
        if (video.paused) video.play().catch(() => {})
      }}
      onError={() => {
        // Fallback técnico caso a nova versão não carregue.
        if (mobileVideoSource !== fundoMobileVideo) setMobileVideoSource(fundoMobileVideo)
      }}
    >
      <source src={mobileVideoSource} type="video/mp4" />
    </video>
  </div>

{/* Conteúdo por cima do vídeo */}
  <div className="relative z-10 text-center px-4 mt-60 md:mt-0">
    <h1 className="text-4xl md:text-6xl lg:text-6xl font-black leading-tight">
      <span className="text-white block animate-slide-up">{siteData.hero.title}</span>
      <span className="text-white block animate-slide-up animation-delay-200">{siteData.hero.subtitle}</span>
      <span className="text-pink-500 text-[55px] md:text-[90px] lg:text-8x1 font-black block drop-shadow-md animate-slide-up animation-delay-400">{siteData.hero.subtitle2}</span>
      <span className="text-white block animate-slide-up animation-delay-600">{siteData.hero.subtitle3}</span>
    </h1>

    {/* Descrição fora do título principal: leitura e SEO mais claros */}
    <p className="text-white/90 text-base md:text-lg leading-relaxed max-w-xl mx-auto mt-5">
      {siteData.hero.subtitle4}
    </p>

    {/* Botão */}
    <a
      href="https://pay.hotmart.com/J102054674M?off=g64ryxgr&checkoutMode=10"
      target="_blank"
      rel="noopener noreferrer"
      className="block w-full max-w-md mx-auto text-center text-[20px] font-semibold text-black py-4 px-6 rounded-lg bg-[#AFCB21] glow-button mt-10"
    >

      QUERO DECOLAR ➜
    </a>
  </div>
</section>

      {/* Antes e Depois Section */}
<section className="pt-12 pb-6 bg-white">
  <div className="container mx-auto px-4 text-center">

    {/* Título principal em verde */}
    <h2 className="text-3xl md:text-4xl leading-tight text-center text-[#AFCB21] mb-3">
  <span className="font-light">O ANTES É </span>
  <span className="font-bold">HISTÓRIA</span>
  <br />
  <span className="font-light">O DEPOIS, </span>
  <span className="font-bold">INSPIRAÇÃO</span>
</h2>



    {/* Subtítulo menor e leve */}
    <p className="text-lg text-gray-600 mb-8">
      O que hoje é <span className="font-bold text-pink-600">inspiração</span> já foi apenas um começo.{" "}
      <span className="font-bold text-pink-600">Agora é a sua vez.</span>
    </p>
          
          {/* Carrossel horizontal de transformações */}
          <BeforeAfter slides={beforeAfterSlides} />

          
          {/* Botão estratégico */}
          <div className="text-center mt-12">
            <a 
              href="https://pay.hotmart.com/J102054674M?off=g64ryxgr&checkoutMode=10" 
              target="_blank"
      rel="noopener noreferrer"
      className="block w-full max-w-md mx-auto text-center text-[20px] font-semibold text-black py-4 px-6 rounded-lg bg-[#AFCB21] glow-button mt-7"
    >
              QUERO OS MESMOS RESULTADOS
            </a>
          </div>
        </div>
      </section>



{/* Projects Section (BÔNUS) */}
<section className="py-6 bg-gray-900">
  <div className="container mx-auto px-4 text-center">
    <h2 className="text-4xl leading-tight mt-0 mb-3">
      <span className="font-bold block">COMPLETO?</span>
      <span className="font-light block italic">NÃO, ALÉM!</span>
    </h2>

    <p className="text-lg text-gray-300 mb-8">
      Nunca foi tão fácil ter <strong>acesso a tudo</strong> o que você precisa <strong>para transformar seu corpo</strong>.
    </p>


    {/* grid dos cards */}
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-6">
      {siteData.projects.items.slice(0, 12).map((project, index) => (
        <div key={index} className="bg-black rounded-2xl overflow-hidden shadow-xl">
          <div className="relative w-full aspect-[3/4]">
            <img
              src={project}
              alt={`Bônus ${index + 1}`}
              loading="lazy"
              decoding="async"
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
        href="https://pay.hotmart.com/J102054674M?off=g64ryxgr&checkoutMode=10"
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full max-w-md mx-auto text-center text-[15px] font-black text-white py-4 px-6 rounded-lg bg-pink-500 glow-button"
      >
        ACESSO TOTAL POR APENAS R$1,33/dia
      </a>
    </div>
  </div>
</section>

 {/* Como funciona: três etapas baseadas nas perguntas frequentes */}
 <section id="como-funciona" aria-labelledby="how-heading" className="bg-black py-16 md:py-24 scroll-mt-16">
  <div className="container mx-auto px-4">
   <div className="mx-auto max-w-3xl text-center">
    <span className="npv-eyebrow">SIMPLES ASSIM</span>
    <h2 id="how-heading" className="mt-4 text-3xl sm:text-4xl md:text-5xl font-black leading-tight">SUA EVOLUÇÃO COMEÇA <span className="text-[#AFCB21]">EM 3 PASSOS.</span></h2>
    <p className="mt-4 text-zinc-300 text-base md:text-lg">Tudo para você começar com clareza, no seu ritmo.</p>
   </div>
   <div className="mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
        <div className="npv-step-card">
          <span className="npv-step-number">01</span>
          <h3 className="mt-6 text-xl font-bold">Escolha seu plano</h3>
          <p className="mt-3 text-zinc-300 leading-relaxed">Selecione a assinatura que faz mais sentido para sua rotina.</p>
        </div>
        <div className="npv-step-card">
          <span className="npv-step-number">02</span>
          <h3 className="mt-6 text-xl font-bold">Acesse a plataforma</h3>
          <p className="mt-3 text-zinc-300 leading-relaxed">Após a aprovação da compra, receba por e-mail as instruções de acesso.</p>
        </div>
        <div className="npv-step-card">
          <span className="npv-step-number">03</span>
          <h3 className="mt-6 text-xl font-bold">Comece a treinar</h3>
          <p className="mt-3 text-zinc-300 leading-relaxed">Explore os níveis, as planilhas e os vídeos de execução para começar.</p>
        </div>
   </div>
   <div className="mt-10 text-center">
    <button type="button" onClick={() => scrollToSection('planos')} className="inline-flex min-h-14 items-center justify-center gap-4 rounded-xl bg-[#AFCB21] px-8 py-4 text-base font-black text-black transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#AFCB21]">CONHECER OS PLANOS <span aria-hidden="true" className="text-xl leading-none">➜</span></button>
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
      (index === siteData.team.members.length - 1 && siteData.team.members.length % 2 === 1
  ? "col-span-2 justify-self-center md:col-span-1" // centraliza a última só se sobrar 1
  : "")

    }
  >
          <img
            src={m.photo}
            alt={m.name}
            loading="lazy"
            decoding="async"
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
    text-4xl font-bold mb-2 text-center
    text-[#AFCB21] /* mobile */
    md:text-[#AFCB21] /* desktop */
  "
>
  NOSSOS PARCEIROS
</h2>

<p
  className="
    text-tx text-center text-gray-600 mt-0 mb-4 leading-none
  "
>
  Clique e aproveite os <strong>benefícios</strong>
</p>


{/* Carrossel contínuo: quatro grupos iguais avançam um grupo por ciclo.
    Adicionar parceiros apenas em siteData.partners.items; a faixa se repete automaticamente. */}
<div className="npv-partners-viewport relative"
     aria-label="Parceiros e benefícios da Não Pense, Vai!">
  <div
    className="npv-partners-track"
    style={{
      '--npv-partners-desktop-duration': `${Math.max(siteData.partners.items.length, 5) * 6}s`,
      '--npv-partners-mobile-duration': `${Math.max(siteData.partners.items.length, 5) * 1.8}s`
    }}
  >
    {Array.from({ length: 4 }, (_, copyIndex) => (
      <div
        key={copyIndex}
        className="npv-partners-group"
        aria-hidden={copyIndex > 0 ? 'true' : undefined}
      >
        {siteData.partners.items.map((p, index) => (
          <div key={index} className="group inline-flex shrink-0 flex-col items-center">
            <a
              href={p.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group"
              aria-label={`Visitar ${p.name}`}
              tabIndex={copyIndex === 0 ? undefined : -1}
            >
              <img
                src={p.logo}
                alt={copyIndex === 0 ? p.name : ''}
                loading="eager"
                decoding="async"
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
    ))}
  </div>
</div>




        </div>
      </section>

      {/* Testimonials Section */}
{showTestimonials && (
  <section className="py-20 bg-black">
    <div className="container mx-auto px-4 text-center">
      <h2 className="text-4xl font-bold mb-12">DEPOIMENTOS</h2>
      <div className="max-w-3xl mx-auto">
        <div className="relative bg-gray-900 rounded-2xl p-8 shadow-2xl">
          {/* avatar redondo */}
          <div className="w-24 h-24 mx-auto mb-6 rounded-full overflow-hidden border-4 border-[#AFCB21] select-none">
            <img
              src={siteData.testimonials[currentTestimonial].image}
              alt={siteData.testimonials[currentTestimonial].name}
              className="w-full h-full object-cover"
              draggable="false"
            />
          </div>
          <blockquote className="text-lg text-gray-300 mb-6 italic">
            {siteData.testimonials[currentTestimonial].text}
          </blockquote>
          <h3 className="text-xl font-bold text-[#AFCB21] mb-2">
            {siteData.testimonials[currentTestimonial].name}
          </h3>
        </div>
      </div>
    </div>
  </section>
)}


      {/* Plans Section */}
      <section id="planos" className="py-20 md:py-24 bg-gray-100 scroll-mt-16">
  <div className="container mx-auto px-4">
    <div className="mb-12 text-center text-zinc-900" aria-label="Planos de assinatura">
      {siteData.plans.title}
    </div>
    {/* ...grid dos cards... */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
            {/* Plano Mensal */}
            <div className="npv-plan-card flex h-full flex-col bg-black border border-gray-700 rounded-2xl p-7 sm:p-8 text-center shadow-xl">
              <h3 className="text-2xl font-bold mb-2">{siteData.plans.monthly.title}</h3>
              <p className="text-gray-400 mb-6">{siteData.plans.monthly.subtitle}</p>
              <div className="text-4xl font-bold text-[#AFCB21] mb-6">{siteData.plans.monthly.price}</div>
              <ul className="flex-1 text-left mb-8 space-y-3">
                {siteData.plans.monthly.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <span className="text-[#AFCB21] mr-3 text-xl">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <a 
                href="https://pay.hotmart.com/J102054674M?off=g64ryxgr&checkoutMode=10" 
                target="_blank"
      rel="noopener noreferrer"
      className="block w-full max-w-md mx-auto text-center text-[20px] font-semibold text-black py-4 px-6 rounded-lg bg-[#AFCB21] glow-button mt-auto"
    >
                ASSINAR AGORA
              </a>
            </div>

            {/* Plano Trimestral */}
            <div className="npv-plan-card flex h-full flex-col bg-[#AFCB21] text-black rounded-2xl p-7 sm:p-8 text-center relative shadow-xl">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-black text-[#AFCB21] px-4 py-1 rounded text-sm font-bold">
                MAIS POPULAR
              </div>
              <h3 className="text-2xl font-bold mb-2">{siteData.plans.quarterly.title}</h3>
              <p className="text-gray-800 mb-6">{siteData.plans.quarterly.subtitle}</p>
              <div className="mb-6">
                <div className="text-4xl font-bold mb-2">{siteData.plans.quarterly.price}</div>
                <div className="text-sm text-gray-700 line-through">{siteData.plans.quarterly.originalPrice}</div>
              </div>
              <ul className="flex-1 text-left mb-8 space-y-3">
                {siteData.plans.quarterly.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <span className="text-black mr-3 text-xl">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <a 
                href="https://pay.hotmart.com/J102054674M?off=il6n3k8y&checkoutMode=10" 
                target="_blank"
      rel="noopener noreferrer"
      className="block w-full max-w-md mx-auto text-center text-[20px] font-semibold text-white py-4 px-6 rounded-lg bg-black mt-auto"
    >
                ASSINAR AGORA
              </a>
            </div>
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-center text-xs sm:text-sm leading-relaxed text-zinc-600">
            Pagamento seguro pela Hotmart.
          </p>
          <div className="mt-8 text-center">
            <p className="text-zinc-700 text-base">Não sabe qual plano escolher?</p>
            <a
              href="https://wa.me/5531972158847?text=Ol%C3%A1%2C%20tenho%20uma%20d%C3%BAvida%20sobre%20os%20planos%20da%20plataforma%20N%C3%A3o%20Pense%2C%20Vai!"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex mt-3 items-center justify-center rounded-lg border border-zinc-800 px-5 py-3 text-zinc-900 font-semibold hover:bg-zinc-900 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 transition-colors"
            >
              Tire suas dúvidas pelo WhatsApp <span aria-hidden="true" className="inline-block ml-2 align-middle text-xl leading-none">➜</span>
            </a>
          </div>
        </div>
      </section>

      {/* About Me Section */}
      <section id="about-section" className="py-10 bg-black scroll-mt-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            {/* Foto à esquerda */}
            <div className="lg:w-1/2 flex item-stretch">
              <img
  src={siteData.aboutMe.photo}
  alt="Carlos Ferreira, treinador da plataforma Não Pense, Vai!"
  loading="lazy"
  decoding="async"
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
                href="https://pay.hotmart.com/J102054674M?off=g64ryxgr&checkoutMode=10" 
                target="_blank"
      rel="noopener noreferrer"
      className="block w-full max-w-md mx-auto text-center text-[20px] font-semibold text-black py-4 px-6 rounded-lg bg-[#AFCB21] glow-button mt-7"
    >
                COMEÇAR AGORA
              </a> */}
            </div>
          </div>
        </div>
      </section>

      {/* Video Testimonials Section */}
{showVideoTestimonials && (
  <section className="py-20 bg-gray-900">
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold mb-4">{siteData.videoTestimonials.title}</h2>
        <p className="text-gray-400 text-lg">{siteData.videoTestimonials.subtitle}</p>
      </div>

      {/* Grid de vídeos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-10">
        {siteData.videoTestimonials.videos.map((video) => (
          <div
            key={video.id}
            className="relative w-full aspect-[9/16] overflow-hidden rounded-lg bg-black"
          >
            <iframe
              src={video.videoUrl}
              title={video.title}
              className="absolute inset-0 w-full h-full block"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
            ></iframe>
          </div>
        ))}
      </div>

      {/* CTA após vídeos */}
      <div className="text-center mt-12">
        <a
          href="https://pay.hotmart.com/J102054674M?off=g64ryxgr&checkoutMode=10"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full max-w-md mx-auto text-center text-[20px] font-semibold text-black py-4 px-6 rounded-lg bg-[#AFCB21] glow-button mt-4"
        >
          QUERO TER ESSES RESULTADOS
        </a> 
      </div> {/* CTA */}
      </div> {/* container */}
  </section> 
)}


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
          loading="lazy"
          decoding="async"
          className="mx-auto lg:mx-0 w-60 md:w-40 mb-4 hover:scale-110 transition-transform duration-300"
        />
      </div>

      {/* Texto — mobile centralizado; desktop alinhado à esquerda */}
      <div className="text-center lg:text-left max-w-prose">
        <h2 className="text-2xl md:text-4xl font-bold text-[#AFCB21]">
          <span className="block">ENTRE DE CABEÇA</span>
          <span className="block">POR 7 DIAS</span>
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
    <section id="faq" className="py-16 bg-zinc-50 text-black scroll-mt-16">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">
          Possui alguma dúvida?
        </h2>

        <div className="space-y-4">
          {faqs.map((item, i) => (
            <FAQItem key={i} q={item.q} a={item.a} index={i} />
          ))}
        </div>
        <div className="mt-10 text-center">
          <p className="text-zinc-700">Ainda tem alguma dúvida sobre a plataforma?</p>
          <a
            href="https://wa.me/5531972158847?text=Ol%C3%A1%21%20Tenho%20uma%20d%C3%BAvida%20sobre%20a%20plataforma%20N%C3%A3o%20Pense%2C%20Vai%21"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center mt-4 px-6 py-3 rounded-lg bg-[#AFCB21] text-black font-semibold hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black transition"
          >
            Falar com o suporte pelo WhatsApp <span aria-hidden="true" className="inline-block ml-2 align-middle text-xl leading-none">➜</span>
          </a>
        </div>
      </div>
    </section>

      {/* Instagram: seção independente, sem depender de widget pago ou API externa */}
      <section id="instagram" aria-labelledby="instagram-heading" className="npv-instagram relative overflow-hidden bg-[#111114] py-20 md:py-28 scroll-mt-16">
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
            <div className="text-center lg:text-left">
              <span className="npv-eyebrow"><span className="npv-live-dot" aria-hidden="true"></span> A GENTE SE ENCONTRA LÁ</span>
              <h2 id="instagram-heading" className="mt-5 text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.05]">
                O MOVIMENTO <span className="text-[#AFCB21]">NÃO PARA</span> POR AQUI.
              </h2>
              <p className="mt-5 mx-auto lg:mx-0 max-w-xl text-base sm:text-lg leading-relaxed text-zinc-300">
                Acompanhe treinos, dicas e bastidores da comunidade Não Pense, Vai! pelo Instagram.
              </p>
              <a
                href="https://www.instagram.com/naopensevai/"
                target="_blank"
                rel="noopener noreferrer"
                className="npv-instagram-cta mt-8 inline-flex min-h-14 items-center justify-center gap-4 rounded-xl px-7 py-4 text-base font-bold text-white transition-transform hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#AFCB21]"
              >
                <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/></svg>
                Ver o @naopensevai
                <span aria-hidden="true" className="text-xl leading-none">➜</span>
              </a>
              <p className="mt-4 text-sm text-zinc-400">As publicações são abertas diretamente no Instagram.</p>
            </div>
            <a
              href="https://www.instagram.com/naopensevai/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Abrir perfil oficial Não Pense, Vai! no Instagram"
              className="npv-instagram-profile group block mx-auto w-full max-w-md rounded-3xl border border-white/15 bg-white/[0.06] p-5 sm:p-7 shadow-2xl transition-transform hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-[#AFCB21]"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-pink-500 bg-black p-2 shadow-lg">
                  <img src={logoNPV} alt="" loading="lazy" decoding="async" className="max-h-12 w-full object-contain" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-extrabold text-white">@naopensevai <span aria-hidden="true" className="inline-block ml-2 text-[#AFCB21]">➜</span></p>
                  <p className="text-sm text-zinc-300">Não Pense, Vai! | Treinamento</p>
                </div>
              </div>
              <div className="my-6 h-px bg-white/15"></div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="npv-profile-pill">TREINO</div>
                <div className="npv-profile-pill">EVOLUÇÃO</div>
                <div className="npv-profile-pill">ROTINA</div>
              </div>
              <div className="mt-6 flex items-center justify-between rounded-xl bg-[#AFCB21] px-4 py-4 text-sm font-black text-black">
                SIGA A NOSSA JORNADA <span aria-hidden="true" className="text-xl">➜</span>
              </div>
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
          <nav aria-label="Links do rodapé" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 mb-6">
            <a href="/politica-de-privacidade.html" className="text-gray-400 hover:text-[#AFCB21] transition-colors">Política de Privacidade</a>
            <a href="/termos-de-uso.html" className="text-gray-400 hover:text-[#AFCB21] transition-colors">Termos de Uso</a>
            <a href="mailto:naopensevai@gmail.com?subject=Suporte%20N%C3%A3o%20Pense%2C%20Vai!" className="text-gray-400 hover:text-[#AFCB21] transition-colors">Suporte</a>
          </nav>
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} Não Pense, Vai! – Todos os direitos reservados
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App

