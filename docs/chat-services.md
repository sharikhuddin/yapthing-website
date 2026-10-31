# Chat services and operating costs

The Do more menu sits inside the composer attachment menu and groups actions by use case.

- Payments & finance: Frankfurter v2 blended reference currency conversion; existing authenticated plan and usage endpoints. Currency rates cache in memory for one hour and disclose their publication date. Stripe checkout remains at /plans/.
- AI & automation: existing Gemini chat/search and project Work flow. Swift, Balance, Depth and Story are response strategies, not separately trained models. The ios-chat backend uses allowlisted style instructions and output budgets.
- Location & travel: existing user-selected location/time feature and grounded travel research. No new paid maps/weather subscription is activated.
- Communication: existing connected Gmail inbox action and message drafting. No new automatic message sending.
- Social & identity: existing connection status and account authentication. No social publishing provider is represented as connected unless an integration exists.
- Utilities & data: local arithmetic and distance/weight/temperature conversions. No AI request required.
- Preferences: explicitly saved answer length, tone and language, scoped by account on this browser. View, edit and clear in Do more. Preferences are included in cloud requests. No training or cross-device preference sync is claimed.

## Usage controls

Direct currency/calculation/unit/account requests do not use a Gemini generation. Existing server quotas are retained; additional research still uses its existing allowance. Currency failures do not trigger a paid fallback automatically. Provider errors and plan exhaustion have separate response codes. Upgrading is not advertised as a fix for provider outages.

The ios-chat function emits structured token counts, mode, status and duration without logging prompts, credentials or user IDs. These logs support cost analysis but are not an invoicing ledger. Actual margin still needs provider billing, hosting, payment fees and subscription revenue. Do not promise unlimited paid AI or guaranteed profitability.

## Automatic improvement drafts

Run scripts/propose-improvement.cjs on a clean checkout with an installed local Ollama coding model:
node scripts/propose-improvement.cjs --goal "Describe one issue" --files chat/example.js --model your-installed-model

The script only accepts 1–3 explicit tracked frontend files, calls localhost Ollama, validates returned paths and sizes, checks JavaScript syntax and whitespace, and creates a local review branch. It does not run generated code, push, merge, deploy or change production. Review the diff and run appropriate browser/behavioral tests before release. No recurring scheduler is enabled.

The existing in-chat Work flow can draft changes for a selected project with a connected computer and installed local model. It provides source review, save, project checks and draft pull requests.

## API terms checked

Frankfurter: https://frankfurter.dev/ and https://frankfurter.dev/license/
Its blended rates are free for commercial use; individual provider terms can differ. Rates are reference data, not executable bank/trading quotes.
Open-Meteo: https://open-meteo.com/en/pricing — free hosted access is non-commercial; not added to this commercial product.
Gemini: https://ai.google.dev/api/generate-content — usage metadata and generation configuration.
