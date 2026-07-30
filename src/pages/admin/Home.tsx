import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type Stats } from '../../lib/api'

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    api<Stats>('/admin/stats')
      .then(setStats)
      .catch(() => {})
  }, [])

  return (
    <div>
      <h1 className="mb-6 font-medium text-[28px]">أهلاً بيك 👋</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard to="/admin/orders" label="طلبات قيد المراجعة" value={stats?.pending_orders} accent />
        <StatCard to="/admin/messages" label="رسائل غير مقروءة" value={stats?.unread_messages} />
        <StatCard to="/admin/products" label="منتجات نشطة" value={stats?.active_products} />
        <StatCard to="/admin/products" label="منتجات نفذت من المخزن" value={stats?.out_of_stock} />
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/admin/products/new" className="bg-black px-5 py-3 font-medium text-[14px] text-white">
          + إضافة منتج جديد
        </Link>
        <Link to="/admin/pos" className="border border-black px-5 py-3 font-medium text-[14px]">
          فتح نقطة البيع
        </Link>
      </div>
    </div>
  )
}

function StatCard({
  to,
  label,
  value,
  accent,
}: {
  to: string
  label: string
  value: number | undefined
  accent?: boolean
}) {
  return (
    <Link
      to={to}
      className={`block p-5 transition-transform hover:-translate-y-0.5 ${
        accent ? 'bg-black text-white' : 'bg-white'
      }`}
    >
      <p className={`font-medium text-[13px] ${accent ? 'text-white/60' : 'text-black/50'}`}>{label}</p>
      <p className="mt-2 font-medium text-[36px] leading-none">{value ?? '—'}</p>
    </Link>
  )
}
