import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';
const source=(await readFile(new URL('../outreach-return.js',import.meta.url),'utf8')).replace(/^import .*;\n/m,'').replace('export function safeReturn','function safeReturn');
const tick=()=>new Promise(r=>setImmediate(r));
function setup({status={is_paused:true,action_required:true},user={id:'u'},target='https://outreach.steadyhandsop.com/call.html?crm_id=123',storage=new Map(),query=true}={}){
 const events={},docEvents={},redirects=[],intervals=[];let authChange,reads=0;
 const state={status,user,error:false};
 const banner={textContent:'',style:{},setAttribute(){},append(){}};
 const document={body:{prepend(){}},createElement:()=>({...banner,style:{}}),addEventListener:(k,f)=>docEvents[k]=f,visibilityState:'visible',hidden:false};
 const window={addEventListener:(k,f)=>events[k]=f,setInterval:f=>intervals.push(f)};
 const context=vm.createContext({window,document,URL,Date,sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},location:{href:query?'https://onboard.steadyhandsop.com/?from=outreach&return_to='+encodeURIComponent(target):'https://onboard.steadyhandsop.com/agreements/code',replace:v=>redirects.push(v)},setTimeout:f=>f(),ensureHealthySession:async()=>({data:{session:state.user?{user:state.user}:null}}),supabase:{rpc:async()=>{reads++;return state.error?{error:{message:'offline'}}:{data:state.status}},auth:{onAuthStateChange:f=>authChange=f}}});
 vm.runInContext(source,context);return {state,events,redirects,intervals,storage,reads:()=>reads,authChange:()=>authChange?.(),safe:value=>vm.runInContext('safeReturn('+JSON.stringify(value)+')',context)};
}
test('last saved completion returns to the selected call page without a manual recheck',async()=>{
 const h=setup();await tick();assert.deepEqual(h.redirects,[]);
 h.state.status={is_paused:false,action_required:false};await h.events['outreach:requirements-changed']();await tick();
 assert.deepEqual(h.redirects,['https://outreach.steadyhandsop.com/call.html?crm_id=123']);
 assert.equal(h.storage.size,0);
});
test('pending requirements and verification failures never grant access; automatic polling retries',async()=>{
 const h=setup();await tick();h.state.error=true;await h.intervals[0]();assert.deepEqual(h.redirects,[]);
 h.state.error=false;h.state.status={};await h.events.focus();assert.deepEqual(h.redirects,[]);
 h.state.status={is_paused:false};await h.intervals[0]();await tick();assert.equal(h.redirects.length,1);
});
test('return destination survives same-origin navigation and sign-in',async()=>{
 const h=setup({user:null});await tick();assert.equal(h.reads(),0);assert(h.storage.size);
 h.state.user={id:'u'};h.authChange();await tick();assert.equal(h.reads(),1);
 const next=setup({storage:h.storage,query:false,status:{is_paused:false}});await tick();assert.match(next.redirects[0],/call.html\?crm_id=123$/);
});
test('normal onboarding visits do not automatically leave and account switches cancel a prior return',async()=>{
 const normal=setup({query:false,status:{is_paused:false}});await tick();assert.equal(normal.reads(),0);assert.deepEqual(normal.redirects,[]);
 const h=setup();await tick();h.state.user={id:'other'};h.state.status={is_paused:false};await h.events.focus();await tick();assert.deepEqual(h.redirects,[]);assert.equal(h.storage.size,0);
});
test('return links reject external/credential URLs and strip sensitive query parameters',async()=>{
 const h=setup();await tick();
 for(const value of ['javascript:alert(1)','https://evil.example/call.html','https://outreach.steadyhandsop.com.evil.example/call.html','https://user:pass@outreach.steadyhandsop.com/call.html','https://outreach.steadyhandsop.com/action-needed.html'])assert.equal(h.safe(value),null);
 assert.equal(h.safe('https://outreach.steadyhandsop.com/call.html?crm_id=4&number=private&access_token=secret#token'),'https://outreach.steadyhandsop.com/call.html?crm_id=4');
});
