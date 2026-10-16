// Real portal shell, guided actions, exclusively in-memory simulated data.
const steps=[
 ['overview','#nav [data-page="website"]','Open My Website','Your example website is ready for review. Click My Website to begin.'],
 ['website','[data-demo="preview"]','Review the website preview','Open the sample design and check its appearance and content.'],
 ['preview','[data-demo="approve"]','Approve the design','Once you are happy with the preview, click Approve This Preview.'],
 ['website','[data-demo="purchase"]','Begin the purchase','Your design is approved. Continue to the agreement and payment process.'],
 ['purchase','#demo-sign-name','Sign the agreement','Type your sample full name to practice signing. No real agreement is created.'],
 ['purchase','#demo-agreement','Agree to the terms','Check the box to acknowledge the example website agreement.'],
 ['purchase','[data-demo="development"]','Continue to payment','Click Sign Agreement & Continue to advance to the design payment.'],
 ['development','[data-demo="hosting"]','Pay for website design','The one-time website design charge is $100. Click the simulated payment button.'],
 ['hosting','[data-demo="plan-30"]','Compare Business Hosting','Business Hosting is $30/month. Select it to compare the options.'],
 ['hosting','[data-demo="plan-20"]','Choose Standard Hosting','Standard Hosting costs $20/month. Select this plan for the example.'],
 ['hosting','[data-demo="finish-purchase"]','Start your monthly subscription','Complete the simulated subscription; no payment information is collected.'],
 ['purchased','[data-demo="requests"]','Purchase completed — view Requests','Your simulated purchase is finished. Select Continue to Requests to see where you can manage website changes.']
];
let index=0,paused=false;
let root,shade,cutout,popup,progress;
function target(){return document.querySelector(steps[index]?.[1])}
function visibleTarget(){const t=target();if(!t)return null;const r=t.getBoundingClientRect();return r.width&&r.height?t:null}
function draw(){
 if(paused)return;
 const s=steps[index];if(!s){finish();return}
 if(window.steadyHandsDemo.state.page!==s[0])return;
 let t=visibleTarget();
 if(!t){popup.querySelector('[data-instruction]').textContent='This element is unavailable. Use Previous to retry.';return}
 if(innerWidth<=760&&t.closest('#sidebar')){
   document.querySelector('#sidebar').classList.add('open');
   document.querySelector('#sidebar-backdrop').classList.add('open');
 }
 // Update content BEFORE measuring. Avoid placing a dialog using its prior step's height.
 popup.querySelector('[data-title]').textContent=s[2];
 popup.querySelector('[data-instruction]').textContent=s[3];
 popup.querySelector('[data-progress]').textContent=`Step ${index+1} of ${steps.length}`;
 popup.querySelector('[data-fill]').style.width=((index+1)/steps.length*100)+'%';
 popup.querySelector('[data-back]').disabled=index===0;
 popup.querySelector('[data-next]').hidden=!['#demo-sign-name'].includes(s[1]);
 popup.querySelector('[data-chapter]').textContent=index<4?'DESIGN REVIEW':index<7?'AGREEMENT':index<11?'PAYMENT & HOSTING':'COMPLETION';
 popup.style.transform='none';
 t.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
 requestAnimationFrame(()=>{
   if(paused||s!==steps[index])return;
   t=visibleTarget();if(!t)return;
   const r=t.getBoundingClientRect(),pad=5,margin=12;
   cutout.style.left=(r.left-pad)+'px';cutout.style.top=(r.top-pad)+'px';
   cutout.style.width=(r.width+pad*2)+'px';cutout.style.height=(r.height+pad*2)+'px';
   const pw=Math.min(innerWidth<=760?280:300,innerWidth-20);
   popup.style.width=pw+'px';
   const ph=Math.min(popup.scrollHeight,innerHeight-20);
   const vw=innerWidth,vh=innerHeight;
   const candidates=[
     {left:r.right+margin,top:r.top},
     {left:r.left-pw-margin,top:r.top},
     {left:r.left,top:r.bottom+margin},
     {left:r.left,top:r.top-ph-margin},
     {left:vw-pw-12,top:12},
     {left:vw-pw-12,top:vh-ph-12},
     {left:12,top:12},
     {left:12,top:vh-ph-12}
   ];
   const clamp=(v,min,max)=>Math.max(min,Math.min(v,Math.max(min,max)));
   const overlap=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
   const blocked={left:r.left-10,top:r.top-10,right:r.right+10,bottom:r.bottom+10};
   let best=null;
   for(const c of candidates){
     const left=clamp(c.left,10,vw-pw-10),top=clamp(c.top,10,vh-ph-10);
     const rect={left,top,right:left+pw,bottom:top+ph};
     const score=overlap(rect,blocked)*10000 + Math.abs(left-c.left)+Math.abs(top-c.top);
     if(!best||score<best.score)best={left,top,score};
   }
   popup.style.left=best.left+'px';popup.style.top=best.top+'px';
 });
}

