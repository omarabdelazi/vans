import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { api, type Category } from '../lib/api'
import { useCart } from '../lib/cart'

export function HeaderNav() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { count } = useCart()

  return (
    <>
      <motion.header
        className="pointer-events-none fixed right-4 top-4 z-20 flex h-[30px] flex-row items-center justify-between sm:w-[330px] lg:right-8 lg:top-8"
        style={{ mixBlendMode: 'exclusion' }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: 0.15 }}
      >
        <Link
          to="/contact"
          className="pointer-events-auto hidden font-medium text-[15px] uppercase text-white sm:block"
        >
          About
        </Link>
        <div className="flex flex-row items-center gap-5 lg:gap-[50px]">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
            className="pointer-events-auto"
          >
            <svg viewBox="0 0 40 40" className="h-6 w-6 lg:h-[30px] lg:w-[30px]" fill="none">
              <path d="M0 14H40" stroke="#fff" strokeWidth="2.5" />
              <path d="M0 26H40" stroke="#fff" strokeWidth="2.5" />
            </svg>
          </button>
          <Link
            to="/cart"
            className="pointer-events-auto font-medium text-[13px] text-white lg:text-[15px]"
          >
            [ CART{count > 0 ? ` ${count}` : ''} ]
          </Link>
        </div>
      </motion.header>
      {menuOpen && <MenuOverlay onClose={() => setMenuOpen(false)} />}
    </>
  )
}

function MenuOverlay({ onClose }: { onClose: () => void }) {
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    api<Category[]>('/categories')
      .then(setCategories)
      .catch(() => {})
  }, [])

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black px-6 py-6 lg:px-12" style={{ cursor: 'auto' }}>
      <div className="flex items-center justify-between">
        <span className="font-medium text-[24px] lowercase text-white">vans</span>
        <button
          type="button"
          aria-label="Close menu"
          onClick={onClose}
          className="font-medium text-[15px] uppercase text-white"
        >
          [ Close ]
        </button>
      </div>
      <nav className="mt-14 flex flex-col gap-4">
        <Link
          to="/shop"
          className="font-medium text-[44px] uppercase leading-[110%] tracking-[-0.04em] text-white lg:text-[64px]"
        >
          Shop All
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            to={`/shop?category=${c.slug}`}
            className="font-medium text-[44px] uppercase leading-[110%] tracking-[-0.04em] text-white/60 transition-colors hover:text-white lg:text-[64px]"
          >
            {c.name}
          </Link>
        ))}
        <Link
          to="/contact"
          className="mt-8 font-medium text-[20px] uppercase tracking-[-0.02em] text-white lg:text-[26px]"
        >
          Contact Us
        </Link>
        <Link
          to="/cart"
          className="font-medium text-[20px] uppercase tracking-[-0.02em] text-white lg:text-[26px]"
        >
          Cart
        </Link>
      </nav>
      <span className="mt-auto font-medium text-[13px] uppercase tracking-[-0.02em] text-white/50">
        VANS &reg; 2026
      </span>
    </div>
  )
}
