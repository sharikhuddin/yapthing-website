# Answer Engine Optimization

Public product facts: /product/. Visible questions and matching FAQPage data: /faq/. Home declares Organization, WebSite and SoftwareApplication without unverified prices, ratings or app-store availability. Sitemap-listed pages have canonical URLs, descriptions and JSON-LD. robots.txt preserves public crawling and excludes /admin/; admin also has noindex. robots.txt is not authorization. llms.txt is an optional discovery aid and cannot guarantee indexing or citations.

The existing admin account check gates the AEO panel. Run public-site checks to fetch sitemap URLs, inspect metadata and parse structured data. The dashboard displays pass/fail observations and observation time; it does not store results or track visitors. Technical pass counts are not visibility scores. AI citations, impressions, AI referrals and verified bot visits remain explicitly unavailable until an authorized real data source is connected. Browser fetches cannot verify bot traffic. Existing customer and billing controls are preserved.

Validation: check all sitemap pages for canonical/title/description and parse JSON-LD; compare FAQ structured answers with visible content; check dashboard JavaScript syntax; ensure admin is excluded from sitemap and retains authorization gate. After deploy, verify the public files over HTTPS and run browser checks. Google rich-result eligibility and real answer-engine indexing are separate external outcomes.

Sources: https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data and https://developers.openai.com/api/docs/bots . FAQ markup does not guarantee FAQ rich results: https://developers.google.com/search/blog/2023/08/howto-faq-changes .

## Business and developer admin
The admin workspace now shows total accounts and new accounts in seven days from the existing authorized customer response. Request failures clear those displayed totals rather than leaving stale values. No customer data is stored by the new widgets. Revenue, retention, expenses and citations remain unavailable without real sources. Owner readiness notes are review tasks, not a live readiness score.

Public GitHub source status is fetched without credentials after admin verification; it shows the latest source commit and observation time, explicitly separate from production deployment evidence. Source/API failures are displayed with links to the authoritative repository and logs.

Public-site audits start after verified administrator access and refresh every 30 minutes while the page is visible and automatic refresh is enabled. They do not run while the page is closed. Download exports contain only public-site check details. A separate daily Codex chat monitor was configured for the owner; its availability depends on Codex and connected tools, not GitHub Pages.

Run `node tests/admin-operations.cjs` for controlled-response tests covering the authorization gate, initialization, account summaries, stale-data clearing, cross-origin sitemap refusal, failure/retry behavior and report availability. These tests do not replace an authenticated end-to-end browser test.
