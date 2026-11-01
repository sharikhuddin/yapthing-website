# Supabase tools

Chat and YapCode use the existing per-user OAuth gateway (`yap-dev-read`) for Supabase metadata reads. The server validates the YapThing session and selects encrypted credentials by the authenticated user and provider. Desktop credentials are never substituted for a website user's OAuth connection. Responses expose only a small allowlist of project and Edge Function metadata.

Examples:
- `List my Supabase projects`
- `/supabase projects`
- `Supabase functions abcdefghijklmnopqrst`
- `/plugin supabase functions abcdefghijklmnopqrst`

Use the project reference from the project list for function requests. The YapCode panel offers the same reads without a selected computer, model or Work credits. No SQL execution, schema modifications, secret access or deployment is exposed through this read-only connection. Unsupported operations and errors remain in the Supabase route and never fall back to academic or web research. The browser discards private results after account/session changes or entering Incognito.

Connect Supabase through `/plugins/` using each user's own OAuth authorization. No paid services or new infrastructure are required; existing provider quotas still apply.

Tests: `tests/supabase-executor.cjs`, `tests/supabase-account-isolation.cjs`, `tests/supabase-routing-browser.cjs`, plus the existing GitHub, developer-plugin, knowledge-router and YapCode regressions. Authenticated responses are mocked; an actual private-project round trip requires a completed user OAuth connection.
