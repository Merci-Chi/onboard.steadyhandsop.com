import {supabase} from './supabase-client.js';
const $=s=>document.querySelector(s);
const sections=['Welcome to Steady Hands','Personal information','Work preferences','Agreement','Payment preferences'];
const roles=[['Sales Associate',true],['Marketing Director',true],['Website Developer',false],['Client Support Specialist',false],['Operations Coordinator',false]];
const usStates=[["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"], ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"], ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"], ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"], ["DC", "District of Columbia"]];
let user,step=0,saving=false;
let previousStepWarning='';
let reviewingFromFinal=false;
let state={name:'',dob:'',phone:'',email:'',address:'',city:'',region:'',zip:'',role:'',weeklyHours:null,onboardingVersion:5,agreementRead:false,agreementName:'',agreementAt:'',trainingDone:false,paymentMethod:'',paymentDetail:'',paymentConsent:false,agreementTrack:'trial',agreementRole:'',complete:false,step:0};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const field=(label,id,type='text',value='',attrs='')=>`<label for="${id}"><span class="field-label-text">${esc(label.replace(/\s*\*$/, ''))}${attrs.includes('required')?' <span class="required-star" aria-label="required">*</span>':''}</span><input id="${id}" type="${type}" value="${esc(value)}" ${attrs}></label>`;
const paymentDetailLabel=method=>({zelle:'Zelle email or phone',cashapp:'Cash App $Cashtag',paypal:'PayPal email',other:'Preferred payment method'})[method]||'Payment details';
const paymentPlaceholder=method=>({zelle:'Email or phone number',cashapp:'$YourCashtag',paypal:'you@example.com',other:'Specify your preference'})[method]||'';
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
// Format ten-digit local numbers, optional 1–5-digit country calling codes,
// and optional extensions (for example: +12(345)678-9012 ext 45).
function phoneParts(raw){
 const text=String(raw||'');
 const match=text.match(/(?:\s|^)(?:ext(?:ension)?\.?|x|#)\s*(\d{0,8})\s*$/i);
 const extension=match?match[1]:null;
 const main=(match?text.slice(0,match.index):text).replace(/\D/g,'').slice(0,15);
 return {main,extension};
}
function formatPhone(raw){
 const {main,extension}=phoneParts(raw);
 if(!main)return '';
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
 const formatted=formatPhone(raw);
 return /^\+?\d{0,5}\(\d{3}\)\d{3}-\d{4}(?: ext \d{1,8})?$/.test(formatted);
}
function attachPhoneFormat(){
 for(const id of ['phone','emergency-phone']){
  const el=$('#'+id);if(!el)continue;
  el.setAttribute('inputmode','tel');
  el.setAttribute('placeholder','+1(000)000-0000');
  el.setAttribute('maxlength','45');
  el.value=formatPhone(el.value);
  el.addEventListener('input',()=>{
   const before=el.value,position=el.selectionStart??before.length;
   const preceding=before.slice(0,position).replace(/\d/g,'').length;
   const digitsBefore=before.slice(0,position).replace(/\D/g,'').length;
   const formatted=formatPhone(before);el.value=formatted;
   if(document.activeElement===el){
    let caret=formatted.length,seen=0;
    if(digitsBefore===0)caret=formatted.startsWith('+')?1:formatted.startsWith('(')?1:0;
    else for(let i=0;i<formatted.length;i++)if(/\d/.test(formatted[i])&&++seen===digitsBefore){caret=i+1;break}
    if(/(?:ext(?:ension)?\.?|x|#)/i.test(before.slice(0,position)) && / ext/.test(formatted) && position>before.toLowerCase().indexOf('ext'))caret=Math.max(caret,formatted.indexOf(' ext')+4);
    el.setSelectionRange(caret,caret);
   }
  });
 }
}
function render(){
 const p=state.complete?100:Math.round(sections.map((_,i)=>i).filter(isComplete).length/sections.length*100);$('#percent').textContent=p+'%';$('#progress-fill').style.width=p+'%';
 $('#step-nav').innerHTML=sections.map((name,i)=>`<button class="step-item ${i===step?'active':''} ${isComplete(i)?'done':''}" data-step="${i}" type="button" title="${esc(name)}" ${state.complete?'disabled':''}><span class="step-circle">${isComplete(i)?'✓':i+1}</span><span class="step-text"><span class="step-index">${i+1}.</span> ${esc(name)}</span></button>`).join('');
 $('#step-counter').textContent=`STEP ${step+1} OF ${sections.length}`;$('#back').hidden=step===0||state.complete;
 let returnButton=$('#return-review');if(returnButton)returnButton.hidden=true;$('#next').hidden=state.complete;$('#next').textContent=step===4?'Complete onboarding':'Save and continue →';$('#status').textContent='';$('#status').removeAttribute('role');document.querySelectorAll('.step-item').forEach(btn=>btn.addEventListener('click',()=>jumpToStep(Number(btn.dataset.step))));
 if(step===0)mark(`<p class="eyebrow">WELCOME TO THE TEAM</p><h1>Let's get you started.</h1><p class="lead">Welcome to Steady Hands LLC. This short onboarding walks you through your information, company orientation, and the next steps for your role.</p><div class="hero-graphic"><img src="images/background2.jpg" alt=""><div><span>STEADY HANDS LLC</span><h2>Great work starts with a steady hand.</h2></div></div><section class="welcome-narration" aria-label="Welcome audio narration"><div class="welcome-audio-heading"><span class="welcome-audio-icon" aria-hidden="true"><img src="images/audio-speaker.svg" alt=""></span><div><strong>Welcome message</strong><small>Listen to your introduction before beginning onboarding.</small></div></div><audio controls preload="metadata" src="audios/Intro.mp3" aria-label="Steady Hands LLC welcome narration">Your browser does not support audio playback. <a href="audios/Intro.mp3">Listen to the welcome message</a>.</audio></section><div class="info-strip"><strong>About 10 minutes</strong><span>Five easy steps · Progress saved</span></div>`);
 if(step===1)mark(`<p class="eyebrow">ABOUT YOU</p><h1>Your Information</h1><p class="lead">Please confirm your information before continuing. Required fields are marked *.</p><div class="field-grid">${field('Full legal name *','full-name','text',state.name,'autocomplete="name" maxlength="120" required')}${field('Email address *','email','email',state.email||user?.email||'','autocomplete="email" placeholder="name@example.com" required')}${field('Phone number *','phone','tel',state.phone,'autocomplete="tel" maxlength="45" required')}<label for="region"><span class="field-label-text">State of residence <span class="required-star" aria-label="required">*</span></span><select id="region" autocomplete="address-level1" required><option value="">Select your state</option>${usStates.map(([code,name])=>`<option value="${code}" ${state.region===code||state.region===name?'selected':''}>${name}</option>`).join('')}</select></label><label for="team-role"><span class="field-label-text">Position <span class="required-star" aria-label="required">*</span></span><select id="team-role" required><option value="">Select your position</option>${roles.map(([title,open])=>`<option value="${esc(title)}" ${state.role===title?'selected':''} ${open?'':'disabled'}>${esc(title)}${open?'':' — Unavailable'}</option>`).join('')}</select></label></div><p class="hint">Unavailable positions cannot be selected. Any additional information required for payroll will be collected separately through a secure process.</p>`);
 if(step===2){
  const hours=Number(state.weeklyHours);
  mark(`<p class="eyebrow">WORK PREFERENCES</p><h1>Your preferred schedule</h1><p class="lead">Select the weekly hours you'd prefer to work. Your choice will appear in your employment agreement and is subject to company approval.</p><div class="schedule-options"><label class="schedule-choice"><input type="radio" name="weekly-hours" value="10" ${hours===10?'checked':''}><span><strong>10 hours per week</strong><small>About 2 hours per workday over 5 days</small></span></label><label class="schedule-choice"><input type="radio" name="weekly-hours" value="20" ${hours===20?'checked':''}><span><strong>20 hours per week</strong><small>About 4 hours per workday over 5 days</small></span></label></div><p class="hint">This is a preferred schedule, not a promise of fixed hours. Your finalized offer will confirm scheduling and applicable pay terms.</p>`);
  document.querySelectorAll('input[name="weekly-hours"]').forEach(input=>input.addEventListener('change',()=>{state.weeklyHours=Number(input.value);state.agreementRead=false;state.agreementName='';state.agreementAt='';state.agreementRole='';render()}));
 }
 if(step===3){
   const sales=state.role==='Sales Associate';
   const track=sales?(state.agreementTrack==='regular'?'regular':'trial'):'marketing';
   const hours=Number(state.weeklyHours)===10?10:20;
   const scheduleText=`${hours} hours per week (about ${hours/5} hours each workday, based on 5 workdays)`;
   const weeklyBase=hours*12;
   const salesBonus=`<h4>Weekly Sales Performance Bonuses</h4><p>In addition to hourly pay and qualifying commissions, a Sales Associate may earn a <strong>$100 weekly bonus for 5–9 qualifying sales</strong> or a <strong>$250 weekly bonus for 10 or more qualifying sales</strong>. These are <strong>alternative weekly tiers, not cumulative</strong>; the maximum bonus under this schedule is $250 for a qualifying week.</p><p>Qualifying sales, weekly measurement periods, refunds or cancellations, and payment timing will be specified in the employer-issued written compensation plan. Bonuses do not replace hourly wages or required overtime pay. All compensation remains subject to applicable law.</p>`;
   const docs={
    trial:{title:'Sales Associate — 2-Week Paid Trial',body:`<p><strong>Role:</strong> Sales Associate. <strong>Trial length:</strong> 2 weeks. <strong>Expected schedule:</strong> ${scheduleText}.</p><p><strong>Proposed compensation:</strong> $12/hour plus $30 commission per qualifying sale, subject to applicable wage and commission laws. Start/end dates, place of work, pay dates, commission eligibility and payout terms must be confirmed in an employer-issued offer.</p>${salesBonus}<p><strong>Duties:</strong> outreach, explaining services accurately, recording activity in approved CRM tools, and protecting client information.</p><p><strong>Trial review:</strong> Performance and possible continuation will be reviewed after two weeks. A trial is not a guarantee of continued employment and does not waive wage or other workplace rights.</p><h4>Sales Performance &amp; Continued Employment Eligibility</h4><p>During the two-week paid trial, Sales Associates are expected to work toward a target of <strong>4–5 qualifying sales per week</strong>.</p><p>Performance will be evaluated based on sales results, outreach activity, follow-up consistency, CRM documentation, attendance, and professionalism.</p><p>Achieving the weekly sales target may support eligibility for continued employment but does not guarantee a permanent position.</p><p>Performance below the target will be reviewed individually and will not automatically result in disqualification.</p><p><strong>All hours worked will be compensated regardless of sales performance.</strong></p>`},
    regular:{title:'Sales Associate — Regular Employment',body:`<p><strong>Role:</strong> Sales Associate. <strong>Schedule:</strong> ${scheduleText}, with flexible scheduling. Employees may select their preferred working hours, subject to company approval.</p><p><strong>Compensation:</strong> $12/hour or the higher applicable minimum wage, plus $30 commission per qualifying sale. Based on ${hours} hours worked at $12/hour, illustrative base pay is $${weeklyBase} per week before taxes, excluding commissions.</p>${salesBonus}<p><strong>Duties:</strong> Contact prospective clients, accurately explain services and pricing, maintain CRM records, complete follow-ups, and protect confidential information.</p><p><strong>Sales Performance:</strong> Sales Associates are expected to work toward a target of <strong>4–5 qualifying sales per week</strong>. Performance will be evaluated based on sales, outreach activity, follow-ups, CRM accuracy, attendance, and professionalism. Falling below the target will be reviewed individually and will not automatically result in termination.</p><p><strong>Continued Employment:</strong> Performance, reliability, and adherence to company policies will be considered when reviewing continued employment. All hours worked will be compensated regardless of sales performance.</p><p><strong>Employment terms:</strong> Start date, work location, pay dates, and commission payment terms will be confirmed separately by Steady Hands LLC.</p>`},
    marketing:{title:'Marketing Director — Employment',body:`<p><strong>Role:</strong> Marketing Director.</p><p><strong>Compensation and hours:</strong> To be established in an individualized employer-issued offer. No salary, hours, bonus, or employment classification is assumed by this page.</p><p><strong>Duties:</strong> plan marketing strategy, manage campaigns, maintain brand standards, track results, and report to company leadership.</p><p><strong>Scope of authority:</strong> Advertising spending limits, approvals, account access, and any managerial authority must be approved separately.</p>`}
   };
   const doc=docs[track];
   const roleKey=`${state.role}:${track}:${hours}`;
   const sameTerms=state.agreementRole===roleKey;
   mark(`<p class="eyebrow">YOUR EMPLOYMENT</p><h1>Employment agreement</h1><p class="lead">Review the terms for your selected role. This is a role-specific draft acknowledgment, not the final legally reviewed employment offer.</p><div class="document-panel"><h3>${esc(doc.title)}</h3>${doc.body}<p><strong>General acknowledgment:</strong> I understand the expectations above, will follow lawful company policies, maintain confidentiality and use only approved tools. This acknowledgment does not waive statutory rights.</p></div><label class="agree"><input id="agreement-read" type="checkbox" ${sameTerms&&state.agreementRead?'checked':''}><span>I have read the ${esc(doc.title)} acknowledgment. <span class="required-star">*</span></span></label>${field('Agreement signature — type your full legal name *','agreement-name','text',sameTerms?state.agreementName:'','autocomplete="name" required')}<p class="hint">A finalized written offer with actual pay, dates and relevant state-law terms should be issued separately before employment begins.</p>`);
   document.querySelectorAll('input[name="agreement-track"]').forEach(input=>input.addEventListener('change',()=>{state.agreementTrack=input.value;state.agreementRead=false;state.agreementName='';state.agreementAt='';state.agreementRole='';render()}));
 }
 if(step===4 && state.complete){mark(`<div class="finish-icon">✓</div><p class="eyebrow center">ONBOARDING COMPLETE</p><h1 class="center">Welcome to Steady Hands!</h1><p class="lead center">Your information has been saved successfully.</p><p class="center"><a class="primary-button" href="training.html">Continue to Training →</a></p>`)}
 if(step===4 && !state.complete){
  const methods=[['direct-deposit','Direct deposit'],['check','Paper check'],['zelle','Zelle'],['cashapp','Cash App'],['paypal','PayPal'],['applecash','Apple Cash'],['other','Other']];
  mark(`<p class="eyebrow">PAYROLL PREFERENCES</p><h1>Preferred payment method</h1><p class="lead">Choose how you would prefer to receive your pay. Your selection is a request only; Steady Hands LLC will confirm the payroll methods legally available in your work location.</p><div class="payment-options">${methods.map(([id,title])=>`<label class="payment-choice"><input type="radio" name="payment-method" value="${id}" ${state.paymentMethod===id?'checked':''}><span>${title}</span></label>`).join('')}</div><div id="payment-details" class="payment-details" ${['zelle','cashapp','paypal','other'].includes(state.paymentMethod)?'':'hidden'}><label class="payment-detail-label" for="payment-detail">${paymentDetailLabel(state.paymentMethod)} <span class="required-star">*</span></label><input id="payment-detail" type="text" maxlength="130" autocomplete="off" placeholder="${paymentPlaceholder(state.paymentMethod)}" value="${esc(state.paymentDetail)}"></div><p class="hint">Do not enter bank account numbers, routing numbers, passwords, or other sensitive financial information here. Direct deposit enrollment will be handled through a secure payroll system.</p><label class="agree"><input id="payment-consent" type="checkbox" ${state.paymentConsent?'checked':''}><span>I understand my preference is subject to availability, company approval, and applicable wage-payment requirements. <span class="required-star">*</span></span></label>`);
  document.querySelectorAll('input[name="payment-method"]').forEach(el=>el.addEventListener('change',()=>{collectDraft();state.paymentMethod=el.value;state.paymentDetail='';render()}));
 }
 previousStepWarning='';
 attachPhoneFormat();
 $('#step-content').addEventListener('input',()=>{if($('#status').getAttribute('role')==='alert'){collectDraft();showIssues(step)}},{passive:true});
 $('#step-content').addEventListener('change',()=>{if($('#status').getAttribute('role')==='alert'){collectDraft();showIssues(step)}},{passive:true});
}
// Each section can be left unfinished. A checkmark reflects actual data completion,
// never merely the fact that someone has visited a later page.
const filled=x=>Boolean(String(x??'').trim());
const isValidDob=v=>Boolean(v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && v<=new Date().toISOString().slice(0,10));

function isComplete(i){
 if(i===0)return true;
 if(i===1)return ['name','phone','email','region'].every(k=>filled(state[k])) && usStates.some(([code,name])=>state.region===code||state.region===name) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email) && validPhone(state.phone) && roles.some(([r,open])=>open&&r===state.role);
 if(i===2)return [10,20].includes(Number(state.weeklyHours));
 if(i===3)return Boolean(state.agreementRole===`${state.role}:${state.role==='Sales Associate'?(state.agreementTrack==='regular'?'regular':'trial'):'marketing'}:${Number(state.weeklyHours)}` && state.agreementRead && filled(state.agreementName) && filled(state.name) && state.agreementName.trim().toLowerCase()===state.name.trim().toLowerCase());
 if(i===4)return Boolean(state.paymentMethod && state.paymentConsent && (!['zelle','cashapp','paypal','other'].includes(state.paymentMethod) || filled(state.paymentDetail)));

 return false;
}
const missingFields={
  1:[['name','full-name','Full legal name'],['email','email','Email address'],['phone','phone','Phone number'],['region','region','State of residence'],['role','team-role','Position']],
  2:[['weeklyHours','weekly-hours','Weekly schedule']],
  3:[['agreementRead','agreement-read','Agreement acknowledgement'],['agreementName','agreement-name','Agreement signature']],
  4:[['paymentMethod',null,'Select how you would like to be paid'],['paymentConsent','payment-consent','Confirm payment preferences'],['paymentDetail','payment-detail','Payment account detail']]
};
function issues(i){
  const result=[];
  for(const [key,id,label] of missingFields[i]||[]){
    if(key==='paymentDetail'&&!['zelle','cashapp','paypal','other'].includes(state.paymentMethod))continue;
    const value=state[key];
    if(!value||!String(value).trim()){result.push({id,label,reason:'required'});continue}
    if(key==='dob'&&!isValidDob(value))result.push({id,label,reason:'Enter a valid date of birth that is not in the future'});
    if((key==='phone'||key==='emergencyPhone')&&!validPhone(value))result.push({id,label,reason:'Enter a complete 10-digit number (optional country code and extension allowed)'});
    if(key==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))result.push({id,label,reason:'Enter a valid email address'});
    if(key==='region'&&!usStates.some(([code,name])=>code===value||name===value))result.push({id,label,reason:'Select a valid state'});
    if(key==='weeklyHours' && ![10,20].includes(Number(value)))result.push({id,label,reason:'Select 10 or 20 hours per week'});
    if(key==='role'&&!roles.some(([r,open])=>open&&r===value))result.push({id,label,reason:'Select an available position'});
    if(key==='agreementName'&&filled(state.name)&&String(value).trim().toLowerCase()!==state.name.trim().toLowerCase())result.push({id,label,reason:'Must match your full legal name'});
  }
  if(i===3 && state.agreementRole!==`${state.role}:${state.role==='Sales Associate'?(state.agreementTrack==='regular'?'regular':'trial'):'marketing'}:${Number(state.weeklyHours)}` && !result.some(x=>x.id==='agreement-read'))result.unshift({id:'agreement-read',label:'Acknowledge the agreement for your selected role',reason:'Review and acknowledge your current agreement'});
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
  Object.assign(state,{name:value('full-name'),phone:value('phone'),email:value('email'),region:value('region')});
  state.role=value('team-role');
 }
 if(step===2){state.weeklyHours=Number($('input[name="weekly-hours"]:checked')?.value)||null;}
 if(step===3){state.agreementRead=Boolean($('#agreement-read')?.checked);state.agreementName=value('agreement-name');state.agreementRole=`${state.role}:${state.role==='Sales Associate'?(state.agreementTrack==='regular'?'regular':'trial'):'marketing'}:${Number(state.weeklyHours)}`;state.agreementAt=isComplete(3)?state.agreementAt||new Date().toISOString():'';}
 if(step===4){state.paymentMethod=$('input[name="payment-method"]:checked')?.value||state.paymentMethod||'';state.paymentDetail=$('#payment-detail')?.value.trim()??state.paymentDetail;state.paymentConsent=Boolean($('#payment-consent')?.checked)}
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
 for(const index of [1,2,3,4]){
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
   else if(target===1)document.querySelector('#team-role')?.focus({preventScroll:true});
   else if(target===3)document.querySelector('input[name="payment-method"]')?.focus({preventScroll:true});
   setTimeout(()=>highlight.classList.remove('completion-field-focus'),2800);
  }else window.scrollTo(0,0);
 }catch(e){step=previous;$('#status').textContent='Could not save progress. Please try again.'}
 finally{saving=false}
}
$('#completion-close').addEventListener('click',()=>$('#completion-dialog').close());
async function jumpToStep(target){
 if(saving||state.complete||target===step||target<0||target>=sections.length)return;
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
async function persist(){const {error}=await supabase.auth.updateUser({data:{steadyhands_onboarding:{...state,step,updatedAt:new Date().toISOString()}}});if(error){$('#status').textContent='Could not save your progress: '+error.message;return false}return true}
function showSuccess(){
 const dialog=$('#onboarding-success');
 if(dialog && !dialog.open) dialog.showModal();
}
$('#next').onclick=async()=>{
 if(saving || state.complete)return;
 collectDraft();
 const problems=issues(step);
 if(problems.length && !await askAboutIncomplete()){showIssues(step);return;}
 if(step===4 && showCompletionChecklist())return;
 saving=true;
 const button=$('#next');button.disabled=true;button.textContent='Saving…';
 const oldStep=step, oldComplete=state.complete;
 if(step===4){state.complete=true;state.completedAt=new Date().toISOString()}
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
 if(saving||step===0||state.complete)return;
 collectDraft();saving=true;$('#back').disabled=true;
 const previous=step;step--;
 if(await persist()){render();window.scrollTo(0,0)}else{step=previous;render()}
 saving=false;$('#back').disabled=false;
};
$('#success-training').onclick=()=>location.assign('training.html');
$('#success-later').onclick=()=>$('#onboarding-success').close();
$('#logout').onclick=async()=>{await supabase.auth.signOut();location.replace('login.html')};
(async()=>{try{const {data:{user:u},error}=await supabase.auth.getUser();if(error||!u){location.replace('login.html');return}user=u;$('#account-email').textContent=u.email||'';const saved=u.user_metadata?.steadyhands_onboarding;if(saved&&typeof saved==='object'){state={...state,...saved};if(Number(saved.onboardingVersion)!==5){if(![10,20].includes(Number(saved.weeklyHours))){state.weeklyHours=20;}state.agreementRead=false;state.agreementName='';state.agreementAt='';state.agreementRole='';const oldStep=Number(saved.step)||0;step=state.complete?4:Math.max(0,Math.min(4,oldStep>=2?oldStep+1:oldStep));state.onboardingVersion=5;}else{step=state.complete?4:Math.max(0,Math.min(4,Number(saved.step)||0));}if(!state.email)state.email=u.email||''}else{state.name=u.user_metadata?.full_name||u.user_metadata?.name||'';state.email=u.email||''}$('#private-app').hidden=false;$('#loading').hidden=true;$('#content').hidden=false;render();if(state.complete)showSuccess()}catch(e){$('#loading').textContent='Unable to load your account. Please refresh and try again.';console.error(e)}})();
