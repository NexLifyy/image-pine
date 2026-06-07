"use client";

import React, { useState, useEffect, useRef } from 'react';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';
import ToolPageShell from '@/components/ToolPageShell';

const _FEATURES = [
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>), title: 'Classic Meme Style', desc: 'Render captions in the iconic Impact font with bold outlines.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"/><path d="M19 8l-7 7-3-3"/></svg>), title: 'Draggable Text', desc: 'Click and drag text directly on the canvas to place it perfectly.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>), title: '100% Private', desc: 'All meme rendering happens client-side. Your photos are safe.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 4v12m0 0l-4-4m4 4l4-4"/></svg>), title: 'High-Res Export', desc: 'Export memes at full resolution with no compression loss.' }
];

const _STEPS = [
  { n: '1', title: 'Upload base image', desc: 'Drag & drop your photo or meme template.' },
  { n: '2', title: 'Add captions', desc: 'Type your top & bottom text, resize or drag them.' },
  { n: '3', title: 'Generate & Save', desc: 'Download your high-quality meme instantly.' }
];

const _FAQS = [
  { q: 'Can I add more than two text blocks?', a: 'Currently, the studio supports Top and Bottom captions. You can drag them anywhere on the image.' },
  { q: 'Is there a watermark on exported memes?', a: 'No. Image Pine is completely free, open-source, and does not add any watermarks to your creations.' },
  { q: 'Does it work with PNG transparent templates?', a: 'Yes. PNG transparency is preserved in the final generated meme.' }
];

