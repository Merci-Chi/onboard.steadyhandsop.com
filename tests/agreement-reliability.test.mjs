import test from 'node:test';
import assert from 'node:assert/strict';
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
test('wrong account and wrong assigned name cannot sign',()=>{
 assert.throws(()=>validateSigner(base,{id:'other'},'Test Person'),/different account/);
 assert.throws(()=>validateSigner({...base,associate_name:'Someone Else'},user,'Test Person'),/does not match/);
 validateSigner({...base,associate_name:'Tést Person'},user,'TEST PERSON');
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
