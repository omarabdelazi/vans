import { useMemo, type Ref } from 'react'
import { Link } from 'react-router-dom'
import { buildLayout } from '../layout'

export interface GalleryItem {
  img: string
  link?: string
  /** contain = show the whole photo on a white card (product shots);
   *  cover (default) = fill the cell, cropping if needed. */
  fit?: 'cover' | 'contain'
}

interface BlackPanelProps {
  panelRef: Ref<HTMLDivElement>
  wrapRef: Ref<HTMLDivElement>
  cols: number
  items: GalleryItem[]
}

export function BlackPanel({ panelRef, wrapRef, cols, items }: BlackPanelProps) {
  const rows = useMemo(() => buildLayout(items.length, cols), [items.length, cols])

  return (
    <div
      ref={panelRef}
      className="fixed inset-0 z-10 bg-black"
      style={{ transform: 'translateY(100vh)' }}
    >
      <div ref={wrapRef} className="w-full" style={{ paddingTop: 'min(400px, 40vh)' }}>
        <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {rows.flatMap((row, r) =>
            row.map((itemIdx, c) => {
              if (itemIdx === -1) return <div key={`${r}-${c}`} className="aspect-[2/3]" />
              const item = items[itemIdx]
              const contain = item.fit === 'contain'
              const card = (
                <div
                  className={`bp-card flex h-full w-full items-center justify-center ${contain ? 'bg-white' : ''}`}
                  style={{
                    transform: 'scale(0)',
                    transformOrigin: c < cols / 2 ? 'right bottom' : 'left bottom',
                  }}
                >
                  <img
                    src={item.img}
                    alt={`Product ${itemIdx + 1}`}
                    className={`h-full w-full ${contain ? 'object-contain' : 'object-cover'}`}
                    draggable={false}
                  />
                </div>
              )
              return (
                <div key={`${r}-${c}`} className="bp-cell aspect-[2/3]">
                  {item.link ? (
                    <Link to={item.link} className="block h-full w-full">
                      {card}
                    </Link>
                  ) : (
                    card
                  )}
                </div>
              )
            }),
          )}
        </div>
      </div>
    </div>
  )
}
