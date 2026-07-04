import html2canvas from 'html2canvas';
import { SLIDE_WIDTH, SLIDE_HEIGHT } from '../types';
import { waitForFonts } from './fonts';

/**
 * Render a self-contained slide HTML fragment to a PNG data URL at slide
 * resolution. The fragment is mounted in an offscreen, fixed-size container so
 * layout is deterministic regardless of the on-screen preview scale.
 *
 * @param html The self-contained HTML fragment (root sized 1280x720).
 * @param backgroundColor Fallback background used behind transparent areas.
 * @param scale Output scale (1 = 1280x720, 2 = retina, 0.5 = thumbnail).
 */
export async function renderHtmlToPng(
  html: string,
  backgroundColor: string,
  scale: number,
): Promise<string> {
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '0';
  host.style.width = `${SLIDE_WIDTH}px`;
  host.style.height = `${SLIDE_HEIGHT}px`;
  host.style.overflow = 'hidden';
  host.style.background = backgroundColor;
  host.innerHTML = html;
  document.body.appendChild(host);

  try {
    await waitForFonts();
    const canvas = await html2canvas(host, {
      width: SLIDE_WIDTH,
      height: SLIDE_HEIGHT,
      scale,
      backgroundColor,
      useCORS: true,
      logging: false,
    });
    return canvas.toDataURL('image/png');
  } finally {
    document.body.removeChild(host);
  }
}
