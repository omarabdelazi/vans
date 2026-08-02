import { useEffect, useRef, useState } from 'react'

interface DeepARTryOnProps {
  effectUrl: string
  licenseKey: string
  onClose: () => void
}

interface DeepARInstance {
  shutdown: () => void
}

/**
 * Real foot-tracking try-on powered by the DeepAR Web SDK (self-hosted under
 * public/deepar). The camera opens and the product's .deepar effect keeps the
 * shoe attached to the customer's foot.
 */
export function DeepARTryOn({ effectUrl, licenseKey, onClose }: DeepARTryOnProps) {
  const previewRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  const [detail, setDetail] = useState('')

  useEffect(() => {
    let instance: DeepARInstance | null = null
    let cancelled = false
    ;(async () => {
      try {
        const deepar = await import('deepar')
        // The SDK resolves its runtime (wasm + tracking models) from its
        // versioned CDN by default, which guarantees every file exists.
        const init = deepar.initialize({
          licenseKey,
          previewElement: previewRef.current!,
          effect: effectUrl,
          additionalOptions: {
            cameraConfig: {
              facingMode: 'environment',
            },
          },
        })
        const dar = await Promise.race([
          init,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('deepar-init-timeout')), 30_000),
          ),
        ])
        if (cancelled) {
          dar.shutdown()
          return
        }
        instance = dar
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
        } else if (/timeout/i.test(msg)) {
          setErrorMsg(
            'التحميل خد وقت أطول من اللازم — اتأكد من سرعة النت وجرب تاني، ولو استمرت اتأكد إن الدومين مسجّل في developer.deepar.ai',
          )
        } else {
          setErrorMsg('مقدرناش نشغّل التجربة — جرّب تاني أو من متصفح مختلف')
        }
      }
    })()
    return () => {
      cancelled = true
      instance?.shutdown()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectUrl, licenseKey])

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
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <p className="animate-pulse px-6 text-center font-medium text-[16px] text-white" dir="rtl">
            جاري تشغيل الكاميرا وتجهيز تتبع القدم… ثواني
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
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white px-6 py-3 font-medium text-[14px] uppercase text-black"
          >
            رجوع
          </button>
        </div>
      )}
    </div>
  )
}
