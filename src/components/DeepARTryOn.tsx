import { useEffect, useRef, useState } from 'react'

interface DeepARTryOnProps {
  effectUrl: string
  licenseKey: string
  onClose: () => void
}

interface DeepARInstance {
  shutdown: () => void
  switchEffect: (
    effect: string,
    options?: {
      trackingInit?: { foot?: boolean }
      onProgress?: (p: { loaded: number; total?: number }) => void
    },
  ) => Promise<void>
  initializeFootTracking: () => void
  isFootTrackingInitialized: () => boolean
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`${label}-timeout`)), ms)),
  ])
}

/**
 * Real foot-tracking try-on powered by the DeepAR Web SDK (self-hosted under
 * public/deepar). The camera opens and the product's .deepar effect keeps the
 * shoe attached to the customer's foot.
 */
export function DeepARTryOn({ effectUrl, licenseKey, onClose }: DeepARTryOnProps) {
  const previewRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<'loading' | 'effect' | 'ready' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [slow, setSlow] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)

  const [detail, setDetail] = useState('')

  useEffect(() => {
    let instance: DeepARInstance | null = null
    let cancelled = false
    setPhase('loading')
    setSlow(false)
    const slowTimer = setTimeout(() => setSlow(true), 8000)
    ;(async () => {
      try {
        const deepar = await import('deepar')
        // Two stages: start the engine + camera first (fast, camera becomes
        // visible), then load the shoe effect with foot tracking explicitly
        // requested — isolating failures and avoiding lazy-init deadlocks.
        // Proven working sequence (verified step-by-step on device):
        // engine without effect → initializeFootTracking + poll → then the
        // shoe effect. Loading the effect together with lazy foot-tracking
        // init deadlocks on mobile.
        const params = {
          licenseKey,
          previewElement: previewRef.current!,
          additionalOptions: {
            cameraConfig: {
              facingMode: 'environment',
            },
          },
        } as unknown as Parameters<typeof deepar.initialize>[0]
        const dar = (await withTimeout(
          deepar.initialize(params),
          60_000,
          'engine',
        )) as unknown as DeepARInstance
        if (cancelled) {
          dar.shutdown()
          return
        }
        instance = dar
        setPhase('effect')

        dar.initializeFootTracking()
        const footStart = performance.now()
        while (!dar.isFootTrackingInitialized()) {
          if (cancelled) return
          if (performance.now() - footStart > 90_000) throw new Error('foot-timeout')
          await new Promise((r) => setTimeout(r, 400))
        }

        await withTimeout(
          dar.switchEffect(effectUrl, {
            onProgress: (p) => {
              if (p?.total) setProgress(Math.min(100, Math.round((p.loaded / p.total) * 100)))
            },
          }),
          120_000,
          'effect',
        )
        if (cancelled) return
        setPhase('ready')
      } catch (err) {
        if (cancelled) return
        console.error('DeepAR init failed:', err)
        const msg = err instanceof Error ? err.message : String(err)
        setPhase('error')
        setDetail(msg.slice(0, 160))
        if (/denied|permission|NotAllowed/i.test(msg)) {
          setErrorMsg('محتاجين إذن الكاميرا — اسمح بالكاميرا من المتصفح وحاول تاني')
        } else if (/license|validate|401|403/i.test(msg)) {
          setErrorMsg(
            'مشكلة في الترخيص — اتأكد إن الدومين vans-yxm.pages.dev مضاف في مشروعك على developer.deepar.ai',
          )
        } else if (/engine-timeout/i.test(msg)) {
          setErrorMsg('تشغيل المحرك خد وقت طويل — دوس "جرّب تاني"')
        } else if (/foot-timeout/i.test(msg)) {
          setErrorMsg('تجهيز تتبع القدم خد وقت طويل — دوس "جرّب تاني"')
        } else if (/effect-timeout/i.test(msg)) {
          setErrorMsg('تحميل الشوز علّق — دوس "جرّب تاني"، ولو اتكررت صوّر الشاشة وابعتها لكلود')
        } else {
          setErrorMsg('مقدرناش نشغّل التجربة — جرّب تاني أو من متصفح مختلف')
        }
      }
    })()
    return () => {
      cancelled = true
      clearTimeout(slowTimer)
      instance?.shutdown()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectUrl, licenseKey, attempt])

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black" style={{ cursor: 'auto' }}>
      <div ref={previewRef} className="absolute inset-0" />

      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4">
        <span
          className="font-medium text-[18px] lowercase text-white"
          style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}
        >
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
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 px-6">
          <p className="animate-pulse text-center font-medium text-[16px] text-white" dir="rtl">
            جاري تشغيل الكاميرا وتجهيز تتبع القدم…
          </p>
          <p className="text-center font-medium text-[13px] text-white/60" dir="rtl">
            لو المتصفح طلب إذن الكاميرا، اسمح بيه ✅
          </p>
          {slow && (
            <p className="text-center font-medium text-[13px] text-white/60" dir="rtl">
              أول مرة بياخد وقت أطول شوية علشان بيحمّل محرك التتبع — المرات الجاية هتفتح فورًا
            </p>
          )}
        </div>
      )}

      {phase === 'effect' && (
        <div className="absolute inset-x-0 bottom-8 z-10 flex justify-center px-6">
          <p className="animate-pulse rounded-full bg-black/60 px-6 py-3 text-center font-medium text-[14px] text-white" dir="rtl">
            {progress != null
              ? `بيحمّل الشوز… ${progress}% 👟`
              : 'الكاميرا شغالة — بيحمّل الشوز وتتبع القدم… ⏳'}
          </p>
        </div>
      )}

      {phase === 'ready' && (
        <div className="absolute inset-x-0 bottom-8 z-10 flex justify-center px-6">
          <p className="rounded-full bg-black/60 px-6 py-3 text-center font-medium text-[14px] text-white" dir="rtl">
            وجّه الكاميرا على رجلك والشوز هيركب لوحده 👟
          </p>
        </div>
      )}

      {phase === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/90 p-6 text-center">
          <p className="font-medium text-[16px] leading-relaxed text-white" dir="rtl">
            {errorMsg}
          </p>
          {detail && (
            <p className="max-w-full break-all font-medium text-[11px] text-white/40" dir="ltr">
              {detail}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setAttempt((a) => a + 1)}
              className="rounded-full bg-white px-6 py-3 font-medium text-[14px] text-black"
            >
              🔄 جرّب تاني
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/40 px-6 py-3 font-medium text-[14px] text-white"
            >
              رجوع
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
