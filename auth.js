import {supabase,ensureHealthySession} from '/supabase-client.js?v=20261015-reliability';
import {ONBOARDING_URL} from './config.js';
const $=s=>document.querySelector(s);
const msg=(m,error=false)=>{const el=$('#message');el.textContent=m;el.className=error?'error':'success'};
const email=$('#email');
const remembered=localStorage.getItem('steadyhands.savedEmail');
if(remembered){email.value=remembered;$('#remember').checked=true}
function saveEmail(){if($('#remember').checked)localStorage.setItem('steadyhands.savedEmail',email.value.trim());else localStorage.removeItem('steadyhands.savedEmail')}
$('#show-password').onclick=()=>{const p=$('#password');p.type=p.type==='password'?'text':'password';$('#show-password').textContent=p.type==='password'?'Show':'Hide'};
$('#remember').onchange=saveEmail;
$('#agree-terms').onchange=()=>{if($('#agree-terms').checked){$('#terms-error').hidden=true;$('#terms-label').classList.remove('invalid')}};
email.oninput=()=>{if($('#remember').checked)saveEmail()};
function busy(b){['submit','forgot'].forEach(id=>$('#'+id).disabled=b)}
$('#auth-form').onsubmit=async e=>{e.preventDefault();if(!$('#agree-terms').checked){$('#terms-error').hidden=false;$('#terms-label').classList.add('invalid');$('#agree-terms').focus();return;}saveEmail();busy(true);try{const {data,error}=await supabase.auth.signInWithPassword({email:email.value.trim(),password:$('#password').value});if(error)throw error;if(!data.session)throw new Error('Unable to sign in. Please check your credentials.');const health=await ensureHealthySession();if(health.error)throw health.error;location.replace('index.html')}catch(e){msg(e.message,true)}finally{busy(false)}};
$('#forgot').onclick=async()=>{if(!email.checkValidity()){email.reportValidity();return}saveEmail();busy(true);const {error}=await supabase.auth.resetPasswordForEmail(email.value.trim(),{redirectTo:ONBOARDING_URL+'/reset-password.html'});msg(error?error.message:'If your account exists, check your inbox for reset instructions.',!!error);busy(false)};
(async()=>{if(new URLSearchParams(location.search).get('reset')==='success')msg('Password updated. Please sign in.');const {data,error}=await ensureHealthySession();if(error){msg(error.message,true);return;}if(data?.session)location.replace('index.html')})();

