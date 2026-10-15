import {supabase} from '/supabase-client.js?v=20261015-reliability';
const $=s=>document.querySelector(s);
const sections=['Welcome to Steady Hands','Personal information','Work preferences','Payment preferences'];
const roles=[['Sales Associate',true],['Digital Growth Coordinator',true],['Website Developer',false],['Client Support Specialist',false],['Operations Coordinator',false]];
let user,step=0,saving=false;
let previousStepWarning='';
let reviewingFromFinal=false;
let state={name:'',dob:'',phone:'',email:'',address:'',city:'',country:'',region:'',zip:'',role:'',weeklyHours:null,onboardingVersion:6,trainingDone:false,paymentMethod:'',paymentDetail:'',paymentConsent:false,complete:false,step:0};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const field=(label,id,type='text',value='',attrs='')=>`<label for="${id}"><span class="field-label-text">${esc(label.replace(/\s*\*$/, ''))}${attrs.includes('required')?' <span class="required-star" aria-label="required">*</span>':''}</span><input id="${id}" type="${type}" value="${esc(value)}" ${attrs}></label>`;
const paymentDetailLabel=method=>({zelle:'Zelle email or phone',applepay:'Apple Pay phone number',cashapp:'Cash App $Cashtag',paypal:'PayPal email',other:'Preferred payment method'})[method]||'Payment details';
const paymentPlaceholder=method=>({zelle:'Email or phone number',applepay:'+1(000)000-0000',cashapp:'$YourCashtag',paypal:'you@example.com',other:'Specify your preference'})[method]||'';
// Keep onboarding narration and tutorial videos mutually exclusive.
// Capture 'play' so this also applies to any additional videos added later.
document.addEventListener('play', event => {
 const active = event.target;
 if (!(active instanceof HTMLMediaElement)) return;
 document.querySelectorAll('audio, video').forEach(media => {
  if (media !== active && !media.paused) media.pause();
 });
}, true);
const mark=html=>{
 // Stop audio/video when moving to another onboarding section.
 document.querySelectorAll('#step-content audio, #step-content video').forEach(media=>media.pause());
 $('#step-content').innerHTML=html;
};
// Format US-style local numbers and optional international calling prefixes.
// The placeholder remains +1(000)000-0000 for every phone-only field.
function phoneParts(raw){
 const text=String(raw||'').trim();
 const match=text.match(/(?:\s|^)(?:ext(?:ension)?\.?|x|#)\s*(\d{0,8})\s*$/i);
 const extension=match?match[1]:null;
 const main=(match?text.slice(0,match.index):text).replace(/\D/g,'').slice(0,15);
 return {main,extension,international:text.startsWith('+')};
}
function formatPhone(raw){
 const {main,extension,international}=phoneParts(raw);
 if(!main)return '';
 // Preserve explicit international entry while the caller is still typing.
 if(international&&main.length<=10)return '+'+main;
 const prefix=main.length>10?main.slice(0,-10):'';
 const local=main.length>10?main.slice(-10):main;
 let value=prefix?'+'+prefix:'';
 if(local.length<=3)value+='('+local;
 else if(local.length<=6)value+='('+local.slice(0,3)+')'+local.slice(3);
 else value+='('+local.slice(0,3)+')'+local.slice(3,6)+'-'+local.slice(6);
 if(extension!==null)value+=' ext'+(extension?' '+extension:'');
 return value;
}
function validPhone(raw){
 const digits=phoneParts(raw).main;
 // Ten digits locally or 11–15 digits with a clearly specified international prefix.
 return digits.length===10 || (String(raw||'').trim().startsWith('+')&&digits.length>=11&&digits.length<=15);
}
function attachPhoneFormat(){
 const method=state.paymentMethod;
 const detail=$('#payment-detail');
 // Zelle accepts either an email address or a phone number; Apple Pay takes a phone.
 const phoneInputs=['phone','emergency-phone'];
 if(detail&&(method==='applepay'||method==='zelle'))phoneInputs.push('payment-detail');
 for(const id of phoneInputs){
  const el=$('#'+id);if(!el)continue;
  const mixed=id==='payment-detail'&&method==='zelle';
  if(!mixed)el.setAttribute('type','tel');
  el.setAttribute('inputmode',mixed?'text':'tel');
  el.setAttribute('placeholder',mixed?'Email or +1(000)000-0000':'+1(000)000-0000');
  el.setAttribute('maxlength','45');
  if(!mixed||(!el.value.includes('@')&&/[0-9+]/.test(el.value)))el.value=formatPhone(el.value);
  el.addEventListener('input',()=>{
   const before=el.value;
   if(mixed&&(before.includes('@')||/[a-z]/i.test(before.replace(/(?:ext(?:ension)?\.?|x)\s*\d*$/i,''))))return;
   const position=el.selectionStart??before.length;
   const digitsBefore=before.slice(0,position).replace(/\D/g,'').length;
   const formatted=formatPhone(before);el.value=formatted;
   if(document.activeElement===el){
    let caret=formatted.length,seen=0;
    if(digitsBefore===0)caret=formatted.startsWith('+')?1:formatted.startsWith('(')?1:0;
    else for(let i=0;i<formatted.length;i++)if(/\d/.test(formatted[i])&&++seen===digitsBefore){caret=i+1;break}
    el.setSelectionRange(caret,caret);
   }
  });
 }
}
function render(){
 const p=Math.round(sections.map((_,i)=>i).filter(isComplete).length/sections.length*100);$('#percent').textContent=p+'%';$('#progress-fill').style.width=p+'%';
 $('#step-nav').innerHTML=sections.map((name,i)=>`<button class="step-item ${i===step?'active':''} ${isComplete(i)?'done':''}" data-step="${i}" type="button" title="${esc(name)}" ${state.complete?'aria-label="View '+esc(name)+' (read-only)"':''}><span class="step-circle">${isComplete(i)?'✓':i+1}</span><span class="step-text"><span class="step-index">${i+1}.</span> ${esc(name)}</span></button>`).join('');
 $('#step-counter').textContent=`STEP ${step+1} OF ${sections.length}`;$('#back').hidden=step===0;
 let returnButton=$('#return-review');if(returnButton){returnButton.hidden=!(state.complete&&step!==3);returnButton.textContent='← Back to completed overview';}$('#next').hidden=state.complete;$('#next').textContent=step===3?'Complete onboarding':'Save and continue →';$('#status').textContent='';$('#status').removeAttribute('role');document.querySelectorAll('.step-item').forEach(btn=>btn.addEventListener('click',()=>jumpToStep(Number(btn.dataset.step))));
 if(step===0)mark(`<p class="eyebrow">WELCOME TO THE TEAM</p><h1>Let's get you started.</h1><p class="lead">Welcome to Steady Hands LLC. This short onboarding walks you through your information, company orientation, and the next steps for your role.</p><div class="hero-graphic"><img src="images/background2.jpg" alt=""><div><span>STEADY HANDS LLC</span><h2>Great work starts with a steady hand.</h2></div></div><section class="welcome-narration" aria-label="Welcome audio narration"><div class="welcome-audio-heading"><span class="welcome-audio-icon" aria-hidden="true"><img src="images/audio-speaker.svg" alt=""></span><div><strong>Welcome message</strong><small>Listen to your introduction before beginning onboarding.</small></div></div><audio controls preload="metadata" src="audios/Intro.mp3" aria-label="Steady Hands LLC welcome narration">Your browser does not support audio playback. <a href="audios/Intro.mp3">Listen to the welcome message</a>.</audio></section><div class="info-strip"><strong>About 10 minutes</strong><span>Four easy steps · Progress saved</span></div>`);
 if(step===1){
  mark(`<p class="eyebrow">ABOUT YOU</p><h1>Your Information</h1><p class="lead">Please confirm your information before continuing. Required fields are marked *.</p><div class="field-grid">${field('Full legal name *','full-name','text',state.name,'autocomplete="name" maxlength="120" required')}${field('Email address *','email','email',state.email||user?.email||'','autocomplete="email" placeholder="name@example.com" required')}${field('Phone number *','phone','tel',state.phone,'autocomplete="tel" maxlength="45" required')}${field('Country of residence *','country','text',state.country,'autocomplete="country-name" maxlength="100" placeholder="e.g. United States or Canada" required')}${field('State / Province of residence *','region','text',state.region,'autocomplete="address-level1" maxlength="100" placeholder="e.g. Nevada or Ontario" required')}</div><div class="role-group"><h3>Position you're joining <span class="required-star">*</span></h3><p class="hint">Only positions accepting new team members can be selected.</p><div class="role-options">${roles.map(([title,open])=>`<label class="role-choice ${open?'':'is-full'}"><input type="radio" name="team-role" value="${esc(title)}" ${state.role===title?'checked':''} ${open?'':'disabled'}><span>${esc(title)}${title==='Sales Associate'?'<small class="trial-tag">2-Week Paid Trial</small>':''}</span><small class="${open?'':'full-badge'}">${open?'Available':'Unavailable'}</small></label>`).join('')}</div></div><p class="hint">Additional information required for payroll will be collected separately through a secure process.</p>`);
  document.querySelectorAll('input[name="team-role"]').forEach(input=>input.addEventListener('change',()=>{state.role=input.value;document.querySelectorAll('.role-choice').forEach(el=>el.classList.toggle('selected',Boolean(el.querySelector('input:checked'))));}));
 }

 if(step===2){
  const hours=Number(state.weeklyHours);
  mark(`<p class="eyebrow">WORK PREFERENCES</p><h1>Your preferred schedule</h1><p class="lead">Select the weekly hours you'd prefer to work. These are your preferred hours, not guaranteed hours. Your hourly rate will be determined by your signed agreement.</p><div class="schedule-options"><label class="schedule-choice"><input type="radio" name="weekly-hours" value="10" ${hours===10?'checked':''}><span><strong>10 hours per week</strong><small>About 2 hours per workday over 5 days</small></span></label><label class="schedule-choice"><input type="radio" name="weekly-hours" value="20" ${hours===20?'checked':''}><span><strong>20 hours per week</strong><small>About 4 hours per workday over 5 days</small></span></label></div><p class="hint">Your signed agreement will confirm your hourly rate and applicable work terms.</p>`);
  document.querySelectorAll('input[name="weekly-hours"]').forEach(input=>input.addEventListener('change',()=>{state.weeklyHours=Number(input.value);render()}));
 }
 if(step===3 && state.complete){mark(`<div class="finish-icon">✓</div><p class="eyebrow center">ONBOARDING COMPLETE</p><h1 class="center">Welcome to Steady Hands!</h1><p class="lead center">Your information has been saved successfully.</p><p class="center"><a class="primary-button" href="training.html">Continue to Training →</a></p>`)}
 if(step===3 && !state.complete){
  const methods=[['direct-deposit','Direct deposit'],['check','Paper check'],['zelle','Zelle'],['cashapp','Cash App'],['paypal','PayPal'],['applepay','Apple Pay'],['other','Other']];
  mark(`<p class="eyebrow">PAYROLL PREFERENCES</p><h1>Preferred payment method</h1><p class="lead">Choose how you would prefer to receive your pay. Your selection is a request only; Steady Hands LLC will confirm the payroll methods legally available in your work location.</p><div class="payment-options">${methods.map(([id,title])=>`<label class="payment-choice"><input type="radio" name="payment-method" value="${id}" ${state.paymentMethod===id?'checked':''}><span>${title}</span></label>`).join('')}</div><div id="payment-details" class="payment-details" ${['zelle','applepay','cashapp','paypal','other'].includes(state.paymentMethod)?'':'hidden'}><label class="payment-detail-label" for="payment-detail">${paymentDetailLabel(state.paymentMethod)} <span class="required-star">*</span></label><input id="payment-detail" type="${state.paymentMethod==='applepay'?'tel':'text'}" inputmode="${state.paymentMethod==='applepay'?'tel':'text'}" maxlength="130" autocomplete="off" placeholder="${paymentPlaceholder(state.paymentMethod)}" value="${esc(state.paymentDetail)}"></div><p class="hint">Do not enter bank account numbers, routing numbers, passwords, or other sensitive financial information here. Direct deposit enrollment will be handled through a secure payroll system.</p><label class="agree"><input id="payment-consent" type="checkbox" ${state.paymentConsent?'checked':''}><span>I understand my preference is subject to availability, company approval, and applicable wage-payment requirements. <span class="required-star">*</span></span></label>`);
  document.querySelectorAll('input[name="payment-method"]').forEach(el=>el.addEventListener('change',()=>{collectDraft();state.paymentMethod=el.value;state.paymentDetail='';render()}));
 }
 previousStepWarning='';
 attachPhoneFormat();
 if(state.complete){
  const area=$('#step-content');
  area.querySelectorAll('input, textarea, select, button').forEach(el=>{el.disabled=true;});
  const message=document.createElement('p');
  message.className='readonly-banner';
  message.textContent='View only · Your onboarding is complete. Saved answers cannot be changed.';
  area.prepend(message);

 }
 $('#step-content').addEventListener('input',()=>{if($('#status').getAttribute('role')==='alert'){collectDraft();showIssues(step)}},{passive:true});
 $('#step-content').addEventListener('change',()=>{if($('#status').getAttribute('role')==='alert'){collectDraft();showIssues(step)}},{passive:true});
}
// Each section can be left unfinished. A checkmark reflects actual data completion,
// never merely the fact that someone has visited a later page.
const filled=x=>Boolean(String(x??'').trim());
const isValidDob=v=>Boolean(v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && v<=new Date().toISOString().slice(0,10));

function isComplete(i){
 if(i===0)return true;
 if(i===1)return ['name','phone','email','country','region'].every(k=>filled(state[k])) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email) && validPhone(state.phone) && roles.some(([r,open])=>open&&r===state.role);
 if(i===2)return [10,20].includes(Number(state.weeklyHours));
 if(i===3)return Boolean(state.paymentMethod && state.paymentConsent && (!['zelle','applepay','cashapp','paypal','other'].includes(state.paymentMethod) || (filled(state.paymentDetail) && (state.paymentMethod!=='applepay' || validPhone(state.paymentDetail)))));

 return false;
}
const missingFields={
  1:[['name','full-name','Full legal name'],['email','email','Email address'],['phone','phone','Phone number'],['country','country','Country of residence'],['region','region','State / Province of residence'],['role',null,'Position']],
  2:[['weeklyHours','weekly-hours','Weekly schedule']],
  3:[['paymentMethod',null,'Select how you would like to be paid'],['paymentConsent','payment-consent','Confirm payment preferences'],['paymentDetail','payment-detail','Payment account detail']]
};
function issues(i){
  const result=[];
  for(const [key,id,label] of missingFields[i]||[]){
    if(key==='paymentDetail'&&!['zelle','applepay','cashapp','paypal','other'].includes(state.paymentMethod))continue;
    const value=state[key];
    if(!value||!String(value).trim()){result.push({id,label,reason:'required'});continue}
    if(key==='dob'&&!isValidDob(value))result.push({id,label,reason:'Enter a valid date of birth that is not in the future'});
    if((key==='phone'||key==='emergencyPhone')&&!validPhone(value))result.push({id,label,reason:'Enter a complete 10-digit number (optional country code and extension allowed)'});
    if(key==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))result.push({id,label,reason:'Enter a valid email address'});
    if(key==='paymentDetail'&&state.paymentMethod==='applepay'&&!validPhone(value))result.push({id,label,reason:'Enter a valid phone number'});
    if(key==='weeklyHours' && ![10,20].includes(Number(value)))result.push({id,label,reason:'Select 10 or 20 hours per week'});
    if(key==='role'&&!roles.some(([r,open])=>open&&r===value))result.push({id,label,reason:'Select an available position'});

  }
  return result;
}
function showIssues(i){
  const found=issues(i);
  document.querySelectorAll('.field-error').forEach(el=>el.remove());
  document.querySelectorAll('.invalid-field').forEach(el=>{el.classList.remove('invalid-field');el.removeAttribute('aria-invalid')});
  for(const problem of found){
    const el=problem.id?document.getElementById(problem.id):document.querySelector('.role-group');
    if(!el)continue;
    el.classList.add('invalid-field');
    el.setAttribute('aria-invalid','true');
    const holder=el.closest('label')||el;
    const warning=document.createElement('small');warning.className='field-error';warning.textContent=problem.reason==='required'?'This field is required.':problem.reason;
    holder.append(warning);
  }
  const status=$('#status');
  if(found.length){status.textContent='Please complete: '+found.map(x=>x.label).join(', ')+'. You can still use Back and Next to save a draft.';status.setAttribute('role','alert')}
  else{status.textContent='';status.removeAttribute('role')}
  return found;
}
function collectDraft(){
 const value=id=>$('#'+id)?.value?.trim()??'';
 if(step===1){
  Object.assign(state,{name:value('full-name'),phone:value('phone'),email:value('email'),country:value('country'),region:value('region')});
  state.role=$('input[name="team-role"]:checked')?.value||'';
 }
 if(step===2){state.weeklyHours=Number($('input[name="weekly-hours"]:checked')?.value)||null;}
 if(step===3){state.paymentMethod=$('input[name="payment-method"]:checked')?.value||state.paymentMethod||'';state.paymentDetail=$('#payment-detail')?.value.trim()??state.paymentDetail;state.paymentConsent=Boolean($('#payment-consent')?.checked)}
}

