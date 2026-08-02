import { useEffect, useRef, useState } from 'react'
import { ensureModelViewer } from '../lib/modelViewer'

interface TryOnProps {
  modelUrl: string
  onClose: () => void
}

interface Landmark {
  x: number
  y: number
  visibility?: number
}

interface PoseResults {
  poseLandmarks?: Landmark[]
}

// MediaPipe pose landmark indices.
const L_HEEL = 29
const R_HEEL = 30
const L_TOE = 31
const R_TOE = 32

const AUTO_TIMEOUT_MS = 5000

/**
 * Camera-based virtual try-on. Two modes:
 * - auto: MediaPipe Pose (self-hosted, in-browser) tracks the foot and the
 *   shoe sticks to it. Needs enough of the body in frame to detect a person.
 * - manual: the shoe appears on screen and the customer drags it onto their
 *   foot, pinches to resize, and twists to rotate — always works, on every
 *   device. We fall back to it automatically when tracking finds nothing.
 */
export function TryOn({ modelUrl, onClose }: TryOnProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const shoeRef = useRef<HTMLImageElement>(null)
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [spriteUrl, setSpriteUrl] = useState('')
  const [footVisible, setFootVisible] = useState(false)
  const [mode, setMode] = useState<'auto' | 'manual'>('auto')
  const modeRef = useRef<'auto' | 'manual'>('auto')
  const everDetectedRef = useRef(false)

  // Manual placement state (pixels / degrees), applied straight to the DOM.
  const manualRef = useRef({ x: 0, y: 0, width: 0, angle: -8, flip: false, placed: false })
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const pinchRef = useRef<{ dist: number; angle: number; width: number; rotation: number } | null>(null)

  const setModeBoth = (m: 'auto' | 'manual') => {
    modeRef.current = m
    setMode(m)
  }

  const applyManual = () => {
    const shoe = shoeRef.current
    const m = manualRef.current
    if (!shoe) return
    shoe.style.opacity = '1'
    shoe.style.width = `${m.width}px`
    shoe.style.transform = `translate(${m.x}px, ${m.y}px) translate(-50%, -50%) rotate(${m.angle}deg)${m.flip ? ' scaleX(-1)' : ''}`
  }

  const enterManual = () => {
    const container = containerRef.current
    if (!container) return
    const m = manualRef.current
    if (!m.placed) {
      m.x = container.clientWidth / 2
      m.y = container.clientHeight * 0.55
      m.width = Math.min(container.clientWidth, container.clientHeight) * 0.55
      m.placed = true
    }
    setModeBoth('manual')
    applyManual()
  }

  // Render the GLB once into a transparent side-view sprite.
  useEffect(() => {
    let disposed = false
    let viewer: (HTMLElement & { toDataURL?: (type?: string) => string }) | undefined
    ;(async () => {
      await ensureModelViewer()
      if (disposed) return
      viewer = document.createElement('model-viewer') as NonNullable<typeof viewer>
      viewer.setAttribute('src', modelUrl)
      viewer.setAttribute('camera-orbit', '90deg 86deg 108%')
      viewer.setAttribute('interaction-prompt', 'none')
      viewer.setAttribute('shadow-intensity', '0')
      viewer.setAttribute('loading', 'eager')
      // Must stay inside the viewport (transparent, behind the overlay):
      // model-viewer lazy-loads and stops rendering when off-screen, which
      // would leave the snapshot blank.
      viewer.style.cssText =
        'position:fixed;left:0;top:0;width:512px;height:512px;opacity:0;pointer-events:none;z-index:0;background:transparent;'
      document.body.appendChild(viewer)
      viewer.addEventListener('load', () => {
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            try {
              const url = viewer?.toDataURL?.('image/png')
              if (url && !disposed) setSpriteUrl(url)
            } catch {
              if (!disposed) {
                setPhase('error')
                setErrorMsg('حصلت مشكلة في تجهيز الموديل')
              }
            }
            viewer?.remove()
          }),
        )
      })
      viewer.addEventListener('error', () => {
        viewer?.remove()
        if (!disposed) {
          setPhase('error')
          setErrorMsg('مقدرناش نحمّل موديل المنتج')
        }
      })
    })()
    return () => {
      disposed = true
      viewer?.remove()
    }
  }, [modelUrl])

  // Camera + pose tracking loop.
  useEffect(() => {
    let stream: MediaStream | null = null
    let pose: { close: () => Promise<void> } | null = null
    let stopped = false
    let lastSeen = 0
    const smooth = { x: -1, y: 0, angle: 0, len: 0 }

    const onResults = (results: PoseResults) => {
      const video = videoRef.current
      const shoe = shoeRef.current
      const container = containerRef.current
      if (!video || !shoe || !container || stopped || modeRef.current !== 'auto') return

      const lm = results.poseLandmarks
      const pick = (heelIdx: number, toeIdx: number) => {
        const heel = lm?.[heelIdx]
        const toe = lm?.[toeIdx]
        if (!heel || !toe) return null
        const vis = Math.min(heel.visibility ?? 0, toe.visibility ?? 0)
        return vis > 0.4 ? { heel, toe, vis } : null
      }
      const left = pick(L_HEEL, L_TOE)
      const right = pick(R_HEEL, R_TOE)
      const foot = left && right ? (left.vis >= right.vis ? left : right) : (left ?? right)

      const now = performance.now()
      if (!foot) {
        if (now - lastSeen > 800) {
          shoe.style.opacity = '0'
          setFootVisible(false)
        }
        return
      }
      lastSeen = now
      everDetectedRef.current = true
      setFootVisible(true)

      // Map normalized video coords through the object-cover crop.
      const vw = video.videoWidth || 1280
      const vh = video.videoHeight || 720
      const cw = container.clientWidth
      const ch = container.clientHeight
      const scale = Math.max(cw / vw, ch / vh)
      const dx = (cw - vw * scale) / 2
      const dy = (ch - vh * scale) / 2
      const toPx = (p: Landmark) => ({ x: p.x * vw * scale + dx, y: p.y * vh * scale + dy })

      const heel = toPx(foot.heel)
      const toe = toPx(foot.toe)
      const angle = Math.atan2(toe.y - heel.y, toe.x - heel.x)
      const len = Math.hypot(toe.x - heel.x, toe.y - heel.y) * 1.45
      const cx = (heel.x + toe.x) / 2
      // Lift the shoe body slightly above the sole line.
      const lift = len * 0.16
      const cy = (heel.y + toe.y) / 2 - lift

      // Exponential smoothing to hide landmark jitter.
      const t = smooth.x < 0 ? 1 : 0.35
      smooth.x += (cx - smooth.x) * t
      smooth.y += (cy - smooth.y) * t
      let da = angle - smooth.angle
      while (da > Math.PI) da -= 2 * Math.PI
      while (da < -Math.PI) da += 2 * Math.PI
      smooth.angle += da * t
      smooth.len += (len - smooth.len) * t

      const deg = (smooth.angle * 180) / Math.PI
      const upsideDown = Math.abs(deg) > 90
      shoe.style.opacity = '1'
      shoe.style.width = `${smooth.len}px`
      shoe.style.transform = `translate(${smooth.x}px, ${smooth.y}px) translate(-50%, -50%) rotate(${deg}deg)${upsideDown ? ' scaleY(-1)' : ''}`
    }

    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
      } catch {
        setPhase('error')
        setErrorMsg('محتاجين إذن الكاميرا علشان تجرب الشوز — اسمح بالكاميرا وحاول تاني')
        return
      }
      const video = videoRef.current
      if (!video || stopped) {
        stream?.getTracks().forEach((tr) => tr.stop())
        return
      }
      video.srcObject = stream
      await video.play().catch(() => {})
      setPhase('ready')

      // If tracking finds nothing in time (foot-only framing, or devices
      // where the pose engine fails), fall back to manual placement.
      setTimeout(() => {
        if (!stopped && !everDetectedRef.current && modeRef.current === 'auto') enterManual()
      }, AUTO_TIMEOUT_MS)

      try {
        const mod = (await import('@mediapipe/pose')) as {
          Pose?: new (config: { locateFile: (f: string) => string }) => {
            setOptions: (o: Record<string, unknown>) => void
            onResults: (cb: (r: PoseResults) => void) => void
            send: (i: { image: HTMLVideoElement }) => Promise<void>
            close: () => Promise<void>
          }
        }
        const PoseCtor =
          mod.Pose ?? (window as unknown as { Pose: NonNullable<typeof mod.Pose> }).Pose
        const p = new PoseCtor({ locateFile: (f: string) => `/mediapipe/pose/${f}` })
        p.setOptions({
          modelComplexity: 0,
          smoothLandmarks: true,
          enableSegmentation: false,
          minDetectionConfidence: 0.4,
          minTrackingConfidence: 0.4,
        })
        p.onResults(onResults)
        pose = p

        const loop = async () => {
          if (stopped) return
          const v = videoRef.current
          if (v && v.readyState >= 2 && modeRef.current === 'auto') {
            await p.send({ image: v }).catch(() => {})
          }
          if (!stopped) setTimeout(loop, 33)
        }
        loop()
      } catch {
        // Pose engine unavailable on this device — manual mode still works.
        if (!stopped) enterManual()
      }
    })()

    return () => {
      stopped = true
      stream?.getTracks().forEach((tr) => tr.stop())
      pose?.close().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------------- manual gestures (drag / pinch / twist) ---------------- */

  const onPointerDown = (e: React.PointerEvent) => {
    if (modeRef.current !== 'manual') return
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()]
      pinchRef.current = {
        dist: Math.hypot(b.x - a.x, b.y - a.y),
        angle: Math.atan2(b.y - a.y, b.x - a.x),
        width: manualRef.current.width,
        rotation: manualRef.current.angle,
      }
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (modeRef.current !== 'manual') return
    const prev = pointersRef.current.get(e.pointerId)
    if (!prev) return
    const next = { x: e.clientX, y: e.clientY }
    pointersRef.current.set(e.pointerId, next)

    if (pointersRef.current.size === 1) {
      manualRef.current.x += next.x - prev.x
      manualRef.current.y += next.y - prev.y
    } else if (pointersRef.current.size === 2 && pinchRef.current) {
      const [a, b] = [...pointersRef.current.values()]
      const dist = Math.hypot(b.x - a.x, b.y - a.y)
      const angle = Math.atan2(b.y - a.y, b.x - a.x)
      manualRef.current.width = Math.min(
        1200,
        Math.max(60, (pinchRef.current.width * dist) / Math.max(1, pinchRef.current.dist)),
      )
      manualRef.current.angle =
        pinchRef.current.rotation + ((angle - pinchRef.current.angle) * 180) / Math.PI
    }
    applyManual()
  }

  const onPointerUp = (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId)
    if (pointersRef.current.size < 2) pinchRef.current = null
  }

  const nudge = (fn: (m: typeof manualRef.current) => void) => {
    fn(manualRef.current)
    applyManual()
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 overflow-hidden bg-black"
      style={{ cursor: 'auto', touchAction: mode === 'manual' ? 'none' : 'auto' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <video ref={videoRef} muted playsInline autoPlay className="absolute inset-0 h-full w-full object-cover" />
      {spriteUrl && (
        <img
          ref={shoeRef}
          src={spriteUrl}
          alt=""
          draggable={false}
          className="pointer-events-none absolute left-0 top-0 select-none"
          style={{ opacity: 0, transition: 'opacity 0.25s ease', willChange: 'transform' }}
        />
      )}

      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
        <span className="font-medium text-[18px] lowercase text-white" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
          vans — try on
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white px-5 py-2 font-medium text-[14px] uppercase text-black"
        >
          ✕ Close
        </button>
      </div>

      {phase === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <p className="animate-pulse text-center font-medium text-[16px] text-white">
            جاري تشغيل الكاميرا وتجهيز الموديل…
          </p>
        </div>
      )}

      {phase === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/85 p-6 text-center">
          <p className="font-medium text-[16px] leading-relaxed text-white">{errorMsg}</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white px-6 py-3 font-medium text-[14px] uppercase text-black"
          >
            رجوع
          </button>
        </div>
      )}

      {phase === 'ready' && mode === 'auto' && (
        <div className="absolute inset-x-0 bottom-8 flex flex-col items-center gap-3 px-6">
          {!footVisible && (
            <p className="rounded-full bg-black/60 px-6 py-3 text-center font-medium text-[14px] text-white" dir="rtl">
              بندوّر على رجلك… 👟
            </p>
          )}
          <button
            type="button"
            onClick={enterManual}
            className="rounded-full bg-white px-6 py-3 font-medium text-[14px] text-black"
            dir="rtl"
          >
            ✋ حط الشوز بنفسك (تحكم يدوي)
          </button>
        </div>
      )}

      {phase === 'ready' && mode === 'manual' && (
        <div className="absolute inset-x-0 bottom-6 flex flex-col items-center gap-3 px-4">
          <p className="rounded-full bg-black/60 px-5 py-2 text-center font-medium text-[13px] text-white" dir="rtl">
            اسحب الشوز على رجلك — قرّب صباعين لتكبيره ولفّه ✌️
          </p>
          <div className="flex items-center gap-2" dir="ltr">
            <CtrlBtn label="⟲" onClick={() => nudge((m) => (m.angle -= 12))} />
            <CtrlBtn label="⟳" onClick={() => nudge((m) => (m.angle += 12))} />
            <CtrlBtn label="−" onClick={() => nudge((m) => (m.width = Math.max(60, m.width * 0.88)))} />
            <CtrlBtn label="+" onClick={() => nudge((m) => (m.width = Math.min(1200, m.width * 1.14)))} />
            <CtrlBtn label="⇋" onClick={() => nudge((m) => (m.flip = !m.flip))} />
            <button
              type="button"
              onClick={() => {
                if (shoeRef.current) shoeRef.current.style.opacity = '0'
                everDetectedRef.current = false
                setFootVisible(false)
                setModeBoth('auto')
                setTimeout(() => {
                  if (modeRef.current === 'auto' && !everDetectedRef.current) enterManual()
                }, AUTO_TIMEOUT_MS)
              }}
              className="h-11 rounded-full bg-white/90 px-4 font-medium text-[13px] text-black"
              dir="rtl"
            >
              🎯 تتبع تلقائي
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CtrlBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-11 w-11 rounded-full bg-white/90 font-medium text-[18px] text-black"
    >
      {label}
    </button>
  )
}
