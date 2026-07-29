import { useEffect, useRef } from 'react'

export function CustomCursor() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onMove = (e: MouseEvent) => {
      el.style.left = `${e.clientX}px`
      el.style.top = `${e.clientY}px`
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  return (
    <div
      ref={ref}
      className="pointer-events-none fixed z-50 hidden lg:block"
      style={{ left: -100, top: -100, transform: 'translate(-50%, -50%)', mixBlendMode: 'exclusion' }}
    >
      <svg width={48} height={48} viewBox="0 0 48 48" fill="none">
        <circle cx={24} cy={24} r={22.75} stroke="#fff" strokeWidth={2.5} />
        <path
          d="M22.9 11h2.2v26h-2.2z M11 22.9h26v2.2H11z M15.11 16.67l1.56-1.56 16.22 16.22-1.56 1.56z M31.33 15.11l1.56 1.56-16.22 16.22-1.56-1.56z"
          fill="#fff"
        />
      </svg>
    </div>
  )
}
