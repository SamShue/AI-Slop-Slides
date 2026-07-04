import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { SlideData, Theme } from '../types';
import { SLIDE_WIDTH, SLIDE_HEIGHT } from '../types';
import { applyThemeFonts, defaultTheme } from './theme';
import { waitForFonts } from './fonts';

/**
 * Render a single slide HTML fragment to a PNG data URL at slide resolution.
 * The fragment is mounted in an offscreen, fixed-size container so layout is
 * deterministic regardless of the on-screen preview scale.
 */
async function renderSlideToPng(
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

export interface ExportOptions {
  slides: SlideData[];
  theme?: Theme;
  /** Render scale for crispness (2 = retina-quality). */
  scale?: number;
  onProgress?: (done: number, total: number) => void;
}

/**
 * Export the provided slides (using their generated HTML) to a landscape PDF.
 * Slides without generated HTML are skipped.
 */
export async function exportSlidesToPdf(options: ExportOptions): Promise<void> {
  const { slides, theme = defaultTheme(), scale = 2, onProgress } = options;
  applyThemeFonts(theme);

  const exportable = slides.filter((s) => s.generatedHtml);
  if (exportable.length === 0) {
    throw new Error('No generated slides to export yet.');
  }

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: [SLIDE_WIDTH, SLIDE_HEIGHT],
    compress: true,
  });

  for (let i = 0; i < exportable.length; i++) {
    const slide = exportable[i];
    const png = await renderSlideToPng(
      slide.generatedHtml as string,
      theme.backgroundColor,
      scale,
    );
    if (i > 0) pdf.addPage([SLIDE_WIDTH, SLIDE_HEIGHT], 'landscape');
    pdf.addImage(png, 'PNG', 0, 0, SLIDE_WIDTH, SLIDE_HEIGHT, undefined, 'FAST');
    onProgress?.(i + 1, exportable.length);
  }

  pdf.save('beautified-slides.pdf');
}
