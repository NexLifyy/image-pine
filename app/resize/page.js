"use client";

import React, { useState, useEffect, useRef } from 'react';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';
import { getMimeForSaveFormat, getExtensionForMime, compressCanvasToBlob } from '@/lib/imageUtils';
import ToolPageShell from '@/components/ToolPageShell';

const _FEATURES = [
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>), title: 'Pixel-Perfect Resize', desc: 'Set exact width and height with optional aspect-ratio lock.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><circle cx="9" cy="9" r="2"/><circle cx="15" cy="15" r="2"/><path d="M16 8L8 16"/></svg>), title: 'Scale by Percentage', desc: 'Scale by 50%, 75% or any amount using a simple slider.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>), title: 'Privacy Guaranteed', desc: 'All resizing happens in your browser - nothing uploaded.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>), title: 'Instant Processing', desc: 'Canvas bicubic resampling finishes in milliseconds.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>), title: 'Multiple Formats', desc: 'Export as JPEG, PNG, or WebP with optional target size.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>), title: 'Completely Free', desc: 'No watermarks, no registration, no limits.' },
];
const _STEPS = [
  { n: '1', title: 'Upload', desc: 'Drop your JPEG, PNG, WebP or SVG image.' },
  { n: '2', title: 'Set Size', desc: 'Enter pixel dimensions or use the percentage slider.' },
  { n: '3', title: 'Download', desc: 'Click Resize and download your file.' },
];
const _FAQS = [
  { q: 'How does the resizer preserve quality?', a: 'Bicubic scaling inside HTML5 Canvas prevents pixelation.' },
  { q: 'Can I resize by percentage?', a: 'Yes - toggle to percentage mode and slide from 1% to 200%.' },
  { q: 'Are images sent to any server?', a: 'No. All processing is 100% client-side.' },
  { q: 'What formats are supported?', a: 'JPEG, PNG, WebP, SVG as input. Export as JPEG, PNG, or WebP.' },
];

/* ─── helpers ──────────────────────────────────────────────────────────── */
const fmt = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024, s = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + s[i];
};

