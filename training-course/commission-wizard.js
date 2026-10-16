"use strict";
const sections=[
{title:'Understanding qualified sales',html:`<p>A completed qualifying sale occurs when the client follows the approved purchase process and <strong>their payment successfully processes.</strong> A verbal agreement, sent preview or unprocessed invoice does not make the commission eligible.</p><p>This training uses <strong>$30 per qualifying sale</strong>. The active signed agreement determines the applicable compensation terms.</p><h3>Commission eligibility</h3><ul><li>The customer completes the approved purchasing steps.</li><li>The client's payment successfully processes.</li><li>The eligible commission can be collected or added to the associate's paycheck through the approved process.</li><li>After it is disbursed, the commission can be marked Earned / Complete.</li></ul>`},
{title:'Earnings dashboard & payment statuses',html:`<p><strong>Waiting on Client Payment:</strong> The customer's payment has not successfully processed.</p><p><strong>Pending:</strong> The client has paid and the commission is eligible, but has not yet been paid to the associate.</p><p><strong>Earned / Complete:</strong> The commission has been paid out or included in a completed paycheck.</p><p>Commission eligibility is different from payout. No universal payout schedule is established in this guide. Confirm collection and payroll timing against the signed agreement and current approved procedure.</p>`},
{title:'Refunds, cancellations & chargebacks',html:`<p>Refunds, cancellations and chargebacks must be handled according to the signed commission agreement and management's current procedures.</p><p>Do not assume that a commission must be deducted, repaid or automatically retained. If a payment is disputed, report it promptly, keep accurate records and consult management.</p>`},
{title:'Professional expectations',html:`<p>At Steady Hands, we believe professionalism, honesty, and genuine customer care are essential to building trust and lasting business relationships. Every sales associate is expected to uphold these standards.</p><h3>01. Communication &amp; Customer Care</h3><ul><li>Communicate clearly, respectfully, and professionally.</li><li>Maintain a friendly, approachable, and patient attitude toward every customer.</li><li>Be honest when you don't know an answer, and seek clarification rather than providing incorrect information.</li><li>Ensure customers understand the products and services they're purchasing.</li></ul><h3>02. Sales Preparation &amp; Approach</h3><ul><li>Review available business information before contacting a prospect.</li><li>Recommend additional products or services when they're relevant to the customer's needs.</li><li>Handle questions, concerns, and objections with confidence, patience, and respect.</li></ul><h3>03. Recordkeeping &amp; Accountability</h3><ul><li>Keep prospect information, notes, and customer records accurate and up to date.</li><li>Record call attempts and outcomes promptly in the Outreach platform.</li></ul><h3>04. Growth &amp; Improvement</h3><ul><li>Actively seek feedback and use it to improve communication, customer service, and sales skills.</li></ul><p>By following these expectations, sales associates help create a positive experience for customers while contributing to the continued growth and reputation of Steady Hands.</p>`}
];
const quiz=[
  {
    "q": "When does a sale officially qualify for commission?",
    "options": [
      "When a customer agrees to purchase.",
      "When the client's payment successfully processes.",
      "When a website preview is sent."
    ],
    "correct": 1,
    "why": "A sale becomes commission-eligible only after the client's payment successfully processes."
  },
  {
    "q": "What should you do when a customer asks a question you cannot answer?",
    "options": [
      "Give your best guess.",
      "Ignore the question and continue selling.",
      "Be honest that you don't have the answer yet, and let them know you'll find out for them."
    ],
    "correct": 2,
    "why": "Be upfront, reassure the customer that you will find the correct information, and follow through."
  },
  {
    "q": "A customer asks for a feature you're unsure Steady Hands offers. What should you do?",
    "options": [
      "Promise it can be included without checking.",
      "Let them know you'll check with a member of the development team to explore what's possible and get back to them.",
      "Tell them the company definitely can't offer it."
    ],
    "correct": 1,
    "why": "We want to explore solutions whenever possible, but should confirm feasibility with development before making promises."
  },
  {
    "q": "A customer seems confused about the difference between two services. What's the best approach?",
    "options": [
      "Take time to explain both services clearly and help them choose what fits their needs.",
      "Recommend whichever service costs more.",
      "Tell them to decide on their own and move on."
    ],
    "correct": 0,
    "why": "Patient and clear explanations help the customer make an informed decision."
  },
  {
    "q": "A customer asks when their project will be completed. What should you do if the timeframe hasn't been confirmed?",
    "options": [
      "Give an estimated completion date without checking.",
      "Promise the development team will finish it right away.",
      "Explain that you'll confirm the timeframe with the appropriate team before providing a date."
    ],
    "correct": 2,
    "why": "Always verify an unconfirmed deadline before communicating it to a customer."
  }
];
const faqs=[['Does an unpaid client mean I earned a commission?','No. The client payment must successfully process.'],['Can I collect the commission or have it added to my paycheck?','Yes, once eligible, subject to the applicable agreement and approved payout process.'],['When will I be paid?','No fixed date is specified here. Refer to the signed agreement and approved payout procedure.'],['What about refunds and chargebacks?','Follow the signed agreement and management procedures; do not assume a repayment rule.'],['How do I report a missing commission?','Document the business, payment details and sales notes, then contact management.'],['What if I am unsure of a product or price?','Check the approved reference or ask management before making a promise.']];
const key='steadyhands_training_05_wizard_v1';let state={step:0,completed:[],quizIndex:0,answers:{}};
try{const saved=JSON.parse(localStorage.getItem(key)||'{}');if(saved&&typeof saved==='object')state={...state,...saved,completed:Array.isArray(saved.completed)?saved.completed:[],answers:saved.answers||{}}}catch(e){}
state.quizIndex=Math.max(0,Math.min(quiz.length-1,Number(state.quizIndex)||0));state.answers=Object.fromEntries(Object.entries(state.answers).filter(([k])=>Number(k)<quiz.length));
let wrong=null;const area=document.getElementById('wizardContent');function save(){try{localStorage.setItem(key,JSON.stringify(state))}catch(e){}}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function printContent(){return `<div class="print-guide"><h1>Commissions &amp; Expectations</h1>${sections.map((s,i)=>`<section><h2>${String(i+1).padStart(2,'0')}. ${s.title}</h2>${s.html}</section>`).join('')}<section><h2>Knowledge Check</h2>${quiz.map((q,i)=>`<p>${i+1}. ${q.q}<br>Answer: ${q.options[q.correct]}</p>`).join('')}</section></div>`}
function draw(){const onQuiz=state.step===4,finished=state.step===5;// Show independent progress for the four lessons and the five quiz questions.
const progressCount=finished?quiz.length:onQuiz?Math.min(state.quizIndex+1,quiz.length):Math.min(state.step+1,sections.length);
const progressTotal=finished||onQuiz?quiz.length:sections.length;
const progressPercent=100*progressCount/progressTotal;
const counter=document.getElementById('wizardCounter');
const fill=document.getElementById('wizardProgressFill');
counter.textContent=`${progressCount}/${progressTotal}`;
counter.setAttribute('aria-label',`${finished||onQuiz?'Knowledge check':'Lesson'} progress: ${progressCount} of ${progressTotal}`);
fill.style.width=`${progressPercent}%`;
fill.setAttribute('role','progressbar');
fill.setAttribute('aria-valuemin','0');
fill.setAttribute('aria-valuemax',String(progressTotal));
fill.setAttribute('aria-valuenow',String(progressCount));
fill.setAttribute('aria-label',finished||onQuiz?'Knowledge check progress':'Lesson progress');if(finished){area.innerHTML=`<article class="wizard-card wizard-success"><div class="checkmark" aria-label="Complete">✓</div><h2>Training Complete!</h2><p>You've finished all four sections and the knowledge check.</p><p class="wizard-done">✓ Commissions &amp; Expectations completed</p><div class="wizard-actions"><button class="wizard-btn secondary" type="button" id="reviewTraining">Review Training</button><a class="wizard-btn secondary" href="index.html">Exit Training</a><a class="wizard-btn secondary" href="pdfs/commissions-expectations.pdf" target="_blank" rel="noopener" aria-label="Open PDF for download">Download PDF</a><button class="wizard-btn" type="button" id="printGuide">Print</button></div></article>${printContent()}`;document.getElementById('reviewTraining').onclick=()=>{state.step=0;state.quizIndex=0;wrong=null;save();draw();window.scrollTo({top:0,behavior:'smooth'})};document.getElementById('printGuide').onclick=()=>window.print();return}
if(!onQuiz){const s=sections[state.step],i=state.step;area.innerHTML=`<article class="wizard-card wizard-interactive-stage"><span class="wizard-kicker">LESSON 05 • SECTION ${String(i+1).padStart(2,'0')}</span><h2>${String(i+1).padStart(2,'0')}. ${s.title}</h2><div class="wizard-audio"><strong>Listen to this section (optional)</strong><audio controls preload="none" aria-label="Audio for section ${i+1}"><source src="audios/05-audio${String(i+1).padStart(2,'0')}.mp3" type="audio/mpeg"></audio></div>${s.html}<div class="wizard-actions"><button class="wizard-btn secondary" id="previous" ${i===0?'disabled':''}>Back</button><span class="${state.completed.includes(i)?'wizard-done':'wizard-muted'}">${state.completed.includes(i)?'✓ Completed':''}</span><button class="wizard-btn" id="markComplete">${i===3?'Continue to Quiz':'Next'}</button></div></article>${printContent()}`;document.getElementById('previous').onclick=()=>{state.step--;save();draw()};document.getElementById('markComplete').onclick=()=>{if(!state.completed.includes(i))state.completed.push(i);state.step=i===3?4:i+1;save();draw();window.scrollTo({top:0,behavior:'smooth'})};return}
const i=state.quizIndex,q=quiz[i],selected=state.answers[i];area.innerHTML=`<article class="wizard-card wizard-interactive-stage"><span class="wizard-kicker">KNOWLEDGE CHECK • QUESTION ${i+1} OF ${quiz.length}</span><h2>${q.q}</h2><div class="wizard-question-interactive">${q.options.map((x,j)=>`<button class="wizard-choice ${selected===j?'correct':wrong===j?'wrong':''}" data-choice="${j}">${String.fromCharCode(65+j)}. ${esc(x)}</button>`).join('')}<div id="quizFeedback" aria-live="polite">${selected!==undefined?`<p class="wizard-feedback">✓ Correct. ${esc(q.why)}</p>`:wrong!==null?`<p class="wizard-feedback">✕ Incorrect. Try another answer.</p>`:''}</div></div><div class="wizard-actions"><button class="wizard-btn secondary" id="previous">Back</button><button class="wizard-btn" id="quizNext" ${selected===undefined?'disabled':''}>${i===quiz.length-1?'Complete Training':'Next Question'}</button></div></article>${printContent()}`;area.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{const j=Number(b.dataset.choice);if(j===q.correct){state.answers[i]=j;wrong=null;save();draw()}else{wrong=j;draw()}document.querySelector('.wizard-question-interactive')?.scrollIntoView({block:'center',behavior:'smooth'})});document.getElementById('previous').onclick=()=>{wrong=null;if(i===0){state.step=3}else{state.quizIndex--}save();draw()};document.getElementById('quizNext').onclick=()=>{wrong=null;if(i===quiz.length-1){state.step=5;try{localStorage.setItem('steadyhands_training_v3',JSON.stringify({...JSON.parse(localStorage.getItem('steadyhands_training_v3')||'{}'),3:true}))}catch(e){}}else state.quizIndex++;save();draw();window.scrollTo({top:0,behavior:'smooth'})};}
draw();