# YapThing cross-platform accounts, model and subscriptions

Status: architecture contract; **not an activated billing integration**.

## Identity and entitlements
Use a single Supabase Auth project for Web, Android and iOS. Account identity is the Supabase JWT subject `auth.uid()`. Clients must never assign paid status locally. All paid-feature APIs verify JWT and a server-maintained entitlement row. Payment success pages are informational only; unlock after provider-signed webhook validation and subscription state reconciliation.

Entitlement fields: `user_id`, `tier` (free/plus/pro), `status` (active/trialing/past_due/canceled/expired), `source` (web/apple/google), `provider_customer_id`, `provider_subscription_id`, `period_end`, `updated_at`. Unique provider subscription IDs, idempotent webhook event IDs, row-level security, and server-only writes are mandatory. Keep provider secrets off all clients. Cross-platform sign-in must use the same auth project and verified account.

## Model policy
Expose a shared model policy manifest with explicit `model_family`, `model_id`, `revision`, `quantization`, `minimum_memory`, and `capabilities`. The same model weights and revision should be used where technically possible. Browser WebGPU, Android inference runtimes and iOS Metal differ, so **do not promise identical outputs** or silently swap models. Show the active model and any fallback. Local inference remains free; premium tiers may add cloud features and quotas after deployment.

## Billing rules
Web checkout uses a PCI-compliant hosted payment provider; never collect card details in YapThing pages. Apple and Google in-app purchase flows require their own compliant integration and store policies. Cross-platform access to eligible existing subscriptions is supported after server verification; whether mobile apps can direct users to web checkout depends on the store, region, and applicable entitlements. Never place unrestricted external payment links inside mobile apps. Require explicit user confirmation and a verified provider webhook before upgrade.

## Implementation checklist
1. Configure one Supabase Auth project and consistent JWT validation across three apps.
2. Add private subscription/event tables with RLS, idempotency and webhook verification.
3. Implement hosted checkout, customer portal, webhook handler and server entitlement API.
4. Integrate mobile store purchases and receipt verification, including restore purchases.
5. Publish shared model manifest, pin compatible runtimes, test WebGPU/Android/iOS fallback.
6. Test payment success, failure, refunds, renewal, cancellation, duplicate webhooks and sign-in across all platforms.
7. Complete payment provider onboarding, pricing approvals, tax and privacy disclosures before enabling checkout.

Existing Free/Plus/Pro prices ($0/$4.99/$9.99 per month) are proposals, **not live purchasable products**.
