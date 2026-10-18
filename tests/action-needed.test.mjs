import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../actions/assigned-actions.js',import.meta.url),'utf8');
class Element{
 constructor(){this.children=[];this._text='';this.events={};}
 set textContent(value){this._text=value;this.children=[];}
 get textContent(){return this._text+this.children.map(x=>x.textContent).join('');}
 append(...children){this.children.push(...children);}
 replaceChildren(...children){this._text='';this.children=children;}
 addEventListener(name,callback){this.events[name]=callback;}
}
async function render({user={id:'assigned-user'},row=null,error=null,healthError=null,signoutError=null}={}){
 const items=new Element(),button=new Element(),calls=[];
 let redirect=null,authListener;
 const document={getElementById:id=>id==='assignmentItems'?items:button,createElement:()=>new Element()};
 const supabase={from:table=>({select(fields){this.fields=fields;return this;},eq(field,value){this.field=field;this.value=value;return this;},in(){return this;},order(){return this;},then(resolve){calls.push({table,fields:this.fields,field:this.field,value:this.value});return Promise.resolve({data:Array.isArray(row)?row:row?[row]:[],error}).then(resolve);}}),auth:{onAuthStateChange:callback=>{authListener=callback;},signOut:async()=>({error:signoutError})}};
 const context={document,supabase,ensureHealthySession:async()=>({data:{session:user?{user}:null},error:healthError}),location:{replace:url=>{redirect=url;}},console:{error(){}},setTimeout:callback=>callback()};
 vm.createContext(context);
 await vm.runInContext('(async()=>{'+source.replace(/^import .*;\n/,'')+'})()',context);
 return {items,button,calls,get redirect(){return redirect;},authListener};
}
test('required actions are scoped to the authenticated account',async()=>{
 const result=await render();
 assert.equal(result.calls[0].table,'outreach_action_assignments');
 assert.equal(result.calls[0].field,'user_id');
 assert.equal(result.calls[0].value,'assigned-user');
 assert.match(result.items.textContent,/Nothing is assigned/);
});
test('assigned action opens the popup questionnaire entry',async()=>{
 const {items}=await render({row:{id:'assignment-one',status:'assigned'}});
 assert.equal(items.children[0].href,'/actions/hEi269a/?assignment=assignment-one');
 assert.match(items.textContent,/Associate QuestionnaireAction needed/);
});
test('a completed questionnaire is labeled completed without any document fields',async()=>{
 assert.match((await render({row:{id:'assignment-one',status:'completed'}})).items.textContent,/Completed/);
 assert.match((await render({row:{id:'assignment-one',status:'assigned'}})).items.textContent,/Action needed/);
});
test('missing and cancelled assignments do not produce questionnaire links',async()=>{
 for(const row of [null,{}, {id:'one',status:'cancelled'}]){
  const {items}=await render({row});assert.match(items.textContent,/Nothing is assigned/);assert.equal(items.children[0].href,undefined);
 }
});
test('signed-out users are redirected without querying assignments',async()=>{
 const result=await render({user:null});
 assert.equal(result.redirect,'/login.html');assert.equal(result.calls.length,0);
});
test('query and session failures are visible instead of an empty assignment list',async()=>{
 for(const options of [{error:{message:'Denied'}},{healthError:{message:'Expired'}}]){
  const {items}=await render(options);assert.match(items.textContent,/Unable to load required actions/);
 }
});
test('sign-out succeeds or exposes a retryable failure',async()=>{
 const success=await render();await success.button.events.click();assert.equal(success.redirect,'/login.html');
 const failure=await render({signoutError:{message:'Network'}});await failure.button.events.click();
 assert.equal(failure.button.disabled,false);assert.match(failure.items.textContent,/Unable to sign out/);
});
test('both dashboards reference the same styles and welcome links reach both',async()=>{
 const [home,agreements,actions]=await Promise.all(['../index.html','../agreements/index.html','../actions/index.html'].map(file=>readFile(new URL(file,import.meta.url),'utf8')));
 for(const html of [agreements,actions]){
  assert(html.includes('href="/agreements/agreement.css"'));
  assert(html.includes('href="/agreements/assigned-actions.css"'));
  for(const cls of ['class="layout"','class="panel"','class="paper"','class="paperbar"'])assert(html.includes(cls));
 }
 assert(home.includes('href="actions/"'));assert(home.includes('href="agreements/"'));
});


test('multiple assignments keep distinct links, dates and completion states',async()=>{
 const {items}=await render({row:[{id:'first',status:'completed',assigned_at:'2026-10-18T12:00:00Z',completed_at:'2026-10-18T13:00:00Z'},{id:'second',status:'assigned',assigned_at:'2026-10-19T12:00:00Z'}]});
 assert.equal(items.children.length,2);
 assert.match(items.children[0].href,/assignment=first/);assert.match(items.children[1].href,/assignment=second/);
 assert.match(items.children[0].textContent,/Completed.*Assigned Oct.*Completed Oct/);
 assert.match(items.children[1].textContent,/Action needed.*Assigned Oct/);
});
