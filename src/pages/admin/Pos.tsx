import { useEffect, useRef, useState } from 'react'
import {
  api,
  effectivePrice,
  formatPrice,
  type Order,
  type ProductDetail,
  type Product,
  type Settings,
} from '../../lib/api'
import { ReceiptModal } from './Receipt'

interface TicketLine {
  productId: number
  code: string
  name: string
  size: number
  qty: number
  price: number
  maxStock: number
}

export default function Pos() {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [picked, setPicked] = useState<ProductDetail | null>(null)
  const [ticket, setTicket] = useState<TicketLine[]>([])
  const [customer, setCustomer] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [receipt, setReceipt] = useState<Order | null>(null)
  const [settings, setSettings] = useState<Settings>({})
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api<Settings>('/settings')
      .then(setSettings)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!search.trim()) {
      setResults([])
      return
    }
    const t = setTimeout(() => {
      api<Product[]>(`/products?search=${encodeURIComponent(search.trim())}`)
        .then(setResults)
        .catch(() => {})
    }, 200)
    return () => clearTimeout(t)
  }, [search])

  const pick = async (p: Product) => {
    const detail = await api<ProductDetail>(`/products/${p.id}`).catch(() => null)
    if (detail) setPicked(detail)
  }

  const addLine = (size: number, stock: number) => {
    if (!picked || stock <= 0) return
    const price = effectivePrice(picked)
    setTicket((prev) => {
      const existing = prev.find((l) => l.productId === picked.id && l.size === size)
      if (existing) {
        return prev.map((l) =>
          l === existing ? { ...l, qty: Math.min(l.maxStock, l.qty + 1) } : l,
        )
      }
      return [
        ...prev,
        {
          productId: picked.id,
          code: picked.code,
          name: picked.name,
          size,
          qty: 1,
          price,
          maxStock: stock,
        },
      ]
    })
    setPicked(null)
    setSearch('')
    searchRef.current?.focus()
  }

  const updateQty = (line: TicketLine, qty: number) => {
    setTicket((prev) =>
      qty <= 0
        ? prev.filter((l) => l !== line)
        : prev.map((l) => (l === line ? { ...l, qty: Math.min(l.maxStock, qty) } : l)),
    )
  }

  const total = ticket.reduce((sum, l) => sum + l.price * l.qty, 0)

  const completeSale = async () => {
    setBusy(true)
    setError('')
    try {
      const order = await api<Order>('/admin/pos-sale', {
        method: 'POST',
        body: JSON.stringify({
          customer_name: customer,
          items: ticket.map((l) => ({ product_id: l.productId, size: l.size, qty: l.qty })),
        }),
      })
      setTicket([])
      setCustomer('')
      setReceipt(order)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حصل خطأ')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <h1 className="mb-2 font-medium text-[28px]">نقطة البيع (المحل)</h1>
      <p className="mb-6 font-medium text-[13px] text-black/50">
        البيع من هنا بيخصم من المخزون فورًا وبيطبع ريسيت للعميل.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Search + pick */}
        <div>
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="اكتب كود المنتج أو اسمه…"
            className="h-14 w-full border border-black/25 bg-white px-4 font-medium text-[16px] outline-none focus:border-black"
            autoFocus
          />
          <div className="mt-2 flex flex-col gap-1">
            {results.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => pick(p)}
                className="flex items-center gap-3 bg-white p-3 text-right hover:bg-neutral-50"
              >
                <div className="h-12 w-10 shrink-0 overflow-hidden bg-neutral-100">
                  {p.image_url && <img src={p.image_url} alt="" className="h-full w-full object-cover" />}
                </div>
                <span className="flex-1 font-medium text-[14px]">
                  {p.name}
                  <span className="block text-[12px] text-black/40" dir="ltr">
                    {p.code}
                  </span>
                </span>
                <span className="font-medium text-[14px]" dir="ltr">
                  {formatPrice(effectivePrice(p))}
                </span>
              </button>
            ))}
          </div>

          {picked && (
            <div className="mt-4 border border-black bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-medium text-[16px]">
                  {picked.name} <span className="text-[13px] text-black/40" dir="ltr">({picked.code})</span>
                </p>
                <button type="button" onClick={() => setPicked(null)} className="font-medium">
                  ✕
                </button>
              </div>
              <p className="mb-2 font-medium text-[13px] text-black/60">اختار المقاس:</p>
              <div className="grid grid-cols-5 gap-2" dir="ltr">
                {picked.sizes
                  .filter((s) => s.stock > 0)
                  .map((s) => (
                    <button
                      key={s.size}
                      type="button"
                      onClick={() => addLine(s.size, s.stock)}
                      className="border border-black/25 py-2 text-center font-medium hover:border-black hover:bg-black hover:text-white"
                    >
                      {s.size}
                      <span className="block text-[10px] opacity-60">{s.stock} متاح</span>
                    </button>
                  ))}
              </div>
              {picked.sizes.every((s) => s.stock === 0) && (
                <p className="font-medium text-[13px] text-red-600">نفذ من المخزون بالكامل.</p>
              )}
            </div>
          )}
        </div>

        {/* Ticket */}
        <div className="bg-white p-4">
          <p className="mb-3 font-medium text-[16px]">الفاتورة الحالية</p>
          {ticket.length === 0 && (
            <p className="py-8 text-center font-medium text-[13px] text-black/40">
              دور على منتج واختار المقاس علشان يضاف هنا.
            </p>
          )}
          <div className="flex flex-col gap-2">
            {ticket.map((l, idx) => (
              <div key={idx} className="flex items-center gap-3 border-b border-black/5 pb-2">
                <span className="flex-1 font-medium text-[14px]">
                  {l.name}
                  <span className="block text-[12px] text-black/40" dir="ltr">
                    {l.code} — مقاس {l.size}
                  </span>
                </span>
                <div className="flex h-9 items-center border border-black/25" dir="ltr">
                  <button type="button" className="w-8 font-medium" onClick={() => updateQty(l, l.qty - 1)}>
                    −
                  </button>
                  <span className="w-8 text-center font-medium text-[13px]">{l.qty}</span>
                  <button type="button" className="w-8 font-medium" onClick={() => updateQty(l, l.qty + 1)}>
                    +
                  </button>
                </div>
                <span className="w-24 text-left font-medium text-[14px]" dir="ltr">
                  {formatPrice(l.price * l.qty)}
                </span>
              </div>
            ))}
          </div>

          {ticket.length > 0 && (
            <>
              <input
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="اسم العميل (اختياري)"
                className="mt-4 h-11 w-full border border-black/25 px-3 font-medium text-[14px] outline-none focus:border-black"
              />
              <div className="mt-4 flex items-center justify-between font-medium text-[20px]">
                <span>الإجمالي</span>
                <span dir="ltr">{formatPrice(total)}</span>
              </div>
              {error && <p className="mt-2 font-medium text-[13px] text-red-600">{error}</p>}
              <button
                type="button"
                disabled={busy}
                onClick={completeSale}
                className="mt-4 h-14 w-full bg-black font-medium text-[16px] text-white disabled:opacity-40"
              >
                {busy ? '…' : '✓ إتمام البيع وخصم المخزون'}
              </button>
            </>
          )}
        </div>
      </div>

      {receipt && <ReceiptModal order={receipt} settings={settings} onClose={() => setReceipt(null)} />}
    </div>
  )
}
