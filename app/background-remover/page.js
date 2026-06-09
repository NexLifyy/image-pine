"use client";

import React, { useState, useEffect, useRef } from 'react';
import ToolPageShell from '@/components/ToolPageShell';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';

// Inline Before/After Slider component (similar to home page)
function InlineSlider({ beforeSrc, afterSrc, beforeLabel, afterLabel }) {
  const [pos, setPos] = useState(50);
  const [containerW, setContainerW] = useState(0);
  const boxRef = useRef(null);
  const dragging = useRef(false);

  useEffect(() => {
    if (!boxRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerW(entry.contentRect.width);
    });
    ro.observe(boxRef.current);
    setContainerW(boxRef.current.offsetWidth);
    return () => ro.disconnect();
  }, []);

  const move = (clientX) => {
    if (!boxRef.current) return;
    const r = boxRef.current.getBoundingClientRect();
    setPos(Math.max(2, Math.min(98, ((clientX - r.left) / r.width) * 100)));
  };

  useEffect(() => {
    const onMove = (e) => { if (dragging.current) move(e.clientX); };
    const onTouch = (e) => { if (dragging.current) move(e.touches[0].clientX); };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onTouch, { passive: true });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onTouch);
      window.removeEventListener('touchend', onUp);
    };
  }, []);

  const imgW = containerW > 0 ? `${containerW}px` : '100%';

  return (
    <div
      ref={boxRef}
      onMouseDown={(e) => { dragging.current = true; move(e.clientX); }}
      onTouchStart={(e) => { dragging.current = true; move(e.touches[0].clientX); }}
      style={{
        position: 'relative', width: '100%', minHeight: 380,
        background: 'repeating-conic-gradient(#F1F1F7 0% 25%, #fff 0% 50%) 0 0 / 20px 20px',
        borderRadius: 12, overflow: 'hidden',
        cursor: 'col-resize', userSelect: 'none',
        border: '1px solid #E4E4EF',
      }}
    >
      <img src={beforeSrc} alt="Original" draggable={false}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'contain', pointerEvents: 'none',
        }}
      />
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0,
        width: `${pos}%`, overflow: 'hidden', pointerEvents: 'none',
      }}>
        <img src={afterSrc} alt="No Background" draggable={false}
          style={{
            position: 'absolute', top: 0, left: 0,
            width: imgW,
            height: '100%',
            objectFit: 'contain',
            maxWidth: 'none',
          }}
        />
      </div>
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: `${pos}%`,
        width: 2, background: '#fff',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.12)',
        transform: 'translateX(-50%)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '50%', left: `${pos}%`,
        transform: 'translate(-50%, -50%)',
        width: 40, height: 40, borderRadius: '50%',
        background: '#fff', boxShadow: '0 2px 16px rgba(0,0,0,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '2px solid rgba(91,91,214,0.25)', pointerEvents: 'none', zIndex: 10,
      }}>
        <svg width="16" height="16" fill="none" stroke="#5B5BD6" strokeWidth="2.2" strokeLinecap="round" viewBox="0 0 24 24">
          <path d="M8 18l-5-5 5-5M16 6l5 5-5 5" />
        </svg>
      </div>
      <div style={{
        position: 'absolute', top: 10, left: 10,
        background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(6px)',
        border: '1px solid rgba(91,91,214,0.2)', borderRadius: 7, padding: '3px 10px',
        fontSize: 10, fontWeight: 700, color: '#5B5BD6', pointerEvents: 'none',
      }}>
        {afterLabel}
      </div>
      <div style={{
        position: 'absolute', top: 10, right: 10,
        background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(6px)',
        border: '1px solid #E4E4EF', borderRadius: 7, padding: '3px 10px',
        fontSize: 10, fontWeight: 700, color: '#9898B5', pointerEvents: 'none',
      }}>
        {beforeLabel}
      </div>
    </div>
  );
}

