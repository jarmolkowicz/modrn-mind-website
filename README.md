# Modrn Mind Website

Landing page for [modrnmind.com](https://modrnmind.com).

## What's Here

- `index.html` — Single-page landing site
- `logo.svg` — Modrn Mind logo
- `scripts/sync-kb-counts.ps1` — syncs published KB counts and release date into the site

`index.html` is the canonical website copy.

## Sync KB Counts

Before publishing the website after a KB release:

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
