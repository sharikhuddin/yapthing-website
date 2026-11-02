# YapCode Work usage, pause/resume and top-up policy

Status: approved **development policy**, not yet activated commercial billing or live autonomous execution.

## Customer-facing promises
- The Free, Plus and Pro subscription may include bounded local or assisted Work tasks. The draft allowance is 3, 40 and 120 Work credits respectively per renewal period, **subject to product approval and server deployment**.
- No subscription includes autonomous cloud coding. Cloud execution requires separately purchased and confirmed credits.
- Every billable task shows its maximum credit charge and relevant limits **before** approval. The user must affirmatively approve execution.
- A progress meter shows **server-confirmed** consumed/remaining credits and the next renewal countdown. The timer does not subtract tokens or run a task.
- When available credits are exhausted, new billable tasks pause. Existing tasks must respect their previously reserved budgets; exhaustion must not silently cause unlimited billable retries.
- At renewal or after a verified purchase, the user can refresh their balance and explicitly request to resume with a **new quote**. Do not silently replay writes, payments, migrations or GitHub changes.
- Purchased credits and recurring allowance are separate ledgers. Purchased balance must not vanish on a monthly subscription reset; any expiration or refund terms must be disclosed before purchase.
- Failed execution: release any unspent reservation; refunds for partially incurred third-party costs follow a clearly disclosed policy. A failed or timed-out task must not charge above its approved maximum.
- Search usage is counted across devices via the same Supabase user ID. Search calls inside Work jobs appear in analytics but are billed **only once** under the task's approved budget.

## Enforcement required before release
1. Verify JWT, active subscription, provider-signed successful checkout event and purchased-credit balance server-side. Never trust client plan or wallet claims.
2. Atomic reservation with idempotency key and unique task ID; reject double-approvals, concurrent spending, quota exhaustion and duplicate webhooks.
3. Compute maximum quoted model tokens, API calls and bounded execution duration. Stop when the reservation is depleted. Reconcile actual usage; return unused credits.
4. Concurrency caps, user-level and global daily cost ceilings, abuse protections, a deployment kill switch and monitoring. Cloud budget alerts are not hard limits.
5. Persist ledger and state transitions: quoted -> reserved -> running -> completed/paused/failed/cancelled, with immutable billing events and customer-visible receipts.
6. Verify Apple/Google billing policies and platform-specific checkout eligibility. Never route native purchases to a disallowed external checkout.
7. Test cross-device identity, payment fulfillment, renewal, refunds, failures, replay safety, migration RLS and GitHub reviewer approval. Deploy to staging before production.

## Accuracy and launch gate
The current countdown UI reads a server balance; top-up link is informational until a confirmed payment flow exists. No automatic cloud coding dispatch or purchased-credit spending is production-ready. A static browser quote is informational only; it cannot authorize spending.

**Launch gate: No customer-facing autonomous coding until live security, payment, task execution and settlement tests all pass.**

Draft pricing currently discussed: Plus $7.99/month and Pro $12.99/month; prices and add-on packages must be confirmed in the actual payment catalog before public promises.
