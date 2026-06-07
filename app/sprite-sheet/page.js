"use client";

import React, { useState, useEffect, useRef } from 'react';
import UploadBox from '@/components/UploadBox';
import { saveAs } from 'file-saver';
import { saveHistory } from '@/lib/storage';
import ToolPageShell from '@/components/ToolPageShell';

const _FEATURES = [
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>), title: 'Uniform Grid Packing', desc: 'Pack multiple frames or icons into a single grid sheet automatically.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M10 20l4-16m2 16l4-16M6 9h14M4 15h14"/></svg>), title: 'JSON Coordinates', desc: 'Generates CSS/JSON coordinates mapping coordinates (x, y, w, h) for each asset.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z"/></svg>), title: 'Padding & Grid Controls', desc: 'Adjust column limits, margins, cell spacing, and background transparency.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>), title: '100% Client-Side', desc: 'Image compilation is completed inside your browser sandbox. Complete privacy.' }
];

const _STEPS = [
  { n: '1', title: 'Upload Icon Frames', desc: 'Select multiple images or animation assets.' },
  { n: '2', title: 'Set Sheet Layout', desc: 'Choose spacing padding, column size, and backgrounds.' },
  { n: '3', title: 'Download Sprite Sheet', desc: 'Download your packed PNG and copy the JSON coordinate map.' }
];

const _FAQS = [
  { q: 'How does grid alignment work?', a: 'The packer computes the maximum width and height among all uploaded images, sets uniform cell dimensions, and centers each image inside its grid cell to preserve relative anchor alignment.' },
  { q: 'What is inside the JSON coordinate file?', a: 'It returns a key-value mapping of each original filename to its coordinate properties: `x`, `y`, `width`, and `height` inside the output sprite sheet.' },
  { q: 'Can I pack mixed file types?', a: 'Yes. You can upload JPEG, PNG, WebP, or SVG. The output composite is exported as a transparent PNG.' }
];

