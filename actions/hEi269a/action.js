import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const db=createClient('https://glonbvrcudwuzjundrii.supabase.co','sb_publishable_VZbed_uuOXSE744UrAfHXw_z2xDdYtr',{auth:{persistSession:true,autoRefreshToken:true}});
const $=id=>document.getElementById(id),message=s=>$('msg').textContent=s;
let session=null,drawn=false,drawing=false,signature='',selection='',legalName='',signedAt=null;
const canvas=$('signature'),ctx=canvas.getContext('2d');
function resize(){const old=drawn?canvas.toDataURL('image/png'):null;canvas.width=Math.round(canvas.getBoundingClientRect().width*devicePixelRatio);canvas.height=Math.round(190*devicePixelRatio);ctx.scale(devicePixelRatio,devicePixelRatio);ctx.strokeStyle='#102945';ctx.lineWidth=2.6;ctx.lineCap='round';ctx.lineJoin='round';if(old){const im=new Image();im.onload=()=>ctx.drawImage(im,0,0,canvas.clientWidth,190);im.src=old;}}
resize();window.addEventListener('resize',()=>{if(!drawing)resize()});
function point(ev){const r=canvas.getBoundingClientRect();return{x:ev.clientX-r.left,y:ev.clientY-r.top};}
canvas.addEventListener('pointerdown',e=>{drawing=true;canvas.setPointerCapture(e.pointerId);const p=point(e);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+.1,p.y+.1);ctx.stroke();drawn=true;});
canvas.addEventListener('pointermove',e=>{if(!drawing)return;const p=point(e);ctx.lineTo(p.x,p.y);ctx.stroke();});
for(const event of ['pointerup','pointercancel'])canvas.addEventListener(event,()=>drawing=false);
$('clear').onclick=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);drawn=false;};
function tracks(t){return t==='trial'?{title:'Option 1: 2 week performance trial',terms:['$12/hr for up to 10 hours per week.','$30 commission for each qualified sale.','$100 bonus for 5 qualified sales; $250 bonus for 10 qualified sales.','Minimum 25 outbound call attempts per hour during scheduled work hours.', 'Minimum 3 qualified sales per week. Failure may result in evaluation of continued eligibility.']}:{title:'Option 2: Commission specialist',terms:['$30 commission for each qualified sale.','$100 bonus for 5 qualified sales; $250 bonus for 10 qualified sales.','No minimum sales requirement. Two sales per week is encouraged, not required.']};}
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function agreementHTML(){const t=tracks(selection);return `<h3>Steady Hands LLC · Associate Track Agreement</h3><p><b>Associate:</b> ${esc(legalName)}</p><p><b>Selected track:</b> ${esc(t.title)}</p><p><b>Terms:</b></p><ul>${t.terms.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><p class="small">Qualified sales and bonuses are subject to the full notice. The signed choice does not replace applicable employment law or any separately required employment agreement.</p><p><b>Electronic signature:</b></p><img src="${signature}" alt="Drawn electronic signature"><p><b>Printed name:</b> ${esc(legalName)}</p><p><b>Date:</b> ${signedAt?esc(new Date(signedAt).toLocaleString()):'To be recorded upon submission'}</p>`;}
const BUCKET='sh-signed-agreements';
let storedPath='', savedBlob=null;
function buildPDF(){
 const jsPDF=window.jspdf?.jsPDF;
 if(!jsPDF)throw new Error('PDF library is unavailable. Check your connection and try again.');
 const pdf=new jsPDF({unit:'mm',format:'a4'});
 pdf.setTextColor(16,41,69);pdf.setFont('helvetica','bold');pdf.setFontSize(16);
 pdf.text('STEADY HANDS LLC',18,22);pdf.setFontSize(13);
 pdf.text('Sales Associate Track Selection & Agreement',18,33);
 pdf.setFont('helvetica','normal');pdf.setFontSize(10);
 let y=48;function line(v){const lines=pdf.splitTextToSize(v,170);pdf.text(lines,18,y);y+=lines.length*6+4;}
 line('Associate: '+legalName);line('Selected track: '+tracks(selection).title);
 for(const term of tracks(selection).terms)line('- '+term);
 line('I have read the full notice and electronically agree to my selected track.');
 line('Signed on (Supabase server time): '+new Date(signedAt).toISOString());
 line('Required action: hEi269a');
 if(y>225)pdf.addPage(),y=24;
 pdf.addImage(signature,'PNG',18,y+2,82,30);pdf.text('Drawn signature: '+legalName,18,y+42);
 pdf.setFontSize(8);pdf.text('Steady Hands LLC | Electronically signed agreement',18,283);
 return pdf.output('blob');
}
async function downloadPDF(){
 try{
  if(!session)throw Error('Please sign in again.');
  if(!storedPath)throw Error('No completed agreement is available yet.');
  const {data,error}=await db.storage.from(BUCKET).download(storedPath);
  if(error)throw error;
  const url=URL.createObjectURL(data),link=document.createElement('a');
  link.href=url;link.download='SteadyHands-Signed-Agreement-hEi269a.pdf';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),15000);
 }catch(e){message('Could not download saved PDF: '+e.message);}
}
$('download').onclick=downloadPDF;
async function authView(){const yes=!!session;$('signin').hidden=yes;$('choice-form').hidden=!yes;if(!yes)return;
 const {data,error}=await db.from('sh_associate_pause').select('status,action_code,agreement_storage_path,signed_at').eq('user_id',session.user.id).maybeSingle();
 if(error){message('Unable to check action status: '+error.message);return;}
 if(data?.action_code==='hEi269a' && data?.agreement_storage_path && data?.status==='active'){
 storedPath=data.agreement_storage_path;signedAt=data.signed_at;$('choice-form').hidden=true;$('review').hidden=true;$('success').hidden=false;
 message('Your saved agreement is available for download.');
 }
}
const response=await db.auth.getSession();session=response.data?.session||null;await authView();
$('signin').onsubmit=async ev=>{ev.preventDefault();message('Signing in…');const {data,error}=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error){message(error.message);return;}session=data.session;await authView();if(!$('success').hidden)return;message('Signed in. Complete your required action.');};
$('choice-form').onsubmit=e=>{e.preventDefault();if(!drawn){message('Please draw your signature.');return;}if(!$('read').checked){message('Read and acknowledge the notice first.');return;}selection=new FormData(e.target).get('track');legalName=$('signature-name').value.trim();if(!selection||legalName.length<3){message('Choose a track and enter your full legal name.');return;}signature=canvas.toDataURL('image/png');$('agreement').innerHTML=agreementHTML();$('choice-form').hidden=true;$('review').hidden=false;message('');window.scrollTo({top:0,behavior:'smooth'});};
$('back').onclick=()=>{$('review').hidden=true;$('choice-form').hidden=false;};
$('confirm').onclick=async()=>{
 if(!$('agree').checked){message('Confirm your agreement first.');return;}
 if(!session){message('Sign in again.');return;}
 const btn=$('confirm');btn.disabled=true;
 try{
  message('Preparing signed agreement…');
  const {data:prepared,error:prepareError}=await db.rpc('sh_prepare_signed_agreement',{
   p_track:selection,p_signature_name:legalName,p_signature_png:signature,p_acknowledged:true
  });
  if(prepareError)throw prepareError;
  signedAt=prepared.signed_at;storedPath=prepared.path;
  savedBlob=buildPDF();
  message('Saving signed PDF to private Supabase Storage…');
  const {error:uploadError}=await db.storage.from(BUCKET).upload(storedPath,savedBlob,{
    contentType:'application/pdf',upsert:true,cacheControl:'0'
  });
  if(uploadError)throw uploadError;
  const {data:result,error:finishError}=await db.rpc('sh_finalize_signed_agreement');
  if(finishError)throw finishError;
  $('review').hidden=true;$('success').hidden=false;
  message('Signed agreement securely saved on '+new Date(result.signed_at).toLocaleString()+'.');
 }catch(error){message('Agreement NOT finalized: '+(error.message||error)+'. Please retry; your selection remains paused until the PDF is saved.');}
 finally{btn.disabled=false;}
};
