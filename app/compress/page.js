"use client";

import React, { useState, useEffect, useRef } from 'react';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';
import ToolPageShell from '@/components/ToolPageShell';

const _FEATURES = [
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>), title: 'Smart Compression', desc: 'Binary search finds optimal quality to hit your exact target.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>), title: 'Quality Control', desc: 'Slide from 5% to 100% for full quality control.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>), title: '100% Private', desc: 'All compression runs locally - nothing uploaded.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>), title: 'Instant Preview', desc: 'Live preview updates as you adjust settings.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>), title: 'JPEG, PNG, WebP', desc: 'Compress and convert between the most common formats.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>), title: 'Completely Free', desc: 'No account, no watermark, no limits.' },
];
const _STEPS = [
  { n: '1', title: 'Upload', desc: 'Drop your JPEG, PNG or WebP image.' },
  { n: '2', title: 'Adjust', desc: 'Set target KB or drag the quality slider.' },
  { n: '3', title: 'Download', desc: 'Download your compressed image.' },
];
const _FAQS = [
  { q: 'How does compression work?', a: 'Canvas algorithms adjust quality and strip metadata to reduce size.' },
  { q: 'Can I set a specific target size?', a: 'Yes - enter KB value and binary search compression hits it exactly.' },
  { q: 'What formats are supported?', a: 'JPEG, PNG, and WebP.' },
  { q: 'Are my files stored anywhere?', a: 'No. Compression runs entirely in your browser.' },
];

