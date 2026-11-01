# Desktop Commander connection

Plugins → Desktop Commander uses per-user Remote MCP OAuth through YapThing Work. Keep your connector online. Code and Work use the same account connection, with previews before edits and terminal checks.

Browser regression tests:

```
node tests/remote-mcp-plugin-browser.cjs
node tests/remote-mcp-work-browser.cjs
node tests/yapcode-agent-browser.cjs
```

These use Playwright with installed Chrome. Backend source, security details and backend tests are in the yapthing repository at docs/desktop-commander-remote-mcp.md.
