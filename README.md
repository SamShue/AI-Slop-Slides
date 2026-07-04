# AI Slop Slides

Beautify your class slides with AI. Upload a PDF, generate a theme, let an AI
redesign each slide, review the before/after side-by-side, accept or regenerate
individual slides, then download the polished deck as a PDF.

Everything runs client-side in your browser — your OpenRouter API key never
leaves your machine (stored in `localStorage`).

## Features

- **Theme templates** — describe a style and the AI designs a cohesive theme
  (colors + Google Fonts), or hand-tune it with the built-in editor.
- **PDF import** — each page is rendered and its text extracted.
- **AI redesign** — each slide is redesigned into a clean, self-contained layout
  using your theme. Vision-capable models also *see* the original slide.
- **Side-by-side review** — compare original vs. beautified, then **Accept** or
  **Regenerate** (with optional guidance) per slide.
- **PDF export** — download the accepted/generated slides as a 16:9 PDF.
- **Settings** — provide your OpenRouter API key and pick any model.

## Getting started

The quickest way is the launch script (installs dependencies if needed, then
starts the app):

```bash
./launch.sh          # start the dev server (default)
./launch.sh build    # build the production bundle
./launch.sh preview  # build and serve the production bundle
```

Or run the npm scripts directly:

```bash
npm install
npm run dev
```

Then open the printed URL, click **⚙ Settings**, paste your
[OpenRouter API key](https://openrouter.ai/keys), and select a model
(vision-capable models such as `google/gemini-2.0-flash-001` or
`anthropic/claude-3.5-sonnet` give the best results).

## Workflow

1. **Theme** — type a style prompt and click *Generate theme* (or customize).
2. **Upload** — drop in your slides PDF.
3. **Generate all** — the AI redesigns every slide.
4. **Review** — Accept the ones you like, Regenerate the rest.
5. **Download PDF** — export your beautified deck.

## Build

```bash
npm run build
npm run preview
```

## Notes

- Generated slides use inline styles only and are rendered at 1280×720, then
  rasterized for the PDF export via `html2canvas` + `jsPDF`.
- Model calls go directly from your browser to `https://openrouter.ai`.
