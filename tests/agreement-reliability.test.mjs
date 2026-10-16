import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {overlayAgreement,pdfText} from '../agreements/pdf-overlays.js';
import {guardedFetch,recoverSession,TOKEN_HELP} from '../session-health.js';
import {saveAgreement,validateSigner} from '../agreements/agreement-save.js';
const base={code:'abc12345',user_id:'owner',document_key:'trial-hourly',status:'pending',associate_name:'Test Person',effective_date:'2026-10-19',work_location:'Nevada'};
const user={id:'owner'};
function setup(){
 const state={row:{...base},files:new Map(),uploadCount:0,updates:0,updateFailures:0,uploadLost:false,recordLost:false,deny:false};
 const db={from:()=>({select:()=>({eq(){return this},async maybeSingle(){return {data:{...state.row}}}}),update:patch=>({eq(){return this},select(){return this},async maybeSingle(){state.updates++;if(state.updateFailures-->0)return {error:{message:'HTTP 400'}};state.row={...state.row,...patch};if(state.recordLost)return {error:{message:'Connection lost'}};return {data:{signed_at:patch.signed_at}}}})}),storage:{from:()=>({upload:async(path,blob)=>{state.uploadCount++;if(state.deny)return {error:{message:'Storage policy rejected upload'}};if(state.files.has(path))return {error:{message:'Already exists'}};state.files.set(path,blob);return state.uploadLost?{error:{message:'Connection lost'}}:{}},download:async path=>state.files.has(path)?{data:state.files.get(path)}:{error:{message:'Not found'}}})}};
 const args={db,assignment:{...base},user,name:'Test Person',date:'2026-10-19',signature:'data:image/png;base64,example',makePDF:async()=>new Uint8Array([37,80,68,70]),attempt:{},randomId:()=> 'attempt-one'};
 return {state,args};
}
test('oversized data requests fail clearly without sending credentials',async()=>{
 let calls=0;const f=guardedFetch('https://project.example','public-key',async()=>{calls++;return new Response('{}')});
 const r=await f('https://project.example/rest/v1/table',{headers:{Authorization:'Bearer '+'x'.repeat(20000)}});
 assert.equal(r.status,431);assert.equal(calls,0);assert((await r.json()).message.includes('too large'));
});
test('refresh exchange replaces oversized bearer with public key and preserves body',async()=>{
 let request;const f=guardedFetch('https://project.example','public-key',async(u,i)=>{request=i;return new Response('{}')});
 await f('https://project.example/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{Authorization:'Bearer '+'x'.repeat(20000)},body:'refresh-body'});
 assert.equal(request.headers.get('authorization'),'Bearer public-key');assert.equal(request.body,'refresh-body');
});
test('small token requests and unrelated origins are unchanged',async()=>{
 let seen;const f=guardedFetch('https://project.example','public-key',async(u,i)=>{seen=i;return new Response('{}')});
 await f('https://project.example/rest/v1/table',{headers:{authorization:'Bearer small'}});assert.equal(seen.headers.get('authorization'),'Bearer small');
 const init={headers:{authorization:'Bearer '+'x'.repeat(10000)}};await f('https://other.example/file',init);assert.equal(seen,init);
});
test('existing large session recovers after server hook issues compact token',async()=>{
 let refreshed=0;const r=await recoverSession({getSession:async()=>({data:{session:{access_token:'x'.repeat(20000)}}}),refreshSession:async()=>{refreshed++;return {data:{session:{access_token:'small'}}}}});assert(!r.error);assert.equal(refreshed,1);
});
test('still-large token gives action message instead of endless refresh',async()=>{
 let count=0;const session={access_token:'x'.repeat(20000)};const r=await recoverSession({getSession:async()=>({data:{session}}),refreshSession:async()=>{count++;return {data:{session}}}});assert.equal(r.error.message,TOKEN_HELP);assert.equal(count,1);
});
test('only the assigned account can enter a legal name',()=>{
 assert.throws(()=>validateSigner(base,{id:'other'},'Test Person'),/different account/);
 validateSigner({...base,associate_name:null},user,'Test Person');
 validateSigner({...base,associate_name:'Someone Else'},user,'Test Person');
 for(const name of ['', '  ', 'Al', 'a'.repeat(121)])assert.throws(()=>validateSigner(base,user,name),/full legal name/);
});
test('associate-entered name is saved even when admin name is absent or different',async()=>{
 for(const oldName of [null,'Awaiting associate entry','Old Admin Name']){
  const {state,args}=setup();state.row.associate_name=oldName;args.assignment.associate_name=oldName;args.name='Associate Legal Name';
  const r=await saveAgreement(args);assert.equal(r.signature_name,'Associate Legal Name');assert.equal(state.row.signature_name,'Associate Legal Name');assert.equal(r.status,'signed');
 }
});
test('completed PDF uses the entered name for the associate field and certificate',async()=>{
 const source=await readFile(new URL('../agreements/agreement.js',import.meta.url),'utf8');
 const build=source.slice(source.indexOf('async function buildSignedPDF('),source.indexOf('let pdfLibraryPromise;'));
 const texts=[];
 const page={getHeight:()=>842,drawRectangle(){throw Error('Overlays must not paint a background')},drawText:text=>texts.push(text),drawLine(){}};
 const doc={getPages:()=>[page],embedFont:async()=>({widthOfTextAtSize:text=>text.length*4}),addPage:()=>page,save:async()=>new Uint8Array([37,80,68,70])};
 const PDFLib={PDFDocument:{load:async()=>doc},StandardFonts:{Helvetica:'regular',HelveticaBold:'bold'},rgb:()=>({})};
 const context={window:{PDFLib},PDFLib,overlayAgreement,pdfText,assignment:{...base,document_key:'manager-10',associate_name:'Wrong Admin Name'},managerKind:()=>true,KINDS:{'manager-10':['Manager Outline']},user:{email:'associate@example.com'},code:base.code};
 vm.createContext(context);
 vm.runInContext(build,context);
 await context.buildSignedPDF(new Uint8Array(),{name:'Entered Legal Name',date:'2026-10-19',stamp:'2026-10-19T12:00:00Z'});
 assert.equal(texts.filter(t=>t==='Entered Legal Name').length,2);
 assert(!texts.includes('Wrong Admin Name'));
 assert(!texts.some(t=>t.includes('entered on onboarding')));
});
test('normal submission saves PDF before completion and uses owner filter',async()=>{
 const {state,args}=setup();const r=await saveAgreement(args);assert.equal(r.status,'signed');assert.equal(state.uploadCount,1);assert.equal(state.files.size,1);assert.equal(r.signed_pdf_path,'owner/abc12345-attempt-one.pdf');
});
test('database failure retries same saved PDF without duplicate upload',async()=>{
 const {state,args}=setup();state.updateFailures=1;await assert.rejects(saveAgreement(args),/Recording agreement completion/);assert.equal(state.row.status,'pending');const r=await saveAgreement(args);assert.equal(r.status,'signed');assert.equal(state.uploadCount,1);
});
test('network lost after upload verifies exact bytes and can finish',async()=>{
 const {state,args}=setup();state.uploadLost=true;const r=await saveAgreement(args);assert.equal(r.status,'signed');assert.equal(state.files.size,1);
});
test('lost completion response discovers signed record without submitting again',async()=>{
 const {state,args}=setup();state.recordLost=true;const r=await saveAgreement(args);assert.equal(r.status,'signed');assert.equal(state.updates,1);
});
test('storage refusal never marks agreement completed',async()=>{
 const {state,args}=setup();state.deny=true;await assert.rejects(saveAgreement(args),/Saving agreement PDF/);assert.equal(state.updates,0);assert.equal(state.row.status,'pending');
});
test('revoked or changed assignment cannot submit stale terms',async()=>{
 const {state,args}=setup();state.row.status='revoked';await assert.rejects(saveAgreement(args),/not pending/);state.row.status='pending';state.row.effective_date='2026-11-01';await assert.rejects(saveAgreement(args),/changed/);assert.equal(state.uploadCount,0);
});
test('failed PDF generation can be retried',async()=>{
 const {state,args}=setup();args.makePDF=async()=>{throw Error('Network')};await assert.rejects(saveAgreement(args),/Generating agreement PDF/);args.makePDF=async()=>new Uint8Array([37,80,68,70]);const r=await saveAgreement(args);assert.equal(r.status,'signed');
});
test('already completed record is returned without overwriting PDF',async()=>{
 const {state,args}=setup();state.row={...state.row,status:'signed',signed_pdf_path:'owner/original.pdf'};const r=await saveAgreement(args);assert.equal(r.signed_pdf_path,'owner/original.pdf');assert.equal(state.uploadCount,0);
});
test('one associate can complete multiple assignments independently',async()=>{
 const rows=new Map([
  ['hourly-action',{...base,code:'hourly-action',document_key:'trial-hourly'}],
  ['commission-action',{...base,code:'commission-action',document_key:'trial-commission'}]
 ]);
 const files=new Map();
 const db={from:()=>{
  const query=patch=>({filters:{},eq(key,value){this.filters[key]=value;return this},select(){return this},async maybeSingle(){
   const row=rows.get(this.filters.code);
   if(!row||Object.entries(this.filters).some(([key,value])=>row[key]!==value))return {data:null};
   if(patch)Object.assign(row,patch);
   return {data:{...row}};
  }});
  return {select:()=>query(),update:patch=>query(patch)};
 },storage:{from:()=>({upload:async(path,blob)=>{assert(!files.has(path));files.set(path,blob);return {}}})}};
 const args=code=>({db,assignment:{...rows.get(code)},user,name:'Test Person',date:'2026-10-19',signature:'signature',attempt:{},randomId:()=> 'separate-attempt',makePDF:async()=>new Uint8Array([37,80,68,70])});
 const first=await saveAgreement(args('hourly-action'));
 assert.equal(first.status,'signed');
 assert.equal(rows.get('commission-action').status,'pending');
 const originalPath=first.signed_pdf_path;
 const second=await saveAgreement(args('commission-action'));
 assert.equal(second.status,'signed');
 assert.notEqual(second.signed_pdf_path,originalPath);
 assert.equal(rows.get('hourly-action').signed_pdf_path,originalPath);
 assert.equal(files.size,2);
 await saveAgreement(args('hourly-action'));
 assert.equal(files.size,2);
});

