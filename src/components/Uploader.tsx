import { useRef, useState } from 'react';
import { useStore } from '../state/store';
import { parsePdf, toSlideData } from '../lib/pdf';

export function Uploader() {
  const setSlides = useStore((s) => s.setSlides);
  const setError = useStore((s) => s.setError);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please provide a PDF file.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const parsed = await parsePdf(file);
      setSlides(toSlideData(parsed));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel uploader-panel">
      <div className="panel-header">
        <h2>2 · Upload your slides</h2>
      </div>
      <div
        className={`dropzone ${dragOver ? 'drag' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) void handleFile(file);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = '';
          }}
        />
        {loading ? (
          <span className="spinner-text">Reading PDF…</span>
        ) : (
          <>
            <div className="dropzone-icon">📄</div>
            <strong>Drop a PDF here or click to browse</strong>
            <small>Each page becomes one slide to beautify.</small>
          </>
        )}
      </div>
    </section>
  );
}
