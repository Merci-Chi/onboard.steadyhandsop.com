'use strict';
(() => {
const URL='https://glonbvrcudwuzjundrii.supabase.co';
const KEY='sb_publishable_VZbed_uuOXSE744UrAfHXw_z2xDdYtr';
const auth=document.getElementById('trainingAuth'),site=document.getElementById('trainingProtected');
const form=document.getElementById('trainingLoginForm'),status=document.getElementById('trainingLoginStatus');
const email=document.getElementById('trainingEmail'),password=document.getElementById('trainingPassword');
const client=window.supabase?.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
window.trainingClient=client;
const stored=localStorage.getItem('training_saved_email');if(stored){email.value=stored;document.getElementById('trainingRemember').checked=true;}
let active=null;
const timeout=(p,ms=12000)=>Promise.race([p,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Connection timed out. Please retry.')),ms))]);
async function check(session){
  if(!session?.user?.id)return false;
  const {data,error}=await timeout(client.from('team_permissions').select('role,active').eq('user_id',session.user.id).maybeSingle());
  if(error)throw error;
  if(!data?.active)throw new Error('Unauthorized — an active Steady Hands team account is required.');
  return true;
}
async function enter(session){
  await check(session);
  active=session.user;
  auth.hidden=true;site.hidden=false;
  document.getElementById('trainingAccountName').textContent=active.email||'Team member';
  window.dispatchEvent(new CustomEvent('training:authenticated',{detail:{user:active}}));
}
async function initialize(){
  if(!client){status.textContent='Unable to load sign-in. Reload this page.';return;}
  try{
    const {data,error}=await timeout(client.auth.getSession());if(error)throw error;
    if(data.session)await enter(data.session);
  }catch(e){status.textContent=e.message||'Unable to verify account.';}
}
form.addEventListener('submit',async e=>{
  e.preventDefault();const button=document.getElementById('trainingSignIn');button.disabled=true;status.textContent='Signing in…';
  try{
    if(!client)throw new Error('Sign-in is unavailable.');
    const {data,error}=await timeout(client.auth.signInWithPassword({email:email.value.trim(),password:password.value}));
    if(error)throw error;
    if(document.getElementById('trainingRemember').checked)localStorage.setItem('training_saved_email',email.value.trim());
    else localStorage.removeItem('training_saved_email');
    status.textContent='Verifying team access…';await enter(data.session);
  }catch(err){status.textContent=err.message||'Sign-in failed.';}
  finally{button.disabled=false;}
});
document.getElementById('trainingShowPassword')?.addEventListener('click',()=>{const input=document.getElementById('trainingPassword'),btn=document.getElementById('trainingShowPassword');const reveal=input.type==='password';input.type=reveal?'text':'password';btn.textContent=reveal?'Hide':'Show';btn.setAttribute('aria-label',reveal?'Hide password':'Show password');});
document.getElementById('trainingForgot').addEventListener('click',async()=>{
  if(!email.value.trim()){status.textContent='Enter your email address first.';return;}
  try{const {error}=await client.auth.resetPasswordForEmail(email.value.trim(),{redirectTo:location.origin+location.pathname});if(error)throw error;status.textContent='Check your inbox for a password reset link.';}catch(e){status.textContent=e.message;}
});
document.getElementById('trainingSignOut').addEventListener('click',async()=>{await client.auth.signOut();location.reload();});
window.trainingCurrentUser=()=>active;
initialize();
})();