const fmt = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024, s = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + s[i];
};
const card = { background: '#fff', border: '1px solid #E4E4EF', borderRadius: 20, padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' };
const label = { fontSize: 10, fontWeight: 800, color: '#9898B5', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 };
const primaryBtn = { width: '100%', padding: '13px', fontSize: 13, fontWeight: 800, borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)', color: '#fff', boxShadow: '0 4px 14px rgba(91,91,214,0.30)', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.18s' };
const successBtn = { ...primaryBtn, background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)', boxShadow: '0 4px 14px rgba(22,163,74,0.28)' };

export default function CompressPage() {
  const [file, setFile] = useState(null);
  const [quality, setQuality] = useState(80);
  const [targetSize, setTargetSize] = useState(150);
  const [format, setFormat] = useState('image/jpeg');
  const [compressedBlob, setCompressedBlob] = useState(null);
  const [compressedUrl, setCompressedUrl] = useState(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const prevPreviewsRef = useRef([]);
  useEffect(() => {
    const cur = [file?.preview].filter(Boolean);
    prevPreviewsRef.current.filter(p => !cur.includes(p)).forEach(u => URL.revokeObjectURL(u));
    prevPreviewsRef.current = cur;
  }, [file]);
  useEffect(() => () => prevPreviewsRef.current.forEach(u => URL.revokeObjectURL(u)), []);

  useEffect(() => {
    if (file) setTargetSize(Math.max(10, Math.round((file.size / 1024) * 0.7)));
  }, [file]);

  const handleFileSelect = (list) => {
    if (list.length > 0) setFile(list[0]); else setFile(null);
    setCompressedBlob(null);
    if (compressedUrl) { URL.revokeObjectURL(compressedUrl); setCompressedUrl(null); }
    setErrorMsg('');
  };

  // Auto-compress on any setting change
  useEffect(() => {
    if (!file) return;
    let active = true;
    setIsCompressing(true); setErrorMsg('');
    const img = new Image();
    img.onload = async () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const targetBytes = targetSize * 1024;
        // Binary search for target size
        let lo = 0.05, hi = 1.0, bestBlob = null;
        for (let i = 0; i < 12; i++) {
          const mid = (lo + hi) / 2;
          const blob = await new Promise(res => canvas.toBlob(res, format, mid));
          if (!blob) break;
          if (blob.size <= targetBytes) { lo = mid; bestBlob = blob; }
          else hi = mid;
          if (hi - lo < 0.01) break;
        }
        // fallback to quality slider
        if (!bestBlob) bestBlob = await new Promise(res => canvas.toBlob(res, format, quality / 100));
        if (!bestBlob) throw new Error('Compression failed.');
        if (!active) return;
        if (compressedUrl) URL.revokeObjectURL(compressedUrl);
        const url = URL.createObjectURL(bestBlob);
        setCompressedBlob(bestBlob); setCompressedUrl(url);
      } catch (e) { if (active) setErrorMsg(e.message); }
      finally { if (active) setIsCompressing(false); }
    };
    img.onerror = () => { if (active) { setErrorMsg('Failed to load image.'); setIsCompressing(false); } };
    img.src = file.preview || URL.createObjectURL(file);
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, targetSize, quality, format]);

  useEffect(() => () => { if (compressedUrl) URL.revokeObjectURL(compressedUrl); }, [compressedUrl]);

  const download = () => {
    if (!compressedBlob || !file) return;
    const ext = format === 'image/webp' ? 'webp' : format === 'image/png' ? 'png' : 'jpg';
    const name = `${file.name.replace(/\.[^/.]+$/, '')}_compressed.${ext}`;
    saveAs(compressedBlob, name);
    saveHistory('Image Compressor', `${name} (${fmt(compressedBlob.size)})`);
  };

  const savings = file && compressedBlob ? Math.max(0, Math.round(((file.size - compressedBlob.size) / file.size) * 100)) : 0;
  const originalKb = file ? Math.ceil(file.size / 1024) : 1000;

  return (
    <ToolPageShell
      title="Image Compressor"
      subtitle="Shrink image file sizes without visible quality loss. Set target KB or adjust quality. 100% private, browser-based."
      features={_FEATURES} steps={_STEPS} faqs={_FAQS}
      seoText="Compress images online for free. Reduce JPG, PNG and WebP sizes by up to 80% with adjustable quality. Browser-based, no uploads."
    >
      {!file ? (
        /* ── Upload State ───────────────────────────────────────────── */
        <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
          <UploadBox onFileSelect={handleFileSelect} acceptedFormats={['.jpg', '.jpeg', '.png', '.webp']} multiple={false} />
        </div>
      ) : (
        /* ── Workspace ─────────────────────────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5" style={{ alignItems: 'start' }}>

          {/* LEFT: big preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Image preview card */}
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              {/* File info bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #E4E4EF' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {file.preview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={file.preview} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 8, border: '1px solid #E4E4EF' }} />
                  )}
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#111128', margin: 0, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                    <p style={{ fontSize: 11, color: '#9898B5', margin: '2px 0 0', fontWeight: 500 }}>Original: {fmt(file.size)}</p>
                  </div>
                </div>
                <button onClick={() => handleFileSelect([])} style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 10px', borderRadius: 8, background: '#FEF2F2' }}>
                  Change File
                </button>
              </div>
              {/* Checkerboard preview */}
              <div style={{
                minHeight: 380, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                background: 'repeating-conic-gradient(#F1F1F7 0% 25%, #fff 0% 50%) 0 0 / 20px 20px',
              }}>
                {compressedUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={compressedUrl} alt="Compressed Preview" style={{ maxHeight: 480, maxWidth: '100%', objectFit: 'contain', display: 'block' }} />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={file.preview} alt="Original" style={{ maxHeight: 480, maxWidth: '100%', objectFit: 'contain', display: 'block', opacity: 0.5 }} />
                )}
                {isCompressing && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(4px)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <svg style={{ animation: 'spin 0.8s linear infinite', width: 28, height: 28 }} fill="none" viewBox="0 0 24 24">
                        <circle style={{ opacity: 0.2 }} cx="12" cy="12" r="10" stroke="#5B5BD6" strokeWidth="4" />
                        <path style={{ opacity: 0.9 }} fill="#5B5BD6" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#5B5BD6' }}>Compressing…</span>
                    </div>
                  </div>
                )}
                {/* Size badges */}
                {compressedBlob && !isCompressing && (
                  <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8 }}>
                    <span style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid #E4E4EF', borderRadius: 99, padding: '5px 14px', fontSize: 11, fontWeight: 700, color: '#6B6B8A', whiteSpace: 'nowrap' }}>
                      Before: {fmt(file.size)}
                    </span>
                    <span style={{ background: savings > 0 ? '#DCFCE7' : '#EEF0FF', border: `1px solid ${savings > 0 ? '#BBF7D0' : '#C7C7E2'}`, borderRadius: 99, padding: '5px 14px', fontSize: 11, fontWeight: 700, color: savings > 0 ? '#16A34A' : '#5B5BD6', whiteSpace: 'nowrap' }}>
                      After: {fmt(compressedBlob.size)}{savings > 0 ? ` · ↓${savings}%` : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={card}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Format */}
                <div>
                  <span style={label}>Output Format</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                    {[['JPEG', 'image/jpeg'], ['WebP', 'image/webp'], ['PNG', 'image/png']].map(([l, v]) => (
                      <button key={v} onClick={() => setFormat(v)} style={{
                        padding: '9px 4px', fontSize: 11, fontWeight: 700, borderRadius: 9, cursor: 'pointer',
                        border: `1.5px solid ${format === v ? '#5B5BD6' : '#E4E4EF'}`,
                        background: format === v ? '#EEF0FF' : '#FAFAFF',
                        color: format === v ? '#5B5BD6' : '#6B6B8A',
                        transition: 'all 0.15s',
                      }}>{l}</button>
                    ))}
                  </div>
                </div>

                {/* Target KB */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                    <span style={label}>Max File Size</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#5B5BD6' }}>{targetSize} KB</span>
                  </div>
                  <input type="range" min="10" max={originalKb} value={targetSize}
                    onChange={e => setTargetSize(parseInt(e.target.value, 10))}
                    style={{ width: '100%', accentColor: '#5B5BD6', cursor: 'pointer' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: '#9898B5' }}>10 KB</span>
                    <span style={{ fontSize: 10, color: '#9898B5' }}>{originalKb} KB</span>
                  </div>
                </div>

                {/* Quality */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                    <span style={label}>Quality</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#5B5BD6' }}>{quality}%</span>
                  </div>
                  <input type="range" min="5" max="100" step="5" value={quality}
                    onChange={e => setQuality(parseInt(e.target.value, 10))}
                    style={{ width: '100%', accentColor: '#5B5BD6', cursor: 'pointer' }} />
                </div>

                {/* Stats */}
                {compressedBlob && !isCompressing && (
                  <div style={{ background: savings > 0 ? '#F0FDF4' : '#F7F7FB', border: `1px solid ${savings > 0 ? '#BBF7D0' : '#E4E4EF'}`, borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      ['Original', fmt(file.size), '#6B6B8A'],
                      ['Compressed', fmt(compressedBlob.size), '#5B5BD6'],
                      ['Saved', savings > 0 ? `${savings}% smaller` : 'No reduction', savings > 0 ? '#16A34A' : '#9898B5'],
                    ].map(([l, v, c]) => (
                      <div key={l} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, color: '#9898B5', fontWeight: 600 }}>{l}</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: c }}>{v}</span>
                      </div>
                    ))}
                  </div>
                )}

                {errorMsg && (
                  <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, fontSize: 12, color: '#DC2626', fontWeight: 600 }}>
                    {errorMsg}
                  </div>
                )}

                {/* Download */}
                <button onClick={download} disabled={isCompressing || !compressedBlob}
                  style={{ ...successBtn, opacity: (isCompressing || !compressedBlob) ? 0.5 : 1, cursor: (isCompressing || !compressedBlob) ? 'not-allowed' : 'pointer' }}
                  onMouseEnter={e => { if (compressedBlob) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Download Compressed Image
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </ToolPageShell>
  );
}
