export interface Category {
  id: number
  name: string
  slug: string
  product_count: number
}

export interface Product {
  id: number
  code: string
  name: string
  description: string
  category_id: number | null
  category_name: string | null
  category_slug: string | null
  price: number
  sale_price: number | null
  on_sale: number
  image_url: string
  model_url: string
  has_ar: number
  active: number
  total_stock: number
  created_at: string
}

export interface ProductDetail extends Product {
  sizes: { size: number; stock: number }[]
}

export interface OrderItem {
  id: number
  order_id: number
  product_id: number | null
  code: string
  name: string
  size: number
  qty: number
  unit_price: number
}

export interface Order {
  id: number
  customer_name: string
  phone: string
  address: string
  payment_method: string
  payment_proof_key: string
  status: string
  source: string
  stock_applied: number
  total: number
  created_at: string
  item_count?: number
  items?: OrderItem[]
}

export interface Message {
  id: number
  name: string
  contact: string
  body: string
  read: number
  created_at: string
}

export interface Stats {
  pending_orders: number
  unread_messages: number
  active_products: number
  out_of_stock: number
}

export type Settings = Record<string, string>

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    headers:
      init?.body && !(init.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : undefined,
    ...init,
  })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) {
    throw new ApiError(data?.error || `request failed (${res.status})`, res.status)
  }
  return data
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function uploadFile(path: string, file: File): Promise<{ key: string; url: string }> {
  const { compressImage } = await import('./images')
  const compressed = await compressImage(file)
  if (compressed.size > 1.2 * 1024 * 1024) {
    throw new ApiError('الصورة كبيرة جداً — جرب صورة أصغر', 400)
  }
  const form = new FormData()
  form.append('file', compressed)
  return api(path, { method: 'POST', body: form })
}

export async function uploadModel(file: File): Promise<{ key: string; url: string }> {
  if (file.size > 10 * 1024 * 1024) {
    throw new ApiError('الموديل أكبر من 10MB — ابعته لكلود يضغطه الأول', 400)
  }
  const form = new FormData()
  form.append('file', file)
  return api('/admin/upload-model', { method: 'POST', body: form })
}

export const SIZES = Array.from({ length: 10 }, (_, i) => 35 + i)

export function effectivePrice(p: Pick<Product, 'price' | 'sale_price' | 'on_sale'>): number {
  return p.on_sale && p.sale_price != null ? p.sale_price : p.price
}

export function formatPrice(value: number): string {
  return `${value.toLocaleString('en-US', { maximumFractionDigits: 2 })} EGP`
}
