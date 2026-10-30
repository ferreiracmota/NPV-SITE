// Progresso demonstrativo, sempre derivado do extrato real; nunca grava pontos.
const STEPS=[
  {level:1,label:'Em movimento',minimum:0,next:2000},
  {level:2,label:'Constância',minimum:2000,next:5000},
  {level:3,label:'Determinação',minimum:5000,next:10000},
  {level:4,label:'Sem limites',minimum:10000,next:null}
]
export function firstNameOf(fullName){
  const first=String(fullName||'').trim().split(/\s+/).find(Boolean)
  return first||'Aluna'
}
export function memberAchievements(events=[],studentId){
  const real=(events||[]).filter(e=>e.student_id===studentId&&e.is_test!==true)
  const earned=Math.max(0,real.reduce((s,e)=>s+(e.event_type!=='resgate'?(Number(e.points)||0):0),0))
  // O registro automático do desafio confirma o cumprimento, não só a participação.
  const challengeKeys=new Set(real.filter(e=>e.event_type==='desafio'&&Number(e.points)>0&&
    String(e.reference_id||'').startsWith('strava:challenge:'))
    .map(e=>e.reference_id))
  const challenges=challengeKeys.size
  const level=STEPS.slice().reverse().find(s=>earned>=s.minimum)||STEPS[0]
  const progress=level.next===null?100:Math.min(100,Math.max(0,
    Math.round(100*(earned-level.minimum)/(level.next-level.minimum))))
  const earnedBadges=[
    {id:'first-points',name:'Primeiros passos',earned:earned>0,help:'Primeiros pontos conquistados'},
    {id:'constant',name:'Constância',earned:earned>=2000,help:'2.000 pontos conquistados'},
    {id:'challenge',name:'Primeiro desafio',earned:challenges>=1,help:'Primeiro desafio confirmado'},
    {id:'five-challenges',name:'Cinco desafios',earned:challenges>=5,help:'5 desafios confirmados'},
    {id:'determination',name:'Determinação',earned:earned>=5000,help:'5.000 pontos conquistados'}
  ]
  return {earned,challenges,level:level.level,levelName:level.label,next:level.next,progress,
    remaining:level.next===null?0:Math.max(0,level.next-earned),
    trophies:earnedBadges.filter(t=>t.earned).length,badges:earnedBadges}
}
export const LEVEL_RULES=STEPS
