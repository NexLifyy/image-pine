"use client";

import React, { useState, useEffect } from 'react';
import UploadBox from '@/components/UploadBox';
import { saveHistory } from '@/lib/storage';
import ToolPageShell from '@/components/ToolPageShell';

const _FEATURES = [
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19L12 22Z"/><circle cx="7.5" cy="10.5" r="1.5" fill="currentColor"/><circle cx="11.5" cy="7.5" r="1.5" fill="currentColor"/><circle cx="16.5" cy="9.5" r="1.5" fill="currentColor"/></svg>), title: 'Image Palette Matching', desc: 'Extracts the 3 most dominant colors from your photo to build the initial gradient stops.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M10 20l4-16m2 16l4-16M6 9h14M4 15h14"/></svg>), title: 'CSS Code Output', desc: 'Generates standardized CSS styling strings ready to paste directly into your stylesheets.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><path d="M4 4h16v16H4zM4 12h16"/></svg>), title: 'Linear & Radial', desc: 'Toggle between direction-focused linear flows or center-aligned radial gradients.' },
  { icon: (<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>), title: '100% Private', desc: 'Color analysis is processed inside your browser sandbox. No photo data is uploaded.' }
];

const _STEPS = [
  { n: '1', title: 'Upload Photo', desc: 'Select any design, landscape, or abstract background.' },
  { n: '2', title: 'Fine-Tune Sliders', desc: 'Adjust type, angle, color stop positions, and values.' },
  { n: '3', title: 'Copy CSS Code', desc: 'Click to copy the generated styling code instantly.' }
];

const _FAQS = [
  { q: 'How does it extract colors?', a: 'It downsamples the image on a client-side canvas, quantizes pixel buffers to identify the top color clusters, and uses the 3 most frequent distinct colors to seed your gradient.' },
  { q: 'Can I customize the color stops?', a: 'Yes. You can edit each color using the color picker inputs and slide the stop position (0-100%) to adjust the blend spacing.' },
  { q: 'Are standard vendor prefixes included?', a: 'We output standard modern W3C compliant CSS syntax supported by all modern browsers.' }
];

