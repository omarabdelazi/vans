import { useEffect, useRef } from 'react'

/**
 * Desktop-only cursor: a slowly spinning 3D sneaker that follows the mouse.
 * The GLB can be swapped for any model (e.g. one generated on Higgsfield).
 */
export function Shoe3DCursor() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    import('@google/model-viewer')
  }, [])

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
      className="pointer-events-none fixed z-[15] hidden lg:block"
      style={{ left: -300, top: -300, transform: 'translate(-50%, -50%)' }}
    >
      <model-viewer
        src="/models/shoe.glb"
        alt=""
        auto-rotate
        auto-rotate-delay="0"
        rotation-per-second="40deg"
        interaction-prompt="none"
        disable-zoom
        disable-pan
        disable-tap
        shadow-intensity="0"
        style={{ width: 170, height: 170, backgroundColor: 'transparent', pointerEvents: 'none' }}
      />
    </div>
  )
}