export default function SpriteSheetPage() {
  const [files, setFiles] = useState([]);
  const [columns, setColumns] = useState(4);
  const [spacing, setSpacing] = useState(4); // px
  const [bgColor, setBgColor] = useState('transparent'); // 'transparent' | 'white' | 'black'
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const canvasRef = useRef(null);
  const [jsonOutput, setJsonOutput] = useState('');

  // Keep track of loaded image objects so we can read dimensions synchronously
  const [imagesMap, setImagesMap] = useState({});

  const handleFileSelect = (selectedList) => {
    setFiles((prev) => [...prev, ...selectedList]);
    setErrorMsg('');
  };

  const removeFile = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearAll = () => {
    files.forEach((f) => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setFiles([]);
    setImagesMap({});
    setJsonOutput('');
  };

  // Load all selected files into Image objects
  useEffect(() => {
    files.forEach((file) => {
      if (imagesMap[file.id]) return; // already loaded

      const img = new Image();
      img.onload = () => {
        setImagesMap((prev) => ({
          ...prev,
          [file.id]: img
        }));
      };
      img.src = file.preview || URL.createObjectURL(file);
    });
  }, [files]);

  const packSpriteSheet = () => {
    if (files.length === 0 || !canvasRef.current) {
      setJsonOutput('');
      return;
    }

    // Ensure all images are fully loaded
    const loadedImages = files.map((f) => imagesMap[f.id]).filter(Boolean);
    if (loadedImages.length < files.length) {
      return; // wait for all loads
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Determine max cell size to keep grid uniform
    let maxW = 0;
    let maxH = 0;
    files.forEach((file) => {
      const img = imagesMap[file.id];
      if (img) {
        maxW = Math.max(maxW, img.naturalWidth || img.width);
        maxH = Math.max(maxH, img.naturalHeight || img.height);
      }
    });

    const N = files.length;
    const cols = Math.max(1, Math.min(N, columns));
    const rows = Math.ceil(N / cols);

    const sheetW = cols * maxW + (cols - 1) * spacing;
    const sheetH = rows * maxH + (rows - 1) * spacing;

    canvas.width = sheetW;
    canvas.height = sheetH;

    // Draw background
    if (bgColor === 'white') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, sheetW, sheetH);
    } else if (bgColor === 'black') {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, sheetW, sheetH);
    } else {
      ctx.clearRect(0, 0, sheetW, sheetH);
    }

    // Draw frames and pack coordinates
    const coordinates = {};

    files.forEach((file, idx) => {
      const img = imagesMap[file.id];
      if (!img) return;

      const r = Math.floor(idx / cols);
      const c = idx % cols;

      const imgW = img.naturalWidth || img.width;
      const imgH = img.naturalHeight || img.height;

      // Center image inside the uniform cell grid
      const cellX = c * (maxW + spacing);
      const cellY = r * (maxH + spacing);

      const drawX = cellX + (maxW - imgW) / 2;
      const drawY = cellY + (maxH - imgH) / 2;

      ctx.drawImage(img, drawX, drawY, imgW, imgH);

      coordinates[file.name] = {
        x: Math.round(drawX),
        y: Math.round(drawY),
        width: imgW,
        height: imgH
      };
    });

    setJsonOutput(JSON.stringify({
      meta: {
        width: sheetW,
        height: sheetH,
        columns: cols,
        rows: rows,
        spacing: spacing,
        totalFiles: N
      },
      frames: coordinates
    }, null, 2));
  };

  useEffect(() => {
    packSpriteSheet();
  }, [files, columns, spacing, bgColor, imagesMap]);

  const downloadSpriteSheet = () => {
    if (!canvasRef.current || files.length === 0) return;
    setIsProcessing(true);
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        saveAs(blob, 'spritesheet.png');
        saveHistory('Sprite Sheet Generator', 'spritesheet.png');
      } else {
        setErrorMsg('Error rendering PNG sheet output.');
      }
      setIsProcessing(false);
    }, 'image/png');
  };

  const downloadCoordinatesJson = () => {
    if (!jsonOutput) return;
    const blob = new Blob([jsonOutput], { type: 'application/json;charset=utf-8' });
    saveAs(blob, 'spritesheet_coordinates.json');
  };

  return (
    <ToolPageShell
      title="Sprite Sheet Generator & Frame Packer"
      subtitle="Pack multiple animation frames, game assets, or icons into a single grid canvas and compile coordinates metadata."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoText="Free client-side Sprite Sheet Packer. Combine multiple graphics or frame animations into a single sprite sheet PNG and export coordinate offsets in JSON locally."
    >
      <div className="flex flex-col gap-6">
        {files.length === 0 ? (
          <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
            <UploadBox 
              onFileSelect={handleFileSelect} 
              acceptedFormats={['.jpg', '.jpeg', '.png', '.webp', '.svg']}
              multiple={true} 
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
            {/* Left Column: Settings */}
            <div className="lg:col-span-4" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", height: "fit-content", display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="pb-2 border-b border-bordercolor flex justify-between items-center">
                <h3 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Layout Settings
                </h3>
                <button onClick={clearAll} className="text-xs font-bold text-red-500 hover:underline">
                  Clear All
                </button>
              </div>

              {/* Columns Limit */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                  <span>Columns Count</span>
                  <span>{columns} cols</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="12"
                  value={columns}
                  onChange={(e) => setColumns(parseInt(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              {/* Cell Spacing */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                  <span>Cell Spacing (Padding)</span>
                  <span>{spacing}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={spacing}
                  onChange={(e) => setSpacing(parseInt(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              {/* Background Style */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Background Style
                </label>
                <select
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-full text-xs font-semibold text-textmain border border-bordercolor rounded-lg bg-lightbg/40 px-3 py-2.5 focus:outline-none focus:border-primary"
                >
                  <option value="transparent">Transparent Background</option>
                  <option value="white">Solid White (#FFFFFF)</option>
                  <option value="black">Solid Black (#000000)</option>
                </select>
              </div>

              {errorMsg && (
                <p className="text-xs text-red-500 font-semibold py-1 leading-relaxed">
                  {errorMsg}
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2 border-t border-bordercolor/40">
                <button
                  type="button"
                  onClick={downloadSpriteSheet}
                  disabled={isProcessing}
                  className="w-full py-2.5 text-xs font-bold rounded-lg bg-primary text-white hover:bg-primary/95 transition-all flex items-center justify-center gap-1.5"
                >
                  Download Sprite Sheet
                </button>
                <button
                  type="button"
                  onClick={downloadCoordinatesJson}
                  disabled={!jsonOutput}
                  className="w-full py-2.5 text-xs font-bold rounded-lg border border-bordercolor bg-white text-textmain hover:bg-lightbg/10 transition-all"
                >
                  Download JSON Coordinates
                </button>
              </div>
            </div>

            {/* Right Column: Previews */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              {/* Sheet Canvas Preview */}
              <div style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="flex justify-between items-center">
                  <h4 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
                    Sprite Sheet Preview
                  </h4>
                  <button
                    onClick={() => {
                      const el = document.getElementById('add-more-sprites');
                      if (el) el.click();
                    }}
                    className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                    </svg>
                    Add More Frames
                  </button>
                  <input
                    id="add-more-sprites"
                    type="file"
                    multiple
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files?.length) {
                        const list = Array.from(e.target.files).map((f) =>
                          Object.assign(f, {
                            preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
                            id: Math.random().toString(36).slice(2, 9)
                          })
                        );
                        handleFileSelect(list);
                      }
                    }}
                  />
                </div>

                <div style={{ border: "1.5px solid #E4E4EF", borderRadius: 14, padding: 16, minHeight: 320, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", background: "repeating-conic-gradient(#C4C4D9 0% 25%, #FFF 0% 50%) 0 0 / 16px 16px" }}>
                  <canvas
                    ref={canvasRef}
                    style={{ 
                      maxHeight: 400, 
                      maxWidth: "100%", 
                      objectFit: "contain", 
                      borderRadius: 8, 
                      boxShadow: "0 4px 20px rgba(0,0,0,0.06)", 
                      display: "block" 
                    }}
                  />
                </div>
              </div>

              {/* JSON coordinates output */}
              <div style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 10 }}>
                <h4 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  JSON Packing Coordinates
                </h4>
                <textarea
                  readOnly
                  value={jsonOutput}
                  placeholder="Packing layout coordinates will display here..."
                  className="w-full h-40 font-mono text-[11px] text-textmain border border-bordercolor/80 rounded-xl bg-lightbg/10 p-3 focus:outline-none resize-none leading-relaxed"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
