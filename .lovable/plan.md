## How I do SEO on your site

SEO has two halves: **technical foundations** (so Google can find, crawl, and understand your pages) and **content/keywords** (so the right people actually land on them). Here's exactly what I do for each.

---

### 1. Technical foundations (already mostly done on TNPSC101)

These are baseline checks I apply to every route.

- **Title tag** — unique per page, under 60 chars, with the main keyword. Example: `TNPSC101 — Crack Bank, SSC & Placement Aptitude Tests`.
- **Meta description** — unique per page, under 160 chars, written like ad copy to earn the click.
- **Open Graph + Twitter tags** — `og:title`, `og:description`, `og:url`, `og:type`, `twitter:card` so links shared on WhatsApp / X / LinkedIn show a proper preview.
- **Canonical URL** — tells Google the official URL for each page (prevents duplicate-content penalties).
- **One H1 per page** + semantic HTML (`<nav>`, `<main>`, `<article>`, `<footer>`).
- **JSON-LD structured data** — `WebSite` + `Organization` sitewide; can add `FAQPage`, `Course`, or `BreadcrumbList` on relevant pages.
- **robots.txt** — tells crawlers what to index. Yours allows everything public and blocks nothing it shouldn't.
- **sitemap.xml** — lists every indexable URL. Yours currently lists `/` and `/auth`. I'd add a public `/leaderboard` or topic pages if we create them.
- **noindex on private routes** — dashboard, test-taking, results pages are marked `noindex` so they never show in search.
- **Page speed & mobile** — Lovable's stack is already fast; I check Lighthouse if needed.
- **Alt text on images, lazy loading, responsive viewport** — accessibility doubles as SEO.

### 2. Content & keywords (where the real traffic comes from)

Foundations let Google index you; **content** makes you rank. For TNPSC101 the high-intent searches are things like *"tnpsc aptitude mock test"*, *"free reasoning practice"*, *"bank exam aptitude questions"*, etc.

I use **Semrush** (an SEO data service built into Lovable) to:
- See what your site already ranks for and roughly how much traffic it gets.
- Find keywords your competitors rank for that you don't (content gaps).
- Check search volume + difficulty for any keyword before we write a page for it.
- Look at who currently ranks on page 1 so we know what to beat.

Based on that I usually recommend creating **topic landing pages** (one route per major keyword) — e.g. `/aptitude/percentage`, `/reasoning/number-series`, `/tnpsc-mock-test` — each with its own title, description, H1, and useful content. These rank far better than a single homepage trying to cover everything.

### 3. Automated audit (built into Lovable)

There's a one-click **SEO review** that scans your live site and lists every issue (missing tags, broken canonicals, weak descriptions, etc.) with click-to-fix actions. I run that, fix what it flags, and re-scan.

---

### What I'd like to do for you now

Pick any combination — I'll do them in order:

1. **Run the SEO review** on your current site and fix everything it flags.
2. **Run a Semrush snapshot** of `tnpscctsaptitude.lovable.app` to see current rankings + traffic + competitors.
3. **Keyword research** for TNPSC / bank / SSC aptitude terms and propose topic landing pages to build.
4. **Build those landing pages** (e.g. `/tnpsc-aptitude-mock-test`, `/reasoning-practice`, one per major topic) with proper SEO metadata and real content.

Tell me which of 1–4 to start with (or say "all of it") and I'll begin.
