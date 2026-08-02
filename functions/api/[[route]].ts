import { Hono } from 'hono'

type Env = {
  DB: D1Database
  ADMIN_PASSWORD: string
  SESSION_SECRET: string
}

type AppContext = { Bindings: Env }

/* ------------------------------------------------------------------ */
/* Schema — applied automatically on first request (idempotent).       */
/* ------------------------------------------------------------------ */

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    price REAL NOT NULL DEFAULT 0,
    sale_price REAL,
    on_sale INTEGER NOT NULL DEFAULT 0,
    image_url TEXT NOT NULL DEFAULT '',
    model_url TEXT NOT NULL DEFAULT '',
    has_ar INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS product_sizes (
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    size INTEGER NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (product_id, size)
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    payment_method TEXT NOT NULL,
    payment_proof_key TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    source TEXT NOT NULL DEFAULT 'online',
    stock_applied INTEGER NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER,
    code TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL DEFAULT '',
    size INTEGER NOT NULL,
    qty INTEGER NOT NULL,
    unit_price REAL NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL,
    read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS files (
    key TEXT PRIMARY KEY,
    mime TEXT NOT NULL,
    data TEXT NOT NULL,
    chunks INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS file_chunks (
    key TEXT NOT NULL,
    idx INTEGER NOT NULL,
    data TEXT NOT NULL,
    PRIMARY KEY (key, idx)
  )`,
  `INSERT OR IGNORE INTO settings (key, value) VALUES
    ('instapay_number', ''),
    ('vodafone_cash_number', ''),
    ('store_phone', ''),
    ('store_address', ''),
    ('landing_caption', 'VANS independent shoe store — EU sizes 35-44, delivered all over Egypt. Pay with InstaPay, Vodafone Cash, or cash on delivery.'),
    ('landing_label', 'ARCHIVE COLLECTION
"VANS"'),
    ('landing_big_text', 'SHOP NOW')`,
]

let migrated = false

async function ensureSchema(db: D1Database) {
  if (migrated) return
  await db.batch(SCHEMA.map((sql) => db.prepare(sql)))
  // Older deployments created `files` without the chunks column.
  await db
    .prepare('ALTER TABLE files ADD COLUMN chunks INTEGER NOT NULL DEFAULT 0')
    .run()
    .catch(() => {})
  migrated = true
}

/* ------------------------------------------------------------------ */
/* Session auth (single admin, HMAC-signed cookie)                     */
/* ------------------------------------------------------------------ */

const COOKIE = 'vans_admin'
const SESSION_DAYS = 7

async function hmac(value: string, secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(value))
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function sessionCookieValue(secret: string): Promise<string> {
  const exp = Date.now() + SESSION_DAYS * 86400_000
  return `${exp}.${await hmac(String(exp), secret)}`
}

async function isValidSession(cookieHeader: string | undefined, secret: string): Promise<boolean> {
  const raw = cookieHeader?.match(/(?:^|;\s*)vans_admin=([^;]+)/)?.[1]
  if (!raw) return false
  const dot = raw.indexOf('.')
  if (dot < 1) return false
  const exp = raw.slice(0, dot)
  const sig = raw.slice(dot + 1)
  if (!/^\d+$/.test(exp) || Number(exp) < Date.now()) return false
  return sig === (await hmac(exp, secret))
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const SIZE_MIN = 35
const SIZE_MAX = 44

function slugify(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
  return base || `cat-${Date.now()}`
}

function bad(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

interface StockItem {
  product_id: number
  size: number
  qty: number
  name?: string
}

/** direction -1 subtracts stock (checks availability first), +1 restores. */
async function applyStock(
  db: D1Database,
  items: StockItem[],
  direction: -1 | 1,
): Promise<string | null> {
  if (direction === -1) {
    for (const it of items) {
      const row = await db
        .prepare('SELECT stock FROM product_sizes WHERE product_id = ? AND size = ?')
        .bind(it.product_id, it.size)
        .first<{ stock: number }>()
      if (!row || row.stock < it.qty) {
        return `المخزون غير كافي: ${it.name ?? it.product_id} مقاس ${it.size} (المتاح ${row?.stock ?? 0})`
      }
    }
  }
  if (items.length) {
    await db.batch(
      items.map((it) =>
        db
          .prepare(
            'UPDATE product_sizes SET stock = MAX(0, stock + ?) WHERE product_id = ? AND size = ?',
          )
          .bind(direction * it.qty, it.product_id, it.size),
      ),
    )
  }
  return null
}

async function orderWithItems(db: D1Database, id: number) {
  const order = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first()
  if (!order) return null
  const items = await db
    .prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id')
    .bind(id)
    .all()
  return { ...order, items: items.results }
}

/**
 * Images are stored inside D1 (base64) so no extra storage service is needed.
 * The client compresses images before upload; 1.2MB binary stays safely under
 * D1's row size limit after base64 encoding.
 */
async function saveUpload(
  db: D1Database,
  file: File,
  prefix: string,
): Promise<{ key: string } | { error: string }> {
  if (!file || typeof file === 'string') return { error: 'file is required' }
  if (!file.type.startsWith('image/')) return { error: 'only images are allowed' }
  if (file.size > 1.2 * 1024 * 1024) return { error: 'الصورة كبيرة — أقصى حجم 1MB' }
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const key = `${prefix}/${crypto.randomUUID()}.${ext}`
  const buf = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunk))
  }
  await db
    .prepare('INSERT INTO files (key, mime, data) VALUES (?, ?, ?)')
    .bind(key, file.type, btoa(binary))
    .run()
  return { key }
}

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */

const app = new Hono<AppContext>().basePath('/api')

app.use('*', async (c, next) => {
  await ensureSchema(c.env.DB)
  await next()
})

app.use('/admin/*', async (c, next) => {
  if (c.req.path === '/api/admin/login') return next()
  if (!(await isValidSession(c.req.header('Cookie'), c.env.SESSION_SECRET))) {
    return bad('unauthorized', 401)
  }
  return next()
})

/* ----------------------------- auth ------------------------------- */

app.post('/admin/login', async (c) => {
  const { password } = await c.req.json<{ password?: string }>().catch(() => ({}) as never)
  if (!c.env.ADMIN_PASSWORD) return bad('ADMIN_PASSWORD غير مضبوط في إعدادات Cloudflare', 500)
  if (!password || password !== c.env.ADMIN_PASSWORD) return bad('كلمة السر غير صحيحة', 401)
  const value = await sessionCookieValue(c.env.SESSION_SECRET)
  c.header(
    'Set-Cookie',
    `${COOKIE}=${value}; Max-Age=${SESSION_DAYS * 86400}; Path=/; HttpOnly; Secure; SameSite=Lax`,
  )
  return c.json({ ok: true })
})

app.post('/admin/logout', (c) => {
  c.header('Set-Cookie', `${COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`)
  return c.json({ ok: true })
})

app.get('/admin/me', (c) => c.json({ ok: true }))

/* --------------------------- settings ------------------------------ */

app.get('/settings', async (c) => {
  const rows = await c.env.DB.prepare('SELECT key, value FROM settings').all<{
    key: string
    value: string
  }>()
  const out: Record<string, string> = {}
  for (const r of rows.results) out[r.key] = r.value
  return c.json(out)
})

app.put('/admin/settings', async (c) => {
  const body = await c.req.json<Record<string, string>>().catch(() => null)
  if (!body) return bad('invalid body')
  const entries = Object.entries(body).filter(([k]) => /^[a-z0-9_]+$/.test(k))
  if (entries.length) {
    await c.env.DB.batch(
      entries.map(([k, v]) =>
        c.env.DB.prepare(
          'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        ).bind(k, String(v ?? '')),
      ),
    )
  }
  return c.json({ ok: true })
})

/* -------------------------- categories ----------------------------- */

app.get('/categories', async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.active = 1) AS product_count
     FROM categories c ORDER BY c.name`,
  ).all()
  return c.json(rows.results)
})

app.post('/admin/categories', async (c) => {
  const { name } = await c.req.json<{ name?: string }>().catch(() => ({}) as never)
  if (!name?.trim()) return bad('اسم القسم مطلوب')
  const slug = slugify(name)
  try {
    const res = await c.env.DB.prepare('INSERT INTO categories (name, slug) VALUES (?, ?)')
      .bind(name.trim(), slug)
      .run()
    return c.json({ id: res.meta.last_row_id, name: name.trim(), slug })
  } catch {
    return bad('يوجد قسم بنفس الاسم بالفعل', 409)
  }
})

app.put('/admin/categories/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const { name } = await c.req.json<{ name?: string }>().catch(() => ({}) as never)
  if (!name?.trim()) return bad('اسم القسم مطلوب')
  try {
    await c.env.DB.prepare('UPDATE categories SET name = ?, slug = ? WHERE id = ?')
      .bind(name.trim(), slugify(name), id)
      .run()
    return c.json({ ok: true })
  } catch {
    return bad('يوجد قسم بنفس الاسم بالفعل', 409)
  }
})

