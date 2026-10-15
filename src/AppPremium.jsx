import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowRight, ArrowUpRight, Check, ChevronDown, ChevronLeft, ChevronRight,
  Menu, X, Instagram, MessageCircle, ShieldCheck, Dumbbell, Play,
  BookOpen, Sparkles, HeartPulse, Mail, MoveUpRight
} from 'lucide-react';
import './AppPremium.css';

import logo from './assets/logo-branca-npv.PNG';
import portrait from './assets/sobre-mim.JPG';
import guarantee from './assets/Selo-de-Garantia-de-7-Dias-PNG-Transparente.png';
import a1 from './assets/antes-depois1.JPG';
import a2 from './assets/antes-depois2.JPG';
import a3 from './assets/antes-depois3.JPG';
import a4 from './assets/antes-depois4.PNG';
import a5 from './assets/antes-depois5.JPG';
import a6 from './assets/antes-depois6.JPG';
import a7 from './assets/antes-depois7.JPG';
import a8 from './assets/antes-depois8.PNG';
import a9 from './assets/antes-depois9.JPG';
import a10 from './assets/antes-depois10.JPG';
import m1 from './assets/modulo1.jpg';
import m2 from './assets/modulo2.jpg';
import m3 from './assets/modulo3.jpg';
import m4 from './assets/modulo4.jpg';
import m5 from './assets/modulo5.jpg';
import m6 from './assets/modulo6.jpg';
import t1 from './assets/Especialista1.PNG';
import t2 from './assets/Especialista2.PNG';
import t3 from './assets/Especialista3.PNG';
import t4 from './assets/Especialista4.PNG';
import p1 from './assets/Parceiro1.PNG';
import p2 from './assets/Parceiro2.PNG';
import p3 from './assets/Parceiro3.PNG';
import p4 from './assets/Parceiro4.PNG';
import p5 from './assets/Parceiro5.PNG';

const LINKS = {
  monthly: 'https://pay.hotmart.com/J102054674M?off=g64ryxgr&checkoutMode=10',
  quarterly: 'https://pay.hotmart.com/J102054674M?off=il6n3k8y&checkoutMode=10',
  students: 'https://sso.hotmart.com/login?service=https%3A%2F%2Fsso.hotmart.com%2Foauth2.0%2FcallbackAuthorize%3Fclient_id%3Db432cdd3-eb60-46bd-892b-5b450a65153e%26redirect_uri%3Dhttps%253A%252F%252Fhotmart.com%252Fen%252Fclub%252Fnaopensevai%252Fauth%252Flogin%253Frealm%253Dclub%26response_type%3Dcode%26response_mode%3Dquery%26client_name%3DCasOAuthClient',
  whatsapp: 'https://wa.me/5531972158847?text=Ol%C3%A1%21%20Quero%20saber%20mais%20sobre%20a%20plataforma%20N%C3%A3o%20Pense%2C%20Vai%21',
  email: 'mailto:naopensevai@gmail.com',
  instagram: 'https://www.instagram.com/naopensevai/'
};

