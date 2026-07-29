import { useEffect, useState } from 'react'

export type Breakpoint = 'mobile' | 'tablet' | 'desktop'

interface Viewport {
  width: number
  breakpoint: Breakpoint
  isTouch: boolean
  cols: number
}

function read(): Viewport {
  const width = window.innerWidth
  const breakpoint: Breakpoint = width < 640 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop'
  return {
    width,
    breakpoint,
    isTouch: window.matchMedia('(pointer: coarse)').matches,
    cols: width < 640 ? 2 : width < 1024 ? 3 : 4,
  }
}

export function useViewport(): Viewport {
  const [viewport, setViewport] = useState<Viewport>(read)

  useEffect(() => {
    const onResize = () => setViewport(read())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return viewport
}
