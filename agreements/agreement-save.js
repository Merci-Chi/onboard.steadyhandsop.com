export const normalizedName = value => String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
export function validateSigner(assignment,user,name){
 if(assignment.user_id !== user.id) throw Error('This agreement belongs to a different account. Contact your administrator.');
 if(!assignment.associate_name?.trim()) throw Error('The assigned associate name is missing. Contact your administrator before signing.');
 if(normalizedName(name)!==normalizedName(assignment.associate_name)) throw Error('Your entered name does not match the assigned associate: '+assignment.associate_name+'. Ask your administrator to correct the assignment before signing.');
}
export function attemptId(){
 if(typeof crypto.randomUUID==='function')return crypto.randomUUID();
 return Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join('');
}
const fail=(stage,error)=>{const e=new Error(stage+': '+(error?.message||'The service did not return a valid response.'));e.cause=error;return e;};
export async function saveAgreement({db,assignment,user,name,date,signature,makePDF,attempt,randomId=attemptId}){
 validateSigner(assignment,user,name);
 const query=()=>db.from('sh_individual_agreement_actions').select('code,user_id,document_key,status,signed_pdf_path,signed_at,associate_name,effective_date,work_location').eq('code',assignment.code).eq('user_id',user.id).maybeSingle();
 const latest=await query();
 if(latest.error)throw fail('Checking current assignment',latest.error);
 if(!latest.data)throw Error('This agreement is no longer assigned to your account. Contact your administrator.');
 const row=latest.data;
 if(['signed','acknowledged'].includes(row.status)){
  if(!row.signed_pdf_path)throw Error('A completed record is missing its saved PDF. Contact your administrator.');
  return row;
 }
 if(row.status!=='pending')throw Error('This agreement is '+row.status+', not pending. Contact your administrator.');
 validateSigner(row,user,name);
 for(const key of ['document_key','effective_date','work_location','associate_name'])if(row[key]!==assignment[key])throw Error('The agreement changed while this page was open. Reload and review it before signing.');
 const key=JSON.stringify([name,date,signature,assignment.document_key,assignment.effective_date,assignment.work_location]);
 if(attempt.key!==key){
  attempt.key=null;attempt.uploaded=false;attempt.path=null;attempt.bytes=null;
  attempt.stamp=new Date().toISOString();
  try{attempt.bytes=await makePDF(attempt.stamp);}catch(error){throw fail('Generating agreement PDF',error);}
  // Each attempt is immutable. A failed database save cannot block a later attempt
  // with a duplicate filename or overwrite a previously signed agreement.
  attempt.path=user.id+'/'+assignment.code+'-'+randomId()+'.pdf';
  attempt.key=key;
 }
 if(!attempt.bytes||!attempt.path)throw Error('The PDF could not be prepared. Please retry.');
 const bucket=db.storage.from('sh-signed-agreements');
 if(!attempt.uploaded){
  const upload=await bucket.upload(attempt.path,new Blob([attempt.bytes],{type:'application/pdf'}),{contentType:'application/pdf',upsert:false});
  if(upload.error){
   // A network error may happen after storage commits. Only accept a retry if
   // the stored bytes are exactly this attempt's bytes, never on name alone.
   const stored=await bucket.download(attempt.path);
   if(stored.error)throw fail('Saving agreement PDF',upload.error);
   const actual=new Uint8Array(await stored.data.arrayBuffer()),expected=new Uint8Array(attempt.bytes);
   if(actual.length!==expected.length||!actual.every((v,i)=>v===expected[i]))throw fail('Saving agreement PDF',upload.error);
  }
  attempt.uploaded=true;
 }
 const patch={status:assignment.document_key.startsWith('manager-')?'acknowledged':'signed',signed_at:attempt.stamp,signature_name:name,signature_date:date,signature_png:signature,signed_pdf_path:attempt.path,terms_accepted:true};
 const result=await db.from('sh_individual_agreement_actions').update(patch).eq('code',assignment.code).eq('user_id',user.id).eq('status','pending').select('signed_at').maybeSingle();
 if(result.error||!result.data){
  const check=await query();
  if(!check.error&&['signed','acknowledged'].includes(check.data?.status)&&check.data.signed_pdf_path)return check.data;
  throw fail('Recording agreement completion (PDF saved; retry safely)',result.error);
 }
 return {...row,...patch,signed_at:result.data.signed_at};
}
