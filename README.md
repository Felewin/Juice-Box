# Juice Box

A browser-based sprite-matching game.

## Tech stack

🌐 HTML5  
⚡ vanilla JavaScript  
🎨 CSS  
🔤 Google Fonts: Cherry Bomb One  

## Deploy (GitHub Pages)

The site deploys via **GitHub Actions** when pushed to `main`. No local build step needed.

**Cache busting:** On each deploy, `scripts/inject-version.cjs` runs and injects the current git commit hash (short) into `version.js` and `index.html`. Bootstrap scripts (`version.js`, `loader.js`) and all other assets (CSS, JS, sprites, audio) load with `?v=<hash>`, so browsers fetch fresh files after every deploy.

**Requirements:**
- Repo Settings → Pages → Source: **GitHub Actions**
- Default branch must match the workflow (`main` by default; edit `.github/workflows/deploy.yml` if you use `master`)

**Flow:**
1. Push to `main` → workflow triggers
2. `node scripts/inject-version.cjs` injects git hash into `version.js` and `index.html` (bootstrap script URLs)
3. Site is deployed to GitHub Pages
4. Visitors get assets with `?v=<hash>`; cache invalidates on next deploy
