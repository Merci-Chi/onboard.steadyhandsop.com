import {supabase} from './supabase-client.js';
const $=selector=>document.querySelector(selector);
const lessons=[
 {title:'Introduction + Training Disclaimer',description:'Welcome to Steady Hands and important information about the fictional examples shown.',video:'App-Tutorial Videos/00-Introduction-and-Disclaimer.mp4',icon:'▶'},
 {title:'Getting Started with Outreach',description:'Navigate the app, select leads, and understand the Outreach page.',video:'App-Tutorial Videos/01-Getting-Started-with-Outreach.mp4',icon:'⌕'},
 {title:'Making Calls',description:'Call screens, scripts, notes, templates, and live transcripts.',video:'App-Tutorial Videos/02-Making-Calls.mp4',icon:'☎'},
 {title:'Follow-Ups & Scheduling',description:'Schedule callbacks, reminders, and calendar events.',video:'App-Tutorial Videos/03-Follow-Ups-and-Scheduling.mp4',icon:'▦'}
];
let completed=new Set(),activeIndex=0,user;
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(){
 const done=completed.size;
 $('#training-status').textContent=`${done} of ${lessons.length} lessons completed`;
 $('#training-percent').textContent=Math.round(done/lessons.length*100)+'%';
 $('#training-fill').style.width=done/lessons.length*100+'%';
 $('#training-grid').innerHTML=lessons.map((lesson,i)=>`<button class="training-lesson" type="button" data-lesson="${i}"><div class="lesson-art"><span class="lesson-icon">${escapeHtml(lesson.icon)}</span><span class="lesson-play">▶</span><span class="lesson-number">${String(i).padStart(2,'0')}</span></div><div class="lesson-meta"><strong>${escapeHtml(lesson.title)}</strong><p>${escapeHtml(lesson.description)}</p><span class="lesson-done ${completed.has(i)?'finished':''}">${completed.has(i)?'✓ Completed':'Watch video →'}</span></div></button>`).join('');
 $('#training-grid').querySelectorAll('[data-lesson]').forEach(b=>b.addEventListener('click',()=>openLesson(Number(b.dataset.lesson))));
}
async function openLesson(i){
 activeIndex=i;
 const player=$('#training-player');player.pause();player.removeAttribute('src');player.load();
 const lesson=lessons[i];$('#video-number').textContent=`LESSON ${String(i).padStart(2,'0')} OF ${String(lessons.length).padStart(2,'0')}`;
 $('#video-title').textContent=lesson.title;$('#video-description').textContent=lesson.description;
 $('#video-previous').disabled=i===0;$('#video-next').disabled=i===lessons.length-1;
 $('#video-complete').textContent=completed.has(i)?'✓ Completed':'Mark as completed ✓';
 $('#missing-video').hidden=true;player.hidden=false;
 player.src=encodeURI(lesson.video);player.load();
 player.onerror=()=>{if(activeIndex!==i)return;player.pause();player.hidden=true;$('#missing-video').hidden=false};
 if(!$('#video-dialog').open)$('#video-dialog').showModal();
}
function closeLesson(){const player=$('#training-player');player.pause();player.removeAttribute('src');player.load();$('#video-dialog').close()}
async function saveProgress(){
 const values=[...completed].sort((a,b)=>a-b);
 const {error}=await supabase.auth.updateUser({data:{steadyhands_training:{completedLessons:values,updatedAt:new Date().toISOString()}}});
 if(error)console.error('Could not save training progress:',error);
}
$('#video-close').onclick=closeLesson;
$('#video-dialog').addEventListener('cancel',()=>$('#training-player').pause());
$('#video-dialog').addEventListener('close',()=>{$('#training-player').pause()});
$('#video-previous').onclick=()=>openLesson(activeIndex-1);
$('#video-next').onclick=()=>openLesson(activeIndex+1);
$('#video-complete').onclick=async()=>{
 completed.add(activeIndex);render();$('#video-complete').textContent='✓ Completed';
 await saveProgress();if(completed.size===lessons.length){closeLesson();$('#training-finished').showModal()}
};
$('#training-done-close').onclick=()=>$('#training-finished').close();
$('#logout').onclick=async()=>{await supabase.auth.signOut();location.replace('login.html')};
(async()=>{
 try{
  const {data:{user:current},error}=await supabase.auth.getUser();
  if(error||!current){location.replace('login.html');return}
  user=current;$('#account-email').textContent=user.email||'';
  if(!user.user_metadata?.steadyhands_onboarding?.complete){location.replace('index.html');return}
  const saved=user.user_metadata?.steadyhands_training?.completedLessons;
  if(Array.isArray(saved))completed=new Set(saved.filter(x=>Number.isInteger(x)&&x>=0&&x<lessons.length));
  render();$('#training-loading').hidden=true;$('#training-app').hidden=false;
 }catch(e){console.error(e);$('#training-loading').textContent='Unable to load your account. Please refresh and try again.'}
})();
