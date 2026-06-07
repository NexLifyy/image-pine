"use client";

import React, { useState, useEffect, useRef } from 'react';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';
import ToolPageShell from '@/components/ToolPageShell';

const _FEATURES = [
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>), title: 'Grid Layouts', desc: 'Choose from 2x1, 2x2, 3x1, 1x2 and 1x3 templates.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>), title: 'Instant Preview', desc: 'See your collage update in real time as you adjust settings.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>), title: '100% Private', desc: 'All collage creation happens in your browser - nothing uploaded.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>), title: 'JPEG Export', desc: 'Download your finished collage as a high-resolution JPEG.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>), title: 'Custom Spacing', desc: 'Control the gap between images and the background fill color.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>), title: 'Free Forever', desc: 'No account, no watermark, no limits.' },
];

const _STEPS = [
  { n: '1', title: 'Upload Photos', desc: 'Select 2 to 6 JPEG, PNG or WebP images.' },
  { n: '2', title: 'Choose Layout', desc: 'Pick a grid template and adjust gap/color.' },
  { n: '3', title: 'Download', desc: 'Download your finished collage as JPEG.' },
];

const _FAQS = [
  { q: 'How many photos can I add?', a: 'Up to the number of cells in your chosen grid layout (2–4 images).' },
  { q: 'What layouts are available?', a: '1x2, 2x1, 2x2, 1x3, and 3x1 grid arrangements.' },
  { q: 'Can I customize borders?', a: 'Yes - adjust gap size from 0 to 50px and choose any fill color.' },
  { q: 'Are files uploaded?', a: 'No. The collage is drawn on a local HTML5 Canvas. Nothing leaves your device.' },
];

