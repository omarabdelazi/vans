import type { DetailedHTMLProps, HTMLAttributes } from 'react'

interface ModelViewerAttributes
  extends DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> {
  src?: string
  alt?: string
  ar?: boolean
  'ar-modes'?: string
  'ar-placement'?: string
  'ar-scale'?: string
  'auto-rotate'?: boolean
  'auto-rotate-delay'?: number | string
  'rotation-per-second'?: string
  'camera-controls'?: boolean
  'disable-zoom'?: boolean
  'disable-pan'?: boolean
  'disable-tap'?: boolean
  'interaction-prompt'?: string
  'shadow-intensity'?: number | string
  'camera-orbit'?: string
  'field-of-view'?: string
  exposure?: number | string
  loading?: string
  reveal?: string
  poster?: string
}

declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        'model-viewer': ModelViewerAttributes
      }
    }
  }
}

export {}
