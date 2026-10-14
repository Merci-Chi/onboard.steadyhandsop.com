import {supabase as db} from '../supabase-client.js';
const $=id=>document.getElementById(id);let user=null,assignment=null,signedDoc=null,drawn=false,drawing=false;
const KINDS={'trial-hourly':['Agreement - Sales Associate Trial: Hourly Pay (10 hrs / Week)','Sales-Associate-Trial-10-Hour-Hourly.pdf'],'trial-commission':['Agreement - Sales Associate Trial: Commission Pay','Sales-Associate-Trial-Commission.pdf'],'hourly-10':['Agreement - Sales Associate: Hourly Pay (10 hrs / Week)','Sales-Associate-Agreement-10-Hours.pdf'],'hourly-20':['Agreement - Sales Associate: Hourly Pay (20 hrs / Week)','Sales-Associate-Agreement-20-Hours.pdf'],'commission':['Agreement - Sales Associate: Commission Pay','Sales-Associate-Agreement-Commission.pdf'],'manager-10':['Acknowledgment – Sales Manager: Responsibilities & Compensation Outline (10 hrs / Week)','Sales-Manager-Track-10-Hours.pdf'],'manager-20':['Acknowledgment – Sales Manager: Responsibilities & Compensation Outline (20 hrs / Week)','Sales-Manager-Track-20-Hours.pdf']};
const code=new URLSearchParams(location.search).get('code')?.trim()||'';
const managerKind=k=>k==='manager-10'||k==='manager-20';
const pdfURL=k=>'pdfs/'+KINDS[k][1];
const status=(s,bad=false)=>{$('status').textContent=s;$('status').classList.toggle('error',bad)};
function show(id){for(const x of ['signin','missing','sign','complete'])$(x).hidden=x!==id;}
$('clock').textContent=new Date().getFullYear();
$('date').value=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
const canvas=$('pad'),ctx=canvas.getContext('2d');
function sizePad(){let r=canvas.getBoundingClientRect();if(!r.width)return;const d=devicePixelRatio||1;const keep=drawn?canvas.toDataURL():null;canvas.width=Math.round(r.width*d);canvas.height=Math.round(160*d);ctx.setTransform(d,0,0,d,0,0);ctx.strokeStyle='#102945';ctx.lineWidth=2.6;ctx.lineCap='round';ctx.lineJoin='round';if(keep){const im=new Image();im.onload=()=>ctx.drawImage(im,0,0,r.width,160);im.src=keep;}}
const pos=e=>{const r=canvas.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top]};
canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();if(!canvas.width)sizePad();drawing=true;canvas.setPointerCapture(e.pointerId);let [x,y]=pos(e);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+.1,y+.1);ctx.stroke();drawn=true;});
canvas.addEventListener('pointermove',e=>{if(!drawing)return;e.preventDefault();ctx.lineTo(...pos(e));ctx.stroke()});for(let ev of ['pointerup','pointercancel'])canvas.addEventListener(ev,()=>drawing=false);
$('clear').onclick=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);drawn=false};
window.addEventListener('resize',()=>{if(!drawing&&!$('sign').hidden)sizePad()});
async function display(){status('Checking your account and agreement assignment…');const {data:{session}}=await db.auth.getSession();user=session?.user||null;if(!user){show('signin');status('Please sign in to review your agreement.');return;}
if(!/^[A-Za-z0-9_-]{7,50}$/.test(code)){show('missing');status('Missing or invalid agreement link.',true);return;}
const {data,error}=await db.from('sh_individual_agreement_actions').select('code,document_key,assigned_email,user_id,status,signed_pdf_path,signed_at,associate_name,effective_date,work_location,signature_name,signature_date').eq('code',code).maybeSingle();
if(error){show('missing');status('Could not check agreement: '+error.message,true);return;}
if(!data||!KINDS[data.document_key]){show('missing');status('No agreement is assigned to this account for this link.',true);return;}
assignment=data;$('title').textContent=KINDS[data.document_key][0];$('kind').textContent=KINDS[data.document_key][0];$('recipient').textContent=user.email||'';$('intro').textContent='Review, acknowledge, and electronically sign your individually assigned agreement.';
const isManager=managerKind(data.document_key);$('steps').innerHTML=isManager?'<b>1</b> Review the PDF <span>→</span><b>2</b> Confirm understanding <span>→</span><b>3</b> Acknowledge':'<b>1</b> Review the PDF <span>→</span><b>2</b> Accept terms <span>→</span><b>3</b> Sign';$('agreeText').textContent=isManager?'I acknowledge receiving, reading, and understanding the Sales Manager Track document. This acknowledgment does not constitute a new signed agreement.':'I accept the agreement terms and consent to sign electronically.';$('signatureFields').hidden=isManager;$('submit').textContent=isManager?'Submit Acknowledgment':'Accept & Sign Agreement';$('actionTip').textContent=isManager?'Your acknowledgment PDF includes the assigned associate, effective date, work location, your name, and acknowledgment date. No drawn signature is required.':'Submission time is recorded by the database. Signing cannot be undone or edited after submission.';$('intro').textContent=isManager?'Review your assigned Sales Manager Track document and acknowledge receipt and understanding. No agreement signature is required.':'Review, acknowledge, and electronically sign your individually assigned agreement.';(document.getElementById('assignmentDetails')||(()=>{const p=document.createElement('p');p.id='assignmentDetails';p.className='tip';$('openpdf').before(p);return p})()).textContent='Associate: '+(data.associate_name||'Not provided')+' · Effective date: '+(data.effective_date||'Not provided')+' · Work location: '+(data.work_location||'Not provided');$('openpdf').href=pdfURL(data.document_key);$('pdf').src=pdfURL(data.document_key)+'#toolbar=1';$('pdfhint').hidden=true;
if(data.status==='signed'||data.status==='acknowledged'){show('complete');showCompleted(data);status((isManager?'Acknowledged':'Signed')+' on '+new Date(data.signed_at).toLocaleString());return;}
show('sign');status('Please read the document and complete each required field.');requestAnimationFrame(sizePad);
}
$('signin').onsubmit=async e=>{e.preventDefault();const btn=e.target.querySelector('button');btn.disabled=true;status('Signing in…');try{const {error}=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error)throw error;$('password').value='';await display();}catch(err){status(err.message,true)}finally{btn.disabled=false}};
$('switch').onclick=async()=>{await db.auth.signOut();user=null;show('signin');status('Sign in with the account this agreement was assigned to.');};
async function buildSignedPDF(raw,info){
 if(!window.PDFLib)throw Error('PDF signing library unavailable.');
 const doc=await PDFLib.PDFDocument.load(raw);
 const pages=doc.getPages(),first=pages[0],last=pages[pages.length-1];
 const font=await doc.embedFont(PDFLib.StandardFonts.Helvetica),bold=await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);
 const ink=PDFLib.rgb(.07,.16,.29),white=PDFLib.rgb(1,1,1),accent=PDFLib.rgb(.08,.35,.57);
 const isManager=managerKind(assignment.document_key),trial=assignment.document_key.startsWith('trial-');
 const A=assignment;const associate=A.associate_name||info.name;
 const fit=(value,maxWidth,size=9)=>{let t=String(value||'');while(t.length>1&&font.widthOfTextAtSize(t,size)>maxWidth)t=t.slice(0,-2)+'…';return t;};
 // These are overlay coordinates matched to the actual supplied agreement PDFs.
 // y PDF coordinates are measured upward from the bottom edge.
 function field(page,x,top,w,label,value,size=9){const y=page.getHeight()-top;
  page.drawRectangle({x,y:y-13,width:w,height:16,color:white});
  page.drawText(fit(value,w-4,size),{x:x+2,y:y-9,size,font,color:ink});
 }
 if(isManager){
  field(first,174,115,178,'Associate',associate,9);
  field(first,110,131,85,'Effective date',A.effective_date,8.8);
  field(first,249,131,175,'Work location',A.work_location,8.5);
 }else{
  field(first,238,115,250,'Associate',associate,9);
  if(trial){
   field(first,111,140,85,'Trial start',A.effective_date,8.8);
   // Trial end is deliberately calculated as 14 days from the start date.
   const endDate=new Date(A.effective_date+'T12:00:00Z');endDate.setUTCDate(endDate.getUTCDate()+13);
   field(first,263,140,86,'Trial end',endDate.toISOString().slice(0,10),8.8);
   field(first,463,140,116,'Work location',A.work_location,8);
  }else{
   field(first,112,140,103,'Start date',A.effective_date,8.8);
   field(first,398,140,180,'Work location',A.work_location,8.5);
  }
 }
 const signTop=isManager?659:trial?504:assignment.document_key==='commission'?487:462;
 const dateX=isManager?320:trial?362:335;
 if(!isManager){
  const imgBytes=Uint8Array.from(atob(info.signature.split(',')[1]),c=>c.charCodeAt(0));
  const image=await doc.embedPng(imgBytes);
  const iw=image.width,ih=image.height,scale=Math.min(140/iw,25/ih);
  const y=last.getHeight()-signTop-12;
  last.drawRectangle({x:153,y:y-4,width:148,height:30,color:white});
  last.drawImage(image,{x:154,y:y-1,width:iw*scale,height:ih*scale});
 }else{
  // Manager track is acknowledgment only; no drawn signature or contractual execution.
  field(last,153,signTop,148,'Acknowledgment',info.name,8.5);
 }
 field(last,dateX,signTop,96,'Date',info.date,9);
 // The complete audit certificate makes every saved value available even when
 // the underlying PDF's short underline is too narrow for the full details.
 const page=doc.addPage([595.28,841.89]);
 const line=(label,value,y)=>{page.drawText(label,{x:47,y,size:10,font:bold,color:ink});
 page.drawText(fit(value,430,10),{x:47,y:y-19,size:10,font,color:ink});};
 page.drawText('STEADY HANDS LLC',{x:47,y:789,size:17,font:bold,color:accent});
 page.drawText(isManager?'ACKNOWLEDGMENT RECORD':'ELECTRONIC SIGNATURE CERTIFICATE',{x:47,y:752,size:15,font:bold,color:ink});
 page.drawLine({start:{x:47,y:739},end:{x:548,y:739},thickness:1,color:ink});
 line('Document',KINDS[assignment.document_key][0],713);
 line('Associate (assigned by Admin)',associate,665);
 line('Effective date / trial start',A.effective_date,617);
 line('Work location',A.work_location,569);
 line('Full legal name entered by associate',info.name,521);
 line('Date entered by associate',info.date,473);
 line('Account email',user.email||'',425);
 line('Action passcode',code,377);
 line('Submitted at (UTC)',info.stamp,329);
 if(!isManager){
  page.drawText('Drawn signature',{x:47,y:273,size:10,font:bold,color:ink});
  const imgBytes=Uint8Array.from(atob(info.signature.split(',')[1]),c=>c.charCodeAt(0));
  const image=await doc.embedPng(imgBytes),scale=Math.min(280/image.width,88/image.height);
  page.drawImage(image,{x:50,y:163,width:image.width*scale,height:image.height*scale});
 }else page.drawText('Acknowledged only — no drawn signature required.',{x:47,y:260,size:11,font,color:ink});
 page.drawText('The original agreement pages precede this audit record.',{x:47,y:80,size:9,font,color:ink});
 return await doc.save();
}
async function pdfLib(){if(window.PDFLib)return;await new Promise((ok,fail)=>{const el=document.createElement('script');el.src='https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';el.onload=ok;el.onerror=()=>fail(Error('Unable to load PDF signing library'));document.head.appendChild(el)});}
function showCompleted(data){const ack=managerKind(data.document_key);$('completeTitle').textContent=ack?'Acknowledgment recorded':'Agreement signed';$('completeInfo').textContent=ack?'Your Sales Manager Track acknowledgment was saved with your full name, date, and official submission time. The track document remains available for review.':'Your agreement has been submitted and recorded. You can download the signed copy here.';$('download').textContent=ack?'Download completed acknowledgment PDF':'Download signed PDF';$('completeTip').textContent=ack?'This is an acknowledgment, not a signed management contract. Download your completed PDF for your records.':'If you need a correction, contact your administrator. Your saved signature cannot be edited from this page.';}
$('sign').onsubmit=async e=>{
 e.preventDefault();if(!assignment)return;
 const isManager=managerKind(assignment.document_key);
 if(!isManager&&!drawn){status('Please draw your signature.',true);return;}
 if(!$('read').checked||!$('agree').checked){status('Read and accept the terms first.',true);return;}
 const name=$('fullName').value.trim(),date=$('date').value;
 if(name.length<3||!date){status('Enter your full legal name and signing date.',true);return;}
 const button=$('submit');button.disabled=true;
 try{
  status('Preparing your completed PDF…');await pdfLib();
  const response=await fetch(pdfURL(assignment.document_key));
  if(!response.ok)throw Error('The original agreement PDF could not be loaded.');
  const signature=isManager?null:canvas.toDataURL('image/png');
  const stamp=new Date().toISOString();
  const bytes=await buildSignedPDF(await response.arrayBuffer(),{name,date,signature,stamp});
  const path=user.id+'/'+code+'.pdf';
  status('Saving completed PDF privately…');
  const uploaded=await db.storage.from('sh-signed-agreements').upload(path,new Blob([bytes],{type:'application/pdf'}),{contentType:'application/pdf',upsert:false});
  if(uploaded.error&&!/already exists|duplicate/i.test(uploaded.error.message||''))throw uploaded.error;
  const patch={status:isManager?'acknowledged':'signed',signed_at:stamp,signature_name:name,signature_date:date,
   signature_png:signature,signed_pdf_path:path,terms_accepted:true};
  const {data,error}=await db.from('sh_individual_agreement_actions').update(patch)
   .eq('code',code).eq('user_id',user.id).eq('status','pending').select('signed_at').single();
  if(error)throw error;
  Object.assign(assignment,patch,{signed_at:data.signed_at});
  show('complete');showCompleted(assignment);
  status((isManager?'Acknowledgment':'Agreement')+' saved on '+new Date(data.signed_at).toLocaleString()+'.');
 }catch(error){status('Not completed: '+error.message+'. Please retry.',true)}finally{button.disabled=false;}
};
$('download').onclick=async()=>{if(!assignment?.signed_pdf_path){status('Signed document not available.',true);return;}const {data,error}=await db.storage.from('sh-signed-agreements').download(assignment.signed_pdf_path);if(error){status(error.message,true);return;}const link=document.createElement('a'),url=URL.createObjectURL(data);link.href=url;link.download='SteadyHands-Signed-'+code+'.pdf';link.click();setTimeout(()=>URL.revokeObjectURL(url),15000)};
display().catch(e=>{status('Unable to open action: '+e.message,true);show('missing')});