# YapCode commercial launch readiness and cost planning (2026-11-02)

## Evidence
- Project `yapthing`, region `us-central1`, job `yapcode-internal-verify`: one verified successful run in Cloud Shell screenshots (2026-11-02).
- This job only executes bundled syntax and unit tests. It is NOT a customer coding agent.
- Local focused tests: 10 passed on 2026-11-02; full integration suite, production database and external GitHub actions not yet verified.
- `20261101_yapcode_cloud_tasks.sql` and `20261102_yapcode_queue_guard.sql` have NOT been verified as applied to Supabase.
- Dispatcher, trusted GitHub branch/PR writer, metrics endpoint, and customer sandbox are NOT production-ready.

## Conservative illustrative Cloud Run estimate
Assume 1 vCPU, 0.5 GiB memory, 60 seconds per task, on-demand, no minimum instances, no retries. Using a conservative illustration at $0.000018/vCPU-second and $0.000002/GiB-second, a 60-second invocation has $0.00114 of gross CPU+RAM consumption ($0.00228 for 120 seconds), *before* the shared free tier. Rates and SKUs vary; verify against current Cloud Run Jobs pricing and actual Cloud Billing exports. This is not a forecast of total YapCode costs.

| Executions/month | 1-minute gross compute equivalent | 2-minute gross compute equivalent |
|---:|---:|---:|
| 100 | $0.11 | $0.23 |
| 1,000 | $1.14 | $2.28 |
| 10,000 | $11.40 | $22.80 |
| 100,000 | $114.00 | $228.00 |

Shared free tier: 240,000 vCPU-s and 450,000 GiB-s/month at the billing-account level, if applicable. A 1-minute CPU allocation consumes 60 vCPU-s; other services share the same allowance. External LLM tokens, repository/network egress, Supabase, storage, logs, and VM uptime can dominate actual spending.

## Required before enabling customer coding
1. Apply both migrations in a controlled Supabase rollout; test RLS using two actual distinct users and anonymous access; verify 3-per-24h and one-active-task limits under concurrent insert attempts.
2. Build an authenticated dispatcher that validates ownership, quotas, paid entitlements, approved repository, allowed action, and idempotency before triggering a job. No direct browser-issued Cloud Run execution credentials.
3. Separate orchestration and untrusted code runner; do not put service-role keys, model API keys, customer OAuth tokens, or production secrets in execution containers.
4. Implement trusted GitHub branch/PR creation with review/approval gate and source-provenance logging. Never auto-merge or deploy on behalf of a customer by default.
5. Connect admin telemetry with actual job counts, failed executions, latency, CPU/memory metrics (where available), and *actual* billing exports rather than invented cost totals.
6. Configure strict per-account caps, global concurrency and spend thresholds, Cloud Billing budget alerts, a kill switch, retention, and abuse rate limits. Budgets are notifications, not hard caps.
7. Run full production staging end-to-end tests: web -> user task -> RLS -> dispatcher -> Cloud Run -> validated result -> branch/PR -> admin audit; exercise failures and account switching.

## Release decision
**NO-GO for autonomous customer code execution.** Keep verification job operational, not scheduled. A successful verification command does not prove production customer security or reliability. Do not merge the feature branch into GitHub Pages until release gates pass.

Google pricing references: https://cloud.google.com/run/pricing , https://cloud.google.com/build/pricing , https://cloud.google.com/artifact-registry/pricing
