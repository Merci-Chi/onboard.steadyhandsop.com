import {supabase} from '../supabase-client.js';

const home=document.documentElement.classList.contains('assignments-home');
if(home){
 const $=id=>document.getElementById(id);
 const titles={
  'trial-hourly':'Agreement - Sales Associate Trial: Hourly Pay (10 hrs / Week)',
  'trial-commission':'Agreement - Sales Associate Trial: Commission Pay (10 hrs / Week)',
  'hourly-10':'Agreement - Sales Associate: Hourly Pay (10 hrs / Week)',
  'hourly-20':'Agreement - Sales Associate: Hourly Pay (20 hrs / Week)',
  'commission':'Agreement - Sales Associate: Commission Pay (10 hrs / Week)',
  'manager-10':'Acknowledgment – Sales Manager: Responsibilities & Compensation Outline (10 hrs / Week)',
  'manager-20':'Acknowledgment – Sales Manager: Responsibilities & Compensation Outline (20 hrs / Week)'
 };
 const completed=s=>s==='signed'||s==='acknowledged';
 const dash=$('assignedDashboard'),items=$('assignmentItems'),welcome=$('homeWelcome'),signIn=$('signin');
 $('rightTitle').textContent='Your assigned actions';
 dash.hidden=false;
 const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e};
 function empty(message='Nothing is assigned'){
  items.replaceChildren();const box=make('div','empty');
  box.innerHTML='<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3M9 3h5l4 4v3M9 12h6M9 16h5"/></svg>';
  box.append(make('strong','',message));
  box.append(make('p','','When an administrator assigns an agreement or acknowledgment, it will appear here.'));
  items.append(box);
 }
 async function load(){
  const {data:{session},error:sessionError}=await supabase.auth.getSession();
  if(sessionError){items.textContent='Unable to check assignments. Please refresh.';return;}
  if(!session?.user){welcome.hidden=true;empty();return;}
  welcome.hidden=false;signIn.hidden=true;
  items.textContent='Checking assigned actions…';
  const {data,error}=await supabase.from('sh_individual_agreement_actions')
   .select('code,document_key,status,issued_at,user_id')
   .eq('user_id',session.user.id)
   .order('issued_at',{ascending:false});
  if(error){console.error('Assignment lookup:',error);items.textContent='Unable to load assignments ('+(error.code||'access error')+'). Please contact your administrator.';return;}
  items.replaceChildren();
  const rows=(data||[]).filter(a=>titles[a.document_key]&&/^[A-Za-z0-9_-]{7,50}$/.test(a.code));
  if(!rows.length){empty();return;}
  for(const a of rows){
   const link=make('a','assignment-link');link.href='/agreements/'+encodeURIComponent(a.code);
   const body=make('span');body.append(make('b','',titles[a.document_key]));
   const action=a.document_key.startsWith('manager-')?'Acknowledgment':'Agreement';
   body.append(make('small','',action+' · '+(completed(a.status)?a.status==='signed'?'Signed':'Acknowledged':'Action needed')+' · Code '+a.code));
   link.append(body,make('span','arrow','→'));items.append(link);
  }
 }
 // The original page's code-specific module is unchanged. For the code-free
 // dashboard, make sure its "missing code" branch does not replace this view.
 // A passcode unlocks only an action already assigned to the signed-in user.
 $('actionPasscodeForm').addEventListener('submit',async event=>{
  event.preventDefault();const input=$('actionPasscode'),note=$('passcodeMessage');
  const passcode=input.value.trim();
  if(!/^[A-Za-z0-9_-]{7,50}$/.test(passcode)){note.textContent='Enter a valid action code.';return;}
  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.user){note.textContent='Please sign in before opening an action.';return;}
  note.textContent='Verifying your passcode…';
  const {data,error}=await supabase.from('sh_individual_agreement_actions')
    .select('code').eq('code',passcode).eq('user_id',session.user.id).maybeSingle();
  if(error){note.textContent='Could not verify the passcode. Contact your administrator.';return;}
  if(!data){note.textContent='This passcode is not assigned to your account. Contact your administrator.';return;}
  location.assign('/agreements/'+encodeURIComponent(data.code));
 });
 const observer=new MutationObserver(()=>{if(!welcome.hidden&&signIn.hidden){$('missing').hidden=true;$('status').classList.remove('error');}});
 observer.observe($('missing'),{attributes:true,attributeFilter:['hidden']});
 await load();
 supabase.auth.onAuthStateChange((event)=>{if(event==='SIGNED_IN'||event==='SIGNED_OUT')setTimeout(load,0)});
}
