import pkg from 'deepar/package.json'

let warmed = false

/**
 * Pre-downloads the DeepAR runtime (wasm + foot-tracking models) and the
 * product's effect file into the browser cache while the customer is still
 * browsing, so the try-on screen opens fast instead of downloading ~8MB on
 * first tap over mobile data.
 */
export function warmupDeepAR(effectUrl: string): void {
  if (warmed) return
  warmed = true
  const base = `https://cdn.jsdelivr.net/npm/deepar@${pkg.version}/`
  const files = [
    'wasm/deepar.wasm',
    'wasm/libxzimgPoseEstimation.wasm',
    'wasm/tfjs-backend-wasm-simd.wasm',
    'models/foot/foot-detector-96x96x6-q8.bin',
    'models/foot/foot-keyps-superfast-23JUN2024.bin',
    'models/foot/foot-right-200.obj',
  ]
  setTimeout(() => {
    import('deepar').catch(() => {})
    for (const f of files) {
      fetch(base + f, { mode: 'cors', cache: 'force-cache' }).catch(() => {})
    }
    fetch(effectUrl, { cache: 'force-cache' }).catch(() => {})
  }, 800)
}
