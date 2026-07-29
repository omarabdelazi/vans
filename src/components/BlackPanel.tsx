import { useMemo, type Ref } from 'react'
import { GALLERY_IMAGES } from '../assets'
import { buildLayout } from '../layout'

interface BlackPanelProps {
  panelRef: Ref<HTMLDivElement>
  wrapRef: Ref<HTMLDivElement>
  cols: number
}

export function BlackPanel({ panelRef, wrapRef, cols }: BlackPanelProps) {
  const rows = useMemo(() => buildLayout(GALLERY_IMAGES.length, cols), [cols])

  return (
    <div
      ref={panelRef}
      className="fixed inset-0 z-10 bg-black"
      style={{ transform: 'translateY(100vh)' }}
    >
      <div ref={wrapRef} className="w-full" style={{ paddingTop: 'min(400px, 40vh)' }}>
        <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {rows.flatMap((row, r) =>
            row.map((imgIdx, c) =>
              imgIdx === -1 ? (
                <div key={`${r}-${c}`} className="aspect-[2/3]" />
              ) : (
                <div key={`${r}-${c}`} className="bp-cell aspect-[2/3]">
                  <div
                    className="bp-card h-full w-full"
                    style={{
                      transform: 'scale(0)',
                      transformOrigin: c < cols / 2 ? 'right bottom' : 'left bottom',
                    }}
                  >
                    <img
                      src={GALLERY_IMAGES[imgIdx]}
                      alt={`Archive look ${imgIdx + 1}`}
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                  </div>
                </div>
              ),
            ),
          )}
        </div>
      </div>
    </div>
  )
}