const results = [a1,a2,a3,a4,a5,a6,a7,a8,a9,a10];
const modules = [m1,m2,m3,m4,m5,m6];
const experts = [
  {name:'Carina Gomes', role:'Corredora', photo:t1},
  {name:'Gabriel Ferreira', role:'Fisioterapeuta', photo:t2},
  {name:'Denise Cunha', role:'Nutricionista', photo:t3},
  {name:'Carlos Ferreira', role:'Educador físico', photo:t4}
];
const partners = [
  {image:p1,name:'Cafezin Lounge',href:'https://cafezinlounge.saipos.com/home/nutrishakemlpqpz',coupon:'NPV15'},
  {image:p2,name:'Cia do Esporte',href:'https://www.instagram.com/ciadoesporte2/',coupon:'NPV10'},
  {image:p3,name:'TF Sports Running Betim',href:'https://link-prod.tfsports.com.br/events/running-betim-12505301321',coupon:'NAOPENSEVAI'},
  {image:p4,name:'NF Moda Fitness',href:'https://www.instagram.com/nf.modafitness/',coupon:null},
  {image:p5,name:'Ciladas Burger',href:'https://www.instagram.com/ciladasburguer/',coupon:'NPV15'}
];
const featureList=[
  'Acesso completo à plataforma',
  'Materiais exclusivos',
  'Comunidade privada',
  'Dietas e e-book de receitas',
  'Bônus especiais'
];
const questions=[
  {q:'Como vou ter acesso aos treinos?',a:'Após a compra ser confirmada, você receberá um e-mail com as instruções de acesso à área de membros, onde encontrará os treinos.'},
  {q:'Como vou poder tirar dúvidas?',a:'Você terá acesso ao Instagram exclusivo para alunos, onde poderá enviar suas dúvidas.'},
  {q:'Quanto tempo dura cada plano?',a:'O plano mensal renova a cada 30 dias e o trimestral a cada 3 meses, conforme a oferta contratada.'},
  {q:'Como faço para cancelar?',a:'Entre em contato pelo e-mail naopensevai@gmail.com ou pelo WhatsApp de suporte.'},
  {q:'Os treinos são atualizados?',a:'As planilhas são alteradas a cada 5 semanas, conforme as informações apresentadas na plataforma.'},
  {q:'Os exercícios têm vídeos de execução?',a:'Sim. Você terá acesso aos vídeos das execuções e às planilhas, que também podem ser impressas.'},
  {q:'Como saber qual é meu nível?',a:'Você poderá conhecer os níveis disponíveis e avaliar em qual se encaixa antes de começar.'},
  {q:'Vou receber dieta ou sugestões de suplementos?',a:'Você recebe orientações gerais e materiais complementares conforme seu plano e os módulos disponíveis.'},
  {q:'Como funciona o pagamento?',a:'O pagamento é processado pela Hotmart. Após a confirmação, o acesso à plataforma é liberado.'}
];

