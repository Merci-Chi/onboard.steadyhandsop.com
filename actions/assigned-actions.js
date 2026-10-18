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
  const {data,error}=await supabase.from('outreach_action_assignments')
   .select('id,status,assigned_at,completed_at')
   .eq('user_id',user.id).in('status',['assigned','completed'])
   .order('assigned_at',{ascending:false}).order('id',{ascending:false});
  if(error)throw error;
  const rows=(data||[]).filter(row=>row.id&&['assigned','completed'].includes(row.status));
  if(!rows.length){empty();return;}
  const links=rows.map(row=>{
   const complete=row.status==='completed';
   const link=make('a','assignment-link');
   link.href='/actions/hEi269a/?assignment='+encodeURIComponent(row.id);
   const body=make('span');
   body.append(make('b','','Associate Questionnaire'));
   body.append(make('small','',complete?'Completed':'Action needed'));
   for(const [label,value] of [['Assigned',row.assigned_at],['Completed',row.completed_at]]){
    if(!value)continue;
    const date=new Date(value);
    if(!Number.isFinite(date.getTime()))continue;
    const line=make('small');
    line.append(make('span','',label+' '));
    const timestamp=make('time','',new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeStyle:'short'}).format(date));
    timestamp.dateTime=value;line.append(timestamp);body.append(line);
   }
   link.append(body,make('span','arrow','→'));
   return link;
  });
  items.replaceChildren(...links);
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