/* ─── card & label styles ────────────────────────────────────────────── */
const card = { background: '#fff', border: '1px solid #E4E4EF', borderRadius: 20, padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' };
const label = { fontSize: 10, fontWeight: 800, color: '#9898B5', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 };
const inputStyle = { width: '100%', fontSize: 13, fontWeight: 600, color: '#111128', border: '1.5px solid #E4E4EF', borderRadius: 10, background: '#FAFAFF', padding: '10px 12px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.18s' };
const segBtn = (active) => ({ flex: 1, padding: '8px 4px', fontSize: 11, fontWeight: 700, borderRadius: 8, border: 'none', cursor: 'pointer', transition: 'all 0.18s', background: active ? '#fff' : 'transparent', color: active ? '#5B5BD6' : '#9898B5', boxShadow: active ? '0 1px 6px rgba(0,0,0,0.08)' : 'none' });
const primaryBtn = { width: '100%', padding: '13px', fontSize: 13, fontWeight: 800, borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)', color: '#fff', boxShadow: '0 4px 14px rgba(91,91,214,0.30)', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.18s' };
const successBtn = { ...primaryBtn, background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)', boxShadow: '0 4px 14px rgba(22,163,74,0.28)' };

export default function ResizePage() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const prevPreviewsRef = useRef([]);
  useEffect(() => {
    const cur = files.map(f => f.preview).filter(Boolean);
    prevPreviewsRef.current.filter(p => !cur.includes(p)).forEach(u => URL.revokeObjectURL(u));
    prevPreviewsRef.current = cur;
  }, [files]);
  useEffect(() => () => prevPreviewsRef.current.forEach(u => URL.revokeObjectURL(u)), []);

  const [originalWidth, setOriginalWidth] = useState(0);
  const [originalHeight, setOriginalHeight] = useState(0);
  const [widthInput, setWidthInput] = useState('');
  const [heightInput, setHeightInput] = useState('');
  const [lockRatio, setLockRatio] = useState(true);
  const [aspectRatio, setAspectRatio] = useState(1);
  const [resizeAsPercentage, setResizeAsPercentage] = useState(false);
  const [percentageValue, setPercentageValue] = useState('50');
  const [targetSizeInput, setTargetSizeInput] = useState('');
  const [targetSizeUnit, setTargetSizeUnit] = useState('KB');
  const [saveFormat, setSaveFormat] = useState('Original');
  const [isResizing, setIsResizing] = useState(false);
  const [resizedBlob, setResizedBlob] = useState(null);
  const [resizedUrl, setResizedUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const imageRef = useRef(null);

  const handleFileSelect = (list) => {
    setFiles(list);
    if (list.length > 0) { setSelectedFile(list[0]); resetResizeStates(); }
    else { setSelectedFile(null); resetResizeStates(); }
  };

  const resetResizeStates = () => {
    setOriginalWidth(0); setOriginalHeight(0);
    setWidthInput(''); setHeightInput('');
    setResizedBlob(null);
    if (resizedUrl) { URL.revokeObjectURL(resizedUrl); setResizedUrl(null); }
    setErrorMsg('');
  };

  useEffect(() => {
    if (!selectedFile) return;
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      setOriginalWidth(w); setOriginalHeight(h);
      setWidthInput(w.toString()); setHeightInput(h.toString());
      setAspectRatio(w / h);
      setResizedBlob(null);
      if (resizedUrl) { URL.revokeObjectURL(resizedUrl); setResizedUrl(null); }
      setErrorMsg('');
    };
    img.src = selectedFile.preview;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFile]);

  const handleWidthChange = (val) => {
    setWidthInput(val);
    const pw = parseInt(val, 10);
    if (!isNaN(pw) && pw > 0 && lockRatio && aspectRatio) setHeightInput(Math.round(pw / aspectRatio).toString());
  };
  const handleHeightChange = (val) => {
    setHeightInput(val);
    const ph = parseInt(val, 10);
    if (!isNaN(ph) && ph > 0 && lockRatio && aspectRatio) setWidthInput(Math.round(ph * aspectRatio).toString());
  };

  const executeResize = () => {
    if (!selectedFile) return;
    setIsResizing(true); setErrorMsg('');
    const img = new Image();
    img.onload = async () => {
      try {
        let wF = parseInt(widthInput, 10) || originalWidth;
        let hF = parseInt(heightInput, 10) || originalHeight;
        if (resizeAsPercentage) { const p = parseFloat(percentageValue) / 100; wF = Math.round(originalWidth * p); hF = Math.round(originalHeight * p); }
        if (wF <= 0 || hF <= 0) throw new Error('Width and height must be greater than 0.');
        const canvas = document.createElement('canvas');
        canvas.width = wF; canvas.height = hF;
        const ctx = canvas.getContext('2d');
        const mime = getMimeForSaveFormat(saveFormat, selectedFile.type);
        if (mime === 'image/png' || mime === 'image/webp') ctx.clearRect(0, 0, wF, hF);
        else { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, wF, hF); }
        ctx.drawImage(img, 0, 0, wF, hF);
        let blob;
        if (targetSizeInput && parseFloat(targetSizeInput) > 0) {
          const targetBytes = parseFloat(targetSizeInput) * (targetSizeUnit === 'MB' ? 1024 * 1024 : 1024);
          const res = await compressCanvasToBlob(canvas, mime, targetBytes);
          blob = res.blob;
        } else {
          blob = await new Promise(res => canvas.toBlob(res, mime, 0.92));
        }
        if (!blob) throw new Error('Failed to generate image.');
        if (resizedUrl) URL.revokeObjectURL(resizedUrl);
        const url = URL.createObjectURL(blob);
        setResizedBlob(blob); setResizedUrl(url);
        saveHistory('Image Resizer', `${selectedFile.name} → ${wF}×${hF}`);
      } catch (e) { setErrorMsg(e.message); }
      finally { setIsResizing(false); }
    };
    img.onerror = () => { setErrorMsg('Failed to load image.'); setIsResizing(false); };
    img.src = selectedFile.preview;
  };

  const downloadResizedImage = () => {
    if (!resizedBlob || !selectedFile) return;
    const mime = resizedBlob.type;
    const ext = getExtensionForMime(mime, selectedFile.name);
    const base = selectedFile.name.replace(/\.[^/.]+$/, '');
    saveAs(resizedBlob, `${base}_${widthInput}x${heightInput}.${ext}`);
  };

  const savings = resizedBlob && selectedFile ? Math.max(0, Math.round(((selectedFile.size - resizedBlob.size) / selectedFile.size) * 100)) : 0;

  return (
    <ToolPageShell
      title="Image Resizer"
      subtitle="Resize images to exact pixel dimensions or a percentage scale. Lock aspect ratio, set target file size. Free and 100% private."
      features={_FEATURES} steps={_STEPS} faqs={_FAQS}
      seoText="Resize images online for free. Scale JPG, PNG and WebP to any pixel dimension or percentage using our browser-based resizer. No uploads, complete privacy."
    >
      {files.length === 0 ? (
        /* ── Upload State ─────────────────────────────────────────── */
        <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
          <UploadBox
            onFileSelect={handleFileSelect}
            acceptedFormats={['.jpg', '.jpeg', '.png', '.webp', '.svg']}
            multiple={true}
          />
        </div>
      ) : (
        /* ── Workspace ─────────────────────────────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_320px] gap-5" style={{ alignItems: 'start' }}>

          {/* LEFT COLUMN: Files List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={label}>Images ({files.length})</span>
                <button onClick={() => handleFileSelect([])} style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}>Clear All</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 340, overflowY: 'auto' }}>
                {files.map((file) => (
                  <div key={file.id} onClick={() => { setSelectedFile(file); resetResizeStates(); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                      borderRadius: 12, border: `1.5px solid ${selectedFile?.id === file.id ? '#5B5BD6' : '#E4E4EF'}`,
                      background: selectedFile?.id === file.id ? '#EEF0FF' : '#FAFAFF',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                    {file.preview && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={file.preview} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 8, border: '1px solid #E4E4EF', flexShrink: 0 }} />
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#111128', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                      <p style={{ fontSize: 10, color: '#9898B5', margin: '2px 0 0', fontWeight: 500 }}>{fmt(file.size)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Add more — compact button instead of full UploadBox */}
            <button
              type="button"
              onClick={() => document.querySelector('input[type="file"]')?.click()}
              style={{
                width: '100%', padding: '10px', fontSize: 12, fontWeight: 700,
                border: '2px dashed #D1D1E4', borderRadius: 12, background: '#F7F7FB',
                color: '#5B5BD6', cursor: 'pointer', transition: 'all 0.2s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#5B5BD6'; e.currentTarget.style.background = '#EDEDFB'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#D1D1E4'; e.currentTarget.style.background = '#F7F7FB'; }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              Add More Images
            </button>
            {/* Hidden file input for Add More */}
            <input type="file" accept=".jpg,.jpeg,.png,.webp,.svg" multiple style={{ display: 'none' }}
              onChange={e => {
                const newFiles = Array.from(e.target.files || []).map(f =>
                  Object.assign(f, { preview: URL.createObjectURL(f), id: Math.random().toString(36).slice(2,9) })
                );
                const merged = [...files, ...newFiles.filter(nf => !files.find(f => f.name === nf.name))];
                setFiles(merged);
                e.target.value = '';
              }}
            />
          </div>

          {/* MIDDLE COLUMN: Large Preview */}
          <div style={{ ...card, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Checkerboard preview */}
            <div style={{
              minHeight: 380, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
              background: 'repeating-conic-gradient(#F1F1F7 0% 25%, #fff 0% 50%) 0 0 / 20px 20px',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img ref={imageRef} src={resizedUrl || selectedFile?.preview || ''}
                alt="Preview" style={{ maxHeight: 480, maxWidth: '100%', objectFit: 'contain', display: 'block' }} />
              {/* badges */}
              {selectedFile && (
                <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ background: 'rgba(255,255,255,0.94)', border: '1px solid #E4E4EF', borderRadius: 8, padding: '4px 10px', fontSize: 10, fontWeight: 700, color: '#6B6B8A' }}>
                    {originalWidth} × {originalHeight} px
                  </span>
                  {resizedBlob && (
                    <span style={{ background: '#DCFCE7', border: '1px solid #BBF7D0', borderRadius: 8, padding: '4px 10px', fontSize: 10, fontWeight: 700, color: '#16A34A' }}>
                      {widthInput} × {heightInput} px{savings > 0 ? ` · ↓${savings}%` : ''}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Controls & Settings */}
          <div style={card}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Mode toggle */}
              <div>
                <span style={label}>Resize Mode</span>
                <div style={{ display: 'flex', background: '#F1F1F7', border: '1px solid #E4E4EF', borderRadius: 10, padding: 3 }}>
                  <button style={segBtn(!resizeAsPercentage)} onClick={() => setResizeAsPercentage(false)}>By Pixels</button>
                  <button style={segBtn(resizeAsPercentage)} onClick={() => setResizeAsPercentage(true)}>By %</button>
                </div>
              </div>

              {resizeAsPercentage ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={label}>Scale</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#5B5BD6' }}>{percentageValue}%</span>
                  </div>
                  <input type="range" min="10" max="200" step="5" value={percentageValue}
                    onChange={e => setPercentageValue(e.target.value)}
                    style={{ width: '100%', accentColor: '#5B5BD6', cursor: 'pointer' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: '#9898B5' }}>10%</span>
                    <span style={{ fontSize: 10, color: '#9898B5' }}>200%</span>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <span style={label}>Width (px)</span>
                    <input type="text" inputMode="numeric" pattern="[0-9]*" value={widthInput} onChange={e => handleWidthChange(e.target.value)}
                      placeholder="Width" style={inputStyle}
                      onFocus={e => e.target.style.borderColor = '#5B5BD6'}
                      onBlur={e => e.target.style.borderColor = '#E4E4EF'} />
                  </div>
                  <div>
                    <span style={label}>Height (px)</span>
                    <input type="text" inputMode="numeric" pattern="[0-9]*" value={heightInput} onChange={e => handleHeightChange(e.target.value)}
                      placeholder="Height" style={inputStyle}
                      onFocus={e => e.target.style.borderColor = '#5B5BD6'}
                      onBlur={e => e.target.style.borderColor = '#E4E4EF'} />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                    <input type="checkbox" checked={lockRatio} onChange={e => {
                      setLockRatio(e.target.checked);
                      if (e.target.checked && originalWidth) setHeightInput(Math.round(parseInt(widthInput, 10) / aspectRatio).toString());
                    }} style={{ accentColor: '#5B5BD6', width: 15, height: 15 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#6B6B8A' }}>Lock aspect ratio</span>
                  </label>
                </div>
              )}

              {/* Output format */}
              <div>
                <span style={label}>Output Format</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {['Original', 'JPG', 'PNG', 'WebP'].map(f => (
                    <button key={f} onClick={() => setSaveFormat(f)} style={{
                      padding: '8px 4px', fontSize: 11, fontWeight: 700, borderRadius: 8, cursor: 'pointer',
                      border: `1.5px solid ${saveFormat === f ? '#5B5BD6' : '#E4E4EF'}`,
                      background: saveFormat === f ? '#EEF0FF' : '#FAFAFF',
                      color: saveFormat === f ? '#5B5BD6' : '#6B6B8A',
                      transition: 'all 0.15s',
                    }}>{f}</button>
                  ))}
                </div>
              </div>

              {/* Target File Size */}
              <div>
                <span style={label}>Target File Size (optional)</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input type="text" inputMode="numeric" pattern="[0-9]*" value={targetSizeInput} onChange={e => setTargetSizeInput(e.target.value)}
                    placeholder="e.g. 150" style={{ ...inputStyle, flex: 1 }}
                    onFocus={e => e.target.style.borderColor = '#5B5BD6'}
                    onBlur={e => e.target.style.borderColor = '#E4E4EF'} />
                  <select value={targetSizeUnit} onChange={e => setTargetSizeUnit(e.target.value)}
                    style={{ ...inputStyle, width: 66, paddingLeft: 8 }}>
                    <option>KB</option>
                    <option>MB</option>
                  </select>
                </div>
              </div>

              {errorMsg && (
                <div style={{ marginTop: 10, padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, fontSize: 12, color: '#DC2626', fontWeight: 600 }}>
                  {errorMsg}
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                <button onClick={executeResize} disabled={isResizing} style={{ ...primaryBtn, opacity: isResizing ? 0.7 : 1, cursor: isResizing ? 'wait' : 'pointer' }}
                  onMouseEnter={e => { if (!isResizing) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; }}>
                  {isResizing ? (
                    <><svg style={{ animation: 'spin 1s linear infinite', width: 16, height: 16 }} fill="none" viewBox="0 0 24 24"><circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Resizing…</>
                  ) : (
                    <><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg> Resize Image</>
                  )}
                </button>
                {resizedBlob && (
                  <button onClick={downloadResizedImage} style={successBtn}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; }}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Download Resized Image
                  </button>
                )}
              </div>

            </div>
          </div>

        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </ToolPageShell>
  );
}
