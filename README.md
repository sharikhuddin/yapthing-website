# YapThing.com — free official website

This **public repository contains website files only**. The Android app's private source code remains in a separate private repository. Do not put API keys, credentials, Android upload keystores, or private code here.

## Hosting and costs
- Hosting: GitHub Pages (GitHub Free for this public repository), **$0 additional hosting cost**.
- HTTPS: GitHub Pages certificate, **$0 additional cost**, issued after DNS is correct.
- Domain: yapthing.com is registered with GoDaddy; domain purchase and renewal are separate from free hosting.
- Domain configured in GitHub Pages: **yapthing.com**. Source: **main**, root (/). GitHub Pages build: successful.

## GoDaddy DNS records still needed
Replace the existing GoDaddy parking **A @** records, without touching MX, TXT, NS, DMARC/SPF, DKIM or other records. The target GitHub Pages apex IPv4 values are:

| Type | Host | Value | TTL |
|---|---|---|---|
| A | @ | 185.199.108.153 | 600 seconds |
| A | @ | 185.199.109.153 | 600 seconds |
| A | @ | 185.199.110.153 | 600 seconds |
| A | @ | 185.199.111.153 | 600 seconds |
| CNAME | www | sharikhuddin.github.io | 600 seconds |

If an existing A or CNAME record for @/www points to GoDaddy parking, replace/delete the conflicting parking value first. Do NOT leave GoDaddy parking IPs alongside GitHub Pages IPs.

Official instructions: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site

After DNS propagates, go to repository **Settings → Pages**, enable **Enforce HTTPS** when GitHub issues the certificate (typically available after DNS verification). DNS may take up to 24 hours to fully propagate.

## Pages
- / — Home and app features
- /privacy/ — Privacy policy
- /delete-account/ — Deletion instructions
- /support/ — Support contact

The Android Play Store app is still in testing, so the public site does not claim that a production app is already available.

## Maintenance
Edit source files here and commit to `main`. GitHub Pages redeploys automatically. Never enable paid GitHub plans solely for this public static site.