function askAboutIncomplete(){
 return new Promise(resolve=>{
  const dialog=document.getElementById('incomplete-dialog');
  const finish=document.getElementById('incomplete-finish');
  const later=document.getElementById('incomplete-later');
  let resolved=false;
  const decide=value=>{if(resolved)return;resolved=true;dialog.close();cleanup();resolve(value)};
  const cancel=event=>{event.preventDefault();decide(false)};
  const cleanup=()=>{finish.removeEventListener('click',onFinish);later.removeEventListener('click',onLater);dialog.removeEventListener('cancel',cancel)};
  const onFinish=()=>decide(false);
  const onLater=()=>decide(true);
  finish.addEventListener('click',onFinish);later.addEventListener('click',onLater);dialog.addEventListener('cancel',cancel);
  dialog.showModal();finish.focus();
 });
}


// Final-review checklist: show only missing required items, grouped by page.
function completionProblems(){
 const groups=[];
 for(const index of [1,2,3]){
  const items=issues(index);
  if(items.length)groups.push({index,title:sections[index],items});
 }
 return groups;
}
function showCompletionChecklist(){
 const groups=completionProblems();
 if(!groups.length)return false;
 const dialog=$('#completion-dialog');
 const list=$('#completion-missing');
 const count=groups.reduce((n,g)=>n+g.items.length,0);
 $('#completion-count').textContent=`${count} item${count===1?'':'s'} remaining across ${groups.length} section${groups.length===1?'':'s'}`;
 list.innerHTML=groups.map(group=>`<section class="completion-page"><h3>${esc(group.title)}</h3><div class="completion-page-items">${group.items.map(item=>`<button class="completion-missing-item" type="button" data-target-step="${group.index}" data-target-field="${esc(item.id||'')}" aria-label="Go to ${esc(group.title)}: ${esc(item.label)}"><span class="completion-item-text"><strong>${esc(item.label)}</strong><small>${esc(item.reason==='required'?'Required information missing':item.reason)}</small></span><span aria-hidden="true">→</span></button>`).join('')}</div></section>`).join('');
 list.querySelectorAll('.completion-missing-item').forEach(btn=>btn.addEventListener('click',async()=>{
  const target=Number(btn.dataset.targetStep),fieldId=btn.dataset.targetField;
  dialog.close();
  await navigateToMissing(target,fieldId);
 }));
 dialog.showModal();
 $('#completion-close').focus();
 return true;
}
async function navigateToMissing(target,fieldId,showErrors=true){
 if(saving)return;
 saving=true;
 const previous=step;
 step=target;
 try{
  if(!await persist()){step=previous;return;}
  render();
  if(showErrors)showIssues(target);
  if(!showErrors){window.scrollTo(0,0);return}
  const el=fieldId?document.getElementById(fieldId):target===1?document.querySelector('.role-group'):document.querySelector('.payment-options');
  const highlight=el?.closest('label')||el;
  if(highlight){
   highlight.classList.add('completion-field-focus');
   highlight.scrollIntoView({behavior:'smooth',block:'center'});
   if(el.matches('input,select,textarea'))el.focus({preventScroll:true});
   else if(target===1)document.querySelector('input[name="team-role"]:not(:disabled)')?.focus({preventScroll:true});
   else if(target===3)document.querySelector('input[name="payment-method"]')?.focus({preventScroll:true});
   setTimeout(()=>highlight.classList.remove('completion-field-focus'),2800);
  }else window.scrollTo(0,0);
 }catch(e){step=previous;$('#status').textContent='Could not save progress. Please try again.'}
 finally{saving=false}
}
$('#completion-close').addEventListener('click',()=>$('#completion-dialog').close());
async function jumpToStep(target){
 if(saving||target===step||target<0||target>=sections.length)return;
 if(state.complete){step=target;render();window.scrollTo(0,0);return;}
 collectDraft();
 const pending=issues(step);
 if(target>step && pending.length && !await askAboutIncomplete()){showIssues(step);return;}

 saving=true;
 const previous=step;
 step=target;
 try{
  if(await persist()){render();window.scrollTo(0,0)}
  else{step=previous}
 }catch(e){step=previous;$('#status').textContent='Could not save your progress. Please try again.'}
 finally{saving=false}
}
function profileForSave(){
 const keys=['name','phone','email','country','region','role','weeklyHours','onboardingVersion','paymentMethod','paymentDetail','paymentConsent','complete','completedAt'];
 const profile=Object.fromEntries(keys.filter(key=>state[key]!==undefined).map(key=>[key,state[key]]));
 return {...profile,step,updatedAt:new Date().toISOString()};
}
async function persist(){const {error}=await supabase.auth.updateUser({data:{steadyhands_onboarding:profileForSave()}});if(error){$('#status').textContent='Could not save your progress: '+error.message;return false}return true}

