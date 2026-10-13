import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const db=createClient('https://glonbvrcudwuzjundrii.supabase.co','sb_publishable_VZbed_uuOXSE744UrAfHXw_z2xDdYtr',{auth:{persistSession:true,autoRefreshToken:true}});
const $=id=>document.getElementById(id),message=s=>$('msg').textContent=s;
let session=null,drawn=false,drawing=false,signature='',selection='',legalName='',signedAt=null,signatureDate='';
const canvas=$('signature'),ctx=canvas.getContext('2d');
const dateInput=$('signature-date');dateInput.value=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
function resize(){
 const width=canvas.getBoundingClientRect().width;
 if(width<1)return; // The form begins hidden; never create a zero-width signature pad.
 const ratio=Math.max(1,window.devicePixelRatio||1);
 const newW=Math.round(width*ratio),newH=Math.round(190*ratio);
 if(canvas.width===newW&&canvas.height===newH)return;
 const old=drawn&&canvas.width>0&&canvas.height>0?canvas.toDataURL('image/png'):null;
 canvas.width=newW;canvas.height=newH;
 ctx.setTransform(ratio,0,0,ratio,0,0);
 ctx.strokeStyle='#102945';ctx.lineWidth=2.6;ctx.lineCap='round';ctx.lineJoin='round';
 if(old){const im=new Image();im.onload=()=>ctx.drawImage(im,0,0,width,190);im.src=old;}
}
resize();
window.addEventListener('resize',()=>{if(!drawing)resize()});
if('ResizeObserver' in window)new ResizeObserver(()=>{if(!drawing)resize()}).observe(canvas);
function point(e){const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
function startStroke(e){
 if(e.pointerType==='mouse'&&e.button!==0)return;
 resize();if(!canvas.width)return;
 e.preventDefault();
 drawing=true;
 try{canvas.setPointerCapture(e.pointerId)}catch(_){}
 const p=point(e);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+.1,p.y+.1);ctx.stroke();drawn=true;
}
function moveStroke(e){if(!drawing)return;e.preventDefault();const p=point(e);ctx.lineTo(p.x,p.y);ctx.stroke();}
function endStroke(e){if(!drawing)return;drawing=false;try{if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId)}catch(_){}}
canvas.addEventListener('pointerdown',startStroke);
canvas.addEventListener('pointermove',moveStroke);
canvas.addEventListener('pointerup',endStroke);
canvas.addEventListener('pointercancel',endStroke);
window.addEventListener('pointerup',endStroke);
$('clear').onclick=()=>{resize();ctx.clearRect(0,0,canvas.width,canvas.height);drawn=false;};
function tracks(t){return t==='trial'?{title:'Option 1: 2 week performance trial',terms:['$12/hr for up to 10 hours per week.','$30 commission for each qualified sale.','$100 bonus for 5 qualified sales; $250 bonus for 10 qualified sales.','Minimum 25 outbound call attempts per hour during scheduled work hours.', 'Minimum 3 qualified sales per week. Failure may result in evaluation of continued eligibility.']}:{title:'Option 2: Commission specialist',terms:['$30 commission for each qualified sale.','$100 bonus for 5 qualified sales; $250 bonus for 10 qualified sales.','No minimum sales requirement. Two sales per week is encouraged, not required.']};}
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function agreementHTML(){const t=tracks(selection);return `<h3>Steady Hands LLC · Associate Track Agreement</h3><p><b>Associate:</b> ${esc(legalName)}</p><p><b>Selected track:</b> ${esc(t.title)}</p><p><b>Terms:</b></p><ul>${t.terms.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><p class="small">Qualified sales and bonuses are subject to the full notice. The signed choice does not replace applicable employment law or any separately required employment agreement.</p><p><b>Electronic signature:</b></p><img src="${signature}" alt="Drawn electronic signature"><p><b>Printed name:</b> ${esc(legalName)}</p><p><b>Date entered:</b> ${esc(signatureDate)}</p><p><b>Official submission timestamp:</b> ${signedAt?esc(new Date(signedAt).toLocaleString()):'To be recorded upon submission'}</p>`;}
const BUCKET='sh-signed-agreements';
let storedPath='', savedBlob=null;
// Safari or privacy filters may block a particular CDN. Try alternate hosts
// before creating any pending agreement record.
let pdfLoadPromise=null;
async function ensurePDFLibrary(){
 if(window.jspdf?.jsPDF)return;
 if(!pdfLoadPromise)pdfLoadPromise=(async()=>{
  const urls=[
   'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js',
   'https://unpkg.com/jspdf@2.5.2/dist/jspdf.umd.min.js',
   'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js'
  ];
  for(const url of urls){
   if(window.jspdf?.jsPDF)return;
   try{
    await new Promise((resolve,reject)=>{
     const tag=document.createElement('script');
     const timeout=setTimeout(()=>{tag.remove();reject(new Error('PDF download timed out'));},6500);
     tag.src=url;tag.async=true;
     tag.onload=()=>{clearTimeout(timeout);resolve();};
     tag.onerror=()=>{clearTimeout(timeout);tag.remove();reject(new Error('PDF library host blocked'));};
     document.head.appendChild(tag);
    });
    if(window.jspdf?.jsPDF)return;
   }catch(err){console.warn('PDF fallback:',url,err);}
  }
  throw new Error('PDF generation could not load. Check Safari content blockers or network settings, then try again.');
 })().catch(err=>{pdfLoadPromise=null;throw err;});
 return pdfLoadPromise;
}
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
 line('Signature date entered: '+signatureDate);line('Signed on (Supabase server time): '+new Date(signedAt).toISOString());
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
async function authView(){
 const yes=!!session;
 $('signin').hidden=yes;
 $('choice-form').hidden=!yes;
 $('review').hidden=true;
 $('success').hidden=true;
 if(yes)requestAnimationFrame(resize);
 if(!yes)return;
 // Pause status is intentionally not an authorization gate on this agreement page:
 // paused associates must still be able to sign their required action.
 const {data,error}=await db.from('sh_associate_pause')
  .select('status,action_code,agreement_storage_path,signed_at')
  .eq('user_id',session.user.id).maybeSingle();
 if(error){
   // A missing SELECT grant or RLS policy should not make an otherwise valid
   // Supabase login look unsuccessful or prevent submission of the agreement.
   console.warn('Agreement status lookup unavailable:',error);
   message('Signed in successfully. You can complete the agreement. If you have already signed, contact your coordinator to retrieve the saved copy.');
   return;
 }
 if(data?.action_code==='hEi269a' && data?.agreement_storage_path && data?.status==='active'){
   storedPath=data.agreement_storage_path;signedAt=data.signed_at;
   $('choice-form').hidden=true;$('success').hidden=false;
   message('Your saved agreement is available for download.');
 } else {
   storedPath='';signedAt=null;
   message('Signed in. Complete your required action.');
 }
}
async function initializeAuth(){
 try{
   const {data,error}=await db.auth.getSession();
   if(error)throw error;
   session=data?.session||null;
   await authView();
 }catch(error){
   console.error('Agreement login initialization failed:',error);
   session=null;$('signin').hidden=false;$('choice-form').hidden=true;
   message('Unable to restore your saved login. Please sign in with your Outreach email and password. '+(error.message||''));
 }
}
$('signin').onsubmit=async ev=>{
 ev.preventDefault();
 const button=$('signin').querySelector('button[type="submit"]');
 button.disabled=true;
 message('Signing in…');
 try{
   const {data,error}=await db.auth.signInWithPassword({
     email:$('email').value.trim(),
     password:$('password').value
   });
   if(error)throw error;
   if(!data?.session)throw new Error('No session was returned. Please try again.');
   session=data.session;
   $('password').value='';
   await authView();
 }catch(error){
   message('Could not sign in: '+(error.message||error)+'. Use the same email and password as Outreach.');
 }finally{button.disabled=false;}
};
await initializeAuth();
$('choice-form').onsubmit=e=>{e.preventDefault();if(!drawn){message('Please draw your signature.');return;}if(!$('read').checked){message('Read and acknowledge the notice first.');return;}selection=new FormData(e.target).get('track');legalName=$('signature-name').value.trim();signatureDate=dateInput.value;if(!signatureDate){message('Enter the date of your signature.');return;}if(!selection||legalName.length<3){message('Choose a track and enter your full legal name.');return;}signature=canvas.toDataURL('image/png');$('agreement').innerHTML=agreementHTML();$('choice-form').hidden=true;$('review').hidden=false;message('');window.scrollTo({top:0,behavior:'smooth'});};
$('back').onclick=()=>{$('review').hidden=true;$('choice-form').hidden=false;};
$('confirm').onclick=async()=>{
 if(!$('agree').checked){message('Confirm your agreement first.');return;}
 if(!session){message('Sign in again.');return;}
 const btn=$('confirm');btn.disabled=true;
 try{
  message('Loading PDF generator…');
  await ensurePDFLibrary();
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
