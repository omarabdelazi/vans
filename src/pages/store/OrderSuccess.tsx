import { Link, useLocation, useParams } from 'react-router-dom'
import { formatPrice } from '../../lib/api'

export default function OrderSuccess() {
  const { id } = useParams()
  const { state } = useLocation() as { state?: { total?: number; method?: string } }
  const cod = state?.method === 'cod'

  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <p className="font-medium text-[64px] leading-none">✓</p>
      <h1 className="mt-4 font-medium text-[34px] uppercase leading-none tracking-[-0.04em]">
        Order received
      </h1>
      <p className="mt-3 font-medium text-[15px] text-black/70">
        Order number: <span className="font-semibold">VANS-{String(id).padStart(5, '0')}</span>
        {state?.total != null && <> — {formatPrice(state.total)}</>}
      </p>
      <p className="mt-4 font-medium text-[14px] leading-[160%] text-black/60">
        {cod
          ? 'هنتواصل معاك قريبًا لتأكيد الطلب، والدفع كاش عند الاستلام.'
          : 'هنراجع صورة التحويل ونأكد الطلب، وهنتواصل معاك على رقم تليفونك قريبًا.'}
      </p>
      <Link
        to="/shop"
        className="mt-8 inline-block border border-black px-8 py-3 font-medium text-[13px] uppercase hover:bg-black hover:text-white"
      >
        Continue shopping
      </Link>
    </div>
  )
}
