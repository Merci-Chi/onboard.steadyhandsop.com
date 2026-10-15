import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {SUPABASE_URL,SUPABASE_KEY} from './config.js';
import {guardedFetch,recoverSession} from './session-health.js';
export const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true},global:{fetch:guardedFetch(SUPABASE_URL,SUPABASE_KEY)}});
export const ensureHealthySession=()=>recoverSession(supabase.auth);
// Refresh old large tokens once before pages send database or storage requests.
// A failed recovery stays visible through normal page errors, never an import crash.
export const sessionHealth=await ensureHealthySession().catch(error=>({data:{session:null},error}));