export default function GradientGeneratorPage() {
  const [file, setFile] = useState(null);
  const [type, setType] = useState('linear'); // 'linear' | 'radial'
  const [angle, setAngle] = useState(135); // degrees
  
  const [stop1, setStop1] = useState({ color: '#5B5BD6', pos: 0 });
  const [stop2, setStop2] = useState({ color: '#7C3AED', pos: 50 });
  const [stop3, setStop3] = useState({ color: '#EC4899', pos: 100 });

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const toHex = (r, g, b) => {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('').toUpperCase();
  };

  const handleFileSelect = (selectedList) => {
    if (selectedList.length > 0) {
      setFile(selectedList[0]);
    } else {
      setFile(null);
    }
  };

  // Run color extraction when file changes
  useEffect(() => {
    if (!file) return;

    setIsProcessing(true);
    setErrorMsg('');

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const size = 32;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context not available.');

        ctx.drawImage(img, 0, 0, size, size);
        const imgData = ctx.getImageData(0, 0, size, size).data;

        // Group colors
        const colorCounts = {};
        for (let i = 0; i < imgData.length; i += 4) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          const a = imgData[i + 3];

          if (a < 128) continue; // skip transparent

          const qr = Math.round(r / 16) * 16;
          const qg = Math.round(g / 16) * 16;
          const qb = Math.round(b / 16) * 16;

          const key = `${qr},${qg},${qb}`;
          colorCounts[key] = (colorCounts[key] || 0) + 1;
        }

        const sortedColors = Object.entries(colorCounts)
          .map(([key, count]) => {
            const [r, g, b] = key.split(',').map(Number);
            return { r, g, b, count };
          })
          .sort((a, b) => b.count - a.count);

        // Extract 3 distinct colors
        const palette = [];
        const threshold = 50;

        for (const candidate of sortedColors) {
          if (palette.length >= 3) break;

          let isDistinct = true;
          for (const selected of palette) {
            const distance = Math.hypot(
              candidate.r - selected.r,
              candidate.g - selected.g,
              candidate.b - selected.b
            );
            if (distance < threshold) {
              isDistinct = false;
              break;
            }
          }

          if (isDistinct) {
            palette.push(candidate);
          }
        }

        // Fill up to 3 colors if needed
        while (palette.length < 3 && sortedColors.length > palette.length) {
          const nextVal = sortedColors[palette.length];
          palette.push(nextVal);
        }

        // Assign to color stops
        if (palette.length >= 1) {
          setStop1({ color: toHex(palette[0].r, palette[0].g, palette[0].b), pos: 0 });
        }
        if (palette.length >= 2) {
          setStop2({ color: toHex(palette[1].r, palette[1].g, palette[1].b), pos: 50 });
        }
        if (palette.length >= 3) {
          setStop3({ color: toHex(palette[2].r, palette[2].g, palette[2].b), pos: 100 });
        } else if (palette.length === 1) {
          setStop2({ color: toHex(palette[0].r, palette[0].g, palette[0].b), pos: 50 });
          setStop3({ color: toHex(palette[0].r, palette[0].g, palette[0].b), pos: 100 });
        }

        setIsProcessing(false);
      } catch (err) {
        console.error(err);
        setErrorMsg('Failed to extract gradient stops.');
        setIsProcessing(false);
      }
    };
    img.src = file.preview || URL.createObjectURL(file);
  }, [file]);

  // Construct CSS Code string
  const getGradientCss = () => {
    if (type === 'linear') {
      return `background: linear-gradient(${angle}deg, ${stop1.color} ${stop1.pos}%, ${stop2.color} ${stop2.pos}%, ${stop3.color} ${stop3.pos}%);`;
    }
    return `background: radial-gradient(circle, ${stop1.color} ${stop1.pos}%, ${stop2.color} ${stop2.pos}%, ${stop3.color} ${stop3.pos}%);`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getGradientCss()).then(() => {
      setCopied(true);
      saveHistory('CSS Gradient Generator', 'Gradient code copied');
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <ToolPageShell
      title="CSS Gradient Generator"
      subtitle="Extract dominant color stops from photos to compile linear and radial CSS background styles."
      features={_FEATURES}
      steps={_STEPS}
      faqs={_FAQS}
      seoText="Free client-side Image to CSS Gradient Generator. Extract dominant colors from photos, adjust linear and radial gradients, and copy compiled CSS styling codes locally."
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
            {/* Left Column: Settings */}
            <div className="lg:col-span-5" style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", height: "fit-content", display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="pb-2 border-b border-bordercolor flex justify-between items-center">
                <h3 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Gradient Settings
                </h3>
                <button onClick={() => handleFileSelect([])} className="text-xs font-bold text-red-500 hover:underline">
                  Remove File
                </button>
              </div>

              {/* Gradient Type */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Gradient Shape/Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('linear')}
                    style={{
                      padding: '10px',
                      fontSize: 11,
                      fontWeight: 700,
                      borderRadius: 8,
                      border: '1px solid',
                      borderColor: type === 'linear' ? '#5B5BD6' : '#E4E4EF',
                      background: type === 'linear' ? '#EDEDFB' : '#fff',
                      color: type === 'linear' ? '#5B5BD6' : '#6B6B8A',
                      transition: 'all 0.15s'
                    }}
                  >
                    Linear
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('radial')}
                    style={{
                      padding: '10px',
                      fontSize: 11,
                      fontWeight: 700,
                      borderRadius: 8,
                      border: '1px solid',
                      borderColor: type === 'radial' ? '#5B5BD6' : '#E4E4EF',
                      background: type === 'radial' ? '#EDEDFB' : '#fff',
                      color: type === 'radial' ? '#5B5BD6' : '#6B6B8A',
                      transition: 'all 0.15s'
                    }}
                  >
                    Radial
                  </button>
                </div>
              </div>

              {/* Angle (if linear) */}
              {type === 'linear' && (
                <div className="flex flex-col gap-1.5 pt-1">
                  <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase">
                    <span>Angle Direction</span>
                    <span>{angle}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={angle}
                    onChange={(e) => setAngle(parseInt(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
              )}

              {/* Stop 1 */}
              <div className="flex flex-col gap-2 pt-3 border-t border-bordercolor/40">
                <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase">
                  <span>Color Stop 1</span>
                  <span>{stop1.pos}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={stop1.color}
                    onChange={(e) => setStop1({ ...stop1, color: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer border border-bordercolor"
                  />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={stop1.pos}
                    onChange={(e) => setStop1({ ...stop1, pos: parseInt(e.target.value) })}
                    className="flex-grow accent-primary"
                  />
                </div>
              </div>

              {/* Stop 2 */}
              <div className="flex flex-col gap-2 pt-2 border-t border-bordercolor/40">
                <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase">
                  <span>Color Stop 2</span>
                  <span>{stop2.pos}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={stop2.color}
                    onChange={(e) => setStop2({ ...stop2, color: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer border border-bordercolor"
                  />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={stop2.pos}
                    onChange={(e) => setStop2({ ...stop2, pos: parseInt(e.target.value) })}
                    className="flex-grow accent-primary"
                  />
                </div>
              </div>

              {/* Stop 3 */}
              <div className="flex flex-col gap-2 pt-2 border-t border-bordercolor/40">
                <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase">
                  <span>Color Stop 3</span>
                  <span>{stop3.pos}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={stop3.color}
                    onChange={(e) => setStop3({ ...stop3, color: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer border border-bordercolor"
                  />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={stop3.pos}
                    onChange={(e) => setStop3({ ...stop3, pos: parseInt(e.target.value) })}
                    className="flex-grow accent-primary"
                  />
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-red-500 font-semibold py-1 leading-relaxed">
                  {errorMsg}
                </p>
              )}
            </div>

            {/* Right Column: Preview & Output */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              {/* Gradient Box */}
              <div style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 14 }}>
                <h4 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Gradient Preview
                </h4>
                
                <div 
                  style={{ 
                    borderRadius: 14, 
                    height: 280, 
                    border: '1px solid #E4E4EF',
                    // Apply gradient background
                    backgroundImage: type === 'linear' 
                      ? `linear-gradient(${angle}deg, ${stop1.color} ${stop1.pos}%, ${stop2.color} ${stop2.pos}%, ${stop3.color} ${stop3.pos}%)`
                      : `radial-gradient(circle, ${stop1.color} ${stop1.pos}%, ${stop2.color} ${stop2.pos}%, ${stop3.color} ${stop3.pos}%)`
                  }}
                  className="shadow-sm animate-fade-in"
                />
              </div>

              {/* Output CSS Text */}
              <div style={{ background: "#fff", border: "1px solid #E4E4EF", borderRadius: 20, padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="flex justify-between items-center pb-2 border-b border-bordercolor">
                  <h4 style={{ fontSize: 10, fontWeight: 800, color: "#9898B5", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
                    CSS Background Code
                  </h4>
                  <button
                    onClick={copyToClipboard}
                    className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    {copied ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>
                <textarea
                  readOnly
                  value={getGradientCss()}
                  className="w-full h-16 font-mono text-xs text-textmain border border-bordercolor/80 rounded-xl bg-lightbg/10 p-3 focus:outline-none resize-none leading-relaxed"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}