function advance(){index++;if(index>=steps.length){finish();return}setTimeout(draw,10)}
function blocks(el,e){if(paused)return false;const allowed=target();if(!allowed||!(el===allowed||allowed.contains(el))){e.preventDefault();e.stopImmediatePropagation();return true}if(['#demo-sign-name'].includes(steps[index][1])) return false;if(steps[index][1]==='[data-demo="development"]' && (!document.querySelector('#demo-agreement')?.checked || !document.querySelector('#demo-sign-name')?.value.trim())) return false;if(steps[index][1]==='[data-demo="request-contact"]'){const a=document.querySelector('#demo-title')?.value.trim(),b=document.querySelector('#demo-details')?.value.trim();if(!a||!b)return false}const current=index, oldPage=window.steadyHandsDemo.state.page;setTimeout(()=>{if(paused||index!==current)return;const newPage=window.steadyHandsDemo.state.page;if(newPage!==oldPage || ['#nav [data-page="overview"]','[data-demo="plan-30"]','[data-demo="plan-20"]','[data-demo="approve"]'].includes(steps[current]?.[1]))advance()},80);return false}
function back(){index=Math.max(0,index-1);const s=steps[index];window.steadyHandsDemo.navigate(s[0]);draw()}
function finish(){window.steadyHandsDemo.navigate('requests');index=steps.length;cutout.hidden=true;popup.style.left='50%';popup.style.top='50%';popup.style.transform='translate(-50%,-50%)';popup.innerHTML='<div class="tg-kicker">TRAINING COMPLETED</div><h2>Well done!</h2><p>You reviewed and approved a sample website, signed an example agreement, and completed simulated design and hosting payments. You are now in the Requests section. No real changes or charges were made.</p><div class="tg-actions"><button data-restart>Restart Training</button><button data-close>Exit</button></div>';popup.querySelector('[data-restart]').onclick=()=>location.reload();popup.querySelector('[data-close]').onclick=()=>{};}
window.startSteadyHandsTraining = function startTraining(){root=document.createElement('div');root.id='training-root';root.innerHTML='<div class="tg-shade"></div><div class="tg-cutout"></div><aside class="tg-popup" role="dialog" aria-label="Training guide" aria-live="polite"><div class="tg-kicker" data-chapter></div><div class="tg-count" data-progress></div><div class="tg-progress"><div data-fill></div></div><h2 data-title></h2><p data-instruction></p><div class="tg-actions"><button type="button" data-back>Previous</button><button type="button" data-next hidden>Next →</button><button type="button" data-exit>Exit Training</button></div><p class="tg-hint">Click the highlighted item to continue.</p></aside>';document.body.appendChild(root);shade=root.querySelector('.tg-shade');cutout=root.querySelector('.tg-cutout');popup=root.querySelector('.tg-popup');root.querySelector('[data-back]').onclick=back;root.querySelector('[data-next]').onclick=()=>{const field=target();if(!field?.value.trim()){field?.focus();return}advance()};root.querySelector('[data-exit]').onclick=()=>{};document.addEventListener('sh-demo-render',()=>{if(!paused)requestAnimationFrame(draw)});window.addEventListener('resize',()=>{if(!paused)draw()});document.addEventListener('keydown',e=>{if(!paused&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation()}},true);document.addEventListener('click',e=>{if(paused||!root.contains(e.target))return;if(e.target.closest('button'))return;e.preventDefault();e.stopPropagation()},true);document.addEventListener('click',e=>{if(!paused&&steps[index]?.[1]==='#demo-agreement'&&e.target.closest('#demo-agreement') )setTimeout(()=>{if(document.querySelector('#demo-agreement')?.checked)advance()},35)},true);window.steadyHandsTraining={get active(){return !paused},blocks};draw();}
