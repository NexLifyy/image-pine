"use client";

import React, { useState, useEffect, useRef } from 'react';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';
import ToolPageShell from '@/components/ToolPageShell';

const _FEATURES = [
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M19 7l-.8 12.6c-.1 1.3-1.2 2.4-2.5 2.4H8.3c-1.3 0-2.4-1.1-2.5-2.4L5 7m5-3V1h4v3M4 7h16"/></svg>), title: 'Click-to-Erase', desc: 'Click directly on the preview to sample the color you want to make transparent.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z"/></svg>), title: 'Fuzziness & Tolerance', desc: 'Adjust thresholds to feather edges and smooth out shadow transitions.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>), title: '100% Secure & Local', desc: 'Chroma-key pixel manipulation executes inside web contexts locally. No server uploads.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 4v12m0 0l-4-4m4 4l4-4"/></svg>), title: 'PNG Alpha Preservation', desc: 'Downloads clean transparency-preserved alpha PNG files ready for overlays.' }
];

const _STEPS = [
  { n: '1', title: 'Upload Artwork', desc: 'Choose a logo mockup, graphic signature, or portrait.' },
  { n: '2', title: 'Pick Erase Color', desc: 'Click on the background preview or select a preset color.' },
  { n: '3', title: 'Download Transparent PNG', desc: 'Adjust tolerance to refine the edges, then save.' }
];

const _FAQS = [
  { q: 'How does the background eraser work?', a: 'It samples the RGB values of the selected color. It then sweeps through the image pixel buffer, calculating the mathematical color distance for each pixel, and overrides matching pixels with transparent alpha codes.' },
  { q: 'What is Fuzziness?', a: 'Fuzziness is the edge feathering setting. A higher fuzziness value blends colors close to the threshold into semi-transparency, eliminating harsh outlines.' },
  { q: 'Will my downloaded image be a JPEG?', a: 'No, all transparent background downloads are saved as PNG files to preserve transparent layers.' }
];

const PRESETS = [
  { label: 'Erase White', rgb: { r: 255, g: 255, b: 255 }, hex: '#FFFFFF' },
  { label: 'Erase Black', rgb: { r: 0, g: 0, b: 0 }, hex: '#000000' },
  { label: 'Chroma Green', rgb: { r: 0, g: 255, b: 0 }, hex: '#00FF00' }
];

