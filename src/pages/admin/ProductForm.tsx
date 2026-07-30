import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  api,
  SIZES,
  uploadFile,
  type Category,
  type ProductDetail,
} from '../../lib/api'

interface FormState {
  code: string
  name: string
  description: string
  category_id: number | null
  price: string
  on_sale: boolean
  sale_price: string
  image_url: string
  model_url: string
  has_ar: boolean
  active: boolean
  sizes: Record<number, string>
}

const emptyForm: FormState = {
  code: '',
  name: '',
  description: '',
  category_id: null,
  price: '',
  on_sale: false,
  sale_price: '',
  image_url: '',
  model_url: '',
  has_ar: false,
  active: true,
  sizes: Object.fromEntries(SIZES.map((s) => [s, '0'])),
}

export default function ProductForm() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(emptyForm)
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    api<Category[]>('/categories')
      .then(setCategories)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (isNew) {
      setForm(emptyForm)
      return
    }
    api<ProductDetail>(`/admin/products/${id}`)
      .then((p) =>
        setForm({
          code: p.code,
          name: p.name,
          description: p.description,
          category_id: p.category_id,
          price: String(p.price),
          on_sale: p.on_sale === 1,
          sale_price: p.sale_price != null ? String(p.sale_price) : '',
          image_url: p.image_url,
          model_url: p.model_url,
          has_ar: p.has_ar === 1,
          active: p.active === 1,
          sizes: Object.fromEntries(
            SIZES.map((s) => [s, String(p.sizes.find((x) => x.size === s)?.stock ?? 0)]),
          ),
        }),
      )
      .catch((e) => setError(e.message))
  }, [id, isNew])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const onUpload = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const res = await uploadFile('/admin/upload', file)
      set('image_url', res.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الرفع')
    } finally {
      setUploading(false)
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const body = {
        code: form.code,
        name: form.name,
        description: form.description,
        category_id: form.category_id,
        price: Number(form.price),
        on_sale: form.on_sale,
        sale_price: form.on_sale && form.sale_price ? Number(form.sale_price) : null,
        image_url: form.image_url,
        model_url: form.model_url,
        has_ar: form.has_ar && !!form.model_url,
        active: form.active,
        sizes: SIZES.map((s) => ({ size: s, stock: Number(form.sizes[s]) || 0 })),
      }
      if (isNew) {
        await api('/admin/products', { method: 'POST', body: JSON.stringify(body) })
      } else {
        await api(`/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(body) })
      }
      navigate('/admin/products')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حصل خطأ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-medium text-[28px]">{isNew ? 'منتج جديد' : 'تعديل المنتج'}</h1>
        <Link to="/admin/products" className="font-medium text-[14px] underline">
          ← رجوع للمنتجات
        </Link>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-5 bg-white p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="كود المنتج *">
            <input
              required
              dir="ltr"
              value={form.code}
              onChange={(e) => set('code', e.target.value)}
              placeholder="VN-001"
              className={inputCls}
            />
          </Field>
          <Field label="اسم المنتج *">
            <input required value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} />
          </Field>
        </div>

        <Field label="الوصف">
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            className="w-full resize-none border border-black/25 px-4 py-3 font-medium text-[14px] outline-none focus:border-black"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="القسم">
            <select
              value={form.category_id ?? ''}
              onChange={(e) => set('category_id', e.target.value ? Number(e.target.value) : null)}
              className={inputCls}
            >
              <option value="">بدون قسم</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="السعر (جنيه) *">
            <input
              required
              type="number"
              min="1"
              step="0.01"
              dir="ltr"
              value={form.price}
              onChange={(e) => set('price', e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        <div className="border border-black/10 bg-neutral-50 p-4">
          <label className="flex items-center gap-2 font-medium text-[15px]">
            <input
              type="checkbox"
              checked={form.on_sale}
              onChange={(e) => set('on_sale', e.target.checked)}
              className="h-4 w-4 accent-black"
            />
            المنتج عليه خصم (سيل)
          </label>
          {form.on_sale && (
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field label="السعر القديم (يظهر مشطوب)">
                <input disabled dir="ltr" value={form.price} className={`${inputCls} bg-neutral-100`} />
              </Field>
              <Field label="السعر الجديد بعد الخصم *">
                <input
                  required
                  type="number"
                  min="1"
                  step="0.01"
                  dir="ltr"
                  value={form.sale_price}
                  onChange={(e) => set('sale_price', e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
          )}
        </div>

        <Field label="صورة المنتج">
          <div className="flex items-start gap-4">
            <div className="h-32 w-24 shrink-0 overflow-hidden bg-neutral-100">
              {form.image_url && <img src={form.image_url} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => onUpload(e.target.files?.[0])}
                className="block w-full font-medium text-[13px] file:ml-3 file:border file:border-black file:bg-white file:px-4 file:py-2 file:font-medium"
              />
              {uploading && <p className="mt-1 font-medium text-[12px] text-black/50">جاري الرفع…</p>}
              <input
                dir="ltr"
                value={form.image_url}
                onChange={(e) => set('image_url', e.target.value)}
                placeholder="أو الصق رابط صورة https://…"
                className={`${inputCls} mt-2`}
              />
            </div>
          </div>
        </Field>

        <div className="border border-black/10 bg-neutral-50 p-4">
          <Field label="رابط موديل 3D (ملف GLB) — اختياري">
            <input
              dir="ltr"
              value={form.model_url}
              onChange={(e) => set('model_url', e.target.value)}
              placeholder="/models/shoe.glb أو رابط https://…"
              className={inputCls}
            />
          </Field>
          <label className="mt-3 flex items-center gap-2 font-medium text-[15px]">
            <input
              type="checkbox"
              checked={form.has_ar}
              disabled={!form.model_url}
              onChange={(e) => set('has_ar', e.target.checked)}
              className="h-4 w-4 accent-black"
            />
            تفعيل خاصية AR (العميل يجرب الشوز بكاميرا الموبايل)
          </label>
          <p className="mt-1 font-medium text-[12px] text-black/50">
            جرّب الرابط الجاهز /models/shoe.glb — أو ولّد موديل لمنتجك من Higgsfield وحط رابطه هنا.
          </p>
        </div>

        <div>
          <p className="mb-2 font-medium text-[14px]">المخزون لكل مقاس (EU 35 → 44)</p>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10" dir="ltr">
            {SIZES.map((s) => (
              <label key={s} className="block text-center">
                <span className="mb-1 block font-medium text-[12px] text-black/50">{s}</span>
                <input
                  type="number"
                  min="0"
                  value={form.sizes[s]}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sizes: { ...f.sizes, [s]: e.target.value } }))
                  }
                  className="h-11 w-full border border-black/25 text-center font-medium text-[14px] outline-none focus:border-black"
                />
              </label>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 font-medium text-[15px]">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => set('active', e.target.checked)}
            className="h-4 w-4 accent-black"
          />
          معروض في المتجر
        </label>

        {error && <p className="font-medium text-[13px] text-red-600">{error}</p>}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="h-12 flex-1 bg-black font-medium text-[15px] text-white disabled:opacity-40"
          >
            {saving ? 'جاري الحفظ…' : isNew ? 'إضافة المنتج' : 'حفظ التعديلات'}
          </button>
          <Link to="/admin/products" className="flex h-12 items-center border border-black px-6 font-medium text-[14px]">
            إلغاء
          </Link>
        </div>
      </form>
    </div>
  )
}

const inputCls =
  'h-12 w-full border border-black/25 bg-white px-4 font-medium text-[14px] outline-none focus:border-black'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-medium text-[13px] text-black/60">{label}</span>
      {children}
    </label>
  )
}
