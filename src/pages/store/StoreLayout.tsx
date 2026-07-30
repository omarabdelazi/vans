import { Link, Outlet } from 'react-router-dom'
import { useCart } from '../../lib/cart'

export function StoreLayout() {
  const { count } = useCart()

  return (
    <div className="flex min-h-screen flex-col bg-white text-black">
      <header className="sticky top-0 z-30 border-b border-black/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <Link to="/" className="font-medium text-[26px] lowercase tracking-[-0.04em]">
            vans<span className="align-super text-[11px]">®</span>
          </Link>
          <nav className="flex items-center gap-6 font-medium text-[14px] uppercase">
            <Link to="/shop" className="hover:opacity-60">
              Shop
            </Link>
            <Link to="/contact" className="hidden hover:opacity-60 sm:block">
              Contact
            </Link>
            <Link to="/cart" className="hover:opacity-60">
              [ Cart{count > 0 ? ` ${count}` : ''} ]
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-black/10">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 font-medium text-[12px] uppercase tracking-[-0.02em] text-black/60">
          <span>VANS &reg; 2026</span>
          <div className="flex gap-6">
            <Link to="/contact" className="hover:text-black">
              Contact Us
            </Link>
            <span>Cairo, Egypt</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
