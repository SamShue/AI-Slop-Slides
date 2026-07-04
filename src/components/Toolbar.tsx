import { useStore } from '../state/store';
import { exportSlidesToPdf } from '../lib/export';

export function Toolbar() {
  const slides = useStore((s) => s.slides);
  const theme = useStore((s) => s.theme);
  const busy = useStore((s) => s.busy);
  const generateAll = useStore((s) => s.generateAll);
  const acceptAll = useStore((s) => s.acceptAll);
  const reset = useStore((s) => s.reset);
  const exportProgress = useStore((s) => s.exportProgress);
  const setExportProgress = useStore((s) => s.setExportProgress);
  const setError = useStore((s) => s.setError);

  const total = slides.length;
  const generated = slides.filter((s) => s.generatedHtml).length;
  const accepted = slides.filter((s) => s.status === 'accepted').length;
  const exporting = exportProgress !== null;

  async function onExport() {
    setError(null);
    setExportProgress({ done: 0, total: generated });
    try {
      await exportSlidesToPdf({
        slides,
        theme,
        onProgress: (done, t) => setExportProgress({ done, total: t }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setExportProgress(null);
    }
  }

  return (
    <div className="toolbar">
      <div className="toolbar-stats">
        <span>{total} slides</span>
        <span className="dot">·</span>
        <span>{generated} generated</span>
        <span className="dot">·</span>
        <span>{accepted} accepted</span>
      </div>
      <div className="toolbar-actions">
        <button className="btn" onClick={reset} disabled={busy || exporting}>
          Clear
        </button>
        <button className="btn primary" onClick={generateAll} disabled={busy || exporting}>
          {busy ? 'Generating…' : 'Generate all'}
        </button>
        <button
          className="btn"
          onClick={acceptAll}
          disabled={busy || exporting || generated === 0}
        >
          Accept all
        </button>
        <button
          className="btn success"
          onClick={onExport}
          disabled={busy || exporting || generated === 0}
        >
          {exporting
            ? `Exporting ${exportProgress.done}/${exportProgress.total}…`
            : 'Download PDF'}
        </button>
      </div>
    </div>
  );
}