app.delete('/admin/categories/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(Number(c.req.param('id'))).run()
  return c.json({ ok: true })
})

/* --------------------------- products ------------------------------ */

const PRODUCT_LIST_SQL = `
  SELECT p.*, c.name AS category_name, c.slug AS category_slug,
    (SELECT COALESCE(SUM(stock), 0) FROM product_sizes ps WHERE ps.product_id = p.id) AS total_stock
  FROM products p LEFT JOIN categories c ON c.id = p.category_id`

app.get('/products', async (c) => {
  const category = c.req.query('category')
  const search = c.req.query('search')
  const where: string[] = ['p.active = 1']
  const binds: unknown[] = []
  if (category) {
    where.push('c.slug = ?')
    binds.push(category)
  }
  if (search) {
    where.push('(p.name LIKE ? OR p.code LIKE ?)')
    binds.push(`%${search}%`, `%${search}%`)
  }
  const rows = await c.env.DB.prepare(
    `${PRODUCT_LIST_SQL} WHERE ${where.join(' AND ')} ORDER BY p.created_at DESC LIMIT 200`,
  )
    .bind(...binds)
    .all()
  return c.json(rows.results)
})

async function productDetail(db: D1Database, id: number) {
  const product = await db
    .prepare(`${PRODUCT_LIST_SQL} WHERE p.id = ?`)
    .bind(id)
    .first()
  if (!product) return null
  const sizes = await db
    .prepare('SELECT size, stock FROM product_sizes WHERE product_id = ? ORDER BY size')
    .bind(id)
    .all()
  return { ...product, sizes: sizes.results }
}

