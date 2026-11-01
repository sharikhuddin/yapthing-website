# YapCoding bounded executor: verified release state

## Live
- Supabase project `uemjkfvcadggyvhbqqyp` is ACTIVE_HEALTHY; PostgreSQL 17.11. Organization plan verified as Free. No plan upgrade or paid project was created.
- `yapcode-execute` is deployed with JWT verification plus server-side Auth user validation. Execution remains **STOPPED**. The private control row has `stopped=true` and `enabled_until=-infinity`.
- Four applied, version-matched migrations add owner-only result storage, atomic admission, conservative budget reservations, idempotency, expiry, failure quarantine, and storage limits.
- `yap-stripe-checkout` version 31 has an explicit hard-off guard. Live authenticated checkout tests returned HTTP 503 `PAYMENTS_DISABLED`. No payments, subscriptions, credit purchases, or storage purchases were initiated.
- Existing Cloud Run job `yapcode-internal-verify` in `us-central1` verified in Cloud Console: image `us-central1-docker.pkg.dev/yapthing/yapcode-internal/verifier:internal-v1`; 1 CPU, 512 MiB, 120s timeout, task count 1, parallelism 1, retries 0; one successful execution `yapcode-internal-verify-jvncm`.
- Created and verified a **$3/month enforced Cloud Run cap** scoped to project YapThing and service Cloud Run. Console status: **Configured**; reported estimated usage approximately $0.00. The existing $5 billing-account alert remains. Cloud enforcement is delayed and overages remain billable; it resets monthly. This does not cap other Google services, other projects, or Supabase.
- The Cloud Run job uses the default Compute service account. Its effective privileges have not been certified as least privilege. Scheduler inventory is blocked by missing `cloudscheduler.jobs.list` permission. Neither a scheduler nor an additional paid execution was started in this session.

## Implemented behavior
The executor authenticates a non-anonymous, email-confirmed user, selects only that user's encrypted GitHub grant, checks repository write access, and reads up to three explicitly selected existing source files from an immutable commit. It makes one bounded Gemini call, validates the returned paths and sizes, persists the draft and provenance, creates a new task-specific branch and draft PR, and saves its URL and token usage.

It never executes repository code, repository tests, model-proposed commands, dependency installers, or deployment commands. Draft PRs explicitly state that project tests were not run. It never merges PRs. This is autonomous **bounded PR drafting**, not a general shell-based autonomous engineering agent. Generated code correctness requires review and trusted CI.

The old polling worker is retired in source because its direct claims bypassed global admission controls. The browser controls are available to ordinary signed-in accounts; there is no administrator-only entitlement bypass. Provider credentials are never returned to the browser. Account changes and Incognito discard results. Request keys are reused after an interrupted request; ambiguous external writes are never automatically retried.

## Enforced executor limits
| Limit | Value |
|---|---:|
| Per-user admitted tasks | 3 per rolling 24 hours |
| Global concurrency | 1 |
| Waiting queue | 0; reject while busy |
| Request deadline | 90 seconds |
| Model request timeout | 35 seconds |
| Other upstream request timeout | 10 seconds |
| Automatic retries / model fallbacks | 0 / 0 |
| Failed-task concurrency quarantine | 150 seconds from admission |
| Selected files / combined source size | 3 / 16,000 UTF-8 bytes |
| Input token ceiling | 18,000; conservative byte bound before generation |
| Output token ceiling | 4,096 including thinking; thinking budget 0 |
| Generated file contents | 24,000 UTF-8 bytes total |
| Persisted result | 40,000 bytes per run |
| Stored results | 100 per user, 1,000 systemwide |
| Retained reservation audit rows | 10,000, then reject new work |
| Reservation | $0.05 per admitted attempt, never refunded automatically |
| Global admission budget | $1 per rolling 24h; $10 per UTC calendar month |
| Pricing-review expiry | December 1, 2026 UTC; fail closed afterward |

The global monthly admission budget permits at most 200 attempts, including failed attempts. Reservations survive account deletion. The SQL control flag and its expiry are checked before admission and every external operation. Control or result-storage failures stop subsequent operations. Already accepted upstream requests may finish after a stop or network timeout; task-specific branch names and persisted checkpoints support manual reconciliation. Request timeouts do not prove remote cancellation.

