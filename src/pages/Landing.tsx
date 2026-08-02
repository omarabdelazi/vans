import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { GALLERY_IMAGES } from '../assets'
import { api, type Product, type Settings } from '../lib/api'
import { BlackPanel, type GalleryItem } from '../components/BlackPanel'
import { Caption } from '../components/Caption'
import { Footer } from '../components/Footer'
import { HeaderNav } from '../components/HeaderNav'
import { Logo } from '../components/Logo'
import { ProductInfo } from '../components/ProductInfo'
import { Shoe3DCursor } from '../components/Shoe3DCursor'
import { VideoCanvas } from '../components/VideoCanvas'
import { ViewButton } from '../components/ViewButton'
import { WhiteOverlay } from '../components/WhiteOverlay'
import { useViewport } from '../useViewport'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const SYMBOLS = ['8', '$', '^^', '%', '/']

const FALLBACK_ITEMS: GalleryItem[] = GALLERY_IMAGES.map((img) => ({ img }))

export default function Landing() {
  const spacerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const { cols } = useViewport()
  const [settings, setSettings] = useState<Settings>({})
  const [items, setItems] = useState<GalleryItem[]>(FALLBACK_ITEMS)

  // The gallery shows only the products marked as featured in the admin
  // dashboard (falling back to the built-in editorial shots until some are).
  useEffect(() => {
    api<Settings>('/settings')
      .then(setSettings)
      .catch(() => {})
    api<Product[]>('/products?featured=1')
      .then((products) => {
        const withPhotos = products
          .filter((p) => p.image_url)
          .slice(0, 12)
          .map((p) => ({ img: p.image_url, link: `/product/${p.id}` }))
        if (withPhotos.length) setItems(withPhotos)
      })
      .catch(() => {})
  }, [])

  // Phase 1: the black panel slides up over the video during the first 100vh.
  useGSAP(() => {
    gsap.fromTo(
      panelRef.current,
      { y: () => window.innerHeight },
      {
        y: 0,
        ease: 'none',
        scrollTrigger: {
          start: 0,
          end: () => window.innerHeight,
          scrub: true,
          invalidateOnRefresh: true,
        },
      },
    )
  }, [])

  // RAF-driven scroll engine: gallery scroll (phase 2), card scaling and the
  // outro sequence all derive from window.scrollY each frame.
  useEffect(() => {
    const spacer = spacerRef.current
    const panel = panelRef.current
    const wrap = wrapRef.current
    if (!spacer || !panel || !wrap) return

    const canvas = document.getElementById('main-canvas')
    const overlay = document.getElementById('outro-overlay')
    const info = document.getElementById('outro-info')
    const buy = document.getElementById('outro-buy')
    const footer = document.getElementById('outro-footer')
    const symbol = document.getElementById('circle-symbol')
    const cells = Array.from(panel.querySelectorAll<HTMLElement>('.bp-cell'))
    const cards = cells.map((cell) => cell.querySelector<HTMLElement>('.bp-card'))

    let vh = window.innerHeight
    let maxScroll = 0

    const measure = () => {
      vh = window.innerHeight
      maxScroll = Math.max(0, wrap.scrollHeight - vh)
      gsap.set(spacer, { height: vh + maxScroll + 2 * vh })
      ScrollTrigger.refresh()
    }
    measure()
    window.addEventListener('resize', measure)

    let raf = 0
    const tick = () => {
      const y = window.scrollY

      // Phase 2: once the panel is docked, its inner wrapper scrolls the grid.
      wrap.style.transform = `translateY(${-Math.max(0, y - vh)}px)`
      if (canvas) canvas.style.visibility = y > vh ? 'hidden' : 'visible'

      for (let i = 0; i < cells.length; i++) {
        const card = cards[i]
        if (!card) continue
        const rect = cells[i].getBoundingClientRect()
        let scale = 0
        if (rect.bottom > 0 && rect.top < vh) {
          const enter = Math.min(1, (vh - rect.top) / (vh * 0.6))
          const exit = Math.min(1, rect.bottom / (vh * 0.4))
          scale = Math.max(0, Math.min(enter, exit))
        }
        card.style.transform = `scale(${scale})`
      }

      // Outro: white overlay fades in, the info block lifts, "view" scales up.
      const progress = Math.min(1, Math.max(0, (y - vh - maxScroll) / (vh - 100)))
      if (overlay) overlay.style.opacity = String(progress)
      if (info) {
        const offset = Number(info.dataset.outroOffset ?? 166)
        info.style.transform = `translateY(${-progress * offset}px)`
      }
      if (buy) buy.style.transform = `scale(${progress})`
      if (footer) footer.style.opacity = String(progress)

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    let lastSymbolAt = 0
    const onScroll = () => {
      const now = performance.now()
      if (now - lastSymbolAt < 80 || !symbol) return
      lastSymbolAt = now
      symbol.textContent = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', onScroll)
    }
  }, [cols, items])

  return (
    <div
      ref={spacerRef}
      id="scroll-spacer"
      className="relative select-none bg-white"
      style={{ height: '500vh' }}
    >
      <VideoCanvas />
      <BlackPanel panelRef={panelRef} wrapRef={wrapRef} cols={cols} items={items} />
      <WhiteOverlay />
      <Logo />
      <HeaderNav />
      <Caption text={settings.landing_caption} />
      <ProductInfo label={settings.landing_label} bigText={settings.landing_big_text} />
      <ViewButton />
      <Footer />
      <Shoe3DCursor />
    </div>
  )
}
