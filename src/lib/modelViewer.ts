/**
 * Loads model-viewer on demand with the self-hosted Draco decoder
 * (public/draco/), so compressed GLBs decode without any external CDN.
 *
 * The decoder location MUST be configured via the window.ModelViewerElement
 * pre-config object BEFORE the library module first evaluates — the library
 * reads it at init time and later assignments don't reach an already-primed
 * decoder. All model-viewer usage goes through this helper for that reason.
 */
export async function ensureModelViewer(): Promise<void> {
  const location = `${window.location.origin}/draco/`
  if (!customElements.get('model-viewer')) {
    const w = window as unknown as { ModelViewerElement?: { dracoDecoderLocation?: string } }
    w.ModelViewerElement = { ...w.ModelViewerElement, dracoDecoderLocation: location }
  }
  const mod = await import('@google/model-viewer')
  mod.ModelViewerElement.dracoDecoderLocation = location
}
