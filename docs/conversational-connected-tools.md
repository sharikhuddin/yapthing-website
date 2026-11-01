# Conversational connected tools

The website now has one main chat experience and a Tools button in the composer. Existing advanced Code and project controls remain available.

## User flow

- Ask normally: “Find my YapThing repository on GitHub and check my computer.”
- A bounded planner can combine GitHub, Supabase project metadata, authorized Google Drive files, explicitly requested Gmail snippets, and files in the selected computer project.
- Common list/read/check requests use deterministic adapters without an extra planning call.
- The response is grounded in the returned tool results. A failed connection stays a failed source, with a connection link. If the response service cannot finish after successful reads, the verified source facts are still shown.
- Computer saves/checks and Drive notes create an inline review. An approved coding task can continue edits and checks within the exact granted scope, including repairing a failed check. PowerShell, public page reading and draft pull requests always have separate exact-action reviews.
- Selecting a computer folder is needed only for computer file tasks. The Tools panel can select an existing project directly. A visible Continue request control resumes after project selection or setup. Code-only drafts do not require choosing a computer project.
- Code drafts can use the existing YapThing response service. The conversational flow does not require installing Ollama.

## Architecture and boundaries

`chat/connected-assistant.js` owns eligible form submissions at document capture phase, before legacy per-provider routes. Slash commands and advanced Code controls keep their existing routes.

The existing authenticated endpoints perform all provider access. No provider tokens or new API keys are added to model context. There are no new backend services or schema changes.

Planning uses the existing `ios-chat` response endpoint, at most 12 planning rounds, four reads per round and 20 computer actions. Coding-task permission covers 1–6 exact paths, up to 8 saves and 3 selected checks (19 Work credits maximum for those edits/checks). Keep the chat open. Stop or context changes revoke further continuation. Existing chat and Work allowances continue to apply. It does not introduce unlimited free usage.

Only the explicit tool catalog can execute. Model output is parsed as data; unknown tool names, invalid paths, and unsupported checks are rejected. PowerShell runs only the exact reviewed command, once, with a 30-second limit and full Windows user permissions. Interrupted responses stop the loop without replay. Public browsing is HTTPS HTML/text reading from the computer, with public DNS/IP checks on every redirect; it does not control a signed-in browser, click, run JavaScript or reuse cookies. Draft PRs use the actual GitHub origin, an inspected diff, current HEAD and reviewed hashes, with a new yapthing/ branch. No automatic merge, deployment, database execution or email mutation is provided.

Account, chat, selected-project and Incognito boundaries are checked before and after asynchronous work. Switching context invalidates in-flight results and previews; it also closes and clears the account-specific Tools panel. Incognito keeps ordinary coding chat available while blocking private tool calls. Computer writes use the SHA from a real prior read, or an expected missing file, so a proposed write cannot silently overwrite an unread existing file. Backend approval hashing, ownership and idempotency still apply.

Retrieved source text is untrusted context. Gmail snippets are only read for an explicit email request or a direct email follow-up. Drive authorization remains limited to files available under the existing drive.file connection.

## Verification

Run with the repository's existing Playwright/Chrome test setup:

```
node tests/connected-assistant-browser.cjs
node tests/github-routing-browser.cjs
node tests/supabase-routing-browser.cjs
node tests/remote-mcp-work-browser.cjs
node tests/yapcode-agent-browser.cjs
node tests/composer-polish-browser.cjs
```

The connected assistant regression covers multi-provider reads, partial failures, reviewed computer writes, reviewed Drive creation, no unrelated Gmail access, deterministic terminal checks, typo handling, project continuation, unknown-tool rejection, account switching, Incognito and ordinary informational questions at phone and desktop widths.

This change targets the website. It does not build or distribute a new Android/iOS binary.

## Gemini coding

YapCoding can hand a task to normal chat through **Use Gemini coding in chat**. The planner requests `purpose: coding_plan`; the existing authenticated ios-chat backend uses Gemini directly with a bounded JSON response schema, 4,096 output tokens, and the existing configured chat model/key. Ordinary chat routing is unchanged. Model and tool allowances remain enforced; keys stay server-side. Malformed or truncated plans are rejected. After task approval, ordered batches of allowed edits/checks run sequentially, and a failed step clears the remaining queued steps before replanning.

The Gemini Code Assist Management API is separate from model generation. It participates in Google’s GitHub-review setup, which requires linking repositories and installing its GitHub app. A draft-PR review offers an optional unchecked request to post `/gemini review`. The exact approval hash includes this choice. A failed review request does not discard the already-created PR, and request submission is not reported as completed review. No Google Cloud resources, billing changes, IAM grants or GitHub app installations are performed by YapThing.

Official references: https://docs.cloud.google.com/gemini/docs/code-review/set-up-code-assist-github and https://ai.google.dev/api/generate-content .
