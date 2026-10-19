/* Resume an Outreach workspace only after the server confirms every requirement is clear. */
import {supabase,ensureHealthySession} from '/supabase-client.js?v=20261015-reliability';
const KEY='steadyhands.outreach-return';
const ORIGIN='https://outreach.steadyhandsop.com';
const PAGES=new Set(['index.html','call.html','leads.html','queue.html','activity.html','sales.html','earnings.html','account.html','skills.html','admin.html']);
export function safeReturn(value){
 try{
  const url=new URL(value);
  if(url.origin!==ORIGIN||url.username||url.password||!PAGES.has(url.pathname.slice(1)))return null;
  const id=url.searchParams.get('crm_id');url.search='';url.hash='';
  if(id)url.searchParams.set('crm_id',id);
  return url.href;
 }catch{return null;}
}
let context=null;
try{
 const incoming=new URL(location.href).searchParams;
 const target=safeReturn(incoming.get('return_to'));
 if(incoming.get('from')==='outreach'&&target){
  context={target,createdAt:Date.now(),userId:null};
  sessionStorage.setItem(KEY,JSON.stringify(context));
 }else{
  const saved=JSON.parse(sessionStorage.getItem(KEY)||'null');
  if(saved&&Date.now()-saved.createdAt<86400000&&safeReturn(saved.target))context=saved;
 }
}catch{}
let inFlight=null,again=false,leaving=false,banner=null;
function announce(text,access){
 if(!document.body)return;
 if(!banner||banner.isConnected===false){
  banner=document.createElement('aside');banner.id='outreach-return-status';
  banner.setAttribute('role','status');banner.setAttribute('aria-live','polite');
  banner.style.cssText='position:relative;z-index:1000;margin:12px auto;padding:14px 18px;max-width:900px;border:1px solid #b8cee5;border-radius:12px;background:#eef6ff;color:#18314c;font:14px/1.5 Arial,sans-serif;box-sizing:border-box';
  document.body.prepend(banner);
 }
 banner.textContent=text;
 if(access?.is_paused){
  const link=document.createElement('a');link.textContent=' Open required actions →';
  link.href=access.agreement_action_required?'/agreements/':'/actions/';
  link.style.cssText='color:#174f91;font-weight:700';banner.append(link);
 }
}
async function check(){
 if(!context||leaving)return;
 if(inFlight){again=true;return inFlight;}
 inFlight=(async()=>{
  try{
   const health=await ensureHealthySession();if(health.error)throw health.error;
   const user=health.data?.session?.user;
   if(!user)return; // Let the portal's normal login flow handle authentication.
   if(context.userId&&context.userId!==user.id){sessionStorage.removeItem(KEY);context=null;return;}
   context.userId=user.id;sessionStorage.setItem(KEY,JSON.stringify(context));
   const {data,error}=await supabase.rpc('outreach_access_status');
   if(error||typeof data?.is_paused!=='boolean')throw Error('Could not verify completion.');
   if(!data.is_paused){
    leaving=true;sessionStorage.removeItem(KEY);
    announce('All required actions are complete. Returning to Outreach…');
    location.replace(safeReturn(context.target));
   }else announce('Complete your required actions here. Outreach will resume automatically when all requirements are complete.',data);
  }catch{announce('Unable to verify completion yet. Retrying automatically…');}
 })();
 try{await inFlight;}finally{inFlight=null;if(again){again=false;check();}}
}
if(context){
 window.addEventListener('focus',check);
 window.addEventListener('pageshow',check);
 window.addEventListener('online',check);
 window.addEventListener('outreach:requirements-changed',check);
 window.addEventListener('outreach:actions-completed',check);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check();});
 window.setInterval(()=>{if(!document.hidden)check();},3000);
 supabase.auth.onAuthStateChange(()=>{setTimeout(check,0);});
 check();
}
