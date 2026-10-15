// Tokens are credentials: measure their length, never log or persist their contents.
export const MAX_ACCESS_TOKEN_BYTES = 6000;
export const TOKEN_HELP = 'Your login token is too large. An administrator must enable the compact-token fix in Supabase. Then sign in again. Your saved information has not been deleted.';
export const isOversizedSession = session => typeof session?.access_token === 'string' && session.access_token.length > MAX_ACCESS_TOKEN_BYTES;
export async function recoverSession(auth) {
 const current = await auth.getSession();
 if (current.error) return current;
 if (!isOversizedSession(current.data?.session)) return current;
 // Refresh uses the refresh token in the body, not the oversized access token.
 const refreshed = await auth.refreshSession();
 if (refreshed.error) return refreshed;
 if (isOversizedSession(refreshed.data?.session)) return {data:refreshed.data,error:new Error(TOKEN_HELP)};
 return refreshed;
}
export function guardedFetch(url, key, nativeFetch = globalThis.fetch.bind(globalThis)) {
 const origin = new URL(url).origin;
 return async (input, init = {}) => {
  const target = new URL(input instanceof Request ? input.url : String(input));
  if(target.origin !== origin) return nativeFetch(input,init);
  const headers = new Headers(input instanceof Request ? input.headers : undefined);
  new Headers(init.headers).forEach((v,k)=>headers.set(k,v));
  const bearer = headers.get('authorization') || '';
  if(target.pathname === '/auth/v1/token') {
   // Password/recovery/refresh exchange authenticates with the project's public key.
   // The user's refresh token or password remains in its original request body.
   if(bearer.length > MAX_ACCESS_TOKEN_BYTES) headers.set('authorization','Bearer '+key);
  } else if(bearer.length > MAX_ACCESS_TOKEN_BYTES + 7) {
   return new Response(JSON.stringify({message:TOKEN_HELP,error:TOKEN_HELP,code:'oversized_access_token'}),{status:431,headers:{'content-type':'application/json'}});
  }
  return nativeFetch(input,{...init,headers});
 };
}
