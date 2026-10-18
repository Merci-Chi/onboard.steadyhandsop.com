// This legacy URL now opens only the assigned popup questionnaire.
import {supabase,ensureHealthySession} from '/supabase-client.js?v=20261015-reliability';

// Also clear a cached version of the old page before any further interaction.
document.title='Questionnaire · Steady Hands';
document.querySelectorAll('style').forEach(style=>style.remove());
document.body.innerHTML='<header class="header"><a class="brand" href="/index.html"><span class="brand-name">STEADY HANDS</span><span class="brand-team">ACTION NEEDED</span></a></header><main class="card" id="questionnaire-entry"><h1>Action Needed</h1><p id="questionnaire-message" role="status">Opening your assigned questionnaire…</p><button type="button" id="open-questionnaire" hidden>Open questionnaire</button><p><a class="back-link" href="/actions/">Back to your actions</a></p></main>';
const message=document.getElementById('questionnaire-message');
const openButton=document.getElementById('open-questionnaire');
let opening=false;
function script(src){return new Promise((resolve,reject)=>{const el=document.createElement('script');el.src=src;el.onload=resolve;el.onerror=()=>reject(new Error('Could not load the questionnaire. Please refresh.'));document.head.appendChild(el);});}
async function initialize(){
 try{
  const health=await ensureHealthySession();
  if(health.error)throw health.error;
  if(!health.data?.session?.user){location.replace('/login.html');return;}
  window.steadyHandsCRMClient=supabase;
  if(!document.getElementById('questionnaire-css')){
   const css=document.createElement('link');css.id='questionnaire-css';css.rel='stylesheet';css.href='/actions/questionnaire/css.css?v=20261018-single-scroll';document.head.appendChild(css);
  }
  await script('/actions/questionnaire/api.js?v=20261018-phone-entry');
  await script('/actions/questionnaire/start-dates.js?v=20261018-popup-only');
  await script('/actions/questionnaire/timezone-picker.js?v=20261018-single-scroll');
  await script('/actions/questionnaire/questionnaire.js?v=20261018-single-scroll');
  const {assignment}=await window.OutreachActions.load();
  if(!assignment){message.textContent='No questionnaire is assigned to your account. Please contact your administrator.';return;}
  if(assignment.status==='completed'){message.textContent='Your questionnaire has been submitted to your administrator.';return;}
  openButton.hidden=false;
  const open=async()=>{
   if(opening)return;opening=true;openButton.disabled=true;
   try{await window.OutreachQuestionnaire.open({onComplete(){openButton.hidden=true;message.textContent='Your questionnaire has been submitted to your administrator.';}});message.textContent='Answer one question at a time in the popup.';}
   catch(error){message.textContent=error.message||'Could not open your questionnaire. Please refresh.';}
   finally{opening=false;openButton.disabled=false;}
  };
  openButton.addEventListener('click',open);
  await open();
 }catch(error){message.textContent='Could not open the questionnaire: '+(error.message||String(error));}
}
await initialize();
