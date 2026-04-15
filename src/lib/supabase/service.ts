// Service role config — server only, bypasses RLS, used for logging inserts.
// Never expose SUPABASE_SERVICE_ROLE_KEY to the client.
export function getServiceRoleConfig() {
  return {
    url: process.env.SUPABASE_URL!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  };
}
