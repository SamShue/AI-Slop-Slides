const loaded = new Set<string>();

/**
 * Dynamically inject a Google Fonts stylesheet for the given font family.
 * No-op for generic families (sans-serif, serif) or empty values.
 */
export function loadGoogleFont(family: string): void {
  if (!family) return;
  const trimmed = family.trim();
  const generic = ['sans-serif', 'serif', 'monospace', 'system-ui', 'cursive'];
  if (generic.includes(trimmed.toLowerCase())) return;
  if (loaded.has(trimmed)) return;
  loaded.add(trimmed);

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
    trimmed,
  )}:wght@300;400;500;600;700;800;900&display=swap`;
  document.head.appendChild(link);
}

/** Wait until fonts referenced by the document are ready for rendering/capture. */
export async function waitForFonts(): Promise<void> {
  if ('fonts' in document) {
    try {
      await document.fonts.ready;
    } catch {
      /* ignore */
    }
  }
}
