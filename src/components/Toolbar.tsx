import { useStore } from '../state/store';
import { exportSlidesToPdf } from '../lib/export';
import { estimateDeckCost, formatUsd } from '../lib/cost';

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
  const models = useStore((s) => s.models);
  const settings = useStore((s) => s.settings);
  const vision = useStore((s) => s.modelSupportsVision);
  const spentUsd = useStore((s) => s.spentUsd);

  const total = slides.length;
  const generated = slides.filter((s) => s.generatedHtml).length;
  const accepted = slides.filter((s) => s.status === 'accepted').length;
  const exporting = exportProgress !== null;

  const selectedModel = models.find((m) => m.id === settings.model);
  const targets = slides.filter((s) => s.status !== 'accepted');
  const estimate = estimateDeckCost(selectedModel, targets, theme, vision);
  const hasPricing =
    selectedModel &&
    (selectedModel.pricing.prompt > 0 || selectedModel.pricing.completion > 0);

  async function onGenerateAll() {
    if (estimate && hasPricing && estimate.slideCount > 0) {
      const ok = window.confirm(
        `Estimated cost to generate ${estimate.slideCount} slide(s) with ` +
          `${selectedModel?.name}:\n\n` +
          `≈ ${formatUsd(estimate.totalUsd)} total ` +
          `(${formatUsd(estimate.perSlideUsd)} per slide)\n\n` +
          `This is an approximation. Continue?`,
      );
      if (!ok) return;
    }
    await generateAll();
  }

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
        {estimate && hasPricing && targets.length > 0 && (
          <>
            <span className="dot">·</span>
            <span className="cost-est" title="Approximate cost to generate the remaining slides with the selected model">
              est. {formatUsd(estimate.totalUsd)} to generate {targets.length}
            </span>
          </>
        )}
        {spentUsd > 0 && (
          <>
            <span className="dot">·</span>
            <span className="cost-spent" title="Actual cost reported by OpenRouter this session">
              spent {formatUsd(spentUsd)}
            </span>
          </>
        )}
      </div>
      <div className="toolbar-actions">
        <button className="btn" onClick={reset} disabled={busy || exporting}>
          Clear
        </button>
        <button className="btn primary" onClick={onGenerateAll} disabled={busy || exporting}>
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
