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

/**
 * Camera-based virtual try-on: MediaPipe Pose (self-hosted, runs fully in the
 * browser) finds the customer's foot and the product's 3D model is rendered
 * as a sprite that sticks to it — position, size, and rotation follow the
 * foot in real time. No paid services involved.
 */
export function TryOn({ modelUrl, onClose }: TryOnProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const shoeRef = useRef<HTMLImageElement>(null)
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [spriteUrl, setSpriteUrl] = useState('')
  const [footVisible, setFootVisible] = useState(false)

  // Render the GLB once into a transparent side-view sprite.
  useEffect(() => {
    let disposed = false
    let viewer: HTMLElement & { toDataURL?: (type?: string) => string }
    ;(async () => {
      await ensureModelViewer()
      if (disposed) return
      viewer = document.createElement('model-viewer') as typeof viewer
      viewer.setAttribute('src', modelUrl)
      viewer.setAttribute('camera-orbit', '90deg 86deg 108%')
      viewer.setAttribute('interaction-prompt', 'none')
      viewer.setAttribute('shadow-intensity', '0')
      viewer.style.cssText =
        'position:fixed;left:-9999px;top:0;width:512px;height:512px;background:transparent;'
      document.body.appendChild(viewer)
      viewer.addEventListener('load', () => {
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            try {
              const url = viewer.toDataURL?.('image/png')
              if (url && !disposed) setSpriteUrl(url)
            } catch {
              if (!disposed) {
                setPhase('error')
                setErrorMsg('حصلت مشكلة في تجهيز الموديل')
              }
            }
            viewer.remove()
          }),
        )
      })
      viewer.addEventListener('error', () => {
        viewer.remove()
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
      if (!video || !shoe || !container || stopped) return

      const lm = results.poseLandmarks
      const pick = (heelIdx: number, toeIdx: number) => {
        const heel = lm?.[heelIdx]
        const toe = lm?.[toeIdx]
        if (!heel || !toe) return null
        const vis = Math.min(heel.visibility ?? 0, toe.visibility ?? 0)
        return vis > 0.55 ? { heel, toe, vis } : null
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
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })
        p.onResults(onResults)
        pose = p
        setPhase('ready')

        const loop = async () => {
          if (stopped) return
          const v = videoRef.current
          if (v && v.readyState >= 2) {
            await p.send({ image: v }).catch(() => {})
          }
          if (!stopped) setTimeout(loop, 33)
        }
        loop()
      } catch {
        setPhase('error')
        setErrorMsg('مقدرناش نشغّل تتبع القدم على الجهاز ده')
      }
    })()

    return () => {
      stopped = true
      stream?.getTracks().forEach((tr) => tr.stop())
      pose?.close().catch(() => {})
    }
  }, [])

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 overflow-hidden bg-black" style={{ cursor: 'auto' }}>
      <video ref={videoRef} muted playsInline autoPlay className="absolute inset-0 h-full w-full object-cover" />
      {spriteUrl && (
        <img
          ref={shoeRef}
          src={spriteUrl}
          alt=""
          draggable={false}
          className="pointer-events-none absolute left-0 top-0"
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

      {phase === 'ready' && !footVisible && (
        <div className="absolute inset-x-0 bottom-10 flex justify-center px-6">
          <p
            className="rounded-full bg-black/60 px-6 py-3 text-center font-medium text-[15px] text-white"
            dir="rtl"
          >
            وجّه الكاميرا على رجلك بالكامل (من الركبة للأرض) 👟
          </p>
        </div>
      )}
    </div>
  )
}
