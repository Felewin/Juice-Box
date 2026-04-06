# Juice Box

Practice supersight! Discover and match sprites. A juicy, accessible experience.

## Tech stack

🌐 HTML5  
⚡ vanilla JavaScript  
📱 webapp manifest  
🎨 CSS  
🔤 Google Fonts: Cherry Bomb One  

## Deploy (GitHub Pages)

The site deploys via **GitHub Actions** when pushed to `main`. No local build step needed.

**Cache busting:** On each deploy, `scripts/inject-version.cjs` runs and injects the current git commit hash (short) into `version.js`, `index.html`, and `manifest.json` (icon URLs). In `index.html`, the hash is added to bootstrap scripts (`version.js`, `loader.js`), `manifest.json`, `sprites/juice-box.png` (tab favicon) and `app-icon.png` (apple-touch) links, and the Open Graph / Twitter preview image URL. After scripts load, `loader.js` appends `?v=` (from `CACHE_BUST` in `version.js`, or a timestamp fallback) to CSS, JS, sprites, audio, and `link` tags for the icon, apple-touch icon, and manifest so local runs without inject still bust caches. Fresh assets load after every deploy.

**Requirements:**
- Repo Settings → Pages → Source: **GitHub Actions**
- Default branch must match the workflow (`main` by default; edit `.github/workflows/deploy.yml` if you use `master`)

**Flow:**
1. Push to `main` → workflow triggers
2. `node scripts/inject-version.cjs` injects git hash into `version.js`, `index.html` (scripts, manifest link, icons, social preview image), and `manifest.json` (icon paths)
3. Site is deployed to GitHub Pages
4. Visitors get assets with `?v=<hash>`; cache invalidates on next deploy
