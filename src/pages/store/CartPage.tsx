import { Link, useNavigate } from 'react-router-dom'
import { formatPrice } from '../../lib/api'
import { useCart } from '../../lib/cart'

export default function CartPage() {
  const { items, total, updateQty, remove } = useCart()
  const navigate = useNavigate()

  if (items.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="font-medium text-[18px] uppercase text-black/50">Your cart is empty</p>
        <Link
          to="/shop"
          className="mt-6 inline-block border border-black px-8 py-3 font-medium text-[13px] uppercase hover:bg-black hover:text-white"
        >
          Continue shopping
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="mb-8 font-medium text-[42px] uppercase leading-none tracking-[-0.04em]">
        Cart
      </h1>
      <div className="flex flex-col gap-4">
        {items.map((i) => (
          <div
            key={`${i.productId}-${i.size}`}
            className="flex items-center gap-4 border-b border-black/10 pb-4"
          >
            <Link to={`/product/${i.productId}`} className="h-24 w-20 shrink-0 bg-neutral-100">
              {i.image && <img src={i.image} alt={i.name} className="h-full w-full object-cover" />}
            </Link>
            <div className="min-w-0 flex-1">
              <Link to={`/product/${i.productId}`} className="font-medium text-[14px] uppercase">
                {i.name}
              </Link>
              <p className="font-medium text-[11px] uppercase text-black/40">
                {i.code} — Size {i.size}
              </p>
              <p className="mt-1 font-medium text-[13px]">{formatPrice(i.price)}</p>
            </div>
            <div className="flex h-10 items-center border border-black/25">
              <button
                type="button"
                className="w-8 font-medium"
                onClick={() => updateQty(i.productId, i.size, i.qty - 1)}
              >
                −
              </button>
              <span className="w-8 text-center font-medium text-[13px]">{i.qty}</span>
              <button
                type="button"
                className="w-8 font-medium"
                onClick={() => updateQty(i.productId, i.size, i.qty + 1)}
              >
                +
              </button>
            </div>
            <p className="w-24 text-right font-medium text-[14px]">{formatPrice(i.price * i.qty)}</p>
            <button
              type="button"
              aria-label="Remove"
              onClick={() => remove(i.productId, i.size)}
              className="font-medium text-[13px] uppercase text-black/40 hover:text-black"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-col items-end gap-4">
        <p className="font-medium text-[20px]">
          Total: <span className="tracking-[-0.02em]">{formatPrice(total)}</span>
        </p>
        <button
          type="button"
          onClick={() => navigate('/checkout')}
          className="h-14 w-full max-w-sm bg-black font-medium text-[15px] uppercase text-white"
        >
          Checkout
        </button>
      </div>
    </div>
  )
}
