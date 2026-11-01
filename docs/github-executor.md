# GitHub tools

Chat and the YapCode panel call the existing `yap-dev-read` Edge Function. The server validates the caller with Supabase Auth, selects only that user's encrypted OAuth record, decrypts it server-side, refreshes expired grants when possible, and sends requests only to fixed GitHub API paths. No GitHub credentials are returned to the browser. The browser discards results after account or session changes and in Incognito.

Supported examples:
- `List my GitHub repositories`
- `GitHub repository owner/repo`
- `GitHub issues owner/repo`
- `GitHub pull requests owner/repo`
- `GitHub file owner/repo src/app.js`
- `GitHub README owner/repo`

These are read-only tools and consume no Work credits. They use the existing Supabase project and GitHub API; no paid infrastructure was added. Existing provider quotas still apply. Unsupported writes, clones and deployment requests report an error rather than running an unrelated search. The separate reviewed computer workflow remains available through its controls.

Connections must be completed in `/plugins/` for each YapThing user. GitHub CLI login on a computer does not create an OAuth connection for that website user. Missing grants, revoked permissions, expired authorization and provider failures are displayed directly. No client-supplied user ID selects credentials.

Verification on Windows using Node 24 and the bundled Playwright runtime:
- `node tests/github-executor.cjs`
- `node tests/github-account-isolation.cjs`
- `node tests/github-routing-browser.cjs`
- Existing developer-plugin, knowledge-router and YapCode browser regressions.

Tests mock authenticated GitHub results; an actual user's private-repository round trip additionally requires that user's completed OAuth connection. Never substitute the desktop owner's GitHub CLI token for a web user's OAuth grant.
