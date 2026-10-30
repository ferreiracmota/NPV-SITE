// Apenas a identidade autenticada pode consultar o estado da própria assinatura.
// Não transforma cadastro aprovado em assinatura ativa nem adivinha vencimentos.
export const MEMBER_LEVELS=[
 {level:1,name:'Bronze',minimum:2000,benefit:'Cartão digital e benefícios gerais oferecidos pelos parceiros.'},
 {level:2,name:'Prata',minimum:5000,benefit:'Ofertas adicionais e acesso antecipado a novidades.'},
 {level:3,name:'Ouro',minimum:10000,benefit:'Experiências e vantagens especiais em parceiros selecionados.'},
 {level:4,name:'Platinum',minimum:15000,benefit:'Conteúdos especiais e prioridade em experiências coletivas.'},
 {level:5,name:'Diamante',minimum:20000,benefit:'Campanhas premium e convites exclusivos quando disponíveis.'},
 {level:6,name:'Black',minimum:25000,benefit:'Reconhecimento máximo e benefícios especiais a definir.'}
]
const emailKey=value=>typeof value==='string'?value.trim().toLowerCase():''
const dateKey=value=>typeof value==='string'&&!Number.isNaN(Date.parse(value))?Date.parse(value):0
export function chooseOwnSubscription(subscriptions,email){
 if(!Array.isArray(subscriptions)||!emailKey(email))return {status:'unavailable',next_charge_at:null}
 const own=subscriptions.filter(x=>emailKey(x.subscriber_email)===emailKey(email))
 if(own.length===0)return {status:'unlinked',next_charge_at:null}
 const newest=rows=>rows.slice().sort((a,b)=>dateKey(b.accession_at)-dateKey(a.accession_at))[0]
 const active=newest(own.filter(x=>String(x.status).toUpperCase()==='ACTIVE'))
 if(active)return {status:'active',next_charge_at:active.next_charge_at||null}
 if(own.some(x=>String(x.status).toUpperCase()==='DELAYED'))return {status:'delayed',next_charge_at:null}
 if(own.every(x=>['INACTIVE','CANCELLED_BY_CUSTOMER','CANCELLED_BY_ADMIN'].includes(String(x.status).toUpperCase())))
  return {status:'inactive',next_charge_at:null}
 return {status:'unavailable',next_charge_at:null}
}
