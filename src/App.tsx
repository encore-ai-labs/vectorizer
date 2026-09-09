import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowUpRight, Check, ChevronDown, Clipboard, Copy, FileImage, ImagePlus, LoaderCircle, LockKeyhole, Maximize, MousePointer2, RotateCcw, ScanLine, SlidersHorizontal, Upload, X, ZoomIn, ZoomOut } from 'lucide-react';
import { decodePng, downloadFile, normalizeSvg, type SourceImage } from './image';
import { formatBytes, presets, type Settings } from './settings';
import { sampleFile, samples, sampleUrl } from './samples';

interface Result {
  svg: string;
  url: string;
  paths: number;
  palette: string[];
  duration: number;
  bytes: number;
  key: string;
}

function Slider({ label, value, min, max, step = 1, suffix = '', hint, disabled, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; suffix?: string; hint: string; disabled?: boolean; onChange: (value: number) => void;
}) {
  const id = label.toLowerCase().replaceAll(' ', '-');
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { setDraft(String(value)); }, [value]);
  const commit = () => {
    const parsed = Number(draft);
    if (!draft.trim() || !Number.isFinite(parsed)) { setDraft(String(value)); return; }
    const bounded = Math.min(max, Math.max(min, parsed));
    const snapped = Number((min + Math.round((bounded - min) / step) * step).toFixed(6));
    const next = Math.min(max, Math.max(min, snapped));
    setDraft(String(next));
    if (next !== value) onChange(next);
  };
  return <div className={`slider-field ${disabled ? 'disabled' : ''}`}>
    <div className="slider-heading"><label htmlFor={id}>{label}</label><span className="number-field"><input type="number" aria-label={`Set ${label.toLowerCase()}`} aria-describedby={`${id}-hint ${id}-entry-help`} value={draft} min={min} max={max} step={step} disabled={disabled} onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); commit(); } if (event.key === 'Escape') { event.preventDefault(); setDraft(String(value)); } }} />{suffix && <span>{suffix.trim()}</span>}</span></div>
    <span className="sr-only" id={`${id}-entry-help`}>Press Enter or leave the field to apply. Escape cancels. Range {min} to {max}; step {step}.</span>
    <input id={id} type="range" value={value} min={min} max={max} step={step} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} aria-describedby={`${id}-hint`} style={{ '--fill': `${100 * (value - min) / (max - min)}%` } as React.CSSProperties} />
    <p id={`${id}-hint`}>{hint}</p>
  </div>;
}

