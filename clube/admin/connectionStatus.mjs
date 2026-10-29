export const STATUS_KIND=Object.freeze({
 ACTIVE:'active',LINKED:'linked',DISCONNECTED:'disconnected',UNKNOWN:'unknown'
})
const goodDate=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))?Date.parse(value):null
export function instagramAdminStatus(link,globalAuth,{configured=false,now=Date.now()}={}){
 if(!link)return {status:'disconnected',verified_at:null}
 const verified=goodDate(link.verified_at)
 if(!verified)return {status:'unknown',verified_at:null}
 const validGlobal=Boolean(configured&&globalAuth&&goodDate(globalAuth.expires_at)>now)
 return {status:validGlobal?'active':'linked',verified_at:link.verified_at}
}
export function stravaAdminStatus(row,{now=Date.now(),maxAgeDays=7}={}){
 if(!row)return {status:'unknown',verified_at:null}
 if(row.connected===false)return {status:'disconnected',verified_at:null}
 if(row.connected!==true)return {status:'unknown',verified_at:null}
 const verified=goodDate(row.verified_at)
 const fresh=verified!==null&&verified<=now&&now-verified<=maxAgeDays*86400000
 return {status:fresh?'active':'linked',verified_at:row.verified_at||null}
}
