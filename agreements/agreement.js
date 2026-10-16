import {supabase as db,ensureHealthySession} from '/supabase-client.js?v=20261015-reliability';
import {saveAgreement,validateSigner} from './agreement-save.js?v=20261016-associate-name';
import {overlayAgreement,signaturePNG,pdfText} from './pdf-overlays.js?v=20261016-transparent';
const saveAttempt={};
const $=id=>document.getElementById(id);let user=null,assignment=null,signedDoc=null,drawn=false,drawing=false;
const KINDS={'trial-hourly':['Agreement - Sales Associate Trial: Hourly Pay (10 hrs / Week)','Sales-Associate-Trial-10-Hour-Hourly.pdf'],'trial-commission':['Agreement - Sales Associate Trial: Commission Pay (10 hrs / Week)','Sales-Associate-Trial-Commission.pdf'],'hourly-10':['Agreement - Sales Associate: Hourly Pay (10 hrs / Week)','Sales-Associate-Agreement-10-Hours.pdf'],'hourly-20':['Agreement - Sales Associate: Hourly Pay (20 hrs / Week)','Sales-Associate-Agreement-20-Hours.pdf'],'commission':['Agreement - Sales Associate: Commission Pay (10 hrs / Week)','Sales-Associate-Agreement-Commission.pdf'],'manager-10':['Acknowledgment – Sales Manager: Responsibilities & Compensation Outline (10 hrs / Week)','Sales-Manager-Outline-10-Hours.pdf'],'manager-20':['Acknowledgment – Sales Manager: Responsibilities & Compensation Outline (20 hrs / Week)','Sales-Manager-Outline-20-Hours.pdf']};
const code=(new URLSearchParams(location.search).get('code')||location.pathname.match(/\/agreements\/([A-Za-z0-9_-]{7,50})\/?$/)?.[1]||'').trim();
const managerKind=k=>k==='manager-10'||k==='manager-20';
const pdfURL=k=>'/agreements/pdfs/'+KINDS[k][1];
const status=(s,bad=false)=>{$('status').textContent=s;$('status').classList.toggle('error',bad)};
function show(id){for(const x of ['signin','missing','sign','complete'])$(x).hidden=x!==id;}
$('clock').textContent=new Date().getFullYear();
$('date').value=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
const canvas=$('pad'),ctx=canvas.getContext('2d');
function sizePad(){let r=canvas.getBoundingClientRect();if(!r.width)return;const d=devicePixelRatio||1;const keep=drawn?canvas.toDataURL():null;canvas.width=Math.round(r.width*d);canvas.height=Math.round(160*d);ctx.setTransform(d,0,0,d,0,0);ctx.strokeStyle='#102945';ctx.lineWidth=2.6;ctx.lineCap='round';ctx.lineJoin='round';if(keep){const im=new Image();im.onload=()=>ctx.drawImage(im,0,0,r.width,160);im.src=keep;}}
const pos=e=>{const r=canvas.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top]};
canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();if(!canvas.width)sizePad();drawing=true;try{canvas.setPointerCapture(e.pointerId)}catch(_){}let [x,y]=pos(e);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+.1,y+.1);ctx.stroke();drawn=true;});
canvas.addEventListener('pointermove',e=>{if(!drawing)return;e.preventDefault();ctx.lineTo(...pos(e));ctx.stroke()});for(let ev of ['pointerup','pointercancel'])canvas.addEventListener(ev,()=>drawing=false);
$('clear').onclick=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);drawn=false};
window.addEventListener('resize',()=>{if(!drawing&&!$('sign').hidden)sizePad()});
canvas.style.touchAction='none';
async function display(){status('Checking your account and agreement assignment…');const health=await ensureHealthySession();if(health.error){show('signin');status(health.error.message,true);return;}const session=health.data?.session;user=session?.user||null;if(!user){show('signin');status('Please sign in to review your agreement.');return;}
if(!/^[A-Za-z0-9_-]{7,50}$/.test(code)){show('missing');status('Missing or invalid agreement link.',true);return;}
const {data,error}=await db.from('sh_individual_agreement_actions').select('code,document_key,assigned_email,user_id,status,signed_pdf_path,signed_at,associate_name,effective_date,work_location,signature_name,signature_date').eq('code',code).eq('user_id',user.id).maybeSingle();
if(error){show('missing');status('Could not check agreement: '+error.message,true);return;}
if(!data||!KINDS[data.document_key]){show('missing');status('No agreement is assigned to this account for this link.',true);return;}
assignment=data;$('title').textContent=KINDS[data.document_key][0];$('kind').textContent=KINDS[data.document_key][0];$('recipient').textContent=user.email||'';$('intro').textContent='Review, acknowledge, and electronically sign your individually assigned agreement.';
const isManager=managerKind(data.document_key);$('steps').innerHTML=isManager?'<b>1</b> Review the PDF <span>→</span><b>2</b> Confirm understanding <span>→</span><b>3</b> Acknowledge':'<b>1</b> Review the PDF <span>→</span><b>2</b> Accept terms <span>→</span><b>3</b> Sign';$('agreeText').textContent=isManager?'I acknowledge receiving, reading, and understanding the Sales Manager responsibilities and compensation outline. This acknowledgment does not constitute a new signed agreement.':'I accept the agreement terms and consent to sign electronically.';$('signatureFields').hidden=isManager;$('submit').textContent=isManager?'Submit Acknowledgment':'Accept & Sign Agreement';$('actionTip').textContent=isManager?'Your acknowledgment PDF includes the full legal name you enter here, effective date, work location, and acknowledgment date. No drawn signature is required.':'Submission time is recorded by the database. Signing cannot be undone or edited after submission.';$('intro').textContent=isManager?'Review your assigned Sales Manager responsibilities and compensation outline and acknowledge receipt and understanding. No agreement signature is required.':'Review, acknowledge, and electronically sign your individually assigned agreement.';(document.getElementById('assignmentDetails')||(()=>{const p=document.createElement('p');p.id='assignmentDetails';p.className='tip';$('openpdf').before(p);return p})()).textContent='Effective date: '+(data.effective_date||'Not provided')+' · Work location: '+(data.work_location||'Not provided');$('openpdf').href=pdfURL(data.document_key);$('pdf').src=pdfURL(data.document_key)+'#toolbar=1';$('pdfhint').hidden=true;
if(data.status==='signed'||data.status==='acknowledged'){show('complete');showCompleted(data);status((isManager?'Acknowledged':'Signed')+' on '+new Date(data.signed_at).toLocaleString());return;}
show('sign');status('Please read the document and complete each required field.');requestAnimationFrame(sizePad);
}
$('signin').onsubmit=async e=>{e.preventDefault();const btn=e.target.querySelector('button');btn.disabled=true;status('Signing in…');try{const {error}=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error)throw error;$('password').value='';await display();}catch(err){status(err.message,true)}finally{btn.disabled=false}};
$('switch').onclick=async()=>{await db.auth.signOut();user=null;show('signin');status('Sign in with the account this agreement was assigned to.');};
async function buildSignedPDF(raw,info){
 if(!window.PDFLib)throw Error('PDF signing library unavailable.');
 const doc=await PDFLib.PDFDocument.load(raw);
 const font=await doc.embedFont(PDFLib.StandardFonts.Helvetica),bold=await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
 const ink=PDFLib.rgb(.07,.16,.29),accent=PDFLib.rgb(.08,.35,.57);
 const isManager=managerKind(assignment.document_key),A=assignment;
 await overlayAgreement({doc,PDFLib,kind:assignment.document_key,assignment:A,...info});
 // The complete audit certificate makes every saved value available even when
 // the underlying PDF's short underline is too narrow for the full details.
 const page=doc.addPage([595.28,841.89]);
 const line=(label,value,y)=>{
  page.drawText(label,{x:47,y,size:10,font:bold,color:ink});
  const words=pdfText(value).split(/\s+/);let text='',row=0;
  for(const word of words){
   if(text&&font.widthOfTextAtSize(text+' '+word,10)>490){page.drawText(text,{x:47,y:y-19-row*12,size:10,font,color:ink});row++;text=word;}
   else text+=(text?' ':'')+word;
  }
  page.drawText(text,{x:47,y:y-19-row*12,size:10,font,color:ink});
 };
 page.drawText('STEADY HANDS LLC',{x:47,y:789,size:17,font:bold,color:accent});
 page.drawText(isManager?'ACKNOWLEDGMENT RECORD':'ELECTRONIC SIGNATURE CERTIFICATE',{x:47,y:752,size:15,font:bold,color:ink});
 page.drawLine({start:{x:47,y:739},end:{x:548,y:739},thickness:1,color:ink});
 line('Document',KINDS[assignment.document_key][0],713);
 line('Effective date / trial start',A.effective_date,665);
 line('Work location',A.work_location,617);
 line('Full legal name entered by associate',info.name,569);
 line('Date entered by associate',info.date,521);
 line('Account email',user.email||'',473);
 line('Assignment reference',code,425);
 line('Submitted at (UTC)',info.stamp,377);
 if(!isManager){
  page.drawText('Drawn signature',{x:47,y:321,size:10,font:bold,color:ink});
  const imgBytes=Uint8Array.from(atob(info.signature.split(',')[1]),c=>c.charCodeAt(0));
  const image=await doc.embedPng(imgBytes),scale=Math.min(280/image.width,88/image.height);
  page.drawImage(image,{x:50,y:211,width:image.width*scale,height:image.height*scale});
 }else page.drawText('Acknowledged only — no drawn signature required.',{x:47,y:308,size:11,font,color:ink});
 page.drawText('The original agreement pages precede this audit record.',{x:47,y:80,size:9,font,color:ink});
 return await doc.save();
}
let pdfLibraryPromise;
async function pdfLib(){
 if(window.PDFLib)return;
 if(!pdfLibraryPromise)pdfLibraryPromise=(async()=>{
  for(const url of ['https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js','https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js','https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js']){
   try{await new Promise((resolve,reject)=>{
    const el=document.createElement('script');el.src=url;
    const timer=setTimeout(()=>{el.remove();reject(Error('PDF library timed out'));},8000);
    el.onload=()=>{clearTimeout(timer);resolve()};el.onerror=()=>{clearTimeout(timer);el.remove();reject(Error('PDF library could not load'))};document.head.appendChild(el);
   });if(window.PDFLib)return;}catch(_){}
  }
  throw Error('Unable to load the PDF generator. Check your connection or content blocker and retry.');
 })().catch(error=>{pdfLibraryPromise=null;throw error});
 return pdfLibraryPromise;
}
function showCompleted(data){const ack=managerKind(data.document_key);$('completeTitle').textContent=ack?'Acknowledgment recorded':'Agreement signed';$('completeInfo').textContent=ack?'Your Sales Manager outline acknowledgment was saved with your full name, date, and official submission time. The outline document remains available for review.':'Your agreement has been submitted and recorded. You can download the signed copy here.';$('download').textContent=ack?'Download completed acknowledgment PDF':'Download signed PDF';$('completeTip').textContent=ack?'This is an acknowledgment, not a signed management contract. Download your completed PDF for your records.':'If you need a correction, contact your administrator. Your saved signature cannot be edited from this page.';}
$('sign').onsubmit=async e=>{
 e.preventDefault();if(!assignment)return;
 const isManager=managerKind(assignment.document_key);
 if(!isManager&&!drawn){status('Please draw your signature.',true);return;}
 if(!$('read').checked||!$('agree').checked){status('Read and accept the terms first.',true);return;}
 const name=$('fullName').value.trim(),date=$('date').value;
 if(name.length<3||!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))){status('Enter your full legal name and a valid signing date.',true);return;}
 try{validateSigner(assignment,user,name)}catch(error){status(error.message,true);return;}
 const button=$('submit');button.disabled=true;
 try{
  const health=await ensureHealthySession();if(health.error)throw health.error;
  if(health.data?.session?.user?.id!==user.id)throw Error('Your account changed. Reload this page before signing.');
  status('Preparing and saving your agreement. Keep this page open…');
  await pdfLib();
  const signature=isManager?null:signaturePNG(canvas);
  const result=await saveAgreement({db,assignment,user,name,date,signature,attempt:saveAttempt,makePDF:async stamp=>{
   const response=await fetch(pdfURL(assignment.document_key));
   if(!response.ok)throw Error('The original agreement PDF could not be loaded (HTTP '+response.status+').');
   return buildSignedPDF(await response.arrayBuffer(),{name,date,signature,stamp});
  }});
  Object.assign(assignment,result);show('complete');showCompleted(assignment);
  status((isManager?'Acknowledgment':'Agreement')+' saved on '+new Date(assignment.signed_at).toLocaleString()+'.');
 }catch(error){status('Not completed: '+error.message,true)}finally{button.disabled=false;}
};
$('download').onclick=async()=>{
 const button=$('download');button.disabled=true;
 try{
  const health=await ensureHealthySession();if(health.error)throw health.error;
  if(!assignment?.signed_pdf_path)throw Error('Signed document not available.');
  const {data,error}=await db.storage.from('sh-signed-agreements').download(assignment.signed_pdf_path);if(error)throw error;
  const link=document.createElement('a'),url=URL.createObjectURL(data);link.href=url;link.download='SteadyHands-Signed-'+code+'.pdf';
  document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
 }catch(error){status('Could not download PDF: '+error.message,true)}finally{button.disabled=false;}
};
if(code)display().catch(e=>{status('Unable to open action: '+e.message,true);show('missing')});


