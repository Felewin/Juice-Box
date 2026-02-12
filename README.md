# Juice Box

A browser-based sprite-matching game.

## Deploy (GitHub Pages)

The site deploys via **GitHub Actions** when you push to `main`. No local build step needed.

**Cache busting:** On each deploy, `scripts/inject-version.cjs` runs and overwrites `version.js` with the current git commit hash (short). All assets (CSS, JS, sprites, audio) are loaded with `?v=<hash>`, so browsers fetch fresh files after every deploy.

**Requirements:**
- Repo Settings → Pages → Source: **GitHub Actions**
- Default branch must match the workflow (`main` by default; edit `.github/workflows/deploy.yml` if you use `master`)

**Flow:**
1. Push to `main` → workflow triggers
2. `node scripts/inject-version.cjs` writes git hash to `version.js`
3. Site is deployed to GitHub Pages
4. Visitors get assets with `?v=<hash>`; cache invalidates on next deploy
