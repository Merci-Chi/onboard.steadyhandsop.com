import {supabase} from '../supabase-client.js';
window.trainingClient=supabase;
const site=document.getElementById('trainingProtected');
const message=document.createElement('p');
message.style.cssText='padding:3rem;text-align:center;font:16px system-ui';
message.textContent='Checking your team access…';
document.body.prepend(message);
try {
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user){location.replace('../login.html');}
 else {
  const {data:permission,error:permissionError}=await supabase.from('team_permissions').select('role,active').eq('user_id',user.id).maybeSingle();
  if(permissionError||!permission?.active){message.textContent='Access requires an active Steady Hands team account.';}
  else {
   document.getElementById('trainingAccountName').textContent=user.email||'Team member';
   site.hidden=false;message.remove();
   window.dispatchEvent(new CustomEvent('training:authenticated',{detail:{user}}));
  }
 }
}catch(e){console.error(e);message.textContent='Unable to verify team access. Refresh to try again.';}
document.getElementById('trainingSignOut')?.addEventListener('click',async()=>{await supabase.auth.signOut();location.replace('../login.html');});
