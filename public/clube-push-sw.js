/* NPV Admin — Web Push sem cache, sem interceptar navegação. */
self.addEventListener('push',event=>{
 let message={}
 try{message=event.data?.json()||{}}catch{}
 const destinations=new Set(['inicio','alunos','recompensas','conexoes'])
 let tab='inicio'
 try{const url=new URL(message.url||'',self.location.origin);const candidate=url.searchParams.get('npv_admin_tab');if(url.origin===self.location.origin&&url.pathname==='/clube'&&destinations.has(candidate))tab=candidate}catch{}
 const opts={body:typeof message.body==='string'?message.body.slice(0,180):'Você tem uma pendência no Clube NPV.',
  tag:typeof message.tag==='string'?message.tag.slice(0,80):'npv-admin',
  badge:'/favicon.ico',icon:'/favicon.ico',data:{url:'/clube?npv_admin_tab='+tab},
  renotify:true}
 event.waitUntil(self.registration.showNotification('Não Pense, Vai! · '+(message.title||'Aviso administrativo'),opts))
})
self.addEventListener('notificationclick',event=>{
 event.notification.close()
 event.waitUntil((async()=>{
  const url=new URL(event.notification.data?.url||'/clube',self.location.origin)
  if(url.origin!==self.location.origin||url.pathname!=='/clube')return
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true})
  const existing=windows.find(x=>{try{return new URL(x.url).origin===url.origin&&new URL(x.url).pathname==='/clube'}catch{return false}})
  if(existing){await existing.focus(); if('navigate' in existing)await existing.navigate(url.href);return}
  await self.clients.openWindow(url.href)
 })())
})
