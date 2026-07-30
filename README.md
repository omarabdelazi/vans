# vans

Scroll-driven fashion landing page + full e-commerce store + Arabic admin
dashboard, running on Cloudflare Pages (Functions + D1 + R2).

- **Landing** (`/`): cursor-scrubbed video hero, exclusion-blended overlays, a
  3D sneaker that follows the mouse, and a scroll gallery ending in a "view" CTA.
- **Store** (`/shop`): categories, search, product pages with 3D viewer and
  AR try-on (model-viewer), cart, checkout with InstaPay / Vodafone Cash
  (transfer-screenshot upload) or cash on delivery, contact form.
- **Admin** (`/admin`, Arabic RTL): categories & products CRUD (per-size stock
  EU 35–44, discounts with old/new price, 3D/AR flags), order review with
  payment-proof verification (stock is deducted only when a sale is confirmed),
  customer messages, in-store POS with receipt printing, and store settings.

Deployment/setup guide (Arabic): see [SETUP.md](./SETUP.md).

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
