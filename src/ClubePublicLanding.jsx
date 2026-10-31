import React,{useEffect} from 'react'
import {ArrowRight, ArrowUpRight, ChevronRight, Dumbbell, Footprints, Gift, LockKeyhole, Medal, ShieldCheck, Sparkles, Target, Trophy, Zap} from 'lucide-react'
import logo from './assets/logo-branca-npv.PNG'
import {MEMBER_LEVELS} from '../clube/profile/memberCardIdentity.mjs'
import './ClubePublicLanding.css'

const rewards=[
  {name:'Camiseta NPV',points:7000,image:'https://dnlyfwcrfocgafgfoyna.supabase.co/storage/v1/object/public/clube-npv-recompensas/images/ad0bf83e-540c-4cbb-928f-4e1f02218e12.jpg'},
  {name:'Garrafinha NPV',points:10000,image:'https://dnlyfwcrfocgafgfoyna.supabase.co/storage/v1/object/public/clube-npv-recompensas/images/1f970571-f237-4854-85d5-cb1946bff2c4.png'},
  {name:'Jaqueta NPV',points:20000,image:'https://dnlyfwcrfocgafgfoyna.supabase.co/storage/v1/object/public/clube-npv-recompensas/images/888896d3-1ade-4fd2-896d-bc2f279202bd.jpg'}
]
const fmt=n=>new Intl.NumberFormat('pt-BR').format(n)
const steps=[
  {n:'01',label:'FAÇA PARTE',title:'Comece com a plataforma',description:'Escolha o plano e aproveite seus treinos e conteúdos NPV. O Clube complementa essa experiência.'},
  {n:'02',label:'ATIVE SEU CLUBE',title:'Solicite sua entrada',description:'Faça seu cadastro no Clube. O acesso é liberado após a verificação e aprovação do vínculo.'},
  {n:'03',label:'GANHE PONTOS',title:'Sua participação conta',description:'Renovações confirmadas, desafios e atividades elegíveis ajudam você a evoluir.'},
  {n:'04',label:'VÁ ALÉM',title:'Conquiste novas vantagens',description:'Acompanhe seus níveis, confira parceiros e solicite recompensas conforme as regras do Clube.'}
]
const activities=[
 {icon:Footprints,title:'Corrida ou caminhada no Strava',details:'Registre atividades elegíveis e acumule pontos enquanto se movimenta.'},
 {icon:Dumbbell,title:'Treinos',details:'Treine com constância e acompanhe sua evolução na plataforma.'},
 {icon:Target,title:'Desafios concluídos',details:'Supere as metas do Clube e acumule pontos quando forem validadas.'}
]
export default function ClubePublicLanding(){
 useEffect(()=>{
   const title='Clube de Benefícios NPV | Não Pense, Vai!'
   const description='Conheça o Clube de Benefícios Não Pense, Vai!: pontos, desafios, cartões de nível, recompensas e vantagens para quem participa da plataforma.'
   const canonical='https://www.naopensevai.com/clube/conheca'
   document.title=title
   const setMeta=(selector,value)=>{const node=document.querySelector(selector);if(node)node.setAttribute('content',value)}
   setMeta('meta[name="description"]',description)
   setMeta('meta[property="og:title"]',title)
   setMeta('meta[property="og:description"]',description)
   setMeta('meta[property="og:url"]',canonical)
   const link=document.querySelector('link[rel="canonical"]')
   if(link)link.setAttribute('href',canonical)
 },[])
 return <div className="npv-clube-public">
   <header className="npv-clube-public-header">
     <a href="/" className="npv-clube-public-brand" aria-label="Não Pense, Vai! — página inicial"><img src={logo} alt="Não Pense, Vai!"/></a>
     <nav aria-label="Navegação da apresentação do Clube"><a href="#como-funciona">Como funciona</a><a href="#premios">Prêmios</a><a href="#niveis">Níveis</a></nav>
     <a className="npv-clube-public-login" href="/clube">Já sou aluno <ArrowUpRight size={16}/></a>
   </header>
   <main>
     <section className="npv-clube-public-hero" aria-labelledby="clube-hero-title">
       <div className="npv-clube-public-hero-inner">
         <div className="npv-clube-public-copy">
           <span className="npv-clube-public-eyebrow"><Sparkles size={15}/> MAIS DO QUE UMA PLATAFORMA DE TREINOS</span>
           <h1 id="clube-hero-title">Seu esforço merece <em>ir mais longe.</em></h1>
           <p>Na Não Pense, Vai!, a sua evolução continua depois do treino. Participe dos desafios, acumule pontos, avance de nível e aproveite recompensas e vantagens de parceiros.</p>
           <div className="npv-clube-public-actions">
             <a className="npv-clube-public-cta" href="/#planos">Conhecer planos <ArrowRight size={20}/></a>
             <a className="npv-clube-public-outline" href="#como-funciona">Descubra como funciona <ChevronRight size={18}/></a>
           </div>
           <div className="npv-clube-public-hero-foot"><ShieldCheck size={18}/> Seus pontos pertencem à sua conta. O Clube tem acesso e atividades sujeitos à validação.</div>
         </div>
         <div className="npv-clube-public-visual" aria-label="Apresentação ilustrativa do cartão NPV Bronze">
           <div className="npv-clube-public-orbit orbit-one"/>
           <div className="npv-clube-public-orbit orbit-two"/>
           <span className="npv-clube-public-orbit-label"><Medal size={17}/> SUA TRAJETÓRIA, SEU NÍVEL</span>
           <div className="npv-clube-public-card-back"/>
           <div className="npv-clube-public-card-front"><img src="/clube/cards/bronze.webp" alt="Cartão digital Bronze do Clube NPV"/></div>
           <div className="npv-clube-public-chip"><Trophy size={18}/><span>6 níveis de evolução <strong>Bronze ao Black</strong></span></div>
         </div>
       </div>
     </section>

     <section id="como-funciona" className="npv-clube-public-section npv-clube-public-how">
       <div className="npv-clube-public-container">
         <div className="npv-clube-public-section-header"><span className="npv-clube-public-kicker">A EXPERIÊNCIA NPV</span><h2>Simples de começar.<br/><em>Bom de continuar.</em></h2><p>Uma jornada que valoriza sua constância, dentro e fora dos treinos.</p></div>
         <div className="npv-clube-public-steps">{steps.map(step=><article key={step.n}><span className="npv-clube-public-stepno">{step.n}</span><span className="npv-clube-public-steplabel">{step.label}</span><h3>{step.title}</h3><p>{step.description}</p></article>)}</div>
       </div>
     </section>

     <section className="npv-clube-public-points">
       <div className="npv-clube-public-container">
         <div className="npv-clube-public-section-header"><span className="npv-clube-public-kicker">CONTINUE ACUMULANDO</span><h2>Pequenas ações.<br/><em>Grandes conquistas.</em></h2><p>Descubra algumas maneiras de participar e evoluir no Clube.</p></div>
         <div className="npv-clube-public-point-grid">{activities.map(({icon:Icon,title,details})=><article key={title}><span className="npv-clube-public-point-icon"><Icon size={23}/></span><h3>{title}</h3><p>{details}</p></article>)}</div>
         <p className="npv-clube-public-fine">A pontuação depende das regras, condições e validações de cada atividade. Consulte os detalhes na sua área do aluno.</p>
       </div>
     </section>

     <section id="premios" className="npv-clube-public-section npv-clube-public-rewards">
       <div className="npv-clube-public-container">
         <div className="npv-clube-public-section-header"><span className="npv-clube-public-kicker">PRÊMIOS DO CLUBE</span><h2>Seu próximo objetivo<br/><em>já tem um lugar.</em></h2><p>Uma amostra de recompensas do catálogo NPV. A disponibilidade é confirmada no momento do resgate.</p></div>
         <div className="npv-clube-public-reward-grid">{rewards.map((r)=><article key={r.name}><div className="npv-clube-public-reward-photo"><img src={r.image} alt={'Foto de '+r.name} loading="lazy"/></div><div className="npv-clube-public-reward-copy"><span>RECOMPENSA NPV</span><h3>{r.name}</h3><p><Gift size={15}/> {fmt(r.points)} pontos</p></div></article>)}</div>
         <div className="npv-clube-public-perk"><span><Zap size={21}/> VANTAGENS DE PARCEIROS</span><p>Além dos pontos, conheça condições especiais de marcas parceiras como Cacow, Z2 Performance, Hey!Mu e LIQUIDZ. Consulte os benefícios vigentes dentro do Clube.</p></div>
       </div>
     </section>

     <section id="niveis" className="npv-clube-public-levels">
       <div className="npv-clube-public-container">
         <div className="npv-clube-public-levels-inner">
           <div><span className="npv-clube-public-kicker">MINHA TRAJETÓRIA</span><h2>Um novo nível.<br/><em>Uma nova história.</em></h2><p>Cada etapa tem seu cartão digital. Conforme sua pontuação evolui, novos níveis são desbloqueados e você descobre o restante da coleção.</p></div>
           <div className="npv-clube-public-level-grid">{MEMBER_LEVELS.map(level=><div key={level.level}><span>{String(level.level).padStart(2,'0')}</span><strong>{level.name}</strong></div>)}</div>
         </div>
         <p className="npv-clube-public-fine">Ao atingir a pontuação necessária, seu próximo cartão é desbloqueado automaticamente. Confira as metas e os benefícios dentro do Clube.</p>
       </div>
     </section>

     <section className="npv-clube-public-final">
       <div className="npv-clube-public-container">
         <span className="npv-clube-public-kicker">O PRÓXIMO PASSO É SEU</span><h2>Seu treino transforma.<br/><em>Sua constância conquista.</em></h2>
         <p>Treinos organizados, vídeos de execução, conteúdos renovados a cada cinco semanas e uma experiência que recompensa sua participação.</p>
         <div className="npv-clube-public-actions"><a className="npv-clube-public-cta" href="/#planos">Ver planos da plataforma <ArrowRight size={20}/></a><a className="npv-clube-public-outline" href="/clube"><LockKeyhole size={16}/> Já tenho acesso ao Clube</a></div>
         <small>Os planos são adquiridos na Hotmart. O Clube tem cadastro e aprovação próprios e não substitui a área de treinos.</small>
       </div>
     </section>
   </main>
   <footer className="npv-clube-public-footer"><span>© 2026 Não Pense, Vai!</span><span>Clube de Benefícios NPV</span><a href="/">Voltar ao site principal <ArrowUpRight size={14}/></a></footer>
 </div>
}
