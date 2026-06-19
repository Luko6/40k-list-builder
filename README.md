# 40k List Builder

A Warhammer 40,000 army list builder. MVP scope: **Black Templars** only.

- **Stack:** React + Vite + TypeScript
- **Hosting:** GitHub Pages (static) — <https://luko6.github.io/40k-list-builder/>
- **Persistence:** browser `localStorage` + JSON import/export (no account, no backend)
- **Validation:** points total vs. limit + basic structure (detachment, enhancements, unit sizes)

## Development

```bash
npm install      # install dependencies
npm run dev      # start the dev server
npm run build    # type-check + production build to dist/
npm run preview  # preview the production build locally
npm run lint     # lint
npm run format   # format with Prettier
```

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the app
and publishes `dist/` to GitHub Pages.

One-time setup in the GitHub repo: **Settings → Pages → Build and deployment →
Source = GitHub Actions**.

## Roadmap

- [x] **Phase 0** — repo scaffold + Pages deploy pipeline
- [ ] **Phase 1** — data format + small Black Templars seed
- [ ] **Phase 2** — importer (BattleScribe wh40k-10e data → our JSON, points corrected vs. Munitorum)
- [ ] **Phase 3** — list builder UI
- [ ] **Phase 4** — persistence + printable roster output

## Data sources

App data is compiled into our own JSON format, seeded from the community
[wh40k BattleScribe data](https://github.com/BSData/wh40k-10e) and corrected
against the current Munitorum points. Compiled data is committed so the site
stays fully static.
