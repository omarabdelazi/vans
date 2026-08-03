import { useRef, useState } from 'react'
import pkg from 'deepar/package.json'
import { api } from '../lib/api'

interface Step {
  name: string
  status: 'wait' | 'run' | 'ok' | 'fail'
  detail?: string
  ms?: number
}

const INITIAL: Step[] = [
  { name: 'مفتاح ترخيص DeepAR في إعدادات الموقع', status: 'wait' },
  { name: 'تحميل ملف الشوز (.deepar) من موقعك', status: 'wait' },
  { name: 'الوصول لسيرفر التحميل (jsdelivr CDN)', status: 'wait' },
  { name: 'تحميل محرك التتبع (6MB) وقياس سرعة النت', status: 'wait' },
  { name: 'إذن الكاميرا الخلفية', status: 'wait' },
  { name: 'تشغيل محرك DeepAR (ترخيص + كاميرا)', status: 'wait' },
  { name: 'تحميل فلتر تجريبي رسمي (اختبار مرجعي)', status: 'wait' },
  { name: 'تفعيل تتبع القدم (من غير الشوز)', status: 'wait' },
  { name: 'تحميل ملف الشوز بتاعك', status: 'wait' },
]

const CDN = `https://cdn.jsdelivr.net/npm/deepar@${pkg.version}/`
const EFFECT = '/effects/vans-shoe.deepar'

/**
 * Self-diagnosis page for the try-on feature: runs each requirement as a
 * separate step so a single screenshot shows exactly which link is broken.
 */
export default function ArCheck() {
  const [steps, setSteps] = useState<Step[]>(INITIAL)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  const update = (i: number, patch: Partial<Step>) =>
    setSteps((s) => s.map((st, idx) => (idx === i ? { ...st, ...patch } : st)))

  const timed = async <T,>(i: number, fn: () => Promise<T>): Promise<T | null> => {
    update(i, { status: 'run' })
    const t = performance.now()
    try {
      const out = await fn()
      update(i, { status: 'ok', ms: Math.round(performance.now() - t) })
      return out
    } catch (err) {
      update(i, {
        status: 'fail',
        ms: Math.round(performance.now() - t),
        detail: (err instanceof Error ? err.message : String(err)).slice(0, 140),
      })
      return null
    }
  }

  const run = async () => {
    setRunning(true)
    setDone(false)
    setSteps(INITIAL)

    const licenseKey = await timed(0, async () => {
      const s = await api<Record<string, string>>('/settings')
      const key = s.deepar_license_key
      if (!key) throw new Error('المفتاح فاضي في الإعدادات')
      update(0, { detail: `${key.slice(0, 10)}…` })
      return key
    })

    await timed(1, async () => {
      const res = await fetch(EFFECT, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      update(1, { detail: `${(blob.size / 1024 / 1024).toFixed(1)}MB` })
    })

    const cdnOk = await timed(2, async () => {
      const res = await fetch(`${CDN}VERSION.txt`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return true
    })

    if (cdnOk) {
      await timed(3, async () => {
        const t = performance.now()
        const res = await fetch(`${CDN}wasm/deepar.wasm`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const blob = await res.blob()
        const secs = (performance.now() - t) / 1000
        update(3, { detail: `${(blob.size / 1024 / 1024 / secs).toFixed(1)} MB/s` })
      })
    } else {
      update(3, { status: 'fail', detail: 'اتخطت — السيرفر مش متاح' })
    }

    const camOk = await timed(4, async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      })
      stream.getTracks().forEach((tr) => tr.stop())
      return true
    })

    if (licenseKey && camOk) {
      interface Engine {
        shutdown: () => void
        switchEffect: (e: string, o?: object) => Promise<void>
        clearEffect: () => void
        initializeFootTracking: () => void
        isFootTrackingInitialized: () => boolean
      }
      let dar: Engine | null = null
      const engineOk = await timed(5, async () => {
        const deepar = await import('deepar')
        const params = {
          licenseKey,
          previewElement: previewRef.current!,
          additionalOptions: { cameraConfig: { facingMode: 'environment' } },
        } as unknown as Parameters<typeof deepar.initialize>[0]
        dar = (await Promise.race([
          deepar.initialize(params),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('timeout بعد 60 ثانية')), 60_000),
          ),
        ])) as unknown as Engine
        return true
      })

      if (engineOk && dar) {
        const engine: Engine = dar

        // Reference test: an official face filter from the SDK package.
        await timed(6, async () => {
          await Promise.race([
            engine.switchEffect(`${CDN}effects/koala`),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('timeout بعد 60 ثانية')), 60_000),
            ),
          ])
          engine.clearEffect()
        })

        // Foot tracking alone, without any effect.
        const footOk = await timed(7, async () => {
          engine.initializeFootTracking()
          const start = performance.now()
          while (!engine.isFootTrackingInitialized()) {
            if (performance.now() - start > 90_000) throw new Error('timeout بعد 90 ثانية')
            await new Promise((r) => setTimeout(r, 500))
          }
          return true
        })

        // Finally the actual shoe effect.
        if (footOk) {
          await timed(8, async () => {
            await Promise.race([
              engine.switchEffect(EFFECT),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('timeout بعد 60 ثانية')), 60_000),
              ),
            ])
          })
        } else {
          update(8, { status: 'fail', detail: 'اتخطت — تتبع القدم مشتغلش' })
        }
        engine.shutdown()
      } else {
        for (const i of [6, 7, 8]) update(i, { status: 'fail', detail: 'اتخطت — المحرك مشتغلش' })
      }
    } else {
      for (const i of [5, 6, 7, 8]) update(i, { status: 'fail', detail: 'اتخطت — خطوة سابقة فشلت' })
    }

    setRunning(false)
    setDone(true)
  }

  return (
    <div dir="rtl" className="min-h-screen bg-white p-5 text-black">
      <h1 className="font-medium text-[26px]">فحص خاصية التجربة على الرجل 👟</h1>
      <p className="mt-1 font-medium text-[13px] text-black/60">
        دوس "ابدأ الفحص"، اسمح بالكاميرا لو طلبها، واستنى لحد ما كل الخطوات تخلص — وبعدين صوّر
        الشاشة وابعتها لكلود.
      </p>

      <button
        type="button"
        onClick={run}
        disabled={running}
        className="mt-4 h-12 w-full max-w-sm bg-black font-medium text-[15px] text-white disabled:opacity-40"
      >
        {running ? 'جاري الفحص…' : '▶ ابدأ الفحص'}
      </button>

      <div className="mt-6 flex max-w-xl flex-col gap-2">
        {steps.map((s, i) => (
          <div key={i} className="flex items-start gap-3 border border-black/10 p-3">
            <span className="text-[18px]">
              {s.status === 'wait' && '⚪'}
              {s.status === 'run' && '⏳'}
              {s.status === 'ok' && '✅'}
              {s.status === 'fail' && '❌'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-[14px]">{s.name}</p>
              {(s.detail || s.ms != null) && (
                <p className="break-all font-medium text-[12px] text-black/50" dir="ltr">
                  {s.ms != null ? `${s.ms}ms` : ''} {s.detail ?? ''}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {done && (
        <p className="mt-5 max-w-xl border border-black bg-neutral-50 p-4 font-medium text-[14px]">
          📸 صوّر الشاشة دي كاملة وابعتها لكلود — النتيجة بتوضح بالظبط فين المشكلة.
        </p>
      )}

      <div ref={previewRef} className="pointer-events-none fixed left-0 top-0 h-2 w-2 opacity-0" />
    </div>
  )
}
