# Search publishing and discovery

## What is implemented
24 public routes have unique titles/descriptions, canonical URLs, Open Graph/Twitter previews, consistent Organization/WebSite/WebPage/BreadcrumbList graphs, and indexable static HTML. The product and FAQ entities remain tied to visible facts. Public guides and About/content standards add useful context rather than keyword-only pages. Desktop, plugin guidance and deletion pages are included in the sitemap. Admin remains noindex and outside the sitemap. A branded 404 page keeps HTTP 404 behavior on GitHub Pages.

## Editing
1. Edit public content.
2. Run `node scripts/search-build.cjs`.
3. Run `node scripts/search-build.cjs --check`, `node tests/search-health.cjs`, `node tests/admin-operations.cjs` and `node tests/indexnow.cjs`.
4. Review and publish through the existing GitHub Pages source.

The builder records per-page content hashes. Sitemap lastmod changes only when page HTML changes; rebuilding unchanged content does not manufacture fresh dates. Do not manually edit generated JSON-LD or metadata. Keep supported public routes in the builder registry. Shared feature-script changes should be accompanied by corresponding visible content updates when they change a product claim.

## Automated discovery
The Search health and discovery workflow runs checks on pushes/PRs. After successful Pages deployment on main, it checks the deployed key, manifest and changed page hashes before submitting changed HTML URLs through IndexNow. A mismatched or superseded deployment is refused rather than notifying an unverified version. No write-scoped token, paid inference or new hosting is used. GitHub Actions is separate from Codex Work credits; account policies may apply.

IndexNow key files are intentionally hosted publicly as required by the protocol. The root key-location file is for URL notifications, not Google ownership verification or private API access. Keep it out of normal site navigation. GitHub workflow artifacts retain actual notification receipts for 30 days. HTTP 200 means received; HTTP 202 means received with key validation pending. Neither proves indexing. HTTP failures are reported and never presented as success. Dry run is the default for `node scripts/indexnow.cjs`; explicit `--submit` notifies all registry pages after verification. The workflow adds `--changed-from HEAD^` to select changed public HTML pages in the deployed commit. Removed pages need deliberate manual IndexNow notification and proper HTTP removal handling.

## Google and Bing ownership
Sign in to the owner's Google Search Console and Bing Webmaster Tools, verify yapthing.com, and submit https://yapthing.com/sitemap.xml. These account steps are not completed by adding metadata alone. DNS verification is also supported by those tools outside this repository.
For HTML-tag verification, copy search-verification.example.json to search-verification.json, fill only the exact tokens issued for this site, and run the builder before publishing. The tokens are public HTML verification values, not passwords or account credentials.

Inspect product, guides and FAQ URLs through each console after publication. Use actual impressions/clicks/citations, never an invented AEO rank. No analytics/visitor tracking was introduced.

## Limits and sources
Search visibility depends on useful original content, real reputation/links, crawling and search-engine decisions. Code cannot guarantee quick indexing, first-page placement or AI citations. Do not buy spam links or publish mass-generated thin pages.
- Google AI features and standard SEO: https://developers.google.com/search/docs/appearance/ai-features
- IndexNow notification protocol: https://www.indexnow.org/documentation
- Bing sitemap guidance: https://blogs.bing.com/webmaster/2025/7/Keeping-Content-Discoverable-with-Sitemaps-in-AI-Powered-Search/
