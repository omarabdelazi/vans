/**
 * Loads model-viewer on demand and points it at the self-hosted Draco decoder
 * (public/draco/) so Draco-compressed GLBs work without any external CDN.
 */
export async function ensureModelViewer(): Promise<void> {
  const mod = await import('@google/model-viewer')
  mod.ModelViewerElement.dracoDecoderLocation = `${window.location.origin}/draco/`
}