function IconPill({children}) {
  return <span className="premium-pill"><Check size={14} aria-hidden="true" />{children}</span>;
}
function CTA({href,children,dark=false,external=true,className=''}) {
  return <a href={href} target={external?'_blank':undefined} rel={external?'noopener noreferrer':undefined} className={'premium-cta '+(dark?'premium-cta-dark ':'')+className}>{children}<ArrowUpRight size={19} aria-hidden="true"/></a>;
}
function Heading({tag='h2',eyebrow,first,accent,description,center=false,light=false}) {
  const Tag=tag;
  return <div className={'premium-heading '+(center?'center':'')+' '+(light?'light':'')}>
    {eyebrow&&<p className="premium-eyebrow"><span/> {eyebrow}</p>}
    <Tag>{first} <span>{accent}</span></Tag>
    {description&&<p className="premium-heading-desc">{description}</p>}
  </div>;
}
function FAQs() {
  const [open,setOpen]=useState(0);
  return <div className="premium-qa">{questions.map((item,i)=><div key={item.q} className={'premium-faq-item '+(open===i?'is-open':'')}>
    <h3><button id={'premium-faq-btn-'+i} type="button" aria-expanded={open===i} aria-controls={'premium-faq-answer-'+i} onClick={()=>setOpen(open===i?-1:i)}><span>{item.q}</span><ChevronDown size={20} aria-hidden="true"/></button></h3>
    <div id={'premium-faq-answer-'+i} role="region" aria-labelledby={'premium-faq-btn-'+i} hidden={open!==i}><p>{item.a}</p></div>
  </div>)}</div>;
}
export default function AppPremium() {
  const [menuOpen,setMenuOpen]=useState(false);
  const rail=useRef(null);
  const anchor=(id)=>{setMenuOpen(false);document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'});};
  useEffect(()=>{
    const onKey=e=>{if(e.key==='Escape')setMenuOpen(false);};
    window.addEventListener('keydown',onKey);
    return ()=>window.removeEventListener('keydown',onKey);
  },[]);
  const shift=(direction)=>{if(rail.current)rail.current.scrollBy({left:direction*rail.current.clientWidth*0.75,behavior:'smooth'});};
  return <div className="premium-site">
    <a href="#main-content" className="premium-skip">Pular para o conteúdo</a>
    <div className="premium-topline"><span className="premium-topline-dot" /> MOVIMENTO É ESCOLHA. EVOLUÇÃO É CONSTÂNCIA. <span className="premium-topline-dot" /></div>
    <header className="premium-header">
      <div className="premium-shell premium-header-row">
        <a className="premium-logo" href="#inicio" onClick={e=>{e.preventDefault();anchor('inicio');}} aria-label="Não Pense, Vai! — voltar ao início"><img src={logo} alt="Não Pense, Vai!" /></a>
        <nav className="premium-nav" aria-label="Navegação principal">
          <a href="#metodo">O MÉTODO</a>
          <a href="#resultados">RESULTADOS</a>
          <a href="#equipe">EQUIPE</a>
          <a href="#planos">PLANOS</a>
        </nav>
        <a className="premium-student" href={LINKS.students} target="_blank" rel="noopener noreferrer">ÁREA DE ALUNOS <ArrowUpRight size={15}/></a>
        <button className="premium-menu-btn" type="button" aria-label={menuOpen?'Fechar menu':'Abrir menu'} aria-expanded={menuOpen} aria-controls="premium-mobile-nav" onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen?<X size={26}/>:<Menu size={26}/>}</button>
      </div>
      {menuOpen&&<nav id="premium-mobile-nav" className="premium-mobile-nav" aria-label="Navegação para celular">
        {[['O MÉTODO','metodo'],['RESULTADOS','resultados'],['EQUIPE','equipe'],['PLANOS','planos'],['PERGUNTAS FREQUENTES','faq']].map(([label,id])=><a key={id} href={'#'+id} onClick={e=>{e.preventDefault();anchor(id);}}>{label}<ArrowUpRight size={17}/></a>)}
        <a href={LINKS.students} target="_blank" rel="noopener noreferrer" onClick={()=>setMenuOpen(false)}>ÁREA DE ALUNOS <ArrowUpRight size={17}/></a>
      </nav>}
    </header>

    <main id="main-content">
      <section id="inicio" className="premium-hero">
        <div className="premium-hero-grain" aria-hidden="true"/>
        <div className="premium-shell premium-hero-grid">
          <div className="premium-hero-copy">
            <p className="premium-hero-kicker"><span className="premium-line"/> SUA JORNADA COMEÇA AGORA <span className="premium-small-star">✳</span></p>
            <h1>SEU PRÓXIMO NÍVEL <em>COMEÇA AQUI.</em></h1>
            <p className="premium-hero-lead">Treinos inteligentes, orientações profissionais e materiais para transformar intenção em movimento.</p>
            <div className="premium-hero-actions">
              <CTA href={LINKS.monthly}>QUERO DECOLAR</CTA>
              <button className="premium-link" type="button" onClick={()=>anchor('metodo')}>CONHECER A PLATAFORMA <ArrowRight size={18}/></button>
            </div>
            <div className="premium-hero-pills"><IconPill>Treinos em níveis</IconPill><IconPill>Vídeos de execução</IconPill><IconPill>Materiais exclusivos</IconPill></div>
          </div>
          <div className="premium-hero-art">
            <div className="premium-hero-photo"><img src={portrait} alt="Carlos Ferreira, educador físico da Não Pense, Vai!" loading="eager" decoding="async" fetchPriority="high"/></div>
            <div className="premium-orbit premium-orbit-1" aria-hidden="true"/>
            <div className="premium-orbit premium-orbit-2" aria-hidden="true"/>
            <div className="premium-photo-stamp"><span>NÃO PENSE</span><strong>VAI!</strong><small>O PRÓXIMO PASSO É SEU.</small></div>
            <div className="premium-hero-side" aria-hidden="true">MOVA-SE • EVOLUA • REPITA</div>
          </div>
        </div>
        <div className="premium-shell premium-hero-end"><span>01 / A EVOLUÇÃO COMEÇA AQUI</span><span>ROLE PARA DESCOBRIR <ArrowRight size={18}/></span></div>
      </section>

      <section className="premium-benefits" id="metodo">
        <div className="premium-shell">
          <Heading eyebrow="O QUE MOVE A GENTE" first="MENOS PROMESSAS." accent="MAIS MOVIMENTO." description="Um lugar para encontrar orientação e dar continuidade à sua rotina de treinos." />
          <div className="premium-benefit-grid">
            <div className="premium-benefit"><Dumbbell size={28} strokeWidth={1.5}/><span>01</span><h3>TREINO COM DIREÇÃO</h3><p>Planilhas com opções de níveis para você encontrar seu ponto de partida.</p></div>
            <div className="premium-benefit"><Play size={28} strokeWidth={1.5}/><span>02</span><h3>EXECUÇÃO COM CLAREZA</h3><p>Vídeos que ajudam você a compreender os exercícios de cada treino.</p></div>
            <div className="premium-benefit"><BookOpen size={28} strokeWidth={1.5}/><span>03</span><h3>CONTEÚDO EM UM SÓ LUGAR</h3><p>Materiais exclusivos, comunidade privada e conteúdos complementares.</p></div>
          </div>
        </div>
      </section>

      <section id="resultados" className="premium-results">
        <div className="premium-shell">
          <div className="premium-results-head">
            <Heading eyebrow="HISTÓRIAS REAIS" first="O ANTES É HISTÓRIA." accent="O DEPOIS, INSPIRAÇÃO." description="Cada evolução tem seu ritmo. Inspire-se com as transformações compartilhadas por nossos alunos." />
            <div className="premium-slider-actions"><button aria-label="Mostrar resultados anteriores" type="button" onClick={()=>shift(-1)}><ChevronLeft/></button><button aria-label="Mostrar mais resultados" type="button" onClick={()=>shift(1)}><ChevronRight/></button></div>
          </div>
          <div className="premium-photo-rail" ref={rail} tabIndex="0" aria-label="Galeria de resultados dos alunos">
            {results.map((photo,i)=><figure key={i} className="premium-result-card"><img src={photo} loading="lazy" decoding="async" alt={'Transformação de aluno — exemplo '+(i+1)}/><figcaption><span>EVOLUÇÃO REAL</span><strong>{String(i+1).padStart(2,'0')} / {String(results.length).padStart(2,'0')}</strong></figcaption></figure>)}
          </div>
          <div className="premium-results-foot"><p>O próximo capítulo pode ser o seu.</p><button onClick={()=>anchor('planos')} type="button" className="premium-text-cta">COMEÇAR MINHA JORNADA <ArrowUpRight size={18}/></button></div>
        </div>
      </section>

      <section className="premium-modules" id="conteudos">
        <div className="premium-shell">
          <Heading eyebrow="CONTEÚDO QUE ACOMPANHA SUA ROTINA" first="UM UNIVERSO" accent="DE POSSIBILIDADES." description="Conheça alguns dos conteúdos e materiais presentes na experiência Não Pense, Vai!" center light/>
          <div className="premium-modules-grid">{modules.map((src,i)=><div key={i} className={'premium-module premium-module-'+(i+1)}><img src={src} loading="lazy" decoding="async" alt={'Conteúdo da plataforma Não Pense, Vai! — módulo '+(i+1)}/></div>)}</div>
          <p className="premium-content-note">Conteúdos e materiais podem variar de acordo com a programação da plataforma.</p>
        </div>
      </section>

      <section className="premium-how">
        <div className="premium-shell premium-how-grid">
          <Heading eyebrow="SEM COMPLICAÇÃO" first="TRÊS PASSOS." accent="UM NOVO COMEÇO." description="Tudo pensado para que você saiba como entrar e começar."/>
          <ol className="premium-how-list">
            <li><span>01</span><div><h3>ESCOLHA SEU PLANO</h3><p>Mensal ou trimestral: encontre o que combina com a sua rotina.</p></div></li>
            <li><span>02</span><div><h3>RECEBA SEU ACESSO</h3><p>Após a confirmação do pagamento, as orientações chegam por e-mail.</p></div></li>
            <li><span>03</span><div><h3>COMECE A TREINAR</h3><p>Acesse os treinos, consulte os vídeos e dê o primeiro passo.</p></div></li>
          </ol>
        </div>
      </section>

      <section id="equipe" className="premium-team">
        <div className="premium-shell">
          <Heading eyebrow="QUEM ESTÁ COM VOCÊ" first="GENTE DE VERDADE." accent="CONHECIMENTO DE VERDADE." description="Uma equipe com diferentes especialidades para ampliar sua experiência." center/>
          <div className="premium-team-grid">{experts.map((x,i)=><article key={x.name} className="premium-person"><div className="premium-person-image"><img src={x.photo} alt={x.name} loading="lazy" decoding="async"/></div><div className="premium-person-info"><span>0{i+1} / ESPECIALISTA</span><h3>{x.name}</h3><p>{x.role}</p></div></article>)}</div>
        </div>
      </section>

      <section className="premium-about">
        <div className="premium-shell premium-about-grid">
          <div className="premium-about-art"><img src={portrait} alt="Carlos Ferreira, criador da plataforma" loading="lazy" decoding="async"/><div className="premium-about-sign">NÃO PENSE,<br/><strong>VAI!</strong></div></div>
          <div><Heading eyebrow="POR TRÁS DO MOVIMENTO" first="UM NOVO JEITO" accent="DE EVOLUIR." light/><p>Com mais de 8 anos de experiência no mercado fitness, Carlos Ferreira criou a Não Pense, Vai! com uma ideia: reunir treinos, orientação prática e conteúdos que ajudem você a construir uma rotina mais consistente.</p><p>O treino é o começo. O compromisso com a sua evolução é o que faz a diferença.</p><a href={LINKS.instagram} target="_blank" rel="noopener noreferrer" className="premium-about-link">CONHEÇA NOSSA ROTINA <ArrowUpRight size={18}/></a></div>
        </div>
      </section>

      <section id="planos" className="premium-pricing">
        <div className="premium-shell">
          <Heading eyebrow="SEU PRÓXIMO PASSO" first="VOCÊ É O AVIÃO." accent="DECOLE AGORA." description="Escolha como quer começar. Os valores abaixo reproduzem as ofertas anunciadas no site atual; confira o total no checkout antes de pagar." center/>
          <div className="premium-pricing-grid">
            <article className="premium-price-card"><div className="premium-price-top"><span>LIBERDADE PARA COMEÇAR</span><span>01 / 02</span></div><h3>PLANO MENSAL</h3><p className="premium-price-detail">Sem fidelidade</p><div className="premium-price"><strong>R$ 39,90</strong><span>/ mês</span></div><div className="premium-price-rule"/><ul>{featureList.map(x=><li key={x}><Check size={17}/>{x}</li>)}</ul><CTA href={LINKS.monthly}>ASSINAR MENSAL</CTA></article>
            <article className="premium-price-card featured"><div className="premium-featured-flag"><Sparkles size={15}/> MAIS POPULAR</div><div className="premium-price-top"><span>MAIS TEMPO PARA EVOLUIR</span><span>02 / 02</span></div><h3>PLANO TRIMESTRAL</h3><p className="premium-price-detail">3 meses</p><div className="premium-price"><strong>3x R$ 33,30</strong></div><p className="premium-was">De <s>R$ 119,70</s> na apresentação original</p><div className="premium-price-rule"/><ul>{featureList.map(x=><li key={x}><Check size={17}/>{x}</li>)}</ul><CTA href={LINKS.quarterly} dark>ASSINAR TRIMESTRAL</CTA></article>
          </div>
          <div className="premium-after-price"><span>AINDA TEM ALGUMA DÚVIDA?</span><a href={LINKS.whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle size={19}/> FALE COM NOSSA EQUIPE <ArrowUpRight size={16}/></a></div>
        </div>
      </section>

      <section className="premium-guarantee">
        <div className="premium-shell premium-guarantee-grid"><div className="premium-guarantee-seal"><img src={guarantee} loading="lazy" alt="Selo de garantia de 7 dias"/></div><div><p className="premium-eyebrow"><span/> SUA DECISÃO COM TRANQUILIDADE</p><h2>7 DIAS PARA <em>EXPERIMENTAR.</em></h2><p>Conheça os treinos, explore os materiais e entenda se a plataforma faz sentido para você. A oferta apresenta garantia de 7 dias, conforme as condições informadas na compra.</p><a href={LINKS.whatsapp} target="_blank" rel="noopener noreferrer">DÚVIDAS SOBRE A GARANTIA <ArrowUpRight size={18}/></a></div></div>
      </section>

      <section id="faq" className="premium-faq">
        <div className="premium-shell premium-faq-grid"><Heading eyebrow="SEM FICAR NA DÚVIDA" first="PERGUNTAS" accent="FREQUENTES." description="Respostas rápidas antes de você começar."/><div><FAQs/><a href={LINKS.whatsapp} target="_blank" rel="noopener noreferrer" className="premium-faq-contact">NÃO ENCONTROU SUA RESPOSTA? FALE CONOSCO <ArrowUpRight size={18}/></a></div></div>
      </section>

      <section className="premium-partners">
        <div className="premium-shell"><p className="premium-eyebrow"><span/> QUEM CAMINHA COM A GENTE</p><div className="premium-partners-grid">{partners.map(x=><a href={x.href} target="_blank" rel="noopener noreferrer" className="premium-partner" key={x.name}><img src={x.image} loading="lazy" alt={x.name}/><div><strong>{x.name}</strong>{x.coupon&&<small>CUPOM: {x.coupon}</small>}</div><ArrowUpRight size={17} aria-hidden="true"/></a>)}</div></div>
      </section>

      <section className="premium-instagram">
        <div className="premium-shell premium-social-grid">
          <div><p className="premium-eyebrow"><span/> A EVOLUÇÃO CONTINUA LÁ</p><h2>FORA DO SITE. <em>DENTRO DO MOVIMENTO.</em></h2><p>Acompanhe dicas, bastidores e novidades da comunidade Não Pense, Vai! diretamente no Instagram.</p><CTA href={LINKS.instagram}><Instagram size={18}/> SEGUIR @NAOPENSEVAI</CTA></div>
          <a href={LINKS.instagram} target="_blank" rel="noopener noreferrer" className="premium-social-card" aria-label="Abrir Instagram @naopensevai"><div className="premium-social-top"><Instagram size={24}/><ArrowUpRight size={22}/></div><img src={logo} alt="" loading="lazy"/><h3>@naopensevai</h3><p>ENTRE PARA O MOVIMENTO.</p><span>ACESSAR PERFIL <ArrowRight size={18}/></span></a>
        </div>
      </section>
    </main>

    <footer className="premium-footer">
      <div className="premium-shell">
        <div className="premium-footer-top"><a href="#inicio" aria-label="Voltar ao início"><img src={logo} alt="Não Pense, Vai!"/></a><div><p>A SUA EVOLUÇÃO NÃO ESPERA.</p><h2>NÃO PENSE, <span>VAI!</span></h2></div></div>
        <div className="premium-footer-middle">
          <div><h3>NAVEGUE</h3><a href="#metodo">O método</a><a href="#resultados">Resultados</a><a href="#equipe">Equipe</a><a href="#planos">Planos</a></div>
          <div><h3>FALE COM A GENTE</h3><a href={LINKS.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp <ArrowUpRight size={14}/></a><a href={LINKS.email}>E-mail <Mail size={14}/></a><a href={LINKS.instagram} target="_blank" rel="noopener noreferrer">Instagram <Instagram size={14}/></a></div>
          <div><h3>INFORMAÇÕES</h3><a href="mailto:naopensevai@gmail.com?subject=Solicita%C3%A7%C3%A3o%20da%20Pol%C3%ADtica%20de%20Privacidade">Solicitar Política de Privacidade</a><a href="mailto:naopensevai@gmail.com?subject=Solicita%C3%A7%C3%A3o%20dos%20Termos%20de%20Uso">Solicitar Termos de Uso</a><a href={LINKS.students} target="_blank" rel="noopener noreferrer">Área de alunos <ArrowUpRight size={14}/></a></div>
        </div>
        <div className="premium-footer-base"><span>© {new Date().getFullYear()} NÃO PENSE, VAI! TODOS OS DIREITOS RESERVADOS.</span><a href="#inicio">VOLTAR AO TOPO ↑</a></div>
      </div>
    </footer>
  </div>;
}
