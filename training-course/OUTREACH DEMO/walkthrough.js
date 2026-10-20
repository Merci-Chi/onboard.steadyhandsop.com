/* Steady Hands interactive walkthrough. NO live calls, texts, calendars or CRM writes. */
(()=>{'use strict';
const KEY='sh-demo-walkthrough-20261013',DONE='sh-demo-walkthrough-complete';
const qs=s=>document.querySelector(s), doc=document;const page=location.pathname.split('/').pop()||'index.html';
const params=new URLSearchParams(location.search);let saved;try{saved=JSON.parse(sessionStorage.getItem(KEY)||'null')}catch{}
if(page==='index.html' && (params.get('training')==='first-call'||(!saved&&params.get('explore')!=='1'))){saved={step:0,name:'Sales Associate',started:true};sessionStorage.setItem(KEY,JSON.stringify(saved))}
if(!saved?.started)return;
// No production services are used by the guided practice.
window.SH_GUIDED_DEMO_ACTIVE=true;
// Dismiss any notification permission modal that loaded before the walkthrough.
function dismissPracticeNotificationPrompt(){document.querySelectorAll('.device-notification-popup-overlay').forEach(el=>el.remove())}
dismissPracticeNotificationPrompt();
const notificationObserver=new MutationObserver(dismissPracticeNotificationPrompt);
notificationObserver.observe(document.documentElement,{childList:true,subtree:true});
let step=Number(saved.step)||0;let name='Sales Associate',playing=-1,disposed=false,scrollTimer,readReady=true;
const stagedTimers=[];const schedule=(fn,ms)=>{const id=setTimeout(fn,ms);stagedTimers.push(id);return id};
const prospect='Maria Rodriguez',company="Maria's Home Cleaning";
const STEPS=[
 {page:'index.html',target:'#refCompany',title:'Review the selected prospect',body:'Meet Maria Rodriguez, owner of Maria’s Home Cleaning. Review the company and contact details before calling.',action:'Select the highlighted prospect card to confirm.'},
 {page:'index.html',target:'#refLocalTime',title:'Verify the prospect’s local time',body:'Check the prospect’s local day and time. Recommended calling hours: Monday–Friday, 9 AM–5 PM in the prospect’s timezone.',action:'Select the local time to confirm you checked it.'},
 {page:'index.html',target:'[data-ref-tool="notes"]',title:'Open the existing notes',body:'Always review previous context. Maria wants a professional website for her cleaning business.',action:'Click Notes.'},
 {page:'index.html',target:'#sh-guide-close',title:'Close the notes',body:'You now understand why this prospect may be interested.',action:'Close Notes to continue.'},
 {page:'index.html',target:'#shOpenScripts',title:'Review your opening script',body:'Use the opening script to introduce Steady Hands clearly. Adapt your tone naturally and do not read mechanically.',action:'Click Scripts.'},
 {page:'index.html',target:'#sh-guide-close',title:'Close Scripts',body:'You are ready to introduce yourself and ask for a moment of the prospect’s time.',action:'Close Scripts to continue.'},
 {page:'index.html',target:'#refAppPhone',title:'Open Call Through Outreach',body:'In this practice scenario, you will enter the original call page. No actual calls will be made.',action:'Click Call Through Outreach.'},
 {page:'call.html',target:'#refEndCall',title:'Start the practice call',body:'Press the circular Call control to begin a fictional call. The transcript will play below.',action:'Click Call.'},
 {page:'call.html',target:'#refTranscriptList',title:'Listen to the opening conversation',body:'The conversation starts with your introduction, then Maria asks about pricing. Watch the live transcript.',action:'Click the transcript after the question appears.',play:'opening'},
 {page:'call.html',target:'[data-ref-tool="quick"]',title:'Look up the correct pricing',body:'Maria asked about price. Don’t guess—open Quick Info and verify the current details.',action:'Click Quick Info.'},
 {page:'call.html',target:'#sh-guide-close',title:'Review the pricing',body:'Website development: $100 one time. Standard hosting: $20/month. Business Hosting: $30/month.',action:'Close Quick Info to resume the conversation.'},
 {page:'call.html',target:'#refTranscriptList',title:'Offer the website preview',body:'After answering, ask whether Maria would like to see a website preview. She agrees.',action:'Click the transcript after Maria accepts.',play:'preview'},
 {page:'call.html',target:'[data-ref-tool="preview"]',title:'Send Site Preview',body:'Maria asked to see the preview. Use the actual Send Site Preview control. This is simulated: nothing will be sent.',action:'Click Send Site Preview.'},
 {page:'call.html',target:'#refTranscriptList',title:'Agree on a follow-up',body:'Maria likes the preview. Ask for a specific day and time to discuss next steps.',action:'Click the transcript to continue.',play:'followup'},
 {page:'call.html',target:'[data-ref-tool="calendar"]',title:'Open Add to Calendar',body:'You agreed to tomorrow at 11 AM in Maria’s local time. Record the appointment.',action:'Click Add to Calendar.'},
 {page:'call.html',target:'#sh-guide-save',title:'Save the practice appointment',body:'Confirm the follow-up time with the prospect before saving.',action:'Click Save Practice Follow-up.'},
 {page:'call.html',target:'#refEndCall',title:'End the practice call',body:'Thank Maria and end the call professionally. The transcript is complete.',action:'Click Hang Up.',play:'ending'},
 {page:'call.html',target:'#sh-guide-save',title:'Record the call outcome',body:'Record Interested, follow-up scheduled, and a brief note. This is an offline practice record.',action:'Click Save Call Outcome.'},
 {page:'call.html',target:'#refStartSale',title:'Start the sales process',body:'Maria is interested but has NOT paid. Start Sale opens the existing demo sales pipeline.',action:'Click Start Sale / Track Customer.'},
 {page:'sales.html',target:'[data-stage="ready_to_buy"]',title:'Select the correct pipeline stage',body:'Choose Ready to Buy or the closest unpaid, interested stage. Do NOT mark this as a completed paid sale.',action:'Click the actual Ready to Buy stage.'}
];
const put=(k,v)=>{sessionStorage.setItem(k,JSON.stringify(v))};
const READ_ONLY=new Set([0,1,8,11,13]);
function getTarget(){return qs(STEPS[step]?.target||'#missing')}
function getSpotlightTarget(){
 const t=getTarget();if(!t)return null;
 if(step===0)return t.closest('.ref-lead-card')||t;
 if(step===1)return t.closest('.ref-time-block')||t;
 if([8,11,13].includes(step))return t.closest('.ref-transcript-card')||t;
 if([3,5,10,15,17].includes(step))return qs('#sh-training-dialog')||t;
 return t;
}
function clean(){qs('#sh-training-coach')?.remove();qs('#sh-training-shade')?.remove();qs('#sh-training-pointer')?.remove();qs('#sh-training-dialog')?.remove();qs('#sh-training-toast')?.remove();doc.querySelectorAll('.sh-training-target').forEach(x=>x.classList.remove('sh-training-target'));doc.documentElement.classList.remove('sh-guided')}
function addNode(tag,id,html){let n=doc.createElement(tag);n.id=id;if(html!==undefined)n.innerHTML=html;doc.body.append(n);return n}
function escape(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function dialog(title,html,button='Close'){qs('#sh-training-dialog')?.remove();let d=addNode('section','sh-training-dialog',`<button id="sh-guide-close" class="sh-dialog-close" type="button" aria-label="Close panel">✕</button><h3>${title}</h3>${html}`);if(button&&button!=='Close'){let b=doc.createElement('button');b.id='sh-guide-save';b.type='button';b.textContent=button;d.append(b)}requestAnimationFrame(renderPosition);return d}
function closeDialog(){qs('#sh-training-dialog')?.remove();requestAnimationFrame(renderPosition)}
function toast(message){qs('#sh-training-toast')?.remove();let el=addNode('div','sh-training-toast');el.textContent=message;setTimeout(()=>el.remove(),1650)}
function lines(items){const box=qs('#refTranscriptList');if(!box)return;box.style.minHeight='190px';items.forEach(([who,content],i)=>{const line=doc.createElement('div');line.className='demo-transcript-line';line.style.cssText='background:var(--surface,#eef3f8);color:inherit;padding:10px 12px;border-radius:12px;margin:8px 4px';let b=doc.createElement('strong');b.textContent=who==='You'?name:prospect;let p=doc.createElement('p');p.textContent=content;p.style.margin='5px 0 0';line.append(b,p);box.append(line)});box.scrollTop=box.scrollHeight;qs('#refTranscriptStatus')&&(qs('#refTranscriptStatus').textContent='Practice transcript · paused')}
function play(key){if(playing===step)return;playing=step;const messageSets={opening:[['You',`Hello Maria, this is ${name} with Steady Hands. Is now a good time to speak?`],['Maria','Hi! Yes, I have a couple minutes.'],['You','We prepared a website preview for your cleaning business. I wanted to see if you might be interested.'],['Maria','That sounds interesting. How much would a website cost?']],preview:[['You','Website development is $100 one-time. Hosting is $20/month for Standard or $30/month for Backend. Would you like me to send you the preview?'],['Maria','Sure, please send it!']],followup:[['You','The preview has been sent. What do you think?'],['Maria','I like it! I think I want to go ahead.'],['You','Great! I can guide you through the process. When would be a good time to follow up?'],['Maria','Tomorrow at 11 AM would work well.']],ending:[['You','Perfect, Maria. I will follow up tomorrow at 11 AM. Thank you for your time!'],['Maria','Thank you! Talk to you then.']]};let items=messageSets[key]||[];const t=qs('#refTranscriptList');if(!t)return;const targets=[];for(let i=0;i<items.length;i++)targets.push(schedule(()=>{if(step===playing)lines([items[i]]);if(i===items.length-1){readReady=true;const next=qs('#sh-guide-next');if(next){next.disabled=false;next.textContent='Next Step →'};renderPosition()}},i*850+450));}
function fakePanelFor(stepIndex){if(stepIndex===3)dialog('Prospect notes','<p><b>Maria Rodriguez</b> is interested in attracting customers through a professional website.</p><p>Business: Maria’s Home Cleaning · Location: Las Vegas, NV.</p>');if(stepIndex===5)dialog('Starter Script',`<p>“Hello Maria! This is ${escape(name)} with Steady Hands. Is now a good time to talk?”</p><p>Focus on a friendly introduction and ask permission to continue.</p>`);if(stepIndex===10)dialog('Quick Info · Pricing','<p><b>$100</b> one-time website development</p><p><b>$20/month</b> Standard hosting</p><p><b>$30/month</b> Business Hosting</p>');if(stepIndex===15)dialog('Schedule follow-up','<p><b>Prospect’s local follow-up time:</b> Tomorrow, 11:00 AM (Pacific Time)</p><p>Practice only: no real calendar will be modified.</p>','Save Practice Follow-up');if(stepIndex===17)dialog('After-call outcome','<p><b>Outcome:</b> Interested</p><p><b>Follow-up:</b> Tomorrow 11 AM (Pacific)</p><p><b>Notes:</b> Preview sent; prospect is ready to discuss next steps.</p>','Save Call Outcome')}
function ensureSaleTarget(){
 if(page!=='sales.html'||step!==19)return;
 const section=qs('[data-stage="ready_to_buy"]');
 if(section) section.setAttribute('aria-label','Practice: Ready to Buy stage');
}
function finish(){notificationObserver.disconnect();clean();sessionStorage.removeItem(KEY);sessionStorage.setItem(DONE,'1');let shade=addNode('div','sh-training-shade');let coach=addNode('section','sh-training-coach',`<span class="sh-kicker">TRAINING COMPLETE</span><h2>Great work, ${escape(name)}!</h2><p>You completed a full sample sales call, reviewed pricing, sent a practice preview, scheduled a follow-up, and updated the pipeline without recording a paid sale.</p><button class="sh-done" id="sh-training-review">Review Demo</button>`);coach.style.cssText='top:50%;left:50%;transform:translate(-50%,-50%)';qs('#sh-training-review').onclick=()=>{put(KEY,{started:true,step:0,name});location.href='index.html?training=first-call'}}
function navigate(next){put(KEY,{started:true,step:next,name});const dest=STEPS[next].page;location.href=dest+'?training=first-call'}
function advance(){const i=step;readReady=true;if(i===2||i===4||i===9||i===14||i===16)fakePanelFor(i+1);if(i===12)toast('✓ Preview sent · Practice only');if(i===15)toast('✓ Follow-up scheduled · Practice only');if(i===17)toast('✓ Outcome recorded · Practice only');if(i===7){let call=qs('#refEndCall');if(call){call.dataset.callState='active';call.classList.add('is-active');call.classList.remove('is-idle');call.setAttribute('aria-label','Hang Up')}qs('#refPhoneActionLabel')&&(qs('#refPhoneActionLabel').textContent='Hang Up');qs('#refStatus')&&(qs('#refStatus').textContent='Practice call in progress');qs('#refTranscriptList')?.replaceChildren()};if(i===16){let call=qs('#refEndCall');if(call){call.dataset.callState='idle';call.classList.remove('is-active');call.classList.add('is-idle')}qs('#refPhoneActionLabel')&&(qs('#refPhoneActionLabel').textContent='Call');qs('#refStatus')&&(qs('#refStatus').textContent='Call ended')}
 closeDialog();step++;if(step>=STEPS.length){finish();return}put(KEY,{started:true,step,name});if(STEPS[step].page!==page){navigate(step);return}if(step===3||step===5||step===10||step===15||step===17)fakePanelFor(step);setTimeout(render,110)}
function renderPosition(){
 const t=getTarget(),spot=getSpotlightTarget(),coach=qs('#sh-training-coach'),pin=qs('#sh-training-pointer');
 if(!t||!spot||!coach)return;
 const r=t.getBoundingClientRect(),sr=spot.getBoundingClientRect(),shade=qs('#sh-training-shade');
 const viewport=window.visualViewport;const vw=viewport?.width||window.innerWidth,vh=viewport?.height||window.innerHeight;const vx=viewport?.offsetLeft||0,vy=viewport?.offsetTop||0;const pad=9,gap=12,margin=10;
 if(shade){
  shade.style.left=Math.max(0,sr.left-pad)+'px';shade.style.top=Math.max(0,sr.top-pad)+'px';
  shade.style.width=Math.max(1,Math.min(vw-Math.max(0,sr.left-pad),sr.width+pad*2))+'px';
  shade.style.height=Math.max(1,Math.min(vh-Math.max(0,sr.top-pad),sr.height+pad*2))+'px';
 }
 // Keep the coach out of the usable spotlight AND any open practice dialog.
 // Evaluate corners/edges instead of anchoring the coach across a control.
 coach.style.maxHeight=Math.max(120,vh-2*margin)+'px';const w=Math.min(coach.offsetWidth,vw-2*margin),h=Math.min(coach.offsetHeight,vh-2*margin);
 const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
 const rect=(x,y,width,height)=>({left:x,top:y,right:x+width,bottom:y+height});
 const overlap=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
 const protectedAreas=[rect(sr.left-pad,sr.top-pad,sr.width+pad*2,sr.height+pad*2)];
 const dlg=qs('#sh-training-dialog');
 if(dlg){const dr=dlg.getBoundingClientRect();protectedAreas.push(rect(dr.left-8,dr.top-8,dr.width+16,dr.height+16));}
 const positions=[
  [r.left,r.bottom+gap],[r.right-w,r.bottom+gap],
  [r.left,r.top-h-gap],[r.right-w,r.top-h-gap],
  [r.right+gap,r.top],[r.left-w-gap,r.top],
  [margin,margin],[vw-w-margin,margin],
  [margin,vh-h-margin],[vw-w-margin,vh-h-margin],
  [(vw-w)/2,margin],[(vw-w)/2,vh-h-margin]
 ];
 // Position against the visible (keyboard-safe) viewport; never cover the usable spotlight.
 let best=null;
 for(const [px,py] of positions){
  const x=clamp(px,vx+margin,Math.max(vx+margin,vx+vw-w-margin));
  const y=clamp(py,vy+margin,Math.max(vy+margin,vy+vh-h-margin));
  const cr=rect(x,y,w,h);
  const blocked=protectedAreas.reduce((sum,area)=>sum+overlap(cr,area),0);
  const moved=Math.abs(x-px)+Math.abs(y-py);
  const distance=Math.hypot(x+w/2-(r.left+r.width/2),y+h/2-(r.top+r.height/2));
  const score=blocked*10000+moved*3+distance*.12;
  if(!best||score<best.score)best={x,y,score};
 }
 if(best){
  coach.style.left=best.x+'px';coach.style.top=best.y+'px';
  // When the spotlight is too large for a side-by-side card, compact the coach.
  coach.classList.toggle('sh-coach-tight',best.score>90000);
  coach.style.maxHeight=Math.max(120,vh-2*margin)+'px';
 }
 if(pin){pin.style.left=clamp(r.left-15,vx+5,vx+vw-30)+'px';pin.style.top=clamp(r.top-15,vy+5,vy+vh-30)+'px';}
}
function render(){if(disposed)return;dismissPracticeNotificationPrompt();clean();if(page==='index.html'){const c=qs('#refCompany');if(c)c.textContent=company;const ph=qs('#refPhone');if(ph)ph.textContent='(702) 555-0148 · Fictional';}if(page==='call.html'){const c=qs('#refCompany');if(c)c.textContent=company;const ph=qs('#refPhone');if(ph)ph.textContent='(702) 555-0148 · Fictional';}ensureSaleTarget();if([3,5,10,15,17].includes(step))fakePanelFor(step);const st=STEPS[step];if(!st)return finish();if(st.page!==page){navigate(step);return}let target=getTarget();if(!target){if(!qs('#sh-training-loading')){const wait=addNode('div','sh-training-loading');wait.style.display='none'}setTimeout(render,350);return}doc.documentElement.classList.add('sh-guided');addNode('div','sh-training-shade');getSpotlightTarget()?.classList.add('sh-training-target');let coach=addNode('section','sh-training-coach',`<header><span class="sh-kicker">GUIDED PRACTICE · ${step+1} / ${STEPS.length}</span><button id="sh-exit-training" type="button">Exit training</button></header><h2>${st.title}</h2><p>${st.body}</p><div class="sh-action">➜ ${st.action}</div><div class="sh-progress"><div style="width:${(step/STEPS.length)*100}%"></div></div><div class="sh-indicator">Other controls are locked until you finish this task.</div>`);addNode('div','sh-training-pointer',String(step+1));qs('#sh-exit-training').onclick=exit;
 if(READ_ONLY.has(step)){
   const btn=doc.createElement('button');btn.type='button';btn.id='sh-guide-next';btn.className='sh-guide-next';btn.textContent='Next Step →';
   readReady=!st.play;btn.disabled=!readReady;if(!readReady)btn.textContent='Transcript playing…';
   btn.addEventListener('click',()=>{if(!readReady)return;advance()});coach.append(btn);
 }
 if(step===2){const openNotes=doc.createElement('button');openNotes.type='button';openNotes.id='sh-guide-open-notes';openNotes.className='sh-guide-next';openNotes.textContent='Open Notes →';openNotes.addEventListener('click',advance);coach.append(openNotes)}
  if(st.play)play(st.play);requestAnimationFrame(()=>{const spot=getSpotlightTarget()||target;spot.scrollIntoView({behavior:'instant',block:'center',inline:'nearest'});requestAnimationFrame(renderPosition)})}
function exit(){disposed=true;notificationObserver.disconnect();clean();sessionStorage.removeItem(KEY);location.href='index.html?explore=1'}
// Hard interaction lock: listeners on document capture BEFORE ordinary page handlers.
doc.addEventListener('click',event=>{if(!sessionStorage.getItem(KEY)||disposed)return;const exitButton=event.target.closest('#sh-exit-training,#sh-guide-next,#sh-guide-open-notes');if(exitButton)return;const t=getTarget();if(!t)return;const clicked=event.target===t||t.contains(event.target);event.preventDefault();event.stopImmediatePropagation();if(!clicked){return}if(READ_ONLY.has(step))return;if(step===6){const selected=qs('#refCompany');if(selected)sessionStorage.setItem('sh-walkthrough-company',selected.textContent);navigate(7);return}if(step===18){navigate(19);return}advance()},true);
doc.addEventListener('submit',e=>{e.preventDefault();e.stopImmediatePropagation()},true);
doc.addEventListener('keydown',e=>{if(!sessionStorage.getItem(KEY)||disposed)return;if(['Tab','Escape','Enter',' '].includes(e.key)){if(e.key==='Tab'||e.key==='Escape'||!e.target.closest('#sh-training-coach,#sh-training-dialog,.sh-training-target')){e.preventDefault();e.stopImmediatePropagation()}}},true);
window.addEventListener('resize',renderPosition);window.visualViewport?.addEventListener('resize',renderPosition);window.visualViewport?.addEventListener('scroll',renderPosition);window.addEventListener('scroll',()=>{clearTimeout(scrollTimer);scrollTimer=setTimeout(renderPosition,30)},true);
if(window.ResizeObserver){const observer=new ResizeObserver(()=>{if(qs('#sh-training-coach'))requestAnimationFrame(renderPosition)});doc.addEventListener('DOMContentLoaded',()=>observer.observe(doc.body));}
window.addEventListener('DOMContentLoaded',()=>{setTimeout(render,250)});
})();
