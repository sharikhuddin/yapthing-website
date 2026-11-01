# YapCode Cloud Run Jobs — safe verification MVP

This is an **internal-only verification job**, not yet a commercial autonomous customer-code executor.

The container runs fixed syntax and unit checks against a bundled trusted source snapshot. It does **not** clone arbitrary customer repositories, execute submitted commands, invoke Gemini, or read Supabase service-role credentials.

## Build and deploy (after billing / IAM review)
1. Build the image using Google Cloud Build or another approved builder.
2. Push to a private Artifact Registry repository in project `yapthing`.
3. Create a Cloud Run Job in `us-central1`, with max retries **0**, task count **1**, timeout **120 seconds**, memory **512 MiB** and CPU **1**.
4. Use a minimal dedicated service account with no secret or database permissions for this verification job.
5. Run one test execution and inspect logs and actual Cloud Billing usage.
6. Only add a privileged **orchestrator** later, separate from customer execution. Orchestrator must verify Supabase user ownership, quotas, task approval, and execution limits; it must never put production tokens inside customer containers.

## Cost restrictions
Do not enable a scheduler, public endpoint, auto-trigger, Artifact Registry storage upgrades, or high concurrency by default. Enable Cloud Billing budgets and alerting. Cloud Billing budgets are **alerts, not spending caps**. Use application-enforced quotas, job timeouts, and project billing review.

## Next milestones
Supabase task RLS migration; authenticated task dispatch endpoint; signed job-token / task report protocol; project-level spend and concurrency policies; per-customer ephemeral isolation; admin metrics. Cloud Run Jobs alone are not equivalent to a secure untrusted-code sandbox.
