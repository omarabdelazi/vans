import { useEffect, useState, type FormEvent } from 'react'
import { api, type Category } from '../../lib/api'

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState('')

  const load = () =>
    api<Category[]>('/categories')
      .then(setCategories)
      .catch((e) => setError(e.message))

  useEffect(() => {
    load()
  }, [])

  const addCategory = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setError('')
    try {
      await api('/admin/categories', { method: 'POST', body: JSON.stringify({ name }) })
      setName('')
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حصل خطأ')
    }
  }

  const saveEdit = async (id: number) => {
    setError('')
    try {
      await api(`/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify({ name: editName }) })
      setEditing(null)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حصل خطأ')
    }
  }

  const remove = async (c: Category) => {
    if (!confirm(`حذف قسم "${c.name}"؟ المنتجات اللي فيه هتفضل موجودة بدون قسم.`)) return
    await api(`/admin/categories/${c.id}`, { method: 'DELETE' }).catch(() => {})
    load()
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 font-medium text-[28px]">الأقسام</h1>

      <form onSubmit={addCategory} className="mb-6 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="اسم القسم الجديد (مثلاً: Sneakers)"
          className="h-12 flex-1 border border-black/25 bg-white px-4 font-medium outline-none focus:border-black"
        />
        <button type="submit" className="bg-black px-6 font-medium text-[14px] text-white">
          إضافة
        </button>
      </form>
      {error && <p className="mb-4 font-medium text-[13px] text-red-600">{error}</p>}

      <div className="flex flex-col gap-2">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center gap-3 bg-white p-4">
            {editing === c.id ? (
              <>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-10 flex-1 border border-black/25 px-3 font-medium outline-none focus:border-black"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => saveEdit(c.id)}
                  className="bg-black px-4 py-2 font-medium text-[13px] text-white"
                >
                  حفظ
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-2 font-medium text-[13px] text-black/50"
                >
                  إلغاء
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 font-medium text-[16px]">{c.name}</span>
                <span className="font-medium text-[12px] text-black/40">{c.product_count} منتج</span>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(c.id)
                    setEditName(c.name)
                  }}
                  className="font-medium text-[13px] underline"
                >
                  تعديل
                </button>
                <button
                  type="button"
                  onClick={() => remove(c)}
                  className="font-medium text-[13px] text-red-600 underline"
                >
                  حذف
                </button>
              </>
            )}
          </div>
        ))}
        {categories.length === 0 && (
          <p className="py-8 text-center font-medium text-black/40">لا توجد أقسام بعد — ضيف أول قسم.</p>
        )}
      </div>
    </div>
  )
}
