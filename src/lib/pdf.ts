import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { SlideData } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export interface ParsedSlide {
  image: string;
  text: string;
}

/**
 * Load a PDF file and render each page to a PNG data URL plus its extracted text.
 * @param file The PDF file selected by the user.
 * @param scale Render scale (higher = sharper thumbnails, larger data URLs).
 */
export async function parsePdf(file: File, scale = 1.5): Promise<ParsedSlide[]> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const slides: ParsedSlide[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create a 2D canvas context.');

    await page.render({ canvasContext: ctx, viewport }).promise;
    const image = canvas.toDataURL('image/png');

    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    slides.push({ image, text });
    page.cleanup();
  }

  await pdf.destroy();
  return slides;
}

export function toSlideData(parsed: ParsedSlide[]): SlideData[] {
  return parsed.map((p, i) => ({
    id: `slide-${i}-${crypto.randomUUID()}`,
    index: i,
    originalImage: p.image,
    originalText: p.text,
    generatedHtml: null,
    status: 'pending',
  }));
}
