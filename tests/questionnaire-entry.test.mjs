import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../actions/hEi269a/action.js',import.meta.url),'utf8');
async function run({status='assigned',user={id:'owner'},assignment=true}={}){
 const calls=[],assets=[],message={textContent:''},button={hidden:true,disabled:false,events:{},addEventListener(k,v){this.events[k]=v}},body={innerHTML:'OLD SCREEN'};
 const supabase={};let redirected=null;
 const window={OutreachActions:{load:async()=>({assignment:assignment?{id:'one',status}:null})},OutreachQuestionnaire:{open:async options=>{calls.push(options);}}};
 const document={title:'',body,querySelectorAll:()=>[],getElementById:id=>id==='questionnaire-message'?message:id==='open-questionnaire'?button:null,createElement:tag=>({tag}),head:{appendChild(el){assets.push(el);el.onload?.();}}};
 const context={window,document,supabase,ensureHealthySession:async()=>({data:{session:user?{user}:null}}),location:{replace(url){redirected=url}}};vm.createContext(context);
 await vm.runInContext('(async()=>{'+source.replace(/^import .*;\n/m,'')+'})()',context);
 return {calls,assets,message,button,body,window,supabase,document,redirected};
}
test('the legacy URL clears its previous screen and automatically opens the assigned popup',async()=>{
 const r=await run();assert.equal(r.calls.length,1);assert.equal(r.window.steadyHandsCRMClient,r.supabase);assert.equal(r.button.hidden,false);assert.match(r.message.textContent,/one question at a time/);assert.doesNotMatch(r.body.innerHTML,/OLD SCREEN|PDF|canvas|signature|agreement/i);assert.equal(r.document.title,'Questionnaire · Steady Hands');
 assert.deepEqual(r.assets.filter(x=>x.tag==='script').map(x=>x.src.split('?')[0]),['/actions/questionnaire/api.js','/actions/questionnaire/start-dates.js','/actions/questionnaire/timezone-picker.js','/actions/questionnaire/questionnaire.js']);
 r.calls[0].onComplete();assert(r.button.hidden);assert.match(r.message.textContent,/submitted/);
});
test('completed or unassigned records never open or create a document',async()=>{
 const complete=await run({status:'completed'});assert.equal(complete.calls.length,0);assert.match(complete.message.textContent,/submitted/);
 const absent=await run({assignment:false});assert.equal(absent.calls.length,0);assert.match(absent.message.textContent,/No questionnaire is assigned/);
});
test('signed-out visitors must sign in before opening the questionnaire',async()=>{
 const r=await run({user:null});assert.equal(r.redirected,'/login.html');assert.equal(r.calls.length,0);
});
test('the exact old entry contains no PDF, signature, storage upload, or signing RPC code',async()=>{
 const html=await readFile(new URL('../actions/hEi269a/index.html',import.meta.url),'utf8');
 for(const text of [source,html])assert.doesNotMatch(text,/jspdf|html2canvas|application\/pdf|\.pdf|\.storage|\.upload\(|sh_prepare_signed_agreement|sh_finalize_signed_agreement|signature-name|<canvas|Download signed/i);
 assert.match(html,/action.js\?v=20261018-common-areas/);
});
