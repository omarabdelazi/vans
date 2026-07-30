import { useEffect, useState } from 'react'
import { api, formatPrice, type Order, type Settings } from '../../lib/api'
import { fmtDate, methodLabel, orderNumber, statusLabel } from '../../lib/format'
import { ReceiptModal } from './Receipt'

const TABS = [
  { key: '', label: 'الكل' },
  { key: 'pending', label: 'قيد المراجعة' },
  { key: 'confirmed', label: 'مؤكد' },
  { key: 'delivered', label: 'تم التسليم' },
  { key: 'rejected', label: 'مرفوض' },
]

export default function Orders() {
  const [tab, setTab] = useState('pending')
  const [orders, setOrders] = useState<Order[]>([])
  const [open, setOpen] = useState<Order | null>(null)
  const [receipt, setReceipt] = useState<Order | null>(null)
  const [settings, setSettings] = useState<Settings>({})
  const [error, setError] = useState('')

  const load = (status = tab) => {
    const qs = status ? `?status=${status}` : ''
    api<Order[]>(`/admin/orders${qs}`)
      .then(setOrders)
      .catch((e) => setError(e.message))
  }

  useEffect(() => {
    load(tab)
  }, [tab])

  useEffect(() => {
    api<Settings>('/settings')
      .then(setSettings)
      .catch(() => {})
  }, [])

  const openDetails = async (o: Order) => {
    const full = await api<Order>(`/admin/orders/${o.id}`).catch(() => null)
    if (full) setOpen(full)
  }

  const setStatus = async (o: Order, status: string) => {
    setError('')
    try {
      const updated = await api<Order>(`/admin/orders/${o.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      })
      setOpen(updated)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حصل خطأ')
    }
  }

  return (
    <div>
      <h1 className="mb-6 font-medium text-[28px]">الطلبات</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`h-10 rounded-full border px-4 font-medium text-[13px] ${
              tab === t.key ? 'border-black bg-black text-white' : 'border-black/20 bg-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {error && <p className="mb-3 font-medium text-[13px] text-red-600">{error}</p>}

      <div className="flex flex-col gap-2">
        {orders.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => openDetails(o)}
            className="flex flex-wrap items-center gap-x-6 gap-y-1 bg-white p-4 text-right hover:bg-neutral-50"
          >
            <span className="font-medium text-[15px]" dir="ltr">
              {orderNumber(o.id)}
            </span>
            <span className="font-medium text-[13px] text-black/60" dir="ltr">
              {fmtDate(o.created_at)}
            </span>
            <span className="font-medium text-[14px]">{o.customer_name}</span>
            <span className="font-medium text-[13px] text-black/60">{methodLabel(o.payment_method)}</span>
            {o.source === 'pos' && (
              <span className="rounded bg-neutral-200 px-2 py-0.5 font-medium text-[11px]">محل</span>
            )}
            <span className="mr-auto font-medium text-[15px]" dir="ltr">
              {formatPrice(o.total)}
            </span>
            <StatusBadge status={o.status} />
          </button>
        ))}
        {orders.length === 0 && (
          <p className="py-12 text-center font-medium text-black/40">لا توجد طلبات هنا.</p>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/60 p-4" dir="rtl">
          <div className="w-full max-w-2xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-medium text-[20px]" dir="ltr">
                {orderNumber(open.id)}
              </h2>
              <button type="button" onClick={() => setOpen(null)} className="font-medium text-[15px]">
                ✕ إغلاق
              </button>
            </div>

            <div className="grid gap-2 font-medium text-[14px]">
              <p>العميل: {open.customer_name}</p>
              {open.phone && (
                <p>
                  التليفون: <span dir="ltr">{open.phone}</span>
                </p>
              )}
              {open.address && <p>العنوان: {open.address}</p>}
              <p>
                الدفع: {methodLabel(open.payment_method)} — الحالة: <StatusBadge status={open.status} />
              </p>
              <p dir="ltr" className="text-black/50">
                {fmtDate(open.created_at)}
              </p>
            </div>

            {open.payment_proof_key && (
              <div className="mt-4">
                <p className="mb-2 font-medium text-[14px]">صورة إيصال التحويل:</p>
                <a href={`/api/files/${open.payment_proof_key}`} target="_blank" rel="noreferrer">
                  <img
                    src={`/api/files/${open.payment_proof_key}`}
                    alt="إيصال التحويل"
                    className="max-h-72 border border-black/10"
                  />
                </a>
              </div>
            )}

            <table className="mt-4 w-full font-medium text-[14px]">
              <thead>
                <tr className="border-b border-black/10 text-right text-[12px] text-black/50">
                  <th className="p-2">الصنف</th>
                  <th className="p-2 text-center">مقاس</th>
                  <th className="p-2 text-center">كمية</th>
                  <th className="p-2 text-left">السعر</th>
                </tr>
              </thead>
              <tbody>
                {open.items?.map((it) => (
                  <tr key={it.id} className="border-b border-black/5">
                    <td className="p-2">
                      {it.name} <span className="text-[12px] text-black/40" dir="ltr">({it.code})</span>
                    </td>
                    <td className="p-2 text-center">{it.size}</td>
                    <td className="p-2 text-center">{it.qty}</td>
                    <td className="p-2 text-left" dir="ltr">
                      {formatPrice(it.unit_price * it.qty)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-left font-medium text-[17px]" dir="ltr">
              {formatPrice(open.total)}
            </p>

            {error && <p className="mt-2 font-medium text-[13px] text-red-600">{error}</p>}

            <div className="mt-5 flex flex-wrap gap-2">
              {open.status !== 'confirmed' && open.status !== 'delivered' && (
                <ActionBtn onClick={() => setStatus(open, 'confirmed')} primary>
                  ✓ تأكيد الطلب (يخصم من المخزون)
                </ActionBtn>
              )}
              {open.status === 'confirmed' && (
                <ActionBtn onClick={() => setStatus(open, 'delivered')} primary>
                  تم التسليم
                </ActionBtn>
              )}
              {open.status !== 'rejected' && (
                <ActionBtn onClick={() => setStatus(open, 'rejected')} danger>
                  رفض {open.stock_applied ? '(يرجع للمخزون)' : ''}
                </ActionBtn>
              )}
              {(open.status === 'confirmed' || open.status === 'delivered') && (
                <ActionBtn onClick={() => setReceipt(open)}>🖨 طباعة ريسيت</ActionBtn>
              )}
            </div>
          </div>
        </div>
      )}

      {receipt && <ReceiptModal order={receipt} settings={settings} onClose={() => setReceipt(null)} />}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'pending'
      ? 'bg-yellow-100 text-yellow-800'
      : status === 'confirmed'
        ? 'bg-blue-100 text-blue-800'
        : status === 'delivered'
          ? 'bg-green-100 text-green-800'
          : 'bg-red-100 text-red-800'
  return <span className={`rounded px-2 py-0.5 font-medium text-[12px] ${cls}`}>{statusLabel(status)}</span>
}

function ActionBtn({
  children,
  onClick,
  primary,
  danger,
}: {
  children: React.ReactNode
  onClick: () => void
  primary?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-11 px-4 font-medium text-[13px] ${
        primary
          ? 'bg-black text-white'
          : danger
            ? 'border border-red-600 text-red-600'
            : 'border border-black'
      }`}
    >
      {children}
    </button>
  )
}
