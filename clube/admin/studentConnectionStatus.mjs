// Estados apresentados no ADMIN, sem confundir 'sem dados' com 'desconectado'.
export function instagramAdminStatus(record,loaded=true){
  if(!loaded)return {key:'unknown',label:'Indisponível',help:'Não foi possível consultar o Instagram'}
  if(record?.verified_at)return {key:'connected',label:'Vinculado',help:'Vínculo confirmado no Clube'}
  return {key:'disconnected',label:'Não vinculado',help:'Nenhum vínculo confirmado no Clube'}
}
export function stravaAdminStatus(record,loaded=true,now=Date.now()){
  if(!loaded)return {key:'unknown',label:'Indisponível',help:'Não foi possível consultar o Strava'}
  if(!record)return {key:'unknown',label:'A verificar',help:'A conexão fica no navegador da aluna; ainda não foi registrada uma confirmação'}
  if(record.connected===false)return {key:'disconnected',label:'Desconectado',help:'Desconexão registrada no Clube'}
  const verified=Date.parse(record.verified_at||record.updated_at||'')
  if(!Number.isFinite(verified)||verified>now+5*60*1000)return {key:'unknown',label:'A verificar',help:'Verificação da conexão indisponível'}
  if(now-verified>30*24*60*60*1000)return {key:'stale',label:'Verificar novamente',help:'Última confirmação do Strava há mais de 30 dias'}
  return {key:'connected',label:'Conectado',help:'Conexão confirmada recentemente no navegador da aluna'}
}