export default function CollagePage() {
  const [files, setFiles] = useState([]);
  const prevPreviewsRef = useRef([]);

  useEffect(() => {
    const currentPreviews = files.map(f => f.preview).filter(Boolean);
    const removedPreviews = prevPreviewsRef.current.filter(p => !currentPreviews.includes(p));
    removedPreviews.forEach(url => URL.revokeObjectURL(url));
    prevPreviewsRef.current = currentPreviews;
  }, [files]);

  useEffect(() => {
    return () => {
      prevPreviewsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const [layout, setLayout] = useState('2x2');
  const [spacing, setSpacing] = useState(15);
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [collageUrl, setCollageUrl] = useState(null);
  const [collageBlob, setCollageBlob] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const getLayoutConfig = (mode) => {
    switch (mode) {
      case '1x2': return { rows: 1, cols: 2, maxImages: 2 };
      case '2x1': return { rows: 2, cols: 1, maxImages: 2 };
      case '1x3': return { rows: 1, cols: 3, maxImages: 3 };
      case '3x1': return { rows: 3, cols: 1, maxImages: 3 };
      case '2x2': default: return { rows: 2, cols: 2, maxImages: 4 };
    }
  };

  const handleFileSelect = (selectedList) => {
    setFiles(selectedList);
    resetCollageStates();
  };

  const resetCollageStates = () => {
    setCollageBlob(null);
    if (collageUrl) { URL.revokeObjectURL(collageUrl); setCollageUrl(null); }
    setErrorMsg('');
  };

  const loadImage = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image: ' + src));
    img.src = src;
  });

  const generateCollage = async () => {
    if (files.length < 2) { setErrorMsg('Please upload at least 2 images.'); return; }
    setIsGenerating(true); setErrorMsg('');
    try {
      const { rows, cols, maxImages } = getLayoutConfig(layout);
      const imagesToLoad = files.slice(0, maxImages);
      const loadedImages = await Promise.all(
        imagesToLoad.map(async (file) => {
          const url = file.preview || URL.createObjectURL(file);
          const img = await loadImage(url);
          return { img, name: file.name };
        })
      );
      const totalWidth = 1200;
      const cellWidth = Math.round((totalWidth - (cols - 1) * spacing) / cols);
      const cellHeight = cellWidth;
      const totalHeight = rows * cellHeight + (rows - 1) * spacing;
      const canvas = document.createElement('canvas');
      canvas.width = totalWidth; canvas.height = totalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context not available.');
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, totalWidth, totalHeight);
      for (let i = 0; i < rows * cols; i++) {
        if (i >= loadedImages.length) break;
        const { img } = loadedImages[i];
        const colIdx = i % cols, rowIdx = Math.floor(i / cols);
        const cellX = colIdx * (cellWidth + spacing), cellY = rowIdx * (cellHeight + spacing);
        const cellAspect = cellWidth / cellHeight, imgAspect = img.naturalWidth / img.naturalHeight;
        let sx, sy, sw, sh;
        if (imgAspect > cellAspect) {
          sh = img.naturalHeight; sw = sh * cellAspect; sx = (img.naturalWidth - sw) / 2; sy = 0;
        } else {
          sw = img.naturalWidth; sh = sw / cellAspect; sx = 0; sy = (img.naturalHeight - sh) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sh, cellX, cellY, cellWidth, cellHeight);
      }
      canvas.toBlob((blob) => {
        if (!blob) throw new Error('Blob generation failed.');
        if (collageUrl) URL.revokeObjectURL(collageUrl);
        const url = URL.createObjectURL(blob);
        setCollageBlob(blob); setCollageUrl(url); setIsGenerating(false);
      }, 'image/jpeg', 0.95);
    } catch (err) {
      setErrorMsg(err.message || 'Error during collage generation.'); setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (files.length >= 2) generateCollage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, layout, spacing, bgColor]);

  useEffect(() => {
    return () => { if (collageUrl) URL.revokeObjectURL(collageUrl); };
  }, [collageUrl]);

  const downloadCollage = () => {
    if (!collageBlob) return;
    const name = `collage_${layout}_${spacing}px.jpg`;
    saveAs(collageBlob, name);
    saveHistory('Collage Maker', name);
  };

  return (
    <ToolPageShell
      title="Photo Collage Maker"
      subtitle="Combine multiple photos into a beautiful grid collage. Choose layout, spacing, and fill color. Free, browser-based - nothing uploaded."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoText="Create photo collages online for free. Combine JPEG, PNG and WebP images into grid layouts and export as JPEG. Browser-based, no uploads, instant results."
    >
      {files.length === 0 ? (
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <UploadBox onFileSelect={handleFileSelect} acceptedFormats={['.jpg', '.jpeg', '.png', '.webp']} multiple={true} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: File Details */}
            <div className="lg:col-span-3" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", height: "fit-content", display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="flex justify-between items-center pb-2 border-b border-bordercolor">
              <h3 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>Upload Images (2-6)</h3>
              {files.length > 0 && (
                <button onClick={() => handleFileSelect([])} className="text-xs font-bold text-red-500 hover:underline">Clear All</button>
              )}
            </div>
            <UploadBox onFileSelect={(newFiles) => {
                const merged = [...files, ...newFiles.filter(nf => !files.find(f => f.name === nf.name))].slice(0, 6);
                handleFileSelect(merged);
              }}
              acceptedFormats={['.jpg', '.jpeg', '.png', '.webp']}
              multiple={true}
              buttonLabel="Add More Images"
            />
            </div>

            {/* Middle Column: Large Preview */}
            <div className="lg:col-span-6" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 14 }}>
              <h4 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>Live Grid Preview</h4>
                  <div className="border border-bordercolor rounded-xl p-4 bg-lightbg/60 min-h-[260px] flex items-center justify-center">
                    {collageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={collageUrl} alt="Collage Preview" style={{ maxHeight: 480, maxWidth: "100%", objectFit: "contain", borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", display: "block" }} className=" max-w-full object-contain rounded-lg border border-bordercolor/40 shadow-sm" />
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-primary font-semibold">
                        <svg className="animate-spin h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Generating...
                      </div>
                    )}
                  </div>
            </div>

            {/* Right Column: Controls & Settings */}
            <div className="lg:col-span-3" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 16 }}>
              <h4 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>Layout & Style</h4>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Grid Layout</label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {['1x2', '2x1', '2x2', '1x3', '3x1'].map((mode) => (
                        <button key={mode} type="button" onClick={() => setLayout(mode)}
                          className={`py-2 text-[10px] font-black rounded-lg border transition-all duration-200 focus:outline-none ${layout === mode ? 'border-primary bg-blue-50 text-primary shadow-sm' : 'border-bordercolor bg-white hover:border-gray-400 text-gray-600'}`}>
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Image Gap</label>
                      <span className="text-xs font-mono font-bold text-primary">{spacing}px</span>
                    </div>
                    <input type="range" min="0" max="50" step="5" value={spacing}
                      onChange={(e) => setSpacing(parseInt(e.target.value, 10))}
                      className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary" />
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-bordercolor/60">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Gap Fill Color</label>
                      <span className="text-[9px] text-gray-400 font-medium block mt-0.5">Background between images</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-gray-500 uppercase">{bgColor}</span>
                      <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer border border-bordercolor bg-transparent focus:outline-none" />
                    </div>
                  </div>

                  {errorMsg && <p className="text-xs text-red-500 font-semibold leading-relaxed">{errorMsg}</p>}

                  <div className="pt-3.5 border-t border-bordercolor/60">
                    <button type="button" onClick={downloadCollage} disabled={isGenerating || !collageBlob}
                      style={{ width: "100%", padding: "13px", fontSize: 13, fontWeight: 800, borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)", color: "#fff", boxShadow: "0 4px 14px rgba(91,91,214,0.30)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.18s" }}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Collage as JPG
                    </button>
                  </div>
            </div>

          </div>
      )}
    </ToolPageShell>
  );
}
