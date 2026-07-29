# vans

Full-screen, scroll-driven fashion/archive landing page.

Two phases: a hero with a cursor-scrubbed full-viewport video background and
exclusion-blended UI overlays, followed by a black gallery panel that slides up
and scrolls through a scattered grid of product images that scale in and out of
view. The page ends with a white outro overlay and a "view" CTA.

## Stack

- React 19 + TypeScript
- Vite 6 (`@vitejs/plugin-react`)
- Tailwind CSS v4 (`@tailwindcss/vite`)
- GSAP 3.15 + `@gsap/react` (ScrollTrigger drives the panel slide-up)
- Motion 12 (`motion/react`) for entry animations
- Inter Tight 500 via Google Fonts

## Develop

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
npm run preview
```

## How it works

- `#scroll-spacer` provides scroll height (`vh + maxScroll + 2vh`, set by GSAP
  after measuring the gallery).
- A GSAP ScrollTrigger (scrub) slides the black panel over the hero during the
  first `100vh` of scroll.
- A single `requestAnimationFrame` loop derives everything else from
  `window.scrollY`: gallery wrapper translation (phase 2), per-card scale
  (enter over `60vh`, exit over `40vh`), and the outro (overlay fade, info
  lift, "view" button scale, footer fade).
- On desktop the two hero videos are never played — they are scrubbed by
  cursor X position with a dead zone around the center; seeks are only issued
  when the previous seek finished (`!video.seeking`). On touch devices the
  videos auto-play alternately instead.
