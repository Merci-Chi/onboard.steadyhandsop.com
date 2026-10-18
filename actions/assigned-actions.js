import {supabase,ensureHealthySession} from '/supabase-client.js?v=20261015-reliability';

const items=document.getElementById('assignmentItems');
const make=(tag,cls,text)=>{
 const element=document.createElement(tag);
 if(cls)element.className=cls;
 if(text)element.textContent=text;
 return element;
};
function empty(){
 const box=make('div','empty');
 box.innerHTML='<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3M9 3h5l4 4v3M9 12h6M9 16h5"/></svg>';
 box.append(make('strong','','Nothing is assigned'));
 box.append(make('p','','When an administrator assigns a required action, it will appear here.'));
 items.replaceChildren(box);
}
async function load(){
 items.textContent='Checking assigned actions…';
 try{
  const health=await ensureHealthySession();
  if(health.error)throw health.error;
  const user=health.data?.session?.user;
  if(!user){location.replace('/login.html');return;}
  // Use the existing required-action assignment source, scoped to this account.
  // Do not infer an assignment from the existence of a public action page.
  const {data,error}=await supabase.from('sh_associate_pause')
   .select('action_code,status,signed_at,agreement_storage_path')
   .eq('user_id',user.id)
   .maybeSingle();
  if(error)throw error;
  if(!data?.action_code||!/^[A-Za-z0-9_-]{7,50}$/.test(data.action_code)){empty();return;}
  const complete=data.status==='active'&&!!data.signed_at&&!!data.agreement_storage_path;
  const title=data.action_code==='hEi269a'?'Sales Associate Track Selection':'Required action';
  const link=make('a','assignment-link');
  link.href='/actions/'+encodeURIComponent(data.action_code)+'/';
  const body=make('span');
  body.append(make('b','',title));
  body.append(make('small','',complete?'Completed':'Action needed'));
  link.append(body,make('span','arrow','→'));
  items.replaceChildren(link);
 }catch(error){
  console.error('Required action lookup:',error);
  items.textContent='Unable to load required actions. Please refresh or contact your administrator.';
 }
}
const signout=document.getElementById('action-signout');
signout.addEventListener('click',async()=>{
 signout.disabled=true;signout.textContent='Signing out…';
 try{
  const {error}=await supabase.auth.signOut();
  if(error)throw error;
  location.replace('/login.html');
 }catch(error){
  signout.disabled=false;signout.textContent='Sign out';
  items.textContent='Unable to sign out. Please try again.';
 }
});
await load();
supabase.auth.onAuthStateChange(event=>{
 if(event==='SIGNED_IN'||event==='SIGNED_OUT')setTimeout(load,0);
});