export default function BackgroundRemoverPage() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [processedUrl, setProcessedUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [outputFormat, setOutputFormat] = useState('png'); // 'png' | 'webp'
  const [toast, setToast] = useState(null);

  // Dynamic import of @imgly/background-removal since it relies on window/document (browser only)
  const removeBgRef = useRef(null);

  useEffect(() => {
    import('@imgly/background-removal').then((mod) => {
      removeBgRef.current = mod.default || mod.removeBackground;
    }).catch(err => {
      console.error("Failed to load background removal library:", err);
    });
  }, []);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setProcessedUrl('');
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  const handleFileSelect = (files) => {
    if (files && files.length > 0) {
      setFile(files[0]);
    }
  };

  const handleRemoveBackground = async () => {
    if (!file) return;
    if (!removeBgRef.current) {
      showToast("Library is loading. Please wait a moment.", "warning");
      return;
    }

    setIsProcessing(true);
    setProgressMsg('Initializing neural network...');
    setProgressPercent(10);

    try {
      const config = {
        progress: (key, current, total) => {
          let phase = 'Processing...';
          if (key.includes('fetch')) {
            phase = 'Downloading AI model assets...';
          } else if (key.includes('compile')) {
            phase = 'Compiling WebAssembly engine...';
          } else if (key.includes('inference')) {
            phase = 'Extracting background...';
          }
          const pct = Math.round((current / total) * 100);
          setProgressMsg(`${phase} (${pct}%)`);
          setProgressPercent(pct);
        }
      };

      const blob = await removeBgRef.current(file, config);
      
      // Convert to specified save format if WebP is selected
      let finalBlob = blob;
      if (outputFormat === 'webp') {
        finalBlob = await convertBlobToWebp(blob);
      }

      const url = URL.createObjectURL(finalBlob);
      setProcessedUrl(url);
      showToast("Background removed successfully!", "success");
    } catch (err) {
      console.error(err);
      showToast(`Error: ${err.message || 'Background removal failed.'}`, "error");
    } finally {
      setIsProcessing(false);
      setProgressMsg('');
      setProgressPercent(0);
    }
  };

  const convertBlobToWebp = (blob) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((webpBlob) => {
          resolve(webpBlob || blob);
        }, 'image/webp', 0.92);
      };
      img.onerror = () => resolve(blob);
      img.src = URL.createObjectURL(blob);
    });
  };

  const handleDownload = () => {
    if (!processedUrl || !file) return;
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    const ext = outputFormat === 'webp' ? 'webp' : 'png';
    saveAs(processedUrl, `${nameWithoutExt}_no_bg.${ext}`);
    saveHistory('Background Remover', `${file.name} (Removed Background)`);
  };

  const _FEATURES = [
    {
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      title: '100% Client-Side',
      desc: 'Runs entirely in your web browser. Your images are never uploaded to any server, keeping them completely private.'
    },
    {
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      ),
      title: 'ONNX WebAssembly Speed',
      desc: 'Powered by highly optimized machine learning models compiled to WebAssembly for fast inference right in the browser.'
    },
    {
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M20.4 14.5L16 10l-6 6-4-4-3 3" />
        </svg>
      ),
      title: 'Before/After Comparison',
      desc: 'Compare the original image with the background-removed version side-by-side using an interactive slider.'
    }
  ];

  const _STEPS = [
    { n: '1', title: 'Load Image', desc: 'Select any JPEG, PNG, or WebP photo to process.' },
    { n: '2', title: 'Extract Background', desc: 'Click Remove Background. The AI model compiles and processes the photo locally.' },
    { n: '3', title: 'Inspect & Download', desc: 'Verify using the slider overlay and export as a transparent PNG or WebP.' }
  ];

  const _FAQS = [
    { q: 'Is my data secure?', a: 'Yes. Background removal runs entirely locally inside your browser cache. No image files are ever uploaded or processed on external servers.' },
    { q: 'Why does the first run take longer?', a: 'On the very first run, the browser needs to download the neural network AI models (around 80MB). Once downloaded, they are stored in your browser cache, making subsequent runs almost instant.' },
    { q: 'What outputs are supported?', a: 'You can download the transparent cutouts in either PNG (lossless transparent) or WebP (compressed transparent) format.' }
  ];

  const cardStyle = {
    background: '#fff',
    border: '1px solid #E4E4EF',
    borderRadius: 20,
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
    height: 'fit-content'
  };

  return (
    <ToolPageShell
      title="Background Remover"
      subtitle="Remove photo backgrounds automatically in seconds. Powered by client-side AI, runs 100% privately on your device."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoText="Free online client-side AI Background Remover. Auto crop transparent backgrounds and cutouts from your images instantly. 100% private locally on your computer."
    >
      {!file ? (
        <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
          <UploadBox
            onFileSelect={handleFileSelect}
            acceptedFormats={['.jpg', '.jpeg', '.png', '.webp']}
            multiple={false}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-scale-in">
          {/* Left: Large Image Preview */}
          <div className="lg:col-span-8" style={{ ...cardStyle, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #E4E4EF' }}>
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#111128', margin: 0 }}>{file.name}</h3>
                <p style={{ fontSize: 10, color: '#9898B5', margin: '2px 0 0', fontWeight: 600 }}>
                  {processedUrl ? 'Background removed!' : 'Ready to extract background'}
                </p>
              </div>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => { setFile(null); setProcessedUrl(''); }}
                style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', background: '#FDF2F2', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: isProcessing ? 'not-allowed' : 'pointer' }}
              >
                Change Image
              </button>
            </div>

            <div style={{
              minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
              background: 'repeating-conic-gradient(#F1F1F7 0% 25%, #fff 0% 50%) 0 0 / 20px 20px',
            }}>
              {processedUrl ? (
                <InlineSlider
                  beforeSrc={previewUrl}
                  afterSrc={processedUrl}
                  beforeLabel="Original"
                  afterLabel="No Background"
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Preview"
                  style={{
                    maxHeight: 520,
                    maxWidth: '100%',
                    objectFit: 'contain',
                    borderRadius: 10,
                    boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
                    display: 'block'
                  }}
                />
              )}
            </div>

            {isProcessing && (
              <div style={{ padding: '20px', borderTop: '1px solid #E4E4EF', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: '#6B6B8A' }}>
                  <span>{progressMsg}</span>
                  <span>{progressPercent}%</span>
                </div>
                <div style={{ width: '100%', height: 8, background: '#F1F1F7', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${progressPercent}%`, height: '100%', background: 'linear-gradient(90deg, #7342E6 0%, #5B5BD6 100%)', borderRadius: 99, transition: 'width 0.2s ease-out' }} />
                </div>
              </div>
            )}
          </div>

          {/* Right: Controls Panel */}
          <div className="lg:col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Format Selection Card */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: 12, fontWeight: 800, color: '#9898B5', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 10px' }}>Output Format</h3>
              <div style={{ display: 'flex', background: '#F1F1F7', border: '1px solid #E4E4EF', borderRadius: 9, padding: 3 }}>
                {[
                  { value: 'png', label: 'PNG (Lossless)' },
                  { value: 'webp', label: 'WebP (Lossy)' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setOutputFormat(opt.value)}
                    style={{
                      flex: 1, padding: '6px 2px', fontSize: 10, fontWeight: 700, borderRadius: 6, border: 'none', cursor: 'pointer',
                      background: outputFormat === opt.value ? '#fff' : 'transparent',
                      color: outputFormat === opt.value ? '#5B5BD6' : '#9898B5',
                      boxShadow: outputFormat === opt.value ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.15s'
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions Card */}
            <div style={cardStyle}>
              {!processedUrl ? (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleRemoveBackground}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #7342E6 0%, #5B5BD6 100%)',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 13,
                    borderRadius: 12,
                    padding: '13px',
                    border: 'none',
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 4px 14px rgba(115,66,230,0.28)',
                    transition: 'all 0.18s'
                  }}
                  onMouseEnter={e => { if (!isProcessing) { e.currentTarget.style.boxShadow = '0 6px 24px rgba(115,66,230,0.38)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                  onMouseLeave={e => { if (!isProcessing) { e.currentTarget.style.boxShadow = '0 4px 14px rgba(115,66,230,0.28)'; e.currentTarget.style.transform = 'none'; } }}
                >
                  {isProcessing ? 'Processing...' : (
                    <>
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                      </svg>
                      Remove Background
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDownload}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 13,
                    borderRadius: 12,
                    padding: '13px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 4px 14px rgba(22,163,74,0.28)',
                    transition: 'all 0.18s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(22,163,74,0.38)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(22,163,74,0.28)'; e.currentTarget.style.transform = 'none'; }}
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Download Image
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div 
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: toast.type === 'error' ? '#FFF5F5' : toast.type === 'success' ? '#ECFDF5' : toast.type === 'warning' ? '#FFFBEB' : '#F4F4F5',
            border: `1px solid ${toast.type === 'error' ? '#FCA5A5' : toast.type === 'success' ? '#A7F3D0' : toast.type === 'warning' ? '#FDE68A' : '#E4E4E7'}`,
            color: toast.type === 'error' ? '#B91C1C' : toast.type === 'success' ? '#065F46' : toast.type === 'warning' ? '#92400E' : '#27272A',
            padding: '12px 20px',
            borderRadius: 12,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13,
            fontWeight: 700,
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        >
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes slideUp {
              from { transform: translateY(20px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}} />
          {toast.type === 'error' && (
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12" y2="16" />
            </svg>
          )}
          {toast.type === 'success' && (
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          {toast.type === 'warning' && (
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12" y2="17" />
            </svg>
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </ToolPageShell>
  );
}
