# YapThing Desktop — Windows-first pilot

This branch contains a minimal Tauri 2 desktop shell, **not a production-ready desktop chat application**. It intentionally opens the existing website chat in the system browser until desktop authentication and security are validated. Do not represent this shell as complete or publish to stores yet.

## Local development

Install Node.js, Rust, Microsoft C++ Build Tools and WebView2 (Windows), then from `desktop/` run `npm install`, `npm run dev`, or `npm run build`. The Windows targets are NSIS and MSI. macOS/Linux builds need their platform-specific build dependencies and signing.

## Before release

- Replace preview with integrated chat UI using audited website assets and restrictive CSP.
- Validate Supabase authentication and safe token storage (never log tokens or embed secret keys).
- Confirm server-verified RevenueCat entitlements with consistent Supabase user ID; use Stripe for website checkout where permitted, and platform-compliant store billing.
- Add application icons, code signing, update signing, accessibility and automated tests.
- Test installers on clean Windows 10/11 machines; verify refunds, cancellations, upgrades and account switching.
- Review Microsoft Store and Mac App Store policies before store submission.

Do not add billing secrets, signing certificates, API keys or customer tokens to this repository.