function showSuccess(){
 const dialog=$('#onboarding-success');
 if(dialog && !dialog.open) dialog.showModal();
}
$('#next').onclick=async()=>{
 if(saving || state.complete)return;
 collectDraft();
 const problems=issues(step);
 if(problems.length && !await askAboutIncomplete()){showIssues(step);return;}
 if(step===3 && showCompletionChecklist())return;
 saving=true;
 const button=$('#next');button.disabled=true;button.textContent='Saving…';
 const oldStep=step, oldComplete=state.complete;
 if(step===3){if(!sections.every((_,i)=>isComplete(i))){showCompletionChecklist();button.disabled=false;render();return;}state.complete=true;state.completedAt=new Date().toISOString()}
 else step++;
 try{
  if(await persist()){
   render();window.scrollTo(0,0);
   if(state.complete)showSuccess();
  }else{step=oldStep;state.complete=oldComplete;render()}
 }catch(error){step=oldStep;state.complete=oldComplete;render();$('#status').textContent='Could not save your progress. Please try again.'}
 finally{saving=false;button.disabled=false}
};
$('#back').onclick=async()=>{
 if(saving||step===0)return;
 if(state.complete){step--;render();window.scrollTo(0,0);return;}
 collectDraft();saving=true;$('#back').disabled=true;
 const previous=step;step--;
 if(await persist()){render();window.scrollTo(0,0)}else{step=previous;render()}
 saving=false;$('#back').disabled=false;
};
$('#return-review').onclick=()=>{if(!state.complete)return;step=3;render();window.scrollTo(0,0)};
$('#success-training').onclick=()=>location.assign('training.html');
$('#success-later').onclick=()=>$('#onboarding-success').close();
$('#logout').onclick=async()=>{await supabase.auth.signOut();location.replace('login.html')};
(async()=>{try{const {data:{user:u},error}=await supabase.auth.getUser();if(error||!u){location.replace('login.html');return}user=u;$('#account-email').textContent=u.email||'';let saved=u.user_metadata?.steadyhands_onboarding;
const {data:serverProgress,error:progressError}=await supabase.from('sh_employee_onboarding')
  .select('status,reset_at').eq('user_id',u.id).maybeSingle();
if(progressError)console.warn('Could not verify onboarding reset:',progressError.message);
if(!progressError&&serverProgress?.reset_at){
 const resetTime=new Date(serverProgress.reset_at).getTime();
 const savedTime=saved?.updatedAt?new Date(saved.updatedAt).getTime():0;
 if(Number.isFinite(resetTime)&&resetTime>savedTime&&serverProgress.status==='not_started'){
   saved=null;
   const {error:clearError}=await supabase.auth.updateUser({data:{steadyhands_onboarding:null}});
   if(clearError)console.warn('Could not clear old onboarding metadata:',clearError.message);
 }
}
if(saved&&typeof saved==='object'){
 state={...state,...saved};
 if(state.paymentMethod==='applecash')state.paymentMethod='applepay';
 if(!state.country&&state.region)state.country='United States';
 if(state.role==='Marketing Director')state.role='Digital Growth Coordinator';
 const oldStep=Number(saved.step)||0;
 const version=Number(saved.onboardingVersion)||0;
 step=state.complete?3:Math.max(0,Math.min(3,version===5?(oldStep>=3?oldStep-1:oldStep):version===6?oldStep:Math.min(oldStep,2)));
 state.onboardingVersion=6;
 if(!state.email)state.email=u.email||'';
}else{state.name=u.user_metadata?.full_name||u.user_metadata?.name||'';state.email=u.email||'';}
if(state.complete&&!sections.every((_,i)=>isComplete(i))){
  state.complete=false;
  state.completedAt='';
  step=sections.findIndex((_,i)=>!isComplete(i));
  const {error:correctionError}=await supabase.auth.updateUser({data:{steadyhands_onboarding:profileForSave()}});
  if(correctionError)console.warn('Could not synchronize incomplete onboarding:',correctionError.message);
 }
 $('#private-app').hidden=false;$('#loading').hidden=true;$('#content').hidden=false;render();if(state.complete)showSuccess()}catch(e){$('#private-app').hidden=false;$('#loading').hidden=false;$('#loading').style.display='block';$('#loading').firstChild.textContent='Unable to load your account: '+(e?.message||'Please try again')+' ';const retry=document.getElementById('onboard-retry');if(retry){retry.hidden=false;retry.style.display='block'}console.error(e)}})();