export default function MemeGeneratorPage() {
  const [file, setFile] = useState(null);
  const [topText, setTopText] = useState('TOP CAPTION');
  const [bottomText, setBottomText] = useState('BOTTOM CAPTION');
  const [fontSize, setFontSize] = useState(40); // Base percentage-like size
  const [strokeWidth, setStrokeWidth] = useState(6);
  const [allCaps, setAllCaps] = useState(true);
  
  // Custom font size settings per text
  const [topFontSize, setTopFontSize] = useState(44);
  const [bottomFontSize, setBottomFontSize] = useState(44);

  // Dragging states
  const [topPos, setTopPos] = useState({ x: null, y: null }); // relative (0 to 1)
  const [bottomPos, setBottomPos] = useState({ x: null, y: null }); // relative (0 to 1)
  const [draggingItem, setDraggingItem] = useState(null); // 'top' | 'bottom' | null

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle file select
  const handleFileSelect = (selectedList) => {
    if (selectedList.length > 0) {
      setFile(selectedList[0]);
      setTopPos({ x: 0.5, y: 0.12 });
      setBottomPos({ x: 0.5, y: 0.88 });
    } else {
      setFile(null);
      setTopPos({ x: null, y: null });
      setBottomPos({ x: null, y: null });
    }
    setErrorMsg('');
  };

  // Re-draw canvas whenever variables change
  useEffect(() => {
    if (!file || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      setImageSize({ width: w, height: h });
      canvas.width = w;
      canvas.height = h;

      // Draw background image
      ctx.drawImage(img, 0, 0);

      // Set font styles
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#000000';
      ctx.lineJoin = 'round';

      const tText = allCaps ? topText.toUpperCase() : topText;
      const bText = allCaps ? bottomText.toUpperCase() : bottomText;

      // Draw Top Text
      if (tText) {
        const topSize = Math.round(w * (topFontSize / 500));
        ctx.font = `900 ${topSize}px Impact, Arial Black, sans-serif`;
        ctx.lineWidth = Math.max(2, Math.round(topSize * (strokeWidth / 40)));
        
        const tx = topPos.x !== null ? topPos.x * w : w / 2;
        const ty = topPos.y !== null ? topPos.y * h : h * 0.15;
        
        ctx.strokeText(tText, tx, ty);
        ctx.fillText(tText, tx, ty);
      }

      // Draw Bottom Text
      if (bText) {
        const bottomSize = Math.round(w * (bottomFontSize / 500));
        ctx.font = `900 ${bottomSize}px Impact, Arial Black, sans-serif`;
        ctx.lineWidth = Math.max(2, Math.round(bottomSize * (strokeWidth / 40)));

        const bx = bottomPos.x !== null ? bottomPos.x * w : w / 2;
        const by = bottomPos.y !== null ? bottomPos.y * h : h * 0.85;

        ctx.strokeText(bText, bx, by);
        ctx.fillText(bText, bx, by);
      }
    };
    img.src = file.preview || URL.createObjectURL(file);
  }, [file, topText, bottomText, topFontSize, bottomFontSize, strokeWidth, allCaps, topPos, bottomPos]);

  // Handle Drag & Drop on canvas
  const getCanvasMousePos = (e) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Support touches
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const x = ((clientX - rect.left) / rect.width);
    const y = ((clientY - rect.top) / rect.height);
    return { x, y };
  };

  const handleMouseDown = (e) => {
    if (!file) return;
    const { x, y } = getCanvasMousePos(e);

    // Calculate distance to topPos and bottomPos
    const distTop = Math.hypot(x - (topPos.x ?? 0.5), y - (topPos.y ?? 0.15));
    const distBottom = Math.hypot(x - (bottomPos.x ?? 0.5), y - (bottomPos.y ?? 0.85));

    if (distTop < distBottom && distTop < 0.15) {
      setDraggingItem('top');
    } else if (distBottom < 0.15) {
      setDraggingItem('bottom');
    }
  };

  const handleMouseMove = (e) => {
    if (!draggingItem || !file) return;
    const { x, y } = getCanvasMousePos(e);
    
    // Clamp to bounds
    const clampedX = Math.max(0, Math.min(1, x));
    const clampedY = Math.max(0, Math.min(1, y));

    if (draggingItem === 'top') {
      setTopPos({ x: clampedX, y: clampedY });
    } else if (draggingItem === 'bottom') {
      setBottomPos({ x: clampedX, y: clampedY });
    }
  };

  const handleMouseUp = () => {
    setDraggingItem(null);
  };

  const downloadMeme = () => {
    if (!canvasRef.current || !file) return;
    setIsProcessing(true);
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const ext = file.name.split('.').pop();
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const newName = `${baseName}_meme.${ext}`;
        saveAs(blob, newName);
        saveHistory('Meme Generator', newName);
      } else {
        setErrorMsg('Could not export canvas.');
      }
      setIsProcessing(false);
    }, file.type || 'image/jpeg', 0.95);
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <ToolPageShell
      title="Meme Generator & Caption Studio"
      subtitle="Create custom memes instantly in your browser. Add draggable text, change sizes and download in high quality."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoText="Free browser-based Meme Generator. Add bold text to images, drag captions, customize font size, and export with zero watermarks. Private and fast."
    >
      <div className="flex flex-col gap-6">
        {!file ? (
          <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
            <UploadBox 
              onFileSelect={handleFileSelect} 
              acceptedFormats={['.jpg', '.jpeg', '.png', '.webp']}
              multiple={false} 
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Image Info */}
            <div className="lg:col-span-3" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", height: "fit-content", display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="flex justify-between items-center pb-2 border-b border-bordercolor">
                <h3 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Meme Template
                </h3>
                <button onClick={() => handleFileSelect([])} className="text-xs font-bold text-red-500 hover:underline">
                  Remove
                </button>
              </div>

              <div className="p-3 bg-lightbg/45 border border-bordercolor/60 rounded-xl flex items-center gap-3">
                {file.preview && (
                  <img
                    src={file.preview}
                    alt="Template"
                    className="w-12 h-12 object-cover rounded-lg border border-bordercolor"
                  />
                )}
                <div className="min-w-0 flex-grow">
                  <p className="text-xs font-bold text-textmain truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                    Dimensions: {imageSize.width} × {imageSize.height}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-bordercolor/40">
                <p className="text-[11px] text-gray-400 font-semibold leading-relaxed">
                  💡 <strong>Tip:</strong> You can click and drag the text overlays directly on the preview to adjust their positions.
                </p>
              </div>
            </div>

            {/* Middle Column: Meme Canvas */}
            <div className="lg:col-span-6" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="flex justify-between items-center">
                <h4 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Live Editor
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="checkbox"
                    id="allCaps"
                    checked={allCaps}
                    onChange={(e) => setAllCaps(e.target.checked)}
                    style={{ width: 14, height: 14, accentColor: '#5B5BD6' }}
                  />
                  <label htmlFor="allCaps" className="text-xs font-bold text-textmain select-none cursor-pointer">
                    ALL CAPS
                  </label>
                </div>
              </div>

              <div 
                ref={containerRef}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchMove={handleMouseMove}
                onTouchEnd={handleMouseUp}
                style={{ 
                  border: "1.5px solid #E4E4EF", 
                  borderRadius: 14, 
                  padding: 12, 
                  minHeight: 380, 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  position: "relative", 
                  overflow: "hidden", 
                  background: "repeating-conic-gradient(#F1F1F7 0% 25%, #fff 0% 50%) 0 0 / 16px 16px",
                  cursor: draggingItem ? 'grabbing' : 'grab'
                }}
              >
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleMouseDown}
                  style={{ 
                    maxHeight: 480, 
                    maxWidth: "100%", 
                    objectFit: "contain", 
                    borderRadius: 8, 
                    boxShadow: "0 4px 20px rgba(0,0,0,0.08)", 
                    display: "block" 
                  }}
                />
              </div>
            </div>

            {/* Right Column: Controls */}
            <div className="lg:col-span-3" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 16 }}>
              <h4 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Meme Captions
              </h4>

              {/* Top Caption controls */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Top Caption
                </label>
                <input
                  type="text"
                  value={topText}
                  onChange={(e) => setTopText(e.target.value)}
                  className="w-full text-xs font-semibold text-textmain border border-bordercolor rounded-lg bg-lightbg/40 px-3 py-2.5 focus:outline-none focus:border-primary"
                  placeholder="TOP TEXT GOES HERE"
                />
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] font-bold text-gray-400">Size: {topFontSize}px</span>
                  <input
                    type="range"
                    min="15"
                    max="100"
                    value={topFontSize}
                    onChange={(e) => setTopFontSize(parseInt(e.target.value))}
                    className="w-2/3 accent-primary"
                  />
                </div>
              </div>

              {/* Bottom Caption controls */}
              <div className="flex flex-col gap-2 pt-2 border-t border-bordercolor/40">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Bottom Caption
                </label>
                <input
                  type="text"
                  value={bottomText}
                  onChange={(e) => setBottomText(e.target.value)}
                  className="w-full text-xs font-semibold text-textmain border border-bordercolor rounded-lg bg-lightbg/40 px-3 py-2.5 focus:outline-none focus:border-primary"
                  placeholder="BOTTOM TEXT GOES HERE"
                />
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] font-bold text-gray-400">Size: {bottomFontSize}px</span>
                  <input
                    type="range"
                    min="15"
                    max="100"
                    value={bottomFontSize}
                    onChange={(e) => setBottomFontSize(parseInt(e.target.value))}
                    className="w-2/3 accent-primary"
                  />
                </div>
              </div>

              {/* Formatting details */}
              <div className="flex flex-col gap-2 pt-2 border-t border-bordercolor/40">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Stroke Width: {strokeWidth}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    value={strokeWidth}
                    onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                    className="w-2/3 accent-primary"
                  />
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-red-500 font-semibold leading-relaxed">
                  {errorMsg}
                </p>
              )}

              {/* Action Button */}
              <div className="pt-3 border-t border-bordercolor/60">
                <button
                  type="button"
                  onClick={downloadMeme}
                  disabled={isProcessing}
                  style={{ width: "100%", padding: "13px", fontSize: 13, fontWeight: 800, borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)", color: "#fff", boxShadow: "0 4px 14px rgba(91,91,214,0.30)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.18s" }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Generate &amp; Download Meme
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
