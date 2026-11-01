# Conversational connected tools

The website now has one main chat experience and a Tools button in the composer. Existing advanced Code and project controls remain available.

## User flow

- Ask normally: “Find my YapThing repository on GitHub and check my computer.”
- A bounded planner can combine GitHub, Supabase project metadata, authorized Google Drive files, explicitly requested Gmail snippets, and files in the selected computer project.
- Common list/read/check requests use deterministic adapters without an extra planning call.
- The response is grounded in the returned tool results. A failed connection stays a failed source, with a connection link. If the response service cannot finish after successful reads, the verified source facts are still shown.
- Computer file saves, project checks, and new Drive notes create an inline review. Execution begins only after the user approves.
- Selecting a computer folder is needed only for computer file tasks. The Tools panel can select an existing project directly. A visible Continue request control resumes after project selection or setup. Code-only drafts do not require choosing a computer project.
- Code drafts can use the existing YapThing response service. The conversational flow does not require installing Ollama.

## Architecture and boundaries

`chat/connected-assistant.js` owns eligible form submissions at document capture phase, before legacy per-provider routes. Slash commands and advanced Code controls keep their existing routes.

The existing authenticated endpoints perform all provider access. No provider tokens or new API keys are added to model context. There are no new backend services or schema changes.

Planning uses the existing `ios-chat` response endpoint, at most two read rounds (up to four reads per round) plus a final answer or a single proposed change. Existing chat and Work allowances continue to apply. It does not introduce unlimited free usage.

Only the explicit tool catalog can execute. Model output is parsed as data; unknown tool names, invalid paths, and unsupported checks are rejected. There is no generic shell, SQL, GitHub write/deploy, email send/delete/archive, or arbitrary URL adapter.

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
