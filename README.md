# robbotato.github.io

Robert Li's personal site — live at <https://robbotato.github.io>.

3D interactive portfolio: Vite + React + TypeScript + Tailwind, with a
Three.js constellation background, a cinematic intro "dive", glassmorphism,
and Framer Motion scroll choreography. Hardcoded dark theme.

## Develop

```bash
npm install
npm run dev      # http://localhost:8080
npm run build    # -> dist/
npm run lint
```

## Edit content

All portfolio content lives in **`src/data/profile.ts`** — name, tagline,
contact, experience, skills, education, projects, awards. Components read
from it, so that's the only file to touch for a content change.

- Resume PDF: replace `public/resume.pdf`.
- 3D centerpiece: `src/components/animated/ConstellationField.tsx`.
- Theme tokens: `src/index.css`.
- Second page (`/hobbies`): `src/pages/Hobbies.tsx`.

## Deploy

Push to `main` → `.github/workflows/deploy.yml` builds and publishes to
GitHub Pages. Repo **Settings → Pages → Source** must be set to
**GitHub Actions**.

Adapted from the MIT-licensed portfolio template at
<https://github.com/rl4658/rl4658.github.io>.
