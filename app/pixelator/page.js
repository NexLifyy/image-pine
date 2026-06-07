"use client";

import React, { useState, useEffect, useRef } from 'react';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';
import ToolPageShell from '@/components/ToolPageShell';

const _FEATURES = [
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>), title: 'Grid Downsampling', desc: 'Convert clean high-res images to retro block pixel layouts (8x8 up to 64x64).' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2a10 10 0 1010 10"/><path d="M12 6v12M6 12h12"/></svg>), title: 'Classic Palettes', desc: 'Map colors to GameBoy green-scale, 8-bit NES colors, or retro grayscale.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z"/></svg>), title: 'Grid Line Overlays', desc: 'Toggle fine grid cell dividers to emphasize the classic tile look.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>), title: 'Local Rendering', desc: 'All downsampling filters execute client-side using HTML5 canvas contexts.' }
];

const _STEPS = [
  { n: '1', title: 'Upload Artwork', desc: 'Select any digital illustration, landscape, or portrait.' },
  { n: '2', title: 'Choose Block Size & Palette', desc: 'Set your block dimensions and map vintage color schemes.' },
  { n: '3', title: 'Export Retro Pixel Art', desc: 'Download your high-res pixelated PNG artwork.' }
];

const _FAQS = [
  { q: 'How does the pixelation work?', a: 'We draw the image onto an offscreen canvas at a very small resolution (e.g. 32x32 pixels), apply color palette mapping, and then redraw it back onto the main canvas with image smoothing disabled to keep edges sharp.' },
  { q: 'What are the palette presets?', a: 'Original keeps color integrity, GameBoy maps to the four shades of green from the original 1989 GameBoy, and NES clusters to a retro 16-color NES palette.' },
  { q: 'Can I add grid dividers?', a: 'Yes. Enabling the Grid Line overlay draws 1px dark/light lines between pixel blocks.' }
];

const PALETTES = [
  { val: 'original', label: 'Original Colors' },
  { val: 'gb', label: 'GameBoy Green-scale' },
  { val: 'nes', label: '8-Bit NES Palette' },
  { val: 'gray', label: 'Retro Grayscale' },
  { val: 'c64', label: 'Commodore 64 Palette' }
];

const GB_SHADES = [
  { r: 224, g: 248, b: 208 }, // light
  { r: 136, g: 192, b: 112 }, // mid-light
  { r: 52, g: 104, b: 86 },  // mid-dark
  { r: 8, g: 24, b: 32 }     // dark
];

const NES_COLORS = [
  { r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0 },
  { r: 248, g: 56, b: 0 },    { r: 252, g: 152, b: 56 },
  { r: 248, g: 216, b: 120 }, { r: 0, g: 168, b: 0 },
  { r: 60, g: 180, b: 244 },  { r: 0, g: 112, b: 236 },
  { r: 188, g: 0, b: 188 },   { r: 248, g: 184, b: 248 },
  { r: 116, g: 116, b: 116 }, { r: 252, g: 224, b: 168 }
];

const C64_COLORS = [
  { r: 0, g: 0, b: 0 },       { r: 255, g: 255, b: 255 },
  { r: 136, g: 57, b: 50 },   { r: 112, g: 191, b: 199 },
  { r: 146, g: 70, b: 160 },  { r: 90, g: 172, b: 81 },
  { r: 52, g: 45, b: 153 },   { r: 218, g: 232, b: 133 },
  { r: 150, g: 95, b: 40 },   { r: 92, g: 68, b: 0 },
  { r: 184, g: 105, b: 98 },  { r: 80, g: 80, b: 80 },
  { r: 120, g: 120, b: 120 }, { r: 154, g: 230, b: 145 },
  { r: 124, g: 112, b: 218 }, { r: 170, g: 170, b: 170 }
];

