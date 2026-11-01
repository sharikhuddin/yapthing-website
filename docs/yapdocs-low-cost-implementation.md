# YapDocs + YapImage — cost-first implementation contract

Status: **limited local composer release**. The attachment menu provides an editable plain-text draft with real DOCX and PDF downloads generated on-device, without an API call. PDF accepts basic English characters only and rejects unsupported characters; Word preserves Unicode. No image, formatting, or signature preservation is provided. The routing module remains an inactive reference; its proposed quotas are not enforced or advertised as entitlements. The backend, extraction, paid-image routing, and native-app rollout described below are future work and are excluded from this release.

Validation: routing unit tests, desktop and mobile-viewport Chrome export/download tests, connected-chat regression tests, and required static-site metadata checks. Real Android/iOS device testing and full authenticated extraction/billing acceptance remain outstanding.

## Existing architecture discovered
- Website: static GitHub Pages frontend, with Supabase Edge Functions for authenticated cloud operations.
- Current photo editor: `chat/image-editor.js` calls the existing `yap-image-edit` Supabase function.
- Current attachment menu: `chat/yap-attachments.js` accepts text-like files (TXT/MD/CSV/JSON) up to 2 MB; PDF and DOCX extraction **not yet supported in this path**.
- Existing `docs/chat-services.md` describes Gemini usage and server quotas.

## Intent routing
- Extract/edit/format invitation letters, resumes, and screenshots of text -> document pathway (vision/text extraction -> structured editable draft -> deterministic DOCX/PDF).
- Photo background/object/style edits -> paid image-edit pathway.
- Ambiguous image requests -> clarify intent, **do not call paid image model automatically**.
- Revisions to extracted document text -> reuse stored draft, no second vision call unless source changes.

`chat/yap-media-policy.js` is a browser-safe reference policy, **not the quota authority**.

## Proposed starting quotas (subject to confirmed live tier prices/margins)
| Tier | Document exports / month | Image edits / month | Maximum upload |
| --- | ---: | ---: | ---: |
| Free | 3 | 0 | 2 MB |
| Plus | 40 | 4 | 8 MB |
| Pro | 150 | 15 | 16 MB |

Do not assume these proposed numbers are activated or reflect subscription entitlements. Confirm actual current price catalog and average token/image cost before making paid promises. Ensure the server has **hard spend caps** independent of request counts. If total provider cost reaches a cap, block premium work with an explanatory status; do not silently switch to a more expensive provider.

## Server endpoint contract
- `POST /functions/v1/yap-docs-extract`: require validated Supabase Auth JWT; accepted MIME whitelist; decode image/PDF/DOCX safely; extract original text and structured fields; return draft + warnings.
- `POST /functions/v1/yap-docs-export`: require authenticated account and server-verified active entitlement, enforce export quota **atomically**, generate real DOCX/PDF from approved text and template, return short-lived signed private object URL.
- Existing `yap-image-edit`: server validates entitlements/limits and invokes image model only for image-edit intent.

Never trust `tier`, `usage`, `price`, `model`, or `userId` from a client. Validate content sizes, enforce timeouts, cap output pages, and keep provider keys server-only. Record usage by account+UTC billing period+operation with idempotency keys to avoid charging retries twice. Do not log document text or raw images.

## Correct signatures and dates
- Preserve uploaded authentic signatures only with appropriate authorization; never fabricate handwriting resembling an individual's real signature.
- Never reuse a sender's signature without the user's explicit authorization.
- Date updates are proposed from the target locale/user request; request review before export if material dates were inferred.
- Always allow the user to review names, dates, addresses, travel dates, and intended recipients.
- Remove image backgrounds around authorized signatures without altering ink strokes; otherwise offer typed name and a signature field.

## Rollout & acceptance
1. Run: `node --test tests/yap-media-policy.cjs`.
2. Add backend functions using existing Supabase project/auth pattern; introduce DB migration for idempotent quota reservations and storage ownership/RLS.
3. Add document draft editor and genuine DOCX/PDF downloads inside existing chat; never label an image or HTML-as-.doc as DOCX.
4. Integrate Android/iOS shared in-chat UI, using the same authenticated backend; verify sign-in and file exports on real devices.
5. Test letter screenshot -> corrected Waqar Aziz draft -> 2027 dates -> true DOCX/PDF; PDF/DOCX uploads; malformed input; cross-account isolation; quota exhausted; provider unavailable; retries without duplicate usage.
6. Require end-to-end browser/device tests, billing review, and approval before merging to production.

This document is a design and implementation checkpoint, **not proof of a deployed or fully functional feature**.
