import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, effectivePrice, formatPrice, type Category, type Product } from '../../lib/api'

export default function Shop() {
  const [params, setParams] = useSearchParams()
  const category = params.get('category') ?? ''
  const [search, setSearch] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api<Category[]>('/categories')
      .then(setCategories)
      .catch(() => {})
  }, [])

  useEffect(() => {
    const qs = new URLSearchParams()
    if (category) qs.set('category', category)
    if (search.trim()) qs.set('search', search.trim())
    const t = setTimeout(() => {
      api<Product[]>(`/products?${qs}`)
        .then((p) => {
          setProducts(p)
          setError('')
        })
        .catch((e) => setError(e.message))
    }, 200)
    return () => clearTimeout(t)
  }, [category, search])

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4">
        <h1 className="font-medium text-[42px] uppercase leading-none tracking-[-0.04em] lg:text-[64px]">
          Shop
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <CategoryChip label="All" active={!category} onClick={() => setParams({})} />
          {categories.map((c) => (
            <CategoryChip
              key={c.id}
              label={c.name}
              active={category === c.slug}
              onClick={() => setParams({ category: c.slug })}
            />
          ))}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="ml-auto h-9 w-44 rounded-full border border-black/20 px-4 font-medium text-[13px] outline-none focus:border-black"
          />
        </div>
      </div>

      {error && <p className="py-16 text-center font-medium text-red-600">{error}</p>}
      {products && products.length === 0 && !error && (
        <p className="py-24 text-center font-medium text-[15px] uppercase text-black/50">
          No products yet — check back soon.
        </p>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
        {products?.map((p) => (
          <Link key={p.id} to={`/product/${p.id}`} className="group">
            <div className="relative aspect-[3/4] overflow-hidden bg-neutral-100">
              {p.image_url ? (
                <img
                  src={p.image_url}
                  alt={p.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-medium text-[13px] uppercase text-black/30">
                  vans
                </div>
              )}
              <div className="absolute left-2 top-2 flex gap-1">
                {p.on_sale === 1 && p.sale_price != null && (
                  <span className="bg-black px-2 py-1 font-medium text-[10px] uppercase text-white">
                    Sale
                  </span>
                )}
                {p.model_url && (
                  <span className="border border-black bg-white px-2 py-1 font-medium text-[10px] uppercase">
                    3D
                  </span>
                )}
              </div>
              {p.total_stock === 0 && (
                <div className="absolute inset-x-0 bottom-0 bg-white/90 py-1 text-center font-medium text-[11px] uppercase">
                  Sold out
                </div>
              )}
            </div>
            <div className="mt-2 flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-[14px] uppercase leading-tight">{p.name}</p>
                <p className="font-medium text-[11px] uppercase text-black/40">{p.code}</p>
              </div>
              <p className="text-right font-medium text-[14px]">
                {p.on_sale === 1 && p.sale_price != null && (
                  <span className="mr-2 text-black/40 line-through">{formatPrice(p.price)}</span>
                )}
                {formatPrice(effectivePrice(p))}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 rounded-full border px-4 font-medium text-[13px] uppercase transition-colors ${
        active ? 'border-black bg-black text-white' : 'border-black/20 hover:border-black'
      }`}
    >
      {label}
    </button>
  )
}
