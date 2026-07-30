import { StrictMode, Suspense, lazy, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import './index.css'
import { CartProvider } from './lib/cart'
import Landing from './pages/Landing'
import { StoreLayout } from './pages/store/StoreLayout'
import Shop from './pages/store/Shop'
import ProductPage from './pages/store/ProductPage'
import CartPage from './pages/store/CartPage'
import Checkout from './pages/store/Checkout'
import OrderSuccess from './pages/store/OrderSuccess'
import Contact from './pages/store/Contact'

const AdminApp = lazy(() => import('./pages/admin/AdminApp'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <CartProvider>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route element={<StoreLayout />}>
            <Route path="/shop" element={<Shop />} />
            <Route path="/product/:id" element={<ProductPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-success/:id" element={<OrderSuccess />} />
            <Route path="/contact" element={<Contact />} />
          </Route>
          <Route
            path="/admin/*"
            element={
              <Suspense fallback={null}>
                <AdminApp />
              </Suspense>
            }
          />
        </Routes>
      </CartProvider>
    </BrowserRouter>
  </StrictMode>,
)
