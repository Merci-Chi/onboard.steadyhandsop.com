import {supabase} from './supabase-client.js';
const $=s=>document.querySelector(s);
const sections=['Welcome','Personal information','Employment agreement','Training & resources','Payment preferences','Complete'];
const roles=[['Sales Associate',true],['Marketing Director',true],['Website Developer',false],['Client Support Specialist',false],['Operations Coordinator',false]];
let user,step=0,saving=false;
let previousStepWarning='';
let reviewingFromFinal=false;
let state={name:'',dob:'',phone:'',email:'',address:'',city:'',region:'',zip:'',role:'',agreementRead:false,agreementName:'',agreementAt:'',trainingDone:false,paymentMethod:'',paymentDetail:'',paymentConsent:false,agreementTrack:'trial',agreementRole:'',complete:false,step:0};
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
 const p=state.complete?100:Math.round([0,1,2,3,4].filter(isComplete).length/5*100);$('#percent').textContent=p+'%';$('#progress-fill').style.width=p+'%';
 $('#step-nav').innerHTML=sections.map((name,i)=>`<button class="step-item ${i===step?'active':''} ${isComplete(i)?'done':''}" data-step="${i}" type="button" title="${esc(name)}" ${state.complete&&i!==5?'disabled':''}><span class="step-circle">${isComplete(i)?'✓':i+1}</span><span class="step-text"><span class="step-index">${i+1}.</span> ${esc(name)}</span></button>`).join('');
 $('#step-counter').textContent=`STEP ${step+1} OF ${sections.length}`;$('#back').hidden=step===0||state.complete;
 let returnButton=$('#return-review');if(returnButton)returnButton.hidden=state.complete||step===5||!reviewingFromFinal;$('#next').hidden=state.complete;$('#next').textContent=step===5?'Submit onboarding':reviewingFromFinal?'Save & return to review':'Save and continue →';$('#status').textContent='';$('#status').removeAttribute('role');document.querySelectorAll('.step-item').forEach(btn=>btn.addEventListener('click',()=>jumpToStep(Number(btn.dataset.step))));
 if(step===0)mark(`<p class="eyebrow">WELCOME TO THE TEAM</p><h1>Let's get you started.</h1><p class="lead">Welcome to Steady Hands LLC. This short onboarding walks you through your information, company orientation, and the next steps for your role.</p><div class="hero-graphic"><img src="images/background2.jpg" alt=""><div><span>STEADY HANDS LLC</span><h2>Great work starts with a steady hand.</h2></div></div><section class="welcome-narration" aria-label="Welcome audio narration"><div class="welcome-audio-heading"><span class="welcome-audio-icon" aria-hidden="true"><img src="images/audio-speaker.svg" alt=""></span><div><strong>Welcome message</strong><small>Listen to your introduction before beginning onboarding.</small></div></div><audio controls preload="metadata" src="audios/Intro.mp3" aria-label="Steady Hands LLC welcome narration">Your browser does not support audio playback. <a href="audios/Intro.mp3">Listen to the welcome message</a>.</audio></section><div class="info-strip"><strong>About 10 minutes</strong><span>Six easy sections · Progress saved</span></div>`);
 if(step===1)mark(`<p class="eyebrow">ABOUT YOU</p><h1>Your personal information</h1><p class="lead">Please enter your legal details accurately. Required fields are marked *. Your role selection is limited by available openings.</p><div class="field-grid">${field('Your full name *','full-name','text',state.name,'autocomplete="name" maxlength="120" required')}${field('Date of birth *','dob','date',state.dob,'required max="'+new Date().toISOString().slice(0,10)+'"')}${field('Phone number *','phone','tel',state.phone,'autocomplete="tel" maxlength="30" required')}${field('Email address *','email','email',state.email,'autocomplete="email" placeholder="name@example.com" required')}${field('Street address *','address','text',state.address,'autocomplete="street-address" required maxlength="200"')}${field('City *','city','text',state.city,'autocomplete="address-level2" required maxlength="90"')}${field('State *','region','text',state.region,'autocomplete="address-level1" required maxlength="60"')}${field('ZIP / postal code *','zip','text',state.zip,'autocomplete="postal-code" required maxlength="15"')}</div><div class="role-group"><h3>Position you're joining <span class="required-star" aria-label="required">*</span></h3><p class="hint">Only positions accepting new team members can be selected.</p><div class="role-options">${roles.map(([title,open])=>`<label class="role-choice ${open?'':'is-full'}"><input type="radio" name="teamrole" value="${esc(title)}" ${state.role===title?'checked':''} ${open?'':'disabled'}><span>${esc(title)}${title==='Sales Associate'?'<small class="trial-tag">2-Week Paid Trial</small>':''}</span>${open?'<small>Available</small>':'<small class="full-badge">Unavailable</small>'}</label>`).join('')}</div></div><p class="hint">This prototype stores profile entries in the signed-in account metadata. For production, move sensitive employee records to an access-controlled HR database.</p>`);
 if(step===2){
   const sales=state.role==='Sales Associate';
   const track=sales?(state.agreementTrack==='regular'?'regular':'trial'):'marketing';
   const docs={
    trial:{title:'Sales Associate — 2-Week Paid Trial',body:`<p><strong>Role:</strong> Sales Associate. <strong>Trial length:</strong> 2 weeks. <strong>Expected schedule:</strong> 20 hours per week (about 4 hours each workday).</p><p><strong>Proposed compensation:</strong> $12/hour plus $30 commission per qualifying sale, subject to applicable wage and commission laws. Start/end dates, place of work, pay dates, commission eligibility and payout terms must be confirmed in an employer-issued offer.</p><p><strong>Duties:</strong> outreach, explaining services accurately, recording activity in approved CRM tools, and protecting client information.</p><p><strong>Trial review:</strong> Performance and possible continuation will be reviewed after two weeks. A trial is not a guarantee of continued employment and does not waive wage or other workplace rights.</p><h4>Sales Performance &amp; Continued Employment Eligibility</h4><p>During the two-week paid trial, Sales Associates are expected to work toward a target of <strong>4–5 qualifying sales per week</strong>.</p><p>Performance will be evaluated based on sales results, outreach activity, follow-up consistency, CRM documentation, attendance, and professionalism.</p><p>Achieving the weekly sales target may support eligibility for continued employment but does not guarantee a permanent position.</p><p>Performance below the target will be reviewed individually and will not automatically result in disqualification.</p><p><strong>All hours worked will be compensated regardless of sales performance.</strong></p>`},
    regular:{title:'Sales Associate — Regular Employment',body:`<p><strong>Role:</strong> Sales Associate. <strong>Schedule:</strong> 20 hours per week (4 hours per day, 5 days per week), with flexible scheduling. Employees may select their preferred working hours, subject to company approval.</p><p><strong>Compensation:</strong> $12/hour or the higher applicable minimum wage, plus $30 commission per qualifying sale. Based on 20 hours worked, expected base pay is $240 per week before taxes, excluding commissions.</p><p><strong>Duties:</strong> Contact prospective clients, accurately explain services and pricing, maintain CRM records, complete follow-ups, and protect confidential information.</p><p><strong>Sales Performance:</strong> Sales Associates are expected to work toward a target of <strong>4–5 qualifying sales per week</strong>. Performance will be evaluated based on sales, outreach activity, follow-ups, CRM accuracy, attendance, and professionalism. Falling below the target will be reviewed individually and will not automatically result in termination.</p><p><strong>Continued Employment:</strong> Performance, reliability, and adherence to company policies will be considered when reviewing continued employment. All hours worked will be compensated regardless of sales performance.</p><p><strong>Employment terms:</strong> Start date, work location, pay dates, and commission payment terms will be confirmed separately by Steady Hands LLC.</p>`},
    marketing:{title:'Marketing Director — Employment',body:`<p><strong>Role:</strong> Marketing Director.</p><p><strong>Compensation and hours:</strong> To be established in an individualized employer-issued offer. No salary, hours, bonus, or employment classification is assumed by this page.</p><p><strong>Duties:</strong> plan marketing strategy, manage campaigns, maintain brand standards, track results, and report to company leadership.</p><p><strong>Scope of authority:</strong> Advertising spending limits, approvals, account access, and any managerial authority must be approved separately.</p>`}
   };
   const doc=docs[track];
   const roleKey=`${state.role}:${track}`;
   const sameTerms=state.agreementRole===roleKey;
   mark(`<p class="eyebrow">YOUR EMPLOYMENT</p><h1>Employment agreement</h1><p class="lead">Review the terms for your selected role. This is a role-specific draft acknowledgment, not the final legally reviewed employment offer.</p><div class="document-panel"><h3>${esc(doc.title)}</h3>${doc.body}<p><strong>General acknowledgment:</strong> I understand the expectations above, will follow lawful company policies, maintain confidentiality and use only approved tools. This acknowledgment does not waive statutory rights.</p></div><label class="agree"><input id="agreement-read" type="checkbox" ${sameTerms&&state.agreementRead?'checked':''}><span>I have read the ${esc(doc.title)} acknowledgment. <span class="required-star">*</span></span></label>${field('Agreement signature — type your full legal name *','agreement-name','text',sameTerms?state.agreementName:'','autocomplete="name" required')}<p class="hint">A finalized written offer with actual pay, dates and relevant state-law terms should be issued separately before employment begins.</p>`);
   document.querySelectorAll('input[name="agreement-track"]').forEach(input=>input.addEventListener('change',()=>{state.agreementTrack=input.value;state.agreementRead=false;state.agreementName='';state.agreementAt='';state.agreementRole='';render()}));
 }
 if(step===3)mark(`<p class="eyebrow">YOUR FIRST DAY</p><h1>Training & resources</h1><p class="lead">Take a moment to learn how we work and where to find help. Your team lead will provide any job-specific training and approved account access.</p><section class="training-audios" aria-label="Welcome narration"><div class="audio-heading"><span class="eyebrow">LISTEN &amp; LEARN</span><h2>Welcome to Steady Hands</h2><p>Listen to both parts of our company introduction before continuing. Use the controls to pause, replay, or adjust the volume.</p></div><div class="audio-tracks"><div class="audio-track"><div class="audio-track-title"><span class="audio-number"><img src="images/audio-speaker.svg" alt=""></span><div><strong>Welcome &amp; our mission</strong><small>Part 1 of 2</small></div></div><audio controls preload="metadata" src="audios/Welcome1.mp3" aria-label="Welcome and our mission, part 1">Your browser does not support audio playback. <a href="audios/Welcome1.mp3">Open part 1</a>.</audio></div><div class="audio-track"><div class="audio-track-title"><span class="audio-number"><img src="images/audio-speaker.svg" alt=""></span><div><strong>Our values &amp; your training</strong><small>Part 2 of 2</small></div></div><audio controls preload="metadata" src="audios/Welcome2.mp3" aria-label="Our values and your training, part 2">Your browser does not support audio playback. <a href="audios/Welcome2.mp3">Open part 2</a>.</audio></div></div></section><section class="outreach-setup" aria-label="Install the Outreach App"><div class="outreach-setup-heading"><span class="eyebrow">YOUR WORKSPACE</span><h2>Install the Outreach App</h2><p>Choose your device and follow the audio instructions.</p><a class="outreach-open-link" href="https://outreach.steadyhandsop.com/" target="_blank" rel="noopener noreferrer">Open Outreach <span aria-hidden="true">↗</span></a></div><div class="install-guides"><article class="install-guide"><div class="install-guide-top"><span class="install-browser-icon safari-icon"><img src="https://cdn.jsdelivr.net/npm/simple-icons@v15/icons/safari.svg" alt="" loading="lazy"><span class="install-icon-fallback" aria-hidden="true">S</span></span><div><h3>Safari</h3><p>iPhone, iPad &amp; Mac</p></div></div><audio controls preload="metadata" src="audios/Safari.mp3" aria-label="Safari installation instructions">Your browser does not support audio. <a href="audios/Safari.mp3">Listen to Safari instructions</a>.</audio><div class="install-steps"><p><strong>iPhone / iPad</strong><br>Share → Add to Home Screen → Open as Web App → Add</p><p><strong>Mac</strong><br>File → Add to Dock → Add</p></div></article><article class="install-guide"><div class="install-guide-top"><span class="install-browser-icon chrome-icon"><img src="https://cdn.jsdelivr.net/npm/simple-icons@v15/icons/googlechrome.svg" alt="" loading="lazy"><span class="install-icon-fallback" aria-hidden="true">C</span></span><div><h3>Google Chrome</h3><p>Android &amp; Windows</p></div></div><audio controls preload="metadata" src="audios/Chrome.mp3" aria-label="Google Chrome installation instructions">Your browser does not support audio. <a href="audios/Chrome.mp3">Listen to Chrome instructions</a>.</audio><div class="install-steps"><p><strong>Android</strong><br>Three-dot menu → Add to Home screen → Install or Add</p><p><strong>Windows</strong><br>Three-dot menu → Install page as app → Install</p></div></article></div><p class="install-tip">On Apple devices, we recommend Safari. On Android and Windows, use Chrome. Browser menu wording may vary by version.</p></section><section class="tutorial-videos" aria-label="Outreach app training videos"><div class="tutorial-videos-heading"><span class="eyebrow">APP TRAINING</span><h2>Outreach App Tutorials</h2><p>Watch the six-part training series to get familiar with the app.</p></div><article class="tutorial-video-feature"><div class="tutorial-video-title"><span class="tutorial-video-number">01</span><div><h3>Getting Started with Outreach</h3><p>Introduction to the Outreach app and finding leads.</p></div></div><video controls preload="metadata" playsinline src="App-Tutorial%20Videos/01-Getting-Started-with-Outreach.mp4" aria-label="Video 1: Getting Started with Outreach">Your browser does not support video playback. <a href="App-Tutorial%20Videos/01-Getting-Started-with-Outreach.mp4">Open video 1</a>.</video></article><div class="tutorial-upcoming" aria-label="Upcoming tutorials"><div><strong>02</strong><span>Video 2</span><small>Coming soon</small></div><div><strong>03</strong><span>Video 3</span><small>Coming soon</small></div><div><strong>04</strong><span>Video 4</span><small>Coming soon</small></div><div><strong>05</strong><span>Video 5</span><small>Coming soon</small></div><div><strong>06</strong><span>Video 6</span><small>Coming soon</small></div></div></section><label class="agree"><input id="training-done" type="checkbox" ${state.trainingDone?'checked':''}><span>I have reviewed these orientation materials. <span class="required-star">*</span></span></label>`);
 if(step===4){
  const methods=[['direct-deposit','Direct deposit'],['check','Paper check'],['zelle','Zelle'],['cashapp','Cash App'],['paypal','PayPal'],['applecash','Apple Cash'],['other','Other']];
  mark(`<p class="eyebrow">PAYROLL PREFERENCES</p><h1>Preferred payment method</h1><p class="lead">Choose how you would prefer to receive your pay. Your selection is a request only; Steady Hands LLC will confirm the payroll methods legally available in your work location.</p><div class="payment-options">${methods.map(([id,title])=>`<label class="payment-choice"><input type="radio" name="payment-method" value="${id}" ${state.paymentMethod===id?'checked':''}><span>${title}</span></label>`).join('')}</div><div id="payment-details" class="payment-details" ${['zelle','cashapp','paypal','other'].includes(state.paymentMethod)?'':'hidden'}><label class="payment-detail-label" for="payment-detail">${paymentDetailLabel(state.paymentMethod)} <span class="required-star">*</span></label><input id="payment-detail" type="text" maxlength="130" autocomplete="off" placeholder="${paymentPlaceholder(state.paymentMethod)}" value="${esc(state.paymentDetail)}"></div><p class="hint">Do not enter bank account numbers, routing numbers, passwords, or other sensitive financial information here. Direct deposit enrollment will be handled through a secure payroll system.</p><label class="agree"><input id="payment-consent" type="checkbox" ${state.paymentConsent?'checked':''}><span>I understand my preference is subject to availability, company approval, and applicable wage-payment requirements. <span class="required-star">*</span></span></label>`);
  document.querySelectorAll('input[name="payment-method"]').forEach(el=>el.addEventListener('change',()=>{collectDraft();state.paymentMethod=el.value;state.paymentDetail='';render()}));
 }
 if(step===5){
  if(state.complete){mark(`<div class="finish-icon">✓</div><p class="eyebrow center">COMPLETED</p><h1 class="center">Welcome aboard, ${esc((state.name||'').split(' ')[0])}!</h1><p class="lead center">Your onboarding is complete. You can return to this page to view your confirmation.</p><div class="summary"><span>Position</span><b>${esc(state.role)}</b><span>Completion</span><b>${esc(new Date(state.completedAt).toLocaleDateString())}</b><span>Status</span><b>Completed</b></div>`)}
  else{
   const cards=[
    {i:1,name:'Personal information',description:'Name, contact details, address and position',icon:'user-round'},
    {i:2,name:'Employment agreement',description:'Your assigned agreement and acknowledgment',icon:'file-signature'},
    {i:3,name:'Training & resources',description:'Welcome audio, Outreach setup and training review',icon:'book-open'},
    {i:4,name:'Payment preferences',description:'Preferred payment method and acknowledgment',icon:'wallet'}
   ];
   const ready=cards.filter(c=>isComplete(c.i)).length;
   mark(`<p class="eyebrow">FINAL REVIEW</p><h1>Review your onboarding</h1><p class="lead">Check each section before submitting. You can return to any page to correct your information, even if it is marked complete.</p><div class="review-progress"><div><strong>${ready} of ${cards.length} sections complete</strong><span>${ready===cards.length?'Everything required is filled out. Please review before submitting.':'Finish the items marked Needs attention before submitting.'}</span></div><div class="review-progress-track"><div style="width:${ready/cards.length*100}%"></div></div></div><div class="review-cards">${cards.map(c=>{const pending=issues(c.i),ok=isComplete(c.i);return `<article class="review-card"><div class="review-card-top"><span class="review-card-icon" aria-hidden="true">${`<img src="images/review-${c.icon}.svg" alt="" width="21" height="21">`}</span><div class="review-card-detail"><h2>${esc(c.name)}</h2><p>${esc(c.description)}</p></div><span class="review-status ${ok?'is-ready':'needs-attention'}">${ok?'✓ Complete':'! Needs attention'}</span></div>${pending.length?`<div class="review-missing"><strong>Still needed:</strong><ul>${pending.map(issue=>`<li><button type="button" class="review-field-link" data-review-step="${c.i}" data-review-field="${esc(issue.id||'')}">${esc(issue.label)} <span aria-hidden="true">↗</span></button></li>`).join('')}</ul></div>`:''}<button type="button" class="review-card-button" data-review-step="${c.i}">${ok?'Review / Edit':'Fix Now'} <span aria-hidden="true">→</span></button></article>`}).join('')}</div><p class="review-final-note">Your saved information will stay in place when you go back to make changes. Signed agreements must be acknowledged again if their details change.</p>`);
   document.querySelectorAll('[data-review-step]').forEach(b=>b.addEventListener('click',async()=>{reviewingFromFinal=true;await navigateToMissing(Number(b.dataset.reviewStep),b.dataset.reviewField||'',Boolean(b.dataset.reviewField))}));
  }
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
 if(i===1)return ['name','dob','phone','email','address','city','region','zip'].every(k=>filled(state[k])) && isValidDob(state.dob) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email) && validPhone(state.phone) && roles.some(([r,open])=>open&&r===state.role);
 if(i===2)return Boolean(state.agreementRole===`${state.role}:${state.role==='Sales Associate'?(state.agreementTrack==='regular'?'regular':'trial'):'marketing'}` && state.agreementRead && filled(state.agreementName) && filled(state.name) && state.agreementName.trim().toLowerCase()===state.name.trim().toLowerCase());
 if(i===3)return Boolean(state.trainingDone);
 if(i===4)return Boolean(state.paymentMethod && state.paymentConsent && (!['zelle','cashapp','paypal','other'].includes(state.paymentMethod) || filled(state.paymentDetail)));
 if(i===5)return Boolean(state.complete);
 return false;
}
const missingFields={
  1:[['name','full-name','Your full name'],['dob','dob','Date of birth'],['phone','phone','Phone number'],['email','email','Email address'],['address','address','Street address'],['city','city','City'],['region','region','State'],['zip','zip','ZIP / postal code'],['role',null,'Position']],
  2:[['agreementRead','agreement-read','Agreement acknowledgement'],['agreementName','agreement-name','Agreement signature']],
  3:[['trainingDone','training-done','Confirm training completion']],
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
    if(key==='role'&&!roles.some(([r,open])=>open&&r===value))result.push({id,label,reason:'Select an available position'});
    if(key==='agreementName'&&filled(state.name)&&String(value).trim().toLowerCase()!==state.name.trim().toLowerCase())result.push({id,label,reason:'Must match your full legal name'});
  }
  if(i===2 && state.agreementRole!==`${state.role}:${state.role==='Sales Associate'?(state.agreementTrack==='regular'?'regular':'trial'):'marketing'}` && !result.some(x=>x.id==='agreement-read'))result.unshift({id:'agreement-read',label:'Acknowledge the agreement for your selected role',reason:'Review and acknowledge your current agreement'});
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
  Object.assign(state,{name:value('full-name'),dob:value('dob'),phone:value('phone'),email:value('email'),address:value('address'),city:value('city'),region:value('region'),zip:value('zip')});
  state.role=$('input[name="teamrole"]:checked')?.value||'';
 }
 if(step===2){state.agreementRead=Boolean($('#agreement-read')?.checked);state.agreementName=value('agreement-name');state.agreementRole=`${state.role}:${state.role==='Sales Associate'?(state.agreementTrack==='regular'?'regular':'trial'):'marketing'}`;state.agreementAt=isComplete(2)?state.agreementAt||new Date().toISOString():'';}
 if(step===3)state.trainingDone=Boolean($('#training-done')?.checked);
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
   else if(target===1)document.querySelector('input[name="teamrole"]:not(:disabled)')?.focus({preventScroll:true});
   else if(target===4)document.querySelector('input[name="payment-method"]')?.focus({preventScroll:true});
   setTimeout(()=>highlight.classList.remove('completion-field-focus'),2800);
  }else window.scrollTo(0,0);
 }catch(e){step=previous;$('#status').textContent='Could not save progress. Please try again.'}
 finally{saving=false}
}
$('#completion-close').addEventListener('click',()=>$('#completion-dialog').close());
async function jumpToStep(target){
 if(saving||target===step||target<0||target>=sections.length)return;
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
$('#next').onclick=async()=>{
 if(saving)return;
 collectDraft();
 // Allow a saved draft to continue only after the user confirms missing information.
 // Final completion must still have all required information.
 if(step===5){if(showCompletionChecklist())return;$('#submit-confirm').showModal();return;}
 if(reviewingFromFinal){await returnToReview();return;}
 const currentStep=step;
 const pending=issues(step);
 if(pending.length && !await askAboutIncomplete()){showIssues(step);return;}
 saving=true;
 const btn=$('#next');btn.disabled=true;
 const oldText=btn.textContent;btn.textContent='Saving…';
 const previous=step;
 if(step===5){state.complete=true;state.completedAt=new Date().toISOString()}else step++;
 try {
  if(await persist()){render();window.scrollTo(0,0)}
  else {step=previous;state.complete=false;btn.textContent=oldText;previousStepWarning='';}
 } catch(e){step=previous;state.complete=false;$('#status').textContent='Could not save your progress. Please try again.';previousStepWarning='';}
 finally {saving=false;btn.disabled=false;btn.textContent=step===5?'Submit onboarding':reviewingFromFinal?'Save & return to review':'Save and continue →'}
};
$('#back').onclick=async()=>{
 if(saving||step===0)return;
 collectDraft();saving=true;$('#back').disabled=true;
 const previous=step;step--;
 if(await persist()){render();window.scrollTo(0,0)}else{step=previous;$('#back').disabled=false}
 saving=false;$('#back').disabled=false;
};
async function returnToReview(){
 if(saving||step===5||state.complete)return;
 collectDraft();saving=true;
 const old=step;step=5;
 try{if(await persist()){reviewingFromFinal=false;render();window.scrollTo(0,0)}else{step=old;render()}}
 catch(e){step=old;render();$('#status').textContent='Could not save your changes. Please try again.'}
 finally{saving=false}
}
$('#return-review').addEventListener('click',returnToReview);
$('#submit-cancel').addEventListener('click',()=>$('#submit-confirm').close());
$('#submit-yes').addEventListener('click',async()=>{
 if(saving)return;
 $('#submit-confirm').close();
 if(showCompletionChecklist())return;
 saving=true;state.complete=true;state.completedAt=new Date().toISOString();
 if(await persist()){render();window.scrollTo(0,0)}else{state.complete=false;render()}
 saving=false;
});
$('#logout').onclick=async()=>{await supabase.auth.signOut();location.replace('login.html')};
(async()=>{try{const {data:{user:u},error}=await supabase.auth.getUser();if(error||!u){location.replace('login.html');return}user=u;$('#account-email').textContent=u.email||'';const saved=u.user_metadata?.steadyhands_onboarding;if(saved&&typeof saved==='object'){state={...state,...saved};step=state.complete?5:Math.max(0,Math.min(5,Number(saved.step)||0));if(!state.complete && state.email===u.email)state.email=''}else{state.name=u.user_metadata?.full_name||u.user_metadata?.name||'';state.email=''}$('#private-app').hidden=false;$('#loading').hidden=true;$('#content').hidden=false;render()}catch(e){$('#loading').textContent='Unable to load your account. Please refresh and try again.';console.error(e)}})();
