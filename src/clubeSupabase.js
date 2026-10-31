/* Exclusivo da BRANCH DE PREVIEW. Nunca publicar ou mesclar com produção.
   O aplicativo ORIGINAL roda com banco fictício em memória. Nenhuma operação
   neste arquivo chega ao Supabase e nenhum dado real é recuperado. */
import {currentNpvMonth} from '../clube/strava/challengeProgress.mjs'
export const clubeReady=true
const demoId='00000000-0000-4000-8000-000000009991'
const created=days=>new Date(Date.now()-days*86400000).toISOString()
const demoProfile={id:demoId,full_name:'Aluna Demonstração',email:'preview@exemplo.invalid',
  birthday_mmdd:'1210',phone:null,approved:true,created_at:created(390)}
const events=[
 {id:'ev-01',student_id:demoId,event_type:'renovacao',points:400,note:'Renovação confirmada',is_test:false,created_at:created(3)},
 {id:'ev-02',student_id:demoId,event_type:'desafio',points:300,note:'Desafio mensal concluído',is_test:false,created_at:created(12)},
 {id:'ev-03',student_id:demoId,event_type:'renovacao',points:400,note:'Renovação confirmada',is_test:false,created_at:created(30)},
 {id:'ev-04',student_id:demoId,event_type:'foto',points:200,note:'Foto aprovada',is_test:false,created_at:created(52)},
 {id:'ev-05',student_id:demoId,event_type:'indicacao',points:1000,note:'Indicação convertida',is_test:false,created_at:created(78)},
 {id:'ev-06',student_id:demoId,event_type:'renovacao',points:400,note:'Renovação confirmada',is_test:false,created_at:created(93)},
 {id:'ev-07',student_id:demoId,event_type:'resgate',points:-300,note:'Resgate realizado',is_test:false,created_at:created(90)}
]
const rewardImage='images/ad0bf83e-540c-4cbb-928f-4e1f02218e12.jpg'
const rewards=[
 {id:'r-01',name:'Camiseta NPV',category:'Moda NPV',description:'Camiseta oficial Não Pense, Vai!',points:6500,stock:5,icon:'shirt',theme:'ink',active:true,test_only:false,showcase:true,image_path:rewardImage,created_at:created(80)},
 {id:'r-02',name:'Garrafinha NPV',category:'Acessórios',description:'Garrafinha oficial do Clube',points:10000,stock:4,icon:'water',theme:'lime',active:true,test_only:false,showcase:true,image_path:'images/1f970571-f237-4854-85d5-cb1946bff2c4.png',created_at:created(80)},
 {id:'r-03',name:'Jaqueta NPV',category:'Moda NPV',description:'Jaqueta oficial do Clube',points:20000,stock:2,icon:'shirt',theme:'cream',active:true,test_only:false,showcase:true,image_path:'images/888896d3-1ade-4fd2-896d-bc2f279202bd.jpg',created_at:created(80)},
 {id:'r-04',name:'Tênis',category:'Esporte',description:'Prêmio especial',points:80000,stock:1,icon:'gift',theme:'sky',active:true,test_only:false,showcase:true,image_path:null,created_at:created(80)}
]
const rules=[
 {event_type:'renovacao',label:'Renovação de assinatura confirmada',points:400,position:1},
 {event_type:'desafio',label:'Desafio mensal',points:300,position:2},
 {event_type:'foto',label:'Foto antes e depois',points:200,position:3},
 {event_type:'aniversario',label:'Aniversário',points:100,position:4},
 {event_type:'indicacao',label:'Indicação convertida',points:1000,position:5},
 {event_type:'instagram_story',label:'Story marcando @naopensevai',points:200,position:6},
 {event_type:'strava_km',label:'Corrida ou caminhada',points:2,position:7}
]
const partners=[
 {id:'p-01',name:'Z2 Performance',logo_url:'',logo_key:'',link_url:'https://example.invalid',discount_percent:null,coupon_code:'Z2NAOPENSEVAI',details:'Benefícios sujeitos às condições do parceiro',active:true,position:1,created_at:created(80)},
 {id:'p-02',name:'Cacow',logo_url:'',logo_key:'',link_url:'https://example.invalid',discount_percent:null,coupon_code:'NPV5',details:'Benefícios sujeitos às condições do parceiro',active:true,position:2,created_at:created(80)},
 {id:'p-03',name:'Hey!Mu',logo_url:'',logo_key:'',link_url:'https://example.invalid',discount_percent:null,coupon_code:'NPV10',details:'Benefícios sujeitos às condições do parceiro',active:true,position:3,created_at:created(80)},
 {id:'p-04',name:'Liquids',logo_url:'/parceiros/logo-liquidz.svg',logo_key:'',link_url:'https://example.invalid',discount_percent:null,coupon_code:'NAOPENSEVAI',details:'Benefícios sujeitos às condições do parceiro',active:true,position:4,created_at:created(80)}
]
const tableData={
  clube_admins:[],clube_profiles:[demoProfile],clube_pilot_testers:[],
  clube_display_settings:[{singleton:true,theme:'light',show_journey:true,show_achievements:true}],
  clube_point_events:events,clube_rewards:rewards,clube_redemptions:[],
  clube_partners:partners,clube_point_rules:rules,
  clube_monthly_challenges:[{id:'demo-month',month_key:currentNpvMonth(),name:'Desafio de 50 km',goal_km:50,active:true,reward_points:300,position:1}],
  clube_km_settings:[{singleton:true,points_per_km:2}]
}
function tableQuery(table){
  let filter=()=>true,limitNum=Infinity,rangeStart=0,rangeEnd=Infinity,sortField=null,sortAsc=true
  const api={
    select(){return api},
    eq(key,value){const prev=filter;filter=row=>prev(row)&&row[key]===value;return api},
    in(key,values){const prev=filter;filter=row=>prev(row)&&values.includes(row[key]);return api},
    order(key,options={}){sortField=key;sortAsc=options.ascending!==false;return api},
    limit(n){limitNum=n;return api},
    range(a,b){rangeStart=a;rangeEnd=b;return api},
    maybeSingle(){const data=read()[0]??null;return Promise.resolve({data,error:null})},
    single(){const data=read()[0]??null;return Promise.resolve({data,error:null})},
    then(resolve,reject){return Promise.resolve({data:read(),error:null}).then(resolve,reject)},
    insert(){return Promise.resolve({data:null,error:{message:'Somente demonstração'}})},
    update(){return api},
    delete(){return api},
    upsert(){return Promise.resolve({data:null,error:{message:'Somente demonstração'}})}
  }
  function read(){
    let rows=(tableData[table]||[]).filter(filter)
    if(sortField)rows=rows.slice().sort((a,b)=>sortAsc?String(a[sortField]??'').localeCompare(String(b[sortField]??'')):String(b[sortField]??'').localeCompare(String(a[sortField]??'')))
    return rows.slice(rangeStart,Math.min(rangeEnd+1,rangeStart+limitNum))
  }
  return api
}
const session={user:{id:demoId,email:demoProfile.email},access_token:'PREVIEW_FICTICIO_SEM_ACESSO_REAL',expires_at:4102444800}
export const clubeSupabase={
  auth:{
    getSession:async()=>({data:{session},error:null}),
    onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
    signOut:async()=>({error:null}),
    signInWithPassword:async()=>({data:{session},error:null}),
    refreshSession:async()=>({data:{session},error:null})
  },
  from:tableQuery,
  rpc:async()=>({data:null,error:{message:'Demonstração sem alterações'}}),
  storage:{from:()=>({getPublicUrl:path=>({
    data:{publicUrl:'https://dnlyfwcrfocgafgfoyna.supabase.co/storage/v1/object/public/clube-npv-recompensas/'+path}
  })})}
}
