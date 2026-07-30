import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export interface CartItem {
  productId: number
  code: string
  name: string
  image: string
  size: number
  qty: number
  price: number
}

interface CartValue {
  items: CartItem[]
  count: number
  total: number
  add: (item: Omit<CartItem, 'qty'>, qty?: number) => void
  updateQty: (productId: number, size: number, qty: number) => void
  remove: (productId: number, size: number) => void
  clear: () => void
}

const CartContext = createContext<CartValue | null>(null)
const STORAGE_KEY = 'vans-cart'

function load(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as CartItem[]) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const add = useCallback((item: Omit<CartItem, 'qty'>, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId && i.size === item.size)
      if (existing) {
        return prev.map((i) =>
          i === existing ? { ...i, qty: Math.min(99, i.qty + qty), price: item.price } : i,
        )
      }
      return [...prev, { ...item, qty }]
    })
  }, [])

  const updateQty = useCallback((productId: number, size: number, qty: number) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((i) => !(i.productId === productId && i.size === size))
        : prev.map((i) => (i.productId === productId && i.size === size ? { ...i, qty } : i)),
    )
  }, [])

  const remove = useCallback((productId: number, size: number) => {
    setItems((prev) => prev.filter((i) => !(i.productId === productId && i.size === size)))
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const value = useMemo<CartValue>(() => {
    const count = items.reduce((n, i) => n + i.qty, 0)
    const total = items.reduce((n, i) => n + i.qty * i.price, 0)
    return { items, count, total, add, updateQty, remove, clear }
  }, [items, add, updateQty, remove, clear])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
