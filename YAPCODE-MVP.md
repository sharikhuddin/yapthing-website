# YapCode MVP — review-first coding agent for YapThing

## Scope

YapCode introduces a coding workspace inside YapThing's website chat and Android WebView app. It reuses the existing Supabase yap-work and yap-work-oauth functions, billing/credit rules, Desktop Commander OAuth connector, and trusted on-computer Ollama model. There is no new API key in the client or new subscription product.

This is a guided coding agent MVP, not an unattended cloud-hosted Codex clone. Users can prepare a multi-file draft, review the generated content and comparison, approve each file write, run a supported check, and create a draft GitHub PR after reviewing the diff. No code executes, saves, commits, merges or deploys without action/credit approval.

## Workflow

1. Sign in to YapThing and connect a computer via the Work panel.
2. Select a connected device, trusted local project directory, and installed non-cloud Ollama coding model.
3. Select up to six existing context files; empty context supports a new-file draft.
4. Describe the change and review the five-credit draft_project quote before generation.
5. Select each proposed file; compare with the current on-computer version and optionally edit draft text.
6. Review and approve each two-credit write task individually. The server validates the original SHA and refuses unexpected existing targets.
7. Review and approve a supported project check (npm test, npm run build, pytest, dotnet test). Only trusted projects should run scripts on a personal machine.
8. Review the actual Git diff, then review and approve a three-credit draft GitHub pull request. No merge or release occurs automatically.

## Security and constraints

- Mobile uses YapAndroid.workRequest as a narrow, native authenticated POST proxy to the two allowlisted Supabase functions. The user's access token remains in YapAuth, not JavaScript.
- Requests are authenticated with the native account session, include bounded sizes, enforce account consistency, reject redirects and return bounded JSON.
- Web uses YapWorkClient and the signed-in Supabase session. UI fields, drafts and task previews clear when the account changes.
- Draft content is displayed using textContent / textarea.value, not injected HTML.
- Server-side Work credits and limits remain authoritative.
- Work executes on the connected user's computer, not a secure isolated cloud sandbox. It is appropriate for trusted project files only; do not run checks from unfamiliar repositories. Do not connect customer devices to the operator's private build machine.
- The local model is installed and controlled by the computer's owner. No automatic background tasks, public hosted sandbox, remote deployment or token top-ups are present in this MVP.

## Files

Website: chat/yapcode-agent.js, chat/yapcode-agent.css, chat/index.html, chat/work-routing.js, tests/yapcode-agent-browser.cjs.

Android: shared work-client.js, work-hub.js, work-hub.css, yapcode-agent.js, yapcode-agent.css; YapAuth.java, MainActivity.java, native index.html; tests/yapcode-android-browser.cjs.

The Android branch also removes accidentally committed diagnostic lines from existing JS, CSS and test files. Those lines caused baseline syntax failures.

## Verification

- node --check on all native JavaScript files: PASS.
- Website Playwright mocked workflow: 390px and 1280px PASS (draft, approvals, edit, check, PR, logout).
- Android WebView HTML in headless Chrome with mocked native bridge: 390px and 1280px PASS.
- Native tests/work-studio.cjs, tests/native-ui.cjs, tests/account-backup.cjs: PASS.
- Android Gradle compileDebugJavaWithJavac --offline --no-daemon: PASS on connected Windows JDK 17 and Android SDK.

Mock tests do not prove authenticated end-to-end service invocation, actual Ollama generation, real GitHub PR creation, full Android installation, iOS readiness or store approval. Complete these release gates before production.

## Next

- Pair a test account to a dedicated trusted computer and verify the real Work API with explicit credit use.
- Test against a non-production repository: generate, review, save, check, PR.
- Add iOS-native authenticated Work proxy and UI, entitlement/top-up UX, and hosted isolated sandboxes before offering fully autonomous coding publicly.
- Obtain real-device testing and approval before store submission or production merge.

## Unified app navigation (October 31, 2026)

- Web and Android now present **Chat**, **Projects**, **Code** at the top of the application menu and **Recents** with selectable saved conversations below.
- Web Projects expands the current project navigation including Create Project; Android Projects opens the existing in-app YapWork project studio. Code opens the YapCode modal without external navigation. Existing secondary tools live under Settings / More tools.
- Navigation verified in headless Chrome at phone (390px) and desktop (1280px) widths on both platforms. Existing YapCode workflow tests and Android Work Studio tests passed.
- Android test build has a separate debug-only application ID `com.sharkcorp.yapthing.yapcodepreview` and label **YapThing Code Test**; this leaves the main installed YapThing app untouched. `assembleDebug` and APK package/signature verification passed.
- **Not yet validated:** an installed physical-device session, on-device sign-in and backend execution, full iOS app navigation, and Play Store production release. Android emulator could not start due to missing Windows hardware acceleration driver; browser tests are not an emulator replacement.
- Do not auto-merge/deploy before validating actual account/credits and the trusted computer/Ollama integration on a test repository.