export function App() {
  const [source, setSource] = useState<SourceImage | null>(null);
  const [settings, setSettings] = useState<Settings>({ ...presets.clean.settings });
  const [preset, setPreset] = useState('clean');
  const [result, setResult] = useState<Result | null>(null);
  const [working, setWorking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [message, setMessage] = useState('');
  const [view, setView] = useState<'compare' | 'vector' | 'original'>('compare');
  const [zoom, setZoom] = useState(1);
  const [background, setBackground] = useState('checker');
  const [dragging, setDragging] = useState(false);
  const [help, setHelp] = useState(false);
  const [retry, setRetry] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const sourceRef = useRef<SourceImage | null>(null);
  const resultRef = useRef<Result | null>(null);
  const loadSequence = useRef(0);
  const dragDepth = useRef(0);
  const workerRef = useRef<Worker | null>(null);
  const key = source ? `${source.url}:${JSON.stringify(settings)}` : '';
  const ready = !!result && result.key === key && !working && !loading && !error;
  const busy = working || loading;
  const visibleError = uploadError || error;

  const loadFile = useCallback(async (file: File) => {
    const sequence = ++loadSequence.current;
    workerRef.current?.terminate();
    setWorking(false);
    setLoading(true);
    setError('');
    setUploadError('');
    setMessage('');
    try {
      const decoded = await decodePng(file);
      if (sequence !== loadSequence.current) { URL.revokeObjectURL(decoded.url); return; }
      if (sourceRef.current) URL.revokeObjectURL(sourceRef.current.url);
      sourceRef.current = decoded;
      setSource(decoded);
      setZoom(1);
    } catch (failure) {
      if (sequence === loadSequence.current) setUploadError(failure instanceof Error ? failure.message : 'Could not open this image.');
    } finally {
      if (sequence === loadSequence.current) setLoading(false);
    }
  }, []);

  const loadSample = useCallback(async (id: string) => {
    const sequence = ++loadSequence.current;
    setLoading(true);
    workerRef.current?.terminate();
    setWorking(false);
    try {
      const file = await sampleFile(id);
      if (sequence === loadSequence.current) await loadFile(file);
    } catch {
      if (sequence === loadSequence.current) {
        setUploadError('Could not load this sample. Please try importing a PNG.');
        setLoading(false);
      }
    }
  }, [loadFile]);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const items = Array.from(event.clipboardData?.items ?? []);
      const image = items.find((item) => item.type.startsWith('image/'));
      if (!image) return;
      const file = image.getAsFile();
      if (!file) return;
      event.preventDefault();
      void loadFile(new File([file], `Screenshot-${new Date().toISOString().replace(/[:.]/g, '-')}.png`, { type: file.type }));
    };
    const onDragEnter = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes('Files')) return;
      event.preventDefault();
      dragDepth.current++;
      setDragging(true);
    };
    const onDragOver = (event: DragEvent) => { if (event.dataTransfer?.types.includes('Files')) event.preventDefault(); };
    const onDragLeave = () => { dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragging(false); };
    const onDrop = (event: DragEvent) => {
      event.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      const file = event.dataTransfer?.files[0];
      if (file) void loadFile(file);
    };
    window.addEventListener('paste', onPaste);
    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('paste', onPaste);
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [loadFile]);

  useEffect(() => {
    if (!source || loading) return;
    setWorking(true);
    setError('');
    let active = true;
    let worker: Worker | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    const finishError = (text: string) => {
      if (!active) return;
      setError(text);
      setWorking(false);
      worker?.terminate();
      clearTimeout(deadline);
    };
    const debounce = setTimeout(() => {
      try {
        worker = new Worker(new URL('./tracer.worker.ts', import.meta.url), { type: 'module' });
        workerRef.current = worker;
        worker.onmessage = ({ data }: MessageEvent<{ svg?: string; error?: string; duration: number }>) => {
          if (!active) return;
          if (data.error || !data.svg) { finishError(data.error || 'Tracing failed. Try reducing image detail.'); return; }
          try {
            const normalized = normalizeSvg(data.svg, source);
            const blob = new Blob([normalized.svg], { type: 'image/svg+xml' });
            const next = { ...normalized, url: URL.createObjectURL(blob), bytes: blob.size, duration: data.duration, key };
            if (resultRef.current) URL.revokeObjectURL(resultRef.current.url);
            resultRef.current = next;
            setResult(next);
            setWorking(false);
            clearTimeout(deadline);
            worker?.terminate();
          } catch (failure) { finishError(failure instanceof Error ? failure.message : 'Could not render SVG.'); }
        };
        worker.onerror = () => finishError('The tracing engine stopped. Try again or use a smaller image.');
        deadline = setTimeout(() => finishError('This trace took too long. Try fewer colors, or a smaller image.'), 45_000);
        const pixels = source.pixels.slice();
        worker.postMessage({ pixels, width: source.width, height: source.height, settings }, [pixels.buffer]);
      } catch { finishError('Your browser could not start the WebAssembly worker. Try a current browser.'); }
    }, 180);
    return () => { active = false; clearTimeout(debounce); clearTimeout(deadline); worker?.terminate(); };
  }, [source, settings, key, loading, retry]);

  useEffect(() => () => {
    loadSequence.current++;
    workerRef.current?.terminate();
    if (sourceRef.current) URL.revokeObjectURL(sourceRef.current.url);
    if (resultRef.current) URL.revokeObjectURL(resultRef.current.url);
  }, []);

  useEffect(() => { if (!message) return; const timer = setTimeout(() => setMessage(''), 5000); return () => clearTimeout(timer); }, [message]);

  const update = <Field extends keyof Settings>(field: Field, value: Settings[Field]) => { setSettings((previous) => ({ ...previous, [field]: value })); setPreset('custom'); };
  const usePreset = (id: string) => { setSettings({ ...presets[id].settings }); setPreset(id); };

  const pasteClipboard = async () => {
    try {
      if (!navigator.clipboard?.read) { setMessage('Press ⌘V on Mac or Ctrl+V on Windows to paste a screenshot.'); return; }
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((type) => type === 'image/png');
        if (type) { await loadFile(new File([await item.getType(type)], 'Pasted-screenshot.png', { type })); return; }
      }
      setMessage('No image found. Copy a screenshot, then press ⌘V or Ctrl+V.');
    } catch { setMessage('Clipboard access is unavailable. Press ⌘V or Ctrl+V to paste instead.'); }
  };

  const copySvg = async () => {
    if (!ready) return;
    try { await navigator.clipboard.writeText(result.svg); setMessage('SVG markup copied. You can also download the SVG and drag it into Figma.'); }
    catch { setError('Clipboard access was blocked. Download the SVG instead.'); }
  };

  const exportSvg = () => {
    if (!ready || !source) return;
    downloadFile(new Blob([result.svg], { type: 'image/svg+xml' }), `${source.name.replace(/\.png$/i, '')}-vector.svg`);
    setMessage('SVG downloaded. Drag it into Figma to edit the vector paths.');
  };

  return <>
    <header className="topbar">
      <a className="brand" href="/" aria-label="Contour home"><span className="brand-icon"><ScanLine size={24} /></span>Contour<span className="brand-period">.</span></a>
      <div className="header-actions"><span className="privacy"><LockKeyhole size={14} />Files stay on your device</span><button className="text-button" onClick={() => setHelp(!help)} aria-expanded={help}>Quick guide <ArrowUpRight size={15} /></button></div>
    </header>
    <main>
      <section className="intro"><div><h1>PNG to SVG</h1><p>Turn an image into editable vector paths.</p></div></section>
      {help && <section className="guide"><div><strong>How to use Contour</strong><p>Paste a screenshot with ⌘V / Ctrl+V, drop a PNG, or try a sample. Start with a preset, then reduce colors and increase smoothing to simplify your artwork. Noise cleanup removes tiny islands; fine detail keeps thin strokes. Download your SVG and drag it into Figma.</p><p>Best for icons and flat artwork. Photos and gradients become flat-color shapes. Transparency is preserved as cutouts; soft alpha edges are traced, not reproduced as raster pixels.</p></div><button className="icon-button" onClick={() => setHelp(false)} aria-label="Close guide"><X size={18} /></button></section>}
      <input ref={fileInput} type="file" accept="image/png,.png" hidden aria-label="Upload PNG" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadFile(file); event.target.value = ''; }} />
      {visibleError && <div className="error-banner" role="alert"><span>{visibleError}</span>{source && !uploadError && <button className="button small" onClick={() => { setError(''); setRetry((value) => value + 1); }}>Try again</button>}<button className="icon-button" onClick={() => { setError(''); setUploadError(''); }} aria-label="Dismiss error"><X size={16} /></button></div>}
      <div className={`studio ${source ? 'has-image' : 'is-empty'}`}>
        <section className="workspace" aria-label="Vector preview workspace">
          <div className="workspace-toolbar" hidden={!source}><div className="file-label"><FileImage size={17} /><span>{source?.name || 'No image selected'}</span>{source && <span className="file-dimensions">{source.originalWidth} × {source.originalHeight}</span>}</div><button className="button small" onClick={() => fileInput.current?.click()}><ImagePlus size={15} />{source ? 'Replace image' : 'Open PNG'}</button></div>
          <div className="view-toolbar" hidden={!source}><div className="segmented" aria-label="Preview mode">{(['compare', 'original', 'vector'] as const).map((mode) => <button key={mode} aria-pressed={view === mode} className={view === mode ? 'active' : ''} onClick={() => setView(mode)}>{mode === 'compare' ? 'Side by side' : mode === 'original' ? 'Original' : 'Vector'}</button>)}</div><div className="backgrounds" aria-label="Preview background">{['checker', 'white', 'dark'].map((color) => <button key={color} className={`background-dot ${color} ${background === color ? 'selected' : ''}`} onClick={() => setBackground(color)} aria-label={`${color} background`} aria-pressed={background === color} />)}</div></div>
          {!source ? <div className="empty-stage"><div className="drop-icon"><ImagePlus size={32} strokeWidth={1.5} /></div><h2>Open a PNG</h2><p>Drop a file anywhere, or paste with <kbd>⌘V</kbd> / <kbd>Ctrl+V</kbd></p><div className="import-actions"><button className="button primary" onClick={() => fileInput.current?.click()}><Upload size={16} />Choose an image</button><button className="paste-button" onClick={() => void pasteClipboard()}><Clipboard size={15} />Paste from clipboard</button></div><span className="file-limit">PNG · Up to 25 MB</span></div> : <div className={`preview-stage ${background} ${view}`}>
            {(view === 'compare' || view === 'original') && <div className="preview-pane"><span className="pane-label">ORIGINAL <span>PNG</span></span><div className="image-scroll"><div className="image-frame" style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}><img src={source.url} alt="Original raster image" draggable={false} /></div></div></div>}
            {(view === 'compare' || view === 'vector') && <div className="preview-pane"><span className="pane-label">VECTORIZED <span>SVG</span></span><div className="image-scroll"><div className="image-frame" style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}>{result ? <img src={result.url} alt="Vectorized SVG preview" draggable={false} /> : <div className="processing"><LoaderCircle className="spin" size={25} /><span>Tracing image…</span></div>}</div></div>{busy && <span className="updating"><LoaderCircle className="spin" size={13} />Updating preview</span>}</div>}
          </div>}
          <div className="canvas-footer" hidden={!source}><span className="status">{busy ? <><LoaderCircle size={14} className="spin" />{loading ? 'Opening image…' : 'Tracing on your device…'}</> : ready ? <><span className="status-dot" />{result.paths ? 'Vector ready' : 'No visible paths — try less cleanup'}</> : <><MousePointer2 size={14} />{source ? 'Adjust your settings to continue' : 'Try a sample below to get started'}</>}</span><div className="zoom"><button className="icon-button" aria-label="Zoom out" disabled={!source || zoom <= 0.5} onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}><ZoomOut size={16} /></button><span>{Math.round(zoom * 100)}%</span><button className="icon-button" aria-label="Zoom in" disabled={!source || zoom >= 4} onClick={() => setZoom(Math.min(4, zoom + 0.25))}><ZoomIn size={16} /></button><button className="icon-button" aria-label="Fit image" disabled={!source} onClick={() => setZoom(1)}><Maximize size={16} /></button></div></div>
          {source && source.width !== source.originalWidth && <div className="resolution-note">Preview traced at {source.width} × {source.height} for responsiveness. SVG retains the original {source.originalWidth} × {source.originalHeight} dimensions.</div>}
        </section>
        <aside className="settings-panel" aria-label="Tracing settings" hidden={!source}><div className="panel-heading"><h2><SlidersHorizontal size={17} />Adjust image</h2><button className="icon-button" aria-label="Reset settings" title="Reset to Clean icon" onClick={() => usePreset('clean')}><RotateCcw size={16} /></button></div><div className="settings-body"><div className="section-label">Preset <span>{preset === 'custom' ? 'Custom' : ''}</span></div><div className="presets">{Object.entries(presets).map(([id, item]) => <button key={id} className={`preset ${preset === id ? 'selected' : ''}`} onClick={() => usePreset(id)} aria-pressed={preset === id} aria-label={`${item.name} ${item.description}`} title={item.description}>{item.name}</button>)}</div><div className="section-break" /><Slider label="Color limit" value={settings.colors} min={2} max={32} hint="Fewer colors, simpler artwork." onChange={(value) => update('colors', value)} /><Slider label="Corner smoothing" value={settings.smoothing} min={0} max={100} suffix="%" disabled={settings.mode !== 'spline'} hint="Round off corners without the rough edges." onChange={(value) => update('smoothing', value)} /><Slider label="Noise cleanup" value={settings.speckle} min={0} max={20} suffix=" px" hint="Remove small speckles. High values may erase thin detail." onChange={(value) => update('speckle', value)} /><details className="advanced"><summary>Fine-tune details <ChevronDown size={15} /></summary><label className="select-field">Path style<select value={settings.mode} onChange={(event) => update('mode', event.target.value as Settings['mode'])}><option value="spline">Smooth curves</option><option value="polygon">Straight segments</option><option value="pixel">Pixel edges</option></select></label><Slider label="Path simplification" value={settings.simplify} min={0} max={3} step={0.1} suffix=" px" disabled={settings.mode === 'pixel'} hint="Higher values use fewer points." onChange={(value) => update('simplify', value)} /><Slider label="Denoise radius" value={settings.denoise} min={0} max={2} suffix=" px" hint="Edge-aware cleanup before tracing." onChange={(value) => update('denoise', value)} /><label className="toggle-row"><span>Remove border background<small>Removes edge-connected corner colors.</small></span><input type="checkbox" checked={settings.removeBackground} onChange={(event) => update('removeBackground', event.target.checked)} /></label>{settings.removeBackground && <Slider label="Background tolerance" value={settings.backgroundTolerance} min={0} max={80} hint="Increase to include similar background shades." onChange={(value) => update('backgroundTolerance', value)} />}</details></div>
          <div className="export-section"><div className="output-meta"><span>Output</span><span>{ready ? `${result.paths} paths · ${formatBytes(result.bytes)}` : '—'}</span></div>{ready && result.palette.length > 0 && <div className="palette" aria-label="Output colors">{result.palette.slice(0, 32).map((color) => <span key={color} style={{ background: color }} title={color} />)}<small>{result.palette.length} colors</small></div>}<button className="button primary download" disabled={!ready} onClick={exportSvg}><ArrowDownToLine size={17} />Download SVG</button><button className="button copy" disabled={!ready} onClick={() => void copySvg()}><Copy size={15} />Copy SVG markup</button><p>Editable paths. Ready to import into Figma.</p></div>
        </aside>
          <section className="samples"><div className="samples-heading"><span>Try an example</span></div><div className="sample-grid">{samples.map((sample) => <button key={sample.id} className={`sample ${source?.name === `${sample.id}.png` ? 'chosen' : ''}`} onClick={() => void loadSample(sample.id)} aria-label={`Try ${sample.name} sample`}><div className={`sample-thumb thumb-${sample.id}`}><img src={sampleUrl(sample.svg)} alt="" /></div><strong>{sample.name}</strong><span>{sample.kind}</span></button>)}</div></section>
      </div>
      <footer className="page-footer"><span><LockKeyhole size={13} />No uploads. No accounts.</span><span>{ready ? `Traced in ${result.duration} ms` : 'PNG → SVG'}<span className="footer-dot">·</span>Powered by VTracer</span></footer>
    </main>
    {message && <div className="toast" role="status"><Check size={17} /><span>{message}</span><button className="icon-button" aria-label="Dismiss message" onClick={() => setMessage('')}><X size={15} /></button></div>}
    {dragging && <div className="drag-overlay"><div><Upload size={42} /><h2>Drop your PNG here</h2><p>Release to open the image.</p></div></div>}
    <div className="sr-only" role="status" aria-live="polite">{busy ? 'Processing image' : ready ? 'Vector ready to download' : ''}</div>
  </>;
}
