import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, effectivePrice, formatPrice, type Product } from '../../lib/api'

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')

  const load = () =>
    api<Product[]>('/admin/products')
      .then(setProducts)
      .catch(() => {})

  useEffect(() => {
    load()
  }, [])

  const remove = async (p: Product) => {
    if (!confirm(`حذف "${p.name}" (${p.code}) نهائياً؟`)) return
    await api(`/admin/products/${p.id}`, { method: 'DELETE' }).catch(() => {})
    load()
  }

  const q = search.trim().toLowerCase()
  const filtered = q
    ? products.filter(
        (p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q),
      )
    : products

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-medium text-[28px]">المنتجات</h1>
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الكود…"
            className="h-11 w-56 border border-black/25 bg-white px-4 font-medium text-[14px] outline-none focus:border-black"
          />
          <Link to="/admin/products/new" className="flex h-11 items-center bg-black px-5 font-medium text-[14px] text-white">
            + منتج جديد
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto bg-white">
        <table className="w-full text-right font-medium text-[14px]">
          <thead>
            <tr className="border-b border-black/10 text-[12px] text-black/50">
              <th className="p-3">المنتج</th>
              <th className="p-3">الكود</th>
              <th className="p-3">القسم</th>
              <th className="p-3">السعر</th>
              <th className="p-3">المخزون</th>
              <th className="p-3">مميزات</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-black/5 hover:bg-neutral-50">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-10 shrink-0 overflow-hidden bg-neutral-100">
                      {p.image_url && (
                        <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <span>{p.name}</span>
                    {!p.active && (
                      <span className="rounded bg-neutral-200 px-2 py-0.5 text-[11px]">مخفي</span>
                    )}
                  </div>
                </td>
                <td className="p-3 text-black/60" dir="ltr">
                  {p.code}
                </td>
                <td className="p-3 text-black/60">{p.category_name ?? '—'}</td>
                <td className="p-3">
                  {p.on_sale === 1 && p.sale_price != null ? (
                    <span>
                      <span className="text-black/40 line-through">{formatPrice(p.price)}</span>{' '}
                      <span className="text-red-600">{formatPrice(effectivePrice(p))}</span>
                    </span>
                  ) : (
                    formatPrice(p.price)
                  )}
                </td>
                <td className={`p-3 ${p.total_stock === 0 ? 'text-red-600' : ''}`}>
                  {p.total_stock === 0 ? 'نفذ' : `${p.total_stock} قطعة`}
                </td>
                <td className="p-3">
                  <span className="flex gap-1">
                    {p.featured === 1 && (
                      <span className="bg-yellow-400 px-1.5 py-0.5 text-[11px]">⭐ رئيسية</span>
                    )}
                    {p.model_url && (
                      <span className="border border-black px-1.5 py-0.5 text-[11px]">3D</span>
                    )}
                    {p.has_ar === 1 && (
                      <span className="bg-black px-1.5 py-0.5 text-[11px] text-white">AR</span>
                    )}
                    {p.on_sale === 1 && (
                      <span className="bg-red-600 px-1.5 py-0.5 text-[11px] text-white">خصم</span>
                    )}
                  </span>
                </td>
                <td className="p-3">
                  <span className="flex justify-end gap-3">
                    <Link to={`/admin/products/${p.id}`} className="underline">
                      تعديل
                    </Link>
                    <button type="button" onClick={() => remove(p)} className="text-red-600 underline">
                      حذف
                    </button>
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="p-10 text-center text-black/40">
                  لا توجد منتجات — ابدأ بإضافة أول منتج.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
