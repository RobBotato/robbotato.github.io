# robbotato.github.io

Source for my personal site, live at <https://robbotato.github.io>.

Plain HTML, CSS, and a little JavaScript — no build step. Push to `main` and
GitHub Pages serves it.

```
index.html      markup
css/style.css   design tokens + light/dark palettes
js/theme.js     dark-mode toggle (system preference + manual override)
assets/         images, favicon, resume
```

## Editing

- **Projects** — edit the `.card` list in `index.html`.
- **Resume** — edit the `.resume` block in `index.html`.
- **Colors** — change the custom properties at the top of `css/style.css`.

Preview locally by opening `index.html` in a browser, or run
`python -m http.server` from this directory and visit <http://localhost:8000>.
