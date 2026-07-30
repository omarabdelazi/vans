import { useEffect, useState, type FormEvent } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { api } from '../../lib/api'
import Home from './Home'
import Categories from './Categories'
import Products from './Products'
import ProductForm from './ProductForm'
import Orders from './Orders'
import Messages from './Messages'
import Pos from './Pos'
import SettingsPage from './SettingsPage'

export default function AdminApp() {
  const [authed, setAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    api('/admin/me')
      .then(() => setAuthed(true))
      .catch(() => setAuthed(false))
  }, [])

  if (authed === null) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-neutral-100 font-medium">
        جاري التحميل…
      </div>
    )
  }
  if (!authed) return <Login onSuccess={() => setAuthed(true)} />

  return (
    <div dir="rtl" lang="ar" className="flex min-h-screen bg-neutral-100 text-black">
      <aside className="flex w-56 shrink-0 flex-col bg-black p-4 text-white print:hidden">
        <span className="mb-8 font-medium text-[28px] lowercase" dir="ltr">
          vans<span className="align-super text-[12px]">®</span>
        </span>
        <nav className="flex flex-col gap-1 font-medium text-[15px]">
          <AdminLink to="/admin" end label="الرئيسية" />
          <AdminLink to="/admin/orders" label="الطلبات" />
          <AdminLink to="/admin/products" label="المنتجات" />
          <AdminLink to="/admin/categories" label="الأقسام" />
          <AdminLink to="/admin/messages" label="الرسائل" />
          <AdminLink to="/admin/pos" label="نقطة البيع" />
          <AdminLink to="/admin/settings" label="الإعدادات" />
        </nav>
        <button
          type="button"
          onClick={async () => {
            await api('/admin/logout', { method: 'POST' }).catch(() => {})
            location.href = '/admin'
          }}
          className="mt-auto rounded px-3 py-2 text-right font-medium text-[14px] text-white/60 hover:bg-white/10 hover:text-white"
        >
          تسجيل الخروج
        </button>
      </aside>
      <main className="min-w-0 flex-1 p-5 lg:p-8">
        <Routes>
          <Route index element={<Home />} />
          <Route path="orders" element={<Orders />} />
          <Route path="products" element={<Products />} />
          <Route path="products/new" element={<ProductForm />} />
          <Route path="products/:id" element={<ProductForm />} />
          <Route path="categories" element={<Categories />} />
          <Route path="messages" element={<Messages />} />
          <Route path="pos" element={<Pos />} />
          <Route path="settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  )
}

function AdminLink({ to, label, end }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `rounded px-3 py-2 transition-colors ${
          isActive ? 'bg-white text-black' : 'text-white/70 hover:bg-white/10 hover:text-white'
        }`
      }
    >
      {label}
    </NavLink>
  )
}

function Login({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api('/admin/login', { method: 'POST', body: JSON.stringify({ password }) })
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حصل خطأ')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center bg-black px-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white p-8">
        <p className="font-medium text-[32px] lowercase" dir="ltr">
          vans<span className="align-super text-[13px]">®</span>
        </p>
        <p className="mt-1 font-medium text-[15px] text-black/60">لوحة التحكم — تسجيل الدخول</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="كلمة السر"
          className="mt-6 h-12 w-full border border-black/25 px-4 font-medium outline-none focus:border-black"
          autoFocus
        />
        {error && <p className="mt-2 font-medium text-[13px] text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy || !password}
          className="mt-4 h-12 w-full bg-black font-medium text-[15px] text-white disabled:opacity-40"
        >
          {busy ? '…' : 'دخول'}
        </button>
      </form>
    </div>
  )
}