## Verification
- 22 new executor/gateway tests passed, including an entirely mocked authenticated user -> encrypted credential -> budget admission -> model -> GitHub draft PR -> result-storage round trip. Mocked providers are not a live provider test.
- 17 existing focused tests also passed (39 total after the new gateway cases): media routing, usage policy, Work balance reset, and legacy queue guard.
- New browser checks passed at 390px and 1280px: explicit consent, preserved request keys after interruptions, account clearing, Incognito rejection, and stopped-service messaging.
- Existing YapCode approval/edit/test/PR/logout browser regressions passed at both widths; YapDocs export browser regressions passed at both widths; admin cost dashboard checks passed.
- Live SQL tests verified ordinary-user RPC denial, RLS isolation, idempotent admission, conflicting request-key rejection, global concurrency rejection, three-per-user quota, result completion, expired permit rejection, failure quarantine, stop revocation, daily $1 budget and monthly $10 budget. Fixtures and temporary enabling were rolled back.
- Two temporary real Auth users tested the deployed HTTP boundary: owner-only result reads (200), privileged admission RPC denied (403), stopped POST denied (503), payments disabled (503), logout (204), unauthenticated request denied (401). One status GET encountered a transient 503; the service failed closed. Test sessions were revoked and both test users and their fixture results were removed.
- Security advisors report no new warning-level findings from these changes. Private tables intentionally have RLS and no client policies. Pre-existing storage-status SECURITY DEFINER and leaked-password-protection warnings remain outside this executor change.

## Cost evidence and profitability
Live billing overview showed **$0.02 month-to-date for the billing account**, with its AI charge attributed to the Default Gemini Project. This is not a YapCoding cost total and is subject to reporting lag. The new executor has zero admitted reservations and zero metered model runs. That proves no executor model workload was recorded; it does not prove the account's final invoice is zero.

Current documented Gemini 2.5 Flash-Lite text rates are $0.10 per million input tokens and $0.40 per million output tokens. At the configured maxima, one model call is estimated at:

`18,000 × $0.10 / 1,000,000 + 4,096 × $0.40 / 1,000,000 = $0.0034384`

At 200 admitted attempts/month, the maximum modeled token component is approximately **$0.69/month**, assuming the published rates and provider token contract. The $10 reservation allowance is conservative bookkeeping, not an invoice forecast. Edge invocations, storage, bandwidth, logs, GitHub usage, shared Google API usage, and future subscription costs must be assessed separately. There is no new Cloud Run execution in this drafting path.

For comparison, the existing 1 CPU / 0.5 GiB Cloud Run job has a gross compute estimate of $0.00114 for 60s or $0.00228 for 120s at us-central1 on-demand rates, before shared free allowances and other charges. This is a resource-bound estimate, not observed billing.

Profitability is **not established**: payments are disabled, so new revenue is zero. Do not sell unmetered or unlimited coding. Pricing must cover measured total marginal cost, payment fees, support, and fixed expenses; token-only estimates cannot demonstrate margin.

Sources checked:
- https://ai.google.dev/gemini-api/docs/pricing
- https://cloud.google.com/run/pricing
- Cloud Console live job YAML, execution history, billing overview, and configured spend-cap table.
- Supabase project, organization, schema/permission queries, and live HTTP tests.

## Blocked before enabling execution for all users
1. A valid website-user GitHub connection and verified contents/PR write permission. At the last check, the one stored GitHub access token remained expired. The user is reconnecting it. A desktop GitHub CLI login must not substitute for the website user's grant.
2. A real authenticated user -> Gemini -> GitHub draft PR -> saved result test on a disposable approved repository, including a live provider availability check. Do not claim mocked PR output is a real generated PR.
3. General arbitrary repository-code execution would require a separately validated isolated sandbox, a dedicated least-privilege runtime identity, and the full dispatch/report protocol. The current Cloud Run verification image only runs bundled trusted checks and is not such a sandbox.
4. Exact final billing attribution and a proven commercial margin remain unverified.

## Operations
Immediate stop (privileged database operation):

```sql
update yapcode_private.control
set stopped=true,enabled_until='-infinity',reason='Operator stop'
where singleton;
```

Read status with a valid YapThing session using GET `/functions/v1/yapcode-execute`. Owner results are in `public.yapcode_runs`; clients have SELECT only. Admission and checkpoints are service-role-only RPCs.

Do not enable the control row until the live provider test succeeds. For a supervised test window, use the shortest explicit expiry and restore STOPPED afterward. Never grant the browser access to the control schema, service key, or dispatch RPCs. Do not re-run ambiguous failed jobs with new keys before checking recorded branches and PRs.