app.get('/products/:id', async (c) => {
  const detail = await productDetail(c.env.DB, Number(c.req.param('id')))
  if (!detail || !(detail as { active?: number }).active) return bad('not found', 404)
  return c.json(detail)
})

app.get('/admin/products', async (c) => {
  const rows = await c.env.DB.prepare(`${PRODUCT_LIST_SQL} ORDER BY p.created_at DESC`).all()
  return c.json(rows.results)
})

app.get('/admin/products/:id', async (c) => {
  const detail = await productDetail(c.env.DB, Number(c.req.param('id')))
  if (!detail) return bad('not found', 404)
  return c.json(detail)
})

interface ProductBody {
  code?: string
  name?: string
  description?: string
  category_id?: number | null
  price?: number
  sale_price?: number | null
  on_sale?: boolean
  image_url?: string
  model_url?: string
  has_ar?: boolean
  active?: boolean
  sizes?: { size: number; stock: number }[]
}

function cleanSizes(sizes: ProductBody['sizes']): { size: number; stock: number }[] {
  const out: { size: number; stock: number }[] = []
  for (const s of sizes ?? []) {
    const size = Math.round(Number(s.size))
    const stock = Math.max(0, Math.round(Number(s.stock) || 0))
    if (size >= SIZE_MIN && size <= SIZE_MAX) out.push({ size, stock })
  }
  return out
}

async function writeSizes(db: D1Database, productId: number, sizes: { size: number; stock: number }[]) {
  const stmts = [db.prepare('DELETE FROM product_sizes WHERE product_id = ?').bind(productId)]
  for (const s of sizes) {
    stmts.push(
      db
        .prepare('INSERT INTO product_sizes (product_id, size, stock) VALUES (?, ?, ?)')
        .bind(productId, s.size, s.stock),
    )
  }
  await db.batch(stmts)
}

