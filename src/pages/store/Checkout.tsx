import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, formatPrice, uploadFile, type Settings } from '../../lib/api'
import { useCart } from '../../lib/cart'

type Method = 'cod' | 'instapay' | 'vodafone_cash'

export default function Checkout() {
  const { items, total, clear } = useCart()
  const navigate = useNavigate()
  const [settings, setSettings] = useState<Settings>({})
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [method, setMethod] = useState<Method>('cod')
  const [proof, setProof] = useState<File | null>(null)
  const [proofPreview, setProofPreview] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api<Settings>('/settings')
      .then(setSettings)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!proof) {
      setProofPreview('')
      return
    }
    const url = URL.createObjectURL(proof)
    setProofPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [proof])

  if (items.length === 0) {
    return (
      <p className="py-24 text-center font-medium uppercase text-black/50">
        Your cart is empty — <Link to="/shop" className="underline">go to shop</Link>
      </p>
    )
  }

  const needsProof = method !== 'cod'
  const walletNumber =
    method === 'instapay' ? settings.instapay_number : settings.vodafone_cash_number

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (needsProof && !proof) {
      setError('من فضلك ارفق صورة إيصال التحويل — please attach the transfer screenshot.')
      return
    }
    setSubmitting(true)
    try {
      let proofKey = ''
      if (needsProof && proof) {
        const up = await uploadFile('/upload-proof', proof)
        proofKey = up.key
      }
      const res = await api<{ id: number; total: number }>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          customer_name: name,
          phone,
          address,
          payment_method: method,
          payment_proof_key: proofKey,
          items: items.map((i) => ({ product_id: i.productId, size: i.size, qty: i.qty })),
        }),
      })
      clear()
      navigate(`/order-success/${res.id}`, { state: { total: res.total, method } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-8 font-medium text-[42px] uppercase leading-none tracking-[-0.04em]">
        Checkout
      </h1>

      <form onSubmit={submit} className="flex flex-col gap-5">
        <Field label="Full name — الاسم">
          <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Phone — رقم التليفون">
          <input
            required
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputCls}
            placeholder="01XXXXXXXXX"
          />
        </Field>
        <Field label="Delivery address — العنوان بالتفصيل">
          <textarea
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={3}
            className={`${inputCls} resize-none py-3`}
          />
        </Field>

        <div>
          <p className="mb-2 font-medium text-[13px] uppercase">Payment — طريقة الدفع</p>
          <div className="flex flex-col gap-2">
            <PayOption
              checked={method === 'cod'}
              onChange={() => setMethod('cod')}
              title="Cash on delivery — الدفع عند الاستلام"
              subtitle="Pay in cash when your order arrives."
            />
            <PayOption
              checked={method === 'instapay'}
              onChange={() => setMethod('instapay')}
              title="InstaPay — انستا باي"
              subtitle="Transfer, then attach a screenshot of the receipt."
            />
            <PayOption
              checked={method === 'vodafone_cash'}
              onChange={() => setMethod('vodafone_cash')}
              title="Vodafone Cash — فودافون كاش"
              subtitle="Transfer, then attach a screenshot of the receipt."
            />
          </div>
        </div>

        {needsProof && (
          <div className="border border-black/15 bg-neutral-50 p-4">
            <p className="font-medium text-[14px]">
              {walletNumber
                ? `حوّل إجمالي الطلب (${formatPrice(total)}) على الرقم: `
                : 'رقم التحويل هيظهر هنا بعد ضبطه من الداشبورد — '}
              {walletNumber && <span dir="ltr" className="font-semibold tracking-wide">{walletNumber}</span>}
            </p>
            <p className="mt-1 font-medium text-[12px] text-black/60">
              Transfer the total then upload the receipt screenshot below.
            </p>
            <label className="mt-3 block">
              <span className="mb-1 block font-medium text-[13px] uppercase">
                Transfer screenshot — صورة الإيصال
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setProof(e.target.files?.[0] ?? null)}
                className="block w-full font-medium text-[13px] file:mr-3 file:border file:border-black file:bg-white file:px-4 file:py-2 file:font-medium file:uppercase"
              />
            </label>
            {proofPreview && (
              <img src={proofPreview} alt="receipt preview" className="mt-3 max-h-48 border border-black/10" />
            )}
          </div>
        )}

        <div className="mt-2 border-t border-black/10 pt-4">
          <div className="mb-4 flex justify-between font-medium text-[18px]">
            <span className="uppercase">Total</span>
            <span>{formatPrice(total)}</span>
          </div>
          {error && <p className="mb-3 font-medium text-[13px] text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="h-14 w-full bg-black font-medium text-[15px] uppercase text-white disabled:opacity-40"
          >
            {submitting ? 'Placing order…' : 'Place order — تأكيد الطلب'}
          </button>
        </div>
      </form>
    </div>
  )
}

const inputCls =
  'h-12 w-full border border-black/25 px-4 font-medium text-[14px] outline-none focus:border-black'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-medium text-[13px] uppercase">{label}</span>
      {children}
    </label>
  )
}

function PayOption({
  checked,
  onChange,
  title,
  subtitle,
}: {
  checked: boolean
  onChange: () => void
  title: string
  subtitle: string
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 border p-3 transition-colors ${
        checked ? 'border-black bg-black/[0.03]' : 'border-black/15 hover:border-black/40'
      }`}
    >
      <input type="radio" name="payment" checked={checked} onChange={onChange} className="accent-black" />
      <span>
        <span className="block font-medium text-[14px]">{title}</span>
        <span className="block font-medium text-[12px] text-black/50">{subtitle}</span>
      </span>
    </label>
  )
}