export default function ChromaKeyPage() {
  const [file, setFile] = useState(null);
  const [keyColor, setKeyColor] = useState({ r: 255, g: 255, b: 255 }); // default white
  const [tolerance, setTolerance] = useState(30);
  const [fuzziness, setFuzziness] = useState(15);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const canvasRef = useRef(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  
  // Cache original pixels to avoid compounding compression degradation
  const originalPixels = useRef(null);

  const handleFileSelect = (selectedList) => {
    if (selectedList.length > 0) {
      setFile(selectedList[0]);
      originalPixels.current = null;
    } else {
      setFile(null);
      setImageSize({ width: 0, height: 0 });
      originalPixels.current = null;
    }
    setErrorMsg('');
  };

  const drawChromaKey = () => {
    if (!file || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (originalPixels.current) {
      // Re-apply chroma filter to cached pixel array
      applyChromaFilter(ctx, canvas.width, canvas.height);
    } else {
      // Load image first time
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        setImageSize({ width: w, height: h });
        canvas.width = w;
        canvas.height = h;

        ctx.drawImage(img, 0, 0);
        
        // Cache original pixel data
        originalPixels.current = ctx.getImageData(0, 0, w, h);
        
        // Apply filter
        applyChromaFilter(ctx, w, h);
      };
      img.src = file.preview || URL.createObjectURL(file);
    }
  };

  const applyChromaFilter = (ctx, w, h) => {
    if (!originalPixels.current) return;

    // Retrieve a fresh copy of original pixels
    const tempImageData = ctx.createImageData(w, h);
    tempImageData.data.set(originalPixels.current.data);

    const data = tempImageData.data;
    const kr = keyColor.r;
    const kg = keyColor.g;
    const kb = keyColor.b;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a === 0) continue;

      // Color distance in Euclidean space
      const distance = Math.hypot(r - kr, g - kg, b - kb);

      if (distance < tolerance) {
        data[i + 3] = 0; // completely transparent
      } else if (distance < tolerance + fuzziness) {
        // Linear fade transition
        const factor = (distance - tolerance) / fuzziness;
        data[i + 3] = Math.round(a * factor);
      }
    }

    ctx.clearRect(0, 0, w, h);
    ctx.putImageData(tempImageData, 0, 0);
  };

  useEffect(() => {
    drawChromaKey();
  }, [file, keyColor, tolerance, fuzziness]);

  // Handle canvas click to sample color
  const handleCanvasClick = (e) => {
    if (!canvasRef.current || !originalPixels.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Map screen clicks to canvas coordinates
    const clickX = Math.round(((e.clientX - rect.left) / rect.width) * canvas.width);
    const clickY = Math.round(((e.clientY - rect.top) / rect.height) * canvas.height);

    // Read pixel color from cached original image data
    const w = canvas.width;
    const index = (clickY * w + clickX) * 4;
    const data = originalPixels.current.data;

    if (index >= 0 && index < data.length) {
      setKeyColor({
        r: data[index],
        g: data[index + 1],
        b: data[index + 2]
      });
    }
  };

  const downloadPng = () => {
    if (!canvasRef.current || !file) return;
    setIsProcessing(true);
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        const newName = `${baseName}_transparent.png`;
        saveAs(blob, newName);
        saveHistory('Background Eraser', newName);
      } else {
        setErrorMsg('Error exporting transparent PNG.');
      }
      setIsProcessing(false);
    }, 'image/png');
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
      title="Background Eraser (Chroma-Keyer)"
      subtitle="Erase background solid colors from logos, mockups, or photos. Click anywhere to select the color boundary."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoText="Free client-side background eraser chroma key tool. Erase solid black, white or custom backgrounds from images and export transparent PNGs locally."
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
            {/* Left Column: Color details & sliders */}
            <div className="lg:col-span-4" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", height: "fit-content", display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="pb-2 border-b border-bordercolor flex justify-between items-center">
                <h3 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Erase Settings
                </h3>
                <button onClick={() => handleFileSelect([])} className="text-xs font-bold text-red-500 hover:underline">
                  Remove File
                </button>
              </div>

              {/* Sampled Color */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Target Color Boundary
                </label>
                <div className="flex items-center gap-3">
                  <div 
                    style={{ 
                      background: `rgb(${keyColor.r}, ${keyColor.g}, ${keyColor.b})`,
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      border: '2.5px solid #E4E4EF',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                    }} 
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-mono font-bold text-textmain">
                      RGB: {keyColor.r}, {keyColor.g}, {keyColor.b}
                    </span>
                    <span className="text-[10px] text-gray-400 font-semibold mt-0.5">
                      Click image to pick color
                    </span>
                  </div>
                </div>
              </div>

              {/* Presets */}
              <div className="flex flex-col gap-1.5 pt-1 border-t border-bordercolor/30">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">
                  Preset Color Erasers
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setKeyColor(p.rgb)}
                      className="py-2.5 text-[10px] font-bold rounded-lg border border-bordercolor bg-white hover:border-gray-400 text-textmain transition-colors"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tolerance Slider */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-bordercolor/30">
                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                  <span>Tolerance Limit</span>
                  <span>{tolerance}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="150"
                  value={tolerance}
                  onChange={(e) => setTolerance(parseInt(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              {/* Fuzziness Slider */}
              <div className="flex flex-col gap-1.5 pt-1">
                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                  <span>Edge Fuzziness</span>
                  <span>{fuzziness}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="80"
                  value={fuzziness}
                  onChange={(e) => setFuzziness(parseInt(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              {errorMsg && (
                <p className="text-xs text-red-500 font-semibold py-1 leading-relaxed">
                  {errorMsg}
                </p>
              )}
            </div>

            {/* Right Column: Clickable Canvas */}
            <div className="lg:col-span-8 animate-fade-in" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="flex justify-between items-center">
                <h4 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
                  Chroma Canvas (Click Color to Remove)
                </h4>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#9898B5", background: "#F7F7FB", padding: "3px 9px", borderRadius: 6 }}>
                  Original Dimensions: {imageSize.width} × {imageSize.height}
                </span>
              </div>

              {/* Checkerboard background wrapper */}
              <div style={{ border: "1.5px solid #E4E4EF", borderRadius: 14, padding: 12, minHeight: 380, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", background: "repeating-conic-gradient(#C4C4D9 0% 25%, #FFF 0% 50%) 0 0 / 20px 20px" }}>
                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  style={{ 
                    maxHeight: 480, 
                    maxWidth: "100%", 
                    objectFit: "contain", 
                    borderRadius: 8, 
                    boxShadow: "0 4px 20px rgba(0,0,0,0.08)", 
                    display: "block",
                    cursor: "pipette"
                  }}
                />
              </div>

              <div className="pt-2 border-t border-bordercolor/60">
                <button
                  type="button"
                  onClick={downloadPng}
                  disabled={isProcessing}
                  style={{ width: "100%", padding: "13px", fontSize: 13, fontWeight: 800, borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%)", color: "#fff", boxShadow: "0 4px 14px rgba(91,91,214,0.30)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.18s" }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export Transparent PNG
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