app.post('/admin/products', async (c) => {
  const b = await c.req.json<ProductBody>().catch(() => null)
  if (!b?.code?.trim() || !b?.name?.trim()) return bad('الكود والاسم مطلوبان')
  if (!(Number(b.price) > 0)) return bad('السعر مطلوب')
  try {
    const res = await c.env.DB.prepare(
      `INSERT INTO products (code, name, description, category_id, price, sale_price, on_sale, image_url, model_url, has_ar, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        b.code.trim(),
        b.name.trim(),
        b.description ?? '',
        b.category_id ?? null,
        Number(b.price),
        b.sale_price == null || b.sale_price === 0 ? null : Number(b.sale_price),
        b.on_sale ? 1 : 0,
        b.image_url ?? '',
        b.model_url ?? '',
        b.has_ar ? 1 : 0,
        b.active === false ? 0 : 1,
      )
      .run()
    const id = res.meta.last_row_id as number
    await writeSizes(c.env.DB, id, cleanSizes(b.sizes))
    return c.json(await productDetail(c.env.DB, id))
  } catch (e) {
    if (String(e).includes('UNIQUE')) return bad('يوجد منتج بنفس الكود بالفعل', 409)
    throw e
  }
})

app.put('/admin/products/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const b = await c.req.json<ProductBody>().catch(() => null)
  if (!b?.code?.trim() || !b?.name?.trim()) return bad('الكود والاسم مطلوبان')
  try {
    await c.env.DB.prepare(
      `UPDATE products SET code = ?, name = ?, description = ?, category_id = ?, price = ?,
        sale_price = ?, on_sale = ?, image_url = ?, model_url = ?, has_ar = ?, active = ?
       WHERE id = ?`,
    )
      .bind(
        b.code.trim(),
        b.name.trim(),
        b.description ?? '',
        b.category_id ?? null,
        Number(b.price) || 0,
        b.sale_price == null || b.sale_price === 0 ? null : Number(b.sale_price),
        b.on_sale ? 1 : 0,
        b.image_url ?? '',
        b.model_url ?? '',
        b.has_ar ? 1 : 0,
        b.active === false ? 0 : 1,
        id,
      )
      .run()
    await writeSizes(c.env.DB, id, cleanSizes(b.sizes))
    return c.json(await productDetail(c.env.DB, id))
  } catch (e) {
    if (String(e).includes('UNIQUE')) return bad('يوجد منتج بنفس الكود بالفعل', 409)
    throw e
  }
})

app.delete('/admin/products/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM products WHERE id = ?').bind(Number(c.req.param('id'))).run()
  return c.json({ ok: true })
})

/* ---------------------------- uploads ------------------------------ */

app.post('/upload-proof', async (c) => {
  const form = await c.req.formData().catch(() => null)
  const file = form?.get('file')
  const res = await saveUpload(c.env.DB, file as File, 'proofs')
  if ('error' in res) return bad(res.error)
  return c.json({ key: res.key, url: `/api/files/${res.key}` })
})

app.post('/admin/upload', async (c) => {
  const form = await c.req.formData().catch(() => null)
  const file = form?.get('file')
  const res = await saveUpload(c.env.DB, file as File, 'products')
  if ('error' in res) return bad(res.error)
  return c.json({ key: res.key, url: `/api/files/${res.key}` })
})

// 3D models (GLB) are stored across multiple rows to stay under D1's
// per-row size limit.
const MODEL_CHUNK_BYTES = 700_000
const MODEL_MAX_BYTES = 10 * 1024 * 1024

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  const step = 0x8000
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step))
  }
  return btoa(binary)
}

app.post('/admin/upload-model', async (c) => {
  const form = await c.req.formData().catch(() => null)
  const file = form?.get('file') as File | null
  if (!file || typeof file === 'string') return bad('file is required')
  if (!file.name.toLowerCase().endsWith('.glb')) return bad('الملف لازم يكون بصيغة GLB')
  if (file.size > MODEL_MAX_BYTES) {
    return bad('الموديل أكبر من 10MB — ابعته لكلود يضغطه الأول أو صغّره وحاول تاني')
  }
  const buf = new Uint8Array(await file.arrayBuffer())
  if (buf.length < 12 || String.fromCharCode(buf[0], buf[1], buf[2], buf[3]) !== 'glTF') {
    return bad('الملف مش GLB سليم')
  }
  const key = `models/${crypto.randomUUID()}.glb`
  const stmts = []
  let chunkCount = 0
  for (let off = 0; off < buf.length; off += MODEL_CHUNK_BYTES) {
    stmts.push(
      c.env.DB.prepare('INSERT INTO file_chunks (key, idx, data) VALUES (?, ?, ?)').bind(
        key,
        chunkCount++,
        toBase64(buf.subarray(off, off + MODEL_CHUNK_BYTES)),
      ),
    )
  }
  stmts.push(
    c.env.DB.prepare("INSERT INTO files (key, mime, data, chunks) VALUES (?, 'model/gltf-binary', '', ?)").bind(
      key,
      chunkCount,
    ),
  )
  await c.env.DB.batch(stmts)
  return c.json({ key, url: `/api/files/${key}` })
})

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

app.get('/files/*', async (c) => {
  // Serve from the edge cache when possible — decoding large models from
  // D1 on every request would waste CPU.
  const cache = caches.default
  const cached = await cache.match(c.req.raw).catch(() => undefined)
  if (cached) return cached

  const key = c.req.path.replace('/api/files/', '')
  const row = await c.env.DB.prepare('SELECT mime, data, chunks FROM files WHERE key = ?')
    .bind(key)
    .first<{ mime: string; data: string; chunks: number }>()
  if (!row) return bad('not found', 404)

  let body: Uint8Array
  if (row.chunks > 0) {
    const parts = await c.env.DB.prepare(
      'SELECT data FROM file_chunks WHERE key = ? ORDER BY idx',
    )
      .bind(key)
      .all<{ data: string }>()
    const decoded = parts.results.map((p) => fromBase64(p.data))
    const total = decoded.reduce((n, d) => n + d.length, 0)
    body = new Uint8Array(total)
    let off = 0
    for (const d of decoded) {
      body.set(d, off)
      off += d.length
    }
  } else {
    body = fromBase64(row.data)
  }

  const res = new Response(body, {
    headers: {
      'Content-Type': row.mime,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
  try {
    c.executionCtx.waitUntil(cache.put(c.req.raw, res.clone()))
  } catch {
    /* execution context unavailable in some local dev modes */
  }
  return res
})

/* ----------------------------- orders ------------------------------ */

interface CheckoutBody {
  customer_name?: string
  phone?: string
  address?: string
  payment_method?: string
  payment_proof_key?: string
  items?: { product_id: number; size: number; qty: number }[]
}

const PAYMENT_METHODS = ['cod', 'instapay', 'vodafone_cash']

app.post('/orders', async (c) => {
  const b = await c.req.json<CheckoutBody>().catch(() => null)
  if (!b) return bad('invalid body')
  if (!b.customer_name?.trim()) return bad('الاسم مطلوب')
  if (!b.phone?.trim()) return bad('رقم التليفون مطلوب')
  if (!b.address?.trim()) return bad('العنوان مطلوب')
  if (!b.payment_method || !PAYMENT_METHODS.includes(b.payment_method)) {
    return bad('طريقة الدفع غير صحيحة')
  }
  if (b.payment_method !== 'cod' && !b.payment_proof_key) {
    return bad('صورة إيصال التحويل مطلوبة')
  }
  if (!b.items?.length) return bad('السلة فارغة')
  if (b.items.length > 30) return bad('عدد العناصر كبير')

  // Price everything server-side and check availability (without reserving).
  const lines: (StockItem & { code: string; unit_price: number })[] = []
  for (const it of b.items) {
    const qty = Math.max(1, Math.round(Number(it.qty) || 1))
    const size = Math.round(Number(it.size))
    const product = await c.env.DB.prepare(
      'SELECT id, code, name, price, sale_price, on_sale, active FROM products WHERE id = ?',
    )
      .bind(Number(it.product_id))
      .first<{
        id: number
        code: string
        name: string
        price: number
        sale_price: number | null
        on_sale: number
        active: number
      }>()
    if (!product || !product.active) return bad('منتج غير متاح في السلة')
    const sizeRow = await c.env.DB.prepare(
      'SELECT stock FROM product_sizes WHERE product_id = ? AND size = ?',
    )
      .bind(product.id, size)
      .first<{ stock: number }>()
    if (!sizeRow || sizeRow.stock < qty) {
      return bad(`عذراً، ${product.name} مقاس ${size} غير متوفر بالكمية المطلوبة`, 409)
    }
    const unit =
      product.on_sale && product.sale_price != null ? product.sale_price : product.price
    lines.push({ product_id: product.id, size, qty, name: product.name, code: product.code, unit_price: unit })
  }

  const total = lines.reduce((sum, l) => sum + l.unit_price * l.qty, 0)
  const res = await c.env.DB.prepare(
    `INSERT INTO orders (customer_name, phone, address, payment_method, payment_proof_key, status, source, total)
     VALUES (?, ?, ?, ?, ?, 'pending', 'online', ?)`,
  )
    .bind(
      b.customer_name.trim(),
      b.phone.trim(),
      b.address.trim(),
      b.payment_method,
      b.payment_proof_key ?? '',
      total,
    )
    .run()
  const orderId = res.meta.last_row_id as number
  await c.env.DB.batch(
    lines.map((l) =>
      c.env.DB.prepare(
        'INSERT INTO order_items (order_id, product_id, code, name, size, qty, unit_price) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).bind(orderId, l.product_id, l.code, l.name, l.size, l.qty, l.unit_price),
    ),
  )
  return c.json({ id: orderId, total })
})

app.get('/admin/orders', async (c) => {
  const status = c.req.query('status')
  const source = c.req.query('source')
  const where: string[] = []
  const binds: unknown[] = []
  if (status) {
    where.push('status = ?')
    binds.push(status)
  }
  if (source) {
    where.push('source = ?')
    binds.push(source)
  }
  const rows = await c.env.DB.prepare(
    `SELECT o.*, (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
     FROM orders o ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY o.created_at DESC LIMIT 300`,
  )
    .bind(...binds)
    .all()
  return c.json(rows.results)
})

app.get('/admin/orders/:id', async (c) => {
  const order = await orderWithItems(c.env.DB, Number(c.req.param('id')))
  if (!order) return bad('not found', 404)
  return c.json(order)
})

const ORDER_STATUSES = ['pending', 'confirmed', 'rejected', 'delivered']

app.put('/admin/orders/:id/status', async (c) => {
  const id = Number(c.req.param('id'))
  const { status } = await c.req.json<{ status?: string }>().catch(() => ({}) as never)
  if (!status || !ORDER_STATUSES.includes(status)) return bad('حالة غير صحيحة')

  const order = await c.env.DB.prepare('SELECT * FROM orders WHERE id = ?')
    .bind(id)
    .first<{ id: number; status: string; stock_applied: number }>()
  if (!order) return bad('not found', 404)

  const itemRows = await c.env.DB.prepare(
    'SELECT product_id, name, size, qty FROM order_items WHERE order_id = ?',
  )
    .bind(id)
    .all<StockItem>()
  const items = itemRows.results.filter((i) => i.product_id != null)

  // Stock leaves the inventory only when a sale is confirmed, and is
  // restored if a confirmed order is reverted or rejected.
  const wantsStock = status === 'confirmed' || status === 'delivered'
  if (wantsStock && !order.stock_applied) {
    const err = await applyStock(c.env.DB, items, -1)
    if (err) return bad(err, 409)
    await c.env.DB.prepare('UPDATE orders SET status = ?, stock_applied = 1 WHERE id = ?')
      .bind(status, id)
      .run()
  } else if (!wantsStock && order.stock_applied) {
    await applyStock(c.env.DB, items, 1)
    await c.env.DB.prepare('UPDATE orders SET status = ?, stock_applied = 0 WHERE id = ?')
      .bind(status, id)
      .run()
  } else {
    await c.env.DB.prepare('UPDATE orders SET status = ? WHERE id = ?').bind(status, id).run()
  }
  return c.json(await orderWithItems(c.env.DB, id))
})

/* ------------------------------- POS -------------------------------- */

interface PosBody {
  customer_name?: string
  items?: { product_id: number; size: number; qty: number }[]
}

app.post('/admin/pos-sale', async (c) => {
  const b = await c.req.json<PosBody>().catch(() => null)
  if (!b?.items?.length) return bad('لا توجد عناصر في الفاتورة')

  const lines: (StockItem & { code: string; unit_price: number })[] = []
  for (const it of b.items) {
    const qty = Math.max(1, Math.round(Number(it.qty) || 1))
    const size = Math.round(Number(it.size))
    const product = await c.env.DB.prepare(
      'SELECT id, code, name, price, sale_price, on_sale FROM products WHERE id = ?',
    )
      .bind(Number(it.product_id))
      .first<{
        id: number
        code: string
        name: string
        price: number
        sale_price: number | null
        on_sale: number
      }>()
    if (!product) return bad('منتج غير موجود')
    const unit =
      product.on_sale && product.sale_price != null ? product.sale_price : product.price
    lines.push({ product_id: product.id, size, qty, name: product.name, code: product.code, unit_price: unit })
  }

  const err = await applyStock(c.env.DB, lines, -1)
  if (err) return bad(err, 409)

  const total = lines.reduce((sum, l) => sum + l.unit_price * l.qty, 0)
  const res = await c.env.DB.prepare(
    `INSERT INTO orders (customer_name, phone, address, payment_method, status, source, stock_applied, total)
     VALUES (?, '', '', 'cash', 'delivered', 'pos', 1, ?)`,
  )
    .bind(b.customer_name?.trim() || 'عميل المحل', total)
    .run()
  const orderId = res.meta.last_row_id as number
  await c.env.DB.batch(
    lines.map((l) =>
      c.env.DB.prepare(
        'INSERT INTO order_items (order_id, product_id, code, name, size, qty, unit_price) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).bind(orderId, l.product_id, l.code, l.name, l.size, l.qty, l.unit_price),
    ),
  )
  return c.json(await orderWithItems(c.env.DB, orderId))
})

/* ----------------------------- messages ----------------------------- */

app.post('/messages', async (c) => {
  const b = await c.req
    .json<{ name?: string; contact?: string; body?: string }>()
    .catch(() => null)
  if (!b?.name?.trim() || !b?.body?.trim()) return bad('الاسم والرسالة مطلوبان')
  await c.env.DB.prepare('INSERT INTO messages (name, contact, body) VALUES (?, ?, ?)')
    .bind(b.name.trim().slice(0, 120), (b.contact ?? '').trim().slice(0, 160), b.body.trim().slice(0, 4000))
    .run()
  return c.json({ ok: true })
})

app.get('/admin/messages', async (c) => {
  const rows = await c.env.DB.prepare('SELECT * FROM messages ORDER BY created_at DESC LIMIT 300').all()
  return c.json(rows.results)
})

app.put('/admin/messages/:id/read', async (c) => {
  await c.env.DB.prepare('UPDATE messages SET read = 1 WHERE id = ?')
    .bind(Number(c.req.param('id')))
    .run()
  return c.json({ ok: true })
})

app.delete('/admin/messages/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM messages WHERE id = ?').bind(Number(c.req.param('id'))).run()
  return c.json({ ok: true })
})

/* ------------------------------ stats ------------------------------- */

app.get('/admin/stats', async (c) => {
  const [pending, unread, products, oos] = await Promise.all([
    c.env.DB.prepare("SELECT COUNT(*) AS n FROM orders WHERE status = 'pending'").first<{ n: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) AS n FROM messages WHERE read = 0').first<{ n: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) AS n FROM products WHERE active = 1').first<{ n: number }>(),
    c.env.DB.prepare(
      `SELECT COUNT(*) AS n FROM products p WHERE p.active = 1
       AND (SELECT COALESCE(SUM(stock), 0) FROM product_sizes ps WHERE ps.product_id = p.id) = 0`,
    ).first<{ n: number }>(),
  ])
  return c.json({
    pending_orders: pending?.n ?? 0,
    unread_messages: unread?.n ?? 0,
    active_products: products?.n ?? 0,
    out_of_stock: oos?.n ?? 0,
  })
})

app.notFound((c) => bad(`no route for ${c.req.path}`, 404))

export const onRequest: PagesFunction<Env> = (ctx) =>
  app.fetch(ctx.request, ctx.env, ctx as unknown as ExecutionContext)
