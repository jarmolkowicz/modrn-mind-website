# Modrn Mind Website

Landing page for [modrnmind.com](https://modrnmind.com).

## What's Here

- `index.html` — Single-page landing site
- `styles.css` — Design tokens, components, responsive styles
- `app.js` — Prompt copying and consent-gated analytics
- `logo.svg` — Modrn Mind logo
- `scripts/sync-kb-counts.ps1` — syncs published KB counts and release date into the site

`index.html` is the canonical website copy.

No build step or package installation is required. Serve this directory with a
local static server. Keep the HTML, CSS, JavaScript, and image assets together.
Analytics only loads on the production domains after consent. If browser storage
is blocked, the choice applies for the current visit.

## Checks

```powershell
node --check app.js
node --test tests/site.test.cjs
./scripts/sync-kb-counts.ps1 -Check
git diff --check
```

## Sync KB Counts

Before publishing the website after a KB release:

The default input is the sibling KB's local index. Confirm that index corresponds
to the published release first, or pass `-KbIndexPath` with the released index.
The script updates the hero totals, body copy, metadata, and sitemap.

```powershell
./scripts/sync-kb-counts.ps1
```

To verify without changing files:

```powershell
./scripts/sync-kb-counts.ps1 -Check
```

## Deploy

Static site. Deploy to GitHub Pages, Netlify, or any static host.

## Links

- [Knowledge Base](https://github.com/jarmolkowicz/modrn-mind-knowledge-base)

## License

MIT
