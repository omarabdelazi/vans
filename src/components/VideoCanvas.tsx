import { useEffect, useRef, useState } from 'react'
import { LEFT_VIDEO_SRC, RIGHT_VIDEO_SRC } from '../assets'
import { useViewport } from '../useViewport'

type Side = 'left' | 'right'

export function VideoCanvas() {
  const leftRef = useRef<HTMLVideoElement>(null)
  const rightRef = useRef<HTMLVideoElement>(null)
  const [ready, setReady] = useState({ left: false, right: false })
  const { isTouch } = useViewport()

  const loaded = ready.left && ready.right

  useEffect(() => {
    const left = leftRef.current
    const right = rightRef.current
    if (!left || !right) return

    const mark = (side: Side) =>
      setReady((prev) => (prev[side] ? prev : { ...prev, [side]: true }))
    const onLeft = () => mark('left')
    const onRight = () => mark('right')
    if (left.readyState >= 2) mark('left')
    if (right.readyState >= 2) mark('right')
    left.addEventListener('loadeddata', onLeft)
    right.addEventListener('loadeddata', onRight)
    return () => {
      left.removeEventListener('loadeddata', onLeft)
      right.removeEventListener('loadeddata', onRight)
    }
  }, [])

  useEffect(() => {
    const left = leftRef.current
    const right = rightRef.current
    if (!left || !right) return

    if (isTouch) {
      // Touch devices: the videos auto-play alternately, left first.
      left.style.display = 'block'
      right.style.display = 'none'
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const playLeft = () => {
        right.style.display = 'none'
        left.style.display = 'block'
        left.currentTime = 0
        left.play().catch(() => {})
      }
      const playRight = () => {
        left.style.display = 'none'
        right.style.display = 'block'
        right.currentTime = 0
        right.play().catch(() => {})
      }
      left.addEventListener('ended', playRight)
      right.addEventListener('ended', playLeft)
      playLeft()
      return () => {
        left.removeEventListener('ended', playRight)
        right.removeEventListener('ended', playLeft)
        left.pause()
        right.pause()
        left.style.display = 'none'
        right.style.display = 'block'
      }
    }

    // Desktop: never auto-play; scrub by cursor X inside a RAF loop. Cursor on
    // the left half shows/scrubs the RIGHT video and vice versa. The active
    // side only flips once the cursor leaves the central dead zone.
    let mouseX = window.innerWidth / 2
    let activeSide: Side = 'left'
    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX
    }
    window.addEventListener('mousemove', onMove)

    let raf = 0
    const tick = () => {
      const width = window.innerWidth
      const center = width / 2
      const dead = Math.max(30, width * 0.05)
      const x = mouseX

      let side = activeSide
      if (x < center - dead) side = 'left'
      else if (x > center + dead) side = 'right'

      if (side !== activeSide) {
        activeSide = side
        const show = side === 'left' ? right : left
        const hide = side === 'left' ? left : right
        show.style.display = 'block'
        hide.style.display = 'none'
      }

      // Only seek when the previous seek has been rendered, otherwise
      // playback gets jittery while the browser is still decoding.
      if (Math.abs(x - center) <= dead) {
        if (!left.seeking && left.currentTime !== 0) left.currentTime = 0
        if (!right.seeking && right.currentTime !== 0) right.currentTime = 0
      } else if (side === 'left') {
        const range = Math.max(1, center - dead)
        const progress = Math.min(1, Math.max(0, (center - dead - x) / range))
        if (right.duration && !right.seeking) right.currentTime = progress * right.duration
      } else {
        const range = Math.max(1, width - (center + dead))
        const progress = Math.min(1, Math.max(0, (x - (center + dead)) / range))
        if (left.duration && !left.seeking) left.currentTime = progress * left.duration
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
    }
  }, [isTouch])

  return (
    <div
      id="main-canvas"
      className="pointer-events-none fixed left-0 top-[220px] z-0 h-[calc(100vh-220px)] w-screen overflow-hidden lg:inset-0 lg:top-0 lg:h-full lg:w-full"
      style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
    >
      <video
        ref={leftRef}
        src={LEFT_VIDEO_SRC}
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ display: 'none' }}
      />
      <video
        ref={rightRef}
        src={RIGHT_VIDEO_SRC}
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ display: 'block' }}
      />
    </div>
  )
}
