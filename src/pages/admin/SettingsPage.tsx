import { useEffect, useState, type FormEvent } from 'react'
import { api, type Settings } from '../../lib/api'

const FIELDS: { key: string; label: string; hint?: string; dir?: 'ltr' }[] = [
  { key: 'instapay_number', label: 'رقم / عنوان انستا باي', hint: 'هيظهر للعميل في صفحة الدفع', dir: 'ltr' },
  { key: 'vodafone_cash_number', label: 'رقم فودافون كاش', hint: 'هيظهر للعميل في صفحة الدفع', dir: 'ltr' },
  { key: 'store_phone', label: 'تليفون المحل', hint: 'يظهر في الريسيت', dir: 'ltr' },
  { key: 'store_address', label: 'عنوان المحل', hint: 'يظهر في الريسيت' },
]

export default function SettingsPage() {
  const [values, setValues] = useState<Settings>({})
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<Settings>('/settings')
      .then(setValues)
      .catch((e) => setError(e.message))
  }, [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setSaved(false)
    try {
      await api('/admin/settings', { method: 'PUT', body: JSON.stringify(values) })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حصل خطأ')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 font-medium text-[28px]">الإعدادات</h1>
      <form onSubmit={submit} className="flex flex-col gap-5 bg-white p-6">
        {FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="mb-1 block font-medium text-[14px]">{f.label}</span>
            {f.hint && <span className="mb-1 block font-medium text-[12px] text-black/40">{f.hint}</span>}
            <input
              dir={f.dir}
              value={values[f.key] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              className="h-12 w-full border border-black/25 px-4 font-medium text-[14px] outline-none focus:border-black"
            />
          </label>
        ))}
        {error && <p className="font-medium text-[13px] text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="h-12 bg-black font-medium text-[15px] text-white disabled:opacity-40"
        >
          {saved ? 'تم الحفظ ✓' : busy ? 'جاري الحفظ…' : 'حفظ الإعدادات'}
        </button>
      </form>
    </div>
  )
}