export default function PixelatorPage() {
  const [file, setFile] = useState(null);
  const [blockSize, setBlockSize] = useState(16);
  const [palette, setPalette] = useState('original');
  const [showGrid, setShowGrid] = useState(false);
  const [gridColor, setGridColor] = useState('rgba(0,0,0,0.15)');

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const canvasRef = useRef(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const handleFileSelect = (selectedList) => {
    if (selectedList.length > 0) {
      setFile(selectedList[0]);
    } else {
      setFile(null);
      setImageSize({ width: 0, height: 0 });
    }
    setErrorMsg('');
  };

  const getClosestColor = (r, g, b, paletteList) => {
    let closest = paletteList[0];
    let minDist = Infinity;
    for (const color of paletteList) {
      const dist = Math.hypot(r - color.r, g - color.g, b - color.b);
      if (dist < minDist) {
        minDist = dist;
        closest = color;
      }
    }
    return closest;
  };

  const mapColorToPalette = (r, g, b, type) => {
    if (type === 'gray') {
      const avg = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      return { r: avg, g: avg, b: avg };
    }
    if (type === 'gb') {
      return getClosestColor(r, g, b, GB_SHADES);
    }
    if (type === 'nes') {
      return getClosestColor(r, g, b, NES_COLORS);
    }
    if (type === 'c64') {
      return getClosestColor(r, g, b, C64_COLORS);
    }
    return { r, g, b };
  };

  const renderPixelArt = () => {
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

      // Calculate small canvas size
      const cols = Math.max(2, Math.round(w / blockSize));
      const rows = Math.max(2, Math.round(h / blockSize));

      // Offscreen canvas for downsampling
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = cols;
      tempCanvas.height = rows;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      // Draw original image scaled down
      tempCtx.drawImage(img, 0, 0, cols, rows);

      // Quantize colors if needed
      if (palette !== 'original') {
        const imgData = tempCtx.getImageData(0, 0, cols, rows);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          if (a < 128) continue; // skip transparent

          const mapped = mapColorToPalette(r, g, b, palette);
          data[i] = mapped.r;
          data[i + 1] = mapped.g;
          data[i + 2] = mapped.b;
        }
        tempCtx.putImageData(imgData, 0, 0);
      }

      // Draw back to main canvas with smoothing disabled
      ctx.imageSmoothingEnabled = false;
      ctx.mozImageSmoothingEnabled = false;
      ctx.webkitImageSmoothingEnabled = false;
      ctx.msImageSmoothingEnabled = false;

      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(tempCanvas, 0, 0, w, h);

      // Draw Grid Lines if selected
      if (showGrid) {
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        
        const cellW = w / cols;
        const cellH = h / rows;

        for (let c = 0; c <= cols; c++) {
          const x = c * cellW;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let r = 0; r <= rows; r++) {
          const y = r * cellH;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
      }
    };
    img.src = file.preview || URL.createObjectURL(file);
  };

  useEffect(() => {
    renderPixelArt();
  }, [file, blockSize, palette, showGrid, gridColor]);

  const downloadPixelArt = () => {
    if (!canvasRef.current || !file) return;
    setIsProcessing(true);
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const ext = file.name.split('.').pop();
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const newName = `${baseName}_pixelated.${ext}`;
        saveAs(blob, newName);
        saveHistory('Pixel Art Generator', newName);
      } else {
        setErrorMsg('Error rendering output.');
      }
      setIsProcessing(false);
    });
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
      title="Pixel Art Generator & Retro Art Maker"
      subtitle="Convert any image or illustration into stylized retro pixel art. Customize color palettes and tile grid dividers."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoText="Free browser-based Image Pixelator. Transform photos into 8-bit retro pixel artwork with custom grid blocks and vintage game console palettes locally."
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
            {/* Left Column: Image details & Presets */}
            <div className="lg:col-span-3" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", height: "fit-content", display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="flex justify-between items-center pb-2 border-b border-bordercolor">
                <h3 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Source Image
                </h3>
                <button onClick={() => handleFileSelect([])} className="text-xs font-bold text-red-500 hover:underline">
                  Remove
                </button>
              </div>

              {file.preview && (
                <img
                  src={file.preview}
                  alt="Original"
                  className="w-full object-contain rounded-lg border border-bordercolor"
                  style={{ maxHeight: 200 }}
                />
              )}

              <div className="min-w-0 flex flex-col gap-0.5">
                <p className="text-xs font-bold text-textmain truncate" title={file.name}>
                  {file.name}
                </p>
                <p className="text-[10px] text-gray-400 font-medium">
                  Dimensions: {imageSize.width} × {imageSize.height}
                </p>
              </div>
            </div>

            {/* Middle Column: Preview Canvas */}
            <div className="lg:col-span-6" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 14 }}>
              <h4 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Live Pixel Preview
              </h4>

              <div style={{ border: "1.5px solid #E4E4EF", borderRadius: 14, padding: 12, minHeight: 380, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", background: "repeating-conic-gradient(#F1F1F7 0% 25%, #fff 0% 50%) 0 0 / 16px 16px" }}>
                <canvas
                  ref={canvasRef}
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
                Pixel Settings
              </h4>

              {/* Block size slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                  <span>Pixel Block Size</span>
                  <span>{blockSize}px</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="64"
                  step="2"
                  value={blockSize}
                  onChange={(e) => setBlockSize(parseInt(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              {/* Palette selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Retro Palette Mapping
                </label>
                <select
                  value={palette}
                  onChange={(e) => setPalette(e.target.value)}
                  className="w-full text-xs font-semibold text-textmain border border-bordercolor rounded-lg bg-lightbg/40 px-3 py-2.5 focus:outline-none focus:border-primary"
                >
                  {PALETTES.map((p) => (
                    <option key={p.val} value={p.val}>{p.label}</option>
                  ))}
                </select>
              </div>

              {/* Grid Lines Overlay */}
              <div className="flex items-center gap-2 pt-2 border-t border-bordercolor/40">
                <input
                  type="checkbox"
                  id="showGrid"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                  style={{ width: 14, height: 14, accentColor: '#5B5BD6' }}
                />
                <label htmlFor="showGrid" className="text-xs font-bold text-textmain select-none cursor-pointer">
                  Show Grid Lines
                </label>
              </div>

              {showGrid && (
                <div className="flex flex-col gap-1.5 pt-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Grid Line Color
                  </label>
                  <select
                    value={gridColor}
                    onChange={(e) => setGridColor(e.target.value)}
                    className="w-full text-xs font-semibold text-textmain border border-bordercolor rounded-lg bg-lightbg/40 px-3 py-2.5 focus:outline-none focus:border-primary"
                  >
                    <option value="rgba(0,0,0,0.15)">Dark Grid (Subtle)</option>
                    <option value="rgba(0,0,0,0.4)">Dark Grid (Bold)</option>
                    <option value="rgba(255,255,255,0.25)">Light Grid (Subtle)</option>
                    <option value="rgba(255,255,255,0.6)">Light Grid (Bold)</option>
                  </select>
                </div>
              )}

              {errorMsg && (
                <p className="text-xs text-red-500 font-semibold py-1 leading-relaxed">
                  {errorMsg}
                </p>
              )}

              {/* Action Button */}
              <div className="pt-3 border-t border-bordercolor/60">
                <button
                  type="button"
                  onClick={downloadPixelArt}
                  disabled={isProcessing}
                  style={{ width: "100%", padding: "13px", fontSize: 13, fontWeight: 800, borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)", color: "#fff", boxShadow: "0 4px 14px rgba(91,91,214,0.30)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.18s" }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export Pixel Art PNG
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
