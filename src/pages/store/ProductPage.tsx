import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  api,
  effectivePrice,
  formatPrice,
  SIZES,
  type ProductDetail,
} from '../../lib/api'
import { useCart } from '../../lib/cart'
import { ensureModelViewer } from '../../lib/modelViewer'

type ARViewer = HTMLElement & {
  activateAR?: () => Promise<void>
  canActivateAR?: boolean
  loaded?: boolean
}

export default function ProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { add } = useCart()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [error, setError] = useState('')
  const [view, setView] = useState<'photo' | '3d'>('photo')
  const [size, setSize] = useState<number | null>(null)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [arMsg, setArMsg] = useState('')
  const viewerRef = useRef<ARViewer | null>(null)

  useEffect(() => {
    ensureModelViewer()
  }, [])

  useEffect(() => {
    api<ProductDetail>(`/products/${id}`)
      .then((p) => {
        setProduct(p)
        if (!p.image_url && p.model_url) setView('3d')
      })
      .catch((e) => setError(e.message))
  }, [id])

  if (error) {
    return (
      <p className="py-24 text-center font-medium uppercase text-black/50">
        Product not found — <Link to="/shop" className="underline">back to shop</Link>
      </p>
    )
  }
  if (!product) return <p className="py-24 text-center font-medium uppercase text-black/40">Loading…</p>

  const stockFor = (s: number) => product.sizes.find((x) => x.size === s)?.stock ?? 0
  const selectedStock = size != null ? stockFor(size) : 0
  const price = effectivePrice(product)

  // Launch the device's native AR (Quick Look on iOS, Scene Viewer on
  // Android): real lighting, shadows, and true-to-size placement.
  const tryOnAR = (tries = 0) => {
    if (tries === 0) {
      setArMsg('')
      if (view !== '3d') setView('3d')
    }
    const v = viewerRef.current
    if (!v || !v.loaded) {
      if (tries < 60) setTimeout(() => tryOnAR(tries + 1), 150)
      else setArMsg('الموديل واخد وقت في التحميل — حاول تاني بعد ثواني')
      return
    }
    if (v.canActivateAR === false) {
      setArMsg('التجربة بالكاميرا بتشتغل من الموبايل — افتح صفحة المنتج من تليفونك 📱')
      return
    }
    v.activateAR?.()
  }

  const addToCart = () => {
    if (size == null) return
    add(
      {
        productId: product.id,
        code: product.code,
        name: product.name,
        image: product.image_url,
        size,
        price,
      },
      qty,
    )
    setAdded(true)
    setTimeout(() => setAdded(false), 1600)
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div>
        {product.model_url && (
          <div className="mb-3 flex gap-2">
            <ViewTab label="Photo" active={view === 'photo'} onClick={() => setView('photo')} />
            <ViewTab label="3D View" active={view === '3d'} onClick={() => setView('3d')} />
          </div>
        )}
        <div className="relative aspect-square overflow-hidden bg-neutral-100">
          {view === '3d' && product.model_url ? (
            <model-viewer
              ref={viewerRef}
              src={product.model_url}
              alt={product.name}
              loading="eager"
              camera-controls
              auto-rotate
              interaction-prompt="none"
              shadow-intensity="1"
              ar={product.has_ar === 1}
              ar-modes="webxr scene-viewer quick-look"
              ar-placement="floor"
              style={{ width: '100%', height: '100%' }}
            >
              {product.has_ar === 1 && (
                <button
                  slot="ar-button"
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black px-6 py-3 font-medium text-[13px] uppercase text-white"
                >
                  Try it on your feet (AR)
                </button>
              )}
            </model-viewer>
          ) : product.image_url ? (
            <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-medium uppercase text-black/30">
              vans
            </div>
          )}
        </div>
        {product.has_ar === 1 && product.model_url && (
          <>
            <button
              type="button"
              onClick={() => tryOnAR()}
              className="mt-3 flex h-12 w-full items-center justify-center gap-2 bg-black font-medium text-[14px] uppercase text-white"
            >
              👟 See it in AR — شوفه قدامك بالكاميرا
            </button>
            {arMsg && (
              <p className="mt-2 font-medium text-[13px] text-red-600" dir="rtl">
                {arMsg}
              </p>
            )}
            <p className="mt-2 font-medium text-[12px] text-black/50" dir="rtl">
              بيفتح الكاميرا ويحط الشوز قدامك بحجمه الحقيقي وإضاءة واقعية — قرّبه من رجلك ولف
              حواليه. (من الموبايل)
            </p>
          </>
        )}
      </div>

      <div>
        {product.category_name && (
          <Link
            to={`/shop?category=${product.category_slug}`}
            className="font-medium text-[12px] uppercase text-black/40 hover:text-black"
          >
            {product.category_name}
          </Link>
        )}
        <h1 className="mt-1 font-medium text-[34px] uppercase leading-none tracking-[-0.04em] lg:text-[46px]">
          {product.name}
        </h1>
        <p className="mt-1 font-medium text-[12px] uppercase text-black/40">Code: {product.code}</p>

        <div className="mt-5 flex items-baseline gap-3">
          {product.on_sale === 1 && product.sale_price != null && (
            <span className="font-medium text-[20px] text-black/40 line-through">
              {formatPrice(product.price)}
            </span>
          )}
          <span className="font-medium text-[30px] tracking-[-0.02em]">{formatPrice(price)}</span>
          {product.on_sale === 1 && product.sale_price != null && (
            <span className="bg-black px-2 py-1 font-medium text-[11px] uppercase text-white">
              -{Math.round((1 - product.sale_price / product.price) * 100)}%
            </span>
          )}
        </div>

        {product.description && (
          <p className="mt-5 max-w-prose whitespace-pre-line font-medium text-[14px] leading-[150%] text-black/70">
            {product.description}
          </p>
        )}

        <div className="mt-7">
          <p className="mb-2 font-medium text-[13px] uppercase">Size (EU)</p>
          <div className="grid max-w-sm grid-cols-5 gap-2">
            {SIZES.map((s) => {
              const stock = stockFor(s)
              const disabled = stock === 0
              return (
                <button
                  key={s}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setSize(s)
                    setQty(1)
                  }}
                  className={`h-11 border font-medium text-[14px] transition-colors ${
                    size === s
                      ? 'border-black bg-black text-white'
                      : disabled
                        ? 'cursor-not-allowed border-black/10 text-black/20 line-through'
                        : 'border-black/25 hover:border-black'
                  }`}
                >
                  {s}
                </button>
              )
            })}
          </div>
          {size != null && selectedStock > 0 && selectedStock <= 3 && (
            <p className="mt-2 font-medium text-[12px] uppercase text-red-600">
              Only {selectedStock} left
            </p>
          )}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <div className="flex h-12 items-center border border-black/25">
            <button
              type="button"
              className="w-10 font-medium text-[18px]"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
            >
              −
            </button>
            <span className="w-8 text-center font-medium">{qty}</span>
            <button
              type="button"
              className="w-10 font-medium text-[18px]"
              onClick={() => setQty((q) => Math.min(Math.max(1, selectedStock), q + 1))}
            >
              +
            </button>
          </div>
          <button
            type="button"
            disabled={size == null || selectedStock === 0}
            onClick={addToCart}
            className="h-12 flex-1 bg-black font-medium text-[14px] uppercase text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
          >
            {added ? 'Added ✓' : size == null ? 'Select a size' : 'Add to cart'}
          </button>
        </div>
        {added && (
          <button
            type="button"
            onClick={() => navigate('/cart')}
            className="mt-3 w-full border border-black py-3 font-medium text-[13px] uppercase hover:bg-black hover:text-white"
          >
            Go to cart →
          </button>
        )}
      </div>
    </div>
  )
}

function ViewTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 border px-4 font-medium text-[12px] uppercase ${
        active ? 'border-black bg-black text-white' : 'border-black/25 hover:border-black'
      }`}
    >
      {label}
    </button>
  )
}
